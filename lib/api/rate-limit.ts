/**
 * lib/api/rate-limit.ts
 *
 * Distributed rate limiter backed by Supabase (api_rate_limits table).
 * Shared across all server instances — safe for multi-dyno and multi-region.
 *
 * Architecture:
 *  - Uses an atomic Postgres RPC (increment_rate_limit) that increments the
 *    counter and resets the window in a single statement, eliminating the
 *    SELECT + UPDATE race condition of the previous implementation.
 *  - Falls back to the in-process Map if Supabase is unavailable, so the
 *    app never hard-fails due to rate limiter errors.
 *
 * Migration required before deploying:
 *   migrations/20260311_rate_limit_rpc.sql
 *
 * Public API is identical to the previous version — all callers unchanged.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface RateLimitConfig {
  /** Max requests in the window */
  max: number;
  /** Window duration in seconds */
  windowSecs: number;
  /** Key prefix to namespace limits per endpoint */
  keyPrefix: string;
}

/** Backwards-compatible config shape used by older callers */
export interface LegacyRateLimitConfig {
  windowMs: number;
  maxRequests: number;
}

export const RATE_LIMIT_PRESETS = {
  /** Deforestation check — calls Global Forest Watch API */
  deforestationCheck: { max: 20,  windowSecs: 60, keyPrefix: 'def' },
  /** OCR — calls OpenAI Vision API */
  ocr:               { max: 10,  windowSecs: 60, keyPrefix: 'ocr' },
  /** Analytics — large DB fan-out */
  analytics:         { max: 60,  windowSecs: 60, keyPrefix: 'anl' },
  /** Auth endpoints */
  auth:              { max: 10,  windowSecs: 60, keyPrefix: 'ath' },
  /** Cron / background jobs */
  cron:              { max: 5,   windowSecs: 60, keyPrefix: 'crn' },
  /** Reports — heavy DB aggregation */
  reports:           { max: 20,  windowSecs: 60, keyPrefix: 'rpt' },
  /** General API routes */
  general:           { max: 120, windowSecs: 60, keyPrefix: 'gen' },
} as const;

export type RateLimitPreset = keyof typeof RATE_LIMIT_PRESETS;

// ---------------------------------------------------------------------------
// In-memory fallback (used when Supabase is unavailable)
// ---------------------------------------------------------------------------

interface RateWindow {
  count: number;
  resetAt: number;
}

const fallbackWindows = new Map<string, RateWindow>();

setInterval(() => {
  const now = Date.now();
  for (const [key, win] of fallbackWindows.entries()) {
    if (win.resetAt < now) fallbackWindows.delete(key);
  }
}, 5 * 60 * 1000);

function checkFallback(key: string, config: RateLimitConfig): boolean {
  const now = Date.now();
  const windowMs = config.windowSecs * 1000;
  let win = fallbackWindows.get(key);
  if (!win || win.resetAt < now) {
    win = { count: 0, resetAt: now + windowMs };
    fallbackWindows.set(key, win);
  }
  win.count++;
  return win.count <= config.max;
}

// ---------------------------------------------------------------------------
// Supabase client (lazy — only initialised on first request)
// ---------------------------------------------------------------------------

let _supabase: SupabaseClient | null | undefined = undefined; // undefined = not yet tried

function getSupabase(): SupabaseClient | null {
  if (_supabase !== undefined) return _supabase;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    _supabase = null;
    return null;
  }
  _supabase = createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  return _supabase;
}

// ---------------------------------------------------------------------------
// Core helpers
// ---------------------------------------------------------------------------

function getIdentifier(request: NextRequest, orgId?: string | null): string {
  const ip =
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    'unknown';
  return orgId ? `${orgId}:${ip}` : ip;
}

function build429(config: RateLimitConfig, resetAt: number): NextResponse {
  const now = Date.now();
  const retryAfter = Math.max(1, Math.ceil((resetAt - now) / 1000));
  return NextResponse.json(
    { error: 'Rate limit exceeded', retryAfterSeconds: retryAfter },
    {
      status: 429,
      headers: {
        'X-RateLimit-Limit':     String(config.max),
        'X-RateLimit-Remaining': '0',
        'X-RateLimit-Reset':     String(Math.floor(resetAt / 1000)),
        'Retry-After':           String(retryAfter),
      },
    }
  );
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Primary rate-limit check. Returns a 429 NextResponse if exceeded, null otherwise.
 *
 * Usage (routes that already await):
 *   const limited = await checkRateLimit(req, orgId, RATE_LIMIT_PRESETS.ocr);
 *   if (limited) return limited;
 *
 * The legacy callers on '@/lib/rate-limit' use checkRateLimitLegacy (sync, in-memory only).
 */
export async function checkRateLimit(
  request: NextRequest,
  orgId: string | null | undefined,
  config: RateLimitConfig
): Promise<NextResponse | null> {
  const key = `${config.keyPrefix}:${getIdentifier(request, orgId)}`;
  const supabase = getSupabase();

  if (!supabase) {
    // No Supabase config — fall back to in-memory
    const allowed = checkFallback(key, config);
    if (!allowed) {
      const win = fallbackWindows.get(key);
      return build429(config, win?.resetAt ?? Date.now() + config.windowSecs * 1000);
    }
    return null;
  }

  try {
    const { data, error } = await supabase.rpc('increment_rate_limit', {
      p_key:        key,
      p_window_sec: config.windowSecs,
      p_max:        config.max,
    });

    if (error) {
      // RPC not yet available (migration not run) — degrade to in-memory
      console.warn('[rate-limit] RPC unavailable, using in-memory fallback:', error.message);
      const allowed = checkFallback(key, config);
      if (!allowed) {
        const win = fallbackWindows.get(key);
        return build429(config, win?.resetAt ?? Date.now() + config.windowSecs * 1000);
      }
      return null;
    }

    const row = Array.isArray(data) ? data[0] : data;
    if (!row) return null; // unexpected — fail open

    if (!row.allowed) {
      return build429(config, new Date(row.window_end).getTime());
    }

    return null;
  } catch (err) {
    // Network / unexpected error — fail open (don't block legitimate traffic)
    console.warn('[rate-limit] Unexpected error, failing open:', err);
    return null;
  }
}

/**
 * Legacy synchronous wrapper for callers on '@/lib/rate-limit'
 * (analytics, ocr, reports, deforestation-check, cron/document-expiry, farmer-login).
 *
 * Uses the in-memory fallback only to remain synchronous.
 * Migrate these callers to `await checkRateLimit(...)` to get Supabase-backed limiting.
 */
export function checkRateLimitLegacy(
  request: NextRequest,
  config: LegacyRateLimitConfig,
  userId?: string
): { limited: boolean; response?: NextResponse } {
  const preset: RateLimitConfig = {
    max:        config.maxRequests,
    windowSecs: Math.ceil(config.windowMs / 1000),
    keyPrefix:  'lgc',
  };
  const key = `${preset.keyPrefix}:${getIdentifier(request, userId)}`;
  const allowed = checkFallback(key, preset);
  if (!allowed) {
    const win = fallbackWindows.get(key);
    return {
      limited: true,
      response: build429(preset, win?.resetAt ?? Date.now() + preset.windowSecs * 1000),
    };
  }
  return { limited: false };
}
