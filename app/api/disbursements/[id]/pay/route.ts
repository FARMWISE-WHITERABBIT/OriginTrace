import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getAuthenticatedProfile } from '@/lib/api-auth';
import { logAuditEvent, getClientIp } from '@/lib/audit';
import { dispatchWebhookEvent } from '@/lib/webhooks';
import { sendSMS, buildPaymentConfirmationSMS, buildPaymentFailureSMS } from '@/lib/notifications/termii';
import { createTransferRecipient, initiateTransfer } from '@/lib/payments/paystack';
import { getPaymentProvider } from '@/lib/payments';
import { z } from 'zod';

const paySchema = z.object({
  provider: z.enum(['paystack_transfer', 'mtn_momo', 'opay', 'palmpay', 'cash']).default('paystack_transfer'),
  phone: z.string().optional(), // Required for MoMo providers
});

/**
 * POST /api/disbursements/[id]/pay
 * Execute payment for a single approved disbursement calculation.
 * Looks up the farmer's bank account (for Paystack) or phone (for MoMo).
 * Updates status → disbursed, fires webhook + Termii SMS.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { user, profile } = await getAuthenticatedProfile(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!profile?.org_id) return NextResponse.json({ error: 'No organization' }, { status: 403 });
    if (!['admin', 'aggregator'].includes(profile.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json().catch(() => ({}));
    const parsed = paySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Validation failed', fields: parsed.error.flatten().fieldErrors }, { status: 400 });
    }

    const { provider: providerName, phone: phoneOverride } = parsed.data;
    const supabase = createAdminClient();

    // Fetch the disbursement calculation
    const { data: calc, error: calcErr } = await supabase
      .from('disbursement_calculations')
      .select(`
        *,
        collection_batches!batch_id(commodity, batch_code)
      `)
      .eq('id', params.id)
      .eq('org_id', profile.org_id)
      .single();

    if (calcErr || !calc) {
      return NextResponse.json({ error: 'Disbursement not found' }, { status: 404 });
    }

    if (calc.status !== 'approved') {
      return NextResponse.json(
        { error: `Cannot pay a disbursement with status '${calc.status}'. Must be 'approved' first.` },
        { status: 409 }
      );
    }

    const amount = Number(calc.net_amount);
    const currency = calc.currency ?? 'NGN';
    const reference = `OT-DISB-${calc.id.slice(0, 8)}-${Date.now().toString(36).toUpperCase()}`;
    const commodity = (calc as any).collection_batches?.commodity ?? 'commodity';
    const batchCode = (calc as any).collection_batches?.batch_code ?? `batch-${calc.batch_id}`;

    let paymentId: string | null = null;
    let disbursementStatus: 'completed' | 'pending' | 'failed' = 'pending';

    // ── Cash logging path ─────────────────────────────────────────────────────
    if (providerName === 'cash') {
      const { data: payment, error: pmtErr } = await supabase
        .from('payments')
        .insert({
          org_id: profile.org_id,
          payee_name: calc.farmer_name,
          payee_type: 'farmer',
          amount,
          currency,
          payment_method: 'cash',
          reference_number: reference,
          linked_entity_type: 'collection_batch',
          linked_entity_id: calc.batch_id,
          payment_date: new Date().toISOString().split('T')[0],
          notes: `Cash disbursement for ${commodity} (${calc.weight_kg}kg) — ${batchCode}`,
          status: 'completed',
          recorded_by: user.id,
        })
        .select()
        .single();

      if (pmtErr) throw new Error(`Failed to record cash payment: ${pmtErr.message}`);
      paymentId = payment.id;
      disbursementStatus = 'completed';
    }

    // ── Paystack bank transfer path ───────────────────────────────────────────
    else if (providerName === 'paystack_transfer') {
      const { data: bankAccount } = await supabase
        .from('farmer_bank_accounts')
        .select('*')
        .eq('farm_id', calc.farm_id)
        .eq('org_id', profile.org_id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (!bankAccount) {
        return NextResponse.json(
          { error: 'No bank account on file for this farmer. Add a bank account first.' },
          { status: 422 }
        );
      }

      let recipientCode = bankAccount.paystack_recipient_code;
      if (!recipientCode) {
        const recipient = await createTransferRecipient({
          name: bankAccount.account_name,
          accountNumber: bankAccount.account_number,
          bankCode: bankAccount.bank_code,
        });
        recipientCode = recipient.recipientCode;
        await supabase
          .from('farmer_bank_accounts')
          .update({ paystack_recipient_code: recipientCode })
          .eq('id', bankAccount.id);
      }

      const transfer = await initiateTransfer({
        amount: amount * 100, // NGN → kobo
        recipientCode,
        reference,
        reason: `OriginTrace: ${commodity} payment (${calc.weight_kg}kg) — ${batchCode}`,
      });

      const { data: payment, error: pmtErr } = await supabase
        .from('payments')
        .insert({
          org_id: profile.org_id,
          payee_name: calc.farmer_name,
          payee_type: 'farmer',
          amount,
          currency,
          payment_method: 'bank_transfer',
          reference_number: reference,
          linked_entity_type: 'collection_batch',
          linked_entity_id: calc.batch_id,
          payment_date: new Date().toISOString().split('T')[0],
          notes: `Paystack transfer for ${commodity} (${calc.weight_kg}kg) | Ref: ${transfer.transferCode}`,
          status: transfer.status === 'success' ? 'completed' : 'pending',
          recorded_by: user.id,
        })
        .select()
        .single();

      if (pmtErr) throw new Error(`Failed to record Paystack payment: ${pmtErr.message}`);
      paymentId = payment.id;
      disbursementStatus = transfer.status === 'success' ? 'completed' : 'pending';
    }

    // ── Mobile money path ─────────────────────────────────────────────────────
    else {
      const phone = phoneOverride;
      if (!phone) {
        return NextResponse.json(
          { error: 'phone is required for mobile money disbursement' },
          { status: 400 }
        );
      }

      const provider = getPaymentProvider(providerName as 'mtn_momo' | 'opay' | 'palmpay');
      if (!provider) {
        return NextResponse.json({ error: 'Unsupported payment provider' }, { status: 400 });
      }

      const result = await provider.disburse({
        phone,
        amount,
        currency,
        reference,
        narration: `OriginTrace: ${commodity} payment — ${batchCode}`,
      });

      const { data: payment, error: pmtErr } = await supabase
        .from('payments')
        .insert({
          org_id: profile.org_id,
          payee_name: calc.farmer_name,
          payee_type: 'farmer',
          amount,
          currency,
          payment_method: 'mobile_money',
          reference_number: reference,
          linked_entity_type: 'collection_batch',
          linked_entity_id: calc.batch_id,
          payment_date: new Date().toISOString().split('T')[0],
          notes: `${providerName} MoMo (${phone}) | TxID: ${result.transactionId}`,
          status: result.status === 'completed' ? 'completed' : 'pending',
          recorded_by: user.id,
        })
        .select()
        .single();

      if (pmtErr) throw new Error(`Failed to record MoMo payment: ${pmtErr.message}`);
      paymentId = payment.id;
      disbursementStatus = result.status === 'completed' ? 'completed' : 'pending';
    }

    // Update disbursement_calculations row
    const now = new Date().toISOString();
    await supabase
      .from('disbursement_calculations')
      .update({
        status: 'disbursed',
        payment_id: paymentId,
        updated_at: now,
      })
      .eq('id', params.id);

    // Audit log
    await logAuditEvent({
      orgId: profile.org_id,
      actorId: user.id,
      actorEmail: user.email,
      action: 'disbursement.paid',
      resourceType: 'disbursement_calculation',
      resourceId: params.id,
      metadata: { provider: providerName, amount, currency, reference, payment_id: paymentId },
      ipAddress: getClientIp(request),
    });

    // Webhook
    dispatchWebhookEvent(profile.org_id, 'payment.disbursed', {
      disbursement_id: params.id,
      payment_id: paymentId,
      farmer_name: calc.farmer_name,
      amount,
      currency,
      provider: providerName,
      reference,
      batch_id: calc.batch_id,
    });

    // Termii SMS — fire-and-forget, get farmer phone from farms table
    const { data: farm } = await supabase
      .from('farms')
      .select('phone')
      .eq('id', calc.farm_id)
      .single();

    const farmerPhone = farm?.phone;
    if (farmerPhone) {
      const smsText = disbursementStatus !== 'failed'
        ? buildPaymentConfirmationSMS({
            amount,
            currency,
            weightKg: Number(calc.weight_kg),
            commodity,
            reference,
          })
        : buildPaymentFailureSMS({ amount, currency, reference });
      sendSMS({ to: farmerPhone, sms: smsText }).catch(() => {});
    }

    return NextResponse.json({
      disbursement_id: params.id,
      payment_id: paymentId,
      status: disbursementStatus,
      reference,
    });
  } catch (error) {
    console.error('POST disbursements/[id]/pay error:', error);
    const msg = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
