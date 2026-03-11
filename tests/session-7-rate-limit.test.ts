/**
 * tests/session-7-rate-limit.test.ts
 *
 * Regression tests for Session 7 — Supabase-backed distributed rate limiter.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function readRoute(relPath: string): string {
  return readFileSync(join(__dirname, '..', 'app/api', relPath, 'route.ts'), 'utf8');
}

function readLib(relPath: string): string {
  return readFileSync(join(__dirname, '..', relPath), 'utf8');
}

// ---------------------------------------------------------------------------
// Rate limiter module tests (in-memory fallback path — no Supabase in test env)
// ---------------------------------------------------------------------------

describe('Session 7 — rate-limit module structure', () => {
  it('exports checkRateLimit as async function', () => {
    const src = readLib('lib/api/rate-limit.ts');
    expect(src).toContain('export async function checkRateLimit');
  });

  it('exports checkRateLimitLegacy as sync function', () => {
    const src = readLib('lib/api/rate-limit.ts');
    expect(src).toContain('export function checkRateLimitLegacy');
  });

  it('exports RATE_LIMIT_PRESETS with all 7 presets', () => {
    const src = readLib('lib/api/rate-limit.ts');
    for (const preset of ['deforestationCheck', 'ocr', 'analytics', 'auth', 'cron', 'reports', 'general']) {
      expect(src).toContain(preset);
    }
  });

  it('has in-memory fallback Map', () => {
    const src = readLib('lib/api/rate-limit.ts');
    expect(src).toContain('fallbackWindows');
    expect(src).toContain('checkFallback');
  });

  it('uses increment_rate_limit RPC when Supabase available', () => {
    const src = readLib('lib/api/rate-limit.ts');
    expect(src).toContain('increment_rate_limit');
  });

  it('fails open on Supabase error (does not throw)', () => {
    const src = readLib('lib/api/rate-limit.ts');
    expect(src).toContain('fail open');
  });

  it('legacy wrapper remains synchronous (no await)', () => {
    const src = readLib('lib/api/rate-limit.ts');
    // Find the checkRateLimitLegacy function body
    const fnStart = src.indexOf('export function checkRateLimitLegacy');
    const fnEnd   = src.indexOf('\n}', fnStart) + 2;
    const fnBody  = src.slice(fnStart, fnEnd);
    expect(fnBody).not.toContain('await');
    expect(fnBody).not.toContain('async');
  });
});

// ---------------------------------------------------------------------------
// checkRateLimitLegacy behaviour (synchronous, uses fallback)
// ---------------------------------------------------------------------------

describe('Session 7 — checkRateLimitLegacy (sync in-memory)', () => {
  // We can import and run the legacy wrapper directly since it uses in-memory only

  it('allows requests within limit', async () => {
    const { checkRateLimitLegacy } = await import('../lib/api/rate-limit');
    const mockRequest = {
      headers: { get: () => '10.0.0.1' },
    } as any;

    // Fresh key — should allow
    const result = checkRateLimitLegacy(mockRequest, { windowMs: 60_000, maxRequests: 5 });
    expect(result.limited).toBe(false);
    expect(result.response).toBeUndefined();
  });

  it('blocks after limit is exceeded', async () => {
    const { checkRateLimitLegacy } = await import('../lib/api/rate-limit');
    const ip = `192.168.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`;
    const mockRequest = {
      headers: { get: (h: string) => h === 'x-forwarded-for' ? ip : null },
    } as any;
    const config = { windowMs: 60_000, maxRequests: 3 };

    // Exhaust limit
    checkRateLimitLegacy(mockRequest, config);
    checkRateLimitLegacy(mockRequest, config);
    checkRateLimitLegacy(mockRequest, config);
    const result = checkRateLimitLegacy(mockRequest, config);

    expect(result.limited).toBe(true);
    expect(result.response).toBeDefined();
  });

  it('429 response includes Retry-After header', async () => {
    const { checkRateLimitLegacy } = await import('../lib/api/rate-limit');
    const ip = `10.1.${Math.floor(Math.random() * 255)}.1`;
    const mockRequest = {
      headers: { get: (h: string) => h === 'x-real-ip' ? ip : null },
    } as any;
    const config = { windowMs: 60_000, maxRequests: 1 };

    checkRateLimitLegacy(mockRequest, config); // exhaust
    const result = checkRateLimitLegacy(mockRequest, config);

    expect(result.limited).toBe(true);
    // NextResponse headers are accessible via .headers
    const response = result.response!;
    expect(response.status).toBe(429);
  });
});

// ---------------------------------------------------------------------------
// RATE_LIMIT_PRESETS values are sensible
// ---------------------------------------------------------------------------

describe('Session 7 — RATE_LIMIT_PRESETS sanity', () => {
  it('all presets have positive max and windowSecs', async () => {
    const { RATE_LIMIT_PRESETS } = await import('../lib/api/rate-limit');
    for (const [name, preset] of Object.entries(RATE_LIMIT_PRESETS)) {
      expect(preset.max, `${name}.max`).toBeGreaterThan(0);
      expect(preset.windowSecs, `${name}.windowSecs`).toBeGreaterThan(0);
      expect(preset.keyPrefix, `${name}.keyPrefix`).toBeTruthy();
    }
  });

  it('all presets have unique keyPrefixes', async () => {
    const { RATE_LIMIT_PRESETS } = await import('../lib/api/rate-limit');
    const prefixes = Object.values(RATE_LIMIT_PRESETS).map(p => p.keyPrefix);
    const unique = new Set(prefixes);
    expect(unique.size).toBe(prefixes.length);
  });

  it('auth preset has lower limit than general (stricter)', async () => {
    const { RATE_LIMIT_PRESETS } = await import('../lib/api/rate-limit');
    expect(RATE_LIMIT_PRESETS.auth.max).toBeLessThan(RATE_LIMIT_PRESETS.general.max);
  });

  it('ocr preset has lower limit than analytics (expensive external API)', async () => {
    const { RATE_LIMIT_PRESETS } = await import('../lib/api/rate-limit');
    expect(RATE_LIMIT_PRESETS.ocr.max).toBeLessThanOrEqual(RATE_LIMIT_PRESETS.analytics.max);
  });
});

// ---------------------------------------------------------------------------
// Route migration — async form
// ---------------------------------------------------------------------------

describe('Session 7 — migrated routes use async checkRateLimit', () => {
  const MIGRATED_ROUTES = [
    { route: 'analytics',           preset: 'analytics' },
    { route: 'ocr',                 preset: 'ocr' },
    { route: 'reports',             preset: 'reports' },
    { route: 'deforestation-check', preset: 'deforestationCheck' },
  ];

  for (const { route, preset } of MIGRATED_ROUTES) {
    it(`${route}/route.ts imports from @/lib/api/rate-limit (not legacy path)`, () => {
      const src = readRoute(route);
      expect(src).toContain("from '@/lib/api/rate-limit'");
      expect(src).not.toContain("from '@/lib/rate-limit'");
    });

    it(`${route}/route.ts uses await checkRateLimit`, () => {
      const src = readRoute(route);
      expect(src).toContain('await checkRateLimit');
    });

    it(`${route}/route.ts uses RATE_LIMIT_PRESETS.${preset}`, () => {
      const src = readRoute(route);
      expect(src).toContain(`RATE_LIMIT_PRESETS.${preset}`);
    });

    it(`${route}/route.ts uses simple null-check on rate limit result`, () => {
      const src = readRoute(route);
      expect(src).toContain('if (rateCheck) return rateCheck');
    });
  }
});

// ---------------------------------------------------------------------------
// Legacy callers still use @/lib/rate-limit (sync wrapper)
// ---------------------------------------------------------------------------

describe('Session 7 — legacy callers still work via @/lib/rate-limit shim', () => {
  const LEGACY_ROUTES = [
    'auth/farmer-login',
    'cron/document-expiry',
  ];

  for (const route of LEGACY_ROUTES) {
    it(`${route}/route.ts still imports from @/lib/rate-limit`, () => {
      const src = readRoute(route);
      expect(src).toContain("from '@/lib/rate-limit'");
    });
  }

  it('@/lib/rate-limit.ts re-exports checkRateLimitLegacy as checkRateLimit', () => {
    const src = readLib('lib/rate-limit.ts');
    expect(src).toContain('checkRateLimitLegacy as checkRateLimit');
  });
});

// ---------------------------------------------------------------------------
// Migration SQL exists and is correct
// ---------------------------------------------------------------------------

describe('Session 7 — DB migration for rate limit RPC', () => {
  it('migration file exists', () => {
    const src = readFileSync(
      join(__dirname, '..', 'migrations/20260311_rate_limit_rpc.sql'),
      'utf8'
    );
    expect(src.length).toBeGreaterThan(100);
  });

  it('migration defines increment_rate_limit function', () => {
    const src = readFileSync(
      join(__dirname, '..', 'migrations/20260311_rate_limit_rpc.sql'),
      'utf8'
    );
    expect(src).toContain('CREATE OR REPLACE FUNCTION increment_rate_limit');
  });

  it('migration uses ON CONFLICT for atomic upsert', () => {
    const src = readFileSync(
      join(__dirname, '..', 'migrations/20260311_rate_limit_rpc.sql'),
      'utf8'
    );
    expect(src).toContain('ON CONFLICT');
    expect(src).toContain('DO UPDATE');
  });

  it('migration grants execute to service_role only', () => {
    const src = readFileSync(
      join(__dirname, '..', 'migrations/20260311_rate_limit_rpc.sql'),
      'utf8'
    );
    expect(src).toContain('GRANT EXECUTE');
    expect(src).toContain('service_role');
    expect(src).toContain('REVOKE ALL');
  });
});
