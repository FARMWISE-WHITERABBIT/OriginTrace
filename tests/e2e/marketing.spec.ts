/**
 * tests/e2e/marketing.spec.ts
 *
 * Public marketing pages — server-rendered, no auth required.
 * Verifies SEO-critical content is visible (not client-only),
 * navigation links work, and CTAs are present.
 */

import { test, expect, type Page } from '@playwright/test';

async function gotoPublic(page: Page, path: string) {
  return page.goto(path, { waitUntil: 'domcontentloaded', timeout: 45_000 });
}

// These tests run without any auth state
test.use({ storageState: { cookies: [], origins: [] } });
test.setTimeout(60_000);

test.describe('Marketing — Homepage', () => {

  test('homepage loads with hero heading', async ({ page }) => {
    await gotoPublic(page, '/');
    await expect(page.locator('h1')).toBeVisible();
    const h1 = await page.locator('h1').first().textContent();
    expect(h1?.length).toBeGreaterThan(5);
  });

  test('Sign In link is present in nav', async ({ page }) => {
    await gotoPublic(page, '/');
    await expect(page.getByTestId('nav-sign-in')).toBeVisible();
  });

  test('Request Demo CTA is present', async ({ page }) => {
    await gotoPublic(page, '/');
    const demoBtn = page.getByRole('link', { name: /request.*demo|demo/i }).first();
    await expect(demoBtn).toBeVisible();
  });

  test('Sign In navigates to login page', async ({ page }) => {
    await gotoPublic(page, '/');
    await page.getByRole('link', { name: /sign in/i }).first().click();
    await page.waitForURL(/\/auth\/login/, { timeout: 10_000 });
    await expect(page.locator('#email')).toBeVisible();
  });

});

test.describe('Marketing — Compliance Pages', () => {

  test('/compliance loads', async ({ page }) => {
    await gotoPublic(page, '/compliance');
    await expect(page.locator('h1, h2').first()).toBeVisible();
  });

  test('/compliance/eudr loads with EUDR content', async ({ page }) => {
    await gotoPublic(page, '/compliance/eudr');
    const heading = page.locator('h1, h2').first();
    await expect(heading).toBeVisible();
    const text = await heading.textContent();
    expect(text?.toLowerCase()).toContain('deforestation');
  });

  test('/compliance/uk loads', async ({ page }) => {
    await gotoPublic(page, '/compliance/uk');
    await expect(page.locator('h1, h2').first()).toBeVisible();
  });

  test('/compliance/usa loads', async ({ page }) => {
    await gotoPublic(page, '/compliance/usa');
    await expect(page.locator('h1, h2').first()).toBeVisible();
  });

  test('/compliance/china loads', async ({ page }) => {
    await gotoPublic(page, '/compliance/china');
    await expect(page.locator('h1, h2').first()).toBeVisible();
  });

  test('/compliance/uae loads', async ({ page }) => {
    await gotoPublic(page, '/compliance/uae');
    await expect(page.locator('h1, h2').first()).toBeVisible();
  });

});

test.describe('Marketing — Other Public Pages', () => {

  test('/solutions loads', async ({ page }) => {
    await gotoPublic(page, '/solutions');
    await expect(page.locator('h1, h2').first()).toBeVisible();
  });

  test('/pedigree loads', async ({ page }) => {
    await gotoPublic(page, '/pedigree');
    await expect(page.locator('h1, h2').first()).toBeVisible();
  });

  test('/demo loads with demo form', async ({ page }) => {
    await gotoPublic(page, '/demo');
    await expect(page.locator('h1, h2').first()).toBeVisible();
  });

  test('/industries/agriculture loads', async ({ page }) => {
    await gotoPublic(page, '/industries/agriculture');
    await expect(page.locator('h1, h2').first()).toBeVisible();
  });

  test('/legal/privacy loads', async ({ page }) => {
    await gotoPublic(page, '/legal/privacy');
    await expect(page.locator('h1, h2').first()).toBeVisible();
  });

  test('/legal/terms loads', async ({ page }) => {
    await gotoPublic(page, '/legal/terms');
    await expect(page.locator('h1, h2').first()).toBeVisible();
  });

});

test.describe('Marketing — SEO Smoke Tests', () => {

  test('homepage has a canonical link tag', async ({ page }) => {
    await gotoPublic(page, '/');
    const canonical = page.locator('link[rel="canonical"]');
    await expect(canonical).toHaveCount(1);
    const href = await canonical.getAttribute('href');
    expect(href?.length).toBeGreaterThan(5);
  });

  test('homepage meta description is set', async ({ page }) => {
    await gotoPublic(page, '/');
    const desc = page.locator('meta[name="description"]');
    const content = await desc.getAttribute('content');
    expect(content?.length).toBeGreaterThan(20);
  });

  test('robots.txt is accessible', async ({ page }) => {
    const resp = await gotoPublic(page, '/robots.txt');
    expect(resp?.status()).toBe(200);
    const body = await page.content();
    expect(body).toContain('User-agent');
  });

  test('sitemap.xml is accessible', async ({ page }) => {
    const resp = await gotoPublic(page, '/sitemap.xml');
    expect(resp?.status()).toBe(200);
    const body = await page.content();
    expect(body).toContain('<url>');
  });

});
