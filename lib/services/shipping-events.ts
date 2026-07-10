/**
 * OriginTrace — shipping-event ingestion + escrow auto-release trigger engine.
 *
 * Provider-agnostic foundation (see docs/ESCROW-SHIPPING-APIS.md): webhook
 * routes normalize provider payloads into NormalizedShippingEvent and hand
 * them to ingestShippingEvent(); the trigger engine decides whether an event
 * releases an escrow milestone via releaseMilestone() in lib/services/escrow.ts
 * (money code — reused, never modified here).
 *
 * Safety model:
 *   - Events match a tracking_subscription by (provider, provider_reference_id),
 *     never by bare container number (container numbers are reused every voyage).
 *   - Only ACT (actual) events can release; EST/PLN never do.
 *   - Only pipeline stages 6–8 are auto-releasable. The final tranche (stage 9,
 *     delivery) always goes through the existing dual-confirmation dispute gate.
 *   - A settlement delay (default 24h) lets carriers issue corrections before
 *     money moves; deferred events are re-run by the cron sweep.
 *   - Any open dispute or non-active escrow freezes automation.
 *   - Releases are attributed to the user who created the subscription
 *     (escrow_transactions.actor_id is an auth.users FK — no system user).
 */

import { createAdminClient } from '@/lib/supabase/admin';
import { logAuditEvent } from '@/lib/audit';
import { getEscrowStatus, releaseMilestone, EscrowConcurrencyError } from '@/lib/services/escrow';
import type { EscrowMilestone, EscrowStatusResult } from '@/lib/types/escrow';
import type { Database } from '@/lib/supabase/database.types';

export type TrackingSubscription =
  Database['public']['Tables']['tracking_subscriptions']['Row'];
export type ShippingEvent = Database['public']['Tables']['shipping_events']['Row'];

// ─── Event vocabulary (DCSA-style) ───────────────────────────────────────────

export const SHIPPING_EVENT_CODES = [
  'GTIN', // gate-in at origin terminal
  'STUF', // container stuffed
  'LOAD', // loaded on board
  'ISSU', // bill of lading issued
  'DEPA', // vessel departed
  'ARRI', // vessel arrived
  'DISC', // discharged at destination
  'GTOT', // gate-out at destination terminal
  'STRP', // container stripped
] as const;
export type ShippingEventCode = (typeof SHIPPING_EVENT_CODES)[number];

/** Event code → 9-stage shipment pipeline stage (lib/services/shipment-stages.ts). */
export const EVENT_STAGE_MAP: Record<ShippingEventCode, number> = {
  GTIN: 6,
  STUF: 6,
  LOAD: 7,
  ISSU: 7,
  DEPA: 7,
  ARRI: 8,
  DISC: 8,
  GTOT: 9,
  STRP: 9,
};

/**
 * Stages where a carrier-confirmed event may release the matching escrow
 * milestone. Stage 9 (delivery) is deliberately absent — the final tranche
 * stays on the manual dual-confirmation gate.
 */
export const AUTO_RELEASE_STAGES: ReadonlySet<number> = new Set([6, 7, 8]);

// ─── Milestone stage normalization ────────────────────────────────────────────
// EscrowMilestone.stage is string | number in the wild: app/api/escrow uses the
// numeric pipeline stage (1–9); payment-setup writes free-text labels like
// 'on_delivery'. Normalize both so the engine can match either.

const STAGE_LABELS: Record<string, number> = {
  gate_in: 6,
  container_stuffing: 6,
  stuffing: 6,
  on_board: 7,
  on_shipment: 7,
  shipped: 7,
  departure: 7,
  on_departure: 7,
  arrival: 8,
  on_arrival: 8,
  discharge: 8,
  on_discharge: 8,
  delivery: 9,
  delivered: 9,
  on_delivery: 9,
};

export function normalizeMilestoneStage(stage: string | number): number | null {
  if (typeof stage === 'number') {
    return Number.isInteger(stage) && stage >= 1 && stage <= 9 ? stage : null;
  }
  const trimmed = stage.trim().toLowerCase();
  if (/^[1-9]$/.test(trimmed)) return Number(trimmed);
  return STAGE_LABELS[trimmed] ?? null;
}

