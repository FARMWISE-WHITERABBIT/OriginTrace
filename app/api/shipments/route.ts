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
      .select('id, shipment_code, status, destination_country, destination_port, buyer_company, commodity, total_weight_kg, readiness_score, readiness_decision, score_breakdown, estimated_ship_date, created_at, total_items, shipment_items(id)', { count: 'exact' })
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

    // Atomic RPC: shipment INSERT + contract link + document links in one transaction.
    // Partial failures (e.g. contract link error) no longer leave orphan shipments.
    const { data: shipmentData, error: shipmentError } = await supabase.rpc(
      'create_shipment_atomic',
      {
        p_org_id:               profile.org_id,
        p_created_by:           profile.id,
        p_shipment_code:        shipmentCode,
        p_destination_country:  destination_country,
        p_commodity:            commodity,
        p_buyer_company:        buyer_company        ?? null,
        p_buyer_contact:        buyer_contact        ?? null,
        p_target_regulations:   target_regulations   ?? null,
        p_destination_port:     destination_port     ?? null,
        p_notes:                notes                ?? null,
        p_estimated_ship_date:  estimated_ship_date  ?? null,
        p_compliance_profile_id: compliance_profile_id ?? null,
        p_contract_id:          contract_id          ?? null,
        p_document_ids:         document_ids         ?? null,
      }
    );

    if (shipmentError) {
      console.error('Error creating shipment:', shipmentError);
      return NextResponse.json({ error: shipmentError.message }, { status: 500 });
    }

    const shipment = shipmentData as any;

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
