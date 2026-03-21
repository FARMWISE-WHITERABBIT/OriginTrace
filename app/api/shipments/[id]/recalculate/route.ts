import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getAuthenticatedProfile } from '@/lib/api-auth';
import { computeShipmentReadiness } from '@/lib/services/shipment-scoring';

/**
 * POST /api/shipments/[id]/recalculate
 * Explicitly trigger a score recalculation and persist the result.
 * Called by the "Recalculate Score" button on the shipment detail page.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = createAdminClient();
    const { user, profile } = await getAuthenticatedProfile(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!profile?.org_id) return NextResponse.json({ error: 'No organization' }, { status: 403 });

    // Fetch shipment with compliance profile
    const { data: shipment, error } = await supabase
      .from('shipments')
      .select('*, compliance_profiles(*)')
      .eq('id', id)
      .eq('org_id', profile.org_id)
      .single();

    if (error || !shipment) return NextResponse.json({ error: 'Shipment not found' }, { status: 404 });

    // Build minimal score input from stored data
    const scoreInput = {
      shipment: {
        id: shipment.id,
        destination_country: shipment.destination_country || null,
        target_regulations: shipment.target_regulations || [],
        doc_status: shipment.doc_status || {},
        storage_controls: shipment.storage_controls || {},
        estimated_ship_date: shipment.estimated_ship_date || null,
      },
      items: [],
      historical_rejection_rate: 0,
      cold_chain_alert_count: 0,
      cold_chain_total_entries: 0,
      lot_count: 0,
      lots_with_valid_mass_balance: 0,
      compliance_profile: shipment.compliance_profiles || null,
      farm_deforestation_checks: [],
      farm_boundary_analyses: [],
    };

    const readiness = computeShipmentReadiness(scoreInput as any);

    const { data: updated } = await supabase
      .from('shipments')
      .update({
        readiness_score: Math.round(readiness.overall_score),
        readiness_decision: readiness.decision,
        risk_flags: readiness.risk_flags,
        score_breakdown: readiness.dimensions,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    return NextResponse.json({ readiness, shipment: updated });
  } catch (err) {
    console.error('[recalculate]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
