/**
 * Regression tests for the two buyer<->exporter sync gaps found in the
 * orchestrator audit (see app/api/buyer/route.ts's handleDocumentsSection
 * and app/api/buyer/compliance-templates/**):
 *
 *  1. Documents must be scoped by shipment, not just by "buyer has an active
 *     link to this exporter" — otherwise two buyers of the same exporter can
 *     see each other's shared documents. Proven here with two buyers, one
 *     shared exporter, and one document per buyer's shipment: each buyer
 *     must see only their own.
 *  2. A compliance template can only be assigned to an exporter the buyer
 *     has an *active* supply_chain_links row with, and assigning twice is
 *     idempotent (returns the existing materialized row rather than
 *     duplicating it).
 *
 * The mock Supabase client is a real in-memory filter over fixture rows
 * (not a canned response) so these tests fail if the route stops applying
 * the filters it claims to.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// ─── Mock infrastructure: in-memory, filter-aware Supabase stub ──────────────

const h = vi.hoisted(() => {
  function makeTableBuilder(rows: any[]) {
    return () => {
      let data = [...rows];
      let mode: 'many' | 'single' | 'maybeSingle' = 'many';
      const builder: any = {
        select: () => builder,
        eq: (col: string, val: unknown) => { data = data.filter((r) => r[col] === val); return builder; },
        in: (col: string, vals: unknown[]) => { data = data.filter((r) => vals.includes(r[col])); return builder; },
        order: () => builder,
        range: () => builder,
        insert: (payload: Record<string, unknown>) => { data = [{ id: `generated-${Math.random().toString(36).slice(2, 8)}`, ...payload }]; return builder; },
        single: () => { mode = 'single'; return builder; },
        maybeSingle: () => { mode = 'maybeSingle'; return builder; },
        then: (resolve: (v: unknown) => unknown, reject?: (e: unknown) => unknown) => {
          try {
            if (mode === 'single') {
              const result = data.length > 0
                ? { data: data[0], error: null }
                : { data: null, error: { message: 'no rows' } };
              return Promise.resolve(result).then(resolve, reject);
            }
            if (mode === 'maybeSingle') {
              return Promise.resolve({ data: data[0] ?? null, error: null }).then(resolve, reject);
            }
            return Promise.resolve({ data, error: null, count: data.length }).then(resolve, reject);
          } catch (e) {
            return Promise.reject(e);
          }
        },
      };
      return builder;
    };
  }

  const currentUser = { id: '' };
  const tables: Record<string, any[]> = {};
  const mockFrom = vi.fn((table: string) => makeTableBuilder(tables[table] || [])());

  return { makeTableBuilder, currentUser, tables, mockFrom };
});

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: () => ({ from: h.mockFrom }),
}));

vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({
    auth: {
      getUser: async () => ({ data: { user: h.currentUser.id ? { id: h.currentUser.id } : null }, error: null }),
    },
  }),
}));

vi.mock('@/lib/api/tier-guard', () => ({ enforceTier: vi.fn(async () => null) }));

beforeEach(() => {
  h.mockFrom.mockClear();
  for (const key of Object.keys(h.tables)) delete h.tables[key];
});

// ─── 1. Shipment-scoped documents ────────────────────────────────────────────

describe('Buyer documents: shipment scoping (cross-buyer leak fix)', () => {
  function seedTwoBuyersOneExporter() {
    h.tables.buyer_profiles = [
      { user_id: 'user-a', buyer_org_id: 'buyer-a', full_name: 'Buyer A', role: 'buyer_admin', id: 'bp-a' },
      { user_id: 'user-b', buyer_org_id: 'buyer-b', full_name: 'Buyer B', role: 'buyer_admin', id: 'bp-b' },
    ];
    h.tables.supply_chain_links = [
      { buyer_org_id: 'buyer-a', exporter_org_id: 'exp-1', status: 'active' },
      { buyer_org_id: 'buyer-b', exporter_org_id: 'exp-1', status: 'active' },
    ];
    h.tables.contracts = [
      { id: 'contract-a', buyer_org_id: 'buyer-a' },
      { id: 'contract-b', buyer_org_id: 'buyer-b' },
    ];
    h.tables.contract_shipments = [
      { contract_id: 'contract-a', shipment_id: 'ship-a' },
      { contract_id: 'contract-b', shipment_id: 'ship-b' },
    ];
    h.tables.documents = [
      { id: 'doc-a', org_id: 'exp-1', title: 'Doc for Buyer A shipment', document_type: 'bill_of_lading', file_url: null, file_name: null, file_size: null, issued_date: null, expiry_date: null, status: 'active', linked_entity_type: 'shipment', linked_entity_id: 'ship-a', notes: null, created_at: '2026-01-01' },
      { id: 'doc-b', org_id: 'exp-1', title: 'Doc for Buyer B shipment', document_type: 'bill_of_lading', file_url: null, file_name: null, file_size: null, issued_date: null, expiry_date: null, status: 'active', linked_entity_type: 'shipment', linked_entity_id: 'ship-b', notes: null, created_at: '2026-01-01' },
    ];
    h.tables.organizations = [{ id: 'exp-1', name: 'Exporter One' }];
  }

  it('buyer A sees only the document linked to their own shipment', async () => {
    seedTwoBuyersOneExporter();
    h.currentUser.id = 'user-a';
    const { GET } = await import('@/app/api/buyer/route');
    const res = await GET(new NextRequest('http://localhost/api/buyer?section=documents'));
    const body = await res.json();

    const titles = body.documents.map((d: any) => d.id);
    expect(titles).toEqual(['doc-a']);
    expect(titles).not.toContain('doc-b');
  });

  it('buyer B sees only the document linked to their own shipment, not buyer A\'s', async () => {
    seedTwoBuyersOneExporter();
    h.currentUser.id = 'user-b';
    const { GET } = await import('@/app/api/buyer/route');
    const res = await GET(new NextRequest('http://localhost/api/buyer?section=documents'));
    const body = await res.json();

    const ids = body.documents.map((d: any) => d.id);
    expect(ids).toEqual(['doc-b']);
    expect(ids).not.toContain('doc-a');
  });

  it('a buyer with no shipments yet sees no documents, even with an active exporter link', async () => {
    h.tables.buyer_profiles = [{ user_id: 'user-a', buyer_org_id: 'buyer-a', full_name: 'Buyer A', role: 'buyer_admin', id: 'bp-a' }];
    h.tables.supply_chain_links = [{ buyer_org_id: 'buyer-a', exporter_org_id: 'exp-1', status: 'active' }];
    h.tables.contracts = [];
    h.tables.contract_shipments = [];
    h.tables.documents = [{ id: 'doc-a', title: 'Org-level doc, not shipment-linked', document_type: 'export_license', file_url: null, file_name: null, file_size: null, issued_date: null, expiry_date: null, status: 'active', linked_entity_type: null, linked_entity_id: null, notes: null, created_at: '2026-01-01' }];
    h.tables.organizations = [{ id: 'exp-1', name: 'Exporter One' }];
    h.currentUser.id = 'user-a';

    const { GET } = await import('@/app/api/buyer/route');
    const res = await GET(new NextRequest('http://localhost/api/buyer?section=documents'));
    const body = await res.json();

    expect(body.documents).toEqual([]);
  });
});

// ─── 2. Compliance template assignment ───────────────────────────────────────

describe('Buyer compliance template assignment', () => {
  function seedTemplateAndLink(linkStatus: string | null) {
    h.tables.buyer_profiles = [{ user_id: 'user-a', buyer_org_id: 'buyer-a', full_name: 'Buyer A', role: 'buyer_admin', id: 'bp-a' }];
    h.tables.buyer_compliance_profile_templates = [{
      id: 'tmpl-1', buyer_org_id: 'buyer-a', name: 'EU EUDR', destination_market: 'European Union',
      regulation_framework: 'EUDR', required_documents: ['DDS'], required_certifications: [],
      geo_verification_level: 'polygon', min_traceability_depth: 3, template: 'EU', custom_rules: {},
    }];
    h.tables.supply_chain_links = linkStatus
      ? [{ buyer_org_id: 'buyer-a', exporter_org_id: 'exp-1', status: linkStatus }]
      : [];
    h.tables.compliance_profiles = [];
    h.currentUser.id = 'user-a';
  }

  it('rejects assignment when there is no active supply_chain_links row', async () => {
    seedTemplateAndLink('pending');
    const { POST } = await import('@/app/api/buyer/compliance-templates/[id]/assign/route');
    const res = await POST(
      new NextRequest('http://localhost/api/buyer/compliance-templates/tmpl-1/assign', {
        method: 'POST',
        body: JSON.stringify({ exporter_org_id: 'exp-1' }),
      }),
      { params: Promise.resolve({ id: 'tmpl-1' }) }
    );
    expect(res.status).toBe(403);
  });

  it('materializes a compliance_profiles row when the link is active', async () => {
    seedTemplateAndLink('active');
    const { POST } = await import('@/app/api/buyer/compliance-templates/[id]/assign/route');
    const res = await POST(
      new NextRequest('http://localhost/api/buyer/compliance-templates/tmpl-1/assign', {
        method: 'POST',
        body: JSON.stringify({ exporter_org_id: 'exp-1' }),
      }),
      { params: Promise.resolve({ id: 'tmpl-1' }) }
    );
    const body = await res.json();
    expect(res.status).toBe(201);
    expect(body.already_assigned).toBe(false);
    expect(body.profile.source_buyer_template_id).toBe('tmpl-1');
    expect(body.profile.org_id).toBe('exp-1');
  });

  it('assigning the same template to the same exporter twice is idempotent', async () => {
    seedTemplateAndLink('active');
    h.tables.compliance_profiles = [{
      id: 'cp-1', org_id: 'exp-1', buyer_org_id: 'buyer-a', source_buyer_template_id: 'tmpl-1',
      name: 'EU EUDR', destination_market: 'European Union', regulation_framework: 'EUDR',
      required_documents: ['DDS'], required_certifications: [], geo_verification_level: 'polygon',
      min_traceability_depth: 3, custom_rules: {}, is_default: false,
    }];
    const { POST } = await import('@/app/api/buyer/compliance-templates/[id]/assign/route');
    const res = await POST(
      new NextRequest('http://localhost/api/buyer/compliance-templates/tmpl-1/assign', {
        method: 'POST',
        body: JSON.stringify({ exporter_org_id: 'exp-1' }),
      }),
      { params: Promise.resolve({ id: 'tmpl-1' }) }
    );
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.already_assigned).toBe(true);
    expect(body.profile.id).toBe('cp-1');
  });
});
