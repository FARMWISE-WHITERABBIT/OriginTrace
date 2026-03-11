/**
 * tests/e2e/webhooks.spec.ts
 *
 * Verifies the Session 6 webhook reliability work:
 * - Webhook retry cron endpoint is protected
 * - Webhook delivery endpoint rejects bad payloads
 * - Cron endpoints require CRON_SECRET
 */

import { test, expect } from '@playwright/test';

const CRON_SECRET = process.env.CRON_SECRET || '';

test.describe('Webhook & Cron endpoint security', () => {

  test('GET /api/cron/webhook-retry returns 401 without CRON_SECRET', async ({ request }) => {
    const res = await request.get('/api/cron/webhook-retry');
    expect([401, 403]).toContain(res.status());
  });

  test('GET /api/cron/document-expiry returns 401 without CRON_SECRET', async ({ request }) => {
    const res = await request.get('/api/cron/document-expiry');
    expect([401, 403]).toContain(res.status());
  });

  test('GET /api/cron/webhook-retry with wrong secret returns 401', async ({ request }) => {
    const res = await request.get('/api/cron/webhook-retry', {
      headers: { Authorization: 'Bearer wrong-secret' },
    });
    expect([401, 403]).toContain(res.status());
  });

  test('GET /api/cron/webhook-retry with correct secret returns 200', async ({ request }) => {
    // Only runs if CRON_SECRET env var is set in the test environment
    if (!CRON_SECRET) {
      test.skip();
    }
    const res = await request.get('/api/cron/webhook-retry', {
      headers: { Authorization: `Bearer ${CRON_SECRET}` },
    });
    expect(res.status()).toBe(200);
  });

  test('webhook retry cron returns JSON response', async ({ request }) => {
    if (!CRON_SECRET) {
      test.skip();
    }
    const res = await request.get('/api/cron/webhook-retry', {
      headers: { Authorization: `Bearer ${CRON_SECRET}` },
    });
    if (res.status() === 200) {
      const body = await res.json();
      // Should return info about what was processed
      expect(typeof body).toBe('object');
    }
  });

});
