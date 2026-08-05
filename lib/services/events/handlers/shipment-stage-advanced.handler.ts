/**
 * Handler: shipment.stage_advanced
 *
 * Cross-layer propagation when a shipment advances to the next stage:
 * 1. Update legacy status field (backward compatibility)
 * 2. Log audit event with stage transition details
 * 3. Evaluate escrow state if escrow is enabled for this shipment
 * 4. Send email notifications to relevant parties
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { DomainEvent, ShipmentStageAdvancedPayload } from '../types';
import { logAuditEvent } from '@/lib/audit';
import { getEscrowStatus } from '@/lib/services/escrow';
import { sendEmail } from '@/lib/email/resend-client';
import { buildShipmentStageEmail } from '@/lib/email/templates';

const APP_BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://app.origintrace.trade';

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
  const { shipmentId, previousStage, newStage, escrowEnabled, shipmentCode, buyerEmail } =
    event.payload;

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

  // ── Email notifications ────────────────────────────────────────────────────
  // Fire-and-forget: email failures must never block the stage transition.
  sendStageNotifications({
    supabase,
    orgId: event.orgId,
    shipmentId,
    shipmentCode: shipmentCode ?? 'Unknown',
    previousStage,
    newStage,
    buyerEmail: buyerEmail ?? null,
  }).catch((err) => console.error('[stage-email] notification error:', err));
}

async function sendStageNotifications(params: {
  supabase: SupabaseClient;
  orgId: string;
  shipmentId: string;
  shipmentCode: string;
  previousStage: number;
  newStage: number;
  buyerEmail: string | null;
}): Promise<void> {
  const { supabase, orgId, shipmentId, shipmentCode, previousStage, newStage, buyerEmail } =
    params;

  const dashboardUrl = `${APP_BASE_URL}/app/shipments/${shipmentId}`;

  // Fetch org name + admin/coordinator emails
  const [orgResult, staffResult] = await Promise.all([
    supabase.from('organizations').select('name').eq('id', orgId).single(),
    supabase
      .from('profiles')
      .select('email, full_name, role')
      .eq('org_id', orgId)
      .in('role', ['admin', 'logistics_coordinator']),
  ]);

  const orgName = (orgResult.data as any)?.name ?? 'OriginTrace';
  const staffMembers: Array<{ email: string; full_name: string | null; role: string }> =
    (staffResult.data as any[]) ?? [];

  const emailPromises: Promise<any>[] = [];

  // Notify all org admins and logistics coordinators
  for (const member of staffMembers) {
    if (!member.email) continue;
    const { html, text } = buildShipmentStageEmail({
      recipientName: member.full_name || member.email,
      recipientRole: 'exporter',
      shipmentCode,
      previousStage,
      newStage,
      dashboardUrl,
      orgName,
    });
    emailPromises.push(
      sendEmail({
        to: member.email,
        subject: `[${shipmentCode}] Shipment advanced to Stage ${newStage}`,
        html,
        text,
      })
    );
  }

  // Notify buyer on stages that affect them: 5 (vessel confirmed), 7 (departed), 8 (arrived), 9 (closed)
  const buyerNotifyStages = [5, 7, 8, 9];
  if (buyerEmail && buyerNotifyStages.includes(newStage)) {
    const { html, text } = buildShipmentStageEmail({
      recipientName: 'Buyer',
      recipientRole: 'buyer',
      shipmentCode,
      previousStage,
      newStage,
      dashboardUrl: `${APP_BASE_URL}/app/buyer/shipments`,
      orgName,
    });
    emailPromises.push(
      sendEmail({
        to: buyerEmail,
        subject: `[${shipmentCode}] Shipment update — Stage ${newStage}`,
        html,
        text,
      })
    );
  }

  // Notify freight forwarder on Stage 5 and 6
  if ([5, 6].includes(newStage)) {
    const { data: shipmentRow } = await supabase
      .from('shipments')
      .select('freight_forwarder_contact')
      .eq('id', shipmentId)
      .single();
    const ffEmail = (shipmentRow as any)?.freight_forwarder_contact;
    if (ffEmail && ffEmail.includes('@')) {
      const { html, text } = buildShipmentStageEmail({
        recipientName: 'Freight Forwarder',
        recipientRole: 'freight_forwarder',
        shipmentCode,
        previousStage,
        newStage,
        dashboardUrl,
        orgName,
      });
      emailPromises.push(
        sendEmail({
          to: ffEmail,
          subject: `[${shipmentCode}] Shipment update — Stage ${newStage}`,
          html,
          text,
        })
      );
    }
  }

  await Promise.allSettled(emailPromises);
}
