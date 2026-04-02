/**
 * Handler: shipment.stage_advanced
 *
 * Cross-layer propagation when a shipment advances to the next stage:
 * 1. Update legacy status field (backward compatibility)
 * 2. Log audit event with stage transition details
 * 3. Evaluate escrow trigger (stub — real implementation in Layer 5 payment sprint)
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { DomainEvent, ShipmentStageAdvancedPayload } from '../types';
import { logAuditEvent } from '@/lib/audit';

/** Maps the 9 pipeline stages to the legacy status field values */
const STAGE_TO_STATUS: Record<number, string> = {
  1: 'draft',
  2: 'draft',
  3: 'draft',
  4: 'pending',
  5: 'pending',
  6: 'booked',
  7: 'in_transit',
  8: 'in_transit',
  9: 'delivered',
};

export async function handleShipmentStageAdvanced(
  event: DomainEvent<ShipmentStageAdvancedPayload>,
  supabase: SupabaseClient
): Promise<void> {
  const { shipmentId, previousStage, newStage, escrowEnabled } = event.payload;

  const legacyStatus = STAGE_TO_STATUS[newStage] ?? 'in_transit';

  // Update legacy status for backward compatibility
  await supabase
    .from('shipments')
    .update({ status: legacyStatus })
    .eq('id', shipmentId);

  await logAuditEvent({
    orgId: event.orgId,
    actorId: event.actorId,
    actorEmail: event.actorEmail,
    action: 'shipment.stage_advanced',
    resourceType: 'shipment',
    resourceId: shipmentId,
    metadata: {
      previousStage,
      newStage,
      legacyStatus,
      escrowEvaluated: escrowEnabled ?? false,
      // Escrow release logic is a stub here. The payment sprint builds the full
      // Blockradar + Circle integration. For now, log that evaluation occurred.
      escrowNote: escrowEnabled
        ? 'Escrow trigger evaluated — payment sprint will implement release logic'
        : 'No escrow configured for this shipment',
    },
  });
}
