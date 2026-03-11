import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { logAuditEvent } from '@/lib/audit';
import { dispatchWebhookEvent } from '@/lib/webhooks';
import { createServiceClient, getAuthenticatedProfile, checkTierAccess } from '@/lib/api-auth';
import { parsePagination } from '@/lib/api/validation';

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

export async function GET(request: NextRequest) {
  try {
    const supabase = createServiceClient();

    const { user, profile } = await getAuthenticatedProfile();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    if (!profile.org_id) return NextResponse.json({ error: 'No organization assigned' }, { status: 403 });

    const shipmentRoles = ['admin', 'logistics_coordinator', 'compliance_officer'];
    if (!shipmentRoles.includes(profile.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const hasAccess = await checkTierAccess(supabase, profile.org_id);
    if (!hasAccess) {
      return NextResponse.json({ error: 'Shipment Readiness requires Pro tier or above' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const { from, to, page, limit } = parsePagination(searchParams);

    let query = supabase
      .from('shipments')
      .select('*, shipment_items(id)', { count: 'exact' })
      .eq('org_id', profile.org_id)
      .order('created_at', { ascending: false })
      .range(from, to);

    if (status) {
      query = query.eq('status', status);
    }

    const { data: shipments, error, count } = await query;

    if (error) {
      console.error('Error fetching shipments:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const shipmentsWithCount = (shipments || []).map((s: any) => ({
      ...s,
      item_count: s.shipment_items?.length || 0,
      shipment_items: undefined,
    }));

    return NextResponse.json({ shipments: shipmentsWithCount, pagination: { page, limit, total: count ?? 0 } });

  } catch (error) {
    console.error('Shipments API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createServiceClient();

    const { user, profile } = await getAuthenticatedProfile();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    if (!profile.org_id) return NextResponse.json({ error: 'No organization assigned' }, { status: 403 });

    const shipmentWriteRoles = ['admin', 'logistics_coordinator', 'compliance_officer'];
    if (!shipmentWriteRoles.includes(profile.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
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
