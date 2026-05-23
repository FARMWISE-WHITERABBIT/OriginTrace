import { expect, type Browser, type BrowserContext, type Locator, type Page } from '@playwright/test';

export type QaRole =
  | 'admin'
  | 'aggregator'
  | 'agent'
  | 'quality'
  | 'logistics'
  | 'compliance'
  | 'warehouse'
  | 'buyer'
  | 'farmer';

export const QA_PASSWORD = 'Demo1234!';
export const QA_SEED_SKIP_MESSAGE =
  'QA seed data missing. Run npm run seed:qa and npm run seed:qa:data before this spec.';

export const QA_USERS: Record<QaRole, { email: string; password: string }> = {
  admin: { email: 'admin@demo.test', password: QA_PASSWORD },
  aggregator: { email: 'aggregator@demo.test', password: QA_PASSWORD },
  agent: { email: 'agent@demo.test', password: QA_PASSWORD },
  quality: { email: 'quality@demo.test', password: QA_PASSWORD },
  logistics: { email: 'logistics@demo.test', password: QA_PASSWORD },
  compliance: { email: 'compliance@demo.test', password: QA_PASSWORD },
  warehouse: { email: 'warehouse@demo.test', password: QA_PASSWORD },
  buyer: { email: 'buyer@demo.test', password: QA_PASSWORD },
  farmer: { email: 'farmer@demo.test', password: QA_PASSWORD },
};

export interface QaAnchors {
  farmerId: string;
  farmId: string;
  batchId: string;
  processingRunId: string;
  shipmentId: string;
  shipmentCode: string;
}

export interface AuthedPage {
  context: BrowserContext;
  page: Page;
}

type JsonMap = Record<string, any>;

