import { defineConfig, devices } from '@playwright/test';
import { getE2eBaseUrl } from './tests/e2e/helpers/local-environment';

const baseURL = getE2eBaseUrl();

/**
 * Playwright E2E configuration — Session 10
 *
 * Setup: runs auth.setup.ts once to log in and save session cookie.
 * All test specs reuse that saved state — no repeated login per test.
 *
 * Run:
 *   npx playwright test
 *   npx playwright test --headed          (see the browser)
 *   npx playwright test tests/e2e/auth.spec.ts   (single file)
 *   npx playwright show-report             (HTML report)
 *
 * Credentials (set in environment variables for local QA only):
 *   E2E_BASE_URL       — http://localhost:5000 or http://127.0.0.1:5000
 *   E2E_ADMIN_EMAIL    — optional .test user; defaults to admin@demo.test
 *   E2E_ADMIN_PASSWORD - optional local demo password
 */

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 1,
  workers: 1,
  timeout: 30_000,
  expect: { timeout: 10_000 },

  reporter: [
    ['html', { outputFolder: 'playwright-report', open: 'never' }],
    ['list'],
  ],

  use: {
    baseURL,
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    trace: 'retain-on-failure',
    actionTimeout: 15_000,
    navigationTimeout: 20_000,
  },

  projects: [
    // Runs first: logs in and saves cookies to file
    {
      name: 'setup',
      testMatch: /auth\.setup\.ts/,
    },
    // All specs reuse the saved session — no repeated login
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        storageState: 'tests/e2e/.auth/admin.json',
      },
      dependencies: ['setup'],
      testIgnore: [/auth\.setup\.ts/, /marketing\.spec\.ts/],
    },
    // Public pages — no auth required, safe to run in CI without credentials
    {
      name: 'chromium-public',
      use: { ...devices['Desktop Chrome'] },
      testMatch: /marketing\.spec\.ts/,
    },
    {
      name: 'red-team',
      use: { ...devices['Desktop Chrome'] },
      testMatch: /red-team-probe\.spec\.ts/,
    },
  ],
});
