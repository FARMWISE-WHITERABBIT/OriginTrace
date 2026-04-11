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
import {
  WEBHOOK_EVENTS as _CATALOG_EVENTS,
  type PlatformEventType,
} from '@/modules/integrations/domain/event-catalog';
import { WEBHOOK_MAX_ATTEMPTS, webhookBackoffMs } from '@/lib/platform/scheduling/cron-policy';

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
    status = response.ok ? 'delivered' : (attempt >= WEBHOOK_MAX_ATTEMPTS ? 'failed' : 'pending');
  } catch (error) {
    responseBody = error instanceof Error ? error.message : 'Unknown error';
    status = attempt >= WEBHOOK_MAX_ATTEMPTS ? 'failed' : 'pending';
  }

  // Calculate next_retry_at using exponential back-off
  const nextRetryAt =
    status === 'pending'
      ? new Date(Date.now() + webhookBackoffMs(attempt)).toISOString()
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

/**
 * Maximum delivery attempts — imported from canonical cron policy (ADR-004).
 * @deprecated Import WEBHOOK_MAX_ATTEMPTS from '@/lib/platform/scheduling/cron-policy' directly.
 */
export const MAX_ATTEMPTS = WEBHOOK_MAX_ATTEMPTS;

/**
 * Exponential back-off — imported from canonical cron policy (ADR-004).
 * @deprecated Import webhookBackoffMs from '@/lib/platform/scheduling/cron-policy' directly.
 */
export function backoffMs(attempt: number): number {
  return webhookBackoffMs(attempt);
}

/**
 * Full catalog of platform events — re-exported from the canonical event catalog (ADR-003).
 * @deprecated Import WEBHOOK_EVENTS from '@/modules/integrations/domain/event-catalog' directly.
 */
export const WEBHOOK_EVENTS = _CATALOG_EVENTS;

/**
 * @deprecated Use PlatformEventType from '@/modules/integrations/domain/event-catalog'.
 */
export type WebhookEventType = PlatformEventType;