// ─── Port-of-discharge verification (DISC anti-fraud gate) ───────────────────
// A DISC event at a transshipment port must be tracked, never released on —
// transshipment is where container/vessel substitution and event noise
// concentrate (docs/ESCROW-SHIPPING-APIS.md §D). shipments.port_of_discharge
// is free text in this app (e.g. "Hamburg" — see the shipment pipeline UI and
// seed data), while event locations arrive as UN/LOCODEs and/or names, so we
// only release when we can build a CONFIDENT match; anything else fails
// closed ('pod_mismatch' / 'pod_unverified'), never fuzzy-matches.

export type PodMatchResult = 'match' | 'mismatch' | 'unverified';

/** Lowercase, strip diacritics, drop everything non-alphanumeric. */
function normalizePortName(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/^port\s+of\s+/, '')
    .replace(/[^a-z0-9]/g, '');
}

const LOCODE_RE = /^[A-Za-z]{2}[A-Za-z0-9]{3}$/;

/**
 * Confident-match rules (documented, no guessing):
 *  1. If port_of_discharge looks like a UN/LOCODE (5 chars) and the event has
 *     a LOCODE: case-insensitive exact equality is a match.
 *  2. If the event carries a location name: exact equality after
 *     normalization (lowercase, diacritics stripped, punctuation removed,
 *     leading "Port of " dropped, and for the shipment value only the segment
 *     before the first comma — "Rotterdam, NL" → "rotterdam"). No substring
 *     or fuzzy matching.
 * If neither rule can produce a match but comparable data existed → mismatch.
 * If the shipment has no POD recorded, or the event has no location → unverified.
 */
export function verifyDischargePortMatch(
  shipmentPortOfDischarge: string | null,
  eventLocode: string | null,
  eventLocationName: string | null
): PodMatchResult {
  const pod = shipmentPortOfDischarge?.trim();
  if (!pod) return 'unverified';

  const locode = eventLocode?.trim();
  const name = eventLocationName?.trim();
  if (!locode && !name) return 'unverified';

  if (locode && LOCODE_RE.test(pod) && pod.toUpperCase() === locode.toUpperCase()) {
    return 'match';
  }

  if (name) {
    const podFirstSegment = pod.split(',')[0] ?? pod;
    if (
      normalizePortName(podFirstSegment) !== '' &&
      normalizePortName(podFirstSegment) === normalizePortName(name)
    ) {
      return 'match';
    }
  }

  // Comparable data existed but nothing matched confidently. If the POD is
  // free text and the event only has a LOCODE, we cannot verify (different
  // formats, no normalization table) — fail closed as 'unverified' rather
  // than calling it a definite mismatch.
  if (!LOCODE_RE.test(pod) && !name) return 'unverified';
  return 'mismatch';
}

// ─── Settlement delay ─────────────────────────────────────────────────────────

const DEFAULT_SETTLEMENT_DELAY_HOURS = 24;

export function settlementDelayHours(): number {
  const raw = process.env.TRACKING_SETTLEMENT_DELAY_HOURS;
  const parsed = raw ? Number(raw) : NaN;
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : DEFAULT_SETTLEMENT_DELAY_HOURS;
}

// ─── Pure decision engine ─────────────────────────────────────────────────────

export interface ReleaseDecisionInput {
  eventCode: string;
  classifier: string;
  eventTime: Date;
  now: Date;
  autoReleaseEnabled: boolean;
  /** tracking_subscriptions.created_by — the auth.users id releases are attributed to */
  actorId: string | null;
  escrowStatus: EscrowStatusResult | null;
  settlementHours: number;
  /** Event location (shipping_events.location_locode / location_name). Used by the DISC POD gate. */
  eventLocationLocode?: string | null;
  eventLocationName?: string | null;
  /** shipments.port_of_discharge (free text). Required to release on a DISC event. */
  shipmentPortOfDischarge?: string | null;
}

