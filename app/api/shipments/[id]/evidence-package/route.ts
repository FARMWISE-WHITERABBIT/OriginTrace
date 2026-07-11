/**
 * POST /api/shipments/[id]/evidence-package
 *
 * Assembles a complete evidence package for a shipment, generates a PDF,
 * creates a time-limited shareable token, and returns both.
 *
 * Response:
 *   pdf:          base64-encoded PDF
 *   token:        shareable access token (7 days, public-readable)
 *   shareableUrl: URL for border officer / buyer to view evidence
 *   expiresAt:    ISO timestamp
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient, getAuthenticatedProfile } from '@/lib/api-auth';
import { generateEvidencePdf } from '@/lib/export/evidence-pdf';
import { logAuditEvent } from '@/lib/audit';
import crypto from 'crypto';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: shipmentId } = await params;
    const supabase = createServiceClient();
    const { user, profile } = await getAuthenticatedProfile(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!profile?.org_id) return NextResponse.json({ error: 'No organization' }, { status: 403 });

    // ── Fetch shipment ───────────────────────────────────────────────────────
    const { data: shipment, error: shipmentError } = await supabase
      .from('shipments')
      .select(`
        id, shipment_code, destination_country, status, total_weight_kg, commodity,
        container_number, vessel_name, bill_of_lading_number,
        port_of_loading, port_of_discharge, etd, eta,
        prenotif_eu_traces, prenotif_eu_traces_ref, created_at
      `)
      .eq('id', shipmentId)
      .eq('org_id', profile.org_id)
      .single();

    if (shipmentError || !shipment) {
      return NextResponse.json({ error: 'Shipment not found' }, { status: 404 });
    }

    // ── Fetch org name ───────────────────────────────────────────────────────
    const { data: org } = await supabase
      .from('organizations')
      .select('name')
      .eq('id', profile.org_id)
      .single();

    // ── Fetch linked farms via batches → farm ────────────────────────────────
    // Path: shipment → finished_goods → collection_batches → farms
    // Also direct: shipment_batches junction if it exists; fall back to farmer_name on batches
    // TODO(schema-drift): 'collection_batches' has no 'shipment_id' column — batches now link to
    // shipments indirectly via shipment_items/shipment_lot_items (batch_id → lot/item → shipment_id).
    // This .eq('shipment_id', ...) filter cannot match anything against the live schema; needs a
    // product decision on which junction path is canonical before this can be fixed properly.
    const { data: batches } = await supabase
      .from('collection_batches')
      .select('id, batch_code, collected_at, total_weight, bag_count, farm_id')
      .eq('org_id', profile.org_id)
      .eq('shipment_id', shipmentId);

    const farmIds = [...new Set((batches ?? []).map((b) => b.farm_id).filter(Boolean))];
    let farms: any[] = [];
    if (farmIds.length > 0) {
      const { data: farmRows } = await supabase
        .from('farms')
        .select('id, farmer_name, community, state_id, states(name), compliance_status, boundary_geo, deforestation_check')
        .in('id', farmIds);
      farms = (farmRows ?? []).map((f) => ({
        id: f.id,
        farmer_name: f.farmer_name,
        community: f.community,
        state: f.states?.name,
        compliance_status: f.compliance_status,
        boundary_geo: f.boundary_geo !== null,
        deforestation_check_risk:
          f.deforestation_check
            ? (typeof f.deforestation_check === 'object'
                ? (f.deforestation_check as any).risk_level
                : null) ?? 'checked'
            : 'pending',
      }));
    }
    const farmerNameByFarmId = new Map(farms.map((f) => [f.id, f.farmer_name]));

    // ── Fetch lab results linked to shipment ─────────────────────────────────
    const { data: labResults } = await supabase
      .from('lab_results')
      .select('lab_provider, test_type, test_date, result, certificate_number, certificate_expiry_date')
      .eq('org_id', profile.org_id)
      .eq('shipment_id', shipmentId);

    // ── Fetch compliance documents for shipment ──────────────────────────────
    const { data: documents } = await supabase
      .from('documents')
      .select('document_type, file_name, status, expiry_date')
      .eq('org_id', profile.org_id)
      .eq('linked_entity_type', 'shipment')
      .eq('linked_entity_id', shipmentId)
      .neq('status', 'archived');

    // ── Generate time-limited access token ───────────────────────────────────
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    const generatedAt = new Date().toISOString();

    // ── Generate PDF ─────────────────────────────────────────────────────────
    const pdfDataUri = await generateEvidencePdf({
      orgName:  org?.name ?? 'Unknown Organisation',
      shipment: {
        ...shipment,
        destination_country: shipment.destination_country ?? 'Unknown',
        status: shipment.status ?? 'unknown',
        created_at: shipment.created_at ?? generatedAt,
        shipment_code: shipment.shipment_code ?? undefined,
        total_weight_kg: shipment.total_weight_kg ?? undefined,
        commodity: shipment.commodity ?? undefined,
        container_number: shipment.container_number ?? undefined,
        vessel_name: shipment.vessel_name ?? undefined,
        bill_of_lading_number: shipment.bill_of_lading_number ?? undefined,
        port_of_loading: shipment.port_of_loading ?? undefined,
        port_of_discharge: shipment.port_of_discharge ?? undefined,
        etd: shipment.etd ?? undefined,
        eta: shipment.eta ?? undefined,
        prenotif_eu_traces: shipment.prenotif_eu_traces ?? 'not_filed',
        prenotif_eu_traces_ref: shipment.prenotif_eu_traces_ref ?? undefined,
      },
      farms,
      batches:    (batches ?? []).map((b) => ({
        id:              b.id,
        batch_code:      b.batch_code ?? '',
        collection_date: b.collected_at ?? '',
        total_weight:    b.total_weight ?? 0,
        bag_count:       b.bag_count ?? 0,
        farmer_name:     (b.farm_id ? farmerNameByFarmId.get(b.farm_id) : undefined) ?? 'Unknown',
      })),
      labResults:  (labResults ?? []).map((l) => ({
        ...l,
        certificate_number: l.certificate_number ?? undefined,
        certificate_expiry_date: l.certificate_expiry_date ?? undefined,
      })),
      documents:   (documents ?? []).map((d) => ({
        doc_type: d.document_type,
        file_name: d.file_name ?? '',
        status: d.status ?? 'unknown',
        expiry_date: d.expiry_date ?? undefined,
      })),
      packageToken: token,
      packageExpiresAt: expiresAt,
      generatedAt,
    });

    // ── Persist the evidence package record ──────────────────────────────────
    const { error: insertError } = await supabase
      .from('evidence_packages')
      .insert({
        org_id:      profile.org_id,
        shipment_id: shipmentId,
        token,
        expires_at:  expiresAt,
        created_by:  user.id,
      });

    if (insertError) {
      console.error('Evidence package insert error:', insertError);
      // Non-fatal — PDF was generated; log but continue
    }

    await logAuditEvent({
      orgId:       profile.org_id,
      actorId:     user.id,
      actorEmail:  user.email,
      action:      'evidence_package.created',
      resourceType: 'shipment',
      resourceId:  shipmentId,
      metadata:    { token, expiresAt },
    });

    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? '';
    const shareableUrl = `${appUrl}/evidence/${token}`;

    return NextResponse.json({
      pdf:          pdfDataUri.replace(/^data:application\/pdf;base64,/, ''),
      fileName:     `evidence-package-${shipment.shipment_code ?? shipmentId.slice(0, 8)}.pdf`,
      token,
      shareableUrl,
      expiresAt,
      generatedAt,
    }, { status: 201 });
  } catch (error) {
    console.error('Evidence package error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * GET /api/shipments/[id]/evidence-package
 * List existing (non-expired) evidence packages for a shipment.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = createServiceClient();
    const { user, profile } = await getAuthenticatedProfile(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!profile?.org_id) return NextResponse.json({ error: 'No organization' }, { status: 403 });

    const { data, error } = await supabase
      .from('evidence_packages')
      .select('id, token, expires_at, views, created_at')
      .eq('org_id', profile.org_id)
      .eq('shipment_id', id)
      .gte('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? '';
    return NextResponse.json({
      packages: (data ?? []).map((p: any) => ({
        ...p,
        shareableUrl: `${appUrl}/evidence/${p.token}`,
      })),
    });
  } catch (error) {
    console.error('Evidence package list error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
