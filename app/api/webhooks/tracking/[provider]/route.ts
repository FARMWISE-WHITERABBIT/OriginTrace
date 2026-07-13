/**
 * POST /api/webhooks/tracking/[provider]
 *
 * Public container-tracking webhook receiver (provider-agnostic). No profile
 * auth — verified by per-provider signature, same family as webhooks/paystack.
 *
 * Providers are adapters: verify(rawBody, headers) + parse(payload). The MVP
 * ships the 'mock' adapter (HMAC-SHA256 with TRACKING_WEBHOOK_SECRET) used for
 * end-to-end testing and any custom integration; 'terminal49' / 'vizion'
 * adapters slot in here once contracted (see docs/ESCROW-SHIPPING-APIS.md).
 *
 * After signature verification, always returns 200 so providers don't retry
 * storms — per-event failures are reported in the response body and retried
 * by the cron sweep.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createHmac, timingSafeEqual } from 'crypto';
import { z } from 'zod';
import { createAdminClient } from '@/lib/supabase/admin';
import {
  ingestShippingEvent,
  processShippingEvent,
  type NormalizedShippingEvent,
} from '@/lib/services/shipping-events';
import {
  verifyTerminal49Signature,
  parseTerminal49Webhook,
} from '@/lib/services/terminal49';

// ─── Payload schema (normalized; adapters map provider payloads onto this) ───

const eventSchema = z.object({
  event_id: z.string().min(1),
  event_code: z.string().min(2).max(8),
  classifier: z.enum(['ACT', 'EST', 'PLN']).optional(),
  event_time: z.string().datetime({ offset: true }),
  location_locode: z.string().optional(),
  location_name: z.string().optional(),
  vessel_name: z.string().optional(),
  voyage_number: z.string().optional(),
});

const payloadSchema = z.object({
  reference_id: z.string().min(1),
  events: z.array(eventSchema).min(1).max(100),
});

// ─── Provider adapters ────────────────────────────────────────────────────────

interface ParsedTrackingPayload {
  /** The provider's subscription reference (tracking_subscriptions.provider_reference_id), when the payload carries it. */
  referenceId: string | null;
  /** Our tracking_subscriptions.id, when the provider echoes it back instead (e.g. Terminal49 ref_numbers round-trip). */
  subscriptionId?: string | null;
  events: NormalizedShippingEvent[];
  /** Provider-side lifecycle: close the subscription with this status (never re-opens anything). */
  subscriptionStatus?: 'error' | 'cancelled';
}

interface TrackingAdapter {
  verify(rawBody: string, request: NextRequest): boolean;
  /** Map the provider's payload to (reference, normalized events). */
  parse(rawBody: string): ParsedTrackingPayload;
}

function hmacVerify(rawBody: string, signatureHeader: string | null, secret: string): boolean {
  if (!signatureHeader) return false;
  const expected = createHmac('sha256', secret).update(rawBody).digest('hex');
  const provided = Buffer.from(signatureHeader);
  const wanted = Buffer.from(expected);
  return provided.length === wanted.length && timingSafeEqual(provided, wanted);
}

const adapters: Record<string, TrackingAdapter> = {
  // Generic HMAC-signed adapter: E2E tests, manual integrations, and staging.
  mock: {
    verify(rawBody, request) {
      const secret = process.env.TRACKING_WEBHOOK_SECRET;
      if (!secret) return false;
      return hmacVerify(rawBody, request.headers.get('x-tracking-signature'), secret);
    },
    parse(rawBody) {
      const payload = payloadSchema.parse(JSON.parse(rawBody));
      return {
        referenceId: payload.reference_id,
        events: payload.events.map((e) => ({
          providerEventId: e.event_id,
          eventCode: e.event_code,
          classifier: e.classifier,
          eventTime: e.event_time,
          locationLocode: e.location_locode,
          locationName: e.location_name,
          vesselName: e.vessel_name,
          voyageNumber: e.voyage_number,
          raw: e,
        })),
      };
    },
  },
  // Terminal49 (lib/services/terminal49.ts): HMAC-SHA256 of the raw body in
  // X-T49-Webhook-Signature, keyed with the secret from webhook creation.
  // Fails safe when TERMINAL49_WEBHOOK_SECRET is unset.
  terminal49: {
    verify(rawBody, request) {
      return verifyTerminal49Signature(
        rawBody,
        request.headers.get('x-t49-webhook-signature')
      );
    },
    parse(rawBody) {
      return parseTerminal49Webhook(rawBody);
    },
  },
  // vizion: add adapter here after the pilot — maps the provider's webhook
  // body onto NormalizedShippingEvent and verifies its signature scheme.
};

// ─── Handler ──────────────────────────────────────────────────────────────────

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ provider: string }> }
) {
  const { provider } = await params;
  const adapter = adapters[provider];
  if (!adapter) {
    return NextResponse.json({ error: 'Unknown tracking provider' }, { status: 404 });
  }

  const rawBody = await request.text();
  if (!adapter.verify(rawBody, request)) {
    console.warn(`[tracking-webhook:${provider}] Invalid signature`);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
  }

  let parsed: ParsedTrackingPayload;
  try {
    parsed = adapter.parse(rawBody);
  } catch {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
  }

  const supabase = createAdminClient();

  // Resolve the subscription reference. Some providers (Terminal49 transport
  // events) don't carry their own tracking-request id — they echo back our
  // subscription id instead, so look up the stored provider reference.
  let referenceId = parsed.referenceId;
  if (!referenceId && parsed.subscriptionId) {
    const { data: sub } = await supabase
      .from('tracking_subscriptions')
      .select('provider_reference_id')
      .eq('id', parsed.subscriptionId)
      .eq('provider', provider)
      .maybeSingle();
    referenceId = sub?.provider_reference_id ?? null;
  }

  // Provider-side lifecycle (e.g. tracking_request.failed): close the
  // subscription so late events stop ingesting. Only ever closes — a closed
  // subscription is never re-activated from a webhook.
  if (parsed.subscriptionStatus && referenceId) {
    await supabase
      .from('tracking_subscriptions')
      .update({ status: parsed.subscriptionStatus, updated_at: new Date().toISOString() })
      .eq('provider', provider)
      .eq('provider_reference_id', referenceId)
      .eq('status', 'active');
  }

  if (!referenceId) {
    // Signature-verified but unmatchable — acknowledge so the provider does
    // not retry-storm; nothing is stored.
    console.warn(`[tracking-webhook:${provider}] payload had no resolvable subscription reference`);
    return NextResponse.json({ received: true, unmatched: true });
  }

  const summary = {
    stored: 0,
    duplicates: 0,
    no_subscription: 0,
    subscription_inactive: 0,
    outcomes: [] as string[],
  };

  for (const ev of parsed.events) {
    try {
      const result = await ingestShippingEvent(provider, referenceId, ev);
      if (result.status === 'no_subscription') {
        summary.no_subscription += 1;
      } else if (result.status === 'subscription_inactive') {
        summary.subscription_inactive += 1;
      } else if (result.status === 'duplicate') {
        summary.duplicates += 1;
      } else {
        summary.stored += 1;
        summary.outcomes.push(await processShippingEvent(result.event, result.subscription));
      }
    } catch (err) {
      // Never fail the whole batch — the cron sweep retries unprocessed events.
      console.error(`[tracking-webhook:${provider}] event failed:`, err);
      summary.outcomes.push('error:ingest_failed');
    }
  }

  return NextResponse.json({ received: true, ...summary });
}
