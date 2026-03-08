import { createAdminClient } from '@/lib/supabase/admin';
import { createClient as createServerClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getPaymentProvider, SUPPORTED_PROVIDERS } from '@/lib/payments';
import { logAuditEvent, getClientIp } from '@/lib/audit';
import { dispatchWebhookEvent } from '@/lib/webhooks';

const disburseSchema = z.object({
  phone: z.string().min(8, 'Valid phone number required'),
  amount: z.number().positive('Amount must be positive'),
  currency: z.string().default('NGN'),
  provider: z.enum(['mtn_momo', 'opay', 'palmpay']),
  payee_name: z.string().min(1, 'Payee name required'),
  linked_entity_type: z.enum(['collection_batch', 'contract']).optional(),
  linked_entity_id: z.number().optional(),
  notes: z.string().optional(),
});

export async function GET() {
  return NextResponse.json({ providers: SUPPORTED_PROVIDERS });
}

export async function POST(request: NextRequest) {
  try {
    const authClient = await createServerClient();
    const { data: { user }, error: userError } = await authClient.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createAdminClient();
    const { data: profile } = await supabase
      .from('profiles')
      .select('org_id, role')
      .eq('user_id', user.id)
      .single();

    if (!profile || !['admin', 'aggregator'].includes(profile.role)) {
      return NextResponse.json({ error: 'Admin or aggregator access required' }, { status: 403 });
    }

    if (!profile.org_id) {
      return NextResponse.json({ error: 'No organization assigned' }, { status: 403 });
    }

    const body = await request.json();
    const parsed = disburseSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Validation failed', fields: parsed.error.flatten().fieldErrors }, { status: 400 });
    }

    const { phone, amount, currency, provider: providerName, payee_name, linked_entity_type, linked_entity_id, notes } = parsed.data;

    const provider = getPaymentProvider(providerName);
    if (!provider) {
      return NextResponse.json({ error: 'Unsupported payment provider' }, { status: 400 });
    }

    const reference = `OT-${profile.org_id.slice(0, 8)}-${Date.now().toString(36).toUpperCase()}`;

    const result = await provider.disburse({
      phone,
      amount,
      currency,
      reference,
      narration: `OriginTrace payment to ${payee_name}`,
    });

    const { data: payment, error: insertError } = await supabase
      .from('payments')
      .insert({
        org_id: profile.org_id,
        payee_name,
        payee_type: 'farmer',
        amount,
        currency,
        payment_method: 'mobile_money',
        reference_number: reference,
        linked_entity_type: linked_entity_type || null,
        linked_entity_id: linked_entity_id || null,
        payment_date: new Date().toISOString().split('T')[0],
        notes: notes ? `${notes} | Provider: ${providerName} | TxID: ${result.transactionId}` : `Provider: ${providerName} | TxID: ${result.transactionId}`,
        status: result.status === 'completed' ? 'completed' : 'pending',
        recorded_by: user.id,
      })
      .select()
      .single();

    if (insertError) {
      console.error('Payment insert error:', insertError);
      return NextResponse.json({ error: 'Failed to record payment' }, { status: 500 });
    }

    await logAuditEvent({
      orgId: profile.org_id,
      actorId: user.id,
      actorEmail: user.email,
      action: 'payment.disbursed',
      resourceType: 'payment',
      resourceId: payment?.id?.toString(),
      metadata: { provider: providerName, phone, amount, currency, transactionId: result.transactionId, status: result.status },
      ipAddress: getClientIp(request),
    });

    dispatchWebhookEvent(profile.org_id, 'payment.disbursed', {
      payment_id: payment?.id,
      provider: providerName,
      amount,
      currency,
      phone,
      status: result.status,
      reference,
    });

    return NextResponse.json({
      payment,
      disbursement: {
        provider: result.provider,
        transactionId: result.transactionId,
        status: result.status,
        message: result.message,
      },
    });
  } catch (error) {
    console.error('Disburse error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
