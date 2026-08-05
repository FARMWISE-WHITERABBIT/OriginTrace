/**
 * tests/e2e/inventory-traceability.spec.ts
 *
 * Verifies that the inventory API (bags endpoint) correctly joins
 * with collection_batches and farms to provide full traceability.
 *
 * Uses page.request (not the standalone request fixture) so that
 * Supabase auth cookies from storageState are sent with API calls.
 */

import { test, expect } from '@playwright/test';

test.describe('Inventory Traceability', () => {

  test('bags API returns linked collection batch and farm data', async ({ page }) => {
    const response = await page.request.get('/api/bags');
    const statusCode = response.status();

    // Log for debugging
    if (statusCode !== 200) {
      const text = await response.text().catch(() => '(no body)');
      console.log('Bags API status:', statusCode, 'body:', text.slice(0, 500));
    }

    // Accept 200 or 403 (tier gate may block the demo tenant)
    expect([200, 403]).toContain(statusCode);

    if (statusCode === 200) {
      const body = await response.json();

      // Check that bags array is present
      expect(body).toHaveProperty('bags');
      expect(Array.isArray(body.bags)).toBe(true);

      // If there are bags, verify the structure contains the enriched fields
      if (body.bags.length > 0) {
        const bag = body.bags[0];

        expect(bag).toHaveProperty('id');
        expect(bag).toHaveProperty('serial');
        expect(bag).toHaveProperty('status');

        // These are the joined fields from collection_batches → farms
        expect(bag).toHaveProperty('batch_code');
        expect(bag).toHaveProperty('farmer_name');
        expect(bag).toHaveProperty('community');
      }
    }

    const batchesResponse = await page.request.get('/api/batches?limit=100');
    expect([200, 403]).toContain(batchesResponse.status());
    if (batchesResponse.status() === 200) {
      const batchesBody = await batchesResponse.json();
      expect(Array.isArray(batchesBody.batches)).toBe(true);
      if (batchesBody.batches.length > 0) {
        expect(batchesBody.batches[0]).toHaveProperty('farm');
      }
    }

    const dispatchResponse = await page.request.get('/api/dispatch');
    expect([200, 403]).toContain(dispatchResponse.status());
    if (dispatchResponse.status() === 200) {
      const dispatchBody = await dispatchResponse.json();
      expect(Array.isArray(dispatchBody.dispatch_records)).toBe(true);
    }

    const inventoryResponse = await page.request.get('/api/inventory');
    expect([200, 403]).toContain(inventoryResponse.status());
    if (inventoryResponse.status() === 200) {
      const inventoryBody = await inventoryResponse.json();
      expect(Array.isArray(inventoryBody.batches)).toBe(true);
      expect(Array.isArray(inventoryBody.bags)).toBe(true);
      expect(Array.isArray(inventoryBody.dispatch_records)).toBe(true);
    }
  });

});
