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
import { getEscrowStatus, releaseMilestone } from '@/lib/services/escrow';
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

  const milestones: EscrowMilestone[] = escrow.milestone_config ?? [];
  const milestone = milestones.find(
    (m) => !m.released_at && normalizeMilestoneStage(m.stage) === stage
  );
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

  if (!subscription || subscription.status === 'cancelled') {
    return { status: 'no_subscription' };
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

  const decision = decideEventAction({
    eventCode: event.event_code,
    classifier: event.classifier,
    eventTime: new Date(event.event_time),
    now,
    autoReleaseEnabled: subscription.auto_release_enabled,
    actorId: subscription.created_by,
    escrowStatus,
    settlementHours: settlementDelayHours(),
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
