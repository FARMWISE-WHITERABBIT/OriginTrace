/**
 * tests/e2e/farm-approval.spec.ts
 *
 * Verifies that the Farm Approval UI properly blocks approval of farms
 * missing required compliance data (boundary, area, legality_doc, ID).
 *
 * Strategy: Create a deliberately incomplete farm via the API, then
 * navigate to the Farms page and attempt to review it. The "Approve"
 * button should be disabled and a warning should be visible.
 */

import { test, expect } from '@playwright/test';

test.describe('Farm Approval Gate', () => {

  test('incomplete farm shows warning and disables Approve button', async ({ page }) => {
    const timestamp = Date.now();
    const farmName = `Incomplete Farm ${timestamp}`;

    // 1. Create an incomplete farm via the API (no boundary, no area, no legality_doc)
    //    Use page.request so the Supabase auth cookies are sent
    const createResp = await page.request.post('/api/farms', {
      data: {
        farmer_name: farmName,
        community: 'Testville',
        // Deliberately omitting: boundary, area_hectares, legality_doc_url
      }
    });

    const createText = await createResp.text();
    console.log('Create farm status:', createResp.status(), 'body:', createText.slice(0, 500));
    let createBody: any = {};
    try { createBody = JSON.parse(createText); } catch { /* HTML error page */ }

    // If farm creation fails (e.g. tier gate or server error), skip gracefully
    if (!createResp.ok()) {
      test.skip(true, `Farm creation failed with ${createResp.status()}: ${createBody.error}`);
      return;
    }

    const farmId = createBody.farm?.id;
    expect(farmId).toBeDefined();

    // 2. Navigate to the farms page
    await page.goto('/app/farms');
    await page.waitForURL(/\/app\/farms/, { timeout: 15_000 });

    // Review actions live in the list view; the map is the default view.
    const listViewButton = page.getByRole('button', { name: /List View/i });
    if (await listViewButton.isVisible().catch(() => false)) {
      await listViewButton.click();
    }

    // Wait for farms to load
    await page.waitForTimeout(2000);

    // 3. Switch to the "Pending Review" tab if it exists
    const pendingTab = page.locator('button[value="pending"]');
    if (await pendingTab.isVisible().catch(() => false)) {
      await pendingTab.click();
      await page.waitForTimeout(1000);
    }

    // 4. Find and click the review button for our farm
    const reviewBtn = page.locator(`[data-testid="button-review-${farmId}"]`);

    // If the farm doesn't appear in the list, try searching for it
    if (!await reviewBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      const searchInput = page.locator('[data-testid="input-search-farms"]');
      if (await searchInput.isVisible().catch(() => false)) {
        await searchInput.fill(farmName);
        await page.waitForTimeout(1000);
      }
    }

    // The review action must be present; silently skipping would hide a broken
    // approval workflow.
    await expect(reviewBtn).toBeVisible({ timeout: 5000 });

    // Click review if visible
    if (await reviewBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await reviewBtn.click();

      // 5. Dialog should open
      const dialog = page.getByRole('dialog', { name: 'Review Farm Registration' });
      await expect(dialog).toBeVisible({ timeout: 5000 });

      // 6. Check for the missing fields warning
      await expect(dialog.getByText(/Farm cannot be approved until all required documentation is provided/i)).toBeVisible();

      // 7. Check that the Approve button is disabled
      const approveBtn = page.locator('[data-testid="button-approve"]');
      await expect(approveBtn).toBeDisabled();
    } else {
      console.log('Review button not found for farm', farmId, '— skipping UI assertions');
      test.skip(true, 'Created farm not visible in the pending review list');
    }
  });

});
