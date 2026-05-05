/**
 * Handler: border_outcome.recorded
 *
 * Cross-layer propagation when a border outcome is recorded for a shipment:
 * 1. Log audit event
 * 2. Trigger corrective action creation if rejected (stub for corrective action tracker)
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { DomainEvent, BorderOutcomeRecordedPayload } from '../types';
import { logAuditEvent } from '@/lib/audit';

export async function handleBorderOutcomeRecorded(
  event: DomainEvent<BorderOutcomeRecordedPayload>,
  supabase: SupabaseClient
): Promise<void> {
  const { shipmentId, outcome, rejectionReason, destinationMarket } = event.payload;

  await logAuditEvent({
    orgId: event.orgId,
    actorId: event.actorId,
    actorEmail: event.actorEmail,
    action: 'border_outcome.recorded',
    resourceType: 'shipment',
    resourceId: shipmentId,
    metadata: {
      outcome,
      rejectionReason,
      destinationMarket,
      correctiveActionCreated: outcome !== 'accepted',
    },
  });

  // If rejected or conditional, flag for corrective action tracker (Layer 3 audit sprint).
  // The corrective_actions table is built in the audit sprint. This is a forward-compatible stub.
  if (outcome !== 'accepted' && rejectionReason) {
    try {
      await supabase.from('corrective_actions').insert({
        org_id: event.orgId,
        shipment_id: shipmentId,
        source: 'border_query',
        issue: rejectionReason,
        destination_market: destinationMarket,
        status: 'open',
        created_by: event.actorId,
      });
    } catch {
      // corrective_actions table may not exist yet — non-fatal
    }
  }
}
