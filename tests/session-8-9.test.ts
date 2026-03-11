/**
 * tests/session-8-9.test.ts
 *
 * Regression tests for:
 *   Session 8 — JWT custom claims: zero DB calls in middleware happy path
 *   Session 9 — Atomic transaction RPCs: shipment creation + batch sync
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

function readLib(rel: string) {
  return readFileSync(join(__dirname, '..', rel), 'utf8');
}

function readRoute(rel: string) {
  return readFileSync(join(__dirname, '..', 'app/api', rel, 'route.ts'), 'utf8');
}

function readMigration(name: string) {
  return readFileSync(join(__dirname, '..', 'migrations', name), 'utf8');
}

// =============================================================================
// Session 8 — Middleware JWT claims
// =============================================================================

describe('Session 8 — middleware: JWT custom claims', () => {

  it('extractClaims reads from user.app_metadata', () => {
    const src = readLib('lib/supabase/middleware.ts');
    expect(src).toContain('app_metadata');
    expect(src).toContain('extractClaims');
  });

  it('middleware uses extractClaims before any DB fallback', () => {
    const src = readLib('lib/supabase/middleware.ts');
    // extractClaims(user) call site appears before fetchClaimsFromDb call site
    const extractCallIdx = src.indexOf('extractClaims(user)');
    const fetchCallIdx   = src.indexOf('fetchClaimsFromDb(user.id)');
    expect(extractCallIdx).toBeGreaterThan(-1);
    expect(fetchCallIdx).toBeGreaterThan(-1);
    expect(extractCallIdx).toBeLessThan(fetchCallIdx);
  });

  it('fallback to DB when claims absent (users without fresh JWT)', () => {
    const src = readLib('lib/supabase/middleware.ts');
    expect(src).toContain('fetchClaimsFromDb');
    // DB fallback is only called when extractClaims returns null
    expect(src).toContain('if (!claims)');
  });

  it('fetchClaimsFromDb uses Promise.all to parallelise system_admins + profiles', () => {
    const src = readLib('lib/supabase/middleware.ts');
    expect(src).toContain('Promise.all');
    expect(src).toContain('system_admins');
    expect(src).toContain("from('profiles')");
  });

  it('middleware no longer creates a service client per request at module level', () => {
    const src = readLib('lib/supabase/middleware.ts');
    // getServiceClient should only be called inside fetchClaimsFromDb (fallback)
    // not at the top of updateSession
    const updateSessionIdx = src.indexOf('export async function updateSession');
    const getServiceIdx    = src.indexOf('getServiceClient()', updateSessionIdx);
    const fetchClaimsIdx   = src.indexOf('async function fetchClaimsFromDb');
    // getServiceClient usage in updateSession body should not appear before fetchClaimsFromDb
    if (getServiceIdx > -1) {
      expect(getServiceIdx).toBeGreaterThan(fetchClaimsIdx);
    }
  });

  it('middleware reads role from JWT claims not from a .from(profiles) call in updateSession', () => {
    const src = readLib('lib/supabase/middleware.ts');
    const updateSessionFn = src.slice(src.indexOf('export async function updateSession'));
    // The updateSession fn itself should not contain a .from('profiles') call
    // (that lives only in the fetchClaimsFromDb fallback)
    const profilesInUpdateSession = updateSessionFn
      .slice(0, updateSessionFn.indexOf('async function fetchClaimsFromDb'))
      .includes("from('profiles')");
    expect(profilesInUpdateSession).toBe(false);
  });

  it('extractClaims returns null when app_role is absent (triggers fallback)', () => {
    const src = readLib('lib/supabase/middleware.ts');
    expect(src).toContain('app_role === undefined');
  });

  it('claims object includes all 4 required fields', () => {
    const src = readLib('lib/supabase/middleware.ts');
    expect(src).toContain('app_role');
    expect(src).toContain('org_id');
    expect(src).toContain('org_tier');
    expect(src).toContain('is_superadmin');
  });

  it('API routes still bypass middleware entirely', () => {
    const src = readLib('lib/supabase/middleware.ts');
    expect(src).toContain("isApiRoute");
    expect(src).toContain("if (isApiRoute) return supabaseResponse");
  });
});

describe('Session 8 — JWT hook migration SQL', () => {
  const sql = readMigration('20260311_session8_9.sql');

  it('defines custom_access_token_hook function', () => {
    expect(sql).toContain('custom_access_token_hook');
    expect(sql).toContain('CREATE OR REPLACE FUNCTION custom_access_token_hook');
  });

  it('hook embeds app_role, org_id, org_tier, is_superadmin in JWT', () => {
    expect(sql).toContain("'app_role'");
    expect(sql).toContain("'org_id'");
    expect(sql).toContain("'org_tier'");
    expect(sql).toContain("'is_superadmin'");
  });

  it('hook merges into app_metadata (not raw claims)', () => {
    expect(sql).toContain('app_metadata');
  });

  it('hook is granted to supabase_auth_admin', () => {
    expect(sql).toContain('supabase_auth_admin');
    expect(sql).toContain('GRANT EXECUTE');
  });

  it('hook reads from profiles, organizations, system_admins', () => {
    expect(sql).toContain('FROM profiles');
    expect(sql).toContain('FROM system_admins');
    expect(sql).toContain('FROM organizations');
  });

  it('defines helper get_org_tier function', () => {
    expect(sql).toContain('get_org_tier');
    expect(sql).toContain("'starter', 'basic', 'pro', 'enterprise'");
  });
});

// =============================================================================
// Session 9A — Atomic shipment creation
// =============================================================================

describe('Session 9A — shipments POST: atomic RPC', () => {
  const src = readRoute('shipments');

  it('uses create_shipment_atomic RPC instead of sequential inserts', () => {
    expect(src).toContain('create_shipment_atomic');
    expect(src).toContain('.rpc(');
  });

  it('no longer has a for loop over document_ids', () => {
    expect(src).not.toContain('for (const docId of document_ids)');
  });

  it('no longer has separate contract_shipments insert', () => {
    // The standalone .from('contract_shipments').insert() is gone
    // (it's now inside the RPC)
    expect(src).not.toContain(".from('contract_shipments')\n        .insert(");
  });

  it('passes all shipment fields as named RPC params', () => {
    expect(src).toContain('p_org_id');
    expect(src).toContain('p_destination_country');
    expect(src).toContain('p_commodity');
    expect(src).toContain('p_contract_id');
    expect(src).toContain('p_document_ids');
  });

  it('handles RPC error and returns 500', () => {
    expect(src).toContain('shipmentError');
    expect(src).toContain("status: 500");
  });

  it('still fires audit log and webhook after creation', () => {
    expect(src).toContain('logAuditEvent');
    expect(src).toContain('dispatchWebhookEvent');
  });
});

describe('Session 9A — create_shipment_atomic SQL', () => {
  const sql = readMigration('20260311_session8_9.sql');

  it('defines create_shipment_atomic function', () => {
    expect(sql).toContain('CREATE OR REPLACE FUNCTION create_shipment_atomic');
  });

  it('inserts shipment inside function body', () => {
    expect(sql).toContain('INSERT INTO shipments');
  });

  it('links contract with ON CONFLICT DO NOTHING (idempotent)', () => {
    expect(sql).toContain('INSERT INTO contract_shipments');
    expect(sql).toContain('ON CONFLICT DO NOTHING');
  });

  it('links documents with bulk UPDATE (single statement, not loop)', () => {
    expect(sql).toContain('UPDATE documents');
    expect(sql).toContain('WHERE id = ANY(p_document_ids)');
  });

  it('is granted to service_role only', () => {
    const fnBlock = sql.slice(sql.indexOf('create_shipment_atomic'));
    expect(fnBlock).toContain('GRANT EXECUTE');
    expect(fnBlock).toContain('service_role');
  });
});

// =============================================================================
// Session 9B — Atomic batch sync
// =============================================================================

describe('Session 9B — sync PUT: atomic RPC', () => {
  const src = readRoute('sync');

  it('uses sync_batches_atomic RPC', () => {
    expect(src).toContain("rpc('sync_batches_atomic'");
  });

  it('no longer has a for loop over batches with per-batch awaits', () => {
    // The N+1 pattern: for (const batch of batches) { await serviceClient.from(...) }
    // should be gone
    expect(src).not.toContain("for (const batch of batches)");
  });

  it('no longer has per-contributor insert loop', () => {
    expect(src).not.toContain("for (const contrib of contributors)");
  });

  it('no longer has per-bag update loop', () => {
    expect(src).not.toContain("for (const bag of bags)");
  });

  it('handles RPC error and returns 500', () => {
    expect(src).toContain('syncError');
    expect(src).toContain("status: 500");
  });

  it('still checks farm compliance warnings after sync', () => {
    expect(src).toContain('farm_compliance_changed');
    expect(src).toContain('compliance_status');
  });

  it('still updates agent_sync_status after sync', () => {
    expect(src).toContain('agent_sync_status');
    expect(src).toContain('pending_batches: 0');
  });

  it('passes org_id, user_id, batches to RPC', () => {
    expect(src).toContain('p_org_id');
    expect(src).toContain('p_user_id');
    expect(src).toContain('p_batches');
  });
});

describe('Session 9B — sync_batches_atomic SQL', () => {
  const sql = readMigration('20260311_session8_9.sql');

  it('defines sync_batches_atomic function', () => {
    expect(sql).toContain('CREATE OR REPLACE FUNCTION sync_batches_atomic');
  });

  it('accepts batches as JSONB array', () => {
    expect(sql).toContain('p_batches JSONB');
  });

  it('is idempotent — skips already-synced local_ids', () => {
    expect(sql).toContain('already_synced');
    expect(sql).toContain('local_id');
  });

  it('uses bulk INSERT for batch_contributions (not loop)', () => {
    expect(sql).toContain('INSERT INTO batch_contributions');
    expect(sql).toContain('FROM jsonb_array_elements');
  });

  it('uses bulk UPDATE for bags (not loop)', () => {
    expect(sql).toContain('UPDATE bags');
    expect(sql).toContain('FROM jsonb_array_elements');
  });

  it('handles batch insert errors gracefully (EXCEPTION block)', () => {
    expect(sql).toContain('EXCEPTION WHEN OTHERS THEN');
  });

  it('is granted to service_role only', () => {
    const fnBlock = sql.slice(sql.indexOf('sync_batches_atomic'));
    expect(fnBlock).toContain('GRANT EXECUTE');
    expect(fnBlock).toContain('service_role');
  });
});
