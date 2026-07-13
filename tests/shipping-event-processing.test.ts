/**
 * Side-effect-layer tests for lib/services/shipping-events.ts:
 *   - processShippingEvent treats an EscrowConcurrencyError from
 *     releaseMilestone as RETRYABLE (processed_at stays NULL, same as the
 *     'defer' path, so the cron sweep re-runs it), while any other release
 *     failure is terminal ('error:...' + processed_at set).
 *   - ingestShippingEvent only accepts events for 'active' subscriptions
 *     (allow-list — late events after completed/error/cancelled are rejected).
 *
 * The escrow module is partially mocked (getEscrowStatus/releaseMilestone);
 * EscrowConcurrencyError stays the real class so instanceof checks hold.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── Mock infrastructure ──────────────────────────────────────────────────────

const h = vi.hoisted(() => {
  function chainable(result: unknown) {
    const target = () => {};
    const proxy: any = new Proxy(target, {
      get(_t, prop) {
        if (prop === 'then') {
          return (res: (v: unknown) => unknown, rej: (e: unknown) => unknown) =>
            Promise.resolve(result).then(res, rej);
        }
        return () => proxy;
      },
    });
    return proxy;
  }
  const mockFrom = vi.fn();
  return { chainable, mockFrom };
});

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: () => ({ from: h.mockFrom }),
}));

vi.mock('@/lib/audit', () => ({ logAuditEvent: vi.fn(async () => {}) }));
vi.mock('@/lib/webhooks', () => ({ dispatchWebhookEvent: vi.fn() }));

vi.mock('@/lib/services/escrow', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/services/escrow')>();
  return {
    ...actual,
    getEscrowStatus: vi.fn(),
    releaseMilestone: vi.fn(),
  };
});

import {
  getEscrowStatus as mockedGetEscrowStatus,
  releaseMilestone as mockedReleaseMilestone,
  EscrowConcurrencyError,
} from '@/lib/services/escrow';
import { processShippingEvent, ingestShippingEvent } from '@/lib/services/shipping-events';

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const EVENT_ROW = {
  id: 'ev-1',
  org_id: 'org-1',
  shipment_id: 'shp-1',
  subscription_id: 'sub-1',
  provider: 'mock',
  provider_event_id: 'pe-1',
  event_code: 'DEPA',
  classifier: 'ACT',
  location_locode: 'NGAPP',
  location_name: 'Apapa',
  vessel_name: null,
  voyage_number: null,
  event_time: '2026-07-01T00:00:00Z', // far outside the settlement window
  raw: null,
  processed_at: null,
  process_outcome: null,
  created_at: '2026-07-01T01:00:00Z',
} as any;

const SUBSCRIPTION_ROW = {
  id: 'sub-1',
  org_id: 'org-1',
  shipment_id: 'shp-1',
  provider: 'mock',
  provider_reference_id: 'ref-1',
  container_number: null,
  bill_of_lading_number: null,
  carrier_scac: null,
  status: 'active',
  auto_release_enabled: true,
  created_by: 'user-1',
  created_at: '2026-06-01T00:00:00Z',
  updated_at: '2026-06-01T00:00:00Z',
} as any;

function escrowStatusForStage7() {
  return {
    escrow: {
      id: 'esc-1',
      org_id: 'org-1',
      buyer_org_id: null,
      contract_id: null,
      shipment_id: 'shp-1',
      currency: 'USD',
      total_amount: 100_000,
      held_amount: 100_000,
      released_amount: 0,
      status: 'active',
      milestone_config: [{ milestone_id: 'm7', stage: 7, amount: 25_000, description: 'x' }],
      created_by: 'user-1',
      created_at: '2026-07-01T00:00:00Z',
      updated_at: '2026-07-01T00:00:00Z',
    },
    hasOpenDispute: false,
    openDispute: null,
  } as any;
}

function stubShippingEventTables() {
  const shippingEventUpdates: unknown[] = [];
  h.mockFrom.mockImplementation((table: string) => {
    if (table === 'shipments') {
      // syncShipmentActualDates: actual date already set → no write
      return {
        select: () =>
          h.chainable({
            data: {
              id: 'shp-1',
              actual_departure_date: '2026-07-01T00:00:00Z',
              actual_arrival_date: null,
              port_of_discharge: 'Hamburg',
            },
            error: null,
          }),
      };
    }
    if (table === 'shipping_events') {
      return {
        update: (payload: unknown) => {
          shippingEventUpdates.push(payload);
          return h.chainable({ error: null });
        },
      };
    }
    if (table === 'tracking_subscriptions') {
      return { update: () => h.chainable({ error: null }) };
    }
    throw new Error(`unexpected table: ${table}`);
  });
  return { shippingEventUpdates };
}

beforeEach(() => {
  vi.clearAllMocks();
});

// ─── processShippingEvent — conflict is retryable, real failure is terminal ──

describe('processShippingEvent — release failure handling', () => {
  it('leaves a concurrency conflict unprocessed (retryable by the cron sweep)', async () => {
    const { shippingEventUpdates } = stubShippingEventTables();
    vi.mocked(mockedGetEscrowStatus).mockResolvedValue(escrowStatusForStage7());
    vi.mocked(mockedReleaseMilestone).mockRejectedValue(new EscrowConcurrencyError('esc-1'));

    const outcome = await processShippingEvent(EVENT_ROW, SUBSCRIPTION_ROW);

    expect(outcome).toBe('release_conflict_retry');
    expect(shippingEventUpdates).toHaveLength(1);
    // Crucially: process_outcome recorded but processed_at NOT set → the
    // event stays in the cron sweep's pending set.
    expect(shippingEventUpdates[0]).toEqual({ process_outcome: 'release_conflict_retry' });
    expect(shippingEventUpdates[0]).not.toHaveProperty('processed_at');
  });

  it('marks any other release failure as terminal (error outcome + processed_at set)', async () => {
    const { shippingEventUpdates } = stubShippingEventTables();
    vi.mocked(mockedGetEscrowStatus).mockResolvedValue(escrowStatusForStage7());
    vi.mocked(mockedReleaseMilestone).mockRejectedValue(
      new Error('Milestone m7 has already been released')
    );

    const outcome = await processShippingEvent(EVENT_ROW, SUBSCRIPTION_ROW);

    expect(outcome).toMatch(/^error:/);
    expect(shippingEventUpdates).toHaveLength(1);
    expect(shippingEventUpdates[0]).toHaveProperty('processed_at');
    expect(shippingEventUpdates[0]).toMatchObject({ process_outcome: outcome });
  });

  it('still releases and marks processed on the happy path', async () => {
    const { shippingEventUpdates } = stubShippingEventTables();
    vi.mocked(mockedGetEscrowStatus).mockResolvedValue(escrowStatusForStage7());
    vi.mocked(mockedReleaseMilestone).mockResolvedValue(undefined);

    const outcome = await processShippingEvent(EVENT_ROW, SUBSCRIPTION_ROW);

    expect(outcome).toBe('released:m7');
    expect(mockedReleaseMilestone).toHaveBeenCalledWith({
      escrowId: 'esc-1',
      milestoneId: 'm7',
      actorId: 'user-1',
      orgId: 'org-1',
    });
    expect(shippingEventUpdates[0]).toHaveProperty('processed_at');
  });
});

// ─── ingestShippingEvent — allow-list subscription filter ─────────────────────

describe('ingestShippingEvent — subscription status allow-list', () => {
  const NORMALIZED = {
    providerEventId: 'pe-9',
    eventCode: 'DEPA',
    classifier: 'ACT' as const,
    eventTime: '2026-07-01T00:00:00Z',
  };

  function stubSubscriptionLookup(status: string | null) {
    const insertedEvents: unknown[] = [];
    h.mockFrom.mockImplementation((table: string) => {
      if (table === 'tracking_subscriptions') {
        return {
          select: () =>
            h.chainable(
              status === null
                ? { data: null, error: { message: 'not found' } }
                : { data: { ...SUBSCRIPTION_ROW, status }, error: null }
            ),
        };
      }
      if (table === 'shipping_events') {
        return {
          upsert: (row: unknown) => {
            insertedEvents.push(row);
            return h.chainable({ data: { ...EVENT_ROW, id: 'ev-new' }, error: null });
          },
        };
      }
      throw new Error(`unexpected table: ${table}`);
    });
    return { insertedEvents };
  }

  it("rejects events for a 'completed' subscription (late/out-of-order events)", async () => {
    const { insertedEvents } = stubSubscriptionLookup('completed');
    const result = await ingestShippingEvent('mock', 'ref-1', NORMALIZED);
    expect(result.status).toBe('subscription_inactive');
    expect(insertedEvents).toHaveLength(0);
  });

  it("rejects events for an 'error' subscription", async () => {
    const { insertedEvents } = stubSubscriptionLookup('error');
    const result = await ingestShippingEvent('mock', 'ref-1', NORMALIZED);
    expect(result.status).toBe('subscription_inactive');
    expect(insertedEvents).toHaveLength(0);
  });

  it("rejects events for a 'cancelled' subscription (unchanged behavior)", async () => {
    const { insertedEvents } = stubSubscriptionLookup('cancelled');
    const result = await ingestShippingEvent('mock', 'ref-1', NORMALIZED);
    expect(result.status).toBe('subscription_inactive');
    expect(insertedEvents).toHaveLength(0);
  });

  it('returns no_subscription when nothing matches the provider reference', async () => {
    const { insertedEvents } = stubSubscriptionLookup(null);
    const result = await ingestShippingEvent('mock', 'ref-x', NORMALIZED);
    expect(result.status).toBe('no_subscription');
    expect(insertedEvents).toHaveLength(0);
  });

  it("stores events for an 'active' subscription", async () => {
    const { insertedEvents } = stubSubscriptionLookup('active');
    const result = await ingestShippingEvent('mock', 'ref-1', NORMALIZED);
    expect(result.status).toBe('stored');
    expect(insertedEvents).toHaveLength(1);
  });
});
