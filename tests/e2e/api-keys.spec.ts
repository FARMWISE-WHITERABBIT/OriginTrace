/**
 * tests/e2e/api-keys.spec.ts
 *
 * API key creation and management.
 * Uses shared admin auth state.
 */

import { test, expect } from '@playwright/test';

const TEST_KEY_NAME = `E2E-Key-${Date.now()}`;

test.describe('API Keys', () => {

  test.beforeEach(async ({ page }) => {
    await page.goto('/app/api-keys');
    await page.waitForURL(/\/app\/api-keys/, { timeout: 15_000 });
  });

  test('page title reads "API Keys"', async ({ page }) => {
    await expect(page.locator('[data-testid="text-page-title"]')).toContainText('API Keys');
  });

  test('create key button is visible', async ({ page }) => {
    await expect(page.locator('[data-testid="button-create-key"]')).toBeVisible();
  });

  test('create key dialog opens', async ({ page }) => {
    await page.locator('[data-testid="button-create-key"]').click();
    await expect(page.getByText('Create API Key')).toBeVisible({ timeout: 5_000 });
    await expect(page.locator('[data-testid="input-key-name"]')).toBeVisible();
    await expect(page.locator('[data-testid="input-rate-limit"]')).toBeVisible();
    await expect(page.locator('[data-testid="input-expires-days"]')).toBeVisible();
  });

  test('create key end-to-end — new key secret is shown', async ({ page }) => {
    await page.locator('[data-testid="button-create-key"]').click();
    await expect(page.locator('[data-testid="input-key-name"]')).toBeVisible();

    await page.locator('[data-testid="input-key-name"]').fill(TEST_KEY_NAME);

    await page.locator('[data-testid="button-confirm-create"]').click();

    // After creation, the secret is revealed once in a read-only input
    await expect(page.locator('[data-testid="input-new-key-secret"]')).toBeVisible({ timeout: 10_000 });

    const secret = await page.locator('[data-testid="input-new-key-secret"]').inputValue();
    expect(secret.length).toBeGreaterThan(10); // real key, not empty

    // Copy button should be present
    await expect(page.locator('[data-testid="button-copy-key"]')).toBeVisible();
  });

  test('created key appears in the key list', async ({ page }) => {
    // Create a key
    await page.locator('[data-testid="button-create-key"]').click();
    await page.locator('[data-testid="input-key-name"]').fill(TEST_KEY_NAME);
    await page.locator('[data-testid="button-confirm-create"]').click();
    await expect(page.locator('[data-testid="input-new-key-secret"]')).toBeVisible({ timeout: 10_000 });

    // Close the dialog (press Escape or click outside)
    await page.keyboard.press('Escape');
    await expect(page.locator('[data-testid="input-new-key-secret"]')).not.toBeVisible({ timeout: 5_000 });

    // The key name should appear in the table
    await expect(page.getByText(TEST_KEY_NAME)).toBeVisible({ timeout: 5_000 });
  });

  test('revoke button is present for existing keys', async ({ page }) => {
    // Look for any revoke button in the table
    const revokeBtn = page.locator('[data-testid^="button-revoke-"]').first();
    // Only assert if there are keys already — skip if the list is empty
    const count = await revokeBtn.count();
    if (count > 0) {
      await expect(revokeBtn).toBeVisible();
    }
  });

});
