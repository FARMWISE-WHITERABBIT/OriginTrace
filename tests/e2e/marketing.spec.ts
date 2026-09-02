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

/**
 * Dismiss the cookie-consent dialog if present — it can overlay/intercept
 * clicks on page content. Waits out its 300ms exit animation (AnimatePresence
 * in cookie-banner.tsx) so a following click doesn't race the dialog closing.
 */
async function dismissCookieBanner(page: Page) {
  const dialog = page.getByRole('dialog', { name: 'Cookie consent' });
  if (await dialog.isVisible({ timeout: 2_000 }).catch(() => false)) {
    await page.getByRole('button', { name: 'Accept' }).click();
    await expect(dialog).not.toBeVisible({ timeout: 2_000 });
  }
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
    expect(text?.toLowerCase()).toContain('eudr compliance');
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

test.describe('Marketing — Importer Funnel', () => {

  test('/importers loads with hero heading', async ({ page }) => {
    await gotoPublic(page, '/importers');
    await expect(page.locator('h1')).toBeVisible();
    const h1 = await page.locator('h1').first().textContent();
    expect(h1?.length).toBeGreaterThan(5);
  });

  test('"For Importers" nav dropdown navigates to /importers', async ({ page }) => {
    await gotoPublic(page, '/');
    // "For Importers" now lives under the "Solutions" dropdown, not as a top-level nav link.
    await page.getByTestId('nav-link-solutions').first().hover();
    await expect(page.getByTestId('dropdown-solutions')).toBeVisible();
    await page.getByTestId('dropdown-link-for-importers').click();
    await page.waitForURL(/\/importers/, { timeout: 10_000 });
    await expect(page.locator('h1')).toBeVisible();
  });

  test('homepage buyer routing link navigates to /importers', async ({ page }) => {
    await gotoPublic(page, '/');
    await dismissCookieBanner(page);
    // The link sits inside a FadeIn (framer-motion) wrapper that's still mid-transition
    // (transform/opacity animating in) immediately after the cookie banner is dismissed.
    // Clicking before the animation settles intermittently misses the real click target,
    // so wait for the fade-in to finish before clicking.
    const link = page.getByTestId('link-hero-buyer-routing');
    await link.scrollIntoViewIfNeeded();
    await expect(link).toHaveCSS('opacity', '1');
    await link.click();
    await page.waitForURL(/\/importers/, { timeout: 10_000 });
  });

  test('/demo?role=buyer loads with the buyer-variant hero', async ({ page }) => {
    await gotoPublic(page, '/demo?role=buyer');
    await expect(page.locator('h1')).toBeVisible();
  });

  test('demo form persona selector switches available organization types', async ({ page }) => {
    await gotoPublic(page, '/demo');

    // Default persona is exporter — org type step should show exporter options.
    await page.getByTestId('input-full-name').fill('Test User');
    await page.getByTestId('input-company').fill('Test Co');
    await page.getByTestId('input-email').fill('test@example.com');
    await page.getByTestId('input-phone').fill('+2340000000000');
    await page.getByTestId('button-next-step').click();
    await page.getByTestId('select-org-type').click();
    await expect(page.getByRole('option', { name: 'Exporter', exact: true })).toBeVisible();
    await page.keyboard.press('Escape');
    await page.getByTestId('button-back').click();

    // Switch persona to buyer — org type options must change to buyer-specific ones,
    // and the exporter-only "Number of Farmers" field must disappear.
    await page.getByTestId('select-persona').click();
    await page.getByTestId('option-persona-buyer').click();
    await page.getByTestId('button-next-step').click();
    await page.getByTestId('select-org-type').click();
    await expect(page.getByRole('option', { name: 'Importer', exact: true })).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.getByTestId('input-farmer-count')).toHaveCount(0);

    // Stop short of clicking button-submit-demo: /api/contact sends a real email via
    // Resend and creates a real HubSpot contact/deal with no test-mode gating today —
    // this suite intentionally doesn't submit for real on every CI run.
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

test.describe('Marketing — Importer cross-links', () => {
  test('compliance pages carry the importer callout', async ({ page }) => {
    await gotoPublic(page, '/compliance/eudr');
    await expect(page.getByTestId('importer-callout')).toBeAttached();
  });
});
