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

OriginTrace uses **Vitest** for unit tests and **Playwright** for E2E tests.
Unit tests are fast, offline, and mock external dependencies. E2E tests run
against a live local dev server with real Supabase auth.

### Running tests
```bash
# Unit tests
npx vitest                     # Watch mode
npx vitest run                 # Single run
npx vitest run --coverage      # With coverage

# E2E tests (requires dev server running)
npx playwright test            # All tests
npx playwright test --ui       # Interactive UI mode
```

---

## 2. Test File Organization

```
tests/
├── unit/                      ← Vitest unit tests
│   ├── rbac.test.ts
│   ├── scoring.test.ts
│   └── ...
├── e2e/                       ← Playwright E2E tests
│   ├── auth.setup.ts          ← Auth bootstrapping (runs first)
│   ├── shipments.spec.ts
│   └── ...
├── fixtures/                  ← Shared test data
│   └── shipment.fixture.ts
└── .auth/                     ← Auth state files (gitignored)
```

---

## 3. Writing Unit Tests (Vitest)

### File naming
- `lib/rbac.ts` → `tests/unit/rbac.test.ts`
- `lib/services/scoring.ts` → `tests/unit/scoring.test.ts`

### Test structure
```typescript
import { describe, it, expect } from 'vitest'
import { computeShipmentReadiness } from '@/lib/services/scoring'

describe('computeShipmentReadiness', () => {
  it('returns go decision for fully compliant shipment', () => {
    const result = computeShipmentReadiness(compliantInput)
    expect(result.decision).toBe('go')
    expect(result.overall_score).toBeGreaterThanOrEqual(80)
  })

  it('returns no_go when traceability is below 50%', () => {
    const result = computeShipmentReadiness(lowTraceabilityInput)
    expect(result.decision).toBe('no_go')
    expect(result.risk_flags.some(f => f.is_hard_fail)).toBe(true)
  })
})
```

### Test naming conventions
- Describe block: the function or module name
- It block: starts with a verb — `'returns X when Y'`, `'throws when Z is missing'`

---

## 4. Test Fixtures

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

## 5. E2E Auth Bootstrapping (Playwright)

Auth setup runs once before all E2E tests and saves authenticated browser
state to disk. Individual test files reuse that state.

```typescript
// tests/e2e/auth.setup.ts
import { test as setup, expect } from '@playwright/test'
import path from 'path'

export const ADMIN_AUTH_FILE = path.join(__dirname, '../.auth/admin.json')

setup('authenticate as admin', async ({ page }) => {
  await page.goto('/login')
  await page.fill('[name="email"]',    'admin@demo.test')
  await page.fill('[name="password"]', 'demo-password-123')
  await page.click('[type="submit"]')
  await expect(page).toHaveURL('/dashboard')
  await page.context().storageState({ path: ADMIN_AUTH_FILE })
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
    await page.click('[data-testid="submit-shipment"]')
    await expect(page.locator('[data-testid="success-toast"]')).toBeVisible()
  })
})
```

### E2E conventions
- Use `data-testid` attributes for selectors (not CSS classes)
- One spec file per feature area
- Group related tests in `test.describe`

---

## 7. Gotchas

- **E2E tests require the dev server.** Start with `npm run dev` or use `webServer` config in `playwright.config.ts`.
- **Auth state files are gitignored.** Each run regenerates fresh auth state.
- **Unit tests must not hit the real database.** Mock Supabase with `vi.mock('@/lib/supabase')`.
- **`data-testid` is for tests only** — strip in production if bundle size matters.
- **Seed data must match test expectations.** Auth bootstrapping uses `admin@demo.test` / `demo-password-123`.
