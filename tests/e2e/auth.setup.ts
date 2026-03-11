/**
 * tests/e2e/auth.setup.ts
 *
 * Runs ONCE before all specs. Logs in as admin and saves the session
 * cookie to tests/e2e/.auth/admin.json so all other tests can reuse it
 * without re-authenticating.
 */

import { test as setup, expect } from '@playwright/test';
import * as path from 'path';

const ADMIN_EMAIL    = process.env.E2E_ADMIN_EMAIL    || 'obemog@gmail.com';
const ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD || 'IloveCloudsC69@';
const AUTH_FILE      = path.join(__dirname, '.auth/admin.json');

setup('authenticate as admin', async ({ page }) => {
  await page.goto('/auth/login');

  await page.locator('#email').waitFor({ state: 'visible' });
  await page.locator('#email').fill(ADMIN_EMAIL);
  await page.locator('#password').fill(ADMIN_PASSWORD);
  await page.locator('[data-testid="button-login"]').click();

  // Wait for redirect to /app — confirms login succeeded
  await page.waitForURL(/\/app/, { timeout: 25_000 });
  expect(page.url()).toContain('/app');

  // Save auth state (cookies + localStorage) for reuse
  await page.context().storageState({ path: AUTH_FILE });
});
