/**
 * app/api/_shared/route-helpers/with-rate-limit.ts
 *
 * Higher-order function that applies a rate-limit check before calling
 * the handler. Returns 429 if the limit is exceeded.
 *
 * Usage:
 *   import { RATE_LIMIT_PRESETS } from '@/lib/api/rate-limit';
 *
 *   export const POST = withRateLimit(
 *     RATE_LIMIT_PRESETS.ocr,
 *     async (request) => { ... }
 *   );
 *
 * Compose with withAuth (rate-limit fires first, before auth overhead):
 *   export const POST = withRateLimit(
 *     RATE_LIMIT_PRESETS.general,
 *     withAuth(async (request, { profile }) => { ... }),
 *   );
 */

import { NextRequest, NextResponse } from 'next/server';
import { checkRateLimit, type RateLimitConfig } from '@/lib/api/rate-limit';

type AnyHandler = (request: NextRequest, ctx?: unknown) => Promise<NextResponse>;

export function withRateLimit(config: RateLimitConfig, handler: AnyHandler): AnyHandler {
  return async (request: NextRequest, ctx?: unknown): Promise<NextResponse> => {
    // Extract org_id from auth header if available, for per-org keying.
    // withAuth runs later so we do a lightweight header inspection only.
    const orgId: string | null = null; // keyed by IP only at this layer

    const limited = await checkRateLimit(request, orgId, config);
    if (limited) return limited;

    return handler(request, ctx);
  };
}
