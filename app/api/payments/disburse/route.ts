import { NextRequest, NextResponse } from 'next/server';
import { createClient as createServerClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { validateBody } from '@/lib/api/validation';
import { z } from 'zod';

/**
 * POST /api/payments/disburse
 * 
 * Phase 5 scaffold — Mobile money disbursement to farmers and agents.
 * 
 * Planned integrations:
 * - MTN Mobile Money (Ghana, Nigeria, Uganda, Rwanda, Cameroon)
 * - Airtel Money (Uganda, Kenya, Zambia, Madagascar)
 * - M-Pesa (Kenya, Tanzania)
 * - Flutterwave (pan-Africa bulk payouts)
 * - Paystack (Nigeria, Ghana)
 * 
 * Security requirements before production:
 * - Store provider credentials in environment variables, not DB
 * - Implement idempotency keys to prevent double-disbursal
 * - Require 2FA/approval workflow for amounts above threshold
 * - Maintain immutable disbursement audit log
 */

const DisburseSchema = z.object({
  payee_id: z.string().uuid(),
  payee_type: z.enum(['farmer', 'agent']),
  amount: z.number().min(1, 'Amount must be positive'),
  currency: z.string().length(3),
  provider: z.enum(['mtn_momo', 'airtel_money', 'mpesa', 'flutterwave', 'paystack']),
  phone_number: z.string().min(10).max(20),
  reference: z.string().max(100).optional(),
  batch_id: z.string().uuid().optional(),   // Link disbursement to a collection batch
  idempotency_key: z.string().min(1).max(200),
});

export async function POST(request: NextRequest) {
  try {
    const authClient = await createServerClient();
    const { data: { user } } = await authClient.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const supabase = createAdminClient();
    const { data: profile } = await supabase.from('profiles').select('org_id, role').eq('user_id', user.id).single();
    if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 });

    // Only admin/aggregator can disburse
    if (!['admin', 'aggregator'].includes(profile.role)) {
      return NextResponse.json({ error: 'Insufficient permissions for payment disbursement' }, { status: 403 });
    }

    const validation = await validateBody(request, DisburseSchema);
    if (validation.error) return validation.error;

    const { idempotency_key, provider, amount, currency, phone_number, payee_id, payee_type, reference, batch_id } = validation.data;

    // Check idempotency — prevent double-disbursal
    const { data: existing } = await supabase
      .from('payments')
      .select('id, status')
      .eq('org_id', profile.org_id)
      .eq('metadata->idempotency_key', idempotency_key)
      .single();

    if (existing) {
      return NextResponse.json({
        message: 'Duplicate request — payment already processed',
        payment_id: existing.id,
        status: existing.status,
      });
    }

    // Create payment record with pending status
    const { data: payment, error: insertErr } = await supabase
      .from('payments')
      .insert({
        org_id: profile.org_id,
        payee_id,
        payee_type,
        amount,
        currency,
        payment_method: provider,
        status: 'pending',
        metadata: {
          idempotency_key,
          phone_number,
          reference,
          batch_id,
          initiated_by: user.id,
        },
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (insertErr) return NextResponse.json({ error: insertErr.message }, { status: 500 });

    // TODO Phase 5: Call actual provider API
    // const providerResult = await callMobileMoneyProvider(provider, { amount, currency, phone_number, reference });
    // await supabase.from('payments').update({ status: providerResult.success ? 'completed' : 'failed', provider_reference: providerResult.reference }).eq('id', payment.id);

    return NextResponse.json({
      message: 'Payment queued for disbursement. Provider integration pending implementation.',
      payment_id: payment.id,
      status: 'pending',
      note: 'Phase 5: Integrate MTN MoMo / Airtel / M-Pesa / Flutterwave provider API here.',
    }, { status: 202 });
  } catch (err) {
    console.error('[payments/disburse] error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
