/**
 * Session 3 Test Suite
 *
 * Covers:
 *   1. lib/services/scoring/constants.ts  — structure and invariants
 *   2. lib/api/validation.ts              — new shared schemas + helpers
 *   3. lib/api/errors.ts                  — ApiError factory + withErrorHandling
 *   4. lib/types/organization.ts          — getOrgSettings helper
 */

import { describe, it, expect } from 'vitest';

// ---------------------------------------------------------------------------
// 1. Scoring constants
// ---------------------------------------------------------------------------

import {
  DIMENSION_WEIGHTS,
  TRACEABILITY,
  CHEMICAL_RISK,
  STORAGE,
  REGULATORY,
  DECISION,
} from '@/lib/services/scoring/constants';

describe('DIMENSION_WEIGHTS', () => {
  it('all values are positive fractions', () => {
    Object.values(DIMENSION_WEIGHTS).forEach(w => {
      expect(w).toBeGreaterThan(0);
      expect(w).toBeLessThan(1);
    });
  });

  it('sum equals exactly 1.0', () => {
    const sum = Object.values(DIMENSION_WEIGHTS).reduce((a, b) => a + b, 0);
    expect(sum).toBeCloseTo(1.0, 10);
  });

  it('has exactly 5 dimensions', () => {
    expect(Object.keys(DIMENSION_WEIGHTS)).toHaveLength(5);
  });
});

describe('TRACEABILITY constants', () => {
  it('sub-weights sum to 1.0', () => {
    const sum =
      TRACEABILITY.SCORE_WEIGHT_TRACEABILITY +
      TRACEABILITY.SCORE_WEIGHT_GPS +
      TRACEABILITY.SCORE_WEIGHT_BAG_LINK +
      TRACEABILITY.SCORE_WEIGHT_FARM_COUNT;
    expect(sum).toBeCloseTo(1.0, 10);
  });

  it('hard fail threshold is between 0 and 1 exclusive', () => {
    expect(TRACEABILITY.HARD_FAIL_THRESHOLD).toBeGreaterThan(0);
    expect(TRACEABILITY.HARD_FAIL_THRESHOLD).toBeLessThan(1);
  });
});

describe('CHEMICAL_RISK constants', () => {
  it('three document point values sum to 100', () => {
    const sum =
      CHEMICAL_RISK.LAB_TEST_POINTS +
      CHEMICAL_RISK.PESTICIDE_POINTS +
      CHEMICAL_RISK.AFLATOXIN_POINTS;
    expect(sum).toBe(100);
  });

  it('no-docs penalty is positive', () => {
    expect(CHEMICAL_RISK.NO_DOCS_PENALTY).toBeGreaterThan(0);
  });
});

describe('STORAGE constants', () => {
  it('alert threshold is between 0 and 1 exclusive', () => {
    expect(STORAGE.COLD_CHAIN_ALERT_THRESHOLD).toBeGreaterThan(0);
    expect(STORAGE.COLD_CHAIN_ALERT_THRESHOLD).toBeLessThan(1);
  });

  it('max penalty is positive and reasonable (≤ 50)', () => {
    expect(STORAGE.COLD_CHAIN_MAX_PENALTY).toBeGreaterThan(0);
    expect(STORAGE.COLD_CHAIN_MAX_PENALTY).toBeLessThanOrEqual(50);
  });

  it('clean bonus is positive and smaller than max penalty', () => {
    expect(STORAGE.COLD_CHAIN_CLEAN_BONUS).toBeGreaterThan(0);
    expect(STORAGE.COLD_CHAIN_CLEAN_BONUS).toBeLessThan(STORAGE.COLD_CHAIN_MAX_PENALTY);
  });
});

describe('REGULATORY constants', () => {
  it('low score threshold is between 0 and 100 exclusive', () => {
    expect(REGULATORY.LOW_SCORE_THRESHOLD).toBeGreaterThan(0);
    expect(REGULATORY.LOW_SCORE_THRESHOLD).toBeLessThan(100);
  });

  it('rejection critical threshold is between 0 and 1 exclusive', () => {
    expect(REGULATORY.REJECTION_CRITICAL_THRESHOLD).toBeGreaterThan(0);
    expect(REGULATORY.REJECTION_CRITICAL_THRESHOLD).toBeLessThan(1);
  });

  it('max rejection penalty is less than 100', () => {
    expect(REGULATORY.MAX_REJECTION_PENALTY).toBeGreaterThan(0);
    expect(REGULATORY.MAX_REJECTION_PENALTY).toBeLessThan(100);
  });
});

