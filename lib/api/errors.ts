/**
 * Standardised API error responses for OriginTrace API routes.
 *
 * Before this file, 116 routes returned { error: 'Internal server error' }
 * via ad-hoc NextResponse.json calls with no consistency. This module
 * provides a single, typed error surface that:
 *   - Enforces consistent error shapes across all routes
 *   - Prevents accidental leakage of raw error messages in production
 *   - Makes error responses grep-able and testable
 *
 * Usage:
 *   import { ApiError } from '@/lib/api/errors';
 *
 *   // In a catch block:
 *   return ApiError.internal(error);
 *
 *   // For explicit errors:
 *   return ApiError.notFound('Farm');
 *   return ApiError.forbidden();
 *   return ApiError.badRequest('farm_id is required');
 */

import { NextResponse } from 'next/server';
import { ZodError } from 'zod';

// ---------------------------------------------------------------------------
// Response shape
// Every error response from OriginTrace API has this structure.
// ---------------------------------------------------------------------------
export interface ApiErrorBody {
  error: string;
  details?: Record<string, string[]> | string;
  code?: string;
}

// ---------------------------------------------------------------------------
// ApiError — static factory for all standard error responses
// ---------------------------------------------------------------------------
export const ApiError = {
  /**
   * 400 Bad Request — malformed input, missing required fields, etc.
   */
  badRequest(message: string, details?: Record<string, string[]>): NextResponse<ApiErrorBody> {
    return NextResponse.json(
      { error: message, ...(details ? { details } : {}) },
      { status: 400 }
    );
  },

  /**
   * 400 Bad Request — automatically formats a ZodError into field errors.
   */
  validation(error: ZodError): NextResponse<ApiErrorBody> {
    return NextResponse.json(
      {
        error: 'Validation failed',
        details: error.flatten().fieldErrors as Record<string, string[]>,
      },
      { status: 400 }
    );
  },

  /**
   * 401 Unauthorized — no valid session or token.
   */
  unauthorized(message = 'Unauthorized'): NextResponse<ApiErrorBody> {
    return NextResponse.json({ error: message }, { status: 401 });
  },

  /**
   * 403 Forbidden — authenticated but not allowed.
   */
  forbidden(message = 'Forbidden'): NextResponse<ApiErrorBody> {
    return NextResponse.json({ error: message }, { status: 403 });
  },

  /**
   * 404 Not Found.
   * @param resource - human-readable resource name, e.g. 'Farm', 'Batch'
   */
  notFound(resource = 'Resource'): NextResponse<ApiErrorBody> {
    return NextResponse.json(
      { error: `${resource} not found` },
      { status: 404 }
    );
  },

  /**
   * 409 Conflict — e.g. duplicate unique constraint.
   */
  conflict(message: string): NextResponse<ApiErrorBody> {
    return NextResponse.json({ error: message }, { status: 409 });
  },

  /**
   * 429 Too Many Requests.
   */
  rateLimited(retryAfterSeconds?: number): NextResponse<ApiErrorBody> {
    const headers = retryAfterSeconds
      ? { 'Retry-After': String(retryAfterSeconds) }
      : undefined;
    return NextResponse.json(
      { error: 'Rate limit exceeded' },
      { status: 429, headers }
    );
  },

  /**
   * 500 Internal Server Error.
   *
   * In production: returns a generic message (no raw error exposure).
   * In development: includes the error message for debugging.
   *
   * Always logs the original error to stderr for Sentry/log ingestion.
   */
  internal(error?: unknown, context?: string): NextResponse<ApiErrorBody> {
    const label = context ? `[${context}]` : '[API]';

    if (error instanceof Error) {
      console.error(`${label} Internal error:`, error.message, error.stack);
    } else if (error !== undefined) {
      console.error(`${label} Internal error:`, error);
    }

    const isDev = process.env.NODE_ENV === 'development';
    const message =
      isDev && error instanceof Error
        ? error.message
        : 'An unexpected error occurred';

    return NextResponse.json({ error: message }, { status: 500 });
  },

  /**
   * 503 Service Unavailable — Supabase not configured, downstream service down.
   */
  serviceUnavailable(message = 'Service temporarily unavailable'): NextResponse<ApiErrorBody> {
    return NextResponse.json({ error: message }, { status: 503 });
  },
} as const;

// ---------------------------------------------------------------------------
// Convenience: wrap an entire route handler with automatic 500 catching.
//
// Usage:
//   export const GET = withErrorHandling(async (request) => {
//     // ... handler logic
//   }, 'farms/GET');
// ---------------------------------------------------------------------------
import { NextRequest } from 'next/server';

type RouteHandler = (request: NextRequest, ctx?: unknown) => Promise<NextResponse>;

export function withErrorHandling(handler: RouteHandler, context?: string): RouteHandler {
  return async (request: NextRequest, ctx?: unknown) => {
    try {
      return await handler(request, ctx);
    } catch (error) {
      return ApiError.internal(error, context);
    }
  };
}
