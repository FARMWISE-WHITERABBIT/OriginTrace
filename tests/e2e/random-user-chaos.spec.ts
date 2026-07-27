import { expect, test, type Page, type Request, type TestInfo } from '@playwright/test';
import { assertLocalE2eEnvironment, findQaAnchors, QA_SEED_SKIP_MESSAGE } from './helpers/qa-flows';

type ChaosAction =
  | 'dismiss'
  | 'navigate'
  | 'click-link'
  | 'click-tab'
  | 'search'
  | 'back'
  | 'forward'
  | 'reload'
  | 'resize'
  | 'escape-scroll';

interface TranscriptEntry {
  step: number;
  action: ChaosAction;
  phase: 'plan' | 'attempt' | 'result';
  detail: string;
  url: string;
}

interface ChaosStepPlan {
  action: ChaosAction;
  routeRoll: number;
  targetRoll: number;
  valueRoll: number;
  viewportRoll: number;
  scrollRoll: number;
}

const DEFAULT_SEED = 'origintrace-chaos-20260726';
const DEFAULT_STEPS = 60;
const MAX_STEPS = 200;
const READ_ONLY_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);
const DRAINABLE_RESOURCE_TYPES = new Set(['document', 'fetch', 'xhr']);
const ALLOWED_SUPABASE_AUTH_GRANTS = new Set(['password', 'refresh_token']);
const SUPABASE_API_PATH = /^\/(?:auth|rest|storage|realtime|functions)\/v1(?:\/|$)/;
const MAP_RESOURCE_ORIGINS = new Set([
  'https://basemaps.cartocdn.com',
  'https://tiles.basemaps.cartocdn.com',
  'https://server.arcgisonline.com',
]);
const FORBIDDEN_LINK = /\/(?:auth|logout|new|pay|resolve|verify)(?:\/|$)|download|sign-out/i;
const ERROR_UI = /application error|something went wrong|configuration required|internal server error/i;
// The first production dashboard load can legitimately keep API reads active
// for slightly longer than eight seconds on a cold local server. Keep the
// quiet-period requirement, but give those bounded reads enough time to finish.
const REQUEST_DRAIN_TIMEOUT_MS = 20_000;
const REQUEST_DRAIN_QUIET_MS = 750;
// requestfailed is the source of truth for transport health. This only suppresses
// the duplicate Auth JS console line emitted for an intentionally aborted fetch.
const BENIGN_CONSOLE_ERROR = /^TypeError: Failed to fetch[\s\S]*supabase_auth-js/i;

function isBenignConsoleError(message: string): boolean {
  // With global Playwright routing enabled, Chromium reports canceled map
  // tiles as net::ERR_ABORTED and MapLibre duplicates each cancellation as
  // its minified AJAXError class name. Map resource HTTP and transport
  // failures are monitored independently below, so this duplicate is noise.
  return BENIGN_CONSOLE_ERROR.test(message) || message === 'eZ';
}

function isAllowedSupabaseAuthRequest(request: Request, supabaseOrigin: string): boolean {
  if (request.method() !== 'POST') return false;

  const url = new URL(request.url());
  return url.origin === supabaseOrigin &&
    url.pathname === '/auth/v1/token' &&
    ALLOWED_SUPABASE_AUTH_GRANTS.has(url.searchParams.get('grant_type') || '');
}

