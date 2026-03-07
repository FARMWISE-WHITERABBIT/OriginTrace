import { createClient } from '@supabase/supabase-js';
import { createClient as createServerClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

async function getAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !supabaseServiceKey) return null;
  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  });
}

async function getAuthUser() {
  const supabase = await createServerClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return null;
  return user;
}

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

    const supabaseAdmin = await getAdminClient();
    if (!supabaseAdmin) return NextResponse.json({ error: 'Server config error' }, { status: 500 });

    const { data: buyerProfile } = await supabaseAdmin
      .from('buyer_profiles')
      .select('buyer_org_id')
      .eq('user_id', user.id)
      .single();

    const { data: exporterProfile } = await supabaseAdmin
      .from('profiles')
      .select('org_id, role')
      .eq('user_id', user.id)
      .single();

    let links = [];

    if (buyerProfile) {
      const { data } = await supabaseAdmin
        .from('supply_chain_links')
        .select('*, exporter_org:organizations!supply_chain_links_exporter_org_id_fkey(id, name, slug, logo_url)')
        .eq('buyer_org_id', buyerProfile.buyer_org_id)
        .order('invited_at', { ascending: false });
      links = data || [];
    } else if (exporterProfile) {
      const { data } = await supabaseAdmin
        .from('supply_chain_links')
        .select('*, buyer_org:buyer_organizations!supply_chain_links_buyer_org_id_fkey(id, name, slug, logo_url, country)')
        .eq('exporter_org_id', exporterProfile.org_id)
        .order('invited_at', { ascending: false });
      links = data || [];
    }

    return NextResponse.json({ links });
  } catch (error) {
    console.error('Supply chain links GET error:', error);
    return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

    const supabaseAdmin = await getAdminClient();
    if (!supabaseAdmin) return NextResponse.json({ error: 'Server config error' }, { status: 500 });

    const { data: buyerProfile } = await supabaseAdmin
      .from('buyer_profiles')
      .select('buyer_org_id, role')
      .eq('user_id', user.id)
      .single();

    if (!buyerProfile || buyerProfile.role !== 'buyer_admin') {
      return NextResponse.json({ error: 'Only buyer admins can create invitations' }, { status: 403 });
    }

    const body = await request.json();
    const { exporter_org_name, exporter_email } = body;

    if (!exporter_org_name) {
      return NextResponse.json({ error: 'Exporter organization name is required' }, { status: 400 });
    }

    const { data: exporterOrg } = await supabaseAdmin
      .from('organizations')
      .select('id, name')
      .ilike('name', `%${exporter_org_name}%`)
      .limit(1)
      .single();

    if (!exporterOrg) {
      return NextResponse.json({ error: 'Exporter organization not found' }, { status: 404 });
    }

    const { data: existing } = await supabaseAdmin
      .from('supply_chain_links')
      .select('id, status')
      .eq('buyer_org_id', buyerProfile.buyer_org_id)
      .eq('exporter_org_id', exporterOrg.id)
      .single();

    if (existing) {
      return NextResponse.json({ error: `Link already exists with status: ${existing.status}` }, { status: 409 });
    }

    const { data: link, error: insertError } = await supabaseAdmin
      .from('supply_chain_links')
      .insert({
        buyer_org_id: buyerProfile.buyer_org_id,
        exporter_org_id: exporterOrg.id,
        status: 'pending',
        invited_by: user.id,
      })
      .select()
      .single();

    if (insertError) {
      console.error('Link insert error:', insertError);
      return NextResponse.json({ error: 'Failed to create invitation' }, { status: 500 });
    }

    return NextResponse.json({ link });
  } catch (error) {
    console.error('Supply chain links POST error:', error);
    return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

    const supabaseAdmin = await getAdminClient();
    if (!supabaseAdmin) return NextResponse.json({ error: 'Server config error' }, { status: 500 });

    const body = await request.json();
    const { link_id, status } = body;

    if (!link_id || !status) {
      return NextResponse.json({ error: 'link_id and status are required' }, { status: 400 });
    }

    if (!['active', 'suspended', 'terminated'].includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
    }

    const { data: link } = await supabaseAdmin
      .from('supply_chain_links')
      .select('id, buyer_org_id, exporter_org_id, status')
      .eq('id', link_id)
      .single();

    if (!link) {
      return NextResponse.json({ error: 'Link not found' }, { status: 404 });
    }

    const { data: buyerProfile } = await supabaseAdmin
      .from('buyer_profiles')
      .select('buyer_org_id')
      .eq('user_id', user.id)
      .single();

    const { data: exporterProfile } = await supabaseAdmin
      .from('profiles')
      .select('org_id, role')
      .eq('user_id', user.id)
      .single();

    const isBuyerSide = buyerProfile && link.buyer_org_id === buyerProfile.buyer_org_id;
    const isExporterSide = exporterProfile && link.exporter_org_id === exporterProfile.org_id && exporterProfile.role === 'admin';

    if (!isBuyerSide && !isExporterSide) {
      return NextResponse.json({ error: 'Not authorized to modify this link' }, { status: 403 });
    }

    if (status === 'active' && !isExporterSide) {
      return NextResponse.json({ error: 'Only exporters can accept invitations' }, { status: 403 });
    }

    const updateData: Record<string, unknown> = { status };
    if (status === 'active') {
      updateData.accepted_at = new Date().toISOString();
    }

    const { data: updated, error: updateError } = await supabaseAdmin
      .from('supply_chain_links')
      .update(updateData)
      .eq('id', link_id)
      .select()
      .single();

    if (updateError) {
      console.error('Link update error:', updateError);
      return NextResponse.json({ error: 'Failed to update link' }, { status: 500 });
    }

    return NextResponse.json({ link: updated });
  } catch (error) {
    console.error('Supply chain links PATCH error:', error);
    return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 });
  }
}
