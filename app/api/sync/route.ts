import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createServiceClient, getAuthenticatedProfile } from '@/lib/api-auth';
import { checkFarmEligibility } from '@/lib/services/farm-eligibility';
import { normalizeMarketCodes } from '@/lib/services/market-normalization';

const syncBatchSchema = z.object({
  local_id: z.string().min(1, 'local_id is required'),
  batch_id: z.string().optional(),
  farm_id: z.union([z.string(), z.number()]).optional(),
  commodity: z.string().optional(),
  state: z.string().optional(),
  lga: z.string().optional(),
  community: z.string().optional(),
  gps_lat: z.number().optional(),
  gps_lng: z.number().optional(),
  contributors: z.array(z.object({
    farm_id: z.union([z.string(), z.number()]).optional(),
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

export async function GET(request: NextRequest) {
  try {
    const { user, profile } = await getAuthenticatedProfile(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    if (!profile.org_id) return NextResponse.json({ error: 'No organization assigned' }, { status: 403 });
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
      
      if (error) {
        console.error('Sync status fetch error:', error);
        return NextResponse.json({ error: 'Failed to fetch sync status' }, { status: 500 });
      }
      
      return NextResponse.json({ sync_status: syncStatus || [] });
    } else {
      const { data: syncStatus, error } = await serviceClient
        .from('agent_sync_status')
        .select('*')
        .eq('agent_id', profile.id)
        .order('last_seen_at', { ascending: false })
        .limit(1);
      
      if (error) {
        console.error('Sync status fetch error:', error);
        return NextResponse.json({ error: 'Failed to fetch sync status' }, { status: 500 });
      }
      
      return NextResponse.json({ sync_status: syncStatus?.[0] || null });
    }
    
  } catch (error) {
    console.error('Sync API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { user, profile } = await getAuthenticatedProfile(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    if (!profile.org_id) return NextResponse.json({ error: 'No organization assigned' }, { status: 403 });
    const serviceClient = createServiceClient();

    const body = await request.json();
    const { device_id, pending_batches, pending_bags, app_version, is_online } = body;
    
    const upsertPayload: Record<string, any> = {
      org_id: profile.org_id,
      agent_id: profile.id,
      last_seen_at: new Date().toISOString(),
      pending_batches: pending_batches || 0,
      pending_bags: pending_bags || 0,
      is_online: is_online !== false
    };

    let { data: syncStatus, error } = await serviceClient
      .from('agent_sync_status')
      .upsert(upsertPayload, {
        onConflict: 'agent_id'
      })
      .select()
      .single();
    
    if (error) {
      console.error('Error updating sync status:', error);
      return NextResponse.json({ error: 'Failed to update sync status' }, { status: 500 });
    }
    
    return NextResponse.json({ sync_status: syncStatus, success: true });
    
  } catch (error) {
    console.error('Sync API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { user, profile } = await getAuthenticatedProfile(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    if (!profile.org_id) return NextResponse.json({ error: 'No organization assigned' }, { status: 403 });
    const serviceClient = createServiceClient();

    const body = await request.json();

    const parsed = syncPutSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', fields: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { batches } = parsed.data;

    // Pre-flight Farm Compliance Gate checks before atomic sync insert.
    // We block the sync batch when restricted-market gate rules fail.
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

      if (farmsError) {
        return NextResponse.json(
          { error: 'Failed to validate farm compliance gate', detail: farmsError.message },
          { status: 500 }
        );
      }

      const farmMap = new Map((farms || []).map((f: any) => [String(f.id), f]));
      const blocked: Array<{ local_id: string; farm_id?: string; blockers: string[]; warnings: string[] }> = [];

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
              warnings: eligibility.warnings,
            });
          }
        }
      }

      if (blocked.length > 0) {
        return NextResponse.json(
          {
            error: 'Farm Compliance Gate blocked one or more synced batches',
            blocked_batches: blocked,
          },
          { status: 422 }
        );
      }
    }

    // Atomic RPC: replaces the N×M loop (per-batch select + insert + N contrib inserts + M bag updates).
    // All batches processed in a single DB round-trip. Idempotent on local_id.
    const { data: rpcResults, error: syncError } = await serviceClient.rpc('sync_batches_atomic', {
      p_org_id:  profile.org_id,
      p_user_id: user.id,
      p_batches: batches,
    });

    if (syncError) {
      console.error('Sync RPC error:', syncError);
      return NextResponse.json({ error: 'Sync failed', detail: syncError.message }, { status: 500 });
    }

    const results: any[] = Array.isArray(rpcResults) ? rpcResults : [];

    const warnings: Array<{ type: string; message: string; details?: any }> = [];
    
    const syncedFarmIds = batches
      .map((b: any) => parseInt(b.farm_id))
      .filter((id: number) => !isNaN(id) && id > 0);
    
    if (syncedFarmIds.length > 0) {
      const uniqueFarmIds = [...new Set(syncedFarmIds)] as number[];
      const { data: farms } = await serviceClient
        .from('farms')
        .select('id, farmer_name, compliance_status, updated_at')
        .in('id', uniqueFarmIds)
        .eq('org_id', profile.org_id);
      
      if (farms) {
        const changedFarms = farms.filter(f => {
          if (f.compliance_status === 'rejected' || f.compliance_status === 'suspended') {
            return true;
          }
          return false;
        });
        
        if (changedFarms.length > 0) {
          warnings.push({
            type: 'farm_compliance_changed',
            message: `${changedFarms.length} farm(s) referenced in synced batches have compliance issues`,
            details: changedFarms.map(f => ({
              farm_id: f.id,
              farmer_name: f.farmer_name,
              compliance_status: f.compliance_status,
              updated_at: f.updated_at,
            })),
          });
        }
      }
    }
    
    await serviceClient
      .from('agent_sync_status')
      .update({ 
        pending_batches: 0, 
        pending_bags: 0,
        last_seen_at: new Date().toISOString()
      })
      .eq('agent_id', profile.id);
    
    return NextResponse.json({ results, warnings, success: true });
    
  } catch (error) {
    console.error('Sync API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
