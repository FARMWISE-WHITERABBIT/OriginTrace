'use server';

import { createAdminClient } from '@/lib/supabase/admin';
import { createClient as createServerClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { logAuditEvent } from '@/lib/audit';
import { dispatchWebhookEvent } from '@/lib/webhooks';

const shipmentCreateSchema = z.object({
  destination_country: z.string().min(1, 'Destination country is required'),
  commodity: z.string().min(1, 'Commodity is required'),
  buyer_company: z.string().optional(),
  buyer_contact: z.string().optional(),
  target_regulations: z.array(z.string()).optional(),
  destination_port: z.string().optional(),
  notes: z.string().optional(),
  estimated_ship_date: z.string().optional(),
  compliance_profile_id: z.number().optional(),
  contract_id: z.number().optional(),
  document_ids: z.array(z.number()).optional(),
});

function createServiceClient() {
  return createAdminClient();
}

async function getAuthenticatedUser() {
  const supabase = await createServerClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return null;
  return user;
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

    const user = await getAuthenticatedUser();
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

    const user = await getAuthenticatedUser();
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

    const parsed = shipmentCreateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', fields: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { destination_country, commodity, buyer_company, buyer_contact, target_regulations, destination_port, notes, estimated_ship_date, compliance_profile_id, contract_id, document_ids } = parsed.data;

    const shipmentCode = `SHP-${profile.org_id}-${Date.now().toString(36).toUpperCase()}`;

    const insertData: Record<string, any> = {
      org_id: profile.org_id,
      created_by: profile.id,
      shipment_code: shipmentCode,
      status: 'draft',
      destination_country,
      commodity,
    };

    if (buyer_company !== undefined) insertData.buyer_company = buyer_company;
    if (buyer_contact !== undefined) insertData.buyer_contact = buyer_contact;
    if (target_regulations !== undefined) insertData.target_regulations = target_regulations;
    if (destination_port !== undefined) insertData.destination_port = destination_port;
    if (notes !== undefined) insertData.notes = notes;
    if (estimated_ship_date !== undefined) insertData.estimated_ship_date = estimated_ship_date;
    if (compliance_profile_id !== undefined) insertData.compliance_profile_id = compliance_profile_id;

    const { data: shipment, error: shipmentError } = await supabase
      .from('shipments')
      .insert(insertData)
      .select()
      .single();

    if (shipmentError) {
      console.error('Error creating shipment:', shipmentError);
      return NextResponse.json({ error: shipmentError.message }, { status: 500 });
    }

    if (contract_id && shipment) {
      await supabase
        .from('contract_shipments')
        .insert({ contract_id, shipment_id: shipment.id });
    }

    if (document_ids && document_ids.length > 0 && shipment) {
      for (const docId of document_ids) {
        await supabase
          .from('documents')
          .update({ linked_entity_type: 'shipment', linked_entity_id: shipment.id })
          .eq('id', docId)
          .eq('org_id', profile.org_id);
      }
    }

    await logAuditEvent({
      orgId: profile.org_id,
      actorId: user.id,
      actorEmail: user.email,
      action: 'shipment.created',
      resourceType: 'shipment',
      resourceId: shipment.id?.toString(),
      metadata: { shipment_code: shipmentCode, destination_country, commodity },
    });

    dispatchWebhookEvent(profile.org_id, 'shipment.created', {
      shipment_id: shipment.id, shipment_code: shipmentCode, destination_country, commodity,
    });

    return NextResponse.json({ shipment, success: true });

  } catch (error) {
    console.error('Shipments API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
