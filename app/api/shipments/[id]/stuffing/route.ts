/**
 * GET  /api/shipments/[id]/stuffing  — list all stuffing records for a shipment
 * POST /api/shipments/[id]/stuffing  — add a new stuffing record
 *
 * Roles: admin, logistics_coordinator
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createServiceClient, getAuthenticatedProfile } from '@/lib/api-auth';

const ALLOWED_ROLES = ['admin', 'logistics_coordinator', 'compliance_officer'];
const WRITE_ROLES = ['admin', 'logistics_coordinator'];

const stuffingRecordSchema = z.object({
  item_description: z.string().min(1).max(255),
  lot_number: z.string().max(100).optional(),
  bag_count: z.number().int().nonnegative(),
  gross_weight_kg: z.number().nonnegative(),
  net_weight_kg: z.number().nonnegative().optional(),
  tare_weight_kg: z.number().nonnegative().optional(),
  batch_id: z.string().uuid().optional(),
  remarks: z.string().max(500).optional(),
});

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createServiceClient();
    const { user, profile } = await getAuthenticatedProfile();

    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!profile?.org_id) return NextResponse.json({ error: 'No organization' }, { status: 403 });
    if (!ALLOWED_ROLES.includes(profile.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    // Verify shipment belongs to org
    const { data: shipment } = await supabase
      .from('shipments')
      .select('id, shipment_code, total_weight_kg, container_number, container_seal_number')
      .eq('id', params.id)
      .eq('org_id', profile.org_id)
      .single();

    if (!shipment) {
      return NextResponse.json({ error: 'Shipment not found' }, { status: 404 });
    }

    const { data: records, error } = await supabase
      .from('container_stuffing_records')
      .select('*')
      .eq('shipment_id', params.id)
      .eq('org_id', profile.org_id)
      .order('created_at', { ascending: true });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const totalBags = (records ?? []).reduce((s: number, r: any) => s + (r.bag_count || 0), 0);
    const totalGrossKg = (records ?? []).reduce(
      (s: number, r: any) => s + (parseFloat(r.gross_weight_kg) || 0),
      0
    );
    const totalNetKg = (records ?? []).reduce(
      (s: number, r: any) => s + (parseFloat(r.net_weight_kg) || 0),
      0
    );

    return NextResponse.json({
      records: records ?? [],
      summary: {
        total_bags: totalBags,
        total_gross_weight_kg: totalGrossKg,
        total_net_weight_kg: totalNetKg,
        record_count: (records ?? []).length,
      },
      shipment: {
        shipment_code: shipment.shipment_code,
        declared_weight_kg: shipment.total_weight_kg,
        container_number: shipment.container_number,
        container_seal_number: shipment.container_seal_number,
      },
    });
  } catch (error) {
    console.error('Stuffing records GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createServiceClient();
    const { user, profile } = await getAuthenticatedProfile();

    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!profile?.org_id) return NextResponse.json({ error: 'No organization' }, { status: 403 });
    if (!WRITE_ROLES.includes(profile.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    // Verify shipment belongs to org
    const { data: shipment } = await supabase
      .from('shipments')
      .select('id')
      .eq('id', params.id)
      .eq('org_id', profile.org_id)
      .single();

    if (!shipment) {
      return NextResponse.json({ error: 'Shipment not found' }, { status: 404 });
    }

    const body = await request.json().catch(() => ({}));
    const parsed = stuffingRecordSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation error', fields: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { data: record, error } = await supabase
      .from('container_stuffing_records')
      .insert({
        ...parsed.data,
        shipment_id: params.id,
        org_id: profile.org_id,
        recorded_by: user.id,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ record }, { status: 201 });
  } catch (error) {
    console.error('Stuffing records POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
