# QA Test Failures & Untested Operations Analysis

As of 2026-05-25T23:34+01:00, the Playwright QA closure pass records no current failing operations and no current untested operations.

## 1. Current FAIL Operations

**Operations:** None

No `FAIL` rows remain in `Operations_ai.md`.

## 2. Current UNTESTED Operations

**Operations:** None

The previously untested set (`3.4`, `3.6`, `4.4`, `4.5`, `7.4`, `7.5`, `7.6`, `10.5`, `11.6`, `12.2`, `12.4`, `12.5`, `16.2`, `16.3`, `17.3`, `21.2`, `21.4`) is now covered by persistent Playwright specs.

## 3. Evidence

Existing QA closure:

```powershell
$env:E2E_BASE_URL="http://localhost:5000"; $env:E2E_ADMIN_EMAIL="admin@demo.test"; $env:E2E_ADMIN_PASSWORD="Demo1234!"; npx playwright test tests/e2e/untested-entity-details.spec.ts tests/e2e/untested-action-flows.spec.ts --project=chromium --reporter=line
```

Result: **17 passed**.

Security/CVE regression:

```powershell
$env:E2E_BASE_URL="http://localhost:5000"; $env:E2E_ADMIN_EMAIL="admin@demo.test"; $env:E2E_ADMIN_PASSWORD="Demo1234!"; npx playwright test tests/e2e/security-cve-regression.spec.ts --project=chromium --reporter=line
```

Result: **7 passed**.

## 4. Residual Risk

`npm audit --omit=dev --audit-level=moderate` now reports only the direct `xlsx` advisory family, which npm marks as **No fix available**. The user-upload XLSX import path is restricted to authenticated admin/aggregator users and now includes file-size limits, row caps, and prototype-key filtering.
