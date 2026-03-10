/**
 * Session 3 Regression Tests
 *
 * Covers every deliverable from this session:
 *   1. lib/api/errors.ts — ApiError factory methods
 *   2. lib/api/validation.ts parseQuery — URL search params validation
 *   3. lib/types/organization.ts — OrganizationSettings interface and helpers
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { z } from 'zod';

// ---------------------------------------------------------------------------
// 1. ApiError factory
// ---------------------------------------------------------------------------

describe('ApiError — response shapes', () => {
  let ApiError: typeof import('@/lib/api/errors').ApiError;

  beforeEach(async () => {
    const mod = await import('@/lib/api/errors');
    ApiError = mod.ApiError;
  });

  // ── badRequest ──────────────────────────────────────────────────────────

  it('badRequest returns 400 with error message', async () => {
    const res = ApiError.badRequest('farm_id is required');
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe('farm_id is required');
  });

  it('badRequest includes details when provided', async () => {
    const res = ApiError.badRequest('Validation failed', { name: ['Required'] });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.details).toEqual({ name: ['Required'] });
  });

  // ── validation ───────────────────────────────────────────────────────────

  it('validation formats ZodError into 400 with field errors', async () => {
    const schema = z.object({ name: z.string().min(1), age: z.number() });
    const result = schema.safeParse({ name: '', age: 'not-a-number' });
    expect(result.success).toBe(false);
    if (!result.success) {
      const res = ApiError.validation(result.error);
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error).toBe('Validation failed');
      expect(body.details).toBeDefined();
      expect(typeof body.details).toBe('object');
    }
  });

  // ── unauthorized ─────────────────────────────────────────────────────────

  it('unauthorized returns 401 with default message', async () => {
    const res = ApiError.unauthorized();
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBe('Unauthorized');
  });

  it('unauthorized returns 401 with custom message', async () => {
    const res = ApiError.unauthorized('Token expired');
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBe('Token expired');
  });

  // ── forbidden ────────────────────────────────────────────────────────────

  it('forbidden returns 403', async () => {
    const res = ApiError.forbidden();
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error).toBe('Forbidden');
  });

  it('forbidden returns 403 with custom message', async () => {
    const res = ApiError.forbidden('Admin access required');
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error).toBe('Admin access required');
  });

  // ── notFound ─────────────────────────────────────────────────────────────

  it('notFound returns 404 with resource name in message', async () => {
    const res = ApiError.notFound('Farm');
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error).toBe('Farm not found');
  });

  it('notFound uses "Resource" as default', async () => {
    const res = ApiError.notFound();
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error).toBe('Resource not found');
  });

  // ── conflict ─────────────────────────────────────────────────────────────

  it('conflict returns 409', async () => {
    const res = ApiError.conflict('Serial number already exists');
    expect(res.status).toBe(409);
    const body = await res.json();
    expect(body.error).toBe('Serial number already exists');
  });

  // ── rateLimited ──────────────────────────────────────────────────────────

  it('rateLimited returns 429', async () => {
    const res = ApiError.rateLimited();
    expect(res.status).toBe(429);
    const body = await res.json();
    expect(body.error).toBe('Rate limit exceeded');
  });

  it('rateLimited sets Retry-After header when seconds provided', async () => {
    const res = ApiError.rateLimited(60);
    expect(res.status).toBe(429);
    expect(res.headers.get('Retry-After')).toBe('60');
  });

  // ── internal ─────────────────────────────────────────────────────────────

  it('internal returns 500', async () => {
    const res = ApiError.internal();
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toBeTruthy();
  });

  it('internal does not expose raw error message in production', async () => {
    vi.stubEnv('NODE_ENV', 'production');

    // Re-import after stubbing so the module sees the production env
    vi.resetModules();
    const { ApiError: ProdApiError } = await import('@/lib/api/errors');

    const res = ProdApiError.internal(new Error('SELECT * FROM secrets'));
    const body = await res.json();
    expect(body.error).not.toContain('SELECT');
    expect(body.error).toBe('An unexpected error occurred');

    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it('internal logs the error to stderr', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    ApiError.internal(new Error('test error'), 'farms/GET');
    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  // ── serviceUnavailable ───────────────────────────────────────────────────

  it('serviceUnavailable returns 503', async () => {
    const res = ApiError.serviceUnavailable();
    expect(res.status).toBe(503);
  });

  it('serviceUnavailable uses custom message', async () => {
    const res = ApiError.serviceUnavailable('Database is unavailable');
    const body = await res.json();
    expect(body.error).toBe('Database is unavailable');
  });
});

// ---------------------------------------------------------------------------
// 2. withErrorHandling wrapper
// ---------------------------------------------------------------------------

describe('withErrorHandling', () => {
  it('returns the handler response when no error is thrown', async () => {
    const { withErrorHandling } = await import('@/lib/api/errors');
    const { NextRequest, NextResponse } = await import('next/server');

    const handler = withErrorHandling(async () => {
      return NextResponse.json({ ok: true }, { status: 200 });
    });

    const req = new NextRequest('http://localhost/api/test');
    const res = await handler(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
  });

  it('catches thrown errors and returns 500', async () => {
    const { withErrorHandling } = await import('@/lib/api/errors');
    const { NextRequest } = await import('next/server');

    const handler = withErrorHandling(async () => {
      throw new Error('something went wrong');
    }, 'test/context');

    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const req = new NextRequest('http://localhost/api/test');
    const res = await handler(req);
    expect(res.status).toBe(500);
    consoleSpy.mockRestore();
  });
});

// ---------------------------------------------------------------------------
// 3. parseQuery — URL search params validation
// ---------------------------------------------------------------------------

describe('parseQuery', () => {
  let parseQuery: typeof import('@/lib/api/validation').parseQuery;

  beforeEach(async () => {
    const mod = await import('@/lib/api/validation');
    parseQuery = mod.parseQuery;
  });

  const testSchema = z.object({
    status: z.enum(['pending', 'approved', 'rejected']).optional(),
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(50),
    farm_id: z.string().uuid().optional(),
  });

  it('parses valid query params and returns typed data', () => {
    const params = new URLSearchParams('status=approved&page=2&limit=25');
    const { data, error } = parseQuery(params, testSchema);
    expect(error).toBeNull();
    expect(data).not.toBeNull();
    expect(data!.status).toBe('approved');
    expect(data!.page).toBe(2);
    expect(data!.limit).toBe(25);
  });

  it('applies schema defaults for missing optional params', () => {
    const params = new URLSearchParams('');
    const { data, error } = parseQuery(params, testSchema);
    expect(error).toBeNull();
    expect(data!.page).toBe(1);
    expect(data!.limit).toBe(50);
    expect(data!.status).toBeUndefined();
  });

  it('returns 400 error response for invalid enum value', async () => {
    const params = new URLSearchParams('status=invalid_value');
    const { data, error } = parseQuery(params, testSchema);
    expect(data).toBeNull();
    expect(error).not.toBeNull();
    expect(error!.status).toBe(400);
    const body = await error!.json();
    expect(body.error).toBe('Invalid query parameters');
    expect(body.details).toBeDefined();
  });

  it('returns 400 for UUID field with invalid UUID', async () => {
    const params = new URLSearchParams('farm_id=not-a-uuid');
    const { data, error } = parseQuery(params, testSchema);
    expect(data).toBeNull();
    expect(error!.status).toBe(400);
  });

  it('returns 400 for out-of-range numeric value', async () => {
    const params = new URLSearchParams('limit=999');
    const { data, error } = parseQuery(params, testSchema);
    expect(data).toBeNull();
    expect(error!.status).toBe(400);
  });

  it('coerces numeric string to number', () => {
    const params = new URLSearchParams('page=3');
    const { data } = parseQuery(params, testSchema);
    expect(typeof data!.page).toBe('number');
    expect(data!.page).toBe(3);
  });

  it('handles empty URLSearchParams without error', () => {
    const params = new URLSearchParams();
    const { data, error } = parseQuery(params, z.object({
      name: z.string().optional(),
    }));
    expect(error).toBeNull();
    expect(data!.name).toBeUndefined();
  });

  it('last value wins for repeated query params', () => {
    const params = new URLSearchParams('status=pending&status=approved');
    const { data, error } = parseQuery(params, testSchema);
    expect(error).toBeNull();
    // last value wins
    expect(data!.status).toBe('approved');
  });
});

// ---------------------------------------------------------------------------
// 4. OrganizationSettings interface and getOrgSettings helper
// ---------------------------------------------------------------------------

describe('OrganizationSettings / getOrgSettings', () => {
  let getOrgSettings: typeof import('@/lib/types/organization').getOrgSettings;

  beforeEach(async () => {
    const mod = await import('@/lib/types/organization');
    getOrgSettings = mod.getOrgSettings;
  });

  it('returns empty object when org is null', () => {
    expect(getOrgSettings(null)).toEqual({});
  });

  it('returns empty object when org is undefined', () => {
    expect(getOrgSettings(undefined)).toEqual({});
  });

  it('returns empty object when org.settings is null', () => {
    expect(getOrgSettings({ settings: null })).toEqual({});
  });

  it('returns empty object when org.settings is a string (invalid JSONB)', () => {
    expect(getOrgSettings({ settings: 'starter' })).toEqual({});
  });

  it('returns empty object when org.settings is a number', () => {
    expect(getOrgSettings({ settings: 42 })).toEqual({});
  });

  it('returns typed settings when org.settings is a valid object', () => {
    const org = {
      settings: {
        subscription_tier: 'pro' as const,
        feature_flags: { dds_export: true },
        agent_seat_limit: 20,
        monthly_collection_limit: 5000,
      },
    };
    const settings = getOrgSettings(org);
    expect(settings.subscription_tier).toBe('pro');
    expect(settings.feature_flags?.dds_export).toBe(true);
    expect(settings.agent_seat_limit).toBe(20);
    expect(settings.monthly_collection_limit).toBe(5000);
  });

  it('allows access to validation flags', () => {
    const org = {
      settings: {
        require_polygon: true,
        require_national_id: false,
        require_land_deed: true,
      },
    };
    const settings = getOrgSettings(org);
    expect(settings.require_polygon).toBe(true);
    expect(settings.require_national_id).toBe(false);
    expect(settings.require_land_deed).toBe(true);
  });

  it('returns empty object for empty settings object', () => {
    const settings = getOrgSettings({ settings: {} });
    expect(settings.subscription_tier).toBeUndefined();
    expect(settings.feature_flags).toBeUndefined();
  });

  it('preserves unknown keys via index signature', () => {
    const org = { settings: { future_field: 'some_value', subscription_tier: 'basic' as const } };
    const settings = getOrgSettings(org);
    expect(settings['future_field']).toBe('some_value');
    expect(settings.subscription_tier).toBe('basic');
  });
});

// ---------------------------------------------------------------------------
// 5. parseBody still works (non-regression)
// ---------------------------------------------------------------------------

describe('parseBody (non-regression)', () => {
  it('parses valid body', async () => {
    const { parseBody } = await import('@/lib/api/validation');
    const schema = z.object({ name: z.string().min(1) });
    const { data, error } = parseBody(schema, { name: 'Cocoa Farm A' });
    expect(error).toBeNull();
    expect(data!.name).toBe('Cocoa Farm A');
  });

  it('returns 400 for invalid body', async () => {
    const { parseBody } = await import('@/lib/api/validation');
    const schema = z.object({ name: z.string().min(1) });
    const { data, error } = parseBody(schema, { name: '' });
    expect(data).toBeNull();
    expect(error!.status).toBe(400);
  });
});
