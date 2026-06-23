/**
 * modules/integrations/domain/event-catalog.ts
 *
 * Single source of truth for all platform event strings (ADR-003).
 *
 * Rules:
 *  - Every event string used anywhere in OriginTrace must appear here.
 *  - New events require a catalog entry before use.
 *  - Events follow the `noun.verb` convention.
 *  - lib/webhooks.ts and lib/integrations/dispatcher.ts both import from here.
 *
 * This file is pure TypeScript — zero external dependencies (ADR-001 domain rules).
 */

// ---------------------------------------------------------------------------
// Catalog
// ---------------------------------------------------------------------------

export const EVENT_CATALOG = [
  // ── Collection ────────────────────────────────────────────────────────────
  'batch.created',
  'batch.completed',

  // ── Farms ─────────────────────────────────────────────────────────────────
  'farm.created',
  'farm.approved',
  'farm.rejected',

  // ── Shipments ─────────────────────────────────────────────────────────────
  'shipment.created',
  'shipment.updated',
  'shipment.scored',
  'shipment.status_changed',

  // ── Documents ─────────────────────────────────────────────────────────────
  'document.uploaded',
  'document.expired',

  // ── Compliance ────────────────────────────────────────────────────────────
  'compliance.changed',

  // ── Lab Results ───────────────────────────────────────────────────────────
  'lab_result.uploaded',
  'lab_result.non_compliant',

  // ── Payments ──────────────────────────────────────────────────────────────
  'payment.received',
  'payment.recorded',
  'payment.disbursed',
  'payment.transfer_completed',
  'payment.transfer_failed',

  // ── Certifications ────────────────────────────────────────────────────────
  'certification.expiring',

  // ── Trade ─────────────────────────────────────────────────────────────────
  'tender.created',
  'tender.awarded',

  // ── Evidence ──────────────────────────────────────────────────────────────
  'evidence_package.created',

  // ── KYC ───────────────────────────────────────────────────────────────────
  'kyc.submitted',
  'kyc.approved',
  'kyc.rejected',

  // ── Escrow ────────────────────────────────────────────────────────────────
  'escrow.held',
  'escrow.released',
  'escrow.disputed',
  'dispute.resolved',

  // ── Environmental ─────────────────────────────────────────────────────────
  'deforestation.alert',
] as const;

// ---------------------------------------------------------------------------
// Derived types
// ---------------------------------------------------------------------------

/** Union of all valid platform event strings. */
export type PlatformEventType = (typeof EVENT_CATALOG)[number];

/**
 * Subset exposed on the webhook subscription UI.
 * Currently the full catalog; filter here if some events should remain internal.
 */
export const WEBHOOK_EVENTS: readonly PlatformEventType[] = EVENT_CATALOG;

/**
 * Subset used by the integration dispatcher.
 * Previously defined inline as `IntegrationEventType` in dispatcher.ts.
 * @deprecated Use PlatformEventType directly — the distinction is removed.
 */
export type IntegrationEventType = PlatformEventType;

// ---------------------------------------------------------------------------
// Guard
// ---------------------------------------------------------------------------

/** Type guard: checks whether an arbitrary string is a known platform event. */
export function isPlatformEventType(value: string): value is PlatformEventType {
  return (EVENT_CATALOG as readonly string[]).includes(value);
}
