/**
 * Tests for the optimistic-concurrency guard in releaseMilestone()
 * (lib/services/escrow.ts).
 *
 * The race itself (two writers on one Postgres row) can't be reproduced in
 * this pure-unit suite, so these tests pin the *contract* around it instead:
 * an UPDATE that matches 0 rows (someone else changed escrow_accounts between
 * our read and our guarded write) surfaces as EscrowConcurrencyError BEFORE
 * any escrow_transactions ledger insert, audit event, or webhook dispatch.
 * The retryable handling of that error inside processShippingEvent() is
 * covered in tests/shipping-event-processing.test.ts.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── Mock infrastructure ──────────────────────────────────────────────────────

const h = vi.hoisted(() => {
  /** Chainable, thenable query stub: any method call returns itself; awaiting resolves `result`. */
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

const mockLogAuditEvent = vi.hoisted(() => vi.fn(async () => {}));
vi.mock('@/lib/audit', () => ({ logAuditEvent: mockLogAuditEvent }));

const mockDispatchWebhookEvent = vi.hoisted(() => vi.fn());
vi.mock('@/lib/webhooks', () => ({ dispatchWebhookEvent: mockDispatchWebhookEvent }));

import { releaseMilestone, EscrowConcurrencyError } from '@/lib/services/escrow';

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const ESCROW_ROW = {
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
  milestone_config: [
    { milestone_id: 'm7', stage: 7, amount: 25_000, description: 'Departure tranche' },
  ],
  created_by: 'user-1',
  created_at: '2026-07-01T00:00:00Z',
  updated_at: '2026-07-01T00:00:00.123456+00:00',
};

function stubTables(opts: { selectResult: unknown; updateResult: unknown }) {
  const updatePayloads: unknown[] = [];
  const txInserts: unknown[] = [];
  h.mockFrom.mockImplementation((table: string) => {
    if (table === 'escrow_accounts') {
      return {
        select: () => h.chainable(opts.selectResult),
        update: (payload: unknown) => {
          updatePayloads.push(payload);
          return h.chainable(opts.updateResult);
        },
      };
    }
    if (table === 'escrow_transactions') {
      return {
        insert: (row: unknown) => {
          txInserts.push(row);
          return h.chainable({ error: null });
        },
      };
    }
    throw new Error(`unexpected table: ${table}`);
  });
  return { updatePayloads, txInserts };
}

beforeEach(() => {
  vi.clearAllMocks();
});

// ─── releaseMilestone concurrency contract ────────────────────────────────────

describe('releaseMilestone — optimistic concurrency', () => {
  const params = { escrowId: 'esc-1', milestoneId: 'm7', actorId: 'user-1', orgId: 'org-1' };

  it('throws EscrowConcurrencyError when the guarded UPDATE matches 0 rows, with NO ledger insert and NO webhook', async () => {
    const { txInserts } = stubTables({
      selectResult: { data: ESCROW_ROW, error: null },
      // .select().maybeSingle() after the update returns null data = 0 rows
      // matched the updated_at precondition → a concurrent writer won.
      updateResult: { data: null, error: null },
    });

    await expect(releaseMilestone(params)).rejects.toBeInstanceOf(EscrowConcurrencyError);
    await expect(releaseMilestone(params)).rejects.toThrow(/^concurrent_release_conflict:/);

    expect(txInserts).toHaveLength(0);
    expect(mockDispatchWebhookEvent).not.toHaveBeenCalled();
    expect(mockLogAuditEvent).not.toHaveBeenCalled();
  });

  it('completes the release when the guarded UPDATE succeeds (ledger row + webhook)', async () => {
    const { updatePayloads, txInserts } = stubTables({
      selectResult: { data: ESCROW_ROW, error: null },
      updateResult: {
        data: { ...ESCROW_ROW, held_amount: 75_000, released_amount: 25_000 },
        error: null,
      },
    });

    await expect(releaseMilestone(params)).resolves.toBeUndefined();

    expect(txInserts).toHaveLength(1);
    expect(txInserts[0]).toMatchObject({
      escrow_id: 'esc-1',
      type: 'release',
      amount: 25_000,
      actor_id: 'user-1',
    });
    expect(mockDispatchWebhookEvent).toHaveBeenCalledWith(
      'org-1',
      'escrow.released',
      expect.objectContaining({ milestone_id: 'm7' })
    );
    // The UPDATE payload rotates the optimistic token.
    expect(updatePayloads[0]).toHaveProperty('updated_at');
  });

  it('surfaces a real UPDATE error as a plain (non-concurrency) error', async () => {
    stubTables({
      selectResult: { data: ESCROW_ROW, error: null },
      updateResult: { data: null, error: { message: 'connection reset' } },
    });

    const err = await releaseMilestone(params).catch((e) => e);
    expect(err).toBeInstanceOf(Error);
    expect(err).not.toBeInstanceOf(EscrowConcurrencyError);
    expect(String(err.message)).toContain('connection reset');
  });

  it('still refuses to touch a released milestone before any write', async () => {
    const released = {
      ...ESCROW_ROW,
      milestone_config: [
        {
          milestone_id: 'm7',
          stage: 7,
          amount: 25_000,
          description: 'x',
          released_at: '2026-07-05T00:00:00Z',
        },
      ],
    };
    const { updatePayloads, txInserts } = stubTables({
      selectResult: { data: released, error: null },
      updateResult: { data: released, error: null },
    });

    await expect(releaseMilestone(params)).rejects.toThrow(/already been released/);
    expect(updatePayloads).toHaveLength(0);
    expect(txInserts).toHaveLength(0);
  });
});
