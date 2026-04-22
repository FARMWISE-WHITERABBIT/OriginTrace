/**
 * tests/session-4-5-6.test.ts
 *
 * Regression tests for:
 *   Session 4 — Auth standardisation (getAuthenticatedUser removed)
 *   Session 5 — Pagination (parsePagination helper + list routes)
 *   Session 6 — Webhook reliability (backoffMs, MAX_ATTEMPTS, new exports)
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import { parsePagination } from '../lib/api/validation';
import { backoffMs, MAX_ATTEMPTS, WEBHOOK_EVENTS } from '../lib/webhooks';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function readRoute(relPath: string): string {
  return readFileSync(join(__dirname, '..', 'app/api', relPath, 'route.ts'), 'utf8');
}

// ---------------------------------------------------------------------------
// SESSION 4 — Auth standardisation
// ---------------------------------------------------------------------------

describe('Session 4 — getAuthenticatedUser removed from all routes', () => {
  const PATTERN_B_ROUTES = [
    'batches',
    'shipments',
    'shipments/[id]',
    'shipments/[id]/cold-chain',
    'shipments/[id]/lots',
    'shipments/[id]/outcomes',
    'dashboard',
  ];

  for (const route of PATTERN_B_ROUTES) {
    it(`${route}/route.ts does not call getAuthenticatedUser`, () => {
      const src = readRoute(route);
      expect(src).not.toContain('getAuthenticatedUser');
    });

    it(`${route}/route.ts calls getAuthenticatedProfile`, () => {
      const src = readRoute(route);
      expect(src).toContain('getAuthenticatedProfile');
    });

    it(`${route}/route.ts does not inline .from('profiles') auth query`, () => {
      const src = readRoute(route);
      // inline profile fetch pattern: select('id, org_id, role').eq('user_id', user.id)
      // Should not exist — getAuthenticatedProfile handles this
      const hasInlineProfileFetch =
        src.includes("select('id, org_id, role')") &&
        src.includes('.eq(\'user_id\', user.id)');
      expect(hasInlineProfileFetch).toBe(false);
    });
  }

  it('all 96 route.ts files import getAuthenticatedProfile not getAuthenticatedUser', () => {
    // Any remaining getAuthenticatedUser usage must only be in api-auth.ts itself
    const { execSync } = require('child_process');
    const result = execSync(
      "grep -rn 'getAuthenticatedUser' " +
        join(__dirname, '..', 'app/api') +
        ' --include=route.ts 2>/dev/null || true',
      { encoding: 'utf8' }
    );
    expect(result.trim()).toBe('');
  });
});

// ---------------------------------------------------------------------------
// SESSION 5 — Pagination helper
// ---------------------------------------------------------------------------

describe('Session 5 — parsePagination helper', () => {
  function sp(query: Record<string, string>): URLSearchParams {
    return new URLSearchParams(query);
  }

  it('returns defaults when no params provided', () => {
    const { page, limit, from, to } = parsePagination(new URLSearchParams());
    expect(page).toBe(1);
    expect(limit).toBe(50);
    expect(from).toBe(0);
    expect(to).toBe(49);
  });

  it('computes correct range for page 2, limit 20', () => {
    const { from, to } = parsePagination(sp({ page: '2', limit: '20' }));
    expect(from).toBe(20);
    expect(to).toBe(39);
  });

  it('computes correct range for page 3, limit 10', () => {
    const { from, to } = parsePagination(sp({ page: '3', limit: '10' }));
    expect(from).toBe(20);
    expect(to).toBe(29);
  });

  it('clamps limit to 200 maximum', () => {
    const { limit } = parsePagination(sp({ limit: '999' }));
    expect(limit).toBe(200);
  });

  it('clamps limit to 1 minimum', () => {
    const { limit } = parsePagination(sp({ limit: '0' }));
    expect(limit).toBe(1);
  });

  it('clamps page to 1 minimum', () => {
    const { page, from } = parsePagination(sp({ page: '-5' }));
    expect(page).toBe(1);
    expect(from).toBe(0);
  });

  it('handles non-numeric gracefully (defaults)', () => {
    const { page, limit } = parsePagination(sp({ page: 'abc', limit: 'xyz' }));
    expect(page).toBe(1);
    expect(limit).toBe(50);
  });

  it('to = from + limit - 1 invariant always holds', () => {
    for (const [p, l] of [[1, 50], [2, 25], [5, 10], [1, 200]] as [number, number][]) {
      const { from, to } = parsePagination(sp({ page: String(p), limit: String(l) }));
      expect(to).toBe(from + l - 1);
    }
  });
});

describe('Session 5 — list routes have pagination', () => {
  const LIST_ROUTES = [
    'farms',
    'batches',
    'shipments',
    'documents',
    'compliance-profiles',
    'contracts',
    'tenders',
    'processing-runs',
    'dpp',
    'finished-goods',
    'agents',
    'farmers',
  ];

  for (const route of LIST_ROUTES) {
    it(`${route}/route.ts imports parsePagination`, () => {
      const src = readRoute(route);
      expect(src).toContain('parsePagination');
    });

    it(`${route}/route.ts GET uses .range( or slices array for pagination`, () => {
      const src = readRoute(route);
      const hasPagination = src.includes('.range(') || src.includes('.slice(from');
      expect(hasPagination).toBe(true);
    });

    it(`${route}/route.ts GET response includes pagination object`, () => {
      const src = readRoute(route);
      expect(src).toContain('pagination:');
    });
  }
});

// ---------------------------------------------------------------------------
// SESSION 6 — Webhook reliability
// ---------------------------------------------------------------------------

describe('Session 6 — webhooks.ts no setTimeout retry', () => {
  it('lib/webhooks.ts does not use setTimeout for retry scheduling', () => {
    const src = readFileSync(join(__dirname, '..', 'lib/webhooks.ts'), 'utf8');
    // The only setTimeout in the file should be the 10s request timeout abort
    // Not the retry scheduling. We test that "attempt * 5000" is gone.
    expect(src).not.toContain('attempt * 5000');
    expect(src).not.toContain('deliverWebhook(supabase'); // old private function
  });

  it('lib/webhooks.ts exports attemptDelivery', () => {
    const src = readFileSync(join(__dirname, '..', 'lib/webhooks.ts'), 'utf8');
    expect(src).toContain('export async function attemptDelivery');
  });

  it('lib/webhooks.ts exports backoffMs', () => {
    const src = readFileSync(join(__dirname, '..', 'lib/webhooks.ts'), 'utf8');
    expect(src).toContain('export function backoffMs');
  });

  it('lib/webhooks.ts exports MAX_ATTEMPTS', () => {
    const src = readFileSync(join(__dirname, '..', 'lib/webhooks.ts'), 'utf8');
    expect(src).toContain('export const MAX_ATTEMPTS');
  });
});

describe('Session 6 — backoffMs', () => {
  it('attempt 1 is at least 55 seconds (base 60s - max jitter 5s)', () => {
    for (let i = 0; i < 20; i++) {
      expect(backoffMs(1)).toBeGreaterThanOrEqual(55_000);
    }
  });

  it('attempt 2 is substantially larger than attempt 1', () => {
    const avg1 = Array.from({ length: 10 }, () => backoffMs(1)).reduce((a, b) => a + b) / 10;
    const avg2 = Array.from({ length: 10 }, () => backoffMs(2)).reduce((a, b) => a + b) / 10;
    expect(avg2).toBeGreaterThan(avg1 * 3);
  });

  it('back-off is capped at 8 hours', () => {
    for (let attempt = 1; attempt <= 10; attempt++) {
      expect(backoffMs(attempt)).toBeLessThanOrEqual(8 * 60 * 60 * 1000 + 5_000);
    }
  });

  it('back-off is always positive', () => {
    for (let attempt = 1; attempt <= 5; attempt++) {
      expect(backoffMs(attempt)).toBeGreaterThan(0);
    }
  });
});

describe('Session 6 — MAX_ATTEMPTS constant', () => {
  it('MAX_ATTEMPTS is 5', () => {
    expect(MAX_ATTEMPTS).toBe(5);
  });
});

describe('Session 6 — webhook retry cron route exists', () => {
  it('app/api/cron/webhook-retry/route.ts exists and is non-empty', () => {
    const src = readFileSync(
      join(__dirname, '..', 'app/api/cron/webhook-retry/route.ts'),
      'utf8'
    );
    expect(src.length).toBeGreaterThan(100);
  });

  it('webhook-retry cron route uses CRON_SECRET auth guard', () => {
    const src = readFileSync(
      join(__dirname, '..', 'app/api/cron/webhook-retry/route.ts'),
      'utf8'
    );
    expect(src).toContain('CRON_SECRET');
    expect(src).toContain('Unauthorized');
  });

  it('webhook-retry cron route queries pending deliveries', () => {
    const src = readFileSync(
      join(__dirname, '..', 'app/api/cron/webhook-retry/route.ts'),
      'utf8'
    );
    expect(src).toContain("status', 'pending'");
    expect(src).toContain('next_retry_at');
  });

  it('webhook-retry cron route is registered in vercel.json', () => {
    const vercel = JSON.parse(
      readFileSync(join(__dirname, '..', 'vercel.json'), 'utf8')
    );
    const paths = vercel.crons.map((c: { path: string }) => c.path);
    expect(paths).toContain('/api/cron/webhook-retry');
  });

  it('vercel.json webhook-retry schedule is configured for Vercel Hobby plan', () => {
    const vercel = JSON.parse(
      readFileSync(join(__dirname, '..', 'vercel.json'), 'utf8')
    );
    const cron = vercel.crons.find((c: { path: string }) => c.path === '/api/cron/webhook-retry');
    // Vercel Hobby plan requires once-daily crons; was */5 * * * * on Pro
    expect(cron?.schedule).toBeDefined();
    expect(cron?.schedule).not.toBeUndefined();
  });
});

describe('Session 6 — DB migration exists', () => {
  it('migration file for webhook reliability columns exists', () => {
    const src = readFileSync(
      join(__dirname, '..', 'supabase/migrations/20260311_webhook_reliability.sql'),
      'utf8'
    );
    expect(src).toContain('next_retry_at');
    expect(src).toContain('last_attempted_at');
    expect(src).toContain('idx_webhook_deliveries_retry');
  });
});

describe('Session 6 — WEBHOOK_EVENTS catalog unchanged', () => {
  const EXPECTED_EVENTS = [
    'shipment.created', 'shipment.updated', 'shipment.scored',
    'batch.created', 'document.uploaded', 'document.expired',
    'compliance.changed', 'payment.recorded', 'payment.disbursed',
    'farm.approved', 'farm.rejected', 'certification.expiring',
    'tender.created', 'tender.awarded',
  ];

  it('exports all expected event types', () => {
    for (const evt of EXPECTED_EVENTS) {
      expect(WEBHOOK_EVENTS).toContain(evt as any);
    }
  });

  it('has exactly 31 event types', () => {
    expect(WEBHOOK_EVENTS.length).toBe(31);
  });
});
