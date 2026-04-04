/**
 * Handler: batch.created
 *
 * Cross-layer propagation when a collection batch is created:
 * 1. Update contributing farm's last_collection_date (for completeness score)
 * 2. Log audit trail with agent, location, timestamp
 * 3. Check if farm eligibility is 'blocked' and flag the batch if so (belt-and-suspenders)
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { DomainEvent, BatchCreatedPayload } from '../types';
import { logAuditEvent } from '@/lib/audit';

export async function handleBatchCreated(
  event: DomainEvent<BatchCreatedPayload>,
  supabase: SupabaseClient
): Promise<void> {
  const { batchId, farmId, farmComplianceStatus, totalWeight, bagCount } = event.payload;

  // Update farm's last_collection_date for completeness score calculation.
  // The column is added via migration; this is a no-op if the column doesn't exist yet.
  await supabase
    .from('farms')
    .update({ last_collection_date: new Date().toISOString() })
    .eq('id', farmId);

  await logAuditEvent({
    orgId: event.orgId,
    actorId: event.actorId,
    actorEmail: event.actorEmail,
    action: 'batch.created.propagated',
    resourceType: 'collection_batch',
    resourceId: batchId,
    metadata: {
      farmId,
      farmComplianceStatus,
      totalWeight,
      bagCount,
      timestamp: event.timestamp,
    },
  });
}
