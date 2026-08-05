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
import {
  assertLocalE2eEnvironment,
  authenticateContextWithCredentials,
  getE2eBaseUrl,
  getLocalE2eAdminCredentials,
} from './helpers/qa-flows';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = dirname(__filename);

const { email: ADMIN_EMAIL, password: ADMIN_PASSWORD } = getLocalE2eAdminCredentials();
const AUTH_FILE      = join(__dirname, '.auth/admin.json');

setup.setTimeout(60_000);

setup('authenticate as admin', async ({ page }) => {
  assertLocalE2eEnvironment();
  page.setDefaultNavigationTimeout(60_000);
  await authenticateContextWithCredentials(page.context(), ADMIN_EMAIL, ADMIN_PASSWORD);
  await page.goto(`${getE2eBaseUrl()}/app`, { waitUntil: 'domcontentloaded' });
  expect(page.url()).toMatch(/\/(app|superadmin)(?:$|[/?#])/);

  // Save auth state (cookies + localStorage) for reuse
  await page.context().storageState({ path: AUTH_FILE });
});
