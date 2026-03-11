import { defineConfig, devices } from '@playwright/test';

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
 * Credentials (set in .env.test or env vars):
 *   E2E_BASE_URL      — defaults to Replit URL below
 *   E2E_ADMIN_EMAIL   — defaults to obemog@gmail.com
 *   E2E_ADMIN_PASSWORD
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
    baseURL: process.env.E2E_BASE_URL ||
      'https://9abaaa0d-3e9e-43f0-a0b9-5029b15d7df1-00-2htohfo5tjvw3.kirk.replit.dev',
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
      testIgnore: /auth\.setup\.ts/,
    },
  ],
});
