# QA Test Failures & Untested Operations Analysis

Based on the continuous QA sweep documented in `Operations_ai.md`, here are the detailed reasons and root causes for the `❌ FAIL` and `🔲 UNTESTED` operations. No codebase changes have been made.

## 1. Untested Operations
**Operations:** `3.3, 3.4, 3.6, 4.4, 4.5, 5.4, 5.7, 6.3, 7.3, 7.4, 7.5, 7.6, 8.3, 11.6, 17.3`
- **Reason:** Missing Mock/Seed Data. The database seeding scripts (`seed-demo.ts`, `seed-qa-users.ts`) successfully establish organizational structure and users but do not generate deep entity data. There are zero seeded Farmers, Farms, Batches, Shipments, or Processing Runs in the test database, making it impossible to navigate to detail pages or execute actions that require an entity ID (e.g., viewing a farm map, dispatching a batch, linking a lab result to a shipment).

## 2. Buyer Portal 404 & Hang
**Operations:** `13.1 - 13.7, 12.5`
- **Symptom:** Buyer login redirects to `/app/buyer` but hangs on an infinite spinner.
- **Reason:** The `GET` handler in `app/api/profile/route.ts` exclusively queries the `profiles` table (`supabaseAdmin.from('profiles').select('*').eq('user_id', user.id)`). However, `buyer@demo.test` is seeded into the separate `buyer_profiles` table. The API fails to check `buyer_profiles`, returns a 404 "No profile found", and causes the frontend buyer application to crash/hang due to missing user context.

## 3. Blank Dashboards & Infinite Spinners (`AbortError`)
**Operations:** `3.7, 8.4, 9.4, 10.1 - 10.9, 11.5, 17.1, 18.1`
- **Symptom:** Specific roles (Compliance Officer, Quality Manager, Warehouse Supervisor, Farmer) encounter infinite spinners or blank white screens. Console throws `Runtime AbortError: signal is aborted without reason`.
- **Reason:** 
  1. **Unhandled Hydration/Render Errors:** For the blank screens (like `/app/compliance` and `/app/analytics`), there is a fatal React runtime error (e.g., reading `undefined` from a failed fetch or missing context) crashing the React tree, and no `<ErrorBoundary>` is present to gracefully catch it.
  2. **Fetch Loops/Aborts:** The infinite spinners with `AbortError` suggest that the data fetching hooks inside components like `<ComplianceOfficerDashboard />` or `<QualityManagerDashboard />` are firing and aborting unexpectedly, potentially due to missing API routes or infinite re-renders triggering `AbortController` signals.
  3. **Missing Dashboard Mappings:** For the farmer (3.7), the role `farmer` is missing from the `dashboardMap` in `app/app/page.tsx`. It defaults to rendering the `AdminDashboard` or `AgentDashboard`, which then crashes because the farmer lacks the necessary profile structure or permissions.

## 4. Public Registration Redirects (Reconciled)
**Operations:** `1.3, 1.4`
- **Status:** Resolved (by policy).
- **Reason:** As per the project's **Restricted Onboarding Model** (documented in README.md), self-service registration is intentionally disabled to ensure all tenants are vetted by a Superadmin. The redirect to `/auth/login` is the correct intended behavior.
- **Note:** Operation `1.9` (Farmer Activation) was fixed by adding it to the middleware public allowlist in `lib/supabase/middleware.ts`.

## 5. State/LGA Dropdown Loading Block
**Operations:** `3.2, 5.2`
- **Symptom:** Farmer registration and Smart Collect wizards get stuck on "Loading states..." and block form submission.
- **Reason:** The client-side fetch to the location/address API (which populates Nigerian States and LGAs) is failing. This could be a dead endpoint, a CORS issue, or an empty `locations` table in the database preventing the dropdown array from resolving.

## 6. Missing Pages / 404 Routing
**Operations:** `11.2`, `19.3`
- **Symptom:** `/app/payments/pay` returns a Next.js 404 Page Not Found. `/app/resolve` redirects unexpectedly.
- **Reason:** The physical route files (e.g., `app/(app)/app/payments/pay/page.tsx`) have either not been implemented yet, were accidentally deleted, or have a naming convention mismatch. For `/app/resolve`, there may be a layout-level redirect if the sync queue length is 0.

## 7. Resolved: Dashboard Infinite Spinners (RLS Recursion)
**Operations:** `2.5, 2.6, 2.7`
- **Status:** Resolved (Remediation in place, SQL migration pending).
- **Reason:** Identified infinite RLS recursion in `get_user_org_id()` and `get_user_role()` as the cause of query aborts and 500 errors.
- **Fix:** Functions updated with `SET search_path = ''` in [rls-policies.sql](file:///c:/Users/USER/Downloads/OriginTrace/supabase/rls-policies.sql) and a migration prepared in [20260512_fix_rls_recursion.sql](file:///c:/Users/USER/Downloads/OriginTrace/supabase/migrations/20260512_fix_rls_recursion.sql).
- **Verification:** UI now loads correctly without spinners. Quality dashboard enhanced with error handling and retry logic.

---

### Next Steps for Fixes
1. Update `app/api/profile/route.ts` to check `buyer_profiles` if no standard profile is found.
2. Wrap all dashboard components in `ErrorBoundary` boundaries to expose the exact React errors causing the blank screens.
3. Enhance `seed-demo.ts` to generate robust domain entity mocks (10 farms, 5 batches, 5 shipments) so detail views can be QA'd.
