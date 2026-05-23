import { test, expect, type Browser } from '@playwright/test';
import {
  apiGetJson,
  apiPatchJson,
  findQaAnchors,
  newAuthedPage,
  QA_SEED_SKIP_MESSAGE,
  type AuthedPage,
  type QaAnchors,
} from './helpers/qa-flows';

type SeededAdmin = AuthedPage & { anchors: QaAnchors };

async function seededAdmin(browser: Browser): Promise<SeededAdmin> {
  let qa: AuthedPage;
  try {
    qa = await newAuthedPage(browser, 'admin');
  } catch (error) {
    test.skip(true, `${QA_SEED_SKIP_MESSAGE} Could not log in as admin@demo.test.`);
    throw error;
  }
  const anchors = await findQaAnchors(qa.page);
  if (!anchors) {
    await qa.context.close();
    test.skip(true, QA_SEED_SKIP_MESSAGE);
    throw new Error(QA_SEED_SKIP_MESSAGE);
  }
  return { ...qa, anchors };
}

test.describe('Untested seeded entity operations', () => {
  test.describe.configure({ mode: 'serial' });

  test('3.3, 3.6, 11.6 shows farmer profile, bank account, and price agreement', async ({ browser }) => {
    const { context, page, anchors } = await seededAdmin(browser);
    try {
      await page.goto(`/app/farmers/${anchors.farmerId}`);

      await expect(page.locator('[data-testid="text-farmer-name"]')).toContainText('QA Ada Cocoa');
      await expect(page.getByText('QA-FARMER-001')).toBeVisible();
      await expect(page.getByText('Idanre QA Cluster')).toBeVisible();

      await page.getByRole('tab', { name: /payments/i }).click();
      await expect(page.getByText('Access Bank')).toBeVisible();
      await expect(page.getByText('0123456789')).toBeVisible();
      await expect(page.getByText(/2,500\/kg|2500\/kg/)).toBeVisible();
    } finally {
      await context.close();
    }
  });

  test('3.4 edits farmer details and restores the seeded phone number', async ({ browser }) => {
    const { context, page, anchors } = await seededAdmin(browser);
    const original = await apiGetJson<{ farm?: { phone?: string } }>(
      page,
      `/api/farmers/${anchors.farmerId}`,
    );
    const originalPhone = original.farm?.phone || '+2348012349001';
    const newPhone = '+2348012349011';

    try {
      await page.goto(`/app/farmers/${anchors.farmerId}`);
      await expect(page.locator('[data-testid="text-farmer-name"]')).toContainText('QA Ada Cocoa');

      await page.locator('[data-testid="button-edit-farmer"]').click();
      await page.getByPlaceholder('+234...').fill(newPhone);
      await page.locator('[data-testid="button-save-farmer"]').click();

      await expect(page.getByText(newPhone)).toBeVisible();
    } finally {
      await apiPatchJson(page, `/api/farmers/${anchors.farmerId}`, { phone: originalPhone }).catch(() => {});
      await context.close();
    }
  });

  test('4.4, 4.5 shows farm GeoJSON boundary and runs deforestation check', async ({ browser }) => {
    const { context, page, anchors } = await seededAdmin(browser);
    try {
      await page.route('**/api/deforestation-check', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            farm_id: anchors.farmId,
            result: {
              deforestation_free: true,
              forest_loss_hectares: 0,
              forest_loss_percentage: 0,
              analysis_date: new Date().toISOString(),
              data_source: 'Playwright deterministic QA baseline',
              risk_level: 'low',
            },
          }),
        });
      });

      await page.goto(`/app/farms/${anchors.farmId}`);
      await page.waitForURL(/\/app\/farms\/map\?farm_id=/);
      await expect(page.locator('[data-testid="text-page-title"]')).toContainText('Map Farm Boundary');
      await expect(page.getByText('QA Ada Cocoa')).toBeVisible();
      await expect(page.locator('[data-testid="text-area"]')).toBeVisible();
      await expect(page.locator('[data-testid="badge-boundary-confidence"]')).toContainText(/high/i);
      await expect(page.locator('[data-testid="text-boundary-score"]')).toContainText('94');

      const recheck = page.locator('[data-testid="button-recheck-deforestation"]');
      if (await recheck.isVisible().catch(() => false)) {
        await recheck.click();
      } else {
        await page.locator('[data-testid="button-check-deforestation"]').click();
      }

      await expect(page.locator('[data-testid="badge-deforestation-free"]')).toBeVisible();
      await expect(page.locator('[data-testid="text-forest-loss-hectares"]')).toContainText('0');
      await expect(page.locator('[data-testid="text-forest-loss-percentage"]')).toContainText('0');
    } finally {
      await context.close();
    }
  });

  test('5.4, 6.3 shows batch contributions from collection and inventory detail', async ({ browser }) => {
    const { context, page, anchors } = await seededAdmin(browser);
    try {
      await page.goto(`/app/collect/${anchors.batchId}`);
      await page.waitForURL(/\/app\/inventory\//);

      await expect(page.getByText('QA-BCH-001')).toBeVisible();
      await expect(page.getByText('QA Ada Cocoa')).toBeVisible();
      await expect(page.getByText('QA Musa Cocoa')).toBeVisible();
      await expect(page.getByText('QA-RUN-001')).toBeVisible();
    } finally {
      await context.close();
    }
  });

  test('5.7 shows dispatch detail for the seeded batch', async ({ browser }) => {
    const { context, page, anchors } = await seededAdmin(browser);
    try {
      await page.goto(`/app/dispatch/${anchors.batchId}`);

      await expect(page.getByText('Dispatch Details')).toBeVisible();
      await expect(page.getByText('QA-BCH-001')).toBeVisible();
      await expect(page.getByText('QA Export Warehouse, Lagos')).toBeVisible();
      await expect(page.getByText('QA-TRUCK-001')).toBeVisible();
      await expect(page.getByText('QA Test Driver')).toBeVisible();
      await expect(page.getByText('QA Ada Cocoa')).toBeVisible();
    } finally {
      await context.close();
    }
  });

  test('8.3 shows processing run detail with source batch and finished goods', async ({ browser }) => {
    const { context, page, anchors } = await seededAdmin(browser);
    try {
      await page.goto(`/app/processing/${anchors.processingRunId}`);

      await expect(page.getByText('QA-RUN-001')).toBeVisible();
      await expect(page.getByText('QA Lagos Processing Facility')).toBeVisible();
      await expect(page.getByText('QA-BCH-001')).toBeVisible();
      await expect(page.getByText('QA Export Cocoa Beans')).toBeVisible();
    } finally {
      await context.close();
    }
  });

  test('7.3, 7.6, 17.3 shows shipment detail, readiness score, and providers', async ({ browser }) => {
    const { context, page, anchors } = await seededAdmin(browser);
    try {
      await page.goto(`/app/shipments/${anchors.shipmentId}`);

      await expect(page.locator('[data-testid="text-shipment-code"]')).toContainText('QA-SHP-001');
      await expect(page.locator('[data-testid="text-decision-label"]')).toContainText(/ready to ship/i);
      await expect(page.locator('[data-testid="text-overall-score"]')).toContainText('92');
      await expect(page.locator('[data-testid="card-shipment-pipeline"]')).toBeVisible();
      await expect(page.locator('[data-testid="card-supply-chain-graph"]')).toBeVisible();
      await expect(page.locator('[data-testid="card-action-center"]')).toBeVisible();

      await expect(page.getByDisplayValue('QA Freight Forwarders Ltd')).toBeVisible();
      await expect(page.getByDisplayValue('QA Atlantic Shipping Line')).toBeVisible();

      await page.locator('[data-testid="pipeline-stage-4"]').getByRole('button').click();
      await expect(page.getByDisplayValue('QA Clearing Agency')).toBeVisible();

      await page.locator('[data-testid="pipeline-stage-2"]').getByRole('button').click();
      await expect(page.getByDisplayValue('QA Inspection Bureau')).toBeVisible();
    } finally {
      await context.close();
    }
  });

  test('7.4 updates shipment status and reflects it in the detail badge', async ({ browser }) => {
    const { context, page, anchors } = await seededAdmin(browser);
    const original = await apiGetJson<{ shipment?: { status?: string } }>(
      page,
      `/api/shipments/${anchors.shipmentId}`,
    );
    const originalStatus = original.shipment?.status || 'draft';
    const nextStatus = originalStatus === 'ready' ? 'draft' : 'ready';

    try {
      await apiPatchJson(page, `/api/shipments/${anchors.shipmentId}`, { status: nextStatus });
      await page.goto(`/app/shipments/${anchors.shipmentId}`);

      await expect(page.locator('[data-testid="badge-shipment-status"]')).toContainText(nextStatus);
    } finally {
      await apiPatchJson(page, `/api/shipments/${anchors.shipmentId}`, { status: originalStatus }).catch(() => {});
      await context.close();
    }
  });

  test('7.5 opens the shipment waybill/readiness PDF export', async ({ browser }) => {
    const { context, page, anchors } = await seededAdmin(browser);
    try {
      await page.goto(`/app/shipments/${anchors.shipmentId}`);
      await expect(page.locator('[data-testid="text-shipment-code"]')).toContainText('QA-SHP-001');

      const popupPromise = page.waitForEvent('popup');
      await page.getByRole('button', { name: /export pdf/i }).click();
      const popup = await popupPromise;
      await popup.waitForLoadState('domcontentloaded');

      await expect(popup).toHaveURL(new RegExp(`/api/shipments/${anchors.shipmentId}/export-pdf`));
      await expect(popup.locator('body')).toContainText('Shipment Readiness Report');
      await expect(popup.locator('body')).toContainText('QA-SHP-001');
      await popup.close();
    } finally {
      await context.close();
    }
  });
});
