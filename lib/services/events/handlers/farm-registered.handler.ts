/**
 * Handler: farm.registered
 *
 * Cross-layer propagation when a new farm is created:
 * 1. Set farm eligibility_status to 'conditional' (pending deforestation check)
 * 2. Log audit event marking the deforestation check as initiated
 * 3. If no GPS boundary, set eligibility to 'conditional' with warning
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { DomainEvent, FarmRegisteredPayload } from '../types';
import { logAuditEvent } from '@/lib/audit';

export async function handleFarmRegistered(
  event: DomainEvent<FarmRegisteredPayload>,
  supabase: SupabaseClient
): Promise<void> {
  const { farmId, hasBoundary, commodity, community } = event.payload;

  // Determine initial eligibility status
  const eligibilityStatus = hasBoundary ? 'conditional' : 'conditional';
  // 'conditional' because deforestation check has not yet run.
  // A farm with no boundary cannot become 'eligible' for EUDR batches.

  await supabase
    .from('farms')
    .update({ eligibility_status: eligibilityStatus })
    .eq('id', farmId);

  await logAuditEvent({
    orgId: event.orgId,
    actorId: event.actorId,
    actorEmail: event.actorEmail,
    action: 'farm.registered.propagated',
    resourceType: 'farm',
    resourceId: farmId,
    metadata: {
      hasBoundary,
      commodity,
      community,
      eligibilityStatus,
      deforestationCheckStatus: hasBoundary ? 'pending' : 'not_applicable_no_boundary',
    },
  });
}