export function dateDaysFromNow(days: number): string {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

export function dateTimeLocalDaysFromNow(days: number): string {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString().slice(0, 16);
}

export function uniqueQaName(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

export async function loginAsRole(page: Page, role: QaRole) {
  const user = QA_USERS[role];
  await page.goto('/auth/login');
  await page.locator('#email').waitFor({ state: 'visible' });
  await page.locator('#email').fill(user.email);
  await page.locator('#password').fill(user.password);
  await page.locator('[data-testid="button-login"]').click();
  await page.waitForURL(/\/app/, { timeout: 25_000 });
}

export async function newAuthedPage(browser: Browser, role: QaRole): Promise<AuthedPage> {
  const context = await browser.newContext({
    baseURL: process.env.E2E_BASE_URL || 'http://localhost:3000',
    storageState: { cookies: [], origins: [] },
  });
  const page = await context.newPage();
  try {
    await loginAsRole(page, role);
    return { context, page };
  } catch (error) {
    await context.close();
    throw error;
  }
}

export async function apiGetJson<T = JsonMap>(page: Page, url: string): Promise<T> {
  const response = await page.request.get(url);
  if (!response.ok()) {
    const body = await response.text().catch(() => '');
    throw new Error(`GET ${url} failed with ${response.status()}: ${body}`);
  }
  return response.json() as Promise<T>;
}

export async function apiPostJson<T = JsonMap>(
  page: Page,
  url: string,
  data: JsonMap,
): Promise<T> {
  const response = await page.request.post(url, { data });
  if (!response.ok()) {
    const body = await response.text().catch(() => '');
    throw new Error(`POST ${url} failed with ${response.status()}: ${body}`);
  }
  return response.json() as Promise<T>;
}

export async function apiPatchJson<T = JsonMap>(
  page: Page,
  url: string,
  data: JsonMap,
): Promise<T> {
  const response = await page.request.patch(url, { data });
  if (!response.ok()) {
    const body = await response.text().catch(() => '');
    throw new Error(`PATCH ${url} failed with ${response.status()}: ${body}`);
  }
  return response.json() as Promise<T>;
}

export async function findQaAnchors(page: Page): Promise<QaAnchors | null> {
  try {
    const [farmersData, farmsData, batchesData, processingData, shipmentsData] = await Promise.all([
      apiGetJson<JsonMap>(page, '/api/farmers?limit=1000'),
      apiGetJson<JsonMap>(page, '/api/farms?limit=1000'),
      apiGetJson<JsonMap>(page, '/api/batches?limit=1000'),
      apiGetJson<JsonMap>(page, '/api/processing-runs?limit=1000'),
      apiGetJson<JsonMap>(page, '/api/shipments?limit=1000'),
    ]);

    const farmers = farmersData.farmers || [];
    const farms = farmsData.farms || [];
    const batches = batchesData.batches || [];
    const processingRuns = processingData.processingRuns || [];
    const shipments = shipmentsData.shipments || [];

    const farmer = farmers.find((item: JsonMap) =>
      item.farmer_id === 'QA-FARMER-001' ||
      item.farm_id === 'QA-FARMER-001' ||
      String(item.farmer_name || '').includes('QA Ada Cocoa')
    );
    const farm = farms.find((item: JsonMap) =>
      item.farmer_id === 'QA-FARMER-001' ||
      String(item.farmer_name || '').includes('QA Ada Cocoa')
    );
    const batch = batches.find((item: JsonMap) => item.batch_code === 'QA-BCH-001');
    const processingRun = processingRuns.find((item: JsonMap) => item.run_code === 'QA-RUN-001');
    const shipment = shipments.find((item: JsonMap) => item.shipment_code === 'QA-SHP-001');

    const farmerId = String(farmer?.id || farmer?.farm_id || farm?.id || '');
    const farmId = String(farm?.id || farmer?.farm_id || farmer?.id || '');
    const batchId = String(batch?.id || '');
    const processingRunId = String(processingRun?.id || '');
    const shipmentId = String(shipment?.id || '');
    const shipmentCode = String(shipment?.shipment_code || '');

    if (!farmerId || !farmId || !batchId || !processingRunId || !shipmentId || !shipmentCode) {
      return null;
    }

    return { farmerId, farmId, batchId, processingRunId, shipmentId, shipmentCode };
  } catch {
    return null;
  }
}

export async function selectRadixOption(
  page: Page,
  trigger: Locator,
  optionName: string | RegExp,
) {
  await trigger.click();
  const option = page.getByRole('option', { name: optionName }).first();
  await expect(option).toBeVisible({ timeout: 5_000 });
  await option.click();
}

export async function waitForApiItem<T extends JsonMap>(
  page: Page,
  url: string,
  pickItems: (data: JsonMap) => T[],
  predicate: (item: T) => boolean,
  label: string,
): Promise<T> {
  const deadline = Date.now() + 12_000;
  let latest: T[] = [];

  while (Date.now() < deadline) {
    const data = await apiGetJson<JsonMap>(page, url);
    latest = pickItems(data);
    const item = latest.find(predicate);
    if (item) return item;
    await page.waitForTimeout(400);
  }

  throw new Error(`Timed out waiting for ${label}. Last item count: ${latest.length}`);
}

export async function createDocumentViaApi(
  page: Page,
  overrides: Partial<{
    title: string;
    document_type: string;
    file_url: string;
    file_name: string;
    file_size: number;
    notes: string;
  }>,
) {
  const title = overrides.title || uniqueQaName('E2E Document');
  const data = await apiPostJson<JsonMap>(page, '/api/documents', {
    title,
    document_type: overrides.document_type || 'other',
    file_url: overrides.file_url || `https://example.com/${encodeURIComponent(title)}.txt`,
    file_name: overrides.file_name || `${title}.txt`,
    file_size: overrides.file_size || 128,
    notes: overrides.notes || 'Created by Playwright QA coverage.',
  });
  return data.document as JsonMap;
}

async function getSupplyChainLinks(page: Page): Promise<JsonMap[]> {
  const data = await apiGetJson<JsonMap>(page, '/api/supply-chain-links');
  return data.links || [];
}

function findWhiteRabbitLink(links: JsonMap[]): JsonMap | undefined {
  return links.find((link) => {
    const exporter = link.exporter_org || {};
    return exporter.slug === 'demo-whiterabbit' ||
      String(exporter.name || '').toLowerCase().includes('whiterabbit');
  });
}

export async function ensureActiveSupplyChainLink(
  buyerPage: Page,
  exporterPage: Page,
): Promise<JsonMap> {
  let links = await getSupplyChainLinks(buyerPage);
  let link = findWhiteRabbitLink(links);

  if (!link) {
    const response = await buyerPage.request.post('/api/supply-chain-links', {
      data: { exporter_org_name: 'WhiteRabbit Demo Co.' },
    });
    if (!response.ok() && response.status() !== 409) {
      const body = await response.text().catch(() => '');
      throw new Error(`Could not create supply-chain link: ${response.status()} ${body}`);
    }
    links = await getSupplyChainLinks(buyerPage);
    link = findWhiteRabbitLink(links);
  }

  if (!link?.id) {
    throw new Error('WhiteRabbit supply-chain link was not found after invitation setup.');
  }

  if (link.status !== 'active') {
    await apiPatchJson(exporterPage, '/api/supply-chain-links', {
      link_id: link.id,
      status: 'active',
    });
    links = await getSupplyChainLinks(buyerPage);
    link = findWhiteRabbitLink(links);
  }

  expect(link?.status).toBe('active');
  return link!;
}
