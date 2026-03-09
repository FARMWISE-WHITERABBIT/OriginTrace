import { NextRequest, NextResponse } from 'next/server';

// ---------------------------------------------------------------------------
// Simple in-process rate limiter (process-local — use Redis for multi-instance)
// For deforestation-check, OCR, analytics — all high-cost external API calls
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

export const RATE_LIMIT_PRESETS = {
  /** Deforestation check — calls Global Forest Watch API, expensive */
  deforestationCheck: { max: 20, windowSecs: 60, keyPrefix: 'def' },
  /** OCR — calls OpenAI Vision API, expensive */
  ocr: { max: 10, windowSecs: 60, keyPrefix: 'ocr' },
  /** Analytics — large DB fan-out */
  analytics: { max: 60, windowSecs: 60, keyPrefix: 'anl' },
  /** General API routes */
  general: { max: 120, windowSecs: 60, keyPrefix: 'gen' },
} as const;

/**
 * Returns a 429 NextResponse if rate limit exceeded, otherwise null.
 * Key = keyPrefix + orgId (or IP if no orgId).
 */
export function checkRateLimit(
  request: NextRequest,
  orgId: string | null,
  config: RateLimitConfig
): NextResponse | null {
  const identifier = orgId || request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
  const key = `${config.keyPrefix}:${identifier}`;
  const now = Date.now();
  const windowMs = config.windowSecs * 1000;

  let win = windows.get(key);
  if (!win || win.resetAt < now) {
    win = { count: 0, resetAt: now + windowMs };
    windows.set(key, win);
  }

  win.count++;

  const remaining = Math.max(0, config.max - win.count);
  const retryAfter = Math.ceil((win.resetAt - now) / 1000);

  if (win.count > config.max) {
    return NextResponse.json(
      { error: 'Rate limit exceeded', retryAfterSeconds: retryAfter },
      {
        status: 429,
        headers: {
          'X-RateLimit-Limit': String(config.max),
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': String(Math.floor(win.resetAt / 1000)),
          'Retry-After': String(retryAfter),
        },
      }
    );
  }

  return null;
}
