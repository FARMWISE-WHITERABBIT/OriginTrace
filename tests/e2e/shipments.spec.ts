/**
 * tests/e2e/shipments.spec.ts
 *
 * Shipment creation and management.
 * Uses shared auth state. Shipments is a pro-tier feature — tests that
 * require the page to be accessible skip automatically if blocked by tier.
 */

import { test, expect, Page } from '@playwright/test';

const TEST_COMMODITY = `E2E-Cocoa-${Date.now()}`;
const TEST_DEST      = 'Netherlands';
const TEST_BUYER     = 'E2E Test Buyer Co.';

async function goToShipments(page: Page): Promise<boolean> {
  await page.goto('/app/shipments');
  await page.waitForURL(/\/app/, { timeout: 15_000 });
  return page.url().includes('/app/shipments');
}

test.describe('Shipments', () => {

  test('shipments page loads or shows tier gate', async ({ page }) => {
    const accessible = await goToShipments(page);
    const url = page.url();
    const tierBlocked = url.includes('tier_required');
    const onAppRoot   = !!url.match(/\/app\/?$/);
    expect(accessible || !!tierBlocked || onAppRoot).toBe(true);
  });

  test('page title is visible when accessible', async ({ page }) => {
    if (!await goToShipments(page)) test.skip();
    await expect(page.locator('[data-testid="text-page-title"]')).toBeVisible();
    await expect(page.locator('[data-testid="text-page-title"]')).toContainText(/shipment/i);
  });

  test('stats cards render', async ({ page }) => {
    if (!await goToShipments(page)) test.skip();
    await expect(page.locator('[data-testid="text-stat-total"]')).toBeVisible();
  });

  test('create shipment dialog opens', async ({ page }) => {
    if (!await goToShipments(page)) test.skip();

    const btn = page.locator('[data-testid="button-create-shipment"], [data-testid="button-create-first-shipment"]').first();
    await expect(btn).toBeVisible();
    await btn.click();

    await expect(page.getByText('Create Shipment')).toBeVisible();
    await expect(page.locator('[data-testid="input-destination-country"]')).toBeVisible();
    await expect(page.locator('[data-testid="input-commodity"]')).toBeVisible();
  });

  test('cancel button closes dialog without creating', async ({ page }) => {
    if (!await goToShipments(page)) test.skip();

    const btn = page.locator('[data-testid="button-create-shipment"], [data-testid="button-create-first-shipment"]').first();
    await btn.click();
    await expect(page.locator('[data-testid="input-destination-country"]')).toBeVisible();

    await page.locator('[data-testid="button-cancel-create"]').click();
    await expect(page.locator('[data-testid="input-destination-country"]')).not.toBeVisible({ timeout: 5_000 });
  });

  test('submit without required fields shows validation error', async ({ page }) => {
    if (!await goToShipments(page)) test.skip();

    const btn = page.locator('[data-testid="button-create-shipment"], [data-testid="button-create-first-shipment"]').first();
    await btn.click();
    await expect(page.locator('[data-testid="input-destination-country"]')).toBeVisible();

    // Confirm without filling anything
    await page.locator('[data-testid="button-confirm-create"]').click();

    // Toast or inline error should appear — dialog stays open
    const toast = page.locator('[role="alert"], [data-sonner-toast], .toast').first();
    await expect(toast).toBeVisible({ timeout: 8_000 });
    await expect(page.locator('[data-testid="input-destination-country"]')).toBeVisible();
  });

  test('create shipment end-to-end', async ({ page }) => {
    if (!await goToShipments(page)) test.skip();

    const btn = page.locator('[data-testid="button-create-shipment"], [data-testid="button-create-first-shipment"]').first();
    await btn.click();
    await expect(page.locator('[data-testid="input-destination-country"]')).toBeVisible();

    await page.locator('[data-testid="input-destination-country"]').fill(TEST_DEST);
    await page.locator('[data-testid="input-commodity"]').fill(TEST_COMMODITY);
    await page.locator('[data-testid="input-buyer-company"]').fill(TEST_BUYER);
    await page.locator('[data-testid="button-confirm-create"]').click();

    // Success toast
    const toast = page.locator('[role="alert"], [data-sonner-toast], .toast').first();
    await expect(toast).toBeVisible({ timeout: 12_000 });
    await expect(toast).toContainText(/created|success/i);

    // Dialog closes
    await expect(page.locator('[data-testid="input-destination-country"]')).not.toBeVisible({ timeout: 8_000 });
  });

});
