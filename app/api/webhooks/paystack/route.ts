/**
 * POST /api/webhooks/paystack
 *
 * Public Paystack webhook receiver. No auth — verified by HMAC-SHA512 signature.
 *
 * Handles:
 *   charge.success          — subscription / one-off payment confirmed
 *   transfer.success        — farmer bank transfer completed
 *   transfer.failed         — transfer failed
 *   transfer.reversed       — transfer reversed (treated as failed)
 *   invoice.create          — recurring invoice created (log only)
 *   invoice.payment_failed  — recurring invoice payment failed (log only)
 *
 * All events return HTTP 200 to prevent Paystack retries, even on processing errors.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { verifyWebhookSignature } from '@/lib/payments/paystack';
import { logAuditEvent } from '@/lib/audit';
import { dispatchWebhookEvent } from '@/lib/webhooks';

export async function POST(request: NextRequest) {
  const rawBody = await request.text();
  const signature = request.headers.get('x-paystack-signature') ?? '';

  // ── Verify signature ──────────────────────────────────────────────────────
  if (!verifyWebhookSignature(rawBody, signature)) {
    console.warn('[paystack-webhook] Invalid signature');
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  let event: { event: string; data: any };
  try {
    event = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const supabase = createAdminClient();
  const { event: eventType, data } = event;

  try {
    switch (eventType) {
      // ── Subscription / charge payment confirmed ─────────────────────────────
      case 'charge.success': {
        const reference = data?.reference;
        if (!reference) break;

        // Find matching payment_link and mark as paid
        const { data: link } = await supabase
          .from('payment_links')
          .select('id, org_id, amount, metadata')
          .eq('reference', reference)
          .maybeSingle();

        if (link) {
          await supabase
            .from('payment_links')
            .update({ status: 'paid', paid_at: new Date().toISOString() })
            .eq('id', link.id);

          await logAuditEvent({
            orgId: link.org_id,
            action: 'payment.subscription_confirmed',
            resourceType: 'payment_link',
            resourceId: link.id,
            metadata: { reference, amount: data.amount, channel: data.channel },
          });
        }
        break;
      }

      // ── Bank transfer completed successfully ───────────────────────────────
      case 'transfer.success': {
        const reference = data?.reference;
        if (!reference) break;

        const { data: payment } = await supabase
          .from('payments')
          .select('id, org_id, amount, currency, payee_name')
          .eq('reference_number', reference)
          .maybeSingle();

        if (payment) {
          await supabase
            .from('payments')
            .update({ status: 'completed' })
            .eq('id', payment.id);

          await logAuditEvent({
            orgId: payment.org_id,
            action: 'payment.transfer_completed',
            resourceType: 'payment',
            resourceId: payment.id,
            metadata: {
              reference,
              transfer_code: data.transfer_code,
              amount: data.amount,
              recipient: data.recipient?.name,
            },
          });

          dispatchWebhookEvent(payment.org_id, 'payment.transfer_completed', {
            payment_id: payment.id,
            reference,
            transfer_code: data.transfer_code,
            amount: payment.amount,
            currency: payment.currency,
            payee_name: payment.payee_name,
            status: 'completed',
          });
        }
        break;
      }

      // ── Transfer failed or reversed ────────────────────────────────────────
      case 'transfer.failed':
      case 'transfer.reversed': {
        const reference = data?.reference;
        if (!reference) break;

        const { data: payment } = await supabase
          .from('payments')
          .select('id, org_id, amount, currency, payee_name')
          .eq('reference_number', reference)
          .maybeSingle();

        if (payment) {
          await supabase
            .from('payments')
            .update({ status: 'failed' })
            .eq('id', payment.id);

          await logAuditEvent({
            orgId: payment.org_id,
            action: 'payment.transfer_failed',
            resourceType: 'payment',
            resourceId: payment.id,
            metadata: {
              reference,
              event: eventType,
              reason: data.transfer?.reason ?? data.reason,
            },
          });

          dispatchWebhookEvent(payment.org_id, 'payment.transfer_failed', {
            payment_id: payment.id,
            reference,
            amount: payment.amount,
            currency: payment.currency,
            payee_name: payment.payee_name,
            status: 'failed',
            reason: data.transfer?.reason ?? data.reason,
          });
        }
        break;
      }

      // ── Subscription invoice events (log only) ─────────────────────────────
      case 'invoice.create':
      case 'invoice.payment_failed':
        console.info(`[paystack-webhook] ${eventType} — invoice ${data?.invoice_code}`);
        break;

      default:
        // Unknown event — log and return 200
        console.info(`[paystack-webhook] Unhandled event: ${eventType}`);
    }
  } catch (err) {
    // Log but always return 200 to prevent Paystack retries
    console.error(`[paystack-webhook] Error handling ${eventType}:`, err);
  }

  return NextResponse.json({ received: true });
}
