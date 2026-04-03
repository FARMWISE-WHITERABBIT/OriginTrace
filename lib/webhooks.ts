/**
 * Webhook dispatch and delivery for OriginTrace.
 *
 * Design:
 *  - dispatchWebhookEvent()  — fire-and-forget dispatch. Attempts immediate delivery.
 *    On failure, the delivery row stays `status: 'pending'` and
 *    /api/cron/webhook-retry picks it up with exponential back-off.
 *  - The old setTimeout-based in-process retry has been removed. It was silently
 *    dropped on every serverless cold start and provided no durability guarantee.
 *
 * Retry schedule (handled by cron):
 *   attempt 1 → immediate
 *   attempt 2 → ~1 min after failure
 *   attempt 3 → ~5 min after failure
 *   attempt 4 → ~30 min after failure
 *   attempt 5 → ~2 h after failure  → then marked 'failed'
 */
import { createAdminClient } from '@/lib/supabase/admin';
import crypto from 'crypto';

export async function dispatchWebhookEvent(
  orgId: string,
  eventType: string,
  payload: Record<string, any>
): Promise<void> {
  try {
    const supabase = createAdminClient();

    const { data: endpoints } = await supabase
      .from('webhook_endpoints')
      .select('id, url, secret, events')
      .eq('org_id', orgId)
      .eq('status', 'active');

    if (!endpoints || endpoints.length === 0) return;

    const matchingEndpoints = endpoints.filter(
      (ep) => ep.events && ep.events.includes(eventType)
    );

    // Fan out — each delivery is tracked independently in webhook_deliveries
    await Promise.allSettled(
      matchingEndpoints.map((endpoint) =>
        attemptDelivery(supabase, endpoint, eventType, payload, 1)
      )
    );
  } catch (error) {
    console.error('Webhook dispatch error:', error);
  }
}

/**
 * Attempt a single webhook delivery and persist the result.
 * @param existingId  Pass the existing webhook_deliveries.id when retrying so the row
 *                   is updated in place rather than a new row being inserted.
 */
export async function attemptDelivery(
  supabase: ReturnType<typeof createAdminClient>,
  endpoint: { id: string; url: string; secret: string },
  eventType: string,
  payload: Record<string, any>,
  attempt: number,
  existingId?: string
): Promise<void> {
  const deliveryId = existingId ?? crypto.randomUUID();

  const body = JSON.stringify({
    event: eventType,
    timestamp: new Date().toISOString(),
    data: payload,
  });

  const signature = crypto
    .createHmac('sha256', endpoint.secret)
    .update(body)
    .digest('hex');

  let responseStatus: number | null = null;
  let responseBody: string | null = null;
  let status: 'delivered' | 'failed' | 'pending' = 'pending';

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10_000);

    const response = await fetch(endpoint.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Webhook-Signature': `sha256=${signature}`,
        'X-Webhook-Event': eventType,
        'X-Webhook-Delivery': deliveryId,
      },
      body,
      signal: controller.signal,
    });

    clearTimeout(timeout);
    responseStatus = response.status;
    responseBody = await response.text().catch(() => '');
    status = response.ok ? 'delivered' : (attempt >= MAX_ATTEMPTS ? 'failed' : 'pending');
  } catch (error) {
    responseBody = error instanceof Error ? error.message : 'Unknown error';
    status = attempt >= MAX_ATTEMPTS ? 'failed' : 'pending';
  }

  // Calculate next_retry_at using exponential back-off
  const nextRetryAt =
    status === 'pending'
      ? new Date(Date.now() + backoffMs(attempt)).toISOString()
      : null;

  await supabase.from('webhook_deliveries').upsert({
    id: deliveryId,
    webhook_id: endpoint.id,
    event_type: eventType,
    payload,
    response_status: responseStatus,
    response_body: responseBody?.slice(0, 1000),
    attempts: attempt,
    status,
    next_retry_at: nextRetryAt,
    last_attempted_at: new Date().toISOString(),
  }, { onConflict: 'id' });
}

/** Maximum delivery attempts before a delivery is permanently failed. */
export const MAX_ATTEMPTS = 5;

/**
 * Exponential back-off with jitter (seconds → ms).
 *   attempt 1 → 60 s
 *   attempt 2 → 300 s (5 min)
 *   attempt 3 → 1 800 s (30 min)
 *   attempt 4 → 7 200 s (2 h)
 */
export function backoffMs(attempt: number): number {
  const base = 60_000; // 1 min
  const jitter = Math.random() * 5_000;
  return Math.min(base * Math.pow(5, attempt - 1) + jitter, 8 * 60 * 60 * 1000);
}

export const WEBHOOK_EVENTS = [
  // Shipments
  'shipment.created',
  'shipment.updated',
  'shipment.scored',
  // Collection
  'batch.created',
  // Documents
  'document.uploaded',
  'document.expired',
  // Compliance
  'compliance.changed',
  'lab_result.uploaded',
  'lab_result.non_compliant',
  // Payments
  'payment.recorded',
  'payment.disbursed',
  'payment.transfer_completed',
  'payment.transfer_failed',
  // Farms
  'farm.approved',
  'farm.rejected',
  // Certifications
  'certification.expiring',
  // Trade
  'tender.created',
  'tender.awarded',
  // Evidence
  'evidence_package.created',
  // KYC
  'kyc.submitted',
  'kyc.approved',
  'kyc.rejected',
  // Escrow
  'escrow.held',
  'escrow.released',
  'escrow.disputed',
  'dispute.resolved',
] as const;

export type WebhookEventType = (typeof WEBHOOK_EVENTS)[number];
