/**
 * tests/e2e/helpers/auth.ts
 *
 * Shared login helpers.
 * NOTE: Most specs use the saved storageState from auth.setup.ts and never
 * call loginAsAdmin() directly. It is retained here for the auth spec which
 * intentionally tests the login flow with a fresh browser context.
 */

import { Page } from '@playwright/test';

export const ADMIN_EMAIL    = process.env.E2E_ADMIN_EMAIL    || 'obemog@gmail.com';
export const ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD || 'IloveCloudsC69@';

export async function loginAsAdmin(page: Page) {
  await page.goto('/auth/login');
  await page.locator('#email').waitFor({ state: 'visible' });
  await page.locator('#email').fill(ADMIN_EMAIL);
  await page.locator('#password').fill(ADMIN_PASSWORD);
  await page.locator('[data-testid="button-login"]').click();
  await page.waitForURL(/\/app/, { timeout: 25_000 });
}

export async function logout(page: Page) {
  const btn = page.locator('[data-testid="button-logout"]');
  await btn.waitFor({ state: 'visible' });
  await btn.click();
  await page.waitForURL(/\/auth\/login|^\/$/, { timeout: 10_000 });
}