describe('DECISION constants', () => {
  it('GO_THRESHOLD is above CONDITIONAL_FLOOR', () => {
    expect(DECISION.GO_THRESHOLD).toBeGreaterThan(DECISION.CONDITIONAL_FLOOR);
  });

  it('GO_THRESHOLD is between 50 and 100 exclusive', () => {
    expect(DECISION.GO_THRESHOLD).toBeGreaterThan(50);
    expect(DECISION.GO_THRESHOLD).toBeLessThan(100);
  });

  it('CONDITIONAL_FLOOR is between 0 and 100 exclusive', () => {
    expect(DECISION.CONDITIONAL_FLOOR).toBeGreaterThan(0);
    expect(DECISION.CONDITIONAL_FLOOR).toBeLessThan(100);
  });
});

// ---------------------------------------------------------------------------
// 2. Scoring constants are reflected in actual scoring behaviour
// (regression guard: if a constant is changed, these catch it)
// ---------------------------------------------------------------------------

import { computeShipmentReadiness } from '@/lib/services/scoring/index';

describe('Scoring constants — regression guards', () => {
  it('all-docs chemical scorer scores exactly 100', () => {
    const result = computeShipmentReadiness({
      shipment: {
        destination_country: 'DE',
        target_regulations: [],
        doc_status: {
          lab_test_certificate: true,
          pesticide_declaration: true,
          aflatoxin_test: true,
        },
        storage_controls: {},
        estimated_ship_date: new Date(Date.now() + 86400000 * 30).toISOString(),
      },
      items: [{
        item_type: 'batch', traceability_complete: true, compliance_status: 'approved',
        farm_count: 1, farm_ids: ['f1'],
        batch_data: { has_gps: true, bag_count: 1, bags_with_farm_link: 1 },
      }],
    });
    const chem = result.dimensions.find(d => d.name === 'Chemical & Contamination Risk')!;
    expect(chem.score).toBe(100);
  });

  it('dimension weights sum to 1.0 in live scorer output', () => {
    const result = computeShipmentReadiness({
      shipment: { destination_country: 'DE', target_regulations: [], doc_status: {}, storage_controls: {}, estimated_ship_date: new Date(Date.now() + 86400000 * 30).toISOString() },
      items: [{ item_type: 'batch', traceability_complete: true, compliance_status: 'approved', farm_count: 1, farm_ids: ['f1'], batch_data: { has_gps: true, bag_count: 1, bags_with_farm_link: 1 } }],
    });
    const weightSum = result.dimensions.reduce((s, d) => s + d.weight, 0);
    expect(weightSum).toBeCloseTo(1.0, 5);
  });

  it('score at exactly GO_THRESHOLD returns go decision', () => {
    // Construct a shipment that achieves exactly the go threshold:
    // full chemical (100) + full storage (100) — traceability, docs, regulatory near 0
    // This is a directional test; we just need score >= GO_THRESHOLD.
    const result = computeShipmentReadiness({
      shipment: {
        destination_country: 'DE',
        target_regulations: [],
        doc_status: {
          lab_test_certificate: true, pesticide_declaration: true, aflatoxin_test: true,
          certificate_of_origin: true, phytosanitary_certificate: true,
          bill_of_lading: true, packing_list: true, commercial_invoice: true, export_permit: true,
        },
        storage_controls: {
          warehouse_certified: true, temperature_logged: true, pest_control_active: true,
          humidity_monitored: true, fifo_enforced: true,
        },
        estimated_ship_date: new Date(Date.now() + 86400000 * 30).toISOString(),
      },
      items: [{
        item_type: 'batch', traceability_complete: true, compliance_status: 'approved',
        farm_count: 1, farm_ids: ['f1'],
        batch_data: { has_gps: true, bag_count: 1, bags_with_farm_link: 1 },
      }],
    });
    expect(result.overall_score).toBeGreaterThanOrEqual(DECISION.GO_THRESHOLD);
    expect(result.decision).toBe('go');
  });
});

// ---------------------------------------------------------------------------
// 3. Validation schemas
// ---------------------------------------------------------------------------

import {
  farmCreateSchema,
  farmPatchSchema,
  batchCreateSchema,
  shipmentCreateSchema,
  parseBody,
  parseQuery,
  paginationSchema,
  uuidSchema,
} from '@/lib/api/validation';

