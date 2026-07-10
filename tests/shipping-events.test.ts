/**
 * Unit tests for the escrow auto-release trigger engine (pure logic only —
 * lib/services/shipping-events.ts). The decision matrix here is the safety
 * contract for money movement: if one of these flips, releases behave
 * differently in production.
 */

import { describe, it, expect } from 'vitest';
import {
  EVENT_STAGE_MAP,
  AUTO_RELEASE_STAGES,
  normalizeMilestoneStage,
  decideEventAction,
  type ReleaseDecisionInput,
} from '@/lib/services/shipping-events';
import type { EscrowStatusResult } from '@/lib/types/escrow';

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const NOW = new Date('2026-07-09T12:00:00Z');
const TWO_DAYS_AGO = new Date('2026-07-07T12:00:00Z');
const ONE_HOUR_AGO = new Date('2026-07-09T11:00:00Z');

function escrowWith(milestones: Array<{ milestone_id: string; stage: string | number; released_at?: string }>,
  overrides: Partial<{ status: string; hasOpenDispute: boolean }> = {}): EscrowStatusResult {
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
      status: (overrides.status ?? 'active') as EscrowStatusResult['escrow'] extends null ? never : any,
      milestone_config: milestones.map((m) => ({
        milestone_id: m.milestone_id,
        stage: m.stage,
        amount: 25_000,
        description: `Milestone ${m.milestone_id}`,
        ...(m.released_at ? { released_at: m.released_at } : {}),
      })),
      created_by: 'user-1',
      created_at: '2026-07-01T00:00:00Z',
      updated_at: '2026-07-01T00:00:00Z',
    },
    hasOpenDispute: overrides.hasOpenDispute ?? false,
    openDispute: null,
  };
}

function input(overrides: Partial<ReleaseDecisionInput> = {}): ReleaseDecisionInput {
  return {
    eventCode: 'LOAD',
    classifier: 'ACT',
    eventTime: TWO_DAYS_AGO,
    now: NOW,
    autoReleaseEnabled: true,
    actorId: 'user-1',
    escrowStatus: escrowWith([{ milestone_id: 'm7', stage: 7 }]),
    settlementHours: 24,
    ...overrides,
  };
}

// ─── Event → stage mapping ────────────────────────────────────────────────────

describe('EVENT_STAGE_MAP', () => {
  it('maps origin events to stage 6, on-board/departure to 7, arrival to 8, delivery-side to 9', () => {
    expect(EVENT_STAGE_MAP.GTIN).toBe(6);
    expect(EVENT_STAGE_MAP.STUF).toBe(6);
    expect(EVENT_STAGE_MAP.LOAD).toBe(7);
    expect(EVENT_STAGE_MAP.ISSU).toBe(7);
    expect(EVENT_STAGE_MAP.DEPA).toBe(7);
    expect(EVENT_STAGE_MAP.ARRI).toBe(8);
    expect(EVENT_STAGE_MAP.DISC).toBe(8);
    expect(EVENT_STAGE_MAP.GTOT).toBe(9);
    expect(EVENT_STAGE_MAP.STRP).toBe(9);
  });

  it('never marks the delivery stage as auto-releasable', () => {
    expect(AUTO_RELEASE_STAGES.has(9)).toBe(false);
    expect([...AUTO_RELEASE_STAGES].sort()).toEqual([6, 7, 8]);
  });
});

// ─── Milestone stage normalization ────────────────────────────────────────────

describe('normalizeMilestoneStage', () => {
  it('accepts numeric pipeline stages 1-9', () => {
    expect(normalizeMilestoneStage(7)).toBe(7);
    expect(normalizeMilestoneStage(1)).toBe(1);
    expect(normalizeMilestoneStage(9)).toBe(9);
  });

  it('rejects out-of-range or non-integer numbers', () => {
    expect(normalizeMilestoneStage(0)).toBeNull();
    expect(normalizeMilestoneStage(10)).toBeNull();
    expect(normalizeMilestoneStage(7.5)).toBeNull();
  });

  it('parses numeric strings', () => {
    expect(normalizeMilestoneStage('7')).toBe(7);
    expect(normalizeMilestoneStage(' 8 ')).toBe(8);
  });

  it('maps the legacy free-text labels used by payment-setup', () => {
    expect(normalizeMilestoneStage('on_delivery')).toBe(9);
    expect(normalizeMilestoneStage('ON_DELIVERY')).toBe(9);
    expect(normalizeMilestoneStage('on_arrival')).toBe(8);
    expect(normalizeMilestoneStage('on_shipment')).toBe(7);
    expect(normalizeMilestoneStage('gate_in')).toBe(6);
  });

  it('returns null for unknown labels (no automation on unrecognized stages)', () => {
    expect(normalizeMilestoneStage('when_i_feel_like_it')).toBeNull();
    expect(normalizeMilestoneStage('')).toBeNull();
  });
});

