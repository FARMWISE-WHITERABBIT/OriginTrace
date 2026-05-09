import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createServiceClient, getAuthenticatedProfile } from '@/lib/api-auth';
import { checkFarmEligibility } from '@/lib/services/farm-eligibility';
import { normalizeMarketCodes } from '@/lib/services/market-normalization';
import { withErrorHandling, ApiError } from '@/lib/api/errors';
import { requireRole, ROLES } from '@/lib/rbac';

const ALLOWED_SYNC_ROLES = ROLES.FIELD_ROLES;

const syncBatchSchema = z.object({
  local_id: z.string().min(1, 'local_id is required'),
  batch_id: z.string().optional(),
  farm_id: z.string().uuid().optional().or(z.string().optional()).or(z.number().optional()),
  commodity: z.string().optional(),
  state: z.string().optional(),
  lga: z.string().optional(),
  community: z.string().optional(),
  gps_lat: z.number().optional(),
  gps_lng: z.number().optional(),
  contributors: z.array(z.object({
    farm_id: z.string().uuid().optional().or(z.string().optional()).or(z.number().optional()),
    farmer_name: z.string().optional(),
    weight_kg: z.number().optional(),
    bag_count: z.number().optional(),
  })).optional(),
  bags: z.array(z.object({
    serial: z.string().optional(),
    weight: z.number().optional(),
    grade: z.string().optional(),
  })).optional(),
  notes: z.string().optional(),
  collected_at: z.string().optional(),
  target_markets: z.array(z.string()).optional(),
});

const syncPutSchema = z.object({
  batches: z.array(syncBatchSchema).min(1, 'At least one batch is required'),
});

const conflictResolveSchema = z.object({
  conflict_id: z.string().uuid(),
  resolution: z.enum(['field', 'server', 'manual']),
});

export const GET = withErrorHandling(async (request: NextRequest) => {
  const { user, profile } = await getAuthenticatedProfile(request);
  if (!user || !profile) return ApiError.unauthorized();
  
  const roleError = requireRole(profile, ALLOWED_SYNC_ROLES);
  if (roleError) return roleError;

  const serviceClient = createServiceClient();

  if (profile.role === 'admin' || profile.role === 'aggregator') {
    const { data: syncStatus, error } = await serviceClient
      .from('agent_sync_status')
      .select(`
        *,
        agent:profiles(id, full_name, role)
      `)
      .eq('org_id', profile.org_id)
      .order('last_seen_at', { ascending: false });
    
    if (error) return ApiError.internal(error, 'sync/GET/status-all');
    return NextResponse.json({ sync_status: syncStatus || [] });
  } else {
    const { data: syncStatus, error } = await serviceClient
      .from('agent_sync_status')
      .select('*')
      .eq('agent_id', profile.id)
      .order('last_seen_at', { ascending: false })
      .limit(1);
    
    if (error) return ApiError.internal(error, 'sync/GET/status-agent');
    return NextResponse.json({ sync_status: syncStatus?.[0] || null });
  }
}, 'sync/GET');

export const POST = withErrorHandling(async (request: NextRequest) => {
  const { user, profile } = await getAuthenticatedProfile(request);
  if (!user || !profile) return ApiError.unauthorized();

  const roleError = requireRole(profile, ALLOWED_SYNC_ROLES);
  if (roleError) return roleError;

  const serviceClient = createServiceClient();
  const body = await request.json();
  const { pending_batches, pending_bags, is_online } = body;
  
  const upsertPayload: Record<string, any> = {
    org_id: profile.org_id,
    agent_id: profile.id,
    last_seen_at: new Date().toISOString(),
    pending_batches: pending_batches || 0,
    pending_bags: pending_bags || 0,
    is_online: is_online !== false
  };

  const { data: syncStatus, error } = await serviceClient
    .from('agent_sync_status')
    .upsert(upsertPayload, { onConflict: 'agent_id' })
    .select()
    .single();
  
  if (error) return ApiError.internal(error, 'sync/POST/status');
  return NextResponse.json({ sync_status: syncStatus, success: true });
}, 'sync/POST');