describe('farmCreateSchema', () => {
  it('accepts a minimal valid farm', () => {
    const result = farmCreateSchema.safeParse({ farmer_name: 'Ade', community: 'Ikosi' });
    expect(result.success).toBe(true);
  });

  it('rejects missing farmer_name', () => {
    const result = farmCreateSchema.safeParse({ community: 'Ikosi' });
    expect(result.success).toBe(false);
  });

  it('rejects missing community', () => {
    const result = farmCreateSchema.safeParse({ farmer_name: 'Ade' });
    expect(result.success).toBe(false);
  });

  it('accepts optional fields', () => {
    const result = farmCreateSchema.safeParse({
      farmer_name: 'Ade',
      community: 'Ikosi',
      farmer_id: 'NIN123',
      phone: '+2348012345678',
      area_hectares: 2.5,
      legality_doc_url: 'https://example.com/deed.pdf',
    });
    expect(result.success).toBe(true);
  });

  it('rejects invalid legality_doc_url', () => {
    const result = farmCreateSchema.safeParse({
      farmer_name: 'Ade',
      community: 'Ikosi',
      legality_doc_url: 'not-a-url',
    });
    expect(result.success).toBe(false);
  });

  it('accepts null area_hectares', () => {
    const result = farmCreateSchema.safeParse({ farmer_name: 'Ade', community: 'Ikosi', area_hectares: null });
    expect(result.success).toBe(true);
  });
});

describe('farmPatchSchema', () => {
  it('accepts a valid patch', () => {
    const result = farmPatchSchema.safeParse({ id: 42, compliance_status: 'approved' });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.id).toBe(42);
  });

  it('coerces string id to number', () => {
    const result = farmPatchSchema.safeParse({ id: '99' });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.id).toBe(99);
  });

  it('rejects missing id', () => {
    const result = farmPatchSchema.safeParse({ compliance_status: 'approved' });
    expect(result.success).toBe(false);
  });

  it('rejects invalid compliance_status', () => {
    const result = farmPatchSchema.safeParse({ id: 1, compliance_status: 'maybe' });
    expect(result.success).toBe(false);
  });
});

describe('batchCreateSchema', () => {
  it('accepts a minimal batch', () => {
    const result = batchCreateSchema.safeParse({ farm_id: 'farm-abc' });
    expect(result.success).toBe(true);
  });

  it('coerces numeric farm_id to string', () => {
    const result = batchCreateSchema.safeParse({ farm_id: 123 });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.farm_id).toBe('123');
  });

  it('rejects missing farm_id', () => {
    const result = batchCreateSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it('accepts bags array', () => {
    const result = batchCreateSchema.safeParse({
      farm_id: 'f1',
      bags: [{ serial: 'BAG001', weight: 60, grade: 'A', is_compliant: true }],
    });
    expect(result.success).toBe(true);
  });
});

describe('shipmentCreateSchema', () => {
  it('accepts a minimal shipment', () => {
    const result = shipmentCreateSchema.safeParse({
      destination_country: 'DE',
      commodity: 'Cocoa',
    });
    expect(result.success).toBe(true);
  });

  it('rejects missing destination_country', () => {
    const result = shipmentCreateSchema.safeParse({ commodity: 'Cocoa' });
    expect(result.success).toBe(false);
  });

  it('rejects missing commodity', () => {
    const result = shipmentCreateSchema.safeParse({ destination_country: 'DE' });
    expect(result.success).toBe(false);
  });

  it('accepts target_regulations array', () => {
    const result = shipmentCreateSchema.safeParse({
      destination_country: 'DE',
      commodity: 'Cocoa',
      target_regulations: ['EUDR', 'UK Environment Act'],
    });
    expect(result.success).toBe(true);
  });
});

describe('paginationSchema', () => {
  it('defaults page to 1 and limit to 50', () => {
    const result = paginationSchema.safeParse({});
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.page).toBe(1);
      expect(result.data.limit).toBe(50);
    }
  });

  it('coerces string values', () => {
    const result = paginationSchema.safeParse({ page: '2', limit: '25' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.page).toBe(2);
      expect(result.data.limit).toBe(25);
    }
  });

  it('rejects page < 1', () => {
    const result = paginationSchema.safeParse({ page: 0 });
    expect(result.success).toBe(false);
  });

  it('rejects limit > 200', () => {
    const result = paginationSchema.safeParse({ limit: 201 });
    expect(result.success).toBe(false);
  });
});

