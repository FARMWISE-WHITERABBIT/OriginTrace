import { createClient as createServerClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const patchSchema = z.object({
  module_name: z.string().min(1).optional(),
  module_type: z.enum(['gap', 'safety', 'sustainability', 'organic', 'child_labor', 'eudr_awareness']).optional(),
  status: z.enum(['not_started', 'in_progress', 'completed']).optional(),
  score: z.number().min(0).max(100).optional().nullable(),
  completed_at: z.string().optional().nullable(),
  certificate_url: z.string().url().optional().nullable(),
  notes: z.string().optional().nullable(),
});

async function getFarmerAccount() {
  const authClient = await createServerClient();
  const { data: { user } } = await authClient.auth.getUser();
  if (!user) return null;
  const supabase = createAdminClient();
  const { data } = await supabase.from('farmer_accounts').select('id, org_id').eq('user_id', user.id).single();
  return data ?? null;
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
      .from('farmer_training').select('id').eq('id', id).eq('farmer_account_id', farmer.id).single();
    if (!existing) return NextResponse.json({ error: 'Module not found' }, { status: 404 });

    const updates: Record<string, unknown> = {};
    const d = parsed.data;
    if (d.module_name !== undefined) updates.module_name = d.module_name;
    if (d.module_type !== undefined) updates.module_type = d.module_type;
    if (d.status !== undefined) {
      updates.status = d.status;
      if (d.status === 'completed' && !d.completed_at) updates.completed_at = new Date().toISOString();
    }
    if (d.score !== undefined) updates.score = d.score;
    if (d.completed_at !== undefined) updates.completed_at = d.completed_at;
    if (d.certificate_url !== undefined) updates.certificate_url = d.certificate_url;
    if (d.notes !== undefined) updates.notes = d.notes;

    const { data: module, error } = await supabase
      .from('farmer_training').update(updates).eq('id', id).select().single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ module });
  } catch (err) {
    console.error('[farmer/training/[id] PATCH]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
