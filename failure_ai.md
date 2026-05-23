# QA Test Failures & Untested Operations Analysis

Based on `Operations_ai.md` after the `2026-05-17` browser regression sweep and the `2026-05-18` documentation reconciliation, all previously failing operations are resolved. This file now tracks only current failures, genuinely untested operations, and resolved historical blockers.

## 1. Current FAIL Operations
**Operations:** None

All previously failing operations (8.4, 9.4, 11.2, 19.3) have been re-tested and are now PASS. The unexpected error toasts upon login and missing routes (404) have been successfully resolved.

## 2. Current UNTESTED Operations
**Entity-dependent operations:** `3.4`, `3.6`, `4.4`, `4.5`, `7.4`, `7.5`, `7.6`, `11.6`, `17.3`

The deep seed-data blocker is resolved after running `npm run seed:qa:data`. That command seeds QA farmers, farms, batches, inventory anchors, dispatch fields, processing runs, shipments, readiness data, documents, lab results, and service providers for `demo-whiterabbit`. These operations remain `UNTESTED` because browser QA has not yet retested the printed route anchors or recorded evidence.

**Action/scenario operations:** `10.5`, `12.2`, `12.4`, `12.5`, `16.2`, `16.3`, `21.2`, `21.4`

These routes or surrounding pages render, but the specific action was not completed in the browser retest. They need targeted action tests: create compliance profile, create contract, create tender, submit bid with an open tender, upload/download document, viewer invite visibility, and tier-gated upgrade prompt.

## 3. Resolved: Antigravity Entity-Dependent Retest
**Operations:** `3.3`, `5.4`, `5.7`, `6.3`, `7.3`, `8.3`

- Verified farmer profile details (`3.3`).
- Verified batch detail and contributions (`5.4`).
- Verified dispatch details (`5.7`).
- Verified inventory details (`6.3`).
- Verified shipment details (`7.3`).
- Verified processing run details (`8.3`).

## 4. Resolved: Compliance Officer Second Retest
**Operations:** `2.5`, `4.6`, `10.6`, `10.7`, `10.9`

- `/app` dashboard renders for `compliance@demo.test` with the "Welcome back, QA Compliance Officer" greeting and compliance metrics.
- Sidebar footer correctly shows `QA Compliance Officer` and `compliance_officer`.
- `/app/conflicts` renders issues and retains the compliance user state.
- `/app/evidence` renders without the NextIntl overlay error.
- `/app/dpp` renders the Digital Product Passports empty state and Generate DPP CTAs without an infinite spinner. Screenshot evidence confirms Product Passport is visible as the active sidebar link.
- `/app/data-vault` renders Data Vault metrics/policy content without an infinite spinner. Screenshot evidence confirms Data Vault is visible as a functional sidebar link.

## 5. Resolved: Buyer Portal 404 & Hang
**Operations:** `13.1` - `13.7`

The buyer portal is no longer treated as a current failure. `buyer@demo.test` reaches `/app/buyer`, `/api/profile` returns the buyer role, and buyer routes render with buyer context/sidebar. Operation `12.5` was moved to UNTESTED because bid submission still needs a real action test with an open tender.

## 6. Resolved: Prior False Negatives
**Operations reclassified to PASS:** `11.4`, `11.5`, `12.1`, `12.3`, `16.1`, `18.1`

User/browser screenshots from `2026-05-16` prove these admin routes render real UI and empty states, not blank pages, infinite spinners, or 404s. `Operations_ai.md` has been corrected accordingly.

**Operations downgraded from FAIL to UNTESTED:** `12.2`, `12.4`, `16.2`, `16.3`

The screenshots disprove the old blank-page failure notes, but they do not prove the full create/upload/download actions completed.

## 7. Resolved: Dashboard Infinite Spinners and RLS Recursion
**Operations:** `2.5`, `2.6`, `2.7`, `10.6`, `10.9`

The dashboard and compliance route spinner issues are resolved from the user's retest evidence. Earlier RLS recursion work remains documented in `supabase/rls-policies.sql` and `supabase/migrations/20260512_fix_rls_recursion.sql`.

## 8. Resolved: Public Registration Redirects
**Operations:** `1.3`, `1.4`

The redirects to `/auth/login` are intended behavior under the restricted onboarding model. Farmer activation (`1.9`) was fixed by adding it to the middleware public allowlist.

## 9. Resolved: State/LGA Dropdown Loading
**Operations:** `3.2`, `5.2`

Latest regression notes confirm the state dropdown loads and LGA dropdown populates in both farmer registration and Smart Collect.

## Next Steps
1. Run `npm run seed:qa:data`, then browser-retest the entity-dependent operations against the printed route anchors and record evidence before changing any status.
2. Run targeted action tests for `10.5`, `12.2`, `12.4`, `12.5`, `16.2`, `16.3`, `21.2`, and `21.4`.
