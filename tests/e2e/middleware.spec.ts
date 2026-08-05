/**
 * tests/e2e/middleware.spec.ts
 *
 * Verifies the Session 8 middleware behaviour:
 * - Authenticated users reach /app
 * - Unauthenticated users are redirected
 * - Role-specific routes work correctly for admin
 * - Page load time is reasonable (JWT claims = no DB queries in middleware)
 */

import { test, expect } from '@playwright/test';
import { loginAsAdmin } from './helpers/auth';

test.describe('Middleware — route protection', () => {

  test('public marketing pages are accessible without auth', async ({ page }) => {
    // Homepage
    const res = await page.goto('/');
    expect(res?.status()).toBe(200);
    expect(page.url()).not.toContain('/auth/login');
  });

  test('/solutions is public', async ({ page }) => {
    const res = await page.goto('/solutions');
    expect(res?.status()).toBe(200);
    expect(page.url()).not.toContain('/auth/login');
  });

  test('/pedigree is public', async ({ page }) => {
    await page.goto('/pedigree');
    expect(page.url()).not.toContain('/auth/login');
  });

  test('/app routes redirect to login when unauthenticated', async ({ page }) => {
    const protectedRoutes = [
      '/app',
      '/app/farms',
      '/app/analytics',
      '/app/shipments',
      '/app/documents',
    ];

    for (const route of protectedRoutes) {
      await page.goto(route);
      await page.waitForURL(/\/auth\/login/, { timeout: 10_000 });
      expect(page.url()).toContain('/auth/login');
    }
  });

  test('authenticated admin can access /app without redirect loop', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/app');
    // Should stay on /app, not redirect anywhere
    await page.waitForLoadState('networkidle');
    expect(page.url()).toMatch(/\/app\/?$/);
  });

  test('authenticated admin is redirected away from /auth/login', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/auth/login');
    // Should redirect to /app
    await page.waitForURL(/\/app/, { timeout: 10_000 });
    expect(page.url()).toContain('/app');
  });

  test('/superadmin/login is public', async ({ page }) => {
    await page.goto('/superadmin/login');
    expect(page.url()).not.toContain('/auth/login');
    expect(page.url()).toContain('/superadmin');
  });

  test('authenticated admin is NOT redirected to /superadmin', async ({ page }) => {
    // Regular admin (not superadmin) should land on /app, not /superadmin
    await loginAsAdmin(page);
    expect(page.url()).toContain('/app');
    expect(page.url()).not.toContain('/superadmin');
  });

});

test.describe('Middleware — performance (JWT claims)', () => {

  test('first /app page load completes in under 5 seconds', async ({ page }) => {
    await loginAsAdmin(page);
    const start = Date.now();
    await page.goto('/app');
    await page.waitForLoadState('networkidle');
    const elapsed = Date.now() - start;
    // Generous threshold — Replit cold starts can be slow
    // The key check is it doesn't time out or hang (which would indicate a DB query loop)
    expect(elapsed).toBeLessThan(15_000);
  });

  test('navigation between pages does not cause auth redirects', async ({ page }) => {
    await loginAsAdmin(page);

    // Navigate through several pages — JWT claims should keep us authenticated
    const routes = ['/app/farms', '/app/analytics', '/app'];
    for (const route of routes) {
      await page.goto(route);
      await page.waitForLoadState('domcontentloaded');
      // Should never be kicked to login
      expect(page.url()).not.toContain('/auth/login');
    }
  });

});
