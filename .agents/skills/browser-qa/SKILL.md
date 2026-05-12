---
name: browser-qa
description: >
  Browser-driven QA agent skill for the OriginTrace platform. Use this skill whenever
  you are asked to test, verify, check, smoke-test, or validate any feature or user
  operation in the browser. Triggers for any mention of "test from the browser",
  "check if X works", "QA sweep", "smoke test", "run the browser agent", "verify the
  UI", "regression test", "check functionality", "does X still work", "find bugs",
  or "operations registry". Always use this skill before writing any Playwright test
  or manual browser check — it codifies the exact workflow agents must follow so
  test results are consistent and traceable.
---

# Browser QA Skill — OriginTrace

## Overview

This skill governs how AI agents perform browser-based QA on the OriginTrace platform. The goal is to detect bugs early and continuously — especially after new features ship — by running real browser sessions against the live dev (or staging) server and recording results in `Operations_ai.md`.

The workflow is:
1. Determine which operations to test (from the task or from `Operations_ai.md`)
2. Launch the browser agent with clear tasks
3. Update `Operations_ai.md` with the results
4. Surface bugs as clear, actionable findings

---

## Prerequisites

Before starting any test session, confirm:
- The dev server is running (`npm run dev` at `http://localhost:3000`)
- At least one test user exists with known credentials (see seed data below)
- You know which operations you are testing (pick from `Operations_ai.md`)

### Default Test Credentials

| Role | Email | Password |
|------|-------|----------|
| admin | `admin@demo.test` | `Demo1234!` |
| aggregator | `aggregator@demo.test` | `Demo1234!` |
| agent | `agent@demo.test` | `Demo1234!` |
| quality_manager | `quality@demo.test` | `Demo1234!` |
| logistics_coordinator | `logistics@demo.test` | `Demo1234!` |
| compliance_officer | `compliance@demo.test` | `Demo1234!` |
| warehouse_supervisor | `warehouse@demo.test` | `Demo1234!` |
| buyer | `buyer@demo.test` | `Demo1234!` |
| farmer | `farmer@demo.test` | `Demo1234!` |

> If these credentials don't work, run the QA seed script: `npm run seed:qa`
> (requires the demo org to exist first — run `npm run seed:demo` if needed).

---

## Operations Registry

All operations the platform supports are documented in:

```
/Operations_ai.md
```

This file is the single source of truth. Every operation has:
- A unique ID (e.g., `7.1`)
- A human-readable description
- The route(s) it lives at
- Which roles can perform it
- A status (`✅ PASS` / `❌ FAIL` / `⚠️ FLAKY` / `🔲 UNTESTED`)
- A timestamp of when it was last tested
- Notes describing what was observed

**After every test session, update `Operations_ai.md`.** This is not optional — the registry is only useful if it reflects the current state of the app.

---

## Test Session Workflow

### Step 1 — Decide Scope

Determine what to test. Common scopes:
- **Full sweep**: go through all `🔲 UNTESTED` operations in `Operations_ai.md`
- **Feature sweep**: test all operations in a single section (e.g., section 7 Shipments)
- **Regression check**: re-test all operations that were previously `❌ FAIL` or `⚠️ FLAKY`
- **New-feature check**: test the operations for a specific new feature just shipped

Read `Operations_ai.md` to identify the target operations before writing any browser code.

### Step 2 — Plan Browser Tasks