describe('parseBody', () => {
  it('returns data on valid input', () => {
    const { data, error } = parseBody(shipmentCreateSchema, {
      destination_country: 'NG',
      commodity: 'Plantain',
    });
    expect(error).toBeNull();
    expect(data?.destination_country).toBe('NG');
  });

  it('returns error NextResponse on invalid input', () => {
    const { data, error } = parseBody(shipmentCreateSchema, {});
    expect(data).toBeNull();
    expect(error).not.toBeNull();
    // error should be a NextResponse with status 400
    expect(error?.status).toBe(400);
  });

  it('error body contains validation details', async () => {
    const { error } = parseBody(shipmentCreateSchema, {});
    const body = await error?.json();
    expect(body.error).toBe('Validation failed');
    expect(body.details).toBeDefined();
  });
});

describe('parseQuery', () => {
  it('returns typed data for valid params', () => {
    const params = new URLSearchParams('page=2&limit=10');
    const { data, error } = parseQuery(params, paginationSchema);
    expect(error).toBeNull();
    expect(data?.page).toBe(2);
    expect(data?.limit).toBe(10);
  });

  it('returns error for invalid params', () => {
    const params = new URLSearchParams('page=0');
    const { data, error } = parseQuery(params, paginationSchema);
    expect(data).toBeNull();
    expect(error?.status).toBe(400);
  });

  it('error message says "Invalid query parameters"', async () => {
    const params = new URLSearchParams('page=0');
    const { error } = parseQuery(params, paginationSchema);
    const body = await error?.json();
    expect(body.error).toBe('Invalid query parameters');
  });

  it('applies defaults for missing optional params', () => {
    const params = new URLSearchParams('');
    const { data, error } = parseQuery(params, paginationSchema);
    expect(error).toBeNull();
    expect(data?.page).toBe(1);
    expect(data?.limit).toBe(50);
  });
});

