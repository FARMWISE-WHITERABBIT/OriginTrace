import { expect, type Browser, type BrowserContext, type Locator, type Page } from '@playwright/test';
import { existsSync, readFileSync } from 'fs';

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

const SUPABASE_SESSION_MAX_AGE_SECONDS = 400 * 24 * 60 * 60;
const SUPABASE_COOKIE_CHUNK_SIZE = 3180;

export function getE2eBaseUrl(): string {
  const baseUrl = process.env.E2E_BASE_URL || 'http://localhost:3000';
  return baseUrl.replace('http://127.0.0.1:5000', 'http://localhost:5000');
}

function getEnvValue(key: string): string | undefined {
  if (process.env[key]) return process.env[key];
  if (!existsSync('.env.local')) return undefined;

  const line = readFileSync('.env.local', 'utf8')
    .split(/\r?\n/)
    .find((entry) => entry.startsWith(`${key}=`));

  return line?.slice(key.length + 1).trim();
}

function base64UrlEncode(value: string): string {
  return Buffer.from(value, 'utf8')
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

function sessionCookieChunks(name: string, value: string) {
  const encoded = encodeURIComponent(value);
  if (encoded.length <= SUPABASE_COOKIE_CHUNK_SIZE) {
    return [{ name, value }];
  }

  const chunks: Array<{ name: string; value: string }> = [];
  for (let i = 0; i < value.length; i += SUPABASE_COOKIE_CHUNK_SIZE) {
    chunks.push({ name: `${name}.${chunks.length}`, value: value.slice(i, i + SUPABASE_COOKIE_CHUNK_SIZE) });
  }
  return chunks;
}

export async function authenticateContextWithCredentials(
  context: BrowserContext,
  email: string,
  password: string,
) {
  const supabaseUrl = getEnvValue('NEXT_PUBLIC_SUPABASE_URL') || 'http://127.0.0.1:54321';
  const anonKey = getEnvValue('NEXT_PUBLIC_SUPABASE_ANON_KEY');
  if (!anonKey) throw new Error('NEXT_PUBLIC_SUPABASE_ANON_KEY is required for E2E auth setup');

  const response = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: {
      apikey: anonKey,
      Authorization: `Bearer ${anonKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email, password }),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => '');
    throw new Error(`Could not authenticate ${email}: ${response.status} ${body}`);
  }

  const tokenResponse = await response.json() as JsonMap;
  const expiresAt = tokenResponse.expires_at || Math.floor(Date.now() / 1000) + Number(tokenResponse.expires_in || 3600);
  const session = { ...tokenResponse, expires_at: expiresAt };
  const storageKey = `sb-${new URL(supabaseUrl).hostname.split('.')[0]}-auth-token`;
  const cookieValue = `base64-${base64UrlEncode(JSON.stringify(session))}`;
  const baseUrl = getE2eBaseUrl();

  await context.addCookies(sessionCookieChunks(storageKey, cookieValue).map((chunk) => ({
    ...chunk,
    url: baseUrl,
    sameSite: 'Lax' as const,
    expires: Math.floor(Date.now() / 1000) + SUPABASE_SESSION_MAX_AGE_SECONDS,
  })));
}

export function dateDaysFromNow(days: number): string {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

export function dateTimeLocalDaysFromNow(days: number): string {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString().slice(0, 16);
}

export function uniqueQaName(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

async function waitForLoginHydration(page: Page) {
  await page.locator('#email').waitFor({ state: 'visible' });
  await page.locator('#password').waitFor({ state: 'visible' });
  await page.waitForLoadState('domcontentloaded', { timeout: 10_000 }).catch(() => {});
  await page.waitForFunction(() => {
    const email = document.querySelector('#email') as HTMLInputElement & { _valueTracker?: unknown };
    const form = document.querySelector('form') as HTMLFormElement | null;
    const emailKeys = email ? Object.keys(email) : [];
    const formKeys = form ? Object.keys(form) : [];
    return Boolean(
      email?._valueTracker ||
      emailKeys.some((key) => key.startsWith('__reactProps')) ||
      formKeys.some((key) => key.startsWith('__reactProps')),
    );
  }, null, { timeout: 15_000 });
}

export async function loginAsRole(page: Page, role: QaRole) {
  const user = QA_USERS[role];
  await page.goto('/auth/login', { waitUntil: 'domcontentloaded' });
  await waitForLoginHydration(page);
  await page.locator('#email').fill(user.email);
  await page.locator('#password').fill(user.password);

  const loginError = page
    .getByText(/login failed|invalid login credentials|configuration error|session could not be established|unexpected error/i)
    .first();

  await page.locator('[data-testid="button-login"]').click();

  const deadline = Date.now() + 25_000;
  let errorText: string | null = null;
  while (Date.now() < deadline) {
    if (/\/app(?:$|[/?#])/.test(page.url())) {
      await page.waitForLoadState('domcontentloaded', { timeout: 10_000 }).catch(() => {});
      return;
    }
    if (await loginError.isVisible().catch(() => false)) {
      errorText = await loginError.textContent().catch(() => null);
      break;
    }
    await page.waitForTimeout(250);
  }

  if (!/\/app(?:$|[/?#])/.test(page.url())) {
    throw new Error(
      `Could not log in as ${user.email}${errorText ? `: ${errorText.trim()}` : `; current URL is ${page.url()}`}`,
    );
  }
}

export async function newAuthedPage(browser: Browser, role: QaRole): Promise<AuthedPage> {
  const context = await browser.newContext({
    baseURL: getE2eBaseUrl(),
    storageState: { cookies: [], origins: [] },
  });
  await context.addInitScript(() => {
    try {
      [
        'origintrace_tour_admin',
        'origintrace_tour_aggregator',
        'origintrace_tour_agent',
        'origintrace_tour_quality_manager',
        'origintrace_tour_logistics_coordinator',
        'origintrace_tour_compliance_officer',
        'origintrace_tour_buyer',
      ].forEach((key) => localStorage.setItem(key, 'true'));
    } catch {}
  });
  const page = await context.newPage();
  page.setDefaultNavigationTimeout(60_000);
  page.setDefaultTimeout(20_000);
  try {
    await loginAsRole(page, role);
    await expect(page).toHaveURL(/\/app(?:$|[/?#])/, { timeout: 20_000 });
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

    const farmerId = String(farmer?.farm_id || farm?.id || farmer?.id || '');
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
      data: {
        exporter_org_name: 'WhiteRabbit Demo Co.',
        exporter_email: 'admin@demo.test',
      },
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