export type ReleaseDecision =
  | { action: 'release'; milestoneId: string; stage: number; reason: string }
  | { action: 'defer'; stage: number; reason: string }
  | { action: 'skip'; reason: string };

export function decideEventAction(input: ReleaseDecisionInput): ReleaseDecision {
  if (input.classifier !== 'ACT') {
    return { action: 'skip', reason: `not_actual:${input.classifier}` };
  }

  const stage = EVENT_STAGE_MAP[input.eventCode as ShippingEventCode];
  if (!stage) return { action: 'skip', reason: `unmapped_event:${input.eventCode}` };

  if (!input.autoReleaseEnabled) return { action: 'skip', reason: 'auto_release_disabled' };
  if (!input.actorId) return { action: 'skip', reason: 'no_actor' };

  if (!AUTO_RELEASE_STAGES.has(stage)) {
    // Delivery-side events never auto-release — dual confirmation only.
    return { action: 'skip', reason: `stage_not_auto_releasable:${stage}` };
  }

  const escrow = input.escrowStatus?.escrow;
  if (!escrow) return { action: 'skip', reason: 'no_escrow' };
  if (input.escrowStatus?.hasOpenDispute) return { action: 'skip', reason: 'dispute_hold' };
  if (escrow.status !== 'active') return { action: 'skip', reason: `escrow_${escrow.status}` };

  // DISC anti-fraud gate: a discharge at a transshipment port must never
  // release the arrival tranche. Only release a DISC event when its location
  // confidently matches the shipment's recorded port of discharge; fail
  // closed otherwise (docs/ESCROW-SHIPPING-APIS.md §D).
  if (input.eventCode === 'DISC') {
    const podMatch = verifyDischargePortMatch(
      input.shipmentPortOfDischarge ?? null,
      input.eventLocationLocode ?? null,
      input.eventLocationName ?? null
    );
    if (podMatch !== 'match') {
      return {
        action: 'skip',
        reason: podMatch === 'mismatch' ? 'pod_mismatch' : 'pod_unverified',
      };
    }
  }

  const milestones: EscrowMilestone[] = escrow.milestone_config ?? [];
  const eventCode = input.eventCode.toUpperCase();
  const milestone = milestones.find((m) => {
    if (m.released_at) return false;
    if (normalizeMilestoneStage(m.stage) !== stage) return false;
    // Event-specific matching: a milestone tagged with trigger_event_code(s)
    // only matches those exact codes (LOAD/ISSU/DEPA all collapse onto stage
    // 7, so stage-only matching could release the "vessel departed" tranche
    // off a LOAD event). Untagged milestones keep the legacy stage-only
    // behavior for existing milestone_config JSONB.
    if (m.trigger_event_code !== undefined && m.trigger_event_code !== null) {
      const codes = Array.isArray(m.trigger_event_code)
        ? m.trigger_event_code
        : [m.trigger_event_code];
      return codes.some((c) => c.toUpperCase() === eventCode);
    }
    return true;
  });
  if (!milestone) return { action: 'skip', reason: `no_matching_milestone:stage_${stage}` };

  const settledAt = input.eventTime.getTime() + input.settlementHours * 3_600_000;
  if (input.now.getTime() < settledAt) {
    // Carriers issue corrections; wait out the settlement window. The cron
    // sweep re-processes deferred events.
    return { action: 'defer', stage, reason: 'settlement_delay' };
  }

  return {
    action: 'release',
    milestoneId: milestone.milestone_id,
    stage,
    reason: `event_${input.eventCode.toLowerCase()}_stage_${stage}`,
  };
}

// ─── Ingestion ────────────────────────────────────────────────────────────────

export interface NormalizedShippingEvent {
  providerEventId: string;
  eventCode: string;
  classifier?: 'ACT' | 'EST' | 'PLN';
  eventTime: string; // ISO timestamp
  locationLocode?: string;
  locationName?: string;
  vesselName?: string;
  voyageNumber?: string;
  raw?: unknown;
}