Group operations into logical browser sessions. A single session should share the same:
- Authenticated role
- Functional area (e.g., don't mix Payments and Compliance in one session)

For each session, write a clear task description that tells the browser agent:
1. What URL to navigate to
2. What to do (fill a form, click a button, expect a result)
3. What constitutes a PASS vs FAIL
4. What screenshots or DOM state to capture

### Step 3 — Launch the Browser Agent

Use the `browser_subagent` tool. Include all of this in the task prompt:

```
You are a QA agent testing the OriginTrace platform at http://localhost:3000.

Login credentials:
  Email: [role-specific email]
  Password: demo-password-123

Operations to test:
  [List each operation ID and description from Operations_ai.md]

For each operation:
1. Navigate to the relevant URL
2. Perform the user action
3. Observe whether it succeeds or fails
4. Take a screenshot of the final state
5. Note any JavaScript console errors

Return: for each operation ID, a result of PASS, FAIL, or FLAKY, plus a short note
describing what you observed (e.g. "form submitted, toast appeared" or "500 error
in network tab, page blank").
```

The browser agent has these capabilities: navigating to URLs, clicking, typing, taking screenshots, reading DOM content, and checking the browser console.

### Step 4 — Interpret Results

When the browser agent returns:
- Map each result to the operation ID in `Operations_ai.md`
- Determine the status:
  - **PASS**: the expected outcome happened (form submitted, page loaded, data shown)
  - **FAIL**: an error occurred, the page broke, data was wrong, or the action had no effect
  - **FLAKY**: the outcome varied across attempts (note how many times it passed/failed)

### Step 5 — Update `Operations_ai.md`

For every tested operation, update the row:

```markdown
| 7.1 | View shipments list with filters | `/app/shipments` | admin, logistics_coordinator | ✅ PASS | 2026-05-09T21:00Z | Table loaded, search filter works |
```

For failures, include as much detail as possible:
- The exact error message shown in the UI
- Any network errors seen (status code, endpoint)
- Browser console errors if captured
- Which browser / viewport was used

Also append a row to the **Changelog** table at the bottom of `Operations_ai.md`:

```markdown
| 2026-05-09 | browser-qa-agent | Section 7 Shipments sweep — 7/8 PASS, 1 FAIL (7.5 waybill PDF) |
```

### Step 6 — Surface Bugs

For every `❌ FAIL`:
1. Write a concise bug report (see template below)
2. Report it to the user so they can triage

**Bug Report Template:**
```
## Bug: [Operation ID] — [Short description]

**Route:** /app/shipments/[id]
**Role tested:** admin
**Steps to reproduce:**
  1. Navigate to shipment detail page
  2. Click "Generate Waybill" button
**Expected:** PDF downloads
**Actual:** "Failed to generate PDF" toast appears, network request returns 500
**Console errors:** TypeError: Cannot read properties of undefined (reading 'name')
**Screenshot:** [attach if available]
**Status in Operations_ai.md:** Updated to ❌ FAIL
```

---

## Common Test Patterns

### Testing a list page
1. Navigate to the route
2. Confirm: table/list renders with at least one row (assuming seed data exists)
3. Confirm: search/filter controls are visible and functional
4. Confirm: no JavaScript errors in console

### Testing a create form
1. Navigate to the page
2. Fill all required fields with valid data
3. Submit
4. Confirm: success toast or redirect to detail page
5. Confirm: the new record appears in the list

### Testing role-based access
1. Login as the restricted role
2. Navigate to the restricted route
3. Confirm: either a redirect to a safe page or an access-denied message is shown
4. Confirm: the forbidden action (button, link) is not visible in the UI

### Testing PDF generation
1. Navigate to the relevant page
2. Click the PDF/export button
3. Confirm: either a download begins, or a new tab opens with the PDF
4. Confirm: no error toast appears

### Testing offline-capable features
1. In Chrome DevTools, throttle network to Offline
2. Navigate to the collection/sync page
3. Perform data entry
4. Restore network and wait for sync indicator to clear
5. Confirm: data appears on the server-side list

---

## What Makes a Good Test Note

Good notes help future agents understand what was verified:

✅ **Good:** `"Table loaded with 5 rows of seed data, search filtered to 1 row correctly, no console errors"`

❌ **Bad:** `"Page loaded"`

✅ **Good:** `"Clicking 'Generate Waybill' shows 500 error toast. Network tab: POST /api/shipments/[id]/waybill returned 500 with body: 'Error: Missing org_id'"`

❌ **Bad:** `"It didn't work"`

---

## Scope Prioritization

When time is limited, test in this priority order:

1. **Critical path** — Auth login, dashboard load, farmer registration, batch creation, shipment creation
2. **Financial** — Disbursements, wallet, payments
3. **Compliance** — DDS export, pedigree certificate, deforestation check
4. **RBAC smoke tests** — Verify role restrictions are enforced
5. **Everything else** — Go section by section through `Operations_ai.md`

---

## Tips for the Browser Agent

- Always wait for pages to fully load (`networkidle`) before asserting
- If a form has dropdowns, check that they populate with real data (not empty)
- Look for spinner states that never resolve — that's a bug
- Check the browser console for red errors on every page
- If you see "Supabase not configured" — the env is broken, not the feature
- Some pages redirect based on role — confirm the redirect destination is correct, not just that a redirect happened

---

## Reference Files

- `Operations_ai.md` — The operations registry (update after every run)
- `.agents/skills/testing/SKILL.md` — Vitest/Playwright unit/E2E conventions
- `.agents/skills/seed-data/SKILL.md` — How to reset and seed demo data
- `.agents/skills/rbac/SKILL.md` — Role hierarchy and permissions matrix
