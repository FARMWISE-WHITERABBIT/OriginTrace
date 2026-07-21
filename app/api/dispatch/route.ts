import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getAuthenticatedProfile } from '@/lib/api-auth';
import { withErrorHandling, ApiError } from '@/lib/api/errors';
import { requireRole, ROLES } from '@/lib/rbac';

/**
 * Dispatch records are stored on collection_batches. This compatibility
 * endpoint gives the dispatch UI a stable relation-shaped payload without
 * asking the browser to query tenant tables directly (which was the source of
 * the missing-batches/dispatches regression).
 */
export const GET = withErrorHandling(async (request: NextRequest) => {
  const { user, profile } = await getAuthenticatedProfile(request);
  if (!user) return ApiError.unauthorized();
  if (!profile?.org_id) return ApiError.forbidden('No organization assigned');

  const roleError = requireRole(profile, ROLES.DISPATCH_ROLES);
  if (roleError) return roleError;

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('collection_batches')
    .select(`
      id,
      batch_code,
      status,
      dispatch_destination,
      vehicle_reference,
      driver_name,
      driver_phone,
      expected_arrival_at,
      dispatched_at,
      dispatch_recorded_at,
      dispatched_by,
      farm:farms(id, farmer_name, community)
    `)
    .eq('org_id', profile.org_id)
    .or('status.eq.dispatched,dispatched_at.not.is.null')
    .order('dispatched_at', { ascending: false });

  if (error) return ApiError.internal(error, 'dispatch/GET');

  const dispatchRecords = (data || []).map((batch: any) => ({
    id: batch.id,
    batch_id: batch.id,
    batch_code: batch.batch_code,
    status: batch.status,
    destination: batch.dispatch_destination,
    dispatch_destination: batch.dispatch_destination,
    vehicle_reference: batch.vehicle_reference,
    driver_name: batch.driver_name,
    driver_phone: batch.driver_phone,
    expected_arrival_at: batch.expected_arrival_at,
    dispatched_at: batch.dispatched_at,
    dispatch_recorded_at: batch.dispatch_recorded_at,
    dispatched_by: batch.dispatched_by,
    farm: batch.farm,
  }));

  return NextResponse.json({ dispatch_records: dispatchRecords });
}, 'dispatch/GET');
