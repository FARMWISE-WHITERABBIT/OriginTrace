/**
 * OriginTrace — Terminal49 container-tracking integration.
 *
 * Two halves:
 *   1. Webhook side: verifyTerminal49Signature() + parseTerminal49Webhook()
 *      implement the TrackingAdapter contract used by
 *      app/api/webhooks/tracking/[provider]/route.ts, mapping Terminal49's
 *      JSON:API webhook notifications onto NormalizedShippingEvent.
 *   2. Subscribe side: subscribeShipmentToTerminal49() POSTs a tracking
 *      request to Terminal49 when a shipment's container is confirmed
 *      (stage 6 → 7) and records a tracking_subscriptions row. Best-effort
 *      and non-blocking by contract: it NEVER throws into the caller — any
 *      failure (missing key, network, API error) is logged and swallowed,
 *      same fire-and-forget discipline as dispatchWebhookEvent.
 *
 * Money-safety: creating a Terminal49 subscription is about visibility ONLY.
 * auto_release_enabled is always inserted as false here; opting into escrow
 * automation remains a separate explicit human action via
 * POST /api/shipments/[id]/tracking. Nothing in this module may change that.
 *
 * Env vars (both optional — unset means the integration is off and fails safe):
 *   TERMINAL49_API_KEY        — API token for POST /v2/tracking_requests
 *                               ("Authorization: Token <key>"). Unset →
 *                               subscribe no-ops with a log line.
 *   TERMINAL49_WEBHOOK_SECRET — the `secret` returned when the webhook is
 *                               created in Terminal49 (POST /v2/webhooks).
 *                               Signatures are HMAC-SHA256 hex digests of the
 *                               raw body in the X-T49-Webhook-Signature
 *                               header. Unset → verify() rejects everything.
 *
 * API facts confirmed from https://terminal49.com/docs (2026-07-10):
 *   - Auth: "Authorization: Token YOUR_API_KEY".
 *   - POST https://api.terminal49.com/v2/tracking_requests with
 *     data.attributes { request_type: 'bill_of_lading'|'booking_number'|
 *     'container', request_number, scac | auto_detect_vocc_scac, ref_numbers,
 *     shipment_tags }; 201 returns data.id (UUID).
 *   - Webhook signature: HMAC-SHA256 hex of body, X-T49-Webhook-Signature.
 *   - Notification envelope: data.type 'webhook_notification',
 *     data.attributes.event / delivery_status / created_at, data.id
 *     (idempotency key), relationships.reference_object, included[].
 *   - transport_event attributes: event, timestamp, location_locode,
 *     timezone, voyage_number; relationships to shipment/container/vessel/
 *     location/terminal.
 *   - container.transport.* notifications include shipment (with ref_numbers,
 *     tags, port_of_discharge_locode, bill_of_lading_number) but do NOT
 *     reference the tracking_request id — hence the ot-sub:<uuid> ref_number
 *     round-trip below.
 */

import { createHmac, timingSafeEqual, randomUUID } from 'crypto';
import { createAdminClient } from '@/lib/supabase/admin';
import { logAuditEvent } from '@/lib/audit';
import type { NormalizedShippingEvent } from '@/lib/services/shipping-events';

export const TERMINAL49_PROVIDER = 'terminal49';
const TERMINAL49_API_BASE = 'https://api.terminal49.com/v2';

/**
 * Prefix for the ref_number we attach to every tracking request we create.
 * Terminal49 echoes ref_numbers back on the shipment resource included in
 * transport-event webhooks; since those webhooks carry no tracking_request
 * id, this is how an inbound event finds its tracking_subscriptions row.
 */
export const T49_SUBSCRIPTION_REF_PREFIX = 'ot-sub:';

