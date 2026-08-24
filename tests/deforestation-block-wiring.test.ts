/**
 * Route-level proof that a HIGH-risk farm is actually rejected end-to-end —
 * not just that checkFarmEligibility() returns the right answer in
 * isolation (tests/farm-eligibility-gate.test.ts already covers that).
 * Both app/api/batch-contributions/route.ts and
 * app/api/shipments/[id]/submit-dds/route.ts were advisory-only before this
 * change (batch-contributions collected an override_reason param but never
 * used it; submit-dds's own comment said "warn, never block").
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const h = vi.hoisted(() => {
  function makeTableBuilder(rows: any[]) {
    return () => {
      let data = [...rows];
      let mode: 'many' | 'single' = 'many';
      const builder: any = {
        select: () => builder,
        eq: (col: string, val: unknown) => { data = data.filter((r) => r[col] === val); return builder; },
        in: (col: string, vals: unknown[]) => { data = data.filter((r) => vals.includes(r[col])); return builder; },
        insert: (payload: Record<string, unknown>) => { data = [{ id: 'generated', ...payload }]; return builder; },
        update: (payload: Record<string, unknown>) => { data = data.map((r) => ({ ...r, ...payload })); return builder; },
        single: () => { mode = 'single'; return builder; },
        then: (resolve: (v: unknown) => unknown, reject?: (e: unknown) => unknown) => {
          if (mode === 'single') {
            const result = data.length > 0 ? { data: data[0], error: null } : { data: null, error: { message: 'no rows' } };
            return Promise.resolve(result).then(resolve, reject);
          }
          return Promise.resolve({ data, error: null }).then(resolve, reject);
        },
      };
      return builder;
    };
  }

  const tables: Record<string, any[]> = {};
  const mockFrom = vi.fn((table: string) => makeTableBuilder(tables[table] || [])());
  return { tables, mockFrom };
});

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: () => ({ from: h.mockFrom }),
}));

vi.mock('@/lib/api-auth', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/api-auth')>();
  return {
    ...actual,
    getAuthenticatedProfile: vi.fn(async () => ({
      user: { id: 'user-1', email: 'admin@example.com' },
      profile: { id: 'profile-1', org_id: 'org-1', role: 'admin' },
    })),
    createServiceClient: () => ({ from: h.mockFrom }),
  };
});

vi.mock('@/lib/audit', () => ({ logAuditEvent: vi.fn(async () => {}) }));
vi.mock('@/lib/api/tier-guard', () => ({ enforceTier: vi.fn(async () => null) }));
vi.mock('@/lib/webhooks', () => ({ dispatchWebhookEvent: vi.fn() }));

const BATCH_ID = '11111111-1111-1111-1111-111111111111';
const FARM_ID = '22222222-2222-2222-2222-222222222222';

const HIGH_RISK_FARM = {
  id: FARM_ID,
  org_id: 'org-1',
  compliance_status: 'approved',
  boundary_geo: { type: 'Polygon' },
  boundary: { type: 'Polygon', coordinates: [] },
  area_hectares: 1,
  consent_timestamp: new Date().toISOString(),
  community: 'Test Community',
  commodity: 'cocoa',
  deforestation_check: { risk_level: 'high', data_source: 'Whisp (FAO/OpenForis) — EUDR plot analysis' },
};

beforeEach(() => {
  h.mockFrom.mockClear();
  for (const key of Object.keys(h.tables)) delete h.tables[key];
});

describe('POST /api/batch-contributions blocks a HIGH-risk farm', () => {
  it('rejects with 422 for an EU-bound batch and no override', async () => {
    h.tables.collection_batches = [{ id: BATCH_ID, org_id: 'org-1', status: 'open' }];
    h.tables.farms = [HIGH_RISK_FARM];

    const { POST } = await import('@/app/api/batch-contributions/route');
    const res = await POST(new NextRequest('http://localhost/api/batch-contributions', {
      method: 'POST',
      body: JSON.stringify({ batch_id: BATCH_ID, farm_id: FARM_ID, target_markets: ['EU'] }),
    }));

    expect(res.status).toBe(422);
    const body = await res.json();
    expect(body.error).toContain('Compliance Gate');
  });

  it('succeeds with a valid admin override reason', async () => {
    h.tables.collection_batches = [{ id: BATCH_ID, org_id: 'org-1', status: 'open' }];
    h.tables.farms = [HIGH_RISK_FARM];

    const { POST } = await import('@/app/api/batch-contributions/route');
    const res = await POST(new NextRequest('http://localhost/api/batch-contributions', {
      method: 'POST',
      body: JSON.stringify({
        batch_id: BATCH_ID,
        farm_id: FARM_ID,
        target_markets: ['EU'],
        compliance_override_reason: 'Reviewed imagery manually, loss predates the 2020 cutoff.',
      }),
    }));

    expect(res.status).toBe(200);
  });
});

describe('POST /api/shipments/[id]/submit-dds blocks a HIGH-risk farm', () => {
  const SHIPMENT_ID = '33333333-3333-3333-3333-333333333333';

  function seedShipmentWithHighRiskFarm() {
    h.tables.shipments = [{
      id: SHIPMENT_ID, org_id: 'org-1', destination_country: 'Netherlands', eta: null,
      bill_of_lading_number: null, total_weight_kg: 1000, target_regulations: ['EU'],
      prenotif_eu_traces: null, prenotif_eu_traces_ref: null, shipment_code: 'SHP-1',
    }];
    h.tables.organizations = [{ id: 'org-1', name: 'Test Org', slug: 'test-org', settings: {} }];
    h.tables.shipment_items = [{ shipment_id: SHIPMENT_ID, batch_id: BATCH_ID, finished_good_id: null }];
    h.tables.collection_batches = [{ id: BATCH_ID, farm_id: FARM_ID }];
    h.tables.farms = [HIGH_RISK_FARM];
  }

  it('rejects with 422 and does not file the DDS', async () => {
    seedShipmentWithHighRiskFarm();
    const { POST } = await import('@/app/api/shipments/[id]/submit-dds/route');
    const res = await POST(
      new NextRequest(`http://localhost/api/shipments/${SHIPMENT_ID}/submit-dds`, {
        method: 'POST',
        body: JSON.stringify({ mode: 'download' }),
      }),
      { params: { id: SHIPMENT_ID } },
    );

    expect(res.status).toBe(422);
    const body = await res.json();
    expect(body.error).toContain('Compliance Gate');
    expect(body.blocked_farms?.[0]?.farmId).toBe(FARM_ID);
  });

  it('succeeds with a valid admin override reason', async () => {
    seedShipmentWithHighRiskFarm();
    const { POST } = await import('@/app/api/shipments/[id]/submit-dds/route');
    const res = await POST(
      new NextRequest(`http://localhost/api/shipments/${SHIPMENT_ID}/submit-dds`, {
        method: 'POST',
        body: JSON.stringify({
          mode: 'download',
          compliance_override_reason: 'Reviewed imagery manually, loss predates the 2020 cutoff.',
        }),
      }),
      { params: { id: SHIPMENT_ID } },
    );

    expect(res.status).toBe(200);
  });
});
