/**
 * tests/e2e/dashboard.spec.ts
 * Dashboard loads, navigation renders, key sections accessible.
 */

import { test, expect } from '@playwright/test';
import { loginAsAdmin } from './helpers/auth';

test.describe('Dashboard & Navigation', () => {

  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test('admin dashboard loads without error', async ({ page }) => {
    await expect(page).not.toHaveURL(/\/auth/);
    // No "Configuration Required" or error card
    const errorCard = page.getByText('Configuration Required');
    await expect(errorCard).not.toBeVisible();
  });

  test('sidebar renders navigation links', async ({ page }) => {
    // Key nav items the admin role should see
    await expect(page.locator('[data-testid="nav-dashboard"]')).toBeVisible();
    await expect(page.locator('[data-testid="nav-farm-polygons"]')).toBeVisible();
    await expect(page.locator('[data-testid="nav-analytics"]')).toBeVisible();
  });

  test('navigate to Farms page', async ({ page }) => {
    await page.locator('[data-testid="nav-farm-polygons"]').click();
    await page.waitForURL(/\/app\/farms/, { timeout: 10_000 });
    // Search input is the clearest landmark on the farms page
    await expect(page.locator('[data-testid="input-search-farms"]')).toBeVisible();
  });

  test('navigate to Analytics page', async ({ page }) => {
    await page.locator('[data-testid="nav-analytics"]').click();
    await page.waitForURL(/\/app\/analytics/, { timeout: 10_000 });
    expect(page.url()).toContain('/app/analytics');
  });

  test('navigate to Shipments page (pro feature)', async ({ page }) => {
    // Shipments is a pro-tier feature — navigate directly
    await page.goto('/app/shipments');
    await page.waitForURL(/\/app/, { timeout: 10_000 });
    // Either lands on shipments (org has pro) or redirected to /app with tier_required
    const url = page.url();
    const isOnShipments  = url.includes('/app/shipments');
    const isTierBlocked  = url.includes('tier_required');
    const isOnAppRoot    = url.endsWith('/app') || url.endsWith('/app/');
    expect(isOnShipments || isTierBlocked || isOnAppRoot).toBe(true);
  });

  test('navigate back to dashboard from any page', async ({ page }) => {
    await page.goto('/app/farms');
    await page.locator('[data-testid="nav-dashboard"]').click();
    await page.waitForURL(/\/app$|\/app\/$/, { timeout: 10_000 });
    expect(page.url()).toMatch(/\/app\/?$/);
  });

  test('logout button is visible in sidebar', async ({ page }) => {
    await expect(page.locator('[data-testid="button-logout"]')).toBeVisible();
  });

});