function hashSeed(value: string): number {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function mulberry32(seed: number) {
  let state = seed >>> 0;
  return () => {
    state += 0x6d2b79f5;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

function chooseByRoll<T>(roll: number, values: readonly T[]): T {
  return values[Math.min(values.length - 1, Math.floor(roll * values.length))]!;
}

function configuredStepCount(): number {
  const parsed = Number.parseInt(process.env.E2E_CHAOS_STEPS || '', 10);
  if (!Number.isFinite(parsed)) return DEFAULT_STEPS;
  return Math.max(1, Math.min(MAX_STEPS, parsed));
}

function chooseAction(random: () => number): ChaosAction {
  const roll = random();
  if (roll < 0.35) return 'navigate';
  if (roll < 0.55) return 'click-link';
  if (roll < 0.65) return 'click-tab';
  if (roll < 0.75) return 'search';
  if (roll < 0.82) return 'back';
  if (roll < 0.87) return 'forward';
  if (roll < 0.93) return 'reload';
  if (roll < 0.97) return 'resize';
  return 'escape-scroll';
}

function createStepPlan(random: () => number): ChaosStepPlan {
  const action = chooseAction(random);
  return {
    action,
    routeRoll: random(),
    targetRoll: random(),
    valueRoll: random(),
    viewportRoll: random(),
    scrollRoll: random(),
  };
}

function requestSummary(request: Request): string {
  const url = new URL(request.url());
  return `${request.method()} ${url.origin}${url.pathname}${url.search}`;
}

function isSpeculativeNextPrefetch(request: Request, appOrigin: string): boolean {
  const url = new URL(request.url());
  return request.method() === 'GET' &&
    url.origin === appOrigin &&
    request.headers()['next-router-prefetch'] === '1';
}

function hasSupabaseUrlSignature(url: URL): boolean {
  return url.hostname === 'supabase.co' ||
    url.hostname.endsWith('.supabase.co') ||
    SUPABASE_API_PATH.test(url.pathname);
}

function hasSupabaseSignature(request: Request, url: URL): boolean {
  const headers = request.headers();
  return hasSupabaseUrlSignature(url) ||
    Boolean(headers.apikey) ||
    /supabase/i.test(headers['x-client-info'] || '');
}

function websocketHttpOrigin(url: URL): string {
  const protocol = url.protocol === 'wss:' ? 'https:' : 'http:';
  return `${protocol}//${url.host}`;
}

function isExpectedAbort(request: Request): boolean {
  const errorText = request.failure()?.errorText || '';
  return /(?:ERR_ABORTED|NS_BINDING_ABORTED|aborted|cancelled)/i.test(errorText);
}

async function waitForRequestsToDrain(inFlight: Set<Request>): Promise<void> {
  const deadline = Date.now() + REQUEST_DRAIN_TIMEOUT_MS;
  let quietSince: number | null = null;

  while (Date.now() < deadline) {
    if (inFlight.size === 0) {
      quietSince ??= Date.now();
      if (Date.now() - quietSince >= REQUEST_DRAIN_QUIET_MS) return;
    } else {
      quietSince = null;
    }
    await new Promise<void>((resolve) => setTimeout(resolve, 50));
  }

  throw new Error(
    `Timed out waiting for app/Supabase requests to drain: ${Array.from(inFlight, requestSummary).join(', ')}`,
  );
}

async function visibleCount(page: Page, selector: string): Promise<number> {
  return page.locator(selector).evaluateAll((elements) =>
    elements.filter((element) => {
      const node = element as HTMLElement;
      const style = window.getComputedStyle(node);
      const rect = node.getBoundingClientRect();
      return style.visibility !== 'hidden' && style.display !== 'none' && rect.width > 0 && rect.height > 0;
    }).length,
  );
}

async function visibleAppHrefs(page: Page): Promise<string[]> {
  return page.locator('a[href^="/app"]').evaluateAll((elements) =>
    Array.from(new Set(elements.flatMap((element) => {
      const node = element as HTMLAnchorElement;
      const style = window.getComputedStyle(node);
      const rect = node.getBoundingClientRect();
      const href = node.getAttribute('href') || '';
      const visible = style.visibility !== 'hidden' && style.display !== 'none' && rect.width > 0 && rect.height > 0;
      return visible && href ? [href] : [];
    }))),
  );
}

async function dismissBlockingUi(
  page: Page,
  onAttempt: (detail: string) => void,
): Promise<string | null> {
  const dismissNames = [/^skip for now$/i, /^not now$/i, /^cancel$/i, /^close$/i, /^dismiss$/i];
  for (const name of dismissNames) {
    const button = page.getByRole('button', { name }).filter({ visible: true }).first();
    if (await button.isVisible().catch(() => false)) {
      const label = (await button.textContent())?.trim() || name.source;
      onAttempt(label);
      await button.click({ timeout: 5_000 });
      await page.waitForTimeout(200);
      return label;
    }
  }

  const blockingOverlay = page.locator('.fixed.inset-0.z-50:visible').first();
  if (await blockingOverlay.isVisible().catch(() => false)) {
    onAttempt('Escape');
    await page.keyboard.press('Escape');
    await page.waitForTimeout(200);
    if (!await blockingOverlay.isVisible().catch(() => false)) return 'Escape';
  }

  return null;
}

async function gotoWithAbortRetry(page: Page, route: string) {
  let lastError: unknown;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      await page.goto(route, { waitUntil: 'domcontentloaded', timeout: 45_000 });
      return;
    } catch (error) {
      lastError = error;
      if (attempt === 0 && String(error).includes('net::ERR_ABORTED')) {
        await page.waitForTimeout(300);
        continue;
      }
      throw error;
    }
  }
  throw lastError;
}

test.describe('Seeded random-user chaos', () => {
  test.describe.configure({ retries: 0 });
  test.use({ serviceWorkers: 'block' });
  test.setTimeout(6 * 60_000);

  test('admin session survives bounded read-only random behavior', async ({ page }, testInfo) => {
    const environment = assertLocalE2eEnvironment();
    const baseUrl = new URL(environment.baseUrl);
    const supabaseOrigin = new URL(environment.supabaseUrl).origin;
    const drainOrigins = new Set([baseUrl.origin, supabaseOrigin]);
    const monitoredOrigins = new Set([...drainOrigins, ...MAP_RESOURCE_ORIGINS]);

    const seedLabel = process.env.E2E_CHAOS_SEED || DEFAULT_SEED;
    const random = mulberry32(hashSeed(seedLabel));
    const stepCount = configuredStepCount();
    const stepPlans = Array.from({ length: stepCount }, () => createStepPlan(random));
    testInfo.setTimeout(Math.max(6 * 60_000, stepCount * 10_000 + 2 * 60_000));
    const transcript: TranscriptEntry[] = [];
    const pageErrors: string[] = [];
    const serverErrors: string[] = [];
    const unexpectedMutations: string[] = [];
    const unexpectedSupabaseTraffic: string[] = [];
    const transportErrors: string[] = [];
    const consoleErrors: string[] = [];
    const inFlight = new Set<Request>();
    const intentionallyBlocked = new WeakSet<Request>();
    const context = page.context();

    await context.route('**/*', async (route) => {
      const request = route.request();
      const url = new URL(request.url());
      const method = request.method().toUpperCase();

      if (hasSupabaseSignature(request, url) && url.origin !== supabaseOrigin) {
        unexpectedSupabaseTraffic.push(requestSummary(request));
        intentionallyBlocked.add(request);
        await route.abort('blockedbyclient');
        return;
      }

      if (!READ_ONLY_METHODS.has(method) && !isAllowedSupabaseAuthRequest(request, supabaseOrigin)) {
        unexpectedMutations.push(requestSummary(request));
        intentionallyBlocked.add(request);
        await route.abort('blockedbyclient');
        return;
      }

      await route.continue();
    });

    await context.routeWebSocket('**/*', async (webSocketRoute) => {
      const url = new URL(webSocketRoute.url());
      if (hasSupabaseUrlSignature(url) && websocketHttpOrigin(url) !== supabaseOrigin) {
        unexpectedSupabaseTraffic.push(`WEBSOCKET ${url.origin}${url.pathname}${url.search}`);
        await webSocketRoute.close({ code: 1008, reason: 'Unexpected Supabase origin blocked by read-only QA' });
        return;
      }
      webSocketRoute.connectToServer();
    });

    page.on('pageerror', (error) => pageErrors.push(error.message));
    page.on('console', (message) => {
      if (message.type() === 'error' && !isBenignConsoleError(message.text())) {
        consoleErrors.push(message.text());
      }
    });
    context.on('request', (request) => {
      const url = new URL(request.url());
      // Next.js may keep sidebar RSC prefetches open across several user
      // actions, and the local production server can serve immutable chunks
      // slowly on a cold Windows filesystem. Both remain covered by
      // response/failure monitoring, but only documents and data requests can
      // affect the action-specific application state that must drain.
      if (
        drainOrigins.has(url.origin) &&
        DRAINABLE_RESOURCE_TYPES.has(request.resourceType()) &&
        !isSpeculativeNextPrefetch(request, baseUrl.origin)
      ) {
        inFlight.add(request);
      }
    });
    context.on('requestfinished', (request) => {
      inFlight.delete(request);
    });
    context.on('requestfailed', (request) => {
      inFlight.delete(request);
      if (intentionallyBlocked.has(request) || isExpectedAbort(request)) return;

      const url = new URL(request.url());
      if (monitoredOrigins.has(url.origin)) {
        transportErrors.push(`${requestSummary(request)}: ${request.failure()?.errorText || 'unknown failure'}`);
      }
    });
    context.on('response', (response) => {
      const url = new URL(response.url());
      const errorFloor = MAP_RESOURCE_ORIGINS.has(url.origin) ? 400 : 500;
      if (monitoredOrigins.has(url.origin) && response.status() >= errorFloor) {
        serverErrors.push(`${response.status()} ${response.request().method()} ${url.origin}${url.pathname}${url.search}`);
      }
    });

    await page.addInitScript(() => {
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
    await page.goto('/app', { waitUntil: 'domcontentloaded' });
    await expect(page).toHaveURL(/\/app(?:$|[/?#])/);

    const routes = [
      '/app',
      '/app/farmers',
      '/app/farms',
      '/app/farms/map',
      '/app/conflicts',
      '/app/inventory',
      '/app/dispatch',
      '/app/processing',
      '/app/shipments',
      '/app/traceability',
      '/app/documents',
      '/app/analytics',
      '/app/settings',
      '/app/settings?tab=compliance',
      '/app/settings?tab=api-keys',
    ];

    const anchors = await findQaAnchors(page);
    if (!anchors) {
      throw new Error(
        `Seeded chaos requires farmer, farm, batch, processing-run, and shipment QA anchors. ${QA_SEED_SKIP_MESSAGE}`,
      );
    }
    routes.push(
      `/app/farmers/${anchors.farmerId}`,
      `/app/farms/${anchors.farmId}`,
      `/app/inventory/${anchors.batchId}`,
      `/app/dispatch/${anchors.batchId}`,
      `/app/processing/${anchors.processingRunId}`,
      `/app/shipments/${anchors.shipmentId}`,
    );

    const searchValues = ['', 'QA', 'cocoa', "' OR 1=1 --", '<script>alert(1)</script>', 'x'.repeat(128)];
    const viewportSizes = [
      { width: 390, height: 844 },
      { width: 768, height: 1024 },
      { width: 1440, height: 900 },
    ];

    const record = (
      step: number,
      action: ChaosAction,
      phase: TranscriptEntry['phase'],
      detail: string,
    ) => {
      transcript.push({ step, action, phase, detail, url: page.url() });
      console.log(`[chaos seed=${seedLabel} step=${step}] ${phase} ${action}: ${detail} -> ${page.url()}`);
    };

    const assertHealthy = async (step: number) => {
      expect(page.isClosed(), `Page closed after step ${step}`).toBeFalsy();
      const current = new URL(page.url());
      expect(current.origin, `Cross-origin escape after step ${step}: ${current.href}`).toBe(baseUrl.origin);
      expect(current.pathname, `Authentication lost after step ${step}: ${current.href}`).toMatch(/^\/app(?:\/|$)/);
      await expect(page.locator('body')).toBeVisible();
      const bodyText = (await page.locator('body').innerText()).trim();
      expect(bodyText.length, `Blank page after step ${step}: ${current.href}`).toBeGreaterThan(0);
      expect(bodyText, `Error boundary after step ${step}: ${current.href}`).not.toMatch(ERROR_UI);
      expect(pageErrors, `Uncaught browser errors after step ${step}`).toEqual([]);
      expect(consoleErrors, `Browser console errors after step ${step}`).toEqual([]);
      expect(serverErrors, `App or Supabase HTTP 5xx responses after step ${step}`).toEqual([]);
      expect(transportErrors, `App or Supabase transport errors after step ${step}`).toEqual([]);
      expect(unexpectedSupabaseTraffic, `Unexpected Supabase traffic after step ${step}`).toEqual([]);
      expect(unexpectedMutations, `Read-only chaos attempted a blocked mutation after step ${step}`).toEqual([]);
    };

    try {
      await waitForRequestsToDrain(inFlight);

      for (let step = 1; step <= stepCount; step += 1) {
        const plan = stepPlans[step - 1]!;
        const action = plan.action;

        await test.step(`${step}/${stepCount} ${action}`, async () => {
          record(step, action, 'plan', JSON.stringify(plan));
          const dismissed = await dismissBlockingUi(
            page,
            (detail) => record(step, 'dismiss', 'attempt', detail),
          );
          if (dismissed) record(step, 'dismiss', 'result', dismissed);

          if (action === 'navigate') {
            const route = chooseByRoll(plan.routeRoll, routes);
            record(step, action, 'attempt', route);
            await gotoWithAbortRetry(page, route);
            record(step, action, 'result', route);
          } else if (action === 'click-link') {
            const candidates = (await visibleAppHrefs(page))
              .filter((href) => !FORBIDDEN_LINK.test(href))
              .slice(0, 50);
            if (candidates.length === 0) {
              const route = chooseByRoll(plan.routeRoll, routes);
              record(step, action, 'attempt', `fallback ${route}`);
              await gotoWithAbortRetry(page, route);
              record(step, action, 'result', `fallback ${route}`);
            } else {
              const href = chooseByRoll(plan.targetRoll, candidates);
              const beforeUrl = page.url();
              const destination = new URL(href, beforeUrl).href;
              const link = page.locator(`a[href=${JSON.stringify(href)}]:visible`).first();
              record(step, action, 'attempt', href);
              await link.click({ timeout: 15_000 });
              if (destination !== beforeUrl) {
                await expect.poll(() => page.url(), {
                  message: `Clicking ${href} did not navigate away from ${beforeUrl}`,
                  timeout: 30_000,
                }).not.toBe(beforeUrl);
              }
              await page.waitForLoadState('domcontentloaded', { timeout: 10_000 });
              record(step, action, 'result', href);
            }
          } else if (action === 'click-tab') {
            const count = await visibleCount(page, '[role="tab"]');
            const tabs = page.locator('[role="tab"]:visible');
            const currentCount = Math.min(count, await tabs.count());
            if (currentCount === 0) {
              record(step, action, 'attempt', 'no visible tab; press Escape');
              await page.keyboard.press('Escape');
              record(step, action, 'result', 'no visible tab; pressed Escape');
            } else {
              const tab = tabs.nth(Math.min(currentCount - 1, Math.floor(plan.targetRoll * currentCount)));
              const label = (await tab.textContent())?.trim() || '(unlabelled tab)';
              record(step, action, 'attempt', label);
              await tab.click({ timeout: 5_000 });
              record(step, action, 'result', label);
            }
          } else if (action === 'search') {
            const searches = page.locator(
              'input[type="search"]:visible, input[placeholder*="search" i]:visible, input[placeholder*="filter" i]:visible',
            );
            const count = await searches.count();
            if (count === 0) {
              record(step, action, 'attempt', 'no visible search field');
              record(step, action, 'result', 'no visible search field');
            } else {
              const input = searches.nth(Math.min(count - 1, Math.floor(plan.targetRoll * count)));
              const value = chooseByRoll(plan.valueRoll, searchValues);
              record(step, action, 'attempt', `fill ${JSON.stringify(value)}`);
              await input.fill(value, { timeout: 5_000 });
              record(step, action, 'result', `filled ${JSON.stringify(value)}`);
            }
          } else if (action === 'back') {
            const beforeUrl = page.url();
            record(step, action, 'attempt', `history back from ${beforeUrl}`);
            const historyLength = await page.evaluate(() => window.history.length);
            if (historyLength <= 2) {
              record(step, action, 'result', 'no prior in-app history');
            } else {
              await page.goBack({ waitUntil: 'domcontentloaded', timeout: 10_000 });
              const destination = new URL(page.url());
              if (destination.origin !== baseUrl.origin || !/^\/app(?:\/|$)/.test(destination.pathname)) {
                record(step, action, 'attempt', `restore unsafe destination ${destination.href}`);
                await gotoWithAbortRetry(page, beforeUrl);
                record(step, action, 'result', 'unsafe history destination; restored current route');
              } else {
                record(step, action, 'result', `history back to ${destination.href}`);
              }
            }
          } else if (action === 'forward') {
            record(step, action, 'attempt', 'history forward');
            const response = await page.goForward({ waitUntil: 'domcontentloaded', timeout: 10_000 });
            record(step, action, 'result', response ? `history forward to ${page.url()}` : 'no forward history');
          } else if (action === 'reload') {
            record(step, action, 'attempt', 'reload');
            await page.reload({ waitUntil: 'domcontentloaded', timeout: 20_000 });
            record(step, action, 'result', 'reload');
          } else if (action === 'resize') {
            const viewport = chooseByRoll(plan.viewportRoll, viewportSizes);
            record(step, action, 'attempt', `${viewport.width}x${viewport.height}`);
            await page.setViewportSize(viewport);
            record(step, action, 'result', `${viewport.width}x${viewport.height}`);
          } else {
            const deltaY = Math.floor(plan.scrollRoll * 1600) - 800;
            record(step, action, 'attempt', `Escape plus scroll ${deltaY}`);
            await page.keyboard.press('Escape');
            await page.mouse.wheel(0, deltaY);
            record(step, action, 'result', `Escape plus scroll ${deltaY}`);
          }

          await waitForRequestsToDrain(inFlight);
          await assertHealthy(step);
        });
      }

      await waitForRequestsToDrain(inFlight);
      await assertHealthy(stepCount);
    } catch (error) {
      await attachDiagnostics(testInfo, seedLabel, stepCount, transcript, {
        pageErrors,
        serverErrors,
        unexpectedMutations,
        unexpectedSupabaseTraffic,
        transportErrors,
        consoleErrors,
      });
      throw error;
    }

    await attachDiagnostics(testInfo, seedLabel, stepCount, transcript, {
      pageErrors,
      serverErrors,
      unexpectedMutations,
      unexpectedSupabaseTraffic,
      transportErrors,
      consoleErrors,
    });
  });
});

async function attachDiagnostics(
  testInfo: TestInfo,
  seed: string,
  configuredSteps: number,
  transcript: TranscriptEntry[],
  errors: Record<string, string[]>,
) {
  await testInfo.attach('chaos-transcript.json', {
    body: Buffer.from(JSON.stringify({ seed, configuredSteps, transcript, errors }, null, 2)),
    contentType: 'application/json',
  });
}
