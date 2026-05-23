import { test, expect, type Browser } from '@playwright/test';
import {
  apiGetJson,
  createDocumentViaApi,
  dateDaysFromNow,
  dateTimeLocalDaysFromNow,
  ensureActiveSupplyChainLink,
  newAuthedPage,
  selectRadixOption,
  uniqueQaName,
  waitForApiItem,
  type AuthedPage,
} from './helpers/qa-flows';

type JsonMap = Record<string, any>;

async function authed(browser: Browser, role: Parameters<typeof newAuthedPage>[1]): Promise<AuthedPage> {
  try {
    return await newAuthedPage(browser, role);
  } catch (error) {
    test.skip(true, `QA user ${role} could not log in. Run npm run seed:qa before this spec.`);
    throw error;
  }
}

test.describe('Untested action and scenario operations', () => {
  test.describe.configure({ mode: 'serial' });

  test('10.5 creates a compliance profile from the settings compliance tab', async ({ browser }) => {
    const { context, page } = await authed(browser, 'admin');
    const profileName = uniqueQaName('E2E Compliance Profile');
    try {
      await page.goto('/app/settings?tab=compliance');

      await page.locator('[data-testid="button-new-profile"]').click();
      await page.getByPlaceholder('e.g. EU EUDR Export Profile').fill(profileName);
      await page.getByPlaceholder('e.g. European Union, China').fill('European Union');
      await page.getByRole('button', { name: /^Create Profile$/ }).click();

      await expect(page.getByText(profileName)).toBeVisible();
      await expect(page.getByText('European Union')).toBeVisible();
    } finally {
      await context.close();
    }
  });

  test('16.2 uploads a document through the document vault UI', async ({ browser }) => {
    const { context, page } = await authed(browser, 'admin');
    const title = uniqueQaName('E2E Uploaded Document');
    const fileName = `${title}.txt`;
    try {
      await page.route('**/api/upload', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            url: `https://example.com/${encodeURIComponent(fileName)}`,
            file_name: fileName,
            file_size: 24,
          }),
        });
      });

      await page.goto('/app/documents');
      await page.locator('[data-testid="button-add-document"]').click();
      await page.locator('[data-testid="input-doc-title"]').fill(title);
      await selectRadixOption(page, page.locator('[data-testid="select-doc-type"]'), 'Export License');
      await page.locator('[data-testid="input-doc-file-picker"]').setInputFiles({
        name: fileName,
        mimeType: 'text/plain',
        buffer: Buffer.from('OriginTrace QA upload'),
      });

      await expect(page.locator('[data-testid="document-upload-success"]')).toBeVisible();
      await expect(page.locator('[data-testid="text-uploaded-filename"]')).toContainText(fileName);
      await page.getByRole('button', { name: /^Add Document$/ }).click();

      const document = await waitForApiItem<JsonMap>(
        page,
        '/api/documents?limit=100',
        (data) => data.documents || [],
        (item) => item.title === title,
        'uploaded document',
      );

      await expect(page.locator(`[data-testid="card-document-${document.id}"]`)).toBeVisible();
      await expect(page.locator(`[data-testid="text-doc-title-${document.id}"]`)).toContainText(title);
    } finally {
      await context.close();
    }
  });

  test('16.3 opens a stored document attachment from the download control', async ({ browser }) => {
    const { context, page } = await authed(browser, 'admin');
    const title = uniqueQaName('E2E Download Document');
    try {
      const document = await createDocumentViaApi(page, {
        title,
        document_type: 'export_license',
        file_url: 'https://example.com/origintrace-e2e-download.txt',
        file_name: 'origintrace-e2e-download.txt',
      });

      await page.goto('/app/documents');
      await page.locator('[data-testid="input-search-documents"]').fill(title);
      await expect(page.locator(`[data-testid="card-document-${document.id}"]`)).toBeVisible();

      const popupPromise = page.waitForEvent('popup');
      await page.locator(`[data-testid="button-download-doc-${document.id}"]`).click();
      const popup = await popupPromise;
      await expect(popup).toHaveURL(/example\.com\/origintrace-e2e-download\.txt/);
      await popup.close();
    } finally {
      await context.close();
    }
  });

  test('12.2 creates a buyer contract and verifies it on exporter contracts', async ({ browser }) => {
    const buyer = await authed(browser, 'buyer');
    const exporter = await authed(browser, 'admin');
    const commodity = uniqueQaName('E2E Contract Cocoa');
    try {
      await ensureActiveSupplyChainLink(buyer.page, exporter.page);

      await buyer.page.goto('/app/buyer/contracts');
      await buyer.page.locator('[data-testid="button-new-contract"]').click();
      await selectRadixOption(
        buyer.page,
        buyer.page.locator('[data-testid="select-exporter"]'),
        /WhiteRabbit Demo Co/i,
      );
      await buyer.page.locator('[data-testid="input-commodity"]').fill(commodity);
      await buyer.page.locator('[data-testid="input-quantity"]').fill('12');
      await buyer.page.locator('[data-testid="input-deadline"]').fill(dateDaysFromNow(35));
      await buyer.page.locator('[data-testid="input-port"]').fill('Hamburg');
      await buyer.page.locator('[data-testid="input-quality"]').fill('{"grade":"A","moisture_max":7.5}');
      await buyer.page.locator('[data-testid="input-notes"]').fill('Created by Playwright QA coverage.');
      await buyer.page.locator('[data-testid="button-confirm-contract"]').click();

      const contract = await waitForApiItem<JsonMap>(
        buyer.page,
        '/api/contracts?limit=100',
        (data) => data.contracts || [],
        (item) => item.commodity === commodity,
        'buyer contract',
      );

      await exporter.page.goto('/app/contracts');
      await exporter.page.locator('[data-testid="input-search-contracts"]').fill(contract.contract_reference);
      await expect(exporter.page.locator(`[data-testid="text-contract-ref-${contract.id}"]`)).toContainText(
        contract.contract_reference,
      );
      await expect(exporter.page.getByText(commodity)).toBeVisible();
    } finally {
      await buyer.context.close();
      await exporter.context.close();
    }
  });

  test('12.4, 12.5 creates a buyer tender and submits an exporter bid', async ({ browser }) => {
    const buyer = await authed(browser, 'buyer');
    const exporter = await authed(browser, 'admin');
    const title = uniqueQaName('E2E Tender');
    const commodity = uniqueQaName('E2E Tender Cocoa');
    try {
      await buyer.page.goto('/app/buyer/tenders');
      await buyer.page.locator('[data-testid="button-new-tender"]').click();
      await buyer.page.locator('[data-testid="input-tender-title"]').fill(title);
      await buyer.page.locator('[data-testid="input-tender-commodity"]').fill(commodity);
      await buyer.page.locator('[data-testid="input-tender-quantity"]').fill('18');
      await buyer.page.locator('[data-testid="input-tender-price"]').fill('3450');
      await selectRadixOption(buyer.page, buyer.page.locator('[data-testid="select-tender-currency"]'), 'USD');
      await buyer.page.locator('[data-testid="input-tender-deadline"]').fill(dateDaysFromNow(45));
      await buyer.page.locator('[data-testid="input-tender-closes"]').fill(dateTimeLocalDaysFromNow(7));
      await buyer.page.locator('[data-testid="input-tender-country"]').fill('Germany');
      await buyer.page.locator('[data-testid="input-tender-port"]').fill('Hamburg');
      await selectRadixOption(buyer.page, buyer.page.locator('[data-testid="select-tender-visibility"]'), 'Public');
      await selectRadixOption(buyer.page, buyer.page.locator('[data-testid="select-tender-regulation"]'), 'EUDR');
      await buyer.page.locator('[data-testid="input-tender-certs"]').fill('Rainforest Alliance, Fairtrade');
      await buyer.page.locator('[data-testid="button-confirm-tender"]').click();

      const tender = await waitForApiItem<JsonMap>(
        buyer.page,
        '/api/tenders?limit=100',
        (data) => data.tenders || [],
        (item) => item.title === title,
        'buyer tender',
      );

      await exporter.page.goto('/app/tenders');
      await exporter.page.locator('[data-testid="input-search-marketplace"]').fill(title);
      await expect(exporter.page.locator(`[data-testid="card-tender-${tender.id}"]`)).toBeVisible();
      await expect(exporter.page.locator(`[data-testid="text-tender-title-${tender.id}"]`)).toContainText(title);
      await exporter.page.locator(`[data-testid="button-bid-${tender.id}"]`).click();
      await exporter.page.locator('[data-testid="input-bid-price"]').fill('3300');
      await exporter.page.locator('[data-testid="input-bid-quantity"]').fill('12');
      await exporter.page.locator('[data-testid="input-bid-delivery"]').fill(dateDaysFromNow(40));
      await exporter.page.locator('[data-testid="input-bid-notes"]').fill('Submitted by Playwright QA coverage.');
      await exporter.page.locator('[data-testid="button-confirm-bid"]').click();

      await expect(exporter.page.locator(`[data-testid="badge-my-bid-${tender.id}"]`)).toContainText(/submitted/i);
    } finally {
      await buyer.context.close();
      await exporter.context.close();
    }
  });

  test('21.2 restricted agent cannot see the team invite button', async ({ browser }) => {
    const { context, page } = await authed(browser, 'agent');
    try {
      await page.goto('/app/team');

      await expect(page.getByText('Access Restricted')).toBeVisible();
      await expect(page.getByText(/Only organisation admins and aggregators/i)).toBeVisible();
      await expect(page.locator('[data-testid="button-add-member"]')).toHaveCount(0);
    } finally {
      await context.close();
    }
  });

  test('21.4 starter-tier profile shows an upgrade prompt on a gated route', async ({ browser }) => {
    const { context, page } = await authed(browser, 'admin');
    try {
      await page.route('**/api/profile', async (route) => {
        const response = await route.fetch();
        const data = await response.json();
        await route.fulfill({
          status: response.status(),
          contentType: 'application/json',
          body: JSON.stringify({
            ...data,
            organization: {
              ...(data.organization || {}),
              subscription_tier: 'starter',
            },
          }),
        });
      });

      await page.goto('/app/shipments');

      await expect(page.locator('[data-testid="text-tier-gate-title"]')).toContainText(
        /Shipment Readiness Requires Upgrade/i,
      );
      await expect(page.locator('[data-testid="badge-required-tier"]')).toContainText('Pro');
      await expect(page.locator('[data-testid="badge-current-tier"]')).toContainText('Starter');
    } finally {
      await context.close();
    }
  });
});