// ─── Event mapping (Terminal49 → DCSA-ish vocabulary) ─────────────────────────
//
// Terminal49 transport-event names (short form, after stripping the
// 'container.transport.' / 'estimated.' prefixes) → our event codes.
//
// Deliberate choices:
//   - transshipment_* map to TS* codes that are NOT in EVENT_STAGE_MAP, so
//     they are stored for visibility but can never release (defense in depth
//     on top of the DISC POD gate — Terminal49 already tells us it's a
//     transshipment, so we never even classify it as DISC/LOAD).
//   - full_in  = full container gated in at the port of lading → GTIN.
//   - full_out = full container picked up at destination → GTOT (stage 9,
//     never auto-releasable; also closes the tracking cycle).
//   - NOT mapped (skipped, documented): empty_out, empty_in, vessel_berthed,
//     available, not_available, delivered (self-reported), rail_*, feeder_*,
//     arrived_at_inland_destination — none maps confidently onto a
//     release-relevant DCSA milestone, so we skip rather than guess.
//   - Terminal49 has no container-stuffing (STUF) or B/L-issued (ISSU)
//     events; milestones triggered by those codes cannot fire from this
//     provider.
export const TERMINAL49_EVENT_MAP: Record<string, string> = {
  vessel_loaded: 'LOAD',
  vessel_departed: 'DEPA',
  vessel_arrived: 'ARRI',
  vessel_discharged: 'DISC',
  full_in: 'GTIN',
  full_out: 'GTOT',
  transshipment_arrived: 'TSARR',
  transshipment_discharged: 'TSDIS',
  transshipment_loaded: 'TSLOA',
  transshipment_departed: 'TSDEP',
};

// ─── Webhook verification ─────────────────────────────────────────────────────

/**
 * Verifies X-T49-Webhook-Signature: HMAC-SHA256 hex digest of the raw body,
 * keyed with the webhook secret Terminal49 generated at webhook creation.
 * Fails safe: no configured secret or no header → reject.
 */
export function verifyTerminal49Signature(
  rawBody: string,
  signatureHeader: string | null
): boolean {
  const secret = process.env.TERMINAL49_WEBHOOK_SECRET;
  if (!secret || !signatureHeader) return false;
  const expected = createHmac('sha256', secret).update(rawBody).digest('hex');
  const provided = Buffer.from(signatureHeader.trim());
  const wanted = Buffer.from(expected);
  return provided.length === wanted.length && timingSafeEqual(provided, wanted);
}

// ─── Webhook parsing ──────────────────────────────────────────────────────────

interface T49Resource {
  id?: string;
  type?: string;
  attributes?: Record<string, unknown>;
  relationships?: Record<string, { data?: { id?: string; type?: string } | null }>;
}

export interface ParsedTerminal49Webhook {
  /** tracking_subscriptions.provider_reference_id (the Terminal49 tracking_request id), when derivable. */
  referenceId: string | null;
  /** Our tracking_subscriptions.id recovered from the ot-sub: ref_number round-trip, when present. */
  subscriptionId: string | null;
  events: NormalizedShippingEvent[];
  /** Lifecycle side effect: tracking_request.failed → 'error', tracking_request.tracking_stopped → 'cancelled'. */
  subscriptionStatus?: 'error' | 'cancelled';
}

function stripEventPrefix(name: string): { key: string; estimated: boolean } {
  let key = name;
  if (key.startsWith('container.transport.')) key = key.slice('container.transport.'.length);
  let estimated = false;
  if (key.startsWith('estimated.')) {
    estimated = true;
    key = key.slice('estimated.'.length);
  }
  return { key, estimated };
}

function findIncluded(included: T49Resource[], type: string, id?: string): T49Resource | undefined {
  return included.find((r) => r.type === type && (id === undefined || r.id === id));
}

function extractSubscriptionId(shipment: T49Resource | undefined): string | null {
  if (!shipment) return null;
  const attrs = shipment.attributes ?? {};
  const candidates = [
    ...(Array.isArray(attrs.ref_numbers) ? attrs.ref_numbers : []),
    ...(Array.isArray(attrs.tags) ? attrs.tags : []),
  ];
  for (const c of candidates) {
    if (typeof c === 'string' && c.startsWith(T49_SUBSCRIPTION_REF_PREFIX)) {
      const id = c.slice(T49_SUBSCRIPTION_REF_PREFIX.length);
      if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) return id;
    }
  }
  return null;
}

/**
 * Parses a Terminal49 webhook_notification body into normalized events.
 * Throws on structurally invalid payloads (route returns 400 → Terminal49
 * retries). Unknown/irrelevant notification types parse to zero events.
 */
