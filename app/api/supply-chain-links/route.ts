import { createClient as createServerClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { getAuthenticatedProfile } from '@/lib/api-auth';
import { sendEmail } from '@/lib/email/resend-client';
import { buildBuyerInvitationEmail, buildExporterSignupInvitationEmail } from '@/lib/email/templates';
import { supplyChainLinkSchema, parseBody } from '@/lib/api/validation';

const INVITE_TTL_DAYS = 14;

function getAdminClient() {
  return createAdminClient();
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

    let links: any[] = [];

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

    const rawBody = await request.json();
    const { data: body, error: validationError } = parseBody(supplyChainLinkSchema, rawBody);
    if (validationError) return validationError;
    const { exporter_org_name, exporter_email } = body;

    const { data: buyerOrg } = await supabaseAdmin
      .from('buyer_organizations')
      .select('name')
      .eq('id', buyerProfile.buyer_org_id)
      .single();

    const buyerCompanyName = buyerOrg?.name || 'A buyer';

    const { data: exporterOrg } = await supabaseAdmin
      .from('organizations')
      .select('id, name')
      .ilike('name', `%${exporter_org_name}%`)
      .limit(1)
      .single();

    if (exporterOrg) {
      // Existing tenant: link directly, same as before.
      const { data: existing } = await supabaseAdmin
        .from('supply_chain_links')
        .select('id, status')
        .eq('buyer_org_id', buyerProfile.buyer_org_id)
        .eq('exporter_org_id', exporterOrg.id)
        .maybeSingle();

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

      try {
        const { data: exporterAdmins } = await supabaseAdmin
          .from('profiles')
          .select('user_id, full_name')
          .eq('org_id', exporterOrg.id)
          .eq('role', 'admin');

        if (exporterAdmins && exporterAdmins.length > 0) {
          const adminUserIds = exporterAdmins.map((a: { user_id: string }) => a.user_id);
          const { data: { users: adminUsers } } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 });
          const adminEmails = adminUsers
            ?.filter((u: { id: string }) => adminUserIds.includes(u.id))
            .map((u: { email?: string }) => u.email)
            .filter(Boolean) as string[];

          if (adminEmails && adminEmails.length > 0) {
            const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://origintrace.trade';
            const acceptUrl = `${baseUrl}/app/traceability`;

            const { html, text } = buildBuyerInvitationEmail({
              buyerCompanyName,
              exporterOrgName: exporterOrg.name,
              acceptUrl,
            });

            await sendEmail({
              to: adminEmails,
              subject: `Supply Chain Invitation from ${buyerCompanyName} - OriginTrace`,
              html,
              text,
            });
          }
        }
      } catch (emailError) {
        console.error('Failed to send buyer invitation email:', emailError);
      }

      return NextResponse.json({ link });
    }

    // No existing tenant matched: invite a brand-new exporter by email. They
    // get a token-gated signup link (app/auth/exporter-activate) instead of
    // requiring a superadmin to provision their org up front.
    if (!exporter_email) {
      return NextResponse.json(
        { error: 'No exporter found with that name. Provide their email to send a signup invitation instead.' },
        { status: 404 }
      );
    }

    const { data: existingInvite } = await supabaseAdmin
      .from('supply_chain_links')
      .select('id, status')
      .eq('buyer_org_id', buyerProfile.buyer_org_id)
      .eq('invited_email', exporter_email)
      .is('exporter_org_id', null)
      .maybeSingle();

    if (existingInvite && existingInvite.status !== 'terminated') {
      return NextResponse.json(
        { error: `An invitation to ${exporter_email} is already pending` },
        { status: 409 }
      );
    }

    const inviteToken = crypto.randomUUID().replace(/-/g, '');
    const inviteExpiresAt = new Date(Date.now() + INVITE_TTL_DAYS * 24 * 60 * 60 * 1000).toISOString();

    const { data: link, error: insertError } = await supabaseAdmin
      .from('supply_chain_links')
      .insert({
        buyer_org_id: buyerProfile.buyer_org_id,
        exporter_org_id: null,
        invited_email: exporter_email,
        invited_org_name: exporter_org_name,
        invite_token: inviteToken,
        invite_expires_at: inviteExpiresAt,
        status: 'pending',
        invited_by: user.id,
      })
      .select()
      .single();

    if (insertError) {
      console.error('Invite insert error:', insertError);
      return NextResponse.json({ error: 'Failed to create invitation' }, { status: 500 });
    }

    try {
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://origintrace.trade';
      const acceptUrl = `${baseUrl}/auth/exporter-activate?token=${inviteToken}`;

      const { html, text } = buildExporterSignupInvitationEmail({
        buyerCompanyName,
        invitedOrgName: exporter_org_name,
        acceptUrl,
      });

      await sendEmail({
        to: exporter_email,
        subject: `${buyerCompanyName} invited you to join OriginTrace`,
        html,
        text,
      });
    } catch (emailError) {
      console.error('Failed to send exporter signup invitation email:', emailError);
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
