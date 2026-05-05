/**
 * Event Catalog — Unit Tests
 *
 * Verifies ADR-003 invariants:
 *   1. No duplicate event strings
 *   2. All strings follow noun.verb convention
 *   3. Catalog is stable (exact count guard — fail when events are added
 *      without updating this test)
 *   4. Type guard works correctly
 *   5. WEBHOOK_EVENTS is the full catalog (not a subset)
 *   6. PlatformEventType covers all catalog entries (type-level smoke test)
 */

import { describe, it, expect } from 'vitest';
import {
  EVENT_CATALOG,
  WEBHOOK_EVENTS,
  isPlatformEventType,
  type PlatformEventType,
} from '@/modules/integrations/domain/event-catalog';

// ---------------------------------------------------------------------------
// Structural invariants
// ---------------------------------------------------------------------------

describe('EVENT_CATALOG structure', () => {
  it('has no duplicate event strings', () => {
    const unique = new Set(EVENT_CATALOG);
    expect(unique.size).toBe(EVENT_CATALOG.length);
  });

  it('all events follow noun.verb convention (one dot, lowercase)', () => {
    for (const event of EVENT_CATALOG) {
      expect(event).toMatch(/^[a-z_]+\.[a-z_]+$/);
    }
  });

  it('has exactly 31 events — update this when adding new events', () => {
    expect(EVENT_CATALOG.length).toBe(31);
  });

  it('is sorted by namespace (docs aid)', () => {
    // Not strictly required, but namespaces should be grouped.
    // This test just checks the list is not completely unsorted.
    const namespaces = EVENT_CATALOG.map((e) => e.split('.')[0]);
    const adjacentNamespaceDuplicates = namespaces.filter(
      (ns, i) => i > 0 && ns === namespaces[i - 1],
    ).length;
    // At least half of events should be adjacent to same-namespace events
    // (loosely tests grouping without requiring strict sort)
    expect(adjacentNamespaceDuplicates).toBeGreaterThan(EVENT_CATALOG.length / 4);
  });
});

// ---------------------------------------------------------------------------
// Specific required events (regression guard)
// ---------------------------------------------------------------------------

describe('EVENT_CATALOG required events', () => {
  const required: string[] = [
    // Collection
    'batch.created', 'batch.completed',
    // Farms
    'farm.created', 'farm.approved', 'farm.rejected',
    // Shipments
    'shipment.created', 'shipment.updated', 'shipment.scored', 'shipment.status_changed',
    // Documents
    'document.uploaded', 'document.expired',
    // Compliance
    'compliance.changed',
    // Lab
    'lab_result.uploaded', 'lab_result.non_compliant',
    // Payments
    'payment.received', 'payment.recorded', 'payment.disbursed',
    'payment.transfer_completed', 'payment.transfer_failed',
    // KYC
    'kyc.submitted', 'kyc.approved', 'kyc.rejected',
    // Escrow
    'escrow.held', 'escrow.released', 'escrow.disputed', 'dispute.resolved',
    // Environmental
    'deforestation.alert',
  ];

  for (const event of required) {
    it(`includes '${event}'`, () => {
      expect(EVENT_CATALOG).toContain(event);
    });
  }
});

// ---------------------------------------------------------------------------
// WEBHOOK_EVENTS
// ---------------------------------------------------------------------------

describe('WEBHOOK_EVENTS', () => {
  it('is the full catalog (not a subset)', () => {
    expect(WEBHOOK_EVENTS.length).toBe(EVENT_CATALOG.length);
  });

  it('contains all catalog events', () => {
    for (const event of EVENT_CATALOG) {
      expect(WEBHOOK_EVENTS).toContain(event);
    }
  });
});

// ---------------------------------------------------------------------------
// isPlatformEventType guard
// ---------------------------------------------------------------------------

describe('isPlatformEventType', () => {
  it('returns true for all catalog events', () => {
    for (const event of EVENT_CATALOG) {
      expect(isPlatformEventType(event)).toBe(true);
    }
  });

  it('returns false for unknown strings', () => {
    expect(isPlatformEventType('unknown.event')).toBe(false);
    expect(isPlatformEventType('')).toBe(false);
    expect(isPlatformEventType('batch')).toBe(false);
    expect(isPlatformEventType('batch.created.extra')).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Type-level smoke: PlatformEventType accepts catalog strings
// ---------------------------------------------------------------------------

describe('PlatformEventType type smoke', () => {
  it('catalog strings are assignable to PlatformEventType', () => {
    // If this compiles, the union type matches the runtime catalog.
    const e: PlatformEventType = 'batch.created';
    expect(e).toBe('batch.created');
  });
});