// ─── Decision engine ──────────────────────────────────────────────────────────

describe('decideEventAction', () => {
  it('releases the matching milestone for a settled ACT event on an auto-releasable stage', () => {
    const decision = decideEventAction(input());
    expect(decision).toMatchObject({ action: 'release', milestoneId: 'm7', stage: 7 });
  });

  it('never releases on EST or PLN events', () => {
    expect(decideEventAction(input({ classifier: 'EST' }))).toMatchObject({ action: 'skip' });
    expect(decideEventAction(input({ classifier: 'PLN' }))).toMatchObject({ action: 'skip' });
  });

  it('never releases delivery-side events (GTOT/STRP) even with a matching milestone', () => {
    const escrowStatus = escrowWith([{ milestone_id: 'm9', stage: 9 }]);
    const decision = decideEventAction(input({ eventCode: 'GTOT', escrowStatus }));
    expect(decision).toMatchObject({ action: 'skip', reason: 'stage_not_auto_releasable:9' });
  });

  it('matches milestones declared with legacy text labels', () => {
    const escrowStatus = escrowWith([{ milestone_id: 'm-arr', stage: 'on_arrival' }]);
    const decision = decideEventAction(input({ eventCode: 'DISC', escrowStatus }));
    expect(decision).toMatchObject({ action: 'release', milestoneId: 'm-arr', stage: 8 });
  });

  it('skips when auto-release is not enabled on the subscription', () => {
    expect(decideEventAction(input({ autoReleaseEnabled: false })))
      .toMatchObject({ action: 'skip', reason: 'auto_release_disabled' });
  });

  it('skips when the subscription has no attributable actor', () => {
    expect(decideEventAction(input({ actorId: null })))
      .toMatchObject({ action: 'skip', reason: 'no_actor' });
  });

  it('skips unmapped event codes', () => {
    expect(decideEventAction(input({ eventCode: 'XXXX' })))
      .toMatchObject({ action: 'skip', reason: 'unmapped_event:XXXX' });
  });

  it('skips when there is no escrow on the shipment', () => {
    expect(decideEventAction(input({ escrowStatus: null })))
      .toMatchObject({ action: 'skip', reason: 'no_escrow' });
  });

  it('freezes on an open dispute', () => {
    const escrowStatus = escrowWith([{ milestone_id: 'm7', stage: 7 }], { hasOpenDispute: true });
    expect(decideEventAction(input({ escrowStatus })))
      .toMatchObject({ action: 'skip', reason: 'dispute_hold' });
  });

  it('skips non-active escrow', () => {
    const escrowStatus = escrowWith([{ milestone_id: 'm7', stage: 7 }], { status: 'completed' });
    expect(decideEventAction(input({ escrowStatus })))
      .toMatchObject({ action: 'skip', reason: 'escrow_completed' });
  });

  it('skips already-released milestones (no double release)', () => {
    const escrowStatus = escrowWith([
      { milestone_id: 'm7', stage: 7, released_at: '2026-07-05T00:00:00Z' },
    ]);
    expect(decideEventAction(input({ escrowStatus })))
      .toMatchObject({ action: 'skip', reason: 'no_matching_milestone:stage_7' });
  });

  it('defers events still inside the settlement window', () => {
    expect(decideEventAction(input({ eventTime: ONE_HOUR_AGO })))
      .toMatchObject({ action: 'defer', reason: 'settlement_delay' });
  });

  it('releases exactly at the settlement boundary', () => {
    const eventTime = new Date(NOW.getTime() - 24 * 3_600_000);
    expect(decideEventAction(input({ eventTime }))).toMatchObject({ action: 'release' });
  });

  it('releases immediately when the settlement delay is configured to 0', () => {
    expect(decideEventAction(input({ eventTime: ONE_HOUR_AGO, settlementHours: 0 })))
      .toMatchObject({ action: 'release' });
  });
});
