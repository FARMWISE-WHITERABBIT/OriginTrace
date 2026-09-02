import { createAdminClient } from '@/lib/supabase/admin';
import { NextRequest, NextResponse } from 'next/server';
import { logAuditEvent } from '@/lib/audit';
import { exporterActivateSchema, parseBody } from '@/lib/api/validation';

export async function GET(request: NextRequest) {
  try {
    const token = request.nextUrl.searchParams.get('token');
    if (!token) {
      return NextResponse.json({ error: 'Token required' }, { status: 400 });
    }

    const supabase = createAdminClient();
    const { data: link } = await supabase
      .from('supply_chain_links')
      .select('invited_org_name, invite_expires_at, exporter_org_id, status, buyer_org:buyer_organizations(name)')
      .eq('invite_token', token)
      .maybeSingle();

    if (!link || link.exporter_org_id || link.status === 'terminated') {
      return NextResponse.json({ error: 'Invalid or expired invitation' }, { status: 404 });
    }

    if (link.invite_expires_at && new Date(link.invite_expires_at) < new Date()) {
      return NextResponse.json({ error: 'This invitation has expired' }, { status: 410 });
    }

    return NextResponse.json({
      invited_org_name: link.invited_org_name || '',
      buyer_company_name: (link.buyer_org as unknown as { name: string } | null)?.name || 'A buyer',
    });
  } catch (error) {
    console.error('Exporter activate GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.json();
    const { data: body, error: validationError } = parseBody(exporterActivateSchema, rawBody);
    if (validationError) return validationError;
    const { token, orgName, adminName, adminEmail, password } = body;

    const supabase = createAdminClient();

    const { data: link } = await supabase
      .from('supply_chain_links')
      .select('id, buyer_org_id, invite_expires_at, exporter_org_id, status')
      .eq('invite_token', token)
      .maybeSingle();

    if (!link || link.exporter_org_id || link.status === 'terminated') {
      return NextResponse.json({ error: 'Invalid or expired invitation' }, { status: 404 });
    }

    if (link.invite_expires_at && new Date(link.invite_expires_at) < new Date()) {
      return NextResponse.json({ error: 'This invitation has expired' }, { status: 410 });
    }

    const { data: existingUsers } = await supabase.auth.admin.listUsers({ perPage: 1000 });
    const emailExists = existingUsers?.users?.some(
      (u) => u.email?.toLowerCase() === adminEmail.toLowerCase()
    );
    if (emailExists) {
      return NextResponse.json(
        { error: 'A user with this email already exists. Please sign in instead.' },
        { status: 409 }
      );
    }

    const slug = orgName.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-');
    const { data: org, error: orgError } = await supabase
      .from('organizations')
      .insert({
        name: orgName,
        slug: `${slug}-${Date.now().toString(36)}`,
        subscription_status: 'trial',
      })
      .select()
      .single();

    if (orgError || !org) {
      console.error('Exporter activate org creation error:', orgError);
      return NextResponse.json({ error: 'Failed to create organization' }, { status: 500 });
    }

    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: adminEmail,
      password,
      email_confirm: true,
      user_metadata: { full_name: adminName },
    });

    if (authError || !authData.user) {
      console.error('Exporter activate user creation error:', authError);
      await supabase.from('organizations').delete().eq('id', org.id);
      return NextResponse.json(
        { error: authError?.message || 'Failed to create admin user' },
        { status: 500 }
      );
    }

    const { error: profileError } = await supabase
      .from('profiles')
      .insert({
        user_id: authData.user.id,
        org_id: org.id,
        role: 'admin',
        full_name: adminName,
      });

    if (profileError) {
      console.error('Exporter activate profile creation error:', profileError);
      await supabase.auth.admin.deleteUser(authData.user.id);
      await supabase.from('organizations').delete().eq('id', org.id);
      return NextResponse.json({ error: 'Failed to create admin profile' }, { status: 500 });
    }

    await supabase
      .from('supply_chain_links')
      .update({
        exporter_org_id: org.id,
        invite_token: null,
        invite_expires_at: null,
        status: 'active',
        accepted_at: new Date().toISOString(),
      })
      .eq('id', link.id);

    await logAuditEvent({
      orgId: org.id,
      actorId: authData.user.id,
      actorEmail: adminEmail,
      action: 'exporter.invite_accepted',
      resourceType: 'organization',
      resourceId: org.id,
      metadata: { buyer_org_id: link.buyer_org_id, supply_chain_link_id: link.id },
    });

    return NextResponse.json({ success: true, orgId: org.id, orgName: org.name });
  } catch (error) {
    console.error('Exporter activate POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
