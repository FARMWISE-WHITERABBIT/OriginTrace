/**
 * tests/e2e/compliance-profiles.spec.ts
 *
 * Compliance profile creation, template loading, and listing.
 * Uses shared admin auth state.
 */

import { test, expect } from '@playwright/test';

const TEST_PROFILE_NAME = `E2E-Profile-${Date.now()}`;
const TEST_MARKET       = 'EU';

test.describe('Compliance Profiles', () => {

  test.beforeEach(async ({ page }) => {
    await page.goto('/app/compliance-profiles');
    await page.waitForURL(/\/app\/compliance-profiles/, { timeout: 15_000 });
  });

  test('page title is visible', async ({ page }) => {
    await expect(page.locator('[data-testid="text-page-title"]')).toBeVisible();
    await expect(page.locator('[data-testid="text-page-title"]')).toContainText(/compliance/i);
  });

  test('new profile button is visible', async ({ page }) => {
    await expect(page.locator('[data-testid="button-new-profile"]')).toBeVisible();
  });

  test('new profile dialog opens with template options', async ({ page }) => {
    await page.locator('[data-testid="button-new-profile"]').click();

    // Template buttons should appear
    await expect(page.locator('[data-testid="button-template-eu"]')).toBeVisible({ timeout: 5_000 });
    await expect(page.locator('[data-testid="button-template-uk"]')).toBeVisible();
    await expect(page.locator('[data-testid="button-template-us"]')).toBeVisible();
    await expect(page.locator('[data-testid="button-template-lacey"]')).toBeVisible();
  });

  test('EU template pre-fills form fields', async ({ page }) => {
    await page.locator('[data-testid="button-new-profile"]').click();
    await expect(page.locator('[data-testid="button-template-eu"]')).toBeVisible();

    await page.locator('[data-testid="button-template-eu"]').click();

    // After selecting EU template, name and market fields should be pre-filled
    const nameInput   = page.locator('[data-testid="input-profile-name"]');
    const marketInput = page.locator('[data-testid="input-destination-market"]');
    await expect(nameInput).toBeVisible();
    await expect(marketInput).toBeVisible();

    const nameVal  = await nameInput.inputValue();
    const mktVal   = await marketInput.inputValue();
    // Template should pre-fill something
    expect(nameVal.length + mktVal.length).toBeGreaterThan(0);
  });

  test('can fill and submit a new compliance profile', async ({ page }) => {
    await page.locator('[data-testid="button-new-profile"]').click();
    await expect(page.locator('[data-testid="input-profile-name"]')).toBeVisible({ timeout: 5_000 });

    await page.locator('[data-testid="input-profile-name"]').fill(TEST_PROFILE_NAME);
    await page.locator('[data-testid="input-destination-market"]').fill(TEST_MARKET);

    // Select a regulation framework if the select is present
    const frameworkSelect = page.locator('[data-testid="select-regulation-framework"]');
    if (await frameworkSelect.isVisible()) {
      await frameworkSelect.click();
      // Pick the first available option
      const option = page.locator('[role="option"]').first();
      if (await option.isVisible()) await option.click();
    }

    // Submit
    const submitBtn = page.locator('button[type="submit"], [data-testid="button-save-profile"]').first();
    await submitBtn.click();

    // Success feedback — toast or redirect to list
    const toast = page.locator('[role="alert"], [data-sonner-toast], .toast').first();
    const savedVisible = await toast.isVisible({ timeout: 8_000 }).catch(() => false);

    // Either a success toast or the new profile appearing in the list is acceptable
    if (!savedVisible) {
      await expect(page.getByText(TEST_PROFILE_NAME)).toBeVisible({ timeout: 8_000 });
    }
  });

});
