import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getAuthenticatedProfile } from '@/lib/api-auth';
import { logAuditEvent, getClientIp } from '@/lib/audit';

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

    const farmId = id;

    // Core farm record
    const { data: farm, error: farmError } = await supabase
      .from('farms')
      .select('*')
      .eq('id', farmId)
      .eq('org_id', profile.org_id)
      .single();

    if (farmError || !farm) {
      return NextResponse.json({ error: 'Farmer not found' }, { status: 404 });
    }

    // Ledger row (delivery stats)
    const { data: ledger } = await supabase
      .from('farmer_performance_ledger')
      .select('*')
      .eq('farm_id', farmId)
      .eq('org_id', profile.org_id)
      .single();

    // Collection batches
    const { data: batches } = await supabase
      .from('collection_batches')
      .select('id, batch_code, status, total_weight, bag_count, grade, commodity, collected_at, created_at, yield_validated, yield_flag_reason')
      .eq('farm_id', farmId)
      .eq('org_id', profile.org_id)
      .order('collected_at', { ascending: false });

    // Farmer inputs (agricultural records)
    const { data: inputs } = await supabase
      .from('farmer_inputs')
      .select('*')
      .eq('farm_id', farmId)
      .eq('org_id', profile.org_id)
      .order('application_date', { ascending: false });

    // Farmer training
    const { data: training } = await supabase
      .from('farmer_training')
      .select('*')
      .eq('farm_id', farmId)
      .eq('org_id', profile.org_id)
      .order('created_at', { ascending: false });

    // KYC / compliance files
    const { data: files } = await supabase
      .from('compliance_files')
      .select('id, file_type, file_url, verification_status, created_at')
      .eq('farm_id', farmId)
      .order('created_at', { ascending: false })
      .limit(20);

    // Activity events for this specific farm
    const { data: activity } = await supabase
      .from('audit_events')
      .select('id, action, actor_email, metadata, created_at')
      .eq('resource_id', farmId)
      .eq('org_id', profile.org_id)
      .order('created_at', { ascending: false })
      .limit(50);

    // Disbursement calculations for this farmer (table may not exist in all envs yet)
    let disbursements: any[] = [];
    try {
      const { data: disbData } = await supabase
        .from('disbursement_calculations')
        .select('id, batch_id, farmer_name, weight_kg, price_per_kg, gross_amount, deductions, net_amount, currency, status, payment_id, approved_at, notes, created_at, collection_batches(batch_code, commodity)')
        .eq('farm_id', farmId)
        .eq('org_id', profile.org_id)
        .order('created_at', { ascending: false })
        .limit(50);
      disbursements = disbData ?? [];
    } catch { /* table not yet migrated */ }

    // Direct payments recorded for this farmer
    const { data: payments } = await supabase
      .from('payments')
      .select('id, amount, currency, payment_method, reference_number, payment_date, status, notes, linked_entity_type, linked_entity_id, created_at')
      .eq('org_id', profile.org_id)
      .eq('payee_type', 'farmer')
      .ilike('payee_name', farm.farmer_name)
      .order('payment_date', { ascending: false })
      .limit(50);

    return NextResponse.json({
      farm,
      ledger: ledger ?? null,
      batches: batches ?? [],
      inputs: inputs ?? [],
      training: training ?? [],
      files: files ?? [],
      activity: activity ?? [],
      disbursements: disbursements ?? [],
      payments: payments ?? [],
    });

  } catch (err: any) {
    console.error('[farmers/[id]] error:', err);
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
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!profile?.org_id) return NextResponse.json({ error: 'No organization' }, { status: 403 });

    const editRoles = ['admin', 'aggregator'];
    if (!editRoles.includes(profile.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const body = await request.json();
    const allowed = ['farmer_name', 'phone', 'farmer_id', 'community', 'area_hectares', 'compliance_status', 'compliance_notes', 'commodity', 'consent_timestamp', 'consent_signature', 'boundary'];
    const updates: Record<string, any> = {};
    for (const key of allowed) {
      if (key in body) updates[key] = body[key];
    }
    updates.updated_at = new Date().toISOString();

    const { data: updated, error } = await supabase
      .from('farms')
      .update(updates)
      .eq('id', id)
      .eq('org_id', profile.org_id)
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    // Determine the action label for the audit log
    const action = 'boundary' in updates ? 'farm.boundary_saved' : 'farm.updated';
    await logAuditEvent({
      orgId: profile.org_id,
      actorId: profile.user_id,
      actorEmail: user.email,
      action,
      resourceType: 'farm',
      resourceId: id,
      metadata: { fields: Object.keys(updates).filter(k => k !== 'updated_at') },
      ipAddress: getClientIp(request),
    });

    return NextResponse.json({ farm: updated });

  } catch (err: any) {
    console.error('[farmers/[id]] PATCH error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
