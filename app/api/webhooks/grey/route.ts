import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { verifyGreySignature } from '@/lib/payments/grey';
import { dispatchWebhookEvent } from '@/lib/webhooks';
import { logAuditEvent } from '@/lib/audit';

/**
 * POST /api/webhooks/grey
 * Receives inbound wire transfer events from Grey (virtual bank accounts).
 *
 * On transfer.confirmed:
 *  - Identifies the org by matching grey_virtual_accounts array
 *  - Creates a payment record (payee_type='buyer', method='bank_transfer')
 *  - Dispatches payment.received webhook
 *  - Attempts to link to a shipment by matching reference to shipment_code
 */
export async function POST(request: NextRequest) {
  let rawBody: string;
  try {
    rawBody = await request.text();
  } catch {
    return NextResponse.json({ error: 'Failed to read body' }, { status: 400 });
  }

  const signature = request.headers.get('x-grey-signature') ?? '';
  if (!verifyGreySignature(rawBody, signature)) {
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

  if (eventType !== 'transfer.confirmed' && eventType !== 'inbound.confirmed') {
    return NextResponse.json({ received: true, skipped: `event type '${eventType}' not handled` });
  }

  const supabase = createAdminClient();

  const accountId = data.account_id ?? data.virtual_account_id;
  if (!accountId) {
    return NextResponse.json({ received: true, skipped: 'no account_id' });
  }

  // Find the org that owns this virtual account
  // grey_virtual_accounts is a JSONB array: [{account_id, currency, ...}]
  const { data: orgs } = await supabase
    .from('organizations')
    .select('id, grey_virtual_accounts')
    .not('grey_virtual_accounts', 'is', null);

  const org = (orgs ?? []).find((o) =>
    (o.grey_virtual_accounts as any[]).some((a: any) => a.account_id === accountId)
  );

  if (!org) {
    return NextResponse.json({ received: true, skipped: 'account not linked to any org' });
  }

  const amount = Number(data.amount ?? 0);
  const currency = data.currency ?? 'USD';
  const senderName = data.sender_name ?? data.sender?.name ?? 'Wire Sender';
  const senderBank = data.sender_bank ?? data.sender?.bank ?? null;
  const reference = data.reference ?? data.narration ?? null;

  // Try to link to a shipment by reference
  let linkedEntityId: string | null = null;
  if (reference) {
    const { data: shipment } = await supabase
      .from('shipments')
      .select('id')
      .eq('org_id', org.id)
      .eq('shipment_code', reference.trim())
      .single();
    if (shipment) linkedEntityId = shipment.id;
  }

  const { data: payment } = await supabase
    .from('payments')
    .insert({
      org_id: org.id,
      payee_name: senderName,
      payee_type: 'buyer',
      amount,
      currency,
      payment_method: 'bank_transfer',
      reference_number: reference,
      linked_entity_type: linkedEntityId ? 'contract' : null,
      linked_entity_id: linkedEntityId ? null : null, // shipments not directly a contract
      payment_date: new Date().toISOString().split('T')[0],
      notes: `Grey inbound wire | From: ${senderName} (${senderBank ?? 'Unknown bank'}) | Account: ${accountId}`,
      status: 'completed',
    })
    .select()
    .single();

  await logAuditEvent({
    orgId: org.id,
    actorId: null as any,
    actorEmail: 'grey-webhook',
    action: 'payment.received',
    resourceType: 'payment',
    resourceId: payment?.id?.toString(),
    metadata: { amount, currency, sender: senderName, reference, account_id: accountId },
  });

  dispatchWebhookEvent(org.id, 'payment.received' as any, {
    payment_id: payment?.id,
    amount,
    currency,
    sender: senderName,
    sender_bank: senderBank,
    reference,
    linked_shipment_id: linkedEntityId,
  });

  return NextResponse.json({ received: true });
}
