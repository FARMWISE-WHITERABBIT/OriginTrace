import { createAdminClient } from '@/lib/supabase/admin';
import { NextRequest, NextResponse } from 'next/server';
import { validateApiKey } from '@/lib/api-auth';
import { checkRateLimit } from '@/lib/api/rate-limit';
import { enforceTier } from '@/lib/api/tier-guard';
import { z } from 'zod';

const updateShipmentSchema = z.object({
  status: z.enum(['draft', 'packing', 'ready', 'in_transit', 'delivered', 'cancelled']).optional(),
  destination_country: z.string().optional(),
  destination_port: z.string().optional(),
  buyer_company: z.string().optional(),
  estimated_ship_date: z.string().optional(),
  total_weight_kg: z.number().optional(),
  total_items: z.number().int().optional(),
  notes: z.string().optional(),
}).refine(data => Object.keys(data).length > 0, {
  message: 'At least one field must be provided for update',
});

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    const auth = await validateApiKey(request);
    if (!auth.valid || !auth.orgId) {
      return NextResponse.json({ error: 'Invalid or expired API key' }, { status: 401 });
    }

    const tierError = await enforceTier(auth.orgId, 'enterprise_api');
    if (tierError) return tierError;

    if (!auth.scopes?.includes('write')) {
      return NextResponse.json({ error: 'Insufficient scope. Required: write' }, { status: 403 });
    }

    const limited = await checkRateLimit(request, auth.orgId, {
      max: auth.rateLimitPerHour ?? 1000,
      windowSecs: 3600,
      keyPrefix: `apk:${auth.keyPrefix}`,
    });
    if (limited) return limited;

    const body = await request.json();
    const parsed = updateShipmentSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Validation failed', details: parsed.error.flatten().fieldErrors }, { status: 400 });
    }

    const supabase = createAdminClient();

    const shipmentId = parseInt(id);
    if (isNaN(shipmentId)) {
      return NextResponse.json({ error: 'Invalid shipment ID' }, { status: 400 });
    }

    const { data: existing } = await supabase
      .from('shipments')
      .select('id')
      .eq('id', shipmentId)
      .eq('org_id', auth.orgId)
      .single();

    if (!existing) {
      return NextResponse.json({ error: 'Shipment not found or does not belong to your organization' }, { status: 404 });
    }

    const updateData: Record<string, unknown> = {};
    if (parsed.data.status !== undefined) updateData.status = parsed.data.status;
    if (parsed.data.destination_country !== undefined) updateData.destination_country = parsed.data.destination_country;
    if (parsed.data.destination_port !== undefined) updateData.destination_port = parsed.data.destination_port;
    if (parsed.data.buyer_company !== undefined) updateData.buyer_company = parsed.data.buyer_company;
    if (parsed.data.estimated_ship_date !== undefined) updateData.estimated_ship_date = parsed.data.estimated_ship_date;
    if (parsed.data.total_weight_kg !== undefined) updateData.total_weight_kg = parsed.data.total_weight_kg;
    if (parsed.data.total_items !== undefined) updateData.total_items = parsed.data.total_items;
    if (parsed.data.notes !== undefined) updateData.notes = parsed.data.notes;

    const { data: shipment, error } = await supabase
      .from('shipments')
      .update(updateData)
      .eq('id', shipmentId)
      .eq('org_id', auth.orgId)
      .select()
      .single();

    if (error) {
      console.error('V1 Shipments PATCH DB error:', error.message);
      return NextResponse.json({ error: 'Failed to update shipment' }, { status: 500 });
    }

    return NextResponse.json({ data: shipment }, { status: 200 });
  } catch (error) {
    console.error('V1 Shipments PATCH API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
