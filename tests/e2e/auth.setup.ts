/**
 * tests/e2e/auth.setup.ts
 *
 * Runs ONCE before all specs. Logs in as admin and saves the session
 * cookie to tests/e2e/.auth/admin.json so all other tests can reuse it
 * without re-authenticating.
 */

import { test as setup, expect, type Page } from '@playwright/test';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = dirname(__filename);

const ADMIN_EMAIL    = process.env.E2E_ADMIN_EMAIL    || 'obemog@gmail.com';
const ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD || 'IloveCloudsC69@';
const AUTH_FILE      = join(__dirname, '.auth/admin.json');

setup.setTimeout(60_000);

async function waitForLoginHydration(page: Page) {
  await page.locator('#email').waitFor({ state: 'visible' });
  await page.waitForLoadState('networkidle', { timeout: 10_000 }).catch(() => {});
  await page.waitForFunction(() => {
    const email = document.querySelector('#email') as HTMLInputElement & { _valueTracker?: unknown };
    const password = document.querySelector('#password') as HTMLInputElement & { _valueTracker?: unknown };
    return Boolean(email?._valueTracker && password?._valueTracker);
  }, null, { timeout: 5_000 }).catch(() => page.waitForTimeout(500));
}

setup('authenticate as admin', async ({ page }) => {
  await page.goto('/auth/login', { waitUntil: 'domcontentloaded' });

  await waitForLoginHydration(page);
  await page.locator('#email').fill(ADMIN_EMAIL);
  await page.locator('#password').fill(ADMIN_PASSWORD);

  const loginError = page
    .getByText(/login failed|invalid login credentials|configuration error|session could not be established|unexpected error/i)
    .first();

  await page.locator('[data-testid="button-login"]').click();

  const deadline = Date.now() + 25_000;
  let lastErrorText: string | null = null;
  while (Date.now() < deadline) {
    if (/\/(app|superadmin)(?:$|[/?#])/.test(page.url())) {
      await page.waitForLoadState('domcontentloaded', { timeout: 10_000 }).catch(() => {});
      break;
    }
    if (await loginError.isVisible().catch(() => false)) {
      lastErrorText = await loginError.textContent().catch(() => null);
      break;
    }
    await page.waitForTimeout(250);
  }

  if (!/\/(app|superadmin)(?:$|[/?#])/.test(page.url())) {
    throw new Error(
      `Could not log in as ${ADMIN_EMAIL}${lastErrorText ? `: ${lastErrorText.trim()}` : `; current URL is ${page.url()}`}`,
    );
  }
  expect(page.url()).toMatch(/\/(app|superadmin)(?:$|[/?#])/);

  // Save auth state (cookies + localStorage) for reuse
  await page.context().storageState({ path: AUTH_FILE });
});
