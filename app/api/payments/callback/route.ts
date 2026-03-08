'use server';

import { createAdminClient } from '@/lib/supabase/admin';
import { NextRequest, NextResponse } from 'next/server';
import { logAuditEvent } from '@/lib/audit';
import { dispatchWebhookEvent } from '@/lib/webhooks';
import crypto from 'crypto';

function verifyProviderSignature(rawBody: string, signature: string, provider: string): boolean {
  if (!signature) return false;

  const secretKey = provider === 'mtn_momo'
    ? process.env.MTN_MOMO_CALLBACK_SECRET
    : provider === 'opay'
    ? process.env.OPAY_SECRET_KEY
    : process.env.PALMPAY_SECRET_KEY;

  if (!secretKey) return true;

  const expectedSig = crypto.createHmac('sha256', secretKey).update(rawBody).digest('hex');
  const sigBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expectedSig);
  if (sigBuffer.length !== expectedBuffer.length) return false;
  return crypto.timingSafeEqual(sigBuffer, expectedBuffer);
}

export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.text();
    const signature = request.headers.get('x-callback-signature') || request.headers.get('authorization') || '';
    let body: any;

    try {
      body = JSON.parse(rawBody);
    } catch {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }

    const provider = body.referenceId ? 'mtn_momo' : body.orderNo ? 'opay' : 'palmpay';

    if (!verifyProviderSignature(rawBody, signature, provider)) {
      console.error('Payment callback: invalid signature for provider', provider);
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    const transactionId = body.referenceId || body.reference || body.orderNo || body.transactionId;
    const status = body.status?.toLowerCase() || 'unknown';

    if (!transactionId) {
      return NextResponse.json({ error: 'Missing transaction reference' }, { status: 400 });
    }

    const supabase = createAdminClient();

    const mappedStatus = ['successful', 'success', 'completed'].includes(status) ? 'completed' : 'failed';

    const { data: payment } = await supabase
      .from('payments')
      .select('id, org_id, reference_number, notes')
      .or(`reference_number.eq.${transactionId},notes.ilike.%${transactionId}%`)
      .single();

    if (!payment) {
      console.error('Payment callback: no matching payment for', transactionId);
      return NextResponse.json({ received: true, matched: false });
    }

    await supabase
      .from('payments')
      .update({ status: mappedStatus })
      .eq('id', payment.id);

    await logAuditEvent({
      orgId: payment.org_id,
      action: 'payment.callback_received',
      resourceType: 'payment',
      resourceId: payment.id?.toString(),
      metadata: { transactionId, callbackStatus: status, mappedStatus, signaturePresent: !!signature },
    });

    if (payment.org_id) {
      dispatchWebhookEvent(payment.org_id, 'payment.recorded', {
        payment_id: payment.id,
        status: mappedStatus,
        transactionId,
      });
    }

    return NextResponse.json({ received: true, matched: true, status: mappedStatus });
  } catch (error) {
    console.error('Payment callback error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
