/**
 * tests/e2e/farms.spec.ts
 *
 * Farm listing, search, and basic interaction.
 * Uses shared admin auth state.
 */

import { test, expect } from '@playwright/test';

test.describe('Farms', () => {

  test.beforeEach(async ({ page }) => {
    await page.goto('/app/farms');
    await page.waitForURL(/\/app\/farms/, { timeout: 15_000 });
  });

  test('page heading reads "Farms"', async ({ page }) => {
    await expect(page.locator('h1')).toContainText('Farms');
  });

  test('search input is visible', async ({ page }) => {
    await expect(page.locator('[data-testid="input-search-farms"]')).toBeVisible();
  });

  test('search input is interactive', async ({ page }) => {
    const search = page.locator('[data-testid="input-search-farms"]');
    await search.fill('test search');
    const val = await search.inputValue();
    expect(val).toBe('test search');

    // Clear it
    await search.fill('');
    expect(await search.inputValue()).toBe('');
  });

  test('farm rows render or empty state shows', async ({ page }) => {
    // Wait for loading to complete
    await page.waitForTimeout(1500);

    const rows      = page.locator('[data-testid^="farm-row-"]');
    const emptyText = page.getByText(/no farms|no results/i);

    const hasRows  = await rows.count() > 0;
    const isEmpty  = await emptyText.isVisible().catch(() => false);

    // One of the two must be true — page has loaded some state
    expect(hasRows || isEmpty).toBe(true);
  });

  test('search with known-bad string shows no results', async ({ page }) => {
    const search = page.locator('[data-testid="input-search-farms"]');
    await search.fill('zzz-definitely-not-a-real-farm-xyz-12345');
    await page.waitForTimeout(800); // debounce

    const rows = page.locator('[data-testid^="farm-row-"]');
    await expect(rows).toHaveCount(0, { timeout: 5_000 });
  });

});
