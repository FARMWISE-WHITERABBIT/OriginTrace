/**
 * Handler: shipment.stage_advanced
 *
 * Cross-layer propagation when a shipment advances to the next stage:
 * 1. Update legacy status field (backward compatibility)
 * 2. Log audit event with stage transition details
 * 3. Evaluate escrow state if escrow is enabled for this shipment
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { DomainEvent, ShipmentStageAdvancedPayload } from '../types';
import { logAuditEvent } from '@/lib/audit';
import { getEscrowStatus } from '@/lib/services/escrow';

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

  // Evaluate escrow state when escrow is configured for this shipment
  let escrowNote = 'No escrow configured for this shipment';
  if (escrowEnabled) {
    const escrowStatus = await getEscrowStatus(shipmentId);
    if (escrowStatus.escrow) {
      escrowNote = escrowStatus.hasOpenDispute
        ? `Escrow has active dispute (id: ${escrowStatus.openDispute?.id}) — releases blocked`
        : `Escrow active: held=${escrowStatus.escrow.held_amount} ${escrowStatus.escrow.currency}, released=${escrowStatus.escrow.released_amount}`;
    }
  }

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
      escrowEnabled: escrowEnabled ?? false,
      escrowNote,
    },
  });
}
