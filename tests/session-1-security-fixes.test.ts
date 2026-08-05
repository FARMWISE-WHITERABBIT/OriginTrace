/**
 * Session 1 Regression Tests
 *
 * Covers every fix made in this session:
 *   1. /api/debug/tier removed
 *   2. /api/pedigree requires authentication
 *   3. Paystack properly exported from lib/payments
 *   4. package.json name corrected
 *   5. scripts/ folder consolidated
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { existsSync } from 'fs';
import { resolve } from 'path';

// ---------------------------------------------------------------------------
// 1. Debug endpoint must not exist
// ---------------------------------------------------------------------------
describe('Security: /api/debug/tier endpoint', () => {
  it('should not exist in the codebase', () => {
    const debugPath = resolve(__dirname, '../app/api/debug/tier/route.ts');
    expect(existsSync(debugPath)).toBe(false);
  });

  it('should not have a debug directory at all', () => {
    const debugDir = resolve(__dirname, '../app/api/debug');
    expect(existsSync(debugDir)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// 2. Pedigree route must enforce authentication
// ---------------------------------------------------------------------------
describe('Security: /api/pedigree authentication guard', () => {
  it('pedigree route file imports getAuthenticatedProfile', async () => {
    const src = await import('fs').then(fs =>
      fs.readFileSync(resolve(__dirname, '../app/api/pedigree/route.ts'), 'utf-8')
    );
    expect(src).toContain("import { getAuthenticatedProfile }");
  });

  it('pedigree route calls getAuthenticatedProfile before createAdminClient', async () => {
    const src = await import('fs').then(fs =>
      fs.readFileSync(resolve(__dirname, '../app/api/pedigree/route.ts'), 'utf-8')
    );
    const authPos = src.indexOf('getAuthenticatedProfile');
    const adminPos = src.indexOf('createAdminClient()');
    expect(authPos).toBeGreaterThan(-1);
    expect(adminPos).toBeGreaterThan(-1);
    // Auth call must appear before admin client is instantiated
    expect(authPos).toBeLessThan(adminPos);
  });

  it('pedigree route returns 401 when user is not authenticated', async () => {
    // Mock getAuthenticatedProfile to return no user
    vi.doMock('@/lib/api-auth', () => ({
      getAuthenticatedProfile: vi.fn().mockResolvedValue({ user: null, profile: null }),
    }));

    const { NextRequest } = await import('next/server');
    const { GET } = await import('../app/api/pedigree/route');

    const req = new NextRequest('http://localhost/api/pedigree?code=TEST123');
    const response = await GET(req);

    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body.error).toBe('Unauthorized');

    vi.doUnmock('@/lib/api-auth');
  });

  it('pedigree route returns 403 when profile has no org_id', async () => {
    // Use resetModules to avoid route module cache from previous test
    vi.resetModules();

    vi.doMock('@/lib/api-auth', () => ({
      getAuthenticatedProfile: vi.fn().mockResolvedValue({
        user: { id: 'user-123' },
        profile: { id: 'profile-123', org_id: null, role: 'compliance_officer' },
      }),
    }));
    vi.doMock('@/lib/api/tier-guard', () => ({
      enforceTier: vi.fn().mockResolvedValue(null),
    }));
    vi.doMock('@/lib/supabase/admin', () => ({
      createAdminClient: vi.fn(),
      getAdminClient: vi.fn(),
    }));

    const { NextRequest } = await import('next/server');
    const { GET } = await import('../app/api/pedigree/route');

    const req = new NextRequest('http://localhost/api/pedigree?code=TEST123');
    const response = await GET(req);

    expect(response.status).toBe(403);
    const body = await response.json();
    expect(body.error).toBe('No organization assigned');

    vi.resetModules();
  });

  it('pedigree route enforces tier gating after authentication', async () => {
    vi.resetModules();

    const { NextResponse } = await import('next/server');
    const tierBlock = NextResponse.json(
      { error: 'Feature not available on your current plan', requiredTier: 'pro' },
      { status: 403 }
    );

    vi.doMock('@/lib/api-auth', () => ({
      getAuthenticatedProfile: vi.fn().mockResolvedValue({
        user: { id: 'user-123' },
        profile: { id: 'profile-123', org_id: 42, role: 'compliance_officer' },
      }),
    }));
    vi.doMock('@/lib/api/tier-guard', () => ({
      enforceTier: vi.fn().mockResolvedValue(tierBlock),
    }));
    vi.doMock('@/lib/supabase/admin', () => ({
      createAdminClient: vi.fn(),
      getAdminClient: vi.fn(),
    }));

    const { NextRequest } = await import('next/server');
    const { GET } = await import('../app/api/pedigree/route');

    const req = new NextRequest('http://localhost/api/pedigree?code=TEST123');
    const response = await GET(req);

    expect(response.status).toBe(403);
    const body = await response.json();
    expect(body.requiredTier).toBe('pro');

    vi.resetModules();
  });
});

// ---------------------------------------------------------------------------
// 3. Payments — Paystack exported from index
// ---------------------------------------------------------------------------
describe('Payments: Paystack exported from lib/payments/index', () => {
  it('index exports initializePaystackPayment', async () => {
    const payments = await import('@/lib/payments/index');
    expect(typeof payments.initializePaystackPayment).toBe('function');
  });

  it('index exports verifyPaystackWebhook', async () => {
    const payments = await import('@/lib/payments/index');
    expect(typeof payments.verifyPaystackWebhook).toBe('function');
  });

  it('index exports verifyPaystackTransaction', async () => {
    const payments = await import('@/lib/payments/index');
    expect(typeof payments.verifyPaystackTransaction).toBe('function');
  });

  it('index exports generatePaystackReference', async () => {
    const payments = await import('@/lib/payments/index');
    expect(typeof payments.generatePaystackReference).toBe('function');
  });

  it('disbursement providers still registered correctly', async () => {
    const { getPaymentProvider } = await import('@/lib/payments/index');
    // Providers should still be registered (even if they throw on construction
    // without env vars, they should be findable)
    expect(getPaymentProvider('mtn_momo')).not.toBeNull();
    expect(getPaymentProvider('opay')).not.toBeNull();
    expect(getPaymentProvider('palmpay')).not.toBeNull();
    expect(getPaymentProvider('nonexistent')).toBeNull();
  });

  it('SUPPORTED_PROVIDERS includes expected entries', async () => {
    const { SUPPORTED_PROVIDERS } = await import('@/lib/payments/index');
    const ids = SUPPORTED_PROVIDERS.map(p => p.id);
    expect(ids).toContain('mtn_momo');
    expect(ids).toContain('opay');
    expect(ids).toContain('palmpay');
  });
});

// ---------------------------------------------------------------------------
// 4. package.json — name corrected
// ---------------------------------------------------------------------------
describe('Project: package.json identity', () => {
  it('package name should be origintrace, not rest-express', async () => {
    const pkg = await import('../package.json', { assert: { type: 'json' } });
    expect(pkg.default.name).toBe('origintrace');
  });

  it('build script should be next build for Vercel deployment', async () => {
    const pkg = await import('../package.json', { assert: { type: 'json' } });
    expect(pkg.default.scripts.build).toContain('next build');
  });
});

// ---------------------------------------------------------------------------
// 5. Folder consolidation — scripts/ exists, script/ does not
// ---------------------------------------------------------------------------
describe('Project: script folder consolidation', () => {
  it('legacy script/ directory should not exist', () => {
    const oldDir = resolve(__dirname, '../script');
    expect(existsSync(oldDir)).toBe(false);
  });

  it('scripts/ directory should exist', () => {
    const newDir = resolve(__dirname, '../scripts');
    expect(existsSync(newDir)).toBe(true);
  });

  it('build.ts should be in scripts/', () => {
    const buildFile = resolve(__dirname, '../scripts/build.ts');
    expect(existsSync(buildFile)).toBe(true);
  });

  it('seed-locations.ts should still be in scripts/', () => {
    const seedFile = resolve(__dirname, '../scripts/seed-locations.ts');
    expect(existsSync(seedFile)).toBe(true);
  });
});
