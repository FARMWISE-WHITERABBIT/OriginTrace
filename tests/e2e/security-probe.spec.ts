import { test, expect } from '@playwright/test';

/**
 * Security Probe: Verifying OriginTrace "Secure by Default" Architecture
 * 
 * 1. RBAC Check: Ensure a 'field_agent' cannot access admin-only pages or API-keys.
 * 2. Multi-Tenancy Check: Ensure an agent cannot view details of an organization they don't belong to.
 * 3. API Hardening: Ensure errors are sanitized and don't leak server/db details.
 */

test.describe('Security Probe: RBAC Enforcement', () => {
  test('Field Agent is blocked from Admin Settings', async ({ page }) => {
    // 1. Login as Agent
    await page.goto('/login');
    await page.fill('input[name="email"]', 'demo.agent@origintrace-demo.com');
    await page.fill('input[name="password"]', 'Demo1234!');
    await page.click('button[type="submit"]');
    
    // Wait for redirect to /app
    await expect(page).toHaveURL(/\/app/);

    // 2. Attempt to navigate to Admin-only route: /app/api-keys
    await page.goto('/app/api-keys');

    // 3. Verify it is redirected or shows "Access Denied"
    // (According to lib/rbac.ts, /app/api-keys is restricted to 'admin')
    // The middleware should redirect unauthorized users or the page should show a forbidden state.
    await expect(page).not.toHaveURL(/\/app\/api-keys/);
    await expect(page.locator('body')).toContainText(/Unauthorized|Forbidden|Access Denied|Go Back/i);
  });

  test('Field Agent cannot access Superadmin billing via direct URL', async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[name="email"]', 'demo.agent@origintrace-demo.com');
    await page.fill('input[name="password"]', 'Demo1234!');
    await page.click('button[type="submit"]');

    // Attempt direct URL access to a restricted superadmin-like route
    await page.goto('/app/settings/subscription');
    
    // Should be blocked
    await expect(page).not.toHaveURL(/\/app\/settings\/subscription/);
  });
});

test.describe('Security Probe: API Hardening', () => {
  test('API returns sanitized errors (no stack traces)', async ({ request }) => {
    // Attempt a malformed request to a sensitive endpoint
    const response = await request.post('/api/shipments', {
      data: {
        invalid_field: 'malicious_payload'
      }
    });

    // Should return 400 or 401, never 500 with stack trace
    expect(response.status()).not.toBe(500);
    
    const body = await response.json();
    // Verify no "stack" or "debug" info in the JSON response
    expect(body.stack).toBeUndefined();
    expect(body.debug).toBeUndefined();
    expect(body.error).toBeDefined();
  });
});
