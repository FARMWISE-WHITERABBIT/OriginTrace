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

    for (const endpoint of matchingEndpoints) {
      deliverWebhook(supabase, endpoint, eventType, payload);
    }
  } catch (error) {
    console.error('Webhook dispatch error:', error);
  }
}

async function deliverWebhook(
  supabase: any,
  endpoint: { id: string; url: string; secret: string },
  eventType: string,
  payload: Record<string, any>,
  attempt: number = 1,
  maxAttempts: number = 3
): Promise<void> {
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
    const timeout = setTimeout(() => controller.abort(), 10000);

    const response = await fetch(endpoint.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Webhook-Signature': `sha256=${signature}`,
        'X-Webhook-Event': eventType,
        'X-Webhook-Delivery': crypto.randomUUID(),
      },
      body,
      signal: controller.signal,
    });

    clearTimeout(timeout);

    responseStatus = response.status;
    responseBody = await response.text().catch(() => '');

    if (response.ok) {
      status = 'delivered';
    } else {
      status = attempt >= maxAttempts ? 'failed' : 'pending';
    }
  } catch (error) {
    responseBody = error instanceof Error ? error.message : 'Unknown error';
    status = attempt >= maxAttempts ? 'failed' : 'pending';
  }

  await supabase.from('webhook_deliveries').insert({
    webhook_id: endpoint.id,
    event_type: eventType,
    payload,
    response_status: responseStatus,
    response_body: responseBody?.slice(0, 1000),
    attempts: attempt,
    status,
  });

  if (status === 'pending' && attempt < maxAttempts) {
    setTimeout(() => {
      deliverWebhook(supabase, endpoint, eventType, payload, attempt + 1, maxAttempts);
    }, attempt * 5000);
  }
}

export const WEBHOOK_EVENTS = [
  'shipment.created',
  'shipment.updated',
  'shipment.scored',
  'batch.created',
  'document.uploaded',
  'document.expired',
  'compliance.changed',
  'payment.recorded',
  'payment.disbursed',
  'farm.approved',
  'farm.rejected',
  'certification.expiring',
  'tender.created',
  'tender.awarded',
] as const;

export type WebhookEventType = (typeof WEBHOOK_EVENTS)[number];
