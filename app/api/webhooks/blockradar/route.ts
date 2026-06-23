import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { verifyBlockradarSignature } from '@/lib/payments/blockradar';
import { dispatchWebhookEvent } from '@/lib/webhooks';
import { logAuditEvent } from '@/lib/audit';

/**
 * POST /api/webhooks/blockradar
 * Receives confirmed USDC deposit and transfer events from Blockradar.
 *
 * On deposit.confirmed:
 *  - Identifies the org by matching blockradar_wallet_id
 *  - Creates a payment record (payee_type='buyer', method='usdc')
 *  - Updates org's usdc_balance
 *  - Dispatches payment.received webhook
 */
export async function POST(request: NextRequest) {
  let rawBody: string;
  try {
    rawBody = await request.text();
  } catch {
    return NextResponse.json({ error: 'Failed to read body' }, { status: 400 });
  }

  const signature = request.headers.get('x-blockradar-signature') ?? '';
  if (!verifyBlockradarSignature(rawBody, signature)) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
  }

  let event: any;
  try {
    event = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const eventType: string = event.event ?? event.type ?? '';
  const data = event.data ?? event;

  const supabase = createAdminClient();

  // Identify org by wallet ID
  const walletId = data.wallet_id ?? data.walletId ?? data.wallet?.id;
  if (!walletId) {
    return NextResponse.json({ received: true, skipped: 'no wallet_id' });
  }

  const { data: org } = await supabase
    .from('organizations')
    .select('id, usdc_balance')
    .eq('blockradar_wallet_id', walletId)
    .single();

  if (!org) {
    return NextResponse.json({ received: true, skipped: 'wallet not linked to any org' });
  }

  if (eventType === 'deposit.confirmed' || eventType === 'transaction.confirmed') {
    const amount = Number(data.amount ?? 0);
    const currency = data.currency ?? 'USDC';
    const hash = data.hash ?? data.txHash ?? null;
    const fromAddress = data.from ?? data.sender ?? null;
    const reference = data.reference ?? data.narration ?? null;
    const network = data.network ?? null;

    // Create payment record
    const { data: payment } = await supabase
      .from('payments')
      .insert({
        org_id: org.id,
        payee_name: fromAddress ?? 'Buyer',
        payee_type: 'buyer',
        amount,
        currency,
        payment_method: 'usdc',
        reference_number: hash ?? reference,
        payment_date: new Date().toISOString().split('T')[0],
        notes: `USDC deposit via Blockradar | Network: ${network} | Hash: ${hash}`,
        status: 'completed',
      })
      .select()
      .single();

    // Update org USDC balance
    const newBalance = Number(org.usdc_balance ?? 0) + amount;
    await supabase
      .from('organizations')
      .update({ usdc_balance: newBalance })
      .eq('id', org.id);

    await logAuditEvent({
      orgId: org.id,
      actorId: null as any,
      actorEmail: 'blockradar-webhook',
      action: 'payment.received',
      resourceType: 'payment',
      resourceId: payment?.id?.toString(),
      metadata: { amount, currency, hash, network, from: fromAddress },
    });

    dispatchWebhookEvent(org.id, 'payment.received' as any, {
      payment_id: payment?.id,
      amount,
      currency,
      hash,
      network,
      from: fromAddress,
      reference,
      new_balance: newBalance,
    });
  }

  return NextResponse.json({ received: true });
}
