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

    // Core batch with farm info
    const { data: batch, error: batchErr } = await supabase
      .from('collection_batches')
      .select(`
        *,
        farm:farms(id, farmer_name, phone, community, state, area_hectares, commodity, compliance_status)
      `)
      .eq('id', id)
      .eq('org_id', profile.org_id)
      .single();

    if (batchErr || !batch) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    // Bags in this batch
    const { data: bags } = await supabase
      .from('bags')
      .select('id, serial, status, weight_kg, grade')
      .eq('collection_batch_id', id)
      .eq('org_id', profile.org_id)
      .order('serial', { ascending: true })
      .limit(200);

    // Batch contributions (multi-farm batches)
    const { data: contributions } = await supabase
      .from('batch_contributions')
      .select(`
        farm_id, farmer_name, weight_kg, bag_count, grade,
        compliance_status, community
      `)
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
    const allowed = ['grade', 'notes'];
    const updates: Record<string, string> = {};
    for (const key of allowed) { if (key in body) updates[key] = body[key]; }
    const { error } = await supabase.from('collection_batches').update({ ...updates, updated_at: new Date().toISOString() }).eq('id', id).eq('org_id', profile.org_id);
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ success: true });
  } catch { return NextResponse.json({ error: 'Internal server error' }, { status: 500 }); }
}
