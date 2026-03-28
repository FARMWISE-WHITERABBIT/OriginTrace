---
name: testing
description: >
  Use this skill when writing, running, or debugging any test in this project —
  both Vitest unit tests and Playwright E2E tests. Triggers for any mention of
  "write a test", "unit test", "E2E test", "test this function", "Playwright",
  "Vitest", "test coverage", "auth bootstrapping for tests", "test naming",
  or "run the test suite". Always use this skill before writing a new test to
  follow the correct conventions, file locations, and auth setup patterns.
---

# Testing Skill

## 1. Overview


---

## 4. Writing Unit Tests (Vitest)

### File naming
- `src/lib/rbac.ts` → `tests/unit/rbac.test.ts`
- `src/lib/services/scoring.ts` → `tests/unit/scoring.test.ts`
- Mirror the `src/` path inside `tests/unit/`

### Test structure
```typescript
// tests/unit/shipment-scoring.test.ts
import { describe, it, expect } from 'vitest'
import { calculateRiskScore } from '@/lib/services/shipment-scoring'

describe('calculateRiskScore', () => {
  it('returns low risk for verified supplier with clean history', () => {
    const result = calculateRiskScore({
      supplierVerified: true,
      deforestationRisk: 0,
      countryRisk: 'low',
      documentComplete: true,
      priceAnomaly: false,
    })
    expect(result.total).toBeLessThan(30)
    expect(result.tier).toBe('low')
  })

  it('returns critical risk when deforestation flag is set', () => {
    const result = calculateRiskScore({
      supplierVerified: false,
      deforestationRisk: 1,
      countryRisk: 'high',
      documentComplete: false,
      priceAnomaly: true,
    })
    expect(result.total).toBeGreaterThanOrEqual(80)
    expect(result.tier).toBe('critical')
  })

  it('clamps total score between 0 and 100', () => {
    const result = calculateRiskScore({ /* extreme values */ } as any)
    expect(result.total).toBeGreaterThanOrEqual(0)
    expect(result.total).toBeLessThanOrEqual(100)
  })
})
```

### Test naming conventions
- Describe block: the function or module name
- It block: starts with a verb, describes the expected outcome
  - `'returns X when Y'`
  - `'throws when Z is missing'`
  - `'normalises input before calculating'`

---

## 5. E2E Auth Bootstrapping (Playwright)

**The auth setup runs once before all E2E tests** and saves authenticated browser state to disk. Individual test files reuse that state to skip the login flow.

### `tests/e2e/auth.setup.ts`
```typescript
import { test as setup, expect } from '@playwright/test'
import path from 'path'

// One auth state file per role
export const ADMIN_AUTH_FILE   = path.join(__dirname, '../.auth/admin.json')
export const MANAGER_AUTH_FILE = path.join(__dirname, '../.auth/manager.json')
export const VIEWER_AUTH_FILE  = path.join(__dirname, '../.auth/viewer.json')

setup('authenticate as admin', async ({ page }) => {
  await page.goto('/login')
  await page.fill('[name="email"]',    'admin@demo.test')
  await page.fill('[name="password"]', 'demo-password-123')
  await page.click('[type="submit"]')
  await expect(page).toHaveURL('/dashboard')
  await page.context().storageState({ path: ADMIN_AUTH_FILE })
})

setup('authenticate as viewer', async ({ page }) => {
  await page.goto('/login')
  await page.fill('[name="email"]',    'viewer@demo.test')
  await page.fill('[name="password"]', 'demo-password-123')
  await page.click('[type="submit"]')
  await expect(page).toHaveURL('/dashboard')
  await page.context().storageState({ path: VIEWER_AUTH_FILE })
})
```

### `playwright.config.ts`
```typescript
import { defineConfig, devices } from '@playwright/test'
import { ADMIN_AUTH_FILE } from './tests/e2e/auth.setup'

export default defineConfig({
  testDir: './tests/e2e',
  projects: [
    // Auth setup runs first, once
    { name: 'setup', testMatch: /auth\.setup\.ts/ },

    // All other tests depend on setup
    {
      name:         'chromium-admin',
      use: {
        ...devices['Desktop Chrome'],
        storageState: ADMIN_AUTH_FILE,
      },
      dependencies: ['setup'],
    },
  ],
  use: {
    baseURL:   'http://localhost:3000',
    trace:     'on-first-retry',
    screenshot:'only-on-failure',
  },
})
```

---

## 6. Writing E2E Tests

```typescript
// tests/e2e/shipments.spec.ts
import { test, expect } from '@playwright/test'

test.describe('Shipment creation', () => {
  test('admin can create a new shipment', async ({ page }) => {
    await page.goto('/shipments/new')

    await page.selectOption('[name="supplier_id"]', { label: 'Demo Supplier' })
    await page.fill('[name="quantity_kg"]', '5000')
    await page.selectOption('[name="product_type"]', 'cocoa')
    await page.click('[data-testid="submit-shipment"]')

    await expect(page.locator('[data-testid="success-toast"]')).toBeVisible()
    await expect(page).toHaveURL(/\/shipments\/[a-z0-9-]+/)
  })

  test('viewer cannot see the create button', async ({ page }) => {
    // This test uses viewer auth state — configure in playwright.config.ts
    await page.goto('/shipments')
    await expect(page.locator('[data-testid="create-shipment-btn"]')).not.toBeVisible()
  })
})
```

### E2E conventions
- Use `data-testid` attributes for selectors (not CSS classes — they change)
- Add `data-testid` to any element that E2E tests target
- Group related tests in a `test.describe` block
- One spec file per feature area (`shipments.spec.ts`, not `all-tests.spec.ts`)

---

## 7. Test Fixtures

```typescript
// tests/fixtures/shipment.fixture.ts
export const mockShipment = {
  id:          '00000000-0000-0000-0000-000000000001',
  org_id:      '00000000-0000-0000-0000-000000000002',
  supplier_id: '00000000-0000-0000-0000-000000000003',
  product_type: 'cocoa' as const,
  quantity_kg:  5000,
  status:      'pending' as const,
  created_at:  '2024-01-01T00:00:00Z',
}

export function buildShipment(overrides?: Partial<typeof mockShipment>) {
  return { ...mockShipment, ...overrides }
}
```

---

## 8. Gotchas

- **E2E tests require the dev server running.** Start with `npm run dev` before `playwright test`, or use `webServer` config in `playwright.config.ts` to auto-start.
- **Auth state files are gitignored.** The `.auth/` directory is never committed. Each developer and CI run generates fresh auth state by running the setup project.
- **Unit tests must not hit the real database.** Mock Supabase client calls with `vi.mock('@/lib/supabase')` — unit tests should be offline and fast.
- **`data-testid` is for tests only** — strip them in production builds via a Babel/SWC plugin if bundle size is a concern.
