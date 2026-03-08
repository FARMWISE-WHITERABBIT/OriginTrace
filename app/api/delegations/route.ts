import { NextRequest, NextResponse } from 'next/server';
import { enforceTier } from '@/lib/api/tier-guard';
import { createServiceClient } from '@/lib/api-auth';
import { createClient as createServerClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const supabaseAdmin = createServiceClient();
    const supabase = await createServerClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('org_id, role')
      .eq('user_id', user.id)
      .single();

    if (!profile || !['admin', 'aggregator'].includes(profile.role)) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    if (!profile.org_id) {
      return NextResponse.json({ error: 'No organization assigned' }, { status: 403 });
    }

    const tierBlock = await enforceTier(profile.org_id, 'delegations');
    if (tierBlock) return tierBlock;

    const { data: delegations, error } = await supabaseAdmin
      .from('delegations')
      .select('*')
      .eq('org_id', profile.org_id)
      .order('created_at', { ascending: false });

    if (error) throw error;

    const aggregatorIds = [...new Set(delegations?.map(d => d.delegated_to) || [])];
    const adminIds = [...new Set(delegations?.map(d => d.delegated_by) || [])];
    const allUserIds = [...new Set([...aggregatorIds, ...adminIds])];

    let profiles: any[] = [];
    if (allUserIds.length > 0) {
      const { data } = await supabaseAdmin
        .from('profiles')
        .select('user_id, full_name, email, role')
        .in('user_id', allUserIds);
      profiles = data || [];
    }

    const profileMap = Object.fromEntries(profiles.map(p => [p.user_id, p]));
    const enriched = (delegations || []).map(d => ({
      ...d,
      delegated_to_profile: profileMap[d.delegated_to] || null,
      delegated_by_profile: profileMap[d.delegated_by] || null,
    }));

    let aggregators: any[] = [];
    if (profile.role === 'admin') {
      const { data } = await supabaseAdmin
        .from('profiles')
        .select('user_id, full_name, email, assigned_state, assigned_lga')
        .eq('org_id', profile.org_id)
        .eq('role', 'aggregator');
      aggregators = data || [];
    }

    return NextResponse.json({ delegations: enriched, aggregators });
  } catch (error) {
    console.error('Delegations GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch delegations' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabaseAdmin = createServiceClient();
    const supabase = await createServerClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('org_id, role')
      .eq('user_id', user.id)
      .single();

    if (!profile || profile.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    if (!profile.org_id) {
      return NextResponse.json({ error: 'No organization assigned' }, { status: 403 });
    }

    const tierBlock = await enforceTier(profile.org_id, 'delegations');
    if (tierBlock) return tierBlock;

    const body = await request.json();
    const { delegated_to, permission, region_scope, expires_at } = body;

    if (!delegated_to || !permission || !expires_at) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const validPermissions = ['conflict_resolution', 'compliance_review'];
    if (!validPermissions.includes(permission)) {
      return NextResponse.json({ error: 'Invalid permission type' }, { status: 400 });
    }

    const { data: target } = await supabaseAdmin
      .from('profiles')
      .select('user_id, role, org_id')
      .eq('user_id', delegated_to)
      .single();

    if (!target || target.role !== 'aggregator' || target.org_id !== profile.org_id) {
      return NextResponse.json({ error: 'Target must be an aggregator in your organization' }, { status: 400 });
    }

    const { data: existing } = await supabaseAdmin
      .from('delegations')
      .select('id')
      .eq('org_id', profile.org_id)
      .eq('delegated_to', delegated_to)
      .eq('permission', permission)
      .eq('is_active', true)
      .single();

    if (existing) {
      return NextResponse.json({ error: 'Active delegation already exists for this permission' }, { status: 409 });
    }

    const { data: delegation, error } = await supabaseAdmin
      .from('delegations')
      .insert({
        org_id: profile.org_id,
        delegated_to,
        delegated_by: user.id,
        permission,
        region_scope: region_scope || null,
        expires_at,
      })
      .select()
      .single();

    if (error) throw error;

    await supabaseAdmin.from('delegation_audit_log').insert({
      delegation_id: delegation.id,
      org_id: profile.org_id,
      actor_id: user.id,
      action: 'created',
      details: { permission, region_scope, expires_at, delegated_to },
    });

    return NextResponse.json({ delegation });
  } catch (error) {
    console.error('Delegations POST error:', error);
    return NextResponse.json({ error: 'Failed to create delegation' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const supabaseAdmin = createServiceClient();
    const supabase = await createServerClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('org_id, role')
      .eq('user_id', user.id)
      .single();

    if (!profile || profile.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    if (!profile.org_id) {
      return NextResponse.json({ error: 'No organization assigned' }, { status: 403 });
    }

    const body = await request.json();
    const { delegation_id, action } = body;

    if (!delegation_id || action !== 'revoke') {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
    }

    const { error } = await supabaseAdmin
      .from('delegations')
      .update({ is_active: false })
      .eq('id', delegation_id)
      .eq('org_id', profile.org_id);

    if (error) throw error;

    await supabaseAdmin.from('delegation_audit_log').insert({
      delegation_id,
      org_id: profile.org_id,
      actor_id: user.id,
      action: 'revoked',
      details: {},
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delegations PATCH error:', error);
    return NextResponse.json({ error: 'Failed to update delegation' }, { status: 500 });
  }
}
