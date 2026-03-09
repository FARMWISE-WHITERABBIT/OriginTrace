import { createAdminClient } from '@/lib/supabase/admin';
import { createClient as createServerClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { logAuditEvent } from '@/lib/audit';

const inputCreateSchema = z.object({
  input_type: z.enum(['fertilizer', 'pesticide', 'herbicide', 'seed', 'organic_amendment']),
  product_name: z.string().optional(),
  quantity: z.number().positive().optional(),
  unit: z.enum(['kg', 'liters', 'bags', 'units']).optional(),
  application_date: z.string().optional(),
  area_applied_hectares: z.number().positive().optional(),
  notes: z.string().optional(),
});

export async function GET() {
  try {
    const authClient = await createServerClient();
    const { data: { user }, error: userError } = await authClient.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createAdminClient();
    const { data: farmerAccount } = await supabase
      .from('farmer_accounts')
      .select('farm_id, org_id')
      .eq('user_id', user.id)
      .single();

    if (!farmerAccount) {
      return NextResponse.json({ error: 'Farmer account not found' }, { status: 404 });
    }

    const { data: inputs } = await supabase
      .from('farmer_inputs')
      .select('*')
      .eq('farm_id', farmerAccount.farm_id)
      .order('application_date', { ascending: false });

    return NextResponse.json({ inputs: inputs || [] });
  } catch (error) {
    console.error('Farmer inputs GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const authClient = await createServerClient();
    const { data: { user }, error: userError } = await authClient.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createAdminClient();
    const { data: farmerAccount } = await supabase
      .from('farmer_accounts')
      .select('id, farm_id, org_id')
      .eq('user_id', user.id)
      .single();

    if (!farmerAccount) {
      return NextResponse.json({ error: 'Farmer account not found' }, { status: 404 });
    }

    const body = await request.json();
    const parsed = inputCreateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Validation failed', fields: parsed.error.flatten().fieldErrors }, { status: 400 });
    }

    const { data: input, error: insertError } = await supabase
      .from('farmer_inputs')
      .insert({
        farm_id: farmerAccount.farm_id,
        org_id: farmerAccount.org_id,
        ...parsed.data,
        application_date: parsed.data.application_date || new Date().toISOString().split('T')[0],
        recorded_by: user.id,
      })
      .select()
      .single();

    if (insertError) {
      return NextResponse.json({ error: 'Failed to record input' }, { status: 500 });
    }

    await logAuditEvent({
      orgId: farmerAccount.org_id,
      actorId: user.id,
      actorEmail: user.email,
      action: 'farmer_input.recorded',
      resourceType: 'farmer_input',
      resourceId: input.id,
      metadata: { input_type: parsed.data.input_type, product_name: parsed.data.product_name },
    });

    return NextResponse.json({ input });
  } catch (error) {
    console.error('Farmer inputs POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
