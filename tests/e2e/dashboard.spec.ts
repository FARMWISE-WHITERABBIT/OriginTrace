/**
 * tests/e2e/dashboard.spec.ts
 *
 * Dashboard loads, sidebar navigation, key sections accessible.
 * Uses shared auth state — no login step needed.
 */

import { test, expect } from '@playwright/test';

test.describe('Dashboard & Navigation', () => {

  test.beforeEach(async ({ page }) => {
    await page.goto('/app');
    await page.waitForURL(/\/app/, { timeout: 15_000 });
  });

  test('admin dashboard loads without error state', async ({ page }) => {
    // Should not show "Configuration Required" or uncaught error UI
    await expect(page.getByText('Configuration Required')).not.toBeVisible();
    await expect(page.locator('[data-testid="button-logout"]')).toBeVisible();
  });

  test('sidebar renders key admin navigation items', async ({ page }) => {
    await expect(page.locator('[data-testid="nav-dashboard"]')).toBeVisible();
    await expect(page.locator('[data-testid="nav-analytics"]')).toBeVisible();
  });

  test('navigate to Farms page', async ({ page }) => {
    await page.goto('/app/farms');
    await page.waitForURL(/\/app\/farms/, { timeout: 15_000 });
    await expect(page.locator('[data-testid="input-search-farms"]')).toBeVisible();
    await expect(page.locator('h1')).toContainText('Farms');
  });

  test('navigate to Analytics page', async ({ page }) => {
    await page.goto('/app/analytics');
    await page.waitForURL(/\/app\/analytics/, { timeout: 15_000 });
    expect(page.url()).toContain('/app/analytics');
  });

  test('navigate to Compliance Profiles page', async ({ page }) => {
    await page.goto('/app/compliance-profiles');
    await page.waitForURL(/\/app\/compliance-profiles/, { timeout: 15_000 });
    await expect(page.locator('[data-testid="text-page-title"]')).toBeVisible();
  });

  test('navigate to API Keys page', async ({ page }) => {
    await page.goto('/app/api-keys');
    await page.waitForURL(/\/app\/api-keys/, { timeout: 15_000 });
    await expect(page.locator('[data-testid="text-page-title"]')).toContainText('API Keys');
  });

  test('navigate to Audit log page', async ({ page }) => {
    await page.goto('/app/audit');
    await page.waitForURL(/\/app\/audit/, { timeout: 15_000 });
    expect(page.url()).toContain('/app/audit');
  });

  test('navigate back to dashboard via sidebar', async ({ page }) => {
    await page.goto('/app/farms');
    await page.locator('[data-testid="nav-dashboard"]').click();
    await page.waitForURL(/\/app\/?$/, { timeout: 10_000 });
    expect(page.url()).toMatch(/\/app\/?$/);
  });

  test('shipments page: accessible or shows tier gate', async ({ page }) => {
    await page.goto('/app/shipments');
    await page.waitForURL(/\/app/, { timeout: 15_000 });
    const url = page.url();
    const onShipments = url.includes('/app/shipments');
    const tierBlocked = url.includes('tier_required');
    const onAppRoot   = url.match(/\/app\/?$/);
    expect(onShipments || !!tierBlocked || !!onAppRoot).toBe(true);
  });

  test('logout button is present and visible', async ({ page }) => {
    await expect(page.locator('[data-testid="button-logout"]')).toBeVisible();
  });

});
