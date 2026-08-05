import { expect, test, type Page } from '@playwright/test';
import { getE2eBaseUrl } from './helpers/qa-flows';

type ApiRequestRecord = {
  method: string;
  pathname: string;
  search: string;
};

function collectSameOriginApiRequests(page: Page) {
  const origin = new URL(getE2eBaseUrl()).origin;
  const requests: ApiRequestRecord[] = [];

  page.on('request', (request) => {
    const url = new URL(request.url());
    if (url.origin !== origin || !url.pathname.startsWith('/api/')) return;
    requests.push({
      method: request.method(),
      pathname: url.pathname,
      search: url.search,
    });
  });

  return requests;
}

test.describe('authenticated app performance smoke', () => {
  test('loads the dashboard without duplicate shell requests', async ({ page }) => {
    const apiRequests = collectSameOriginApiRequests(page);

    await page.goto('/app', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('[data-testid="text-dashboard-title"], h2:has-text("Collection Hub")').first())
      .toBeVisible({ timeout: 20_000 });
    await page.waitForTimeout(2500);

    const profileRequests = apiRequests.filter((request) => request.pathname === '/api/profile');
    const impersonationReads = apiRequests.filter((request) =>
      request.method === 'GET' && request.pathname === '/api/impersonate'
    );
    const fullNotificationReads = apiRequests.filter((request) =>
      request.method === 'GET' &&
      request.pathname === '/api/notifications' &&
      !new URLSearchParams(request.search).has('summary')
    );
    const dashboardAnalytics = apiRequests.some((request) =>
      request.pathname === '/api/analytics' &&
      new URLSearchParams(request.search).get('section') === 'dashboard'
    );

    expect(profileRequests.length).toBeLessThanOrEqual(1);
    expect(impersonationReads).toHaveLength(0);
    expect(fullNotificationReads).toHaveLength(0);
    expect(dashboardAnalytics).toBe(true);

    const timing = await page.evaluate(() => {
      const nav = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined;
      return nav
        ? {
            domContentLoadedMs: Math.round(nav.domContentLoadedEventEnd - nav.startTime),
            responseEndMs: Math.round(nav.responseEnd - nav.startTime),
          }
        : null;
    });

    expect(timing?.domContentLoadedMs ?? 0).toBeGreaterThan(0);
    expect(timing?.domContentLoadedMs ?? 0).toBeLessThan(20_000);
    expect(timing?.responseEndMs ?? 0).toBeGreaterThan(0);
  });

  test('loads the full notification list only when the popover is opened', async ({ page }) => {
    const unreadSummary = page.waitForResponse((response) => {
      const url = new URL(response.url());
      return response.request().method() === 'GET' &&
        url.pathname === '/api/notifications' &&
        url.searchParams.get('summary') === 'true';
    }).catch(() => null);

    await page.goto('/app', { waitUntil: 'domcontentloaded' });
    await expect(page.getByTestId('button-notifications')).toBeVisible({ timeout: 20_000 });
    await unreadSummary;

    const fullNotifications = page.waitForResponse((response) => {
      const url = new URL(response.url());
      return response.request().method() === 'GET' &&
        url.pathname === '/api/notifications' &&
        !url.searchParams.has('summary');
    });

    await page.getByTestId('button-notifications').click();
    const response = await fullNotifications;

    expect(response.ok()).toBe(true);
    await expect(page.getByRole('heading', { name: 'Notifications' })).toBeVisible();
  });
});
