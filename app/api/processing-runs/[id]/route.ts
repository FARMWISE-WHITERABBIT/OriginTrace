import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getAuthenticatedProfile } from '@/lib/api-auth';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = createAdminClient();
    const { user, profile } = await getAuthenticatedProfile(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!profile?.org_id) return NextResponse.json({ error: 'No organization' }, { status: 403 });

    const body = await request.json();
    const allowed = [
      'facility_name', 'facility_location', 'notes',
      // Dispatch output fields
      'dispatch_destination', 'dispatch_vehicle_ref',
      'dispatch_driver_phone', 'dispatched_output_at', 'dispatch_notes',
      'dispatch_driver_name', 'expected_arrival_at', 'dispatch_recorded_at',
    ];
    const updates: Record<string, any> = {};
    for (const key of allowed) {
      if (key in body) updates[key] = body[key];
    }

    // Auto-set dispatch_recorded_at when dispatched_output_at is being set
    if ('dispatched_output_at' in updates && !('dispatch_recorded_at' in updates)) {
      updates.dispatch_recorded_at = new Date().toISOString();
    }

    const { error } = await supabase
      .from('processing_runs')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('org_id', profile.org_id);

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

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

    // Core run record
    const { data: run, error: runErr } = await supabase
      .from('processing_runs')
      .select('*')
      .eq('id', id)
      .eq('org_id', profile.org_id)
      .single();

    if (runErr || !run) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    // Source batches via processing_run_batches junction
    const { data: runBatches } = await supabase
      .from('processing_run_batches')
      .select(`
        weight_contribution_kg,
        collection_batches (
          id, batch_code, commodity, total_weight,
          collected_at, status, community, state
        )
      `)
      .eq('processing_run_id', id);

    const sourceBatches = (runBatches || []).map((rb: any) => ({
      id: rb.collection_batches?.id,
      batch_code: rb.collection_batches?.batch_code,
      commodity: rb.collection_batches?.commodity,
      total_weight: rb.collection_batches?.total_weight,
      collected_at: rb.collection_batches?.collected_at,
      status: rb.collection_batches?.status,
      community: rb.collection_batches?.community || rb.collection_batches?.state,
      weight_contribution_kg: rb.weight_contribution_kg,
    })).filter((b: any) => b.id);

    // Finished goods produced by this run
    const { data: finishedGoods } = await supabase
      .from('finished_goods')
      .select('id, pedigree_code, product_name, product_type, weight_kg, destination_country, buyer_company, pedigree_verified, production_date')
      .eq('processing_run_id', id)
      .eq('org_id', profile.org_id);

    // DPPs linked to those finished goods
    const fgIds = (finishedGoods || []).map((fg: any) => fg.id);
    let dpps: any[] = [];
    if (fgIds.length > 0) {
      const { data: dppData } = await supabase
        .from('digital_product_passports')
        .select('id, dpp_code, status, finished_good_id')
        .in('finished_good_id', fgIds)
        .eq('org_id', profile.org_id);
      dpps = dppData || [];
    }

    return NextResponse.json({
      run,
      source_batches: sourceBatches,
      finished_goods: finishedGoods || [],
      dpps,
    });

  } catch (err: any) {
    console.error('[processing-runs/[id]]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
