import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getAuthenticatedProfile } from '@/lib/api-auth';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = createAdminClient();
    const { user, profile } = await getAuthenticatedProfile(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!profile?.org_id) return NextResponse.json({ error: 'No organization' }, { status: 403 });

    // Finished good — lookup by UUID or pedigree_code
    let query = supabase
      .from('finished_goods')
      .select(`
        *,
        processing_runs (
          id, run_code, facility_name, facility_location,
          commodity, input_weight_kg, output_weight_kg,
          recovery_rate, mass_balance_valid, processed_at
        )
      `)
      .eq('org_id', profile.org_id);

    // Try UUID first, fall back to pedigree_code
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
    const { data: fg, error: fgErr } = isUUID
      ? await query.eq('id', id).single()
      : await query.eq('pedigree_code', id).single();

    if (fgErr || !fg) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    // Linked DPP (if any)
    const { data: dpp } = await supabase
      .from('digital_product_passports')
      .select('id, dpp_code, status, issued_at, certifications, sustainability_claims')
      .eq('finished_good_id', fg.id)
      .eq('org_id', profile.org_id)
      .maybeSingle();

    // Shipment items linking this FG to a shipment
    const { data: shipmentItem } = await supabase
      .from('shipment_items')
      .select(`
        weight_kg,
        shipments (
          id, shipment_code, status, destination_country,
          destination_port, readiness_score, readiness_decision,
          estimated_ship_date
        )
      `)
      .eq('finished_good_id', fg.id)
      .maybeSingle();

    const shipment = (shipmentItem as any)?.shipments ?? null;

    // Source batches via the processing run
    let sourceBatches: any[] = [];
    if (fg.processing_run_id) {
      const { data: runBatches } = await supabase
        .from('processing_run_batches')
        .select(`
          weight_contribution_kg,
          collection_batches (
            id, batch_code, commodity, total_weight, collected_at,
            community, state,
            farm:farms(id, farmer_name, community, compliance_status)
          )
        `)
        .eq('processing_run_id', fg.processing_run_id);

      sourceBatches = (runBatches || []).map((rb: any) => ({
        id: rb.collection_batches?.id,
        batch_code: rb.collection_batches?.batch_code,
        commodity: rb.collection_batches?.commodity,
        total_weight: rb.collection_batches?.total_weight,
        collected_at: rb.collection_batches?.collected_at,
        community: rb.collection_batches?.community || rb.collection_batches?.state,
        farmer_name: rb.collection_batches?.farm?.farmer_name,
        farm_id: rb.collection_batches?.farm?.id,
        compliance_status: rb.collection_batches?.farm?.compliance_status,
        weight_contribution_kg: rb.weight_contribution_kg,
      })).filter((b: any) => b.id);
    }

    return NextResponse.json({
      finished_good: fg,
      processing_run: fg.processing_runs ?? null,
      dpp: dpp ?? null,
      shipment,
      source_batches: sourceBatches,
    });

  } catch (err: any) {
    console.error('[pedigree/[id]]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
