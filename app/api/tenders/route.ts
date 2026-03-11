import { createClient as createServerClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { NextRequest, NextResponse } from 'next/server';
import { parsePagination } from '@/lib/api/validation';
import { getAuthenticatedProfile } from '@/lib/api-auth';
import { logAuditEvent, getClientIp } from '@/lib/audit';
import { dispatchWebhookEvent } from '@/lib/webhooks';
import { z } from 'zod';

const tenderCreateSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  commodity: z.string().min(1, 'Commodity is required'),
  quantity_mt: z.number().positive('Quantity must be positive'),
  target_price_per_mt: z.number().positive().optional(),
  currency: z.string().default('USD'),
  delivery_deadline: z.string().optional(),
  destination_country: z.string().optional(),
  destination_port: z.string().optional(),
  quality_requirements: z.record(z.any()).optional(),
  certifications_required: z.array(z.string()).optional(),
  regulation_framework: z.string().optional(),
  visibility: z.enum(['public', 'invited']).default('public'),
  invited_orgs: z.array(z.string()).optional(),
  closes_at: z.string().optional(),
});

const tenderPatchSchema = z.object({
  tender_id: z.string().uuid(),
  status: z.enum(['open', 'closed', 'awarded', 'cancelled']).optional(),
  award_bid_id: z.string().uuid().optional(),
});

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

    const supabaseAdmin = createAdminClient();

    const { data: buyerProfile } = await supabaseAdmin
      .from('buyer_profiles')
      .select('buyer_org_id, role'), { count: 'exact' }
      .eq('user_id', user.id)
      .single();

    const { data: exporterProfile } = await supabaseAdmin
      .from('profiles')
      .select('org_id, role')
      .eq('user_id', user.id)
      .single();

    let tenders: any[] = [];

    if (buyerProfile) {
      const { data } = await supabaseAdmin
        .from('tenders')
        .select('*')
        .eq('buyer_org_id', buyerProfile.buyer_org_id)
        .order('created_at', { ascending: false })
      .range(from, to);
      tenders = data || [];

      for (const tender of tenders) {
        const { count } = await supabaseAdmin
          .from('tender_bids')
          .select('id', { count: 'exact', head: true })
          .eq('tender_id', tender.id);
        tender.bid_count = count || 0;
      }
    } else if (exporterProfile) {
      const { data: publicTenders } = await supabaseAdmin
        .from('tenders')
        .select('*, buyer_org:buyer_organizations!tenders_buyer_org_id_fkey(id, name, slug, country)')
        .eq('status', 'open')
        .eq('visibility', 'public')
        .order('created_at', { ascending: false });

      const { data: invitedTenders } = await supabaseAdmin
        .from('tenders')
        .select('*, buyer_org:buyer_organizations!tenders_buyer_org_id_fkey(id, name, slug, country)')
        .eq('status', 'open')
        .eq('visibility', 'invited')
        .contains('invited_orgs', [exporterProfile.org_id])
        .order('created_at', { ascending: false });

      const allTenders = [...(publicTenders || []), ...(invitedTenders || [])];
      const seen = new Set<string>();
      tenders = allTenders.filter(t => {
        if (seen.has(t.id)) return false;
        seen.add(t.id);
        return true;
      });

      for (const tender of tenders) {
        const { data: myBid } = await supabaseAdmin
          .from('tender_bids')
          .select('id, status, price_per_mt, quantity_available_mt')
          .eq('tender_id', tender.id)
          .eq('exporter_org_id', exporterProfile.org_id)
          .maybeSingle();
        tender.my_bid = myBid || null;
      }
    }

    return NextResponse.json({ tenders, pagination: { page, limit, total: count ?? 0 } });
  } catch (error) {
    console.error('Tenders GET error:', error);
    return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

    const supabaseAdmin = createAdminClient();

    const { data: buyerProfile } = await supabaseAdmin
      .from('buyer_profiles')
      .select('buyer_org_id, role')
      .eq('user_id', user.id)
      .single();

    if (!buyerProfile || buyerProfile.role !== 'buyer_admin') {
      return NextResponse.json({ error: 'Only buyer admins can create tenders' }, { status: 403 });
    }

    const body = await request.json();
    const parsed = tenderCreateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', fields: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const tenderData = {
      buyer_org_id: buyerProfile.buyer_org_id,
      title: parsed.data.title,
      commodity: parsed.data.commodity,
      quantity_mt: parsed.data.quantity_mt,
      target_price_per_mt: parsed.data.target_price_per_mt || null,
      currency: parsed.data.currency,
      delivery_deadline: parsed.data.delivery_deadline || null,
      destination_country: parsed.data.destination_country || null,
      destination_port: parsed.data.destination_port || null,
      quality_requirements: parsed.data.quality_requirements || {},
      certifications_required: parsed.data.certifications_required || [],
      regulation_framework: parsed.data.regulation_framework || null,
      visibility: parsed.data.visibility,
      invited_orgs: parsed.data.invited_orgs || [],
      closes_at: parsed.data.closes_at || null,
      created_by: user.id,
      status: 'open',
    };

    const { data: tender, error: insertError } = await supabaseAdmin
      .from('tenders')
      .insert(tenderData)
      .select()
      .single();

    if (insertError) {
      console.error('Tender insert error:', insertError);
      return NextResponse.json({ error: 'Failed to create tender' }, { status: 500 });
    }

    await logAuditEvent({
      actorId: user.id,
      actorEmail: user.email,
      action: 'tender.created',
      resourceType: 'tender',
      resourceId: tender.id,
      metadata: { title: tender.title, commodity: tender.commodity, quantity_mt: tender.quantity_mt },
      ipAddress: getClientIp(request),
    });

    dispatchWebhookEvent(buyerProfile.buyer_org_id, 'tender.created', {
      tender_id: tender.id,
      title: tender.title,
      commodity: tender.commodity,
      quantity_mt: tender.quantity_mt,
    });

    return NextResponse.json({ tender });
  } catch (error) {
    console.error('Tenders POST error:', error);
    return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

    const supabaseAdmin = createAdminClient();

    const body = await request.json();
    const parsed = tenderPatchSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', fields: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { tender_id, status, award_bid_id } = parsed.data;

    const { data: buyerProfile } = await supabaseAdmin
      .from('buyer_profiles')
      .select('buyer_org_id, role')
      .eq('user_id', user.id)
      .single();

    if (!buyerProfile || buyerProfile.role !== 'buyer_admin') {
      return NextResponse.json({ error: 'Only buyer admins can update tenders' }, { status: 403 });
    }

    const { data: tender } = await supabaseAdmin
      .from('tenders')
      .select('*')
      .eq('id', tender_id)
      .eq('buyer_org_id', buyerProfile.buyer_org_id)
      .single();

    if (!tender) {
      return NextResponse.json({ error: 'Tender not found' }, { status: 404 });
    }

    if (award_bid_id) {
      const { data: bid } = await supabaseAdmin
        .from('tender_bids')
        .select('*')
        .eq('id', award_bid_id)
        .eq('tender_id', tender_id)
        .single();

      if (!bid) {
        return NextResponse.json({ error: 'Bid not found' }, { status: 404 });
      }

      await supabaseAdmin
        .from('tender_bids')
        .update({ status: 'awarded' })
        .eq('id', award_bid_id);

      await supabaseAdmin
        .from('tender_bids')
        .update({ status: 'rejected' })
        .eq('tender_id', tender_id)
        .neq('id', award_bid_id)
        .in('status', ['submitted', 'shortlisted']);

      await supabaseAdmin
        .from('tenders')
        .update({ status: 'awarded' })
        .eq('id', tender_id);

      const contractRef = `CTR-T-${Date.now().toString(36).toUpperCase()}`;
      const { data: contract } = await supabaseAdmin
        .from('contracts')
        .insert({
          buyer_org_id: buyerProfile.buyer_org_id,
          exporter_org_id: bid.exporter_org_id,
          contract_reference: contractRef,
          commodity: tender.commodity,
          quantity_mt: bid.quantity_available_mt,
          delivery_deadline: bid.delivery_date || tender.delivery_deadline,
          destination_port: tender.destination_port,
          quality_requirements: tender.quality_requirements || {},
          price_per_unit: bid.price_per_mt,
          currency: tender.currency,
          notes: `Auto-created from tender "${tender.title}" (Bid ${award_bid_id})`,
          status: 'active',
          created_by: user.id,
        })
        .select()
        .single();

      await logAuditEvent({
        actorId: user.id,
        actorEmail: user.email,
        action: 'tender.awarded',
        resourceType: 'tender',
        resourceId: tender_id,
        metadata: {
          bid_id: award_bid_id,
          exporter_org_id: bid.exporter_org_id,
          contract_id: contract?.id,
          price_per_mt: bid.price_per_mt,
        },
        ipAddress: getClientIp(request),
      });

      dispatchWebhookEvent(buyerProfile.buyer_org_id, 'tender.awarded', {
        tender_id,
        bid_id: award_bid_id,
        exporter_org_id: bid.exporter_org_id,
        contract_id: contract?.id,
      });

      return NextResponse.json({ success: true, contract });
    }

    if (status) {
      const { data: updated, error: updateError } = await supabaseAdmin
        .from('tenders')
        .update({ status })
        .eq('id', tender_id)
        .select()
        .single();

      if (updateError) {
        console.error('Tender update error:', updateError);
        return NextResponse.json({ error: 'Failed to update tender' }, { status: 500 });
      }

      return NextResponse.json({ tender: updated });
    }

    return NextResponse.json({ error: 'No update action specified' }, { status: 400 });
  } catch (error) {
    console.error('Tenders PATCH error:', error);
    return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 });
  }
}
