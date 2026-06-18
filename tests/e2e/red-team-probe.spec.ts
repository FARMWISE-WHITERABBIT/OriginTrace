import { test, expect } from '@playwright/test';

test.describe('Red Team: Escrow Module Security Audit', () => {
  const PASSWORD = 'ProbePassword123!';
  const VICTIM_ESCROW_ID = '4ec5be7c-1b18-4502-aba5-0a3a74c8386e';
  const MILESTONE_ID = 'm1';

  const USERS = {
    ATTACKER_ADMIN: 'admin-1778197967596@attacker.test',
    VICTIM_ADMIN: 'admin-1778197968343@victim.test',
    VICTIM_AGENT: 'agent-1778197968979@victim.test',
  };

  /**
   * TEST 1: Functional Verification (Happy Path)
   */
  test('FUNCTIONAL: Victim Admin can release own milestone', async ({ page }) => {
    await page.goto('http://localhost:5001/login');
    await page.fill('input[name="email"]', USERS.VICTIM_ADMIN);
    await page.fill('input[name="password"]', PASSWORD);
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/\/app/);

    // Use page.evaluate to perform the fetch within the authenticated session
    const result = await page.evaluate(async ({ escrowId, milestoneId }) => {
      const res = await fetch(`/api/escrow/${escrowId}/release`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ milestone_id: milestoneId })
      });
      return { status: res.status, body: await res.json() };
    }, { escrowId: VICTIM_ESCROW_ID, milestoneId: MILESTONE_ID });

    expect(result.status).toBe(200);
    if (result.status !== 200) {
      console.error('FUNCTIONAL TEST FAILED:', JSON.stringify(result.body));
    }
    expect(result.body.success).toBe(true);
  });

  /**
   * TEST 2: IDOR Vulnerability (Negative Path)
   */
  test('IDOR: Attacker Admin cannot release Victim milestone', async ({ page }) => {
    await page.goto('http://localhost:5001/login');
    await page.fill('input[name="email"]', USERS.ATTACKER_ADMIN);
    await page.fill('input[name="password"]', PASSWORD);
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/\/app/);

    const result = await page.evaluate(async ({ escrowId, milestoneId }) => {
      const res = await fetch(`/api/escrow/${escrowId}/release`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ milestone_id: milestoneId })
      });
      return { status: res.status, body: await res.json() };
    }, { escrowId: VICTIM_ESCROW_ID, milestoneId: MILESTONE_ID });

    // VULNERABILITY ALERT: If this is 200, the system is vulnerable to IDOR
    if (result.status === 200) {
      console.error('CRITICAL VULNERABILITY: IDOR success in escrow release!');
    }
    
    // We expect it to be blocked (403 or 404)
    expect(result.status).not.toBe(200);
    expect(result.status).toBeGreaterThanOrEqual(400);
  });

  /**
   * TEST 3: RBAC Enforcement (Negative Path)
   */
  test('RBAC: Victim Agent cannot release own milestone', async ({ page }) => {
    await page.goto('http://localhost:5001/login');
    await page.fill('input[name="email"]', USERS.VICTIM_AGENT);
    await page.fill('input[name="password"]', PASSWORD);
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/\/app/);

    const result = await page.evaluate(async ({ escrowId, milestoneId }) => {
      const res = await fetch(`/api/escrow/${escrowId}/release`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ milestone_id: milestoneId })
      });
      return { status: res.status, body: await res.json() };
    }, { escrowId: VICTIM_ESCROW_ID, milestoneId: MILESTONE_ID });

    expect(result.status).toBe(403);
    expect(result.body.error).toMatch(/Insufficient permissions/i);
  });
});