export type IngestResult =
  | { status: 'no_subscription' }
  | { status: 'subscription_inactive'; subscription: TrackingSubscription }
  | { status: 'duplicate'; subscription: TrackingSubscription }
  | { status: 'stored'; event: ShippingEvent; subscription: TrackingSubscription };

/**
 * Stores a normalized event against its tracking subscription. Idempotent:
 * the (provider, provider_event_id) unique constraint absorbs webhook retries.
 */
export async function ingestShippingEvent(
  provider: string,
  providerReferenceId: string,
  ev: NormalizedShippingEvent
): Promise<IngestResult> {
  const supabase = createAdminClient();

  const { data: subscription } = await supabase
    .from('tracking_subscriptions')
    .select('*')
    .eq('provider', provider)
    .eq('provider_reference_id', providerReferenceId)
    .single();

  if (!subscription) {
    return { status: 'no_subscription' };
  }
  // Allow-list, not deny-list: only an 'active' subscription ingests events.
  // Late/out-of-order events arriving after the cycle closed ('completed'),
  // errored ('error'), or was cancelled are rejected — a closed subscription
  // must never feed the release engine.
  if (subscription.status !== 'active') {
    return { status: 'subscription_inactive', subscription };
  }

  const { data: inserted, error } = await supabase
    .from('shipping_events')
    .upsert(
      {
        org_id: subscription.org_id,
        shipment_id: subscription.shipment_id,
        subscription_id: subscription.id,
        provider,
        provider_event_id: ev.providerEventId,
        event_code: ev.eventCode.toUpperCase(),
        classifier: ev.classifier ?? 'ACT',
        location_locode: ev.locationLocode ?? null,
        location_name: ev.locationName ?? null,
        vessel_name: ev.vesselName ?? null,
        voyage_number: ev.voyageNumber ?? null,
        event_time: ev.eventTime,
        raw: (ev.raw ?? null) as ShippingEvent['raw'],
      },
      { onConflict: 'provider,provider_event_id', ignoreDuplicates: true }
    )
    .select()
    .maybeSingle();

  if (error) throw new Error(`shipping_events insert failed: ${error.message}`);
  if (!inserted) return { status: 'duplicate', subscription };

  return { status: 'stored', event: inserted, subscription };
}

// ─── Processing (side-effect layer around the pure decision) ─────────────────

/**
 * Runs the trigger engine for one stored event. Writes process_outcome, and on
 * a 'defer' leaves processed_at NULL so the cron sweep retries later. Returns
 * the outcome string.
 */
