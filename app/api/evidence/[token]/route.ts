/**
 * GET /api/evidence/[token]
 *
 * Public (no auth required) evidence package endpoint.
 * Validates the time-limited token and returns the full evidence data as JSON.
 * Used by the shareable /evidence/[token] public view page.
 *
 * Returns 410 Gone when the token has expired.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/api-auth';

export async function GET(
  _request: NextRequest,
  { params }: { params: { token: string } }
) {
  try {
    const supabase = createServiceClient();
    const { token } = params;

    // TODO(schema-drift): 'evidence_packages' is defined in supabase/migrations/20260403_lab_results.sql
    // and matches this code exactly, but it's absent from the generated database.types.ts — the
    // migration was likely never applied to the DB the types were generated from (or types are stale).
    // Cast as `any` here until the migration is applied/reapplied and types regenerated.
    // ── Validate token ───────────────────────────────────────────────────────
    const { data: pkg, error } = await (supabase
      .from('evidence_packages' as any) as any)
      .select('id, org_id, shipment_id, expires_at, views')
      .eq('token', token)
      .single();

    if (error || !pkg) {
      return NextResponse.json({ error: 'Evidence package not found' }, { status: 404 });
    }

    if (new Date(pkg.expires_at) < new Date()) {
      return NextResponse.json(
        { error: 'This evidence package has expired', expiredAt: pkg.expires_at },
        { status: 410 }
      );
    }

    // Increment view counter (fire-and-forget)
    (supabase
      .from('evidence_packages' as any) as any)
      .update({ views: pkg.views + 1 })
      .eq('id', pkg.id)
      .then(() => {});

    // ── Fetch shipment ───────────────────────────────────────────────────────
    const { data: shipment } = await supabase
      .from('shipments')
      .select(`
        id, shipment_code, destination_country, status, total_weight_kg, commodity,
        container_number, vessel_name, bill_of_lading_number,
        port_of_loading, port_of_discharge, etd, eta,
        prenotif_eu_traces, prenotif_eu_traces_ref, created_at
      `)
      .eq('id', pkg.shipment_id)
      .single();

    // ── Fetch org name ───────────────────────────────────────────────────────
    const { data: org } = await supabase
      .from('organizations')
      .select('name')
      .eq('id', pkg.org_id)
      .single();

    // ── Fetch batches and farms ──────────────────────────────────────────────
    // TODO(schema-drift): 'collection_batches' has no 'shipment_id' column — batches now link to
    // shipments indirectly via shipment_items/shipment_lot_items (batch_id → lot/item → shipment_id).
    // This .eq('shipment_id', ...) filter cannot match anything against the live schema; needs a
    // product decision on which junction path is canonical before this can be fixed properly.
    const { data: batches } = await supabase
      .from('collection_batches')
      .select('id, batch_code, collected_at, total_weight, bag_count, farm_id')
      .eq('org_id', pkg.org_id)
      .eq('shipment_id', pkg.shipment_id);

    const farmIds = [...new Set((batches ?? []).map((b) => b.farm_id).filter(Boolean))];
    let farms: any[] = [];
    if (farmIds.length > 0) {
      const { data: farmRows } = await supabase
        .from('farms')
        .select('id, farmer_name, community, state_id, states(name), compliance_status, boundary_geo')
        .in('id', farmIds);
      farms = (farmRows ?? []).map((f) => ({
        id: f.id,
        farmer_name: f.farmer_name,
        community: f.community,
        state: f.states?.name,
        compliance_status: f.compliance_status,
        boundary_geo: f.boundary_geo,
      }));
    }
    const farmerNameByFarmId = new Map(farms.map((f) => [f.id, f.farmer_name]));

    // ── Fetch lab results ────────────────────────────────────────────────────
    const { data: labResults } = await supabase
      .from('lab_results')
      .select('lab_provider, test_type, test_date, result, certificate_number, certificate_expiry_date')
      .eq('org_id', pkg.org_id)
      .eq('shipment_id', pkg.shipment_id);

    // ── Fetch compliance documents ───────────────────────────────────────────
    const { data: documents } = await supabase
      .from('documents')
      .select('document_type, file_name, status, expiry_date')
      .eq('org_id', pkg.org_id)
      .eq('linked_entity_type', 'shipment')
      .eq('linked_entity_id', pkg.shipment_id)
      .neq('status', 'archived');

    return NextResponse.json({
      orgName:    org?.name ?? 'Unknown Organisation',
      shipment,
      farms,
      batches:    (batches ?? []).map((b) => ({
        id: b.id,
        batch_code: b.batch_code,
        collection_date: b.collected_at,
        total_weight: b.total_weight,
        bag_count: b.bag_count,
        farmer_name: b.farm_id ? farmerNameByFarmId.get(b.farm_id) : undefined,
      })),
      labResults: labResults ?? [],
      documents:  (documents ?? []).map((d) => ({
        doc_type: d.document_type,
        file_name: d.file_name,
        status: d.status,
        expiry_date: d.expiry_date,
      })),
      package: {
        token,
        expiresAt: pkg.expires_at,
        views:     pkg.views + 1,
      },
    });
  } catch (error) {
    console.error('Evidence token lookup error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
