import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getAuthenticatedProfile } from '@/lib/api-auth';
import { logAuditEvent } from '@/lib/audit';
import { z } from 'zod';

const inputSchema = z.object({
  input_type: z.enum(['fertilizer', 'pesticide', 'herbicide', 'seed', 'organic_amendment']),
  product_name: z.string().optional().nullable(),
  quantity: z.number().positive().optional().nullable(),
  unit: z.enum(['kg', 'liters', 'bags', 'units']).optional(),
  application_date: z.string().optional(),
  area_applied_hectares: z.number().positive().optional().nullable(),
  notes: z.string().optional().nullable(),
});

const patchSchema = inputSchema.partial().extend({
  id: z.string().uuid(),
});

// POST — admin/aggregator adds an input record to a farmer
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: farmId } = await params;
    const supabase = createAdminClient();
    const { user, profile } = await getAuthenticatedProfile(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!profile?.org_id) return NextResponse.json({ error: 'No organization' }, { status: 403 });
    if (!['admin', 'aggregator'].includes(profile.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    // Verify farm belongs to org
    const { data: farm } = await supabase.from('farms').select('id').eq('id', farmId).eq('org_id', profile.org_id).single();
    if (!farm) return NextResponse.json({ error: 'Farm not found' }, { status: 404 });

    const body = await request.json();
    const parsed = inputSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Validation failed', fields: parsed.error.flatten().fieldErrors }, { status: 400 });
    }

    const { data: input, error } = await supabase
      .from('farmer_inputs')
      .insert({
        farm_id: farmId,
        org_id: profile.org_id,
        ...parsed.data,
        application_date: parsed.data.application_date || new Date().toISOString().split('T')[0],
        recorded_by: user.id,
      })
      .select()
      .single();

    if (error) {
      console.error('[farmer inputs POST]', error);
      return NextResponse.json({ error: 'Failed to add input record' }, { status: 500 });
    }

    await logAuditEvent({
      orgId: profile.org_id,
      actorId: user.id,
      actorEmail: user.email,
      action: 'farmer_input.recorded',
      resourceType: 'farm',
      resourceId: farmId,
      metadata: { input_type: parsed.data.input_type, product_name: parsed.data.product_name },
    });

    return NextResponse.json({ input });
  } catch (err) {
    console.error('[farmers/[id]/inputs POST]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PATCH — admin/aggregator updates an input record
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: farmId } = await params;
    const supabase = createAdminClient();
    const { user, profile } = await getAuthenticatedProfile(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!profile?.org_id) return NextResponse.json({ error: 'No organization' }, { status: 403 });
    if (!['admin', 'aggregator'].includes(profile.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const body = await request.json();
    const parsed = patchSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Validation failed', fields: parsed.error.flatten().fieldErrors }, { status: 400 });
    }

    const { id: inputId, ...updates } = parsed.data;

    // Verify input belongs to farm in this org
    const { data: existing } = await supabase.from('farmer_inputs').select('id').eq('id', inputId).eq('farm_id', farmId).eq('org_id', profile.org_id).single();
    if (!existing) return NextResponse.json({ error: 'Input not found' }, { status: 404 });

    const { data: input, error } = await supabase.from('farmer_inputs').update(updates).eq('id', inputId).select().single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ input });
  } catch (err) {
    console.error('[farmers/[id]/inputs PATCH]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE — admin/aggregator removes an input record
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: farmId } = await params;
    const supabase = createAdminClient();
    const { user, profile } = await getAuthenticatedProfile(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!profile?.org_id) return NextResponse.json({ error: 'No organization' }, { status: 403 });
    if (!['admin', 'aggregator'].includes(profile.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const inputId = searchParams.get('input_id');
    if (!inputId) return NextResponse.json({ error: 'input_id required' }, { status: 400 });

    const { data: existing } = await supabase.from('farmer_inputs').select('id').eq('id', inputId).eq('farm_id', farmId).eq('org_id', profile.org_id).single();
    if (!existing) return NextResponse.json({ error: 'Input not found' }, { status: 404 });

    const { error } = await supabase.from('farmer_inputs').delete().eq('id', inputId);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    await logAuditEvent({
      orgId: profile.org_id,
      actorId: user.id,
      actorEmail: user.email,
      action: 'farmer_input.deleted',
      resourceType: 'farm',
      resourceId: farmId,
      metadata: { input_id: inputId },
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[farmers/[id]/inputs DELETE]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
