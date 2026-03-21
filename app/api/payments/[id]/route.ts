import { createAdminClient } from '@/lib/supabase/admin';
import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedProfile } from '@/lib/api-auth';
import { z } from 'zod';
import { logAuditEvent } from '@/lib/audit';

const paymentPatchSchema = z.object({
  amount: z.number().positive().optional(),
  currency: z.enum(['NGN', 'USD', 'EUR', 'GBP', 'XOF']).optional(),
  payment_method: z.enum(['cash', 'bank_transfer', 'mobile_money', 'cheque']).optional(),
  reference_number: z.string().optional().nullable(),
  payment_date: z.string().optional(),
  notes: z.string().optional().nullable(),
  status: z.enum(['pending', 'completed', 'failed', 'reversed']).optional(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { user, profile } = await getAuthenticatedProfile(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!profile?.org_id) return NextResponse.json({ error: 'No organization' }, { status: 403 });

    const allowedRoles = ['admin', 'aggregator'];
    if (!allowedRoles.includes(profile.role as string)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const body = await request.json();
    const parsed = paymentPatchSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Validation failed', fields: parsed.error.flatten().fieldErrors }, { status: 400 });
    }

    const supabase = createAdminClient();

    // Verify the payment belongs to this org
    const { data: existing } = await supabase
      .from('payments').select('id').eq('id', id).eq('org_id', profile.org_id).single();
    if (!existing) return NextResponse.json({ error: 'Payment not found' }, { status: 404 });

    const updates: Record<string, unknown> = {};
    const d = parsed.data;
    if (d.amount !== undefined) updates.amount = d.amount;
    if (d.currency !== undefined) updates.currency = d.currency;
    if (d.payment_method !== undefined) updates.payment_method = d.payment_method;
    if (d.reference_number !== undefined) updates.reference_number = d.reference_number;
    if (d.payment_date !== undefined) updates.payment_date = d.payment_date;
    if (d.notes !== undefined) updates.notes = d.notes;
    if (d.status !== undefined) updates.status = d.status;

    const { data: payment, error } = await supabase
      .from('payments').update(updates).eq('id', id).select().single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    await logAuditEvent({
      orgId: profile.org_id, actorId: user.id, actorEmail: user.email,
      action: 'payment.updated', resourceType: 'payment', resourceId: id,
      metadata: updates,
    });

    return NextResponse.json({ payment });
  } catch (err) {
    console.error('[payments/[id] PATCH]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