export async function processShippingEvent(
  event: ShippingEvent,
  subscription: TrackingSubscription
): Promise<string> {
  const supabase = createAdminClient();
  const now = new Date();

  // Keep the shipment's actual dates in sync with carrier-confirmed events,
  // independent of escrow (feeds the stage-7/8 gates in shipment-stages.ts).
  if (event.classifier === 'ACT') {
    await syncShipmentActualDates(event);
  }

  const escrowStatus = await getEscrowStatus(event.shipment_id).catch(() => null);

  // The DISC POD gate needs the shipment's recorded port of discharge.
  let shipmentPortOfDischarge: string | null = null;
  if (event.event_code === 'DISC') {
    const { data: shp } = await supabase
      .from('shipments')
      .select('port_of_discharge')
      .eq('id', event.shipment_id)
      .single();
    shipmentPortOfDischarge = shp?.port_of_discharge ?? null;
  }

  const decision = decideEventAction({
    eventCode: event.event_code,
    classifier: event.classifier,
    eventTime: new Date(event.event_time),
    now,
    autoReleaseEnabled: subscription.auto_release_enabled,
    actorId: subscription.created_by,
    escrowStatus,
    settlementHours: settlementDelayHours(),
    eventLocationLocode: event.location_locode,
    eventLocationName: event.location_name,
    shipmentPortOfDischarge,
  });

  let outcome: string;

  if (decision.action === 'defer') {
    outcome = 'deferred';
    await supabase
      .from('shipping_events')
      .update({ process_outcome: outcome })
      .eq('id', event.id);
    return outcome;
  }

  if (decision.action === 'release') {
    try {
      await releaseMilestone({
        escrowId: escrowStatus!.escrow!.id,
        milestoneId: decision.milestoneId,
        actorId: subscription.created_by!,
        orgId: subscription.org_id,
      });
      outcome = `released:${decision.milestoneId}`;

      await logAuditEvent({
        orgId: subscription.org_id,
        actorId: subscription.created_by!,
        action: 'escrow.auto_release_triggered',
        resourceType: 'shipping_event',
        resourceId: event.id,
        metadata: {
          escrowId: escrowStatus!.escrow!.id,
          milestoneId: decision.milestoneId,
          eventCode: event.event_code,
          provider: event.provider,
          providerEventId: event.provider_event_id,
          stage: decision.stage,
        },
      });
    } catch (err) {
      if (err instanceof EscrowConcurrencyError) {
        // A concurrent writer beat us to the escrow row (e.g. two stage-7
        // events racing, or a webhook retry racing the cron sweep). Nothing
        // was written by our attempt — this is retryable, not a failure.
        // Leave processed_at NULL (same as the 'defer' path) so the cron
        // sweep re-runs the event against fresh escrow state; if the racing
        // writer already released this milestone, the retry lands on
        // 'no_matching_milestone' and is marked processed then.
        outcome = 'release_conflict_retry';
        await supabase
          .from('shipping_events')
          .update({ process_outcome: outcome })
          .eq('id', event.id);
        return outcome;
      }
      outcome = `error:${err instanceof Error ? err.message : 'release_failed'}`.slice(0, 200);
    }
  } else {
    outcome = `skipped:${decision.reason}`;
  }

  await supabase
    .from('shipping_events')
    .update({ processed_at: now.toISOString(), process_outcome: outcome })
    .eq('id', event.id);

  // Destination gate-out / strip closes the tracking cycle.
  if (
    event.classifier === 'ACT' &&
    (event.event_code === 'GTOT' || event.event_code === 'STRP') &&
    subscription.status === 'active'
  ) {
    await supabase
      .from('tracking_subscriptions')
      .update({ status: 'completed', updated_at: now.toISOString() })
      .eq('id', subscription.id);
  }

  return outcome;
}

async function syncShipmentActualDates(event: ShippingEvent): Promise<void> {
  const supabase = createAdminClient();
  const field =
    event.event_code === 'DEPA' || event.event_code === 'LOAD'
      ? 'actual_departure_date'
      : event.event_code === 'ARRI' || event.event_code === 'DISC'
        ? 'actual_arrival_date'
        : null;
  if (!field) return;

  const { data: shipment } = await supabase
    .from('shipments')
    .select('id, actual_departure_date, actual_arrival_date')
    .eq('id', event.shipment_id)
    .single();
  if (!shipment || shipment[field]) return; // never overwrite an existing actual

  await supabase
    .from('shipments')
    .update({ [field]: event.event_time })
    .eq('id', event.shipment_id);
}

/**
 * Cron sweep: re-process events that are still pending (deferred inside the
 * settlement window, or whose webhook-time processing crashed).
 */
export async function processPendingEvents(
  limit = 100
): Promise<{ processed: number; released: number; deferred: number }> {
  const supabase = createAdminClient();

  const { data: pending } = await supabase
    .from('shipping_events')
    .select('*')
    .is('processed_at', null)
    .order('created_at', { ascending: true })
    .limit(limit);

  let processed = 0;
  let released = 0;
  let deferred = 0;

  for (const event of pending ?? []) {
    const { data: subscription } = await supabase
      .from('tracking_subscriptions')
      .select('*')
      .eq('id', event.subscription_id)
      .single();
    if (!subscription) continue;

    const outcome = await processShippingEvent(event, subscription);
    processed += 1;
    if (outcome.startsWith('released:')) released += 1;
    if (outcome === 'deferred') deferred += 1;
  }

  return { processed, released, deferred };
}
