/**
 * tests/e2e/auth.spec.ts
 *
 * Authentication flows.
 * These tests run WITHOUT the saved auth state — they explicitly test
 * login/logout using a fresh browser context.
 */

import { test, expect, chromium } from '@playwright/test';
import { loginAsAdmin, logout, ADMIN_EMAIL, ADMIN_PASSWORD } from './helpers/auth';

// Override: auth tests need a clean context, not the saved session
test.use({ storageState: { cookies: [], origins: [] } });

test.describe('Authentication', () => {

  test('login page renders correctly', async ({ page }) => {
    await page.goto('/auth/login');
    await expect(page.locator('#email')).toBeVisible();
    await expect(page.locator('#password')).toBeVisible();
    await expect(page.locator('[data-testid="button-login"]')).toBeVisible();
  });

  test('unauthenticated access to /app redirects to login', async ({ page }) => {
    await page.goto('/app');
    await page.waitForURL(/\/auth\/login/, { timeout: 15_000 });
    expect(page.url()).toContain('/auth/login');
  });

  test('invalid credentials show error toast', async ({ page }) => {
    await page.goto('/auth/login');
    await page.locator('#email').fill(ADMIN_EMAIL);
    await page.locator('#password').fill('wrong-password-xyz');
    await page.locator('[data-testid="button-login"]').click();

    // Error toast or inline error should appear
    const toast = page.locator('[role="alert"], [data-sonner-toast], .toast').first();
    await expect(toast).toBeVisible({ timeout: 10_000 });
    // Must still be on login page
    expect(page.url()).toContain('/auth/login');
  });

  test('valid admin credentials redirect to /app', async ({ page }) => {
    await loginAsAdmin(page);
    expect(page.url()).toContain('/app');
    // Sidebar logout button confirms authenticated layout
    await expect(page.locator('[data-testid="button-logout"]')).toBeVisible();
  });

  test('logout from /app redirects away from dashboard', async ({ page }) => {
    await loginAsAdmin(page);
    await logout(page);
    expect(page.url()).not.toContain('/app');
  });

  test('after logout, /app redirects to login', async ({ page }) => {
    await loginAsAdmin(page);
    await logout(page);
    await page.goto('/app');
    await page.waitForURL(/\/auth\/login/, { timeout: 15_000 });
    expect(page.url()).toContain('/auth/login');
  });

  test('forgot password link is visible', async ({ page }) => {
    await page.goto('/auth/login');
    const link = page.locator('[data-testid="link-forgot-password"]');
    await expect(link).toBeVisible();
  });

});
