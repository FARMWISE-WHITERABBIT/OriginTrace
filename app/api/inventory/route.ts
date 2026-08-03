import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getAuthenticatedProfile } from '@/lib/api-auth';
import { withErrorHandling, ApiError } from '@/lib/api/errors';
import { requireRole, ROLES } from '@/lib/rbac';

/** Tenant-scoped inventory projection used by inventory/traceability screens. */
export const GET = withErrorHandling(async (request: NextRequest) => {
  const { user, profile } = await getAuthenticatedProfile(request);
  if (!user) return ApiError.unauthorized();
  if (!profile?.org_id) return ApiError.forbidden('No organization assigned');

  const roleError = requireRole(profile, ROLES.ALL_INTERNAL);
  if (roleError) return roleError;

  const supabase = createAdminClient();
  const [{ data: batches, error: batchesError }, { data: bags, error: bagsError }] = await Promise.all([
    supabase
      .from('collection_batches')
      .select(`
        *,
        farm:farms(id, farmer_name, community, area_hectares, compliance_status, boundary)
      `)
      .eq('org_id', profile.org_id)
      .order('created_at', { ascending: false }),
    supabase
      .from('bags')
      .select('id, serial, status, collection_batch_id, weight_kg, grade, created_at')
      .eq('org_id', profile.org_id)
      .order('created_at', { ascending: false }),
  ]);

  if (batchesError) return ApiError.internal(batchesError, 'inventory/GET/batches');
  if (bagsError) return ApiError.internal(bagsError, 'inventory/GET/bags');

  const bagsByBatch = new Map<string, any[]>();
  for (const bag of bags || []) {
    const key = String(bag.collection_batch_id || '');
    if (!key) continue;
    const existing = bagsByBatch.get(key) || [];
    existing.push(bag);
    bagsByBatch.set(key, existing);
  }

  const batchRows = (batches || []).map((batch: any) => ({
    ...batch,
    bags: bagsByBatch.get(String(batch.id)) || [],
  }));
  const dispatchRecords = batchRows
    .filter((batch: any) => batch.status === 'dispatched' || batch.dispatched_at)
    .map((batch: any) => ({
      id: batch.id,
      batch_id: batch.id,
      batch_code: batch.batch_code,
      status: batch.status,
      dispatch_destination: batch.dispatch_destination,
      vehicle_reference: batch.vehicle_reference,
      driver_name: batch.driver_name,
      driver_phone: batch.driver_phone,
      expected_arrival_at: batch.expected_arrival_at,
      dispatched_at: batch.dispatched_at,
      dispatch_recorded_at: batch.dispatch_recorded_at,
    }));

  return NextResponse.json({ batches: batchRows, bags: bags || [], dispatch_records: dispatchRecords });
}, 'inventory/GET');
