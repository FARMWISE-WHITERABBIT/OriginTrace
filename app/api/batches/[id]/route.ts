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

    // Core batch with farm info — guard against missing columns gracefully
    const { data: batch, error: batchErr } = await supabase
      .from('collection_batches')
      .select(`
        *,
        farm:farms(id, farmer_name, phone, community, area_hectares, commodity, compliance_status)
      `)
      .eq('id', id)
      .eq('org_id', profile.org_id)
      .single();

    if (batchErr || !batch) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    // Bags in this batch — weight_kg and grade may not exist on older DBs
    let bags: any[] = [];
    const bagsResult = await supabase
      .from('bags')
      .select('id, serial, status, weight_kg, grade')
      .eq('collection_batch_id', id)
      .eq('org_id', profile.org_id)
      .order('serial', { ascending: true })
      .limit(200);
    if (bagsResult.error?.message?.includes('weight_kg') || bagsResult.error?.message?.includes('grade')) {
      const fallback = await supabase
        .from('bags').select('id, serial, status')
        .eq('collection_batch_id', id).eq('org_id', profile.org_id)
        .order('serial', { ascending: true }).limit(200);
      bags = fallback.data || [];
    } else {
      bags = bagsResult.data || [];
    }

    // Batch contributions — only select columns that exist in live schema
    const { data: contributions } = await supabase
      .from('batch_contributions')
      .select('farm_id, farmer_name, weight_kg, bag_count, compliance_status, notes')
      .eq('batch_id', id);

    // Processing run that used this batch
    const { data: processingLink } = await supabase
      .from('processing_run_batches')
      .select(`
        weight_contribution_kg,
        processing_runs(id, run_code, facility_name, mass_balance_valid, recovery_rate, processed_at)
      `)
      .eq('collection_batch_id', id)
      .limit(1)
      .maybeSingle();

    const processingRun = processingLink ? {
      ...(processingLink as any).processing_runs,
      weight_contribution_kg: (processingLink as any).weight_contribution_kg,
    } : null;

    // Documents linked to this batch
    const { data: documents } = await supabase
      .from('documents')
      .select('id, title, document_type, status, expiry_date, file_url')
      .eq('linked_entity_type', 'collection_batch')
      .eq('linked_entity_id', id)
      .eq('org_id', profile.org_id);

    return NextResponse.json({
      batch,
      bags: bags || [],
      contributions: contributions || [],
      processing_run: processingRun,
      documents: documents || [],
    });

  } catch (err: any) {
    console.error('[batches/[id]]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = createAdminClient();
    const { user, profile } = await getAuthenticatedProfile(request);
    if (!user || !profile?.org_id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const body = await request.json();

    // Dispatch action — updates status + dispatch tracking fields
    if (body.action === 'dispatch') {
      if (!['admin', 'aggregator', 'logistics_coordinator'].includes(profile.role)) {
        return NextResponse.json({ error: 'Insufficient permissions to dispatch' }, { status: 403 });
      }
      if (!body.dispatch_destination) {
        return NextResponse.json({ error: 'dispatch_destination is required' }, { status: 400 });
      }

      const now = new Date().toISOString();
      const dispatchUpdates: Record<string, any> = {
        status: 'dispatched',
        updated_at: now,
      };
      if (body.dispatch_destination)  dispatchUpdates.dispatch_destination  = body.dispatch_destination;
      if (body.vehicle_reference)     dispatchUpdates.vehicle_reference     = body.vehicle_reference;
      if (body.driver_name)           dispatchUpdates.driver_name           = body.driver_name;
      if (body.driver_phone)          dispatchUpdates.driver_phone          = body.driver_phone;
      if (body.expected_arrival_at)   dispatchUpdates.expected_arrival_at   = body.expected_arrival_at;
      // dispatched_at = user-specified time when dispatch actually happened; falls back to now
      dispatchUpdates.dispatched_at        = body.dispatched_at || now;
      dispatchUpdates.dispatch_recorded_at = now;   // always system time
      dispatchUpdates.dispatched_by        = user.id;

      const { error } = await supabase
        .from('collection_batches')
        .update(dispatchUpdates)
        .eq('id', id)
        .eq('org_id', profile.org_id);

      if (error) {
        // If the dispatch columns don't exist yet, fall back to just updating status
        if (error.code === '42703' || error.message?.includes('column')) {
          const { error: fallbackError } = await supabase
            .from('collection_batches')
            .update({ status: 'dispatched', updated_at: new Date().toISOString() })
            .eq('id', id)
            .eq('org_id', profile.org_id);
          if (fallbackError) return NextResponse.json({ error: fallbackError.message }, { status: 400 });
        } else {
          return NextResponse.json({ error: error.message }, { status: 400 });
        }
      }
      return NextResponse.json({ success: true, dispatched: true });
    }

    // Standard field update
    const allowed = ['grade', 'notes'];
    const updates: Record<string, any> = {};
    for (const key of allowed) { if (key in body) updates[key] = body[key]; }
    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
    }
    const { error } = await supabase
      .from('collection_batches')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('org_id', profile.org_id);
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ success: true });
  } catch { return NextResponse.json({ error: 'Internal server error' }, { status: 500 }); }
}
