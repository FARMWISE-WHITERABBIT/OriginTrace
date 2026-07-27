/**
 * tests/e2e/helpers/auth.ts
 *
 * Shared login helpers.
 * NOTE: Most specs use the saved storageState from auth.setup.ts and never
 * call loginAsAdmin() directly. It is retained here for the auth spec which
 * intentionally tests the login flow with a fresh browser context.
 */

import type { Page } from '@playwright/test';
import {
  assertLocalE2eEnvironment,
  getLocalE2eAdminCredentials,
} from './local-environment';

const adminCredentials = getLocalE2eAdminCredentials();

export const ADMIN_EMAIL = adminCredentials.email;
export const ADMIN_PASSWORD = adminCredentials.password;

export async function loginAsAdmin(page: Page) {
  assertLocalE2eEnvironment();
  await page.goto('/auth/login');
  await page.locator('#email').waitFor({ state: 'visible' });
  await page.locator('#email').fill(ADMIN_EMAIL);
  await page.locator('#password').fill(ADMIN_PASSWORD);
  await page.locator('[data-testid="button-login"]').click();
  await page.waitForURL(/\/app/, { timeout: 25_000 });
}

export async function logout(page: Page) {
  assertLocalE2eEnvironment();
  const btn = page.locator('[data-testid="button-logout"]');
  await btn.waitFor({ state: 'visible' });
  await btn.click();
  await page.waitForURL(/\/auth\/login|^\/$/, { timeout: 10_000 });
}