export function parseTerminal49Webhook(rawBody: string): ParsedTerminal49Webhook {
  const body = JSON.parse(rawBody) as {
    data?: T49Resource;
    included?: T49Resource[];
  };
  const notification = body.data;
  if (!notification || notification.type !== 'webhook_notification') {
    throw new Error('terminal49: not a webhook_notification payload');
  }

  const eventName = String(notification.attributes?.event ?? '');
  const included = Array.isArray(body.included) ? body.included : [];
  const referenceObject = notification.relationships?.reference_object?.data ?? null;

  // Tracking-request lifecycle notifications: no shipping events, but they
  // carry the tracking_request id directly and may close the subscription.
  if (eventName.startsWith('tracking_request.')) {
    const trackingRequestId =
      (referenceObject?.type === 'tracking_request' ? referenceObject.id : undefined) ??
      findIncluded(included, 'tracking_request')?.id ??
      null;
    const subscriptionStatus =
      eventName === 'tracking_request.failed'
        ? ('error' as const)
        : eventName === 'tracking_request.tracking_stopped'
          ? ('cancelled' as const)
          : undefined;
    return {
      referenceId: trackingRequestId,
      subscriptionId: extractSubscriptionId(findIncluded(included, 'shipment')),
      events: [],
      ...(subscriptionStatus ? { subscriptionStatus } : {}),
    };
  }

  // Transport-event notifications. The reference_object is a transport_event;
  // included[] carries transport_event / shipment / container / vessel /
  // location — but NO tracking_request id, so subscription resolution rides
  // on the ot-sub: ref_number round-trip.
  const shipment = findIncluded(included, 'shipment');
  const subscriptionId = extractSubscriptionId(shipment);
  const trackingRequestId = findIncluded(included, 'tracking_request')?.id ?? null;

  const transportEvents = included.filter((r) => r.type === 'transport_event');
  const events: NormalizedShippingEvent[] = [];

  for (const te of transportEvents) {
    const attrs = te.attributes ?? {};
    const rawName = String(attrs.event ?? eventName);
    const { key, estimated } = stripEventPrefix(rawName);
    const mapped = TERMINAL49_EVENT_MAP[key];
    if (!mapped) continue; // documented skip — never guess a milestone code

    const timestamp = typeof attrs.timestamp === 'string' ? attrs.timestamp : null;
    if (!timestamp || !te.id) continue; // no actual time or no idempotency key → unusable

    // Resolve related resources by id only — Terminal49 uses varying type
    // names for locations ('location' / 'port'), and ids are unique per payload.
    const vesselId = te.relationships?.vessel?.data?.id;
    const vessel = vesselId ? included.find((r) => r.id === vesselId) : undefined;
    const locationId = te.relationships?.location?.data?.id;
    const location = locationId ? included.find((r) => r.id === locationId) : undefined;

    events.push({
      providerEventId: te.id,
      eventCode: mapped,
      // Terminal49 transport events are actuals; 'estimated.' variants are
      // estimates and can never release (engine skips non-ACT).
      classifier: estimated ? 'EST' : 'ACT',
      eventTime: timestamp,
      locationLocode:
        typeof attrs.location_locode === 'string' ? attrs.location_locode : undefined,
      locationName:
        typeof location?.attributes?.name === 'string'
          ? (location.attributes.name as string)
          : undefined,
      vesselName:
        typeof vessel?.attributes?.name === 'string'
          ? (vessel.attributes.name as string)
          : undefined,
      voyageNumber:
        typeof attrs.voyage_number === 'string' ? attrs.voyage_number : undefined,
      raw: te,
    });
  }

  return { referenceId: trackingRequestId, subscriptionId, events };
}

// ─── Tracking-request creation (subscribe side) ───────────────────────────────

export interface Terminal49SubscribeParams {
  shipmentId: string;
  orgId: string;
  /** auth.users id the subscription (and any later opt-in releases) is attributed to. */
  actorId: string | null;
  actorEmail?: string | null;
  containerNumber: string | null;
  billOfLadingNumber?: string | null;
  carrierScac?: string | null;
}

export interface Terminal49SubscribeResult {
  subscribed: boolean;
  reason: string;
  trackingRequestId?: string;
  subscriptionId?: string;
}

/**
 * Creates a Terminal49 tracking request for a shipment and records the
 * tracking_subscriptions row (provider_reference_id = Terminal49's
 * tracking_request id; auto_release_enabled = false, always).
 *
 * NEVER throws — every failure path logs and returns { subscribed: false }.
 * Callers fire-and-forget this after a stage transition succeeds.
 */
