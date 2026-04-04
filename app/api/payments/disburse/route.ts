import { createAdminClient } from '@/lib/supabase/admin';
import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedProfile } from '@/lib/api-auth';
import { z } from 'zod';
import { getPaymentProvider, SUPPORTED_PROVIDERS } from '@/lib/payments';
import { createTransferRecipient, initiateTransfer } from '@/lib/payments/paystack';
import { logAuditEvent, getClientIp } from '@/lib/audit';
import { dispatchWebhookEvent } from '@/lib/webhooks';

const disburseSchema = z.object({
  phone: z.string().min(8, 'Valid phone number required').optional(),
  amount: z.number().positive('Amount must be positive'),
  currency: z.string().default('NGN'),
  provider: z.enum(['mtn_momo', 'opay', 'palmpay', 'paystack_transfer']),
  payee_name: z.string().min(1, 'Payee name required'),
  linked_entity_type: z.enum(['collection_batch', 'contract']).optional(),
  linked_entity_id: z.number().optional(),
  notes: z.string().optional(),
  // Paystack bank transfer fields (required when provider = 'paystack_transfer')
  farmer_bank_account_id: z.string().uuid().optional(),
});

export async function GET() {
  return NextResponse.json({ providers: SUPPORTED_PROVIDERS });
}

export async function POST(request: NextRequest) {
  try {
    const { user, profile } = await getAuthenticatedProfile(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    if (!profile.org_id) return NextResponse.json({ error: 'No organization assigned' }, { status: 403 });
    const supabase = createAdminClient();

    const body = await request.json();
    const parsed = disburseSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Validation failed', fields: parsed.error.flatten().fieldErrors }, { status: 400 });
    }

    const { phone, amount, currency, provider: providerName, payee_name, linked_entity_type, linked_entity_id, notes, farmer_bank_account_id } = parsed.data;

    const reference = `OT-${profile.org_id.slice(0, 8)}-${Date.now().toString(36).toUpperCase()}`;

    // ── Paystack bank transfer path ──────────────────────────────────────────
    if (providerName === 'paystack_transfer') {
      if (!farmer_bank_account_id) {
        return NextResponse.json(
          { error: 'farmer_bank_account_id is required for paystack_transfer provider' },
          { status: 400 }
        );
      }

      const { data: bankAccount, error: bankError } = await supabase
        .from('farmer_bank_accounts')
        .select('*')
        .eq('id', farmer_bank_account_id)
        .eq('org_id', profile.org_id)
        .single();

      if (bankError || !bankAccount) {
        return NextResponse.json({ error: 'Farmer bank account not found' }, { status: 404 });
      }

      // Get or create Paystack recipient code
      let recipientCode = bankAccount.paystack_recipient_code;
      if (!recipientCode) {
        const recipient = await createTransferRecipient({
          name:          bankAccount.account_name,
          accountNumber: bankAccount.account_number,
          bankCode:      bankAccount.bank_code,
        });
        recipientCode = recipient.recipientCode;
        // Store for reuse
        await supabase
          .from('farmer_bank_accounts')
          .update({ paystack_recipient_code: recipientCode })
          .eq('id', farmer_bank_account_id);
      }

      const transfer = await initiateTransfer({
        amount:        amount * 100,  // NGN → kobo
        recipientCode,
        reference,
        reason:        notes ?? `OriginTrace payment to ${payee_name}`,
      });

      const { data: payment, error: insertError } = await supabase
        .from('payments')
        .insert({
          org_id:             profile.org_id,
          payee_name,
          payee_type:         'farmer',
          amount,
          currency,
          payment_method:     'bank_transfer',
          reference_number:   reference,
          linked_entity_type: linked_entity_type ?? null,
          linked_entity_id:   linked_entity_id ?? null,
          payment_date:       new Date().toISOString().split('T')[0],
          notes:              notes
            ? `${notes} | Provider: paystack_transfer | Transfer: ${transfer.transferCode}`
            : `Provider: paystack_transfer | Transfer: ${transfer.transferCode}`,
          status:             transfer.status === 'success' ? 'completed' : 'pending',
          recorded_by:        user.id,
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
        metadata: { provider: 'paystack_transfer', amount, currency, transferCode: transfer.transferCode, status: transfer.status },
        ipAddress: getClientIp(request),
      });

      dispatchWebhookEvent(profile.org_id, 'payment.disbursed', {
        payment_id: payment?.id,
        provider: 'paystack_transfer',
        amount,
        currency,
        transfer_code: transfer.transferCode,
        status: transfer.status,
        reference,
      });

      return NextResponse.json({
        payment,
        disbursement: {
          provider:     'paystack_transfer',
          transferCode: transfer.transferCode,
          status:       transfer.status,
          reference:    transfer.reference,
        },
      });
    }

    // ── Mobile money path (existing) ─────────────────────────────────────────
    if (!phone) {
      return NextResponse.json({ error: 'phone is required for mobile money providers' }, { status: 400 });
    }

    const provider = getPaymentProvider(providerName);
    if (!provider) {
      return NextResponse.json({ error: 'Unsupported payment provider' }, { status: 400 });
    }

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
