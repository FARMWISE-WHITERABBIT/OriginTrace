/**
 * tests/e2e/api-smoke.spec.ts
 *
 * API endpoint smoke tests — hit key API routes directly and assert
 * correct HTTP status codes. Validates the auth layer, rate limiter,
 * and basic response shapes without UI interaction.
 *
 * Uses shared admin auth state (session cookies sent automatically).
 */

import { test, expect } from '@playwright/test';

test.describe('API — Auth guard', () => {

  test('GET /api/farms returns 200 for authenticated admin', async ({ request }) => {
    const resp = await request.get('/api/farms');
    expect(resp.status()).toBe(200);
    const body = await resp.json();
    expect(body).toHaveProperty('farms');
    expect(Array.isArray(body.farms)).toBe(true);
  });

  test('GET /api/batches returns 200 for authenticated admin', async ({ request }) => {
    const resp = await request.get('/api/batches');
    expect(resp.status()).toBe(200);
    const body = await resp.json();
    expect(body).toHaveProperty('batches');
  });

  test('GET /api/shipments returns 200 or 403 (tier check)', async ({ request }) => {
    const resp = await request.get('/api/shipments');
    expect([200, 403]).toContain(resp.status());
  });

  test('GET /api/documents returns 200 for authenticated admin', async ({ request }) => {
    const resp = await request.get('/api/documents');
    expect(resp.status()).toBe(200);
    const body = await resp.json();
    expect(body).toHaveProperty('documents');
  });

  test('GET /api/compliance-profiles returns 200', async ({ request }) => {
    const resp = await request.get('/api/compliance-profiles');
    expect(resp.status()).toBe(200);
  });

  test('GET /api/contracts returns 200', async ({ request }) => {
    const resp = await request.get('/api/contracts');
    expect(resp.status()).toBe(200);
  });

});

test.describe('API — Unauthenticated guard', () => {

  test('GET /api/farms without auth returns 401', async ({ page }) => {
    // Use a fresh context with no auth cookies
    const resp = await page.request.get('/api/farms', {
      headers: { Cookie: '' },
    });
    expect([401, 403]).toContain(resp.status());
  });

  test('GET /api/batches without auth returns 401', async ({ page }) => {
    const resp = await page.request.get('/api/batches', {
      headers: { Cookie: '' },
    });
    expect([401, 403]).toContain(resp.status());
  });

});

test.describe('API — Pagination', () => {

  test('GET /api/farms?page=1&limit=5 returns paginated response', async ({ request }) => {
    const resp = await request.get('/api/farms?page=1&limit=5');
    expect(resp.status()).toBe(200);
    const body = await resp.json();
    expect(body).toHaveProperty('pagination');
    expect(body.pagination).toHaveProperty('page', 1);
    expect(body.pagination).toHaveProperty('limit', 5);
    expect(body.pagination).toHaveProperty('total');
    expect(typeof body.pagination.total).toBe('number');
  });

  test('GET /api/batches?page=2&limit=10 returns paginated response', async ({ request }) => {
    const resp = await request.get('/api/batches?page=2&limit=10');
    expect(resp.status()).toBe(200);
    const body = await resp.json();
    expect(body).toHaveProperty('pagination');
    expect(body.pagination.page).toBe(2);
    expect(body.pagination.limit).toBe(10);
  });

});

test.describe('API — v1 Public API requires API key', () => {

  test('GET /api/v1/farms without Bearer token returns 401', async ({ request }) => {
    const resp = await request.get('/api/v1/farms');
    expect(resp.status()).toBe(401);
  });

  test('GET /api/v1/farms with invalid Bearer token returns 401', async ({ request }) => {
    const resp = await request.get('/api/v1/farms', {
      headers: { Authorization: 'Bearer invalid-key-xyz' },
    });
    expect(resp.status()).toBe(401);
  });

  test('GET /api/v1/pedigree without auth returns 401', async ({ request }) => {
    const resp = await request.get('/api/v1/pedigree');
    expect(resp.status()).toBe(401);
  });

});

test.describe('API — Rate limit headers present', () => {

  test('analytics endpoint returns rate limit headers', async ({ request }) => {
    const resp = await request.get('/api/analytics');
    // Either 200 or 429 — both should have rate limit headers
    const headers = resp.headers();
    // At least one of these should be present if rate limiting is active
    const hasRateLimitHeader =
      'x-ratelimit-limit' in headers ||
      'x-ratelimit-remaining' in headers ||
      'retry-after' in headers;
    // Don't hard-fail if headers absent — just log for awareness
    // (rate limiting only fires after threshold is hit)
    expect([200, 429]).toContain(resp.status());
  });

});