export async function subscribeShipmentToTerminal49(
  params: Terminal49SubscribeParams
): Promise<Terminal49SubscribeResult> {
  try {
    const apiKey = process.env.TERMINAL49_API_KEY;
    if (!apiKey) {
      console.log(
        `[terminal49] TERMINAL49_API_KEY not set — skipping tracking request for shipment ${params.shipmentId}`
      );
      return { subscribed: false, reason: 'api_key_unset' };
    }

    const requestNumber = params.billOfLadingNumber ?? params.containerNumber;
    const requestType = params.billOfLadingNumber ? 'bill_of_lading' : 'container';
    if (!requestNumber) {
      return { subscribed: false, reason: 'no_tracking_number' };
    }

    const supabase = createAdminClient();

    // Idempotency: one live Terminal49 subscription per shipment.
    const { data: existing } = await supabase
      .from('tracking_subscriptions')
      .select('id')
      .eq('shipment_id', params.shipmentId)
      .eq('provider', TERMINAL49_PROVIDER)
      .in('status', ['active', 'completed'])
      .limit(1);
    if (existing && existing.length > 0) {
      return { subscribed: false, reason: 'already_subscribed', subscriptionId: existing[0].id };
    }

    // Pre-generate the subscription id so it can ride along as a Terminal49
    // ref_number and come back on transport-event webhooks (which carry no
    // tracking_request id).
    const subscriptionId = randomUUID();

    const response = await fetch(`${TERMINAL49_API_BASE}/tracking_requests`, {
      method: 'POST',
      headers: {
        Authorization: `Token ${apiKey}`,
        'Content-Type': 'application/vnd.api+json',
      },
      body: JSON.stringify({
        data: {
          type: 'tracking_request',
          attributes: {
            request_type: requestType,
            request_number: requestNumber,
            ...(params.carrierScac
              ? { scac: params.carrierScac }
              : { auto_detect_vocc_scac: true }),
            ref_numbers: [`${T49_SUBSCRIPTION_REF_PREFIX}${subscriptionId}`],
          },
        },
      }),
    });

    if (!response.ok) {
      const text = await response.text().catch(() => '');
      console.error(
        `[terminal49] tracking request failed for shipment ${params.shipmentId}: HTTP ${response.status} ${text.slice(0, 300)}`
      );
      return { subscribed: false, reason: `api_http_${response.status}` };
    }

    const json = (await response.json().catch(() => null)) as { data?: { id?: string } } | null;
    const trackingRequestId = json?.data?.id;
    if (!trackingRequestId) {
      console.error(
        `[terminal49] tracking request for shipment ${params.shipmentId} returned no id`
      );
      return { subscribed: false, reason: 'no_tracking_request_id' };
    }

    const { error: insertError } = await supabase.from('tracking_subscriptions').insert({
      id: subscriptionId,
      org_id: params.orgId,
      shipment_id: params.shipmentId,
      provider: TERMINAL49_PROVIDER,
      provider_reference_id: trackingRequestId,
      container_number: params.containerNumber,
      bill_of_lading_number: params.billOfLadingNumber ?? null,
      carrier_scac: params.carrierScac ?? null,
      // Visibility only. Escrow automation opt-in is a separate explicit
      // human action (POST /api/shipments/[id]/tracking) — never here.
      auto_release_enabled: false,
      created_by: params.actorId,
    });
    if (insertError) {
      console.error(
        `[terminal49] tracking_subscriptions insert failed for shipment ${params.shipmentId}: ${insertError.message}`
      );
      return { subscribed: false, reason: 'subscription_insert_failed', trackingRequestId };
    }

    if (params.actorId) {
      await logAuditEvent({
        orgId: params.orgId,
        actorId: params.actorId,
        actorEmail: params.actorEmail ?? undefined,
        action: 'shipment.tracking_subscribed',
        resourceType: 'tracking_subscription',
        resourceId: subscriptionId,
        metadata: {
          shipmentId: params.shipmentId,
          provider: TERMINAL49_PROVIDER,
          trackingRequestId,
          requestType,
          autoReleaseEnabled: false,
          source: 'auto:stage_6_advance',
        },
      }).catch((err) => console.error('[terminal49] audit log failed:', err));
    }

    return { subscribed: true, reason: 'created', trackingRequestId, subscriptionId };
  } catch (err) {
    console.error(
      `[terminal49] subscribe failed (non-blocking) for shipment ${params.shipmentId}:`,
      err
    );
    return { subscribed: false, reason: 'unexpected_error' };
  }
}
