'use server';

import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

function createServiceClient() {
  return createClient(supabaseUrl, supabaseServiceKey);
}

async function getAuthenticatedUser(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.split(' ')[1];
  const supabase = createServiceClient();

  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) return null;

  return user;
}

async function getUserFromCookies(request: NextRequest) {
  const supabase = createServiceClient();
  const cookieHeader = request.headers.get('cookie');

  if (!cookieHeader) return null;

  const cookies = Object.fromEntries(
    cookieHeader.split(';').map(c => {
      const [key, ...val] = c.trim().split('=');
      return [key, val.join('=')];
    })
  );

  const accessToken = cookies['sb-access-token'] ||
    Object.entries(cookies).find(([k]) => k.includes('auth-token'))?.[1];

  if (!accessToken) return null;

  try {
    const { data: { user }, error } = await supabase.auth.getUser(accessToken);
    if (error || !user) return null;
    return user;
  } catch {
    return null;
  }
}

async function checkTierAccess(supabase: ReturnType<typeof createServiceClient>, orgId: number): Promise<boolean> {
  const { data: org } = await supabase
    .from('organizations')
    .select('subscription_tier, feature_flags')
    .eq('id', orgId)
    .single();
  if (!org) return false;
  const tier = org.subscription_tier || 'starter';
  const tierLevels: Record<string, number> = { starter: 0, basic: 1, pro: 2, enterprise: 3 };
  const hasFeatureFlag = org.feature_flags?.shipment_readiness === true;
  return hasFeatureFlag || (tierLevels[tier] ?? 0) >= tierLevels['pro'];
}

export async function GET(request: NextRequest) {
  try {
    const supabase = createServiceClient();

    let user = await getAuthenticatedUser(request);
    if (!user) {
      user = await getUserFromCookies(request);
    }

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, org_id, role')
      .eq('user_id', user.id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    if (profile.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const hasAccess = await checkTierAccess(supabase, profile.org_id);
    if (!hasAccess) {
      return NextResponse.json({ error: 'Shipment Readiness requires Pro tier or above' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');

    let query = supabase
      .from('shipments')
      .select('*, shipment_items(id)')
      .eq('org_id', profile.org_id)
      .order('created_at', { ascending: false });

    if (status) {
      query = query.eq('status', status);
    }

    const { data: shipments, error } = await query;

    if (error) {
      console.error('Error fetching shipments:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const shipmentsWithCount = (shipments || []).map((s: any) => ({
      ...s,
      item_count: s.shipment_items?.length || 0,
      shipment_items: undefined,
    }));

    return NextResponse.json({ shipments: shipmentsWithCount });

  } catch (error) {
    console.error('Shipments API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createServiceClient();

    let user = await getAuthenticatedUser(request);
    if (!user) {
      user = await getUserFromCookies(request);
    }

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, org_id, role')
      .eq('user_id', user.id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    if (profile.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const hasAccess = await checkTierAccess(supabase, profile.org_id);
    if (!hasAccess) {
      return NextResponse.json({ error: 'Shipment Readiness requires Pro tier or above' }, { status: 403 });
    }

    const body = await request.json();
    const { destination_country, commodity } = body;

    if (!destination_country) {
      return NextResponse.json({ error: 'Destination country is required' }, { status: 400 });
    }

    if (!commodity) {
      return NextResponse.json({ error: 'Commodity is required' }, { status: 400 });
    }

    const shipmentCode = `SHP-${profile.org_id}-${Date.now().toString(36).toUpperCase()}`;

    const insertData: Record<string, any> = {
      org_id: profile.org_id,
      created_by: profile.id,
      shipment_code: shipmentCode,
      status: 'draft',
      destination_country,
      commodity,
    };

    if (body.buyer_company !== undefined) insertData.buyer_company = body.buyer_company;
    if (body.buyer_contact !== undefined) insertData.buyer_contact = body.buyer_contact;
    if (body.target_regulations !== undefined) insertData.target_regulations = body.target_regulations;
    if (body.destination_port !== undefined) insertData.destination_port = body.destination_port;
    if (body.notes !== undefined) insertData.notes = body.notes;
    if (body.estimated_ship_date !== undefined) insertData.estimated_ship_date = body.estimated_ship_date;
    if (body.compliance_profile_id !== undefined) insertData.compliance_profile_id = body.compliance_profile_id;

    const { data: shipment, error: shipmentError } = await supabase
      .from('shipments')
      .insert(insertData)
      .select()
      .single();

    if (shipmentError) {
      console.error('Error creating shipment:', shipmentError);
      return NextResponse.json({ error: shipmentError.message }, { status: 500 });
    }

    if (body.contract_id && shipment) {
      await supabase
        .from('contract_shipments')
        .insert({ contract_id: body.contract_id, shipment_id: shipment.id });
    }

    if (body.document_ids && Array.isArray(body.document_ids) && shipment) {
      for (const docId of body.document_ids) {
        await supabase
          .from('documents')
          .update({ linked_entity_type: 'shipment', linked_entity_id: shipment.id })
          .eq('id', docId)
          .eq('org_id', profile.org_id);
      }
    }

    return NextResponse.json({ shipment, success: true });

  } catch (error) {
    console.error('Shipments API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
