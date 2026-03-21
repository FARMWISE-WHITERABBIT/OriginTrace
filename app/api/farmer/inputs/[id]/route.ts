import { createClient as createServerClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const patchSchema = z.object({
  input_type: z.enum(['fertilizer', 'pesticide', 'herbicide', 'seed', 'organic_amendment']).optional(),
  product_name: z.string().optional().nullable(),
  quantity: z.number().positive().optional().nullable(),
  unit: z.enum(['kg', 'liters', 'bags', 'units']).optional(),
  application_date: z.string().optional(),
  area_applied_hectares: z.number().positive().optional().nullable(),
  notes: z.string().optional().nullable(),
});

async function getFarmerAccount() {
  const authClient = await createServerClient();
  const { data: { user } } = await authClient.auth.getUser();
  if (!user) return null;
  const supabase = createAdminClient();
  const { data } = await supabase.from('farmer_accounts').select('farm_id, org_id').eq('user_id', user.id).single();
  return data ? { ...data, userId: user.id } : null;
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const farmer = await getFarmerAccount();
    if (!farmer) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const parsed = patchSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Validation failed', fields: parsed.error.flatten().fieldErrors }, { status: 400 });
    }

    const supabase = createAdminClient();
    const { data: existing } = await supabase
      .from('farmer_inputs').select('id').eq('id', id).eq('farm_id', farmer.farm_id).single();
    if (!existing) return NextResponse.json({ error: 'Input not found' }, { status: 404 });

    const updates: Record<string, unknown> = {};
    const d = parsed.data;
    if (d.input_type !== undefined) updates.input_type = d.input_type;
    if (d.product_name !== undefined) updates.product_name = d.product_name;
    if (d.quantity !== undefined) updates.quantity = d.quantity;
    if (d.unit !== undefined) updates.unit = d.unit;
    if (d.application_date !== undefined) updates.application_date = d.application_date;
    if (d.area_applied_hectares !== undefined) updates.area_applied_hectares = d.area_applied_hectares;
    if (d.notes !== undefined) updates.notes = d.notes;

    const { data: input, error } = await supabase
      .from('farmer_inputs').update(updates).eq('id', id).select().single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ input });
  } catch (err) {
    console.error('[farmer/inputs/[id] PATCH]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const farmer = await getFarmerAccount();
    if (!farmer) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const supabase = createAdminClient();
    const { data: existing } = await supabase
      .from('farmer_inputs').select('id').eq('id', id).eq('farm_id', farmer.farm_id).single();
    if (!existing) return NextResponse.json({ error: 'Input not found' }, { status: 404 });

    const { error } = await supabase.from('farmer_inputs').delete().eq('id', id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[farmer/inputs/[id] DELETE]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
