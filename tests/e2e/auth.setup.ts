/**
 * tests/e2e/auth.setup.ts
 *
 * Runs ONCE before all specs. Logs in as admin and saves the session
 * cookie to tests/e2e/.auth/admin.json so all other tests can reuse it
 * without re-authenticating.
 */

import { test as setup, expect } from '@playwright/test';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { authenticateContextWithCredentials, getE2eBaseUrl } from './helpers/qa-flows';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = dirname(__filename);

const ADMIN_EMAIL    = process.env.E2E_ADMIN_EMAIL    || 'obemog@gmail.com';
const ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD || 'IloveCloudsC69@';
const AUTH_FILE      = join(__dirname, '.auth/admin.json');

setup.setTimeout(60_000);

setup('authenticate as admin', async ({ page }) => {
  page.setDefaultNavigationTimeout(60_000);
  await authenticateContextWithCredentials(page.context(), ADMIN_EMAIL, ADMIN_PASSWORD);
  await page.goto(`${getE2eBaseUrl()}/app`, { waitUntil: 'domcontentloaded' });
  expect(page.url()).toMatch(/\/(app|superadmin)(?:$|[/?#])/);

  // Save auth state (cookies + localStorage) for reuse
  await page.context().storageState({ path: AUTH_FILE });
});
