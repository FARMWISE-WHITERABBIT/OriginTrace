import { NextRequest, NextResponse } from 'next/server';

// ---------------------------------------------------------------------------
// Single canonical rate limiter for all OriginTrace API routes
// In-process (per dyno) — acceptable for current scale.
// Swap store for Redis when running multiple instances.
// ---------------------------------------------------------------------------

interface RateWindow {
  count: number;
  resetAt: number;
}

const windows = new Map<string, RateWindow>();

// Clean up expired windows every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, win] of windows.entries()) {
    if (win.resetAt < now) windows.delete(key);
  }
}, 5 * 60 * 1000);

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
  deforestationCheck: { max: 20, windowSecs: 60, keyPrefix: 'def' },
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

function getIdentifier(request: NextRequest, orgId?: string | null): string {
  const ip =
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    'unknown';
  return orgId ? `${orgId}:${ip}` : ip;
}

/**
 * Primary rate-limit check. Returns a 429 NextResponse if exceeded, null otherwise.
 * Usage: const limited = checkRateLimit(req, orgId, RATE_LIMIT_PRESETS.ocr);
 *        if (limited) return limited;
 */
export function checkRateLimit(
  request: NextRequest,
  orgId: string | null | undefined,
  config: RateLimitConfig
): NextResponse | null {
  const key = `${config.keyPrefix}:${getIdentifier(request, orgId)}`;
  const now = Date.now();
  const windowMs = config.windowSecs * 1000;

  let win = windows.get(key);
  if (!win || win.resetAt < now) {
    win = { count: 0, resetAt: now + windowMs };
    windows.set(key, win);
  }

  win.count++;

  if (win.count > config.max) {
    const retryAfter = Math.ceil((win.resetAt - now) / 1000);
    return NextResponse.json(
      { error: 'Rate limit exceeded', retryAfterSeconds: retryAfter },
      {
        status: 429,
        headers: {
          'X-RateLimit-Limit':     String(config.max),
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset':     String(Math.floor(win.resetAt / 1000)),
          'Retry-After':           String(retryAfter),
        },
      }
    );
  }

  return null;
}

/**
 * Legacy-compatible wrapper for callers using the { windowMs, maxRequests } shape.
 * Returns { limited: boolean; response?: NextResponse }
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
  const response = checkRateLimit(request, userId ?? null, preset);
  return response ? { limited: true, response } : { limited: false };
}