export const PUT = withErrorHandling(async (request: NextRequest) => {
  const { user, profile } = await getAuthenticatedProfile(request);
  if (!user || !profile) return ApiError.unauthorized();

  const roleError = requireRole(profile, ALLOWED_SYNC_ROLES);
  if (roleError) return roleError;

  const serviceClient = createServiceClient();
  const body = await request.json();

  const parsed = syncPutSchema.safeParse(body);
  if (!parsed.success) return ApiError.validation(parsed.error);

  const { batches } = parsed.data;

  // Pre-flight Farm Compliance Gate checks
  const farmIdsToCheck = [
    ...new Set(
      batches
        .flatMap((b: any) => [
          String(b.farm_id ?? ''),
          ...((b.contributors || []).map((c: any) => String(c.farm_id ?? ''))),
        ])
        .filter((id: string) => !!id && !id.startsWith('temp-') && id !== 'unknown')
    ),
  ];

  if (farmIdsToCheck.length > 0) {
    const { data: farms, error: farmsError } = await serviceClient
      .from('farms')
      .select('id, compliance_status, boundary_geo, deforestation_check, consent_timestamp')
      .in('id', farmIdsToCheck)
      .eq('org_id', profile.org_id);

    if (farmsError) return ApiError.internal(farmsError, 'sync/PUT/gate-validation');

    const farmMap = new Map((farms || []).map((f: any) => [String(f.id), f]));
    const blocked: any[] = [];

    for (const batch of batches as any[]) {
      const targetMarkets = normalizeMarketCodes(batch.target_markets ?? []);
      const batchFarmIds = [
        batch.farm_id ? String(batch.farm_id) : undefined,
        ...((batch.contributors || []).map((c: any) => c.farm_id ? String(c.farm_id) : undefined)),
      ].filter((id: string | undefined): id is string => !!id && !id.startsWith('temp-') && id !== 'unknown');

      for (const farmId of batchFarmIds) {
        const farm = farmMap.get(farmId);
        if (!farm) continue;
        const eligibility = checkFarmEligibility(farm, targetMarkets);
        if (!eligibility.eligible) {
          blocked.push({
            local_id: String(batch.local_id),
            farm_id: farmId,
            blockers: eligibility.blockers,
            blocker_codes: eligibility.blocker_codes,
            warning_codes: eligibility.warning_codes,
          });
        }
      }
    }

    if (blocked.length > 0) {
      return NextResponse.json(
        { error: 'Farm Compliance Gate blocked one or more synced batches', blocked_batches: blocked },
        { status: 422 }
      );
    }
  }

  const { data: results, error: syncError } = await serviceClient.rpc('sync_batches_atomic', {
    p_org_id:  profile.org_id,
    p_user_id: user.id,
    p_batches: batches,
  });

  if (syncError) return ApiError.internal(syncError, 'sync/PUT/rpc');

  await serviceClient
    .from('agent_sync_status')
    .update({ pending_batches: 0, pending_bags: 0, last_seen_at: new Date().toISOString() })
    .eq('agent_id', profile.id);

  return NextResponse.json({ results: results || [], success: true });
}, 'sync/PUT');

export const PATCH = withErrorHandling(async (request: NextRequest) => {
  const { user, profile } = await getAuthenticatedProfile(request);
  if (!user || !profile) return ApiError.unauthorized();
  
  const roleError = requireRole(profile, ROLES.ADMIN_AGGREGATOR);
  if (roleError) return roleError;

  const body = await request.json();
  const parsed = conflictResolveSchema.safeParse(body);
  if (!parsed.success) return ApiError.validation(parsed.error);

  const { conflict_id, resolution } = parsed.data;
  const serviceClient = createServiceClient();

  const { data: conflict, error: fetchError } = await serviceClient
    .from('sync_conflicts')
    .select('*')
    .eq('id', conflict_id)
    .single();

  if (fetchError || !conflict) return ApiError.notFound('Conflict');

  if (resolution === 'field') {
    const fd = conflict.field_data;
    const { error: updateError } = await serviceClient
      .from('collection_batches')
      .update({
        farm_id: fd.farm_id,
        commodity: fd.commodity,
        gps_lat: fd.gps_lat,
        gps_lng: fd.gps_lng,
        notes: fd.notes,
        total_weight: fd.total_weight,
        bag_count: fd.bag_count,
        updated_at: new Date().toISOString()
      })
      .eq('id', conflict.batch_id);
    
    if (updateError) return ApiError.internal(updateError, 'sync/PATCH/resolve-field');
  }

  const { error: resolveError } = await serviceClient
    .from('sync_conflicts')
    .update({
      status: 'resolved',
      resolved_by: user.id,
      resolved_at: new Date().toISOString(),
      resolution
    })
    .eq('id', conflict_id);

  if (resolveError) return ApiError.internal(resolveError, 'sync/PATCH/status');

  return NextResponse.json({ success: true, resolution });
}, 'sync/PATCH');
