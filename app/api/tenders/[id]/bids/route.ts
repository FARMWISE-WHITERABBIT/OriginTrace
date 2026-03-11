import { createClient as createServerClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedProfile } from '@/lib/api-auth';
import { z } from 'zod';

const bidCreateSchema = z.object({
  price_per_mt: z.number().positive('Price must be positive'),
  quantity_available_mt: z.number().positive('Quantity must be positive'),
  delivery_date: z.string().optional(),
  notes: z.string().optional(),
  certifications: z.array(z.string()).optional(),
});

async function getAuthUser() {
  const supabase = await createServerClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return null;
  return user;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

    const { id: tenderId } = await params;
    const supabaseAdmin = createAdminClient();

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

    let bids: any[] = [];

    if (buyerProfile) {
      const { data: tender } = await supabaseAdmin
        .from('tenders')
        .select('id')
        .eq('id', tenderId)
        .eq('buyer_org_id', buyerProfile.buyer_org_id)
        .single();

      if (!tender) {
        return NextResponse.json({ error: 'Tender not found' }, { status: 404 });
      }

      const { data } = await supabaseAdmin
        .from('tender_bids')
        .select('*, exporter_org:organizations!tender_bids_exporter_org_id_fkey(id, name, slug)')
        .eq('tender_id', tenderId)
        .order('created_at', { ascending: false });
      bids = data || [];
    } else if (exporterProfile) {
      const { data } = await supabaseAdmin
        .from('tender_bids')
        .select('*')
        .eq('tender_id', tenderId)
        .eq('exporter_org_id', exporterProfile.org_id)
        .order('created_at', { ascending: false });
      bids = data || [];
    }

    return NextResponse.json({ bids });
  } catch (error) {
    console.error('Tender bids GET error:', error);
    return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

    const { id: tenderId } = await params;
    const supabaseAdmin = createAdminClient();

    const { data: exporterProfile } = await supabaseAdmin
      .from('profiles')
      .select('org_id, role')
      .eq('user_id', user.id)
      .single();

    if (!exporterProfile) {
      return NextResponse.json({ error: 'Only exporters can submit bids' }, { status: 403 });
    }

    const { data: tender } = await supabaseAdmin
      .from('tenders')
      .select('*')
      .eq('id', tenderId)
      .eq('status', 'open')
      .single();

    if (!tender) {
      return NextResponse.json({ error: 'Tender not found or not open' }, { status: 404 });
    }

    if (tender.visibility === 'invited' && !tender.invited_orgs?.includes(exporterProfile.org_id)) {
      return NextResponse.json({ error: 'Not invited to this tender' }, { status: 403 });
    }

    const { data: existingBid } = await supabaseAdmin
      .from('tender_bids')
      .select('id')
      .eq('tender_id', tenderId)
      .eq('exporter_org_id', exporterProfile.org_id)
      .maybeSingle();

    if (existingBid) {
      return NextResponse.json({ error: 'You have already submitted a bid for this tender' }, { status: 409 });
    }

    const body = await request.json();
    const parsed = bidCreateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', fields: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    let complianceScore = 0;
    try {
      const { data: recentShipments } = await supabaseAdmin
        .from('shipments')
        .select('readiness_score')
        .eq('org_id', exporterProfile.org_id)
        .not('readiness_score', 'is', null)
        .order('created_at', { ascending: false })
        .limit(10);

      if (recentShipments && recentShipments.length > 0) {
        const totalScore = recentShipments.reduce((sum: number, s: any) => sum + Number(s.readiness_score || 0), 0);
        complianceScore = Math.round((totalScore / recentShipments.length) * 100) / 100;
      }
    } catch {
      complianceScore = 0;
    }

    const { data: bid, error: insertError } = await supabaseAdmin
      .from('tender_bids')
      .insert({
        tender_id: tenderId,
        exporter_org_id: exporterProfile.org_id,
        price_per_mt: parsed.data.price_per_mt,
        quantity_available_mt: parsed.data.quantity_available_mt,
        delivery_date: parsed.data.delivery_date || null,
        notes: parsed.data.notes || null,
        compliance_score: complianceScore,
        certifications: parsed.data.certifications || [],
        submitted_by: user.id,
        status: 'submitted',
      })
      .select()
      .single();

    if (insertError) {
      console.error('Bid insert error:', insertError);
      return NextResponse.json({ error: 'Failed to submit bid' }, { status: 500 });
    }

    return NextResponse.json({ bid });
  } catch (error) {
    console.error('Tender bids POST error:', error);
    return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 });
  }
}