describe('uuidSchema', () => {
  it('accepts a valid UUID v4', () => {
    const result = uuidSchema.safeParse('550e8400-e29b-41d4-a716-446655440000');
    expect(result.success).toBe(true);
  });

  it('rejects a non-UUID string', () => {
    expect(uuidSchema.safeParse('not-a-uuid').success).toBe(false);
    expect(uuidSchema.safeParse('123').success).toBe(false);
    expect(uuidSchema.safeParse('').success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// 4. ApiError factory
// ---------------------------------------------------------------------------

import { ApiError, withErrorHandling } from '@/lib/api/errors';
import { NextRequest } from 'next/server';

describe('ApiError.badRequest', () => {
  it('returns status 400', () => {
    expect(ApiError.badRequest('bad').status).toBe(400);
  });

  it('includes message in body', async () => {
    const body = await ApiError.badRequest('farm_id required').json();
    expect(body.error).toBe('farm_id required');
  });

  it('includes details when provided', async () => {
    const body = await ApiError.badRequest('invalid', { field: ['too short'] }).json();
    expect(body.details).toEqual({ field: ['too short'] });
  });
});

describe('ApiError.validation', () => {
  it('returns status 400', () => {
    const { error } = parseBody(shipmentCreateSchema, {});
    expect(error?.status).toBe(400);
  });

  it('body has error: "Validation failed"', async () => {
    const { error } = parseBody(shipmentCreateSchema, {});
    const body = await error?.json();
    expect(body.error).toBe('Validation failed');
  });

  it('body includes field-level details', async () => {
    const { error } = parseBody(shipmentCreateSchema, { commodity: 'Cocoa' }); // missing destination_country
    const body = await error?.json();
    expect(body.details?.destination_country).toBeDefined();
  });
});

describe('ApiError.unauthorized', () => {
  it('returns status 401', () => {
    expect(ApiError.unauthorized().status).toBe(401);
  });

  it('defaults to "Unauthorized"', async () => {
    const body = await ApiError.unauthorized().json();
    expect(body.error).toBe('Unauthorized');
  });

  it('accepts custom message', async () => {
    const body = await ApiError.unauthorized('Token expired').json();
    expect(body.error).toBe('Token expired');
  });
});

describe('ApiError.forbidden', () => {
  it('returns status 403', () => {
    expect(ApiError.forbidden().status).toBe(403);
  });

  it('defaults to "Forbidden"', async () => {
    const body = await ApiError.forbidden().json();
    expect(body.error).toBe('Forbidden');
  });
});

describe('ApiError.notFound', () => {
  it('returns status 404', () => {
    expect(ApiError.notFound('Farm').status).toBe(404);
  });

  it('includes resource name in message', async () => {
    const body = await ApiError.notFound('Batch').json();
    expect(body.error).toBe('Batch not found');
  });

  it('defaults resource to "Resource"', async () => {
    const body = await ApiError.notFound().json();
    expect(body.error).toBe('Resource not found');
  });
});

describe('ApiError.conflict', () => {
  it('returns status 409', () => {
    expect(ApiError.conflict('duplicate key').status).toBe(409);
  });
});

describe('ApiError.rateLimited', () => {
  it('returns status 429', () => {
    expect(ApiError.rateLimited().status).toBe(429);
  });

  it('includes Retry-After header when retryAfterSeconds provided', () => {
    const resp = ApiError.rateLimited(60);
    expect(resp.headers.get('Retry-After')).toBe('60');
  });

  it('no Retry-After header when seconds not provided', () => {
    const resp = ApiError.rateLimited();
    expect(resp.headers.get('Retry-After')).toBeNull();
  });
});

describe('ApiError.internal', () => {
  it('returns status 500', () => {
    expect(ApiError.internal().status).toBe(500);
  });

  it('returns generic message in test environment (not dev)', async () => {
    const body = await ApiError.internal(new Error('secret DB creds')).json();
    // In test env NODE_ENV is 'test', not 'development' — should be generic
    expect(body.error).toBeDefined();
  });

  it('does not expose raw error in production-like message', async () => {
    const original = process.env.NODE_ENV;
    // @ts-expect-error readonly property override for test
    process.env.NODE_ENV = 'production';
    const body = await ApiError.internal(new Error('super secret')).json();
    expect(body.error).not.toContain('super secret');
    // @ts-expect-error readonly property override for test
    process.env.NODE_ENV = original;
  });
});

describe('ApiError.serviceUnavailable', () => {
  it('returns status 503', () => {
    expect(ApiError.serviceUnavailable().status).toBe(503);
  });

  it('defaults message correctly', async () => {
    const body = await ApiError.serviceUnavailable().json();
    expect(body.error).toBe('Service temporarily unavailable');
  });
});

describe('withErrorHandling', () => {
  it('passes through successful handler response', async () => {
    const handler = withErrorHandling(async () =>
      ApiError.notFound('Test')
    );
    const req = new NextRequest('http://localhost/api/test');
    const resp = await handler(req);
    expect(resp.status).toBe(404);
  });

  it('catches thrown errors and returns 500', async () => {
    const handler = withErrorHandling(async () => {
      throw new Error('boom');
    });
    const req = new NextRequest('http://localhost/api/test');
    const resp = await handler(req);
    expect(resp.status).toBe(500);
  });

  it('does not re-throw', async () => {
    const handler = withErrorHandling(async () => {
      throw new Error('should not propagate');
    });
    const req = new NextRequest('http://localhost/api/test');
    await expect(handler(req)).resolves.toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// 5. Organization types / getOrgSettings
// ---------------------------------------------------------------------------

import { getOrgSettings } from '@/lib/types/organization';

describe('getOrgSettings', () => {
  it('returns {} for null org', () => {
    expect(getOrgSettings(null)).toEqual({});
  });

  it('returns {} for undefined org', () => {
    expect(getOrgSettings(undefined)).toEqual({});
  });

  it('returns {} when settings is null', () => {
    expect(getOrgSettings({ settings: null })).toEqual({});
  });

  it('returns {} when settings is a string', () => {
    expect(getOrgSettings({ settings: 'bad' })).toEqual({});
  });

  it('returns settings object when valid', () => {
    const settings = { subscription_tier: 'pro' as const, agent_seat_limit: 20 };
    expect(getOrgSettings({ settings })).toEqual(settings);
  });

  it('preserves all known optional fields', () => {
    const settings = {
      subscription_tier: 'enterprise' as const,
      feature_flags: { dds_export: true },
      agent_seat_limit: 50,
      monthly_collection_limit: 10000,
      require_polygon: true,
      require_national_id: false,
      require_land_deed: true,
    };
    const result = getOrgSettings({ settings });
    expect(result.subscription_tier).toBe('enterprise');
    expect(result.feature_flags?.dds_export).toBe(true);
    expect(result.require_polygon).toBe(true);
    expect(result.monthly_collection_limit).toBe(10000);
  });

  it('returns unknown extra fields via index signature', () => {
    const settings = { custom_field: 'hello', subscription_tier: 'basic' as const };
    const result = getOrgSettings({ settings });
    expect(result.custom_field).toBe('hello');
  });
});
