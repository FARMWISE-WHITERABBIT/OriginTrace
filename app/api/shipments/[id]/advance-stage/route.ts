/**
 * POST /api/shipments/[id]/advance-stage
 *
 * Advances a shipment to the next pipeline stage (or a specified target stage).
 * Validates the gate conditions for the current stage before allowing advancement.
 *
 * Request body:
 *   { note?: string }
 *   (target_stage is always current_stage + 1 — stages cannot be skipped)
 *
 * Roles allowed: admin, logistics_coordinator
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createServiceClient, getAuthenticatedProfile } from '@/lib/api-auth';
import { logAuditEvent } from '@/lib/audit';
import { emitEvent } from '@/lib/services/events';
import { dispatchWebhookEvent } from '@/lib/webhooks';
import {
  validateStageGate,
  validateReadinessHardGate,
  buildStageHistoryEntry,
  buildStageCompletionData,
  STAGE_TO_LEGACY_STATUS,
  STAGE_DEFINITIONS,
  type ShipmentForGate,
} from '@/lib/services/shipment-stages';

const ALLOWED_ROLES = ['admin', 'logistics_coordinator'];

const advanceStageSchema = z.object({
  note: z.string().max(500).optional(),
});

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createServiceClient();

    const { user, profile } = await getAuthenticatedProfile();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    if (!profile.org_id) return NextResponse.json({ error: 'No organization assigned' }, { status: 403 });

    if (!ALLOWED_ROLES.includes(profile.role)) {
      return NextResponse.json(
        { error: 'Only admins and logistics coordinators can advance shipment stages.' },
        { status: 403 }
      );
    }

    const shipmentId = params.id;
    const body = await request.json().catch(() => ({}));
    const parsed = advanceStageSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid request body', fields: parsed.error.flatten().fieldErrors }, { status: 400 });
    }
    const { note } = parsed.data;

    // ── Fetch shipment with all gate-relevant fields ───────────────────────────
    const { data: shipment, error: fetchError } = await supabase
      .from('shipments')
      .select(`
        id, current_stage, stage_data, stage_history,
        compliance_profile_id, purchase_order_number,
        inspection_body, inspection_result,
        doc_status,
        clearing_agent_name, customs_declaration_number, exit_certificate_number,
        freight_forwarder_name, vessel_name, etd, eta,
        container_number, container_seal_number,
        actual_departure_date, bill_of_lading_number,
        actual_arrival_date, shipment_outcome,
        target_regulations,
        readiness_score, readiness_decision,
        buyer_company, buyer_contact,
        shipment_code
      `)
      .eq('id', shipmentId)
      .eq('org_id', profile.org_id)
      .single();

    if (fetchError || !shipment) {
      return NextResponse.json({ error: 'Shipment not found' }, { status: 404 });
    }

    const currentStage: number = shipment.current_stage ?? 1;
    const targetStage = currentStage + 1;

    if (currentStage >= 9) {
      return NextResponse.json(
        { error: 'Shipment is already at Stage 9 (Close). No further stages to advance.' },
        { status: 400 }
      );
    }

    // ── Validate gate conditions ───────────────────────────────────────────────
    const stageGate = validateStageGate(shipment as ShipmentForGate, targetStage);
    const readinessGate = validateReadinessHardGate(shipment as ShipmentForGate, targetStage);
    const gateResult = {
      valid: stageGate.valid && readinessGate.valid,
      blockers: [...stageGate.blockers, ...readinessGate.blockers],
      warnings: [...stageGate.warnings, ...readinessGate.warnings],
    };

    if (!gateResult.valid) {
      return NextResponse.json(
        {
          error: `Stage gate check failed. Complete the requirements for Stage ${currentStage} before advancing.`,
          blockers: gateResult.blockers,
          warnings: gateResult.warnings,
          currentStage,
          targetStage,
        },
        { status: 400 }
      );
    }

    // ── Build updated stage tracking data ─────────────────────────────────────
    const historyEntry = buildStageHistoryEntry(currentStage, targetStage, user.id, note);
    const updatedStageHistory = [
      ...((shipment.stage_history as Record<string, unknown>[]) ?? []),
      historyEntry,
    ];
    const updatedStageData = buildStageCompletionData(
      (shipment.stage_data as Record<string, unknown>) ?? {},
      currentStage
    );
    const newLegacyStatus = STAGE_TO_LEGACY_STATUS[targetStage] ?? 'in_transit';

    // ── Persist stage advancement ──────────────────────────────────────────────
    const { data: updated, error: updateError } = await supabase
      .from('shipments')
      .update({
        current_stage: targetStage,
        stage_data: updatedStageData,
        stage_history: updatedStageHistory,
        status: newLegacyStatus,
        updated_at: new Date().toISOString(),
      })
      .eq('id', shipmentId)
      .eq('org_id', profile.org_id)
      .select('id, current_stage, status, stage_history, stage_data, shipment_code')
      .single();

    if (updateError) {
      console.error('Error advancing shipment stage:', updateError);
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    // ── Audit log ─────────────────────────────────────────────────────────────
    await logAuditEvent({
      orgId: profile.org_id,
      actorId: user.id,
      actorEmail: user.email,
      action: 'shipment.stage_advanced',
      resourceType: 'shipment',
      resourceId: shipmentId,
      metadata: {
        previousStage: currentStage,
        newStage: targetStage,
        stageName: STAGE_DEFINITIONS.find((d) => d.stage === targetStage)?.name,
        legacyStatus: newLegacyStatus,
        note,
        gateWarnings: gateResult.warnings,
      },
    });

    // ── Cross-layer propagation ────────────────────────────────────────────────
    await emitEvent(
      {
        name: 'shipment.stage_advanced',
        orgId: profile.org_id,
        actorId: user.id,
        actorEmail: user.email,
        payload: {
          shipmentId,
          previousStage: currentStage,
          newStage: targetStage,
          shipmentCode: shipment.shipment_code ?? undefined,
          buyerEmail: shipment.buyer_contact ?? undefined,
          escrowEnabled: false, // Payment sprint enables this
        },
      },
      supabase
    );

    // ── External webhook ───────────────────────────────────────────────────────
    dispatchWebhookEvent(profile.org_id, 'shipment.updated', {
      shipment_id: shipmentId,
      event: 'stage_advanced',
      previous_stage: currentStage,
      new_stage: targetStage,
      legacy_status: newLegacyStatus,
    });

    const stageDef = STAGE_DEFINITIONS.find((d) => d.stage === targetStage);

    return NextResponse.json({
      success: true,
      shipment: updated,
      transition: {
        from: currentStage,
        to: targetStage,
        stageName: stageDef?.name,
        stageDescription: stageDef?.description,
        legacyStatus: newLegacyStatus,
      },
      warnings: gateResult.warnings,
    });
  } catch (error) {
    console.error('Advance stage error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
