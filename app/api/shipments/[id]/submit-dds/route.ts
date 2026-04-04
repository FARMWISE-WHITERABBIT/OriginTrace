/**
 * POST /api/shipments/[id]/submit-dds
 *
 * Handles EU TRACES DDS submission workflow for a shipment.
 *
 * Modes:
 *   mode='download' (MVP default) — Returns TRACES-formatted DDS JSON for manual
 *                                   portal upload. Marks prenotif_eu_traces='filed'.
 *   mode='reference'             — Records a manually obtained TRACES reference number.
 *                                   Marks prenotif_eu_traces='confirmed'.
 *   mode='api'                   — (Future) Submits directly to TRACES API when
 *                                   EC credentials are configured.
 *
 * Roles allowed: admin, compliance_officer
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createServiceClient, getAuthenticatedProfile } from '@/lib/api-auth';
import { createAdminClient } from '@/lib/supabase/admin';
import { logAuditEvent } from '@/lib/audit';
import { dispatchWebhookEvent } from '@/lib/webhooks';
import {
  formatTracesPayload,
  submitToTraces,
  type TracesFarm,
  type TracesShipment,
} from '@/lib/services/traces-api';

const ALLOWED_ROLES = ['admin', 'compliance_officer'];

const submitDdsSchema = z.discriminatedUnion('mode', [
  z.object({
    mode: z.literal('download'),
    commodity: z.string().optional(),
  }),
  z.object({
    mode: z.literal('reference'),
    reference_number: z.string().min(3, 'TRACES reference number is required'),
  }),
  z.object({
    mode: z.literal('api'),
    commodity: z.string().optional(),
  }),
]);

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createServiceClient();
    const adminClient = createAdminClient();

    const { user, profile } = await getAuthenticatedProfile();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    if (!profile.org_id) return NextResponse.json({ error: 'No organization assigned' }, { status: 403 });

    if (!ALLOWED_ROLES.includes(profile.role)) {
      return NextResponse.json(
        { error: 'Only admins and compliance officers can submit DDS statements.' },
        { status: 403 }
      );
    }

    const shipmentId = params.id;
    const body = await request.json().catch(() => ({}));
    const parsed = submitDdsSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request body', fields: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const data = parsed.data;

    // ── Mode: record reference number (manual confirmation) ───────────────────
    if (data.mode === 'reference') {
      const { error: updateError } = await supabase
        .from('shipments')
        .update({
          prenotif_eu_traces: 'confirmed',
          prenotif_eu_traces_ref: data.reference_number,
          prenotif_eu_traces_filed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', shipmentId)
        .eq('org_id', profile.org_id);

      if (updateError) {
        return NextResponse.json({ error: updateError.message }, { status: 500 });
      }

      await logAuditEvent({
        orgId: profile.org_id,
        actorId: user.id,
        actorEmail: user.email,
        action: 'dds.reference_recorded',
        resourceType: 'shipment',
        resourceId: shipmentId,
        metadata: { tracesReferenceNumber: data.reference_number, mode: 'reference' },
      });

      dispatchWebhookEvent(profile.org_id, 'compliance.changed', {
        shipment_id: shipmentId,
        change: 'eu_traces_confirmed',
        reference_number: data.reference_number,
      });

      return NextResponse.json({
        success: true,
        status: 'confirmed',
        referenceNumber: data.reference_number,
        message: 'TRACES reference number recorded. DDS status is now Confirmed.',
      });
    }

    // ── Fetch shipment and related data for DDS generation ────────────────────
    const { data: shipment, error: shipmentError } = await supabase
      .from('shipments')
      .select(`
        id, destination_country, eta, bill_of_lading_number, total_weight_kg,
        target_regulations, prenotif_eu_traces, prenotif_eu_traces_ref,
        shipment_code
      `)
      .eq('id', shipmentId)
      .eq('org_id', profile.org_id)
      .single();

    if (shipmentError || !shipment) {
      return NextResponse.json({ error: 'Shipment not found' }, { status: 404 });
    }

    // Fetch org details
    const { data: org } = await adminClient
      .from('organizations')
      .select('name, slug, settings')
      .eq('id', profile.org_id)
      .single();

    if (!org) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
    }

    // Fetch farms linked to this shipment via shipment_items → collection_batches → farms
    const { data: shipmentItems } = await supabase
      .from('shipment_items')
      .select('batch_id, finished_good_id')
      .eq('shipment_id', shipmentId);

    const batchIds = (shipmentItems ?? [])
      .filter((i) => i.batch_id)
      .map((i) => i.batch_id as string);

    let farms: TracesFarm[] = [];
    let lotIds: string[] = [];

    if (batchIds.length > 0) {
      const { data: batches } = await supabase
        .from('collection_batches')
        .select('id, farm_id')
        .in('id', batchIds);

      lotIds = (batches ?? []).map((b) => b.id);

      const farmIds = [...new Set((batches ?? []).map((b) => b.farm_id).filter(Boolean))];

      if (farmIds.length > 0) {
        const { data: farmRows } = await supabase
          .from('farms')
          .select(`
            id, boundary, boundary_geo, area_hectares, compliance_status,
            deforestation_check, community, commodity, consent_timestamp
          `)
          .in('id', farmIds)
          .eq('org_id', profile.org_id);

        farms = (farmRows ?? []) as TracesFarm[];
      }
    }

    // Determine commodity from request or org defaults
    const commodity =
      ('commodity' in data ? data.commodity : undefined) ??
      farms.find((f) => f.commodity)?.commodity ??
      'cocoa';

    // ── Format the TRACES payload ──────────────────────────────────────────────
    const tracesPayload = formatTracesPayload(
      { name: org.name, slug: org.slug, settings: org.settings as Record<string, unknown> | null | undefined },
      shipment as TracesShipment,
      farms,
      lotIds,
      commodity
    );

    // ── Mode: download (MVP default) ──────────────────────────────────────────
    if (data.mode === 'download') {
      const result = await submitToTraces(tracesPayload, 'download');

      // Mark as 'filed' (manually)
      await supabase
        .from('shipments')
        .update({
          prenotif_eu_traces: 'filed',
          prenotif_eu_traces_filed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', shipmentId)
        .eq('org_id', profile.org_id);

      await logAuditEvent({
        orgId: profile.org_id,
        actorId: user.id,
        actorEmail: user.email,
        action: 'dds.downloaded',
        resourceType: 'shipment',
        resourceId: shipmentId,
        metadata: {
          mode: 'download',
          draftReference: tracesPayload.draftReferenceNumber,
          farmCount: farms.length,
          lotCount: lotIds.length,
          commodity,
        },
      });

      return NextResponse.json({
        success: true,
        status: result.status,
        draftReferenceNumber: tracesPayload.draftReferenceNumber,
        payload: tracesPayload,
        instructions: [
          '1. Download this JSON and log in to the EU TRACES portal at https://webgate.ec.europa.eu/tracesnt/',
          '2. Navigate to EUDR → Due Diligence Statements → New Statement',
          '3. Upload this file or copy the values into the TRACES form',
          '4. After submission, copy the TRACES reference number',
          `5. Call POST /api/shipments/${shipmentId}/submit-dds with mode="reference" and the reference number`,
        ],
      });
    }

    // ── Mode: api (future — EC registration required) ─────────────────────────
    if (data.mode === 'api') {
      const result = await submitToTraces(tracesPayload, 'api');

      return NextResponse.json(
        {
          error: result.error,
          status: result.status,
          draftReferenceNumber: tracesPayload.draftReferenceNumber,
          fallback: `Use mode="download" to get the formatted DDS file for manual TRACES portal submission.`,
        },
        { status: 503 }
      );
    }

    return NextResponse.json({ error: 'Unknown mode' }, { status: 400 });
  } catch (error) {
    console.error('Submit DDS error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
