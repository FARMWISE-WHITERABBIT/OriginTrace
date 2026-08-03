# UI and Traceability Workflow Fixes

Last updated: 2026-07-27
Branch: `Anthony`
Status: implementation and verification complete; push-ready

## Purpose

This document records the map, compliance, boundary-conflict, traceability, tenant-lifecycle, Dutch-buyer demo, and browser-QA work performed after the workflow review. It explains both what changed and why the safeguards exist.

The baseline workflow fixes through `16a55b79` are already on `origin/Anthony`. The tenant-lifecycle, offline isolation, Dutch-buyer profile, and deterministic QA work described below passed the final local release gates and is ready for the atomic commit/push workflow.

## Outcomes

### 1. Enterprise farm maps

- Replaced the legacy Leaflet/custom-canvas rendering with MapLibre GL through `react-map-gl/maplibre`.
- Farm boundaries render as their real GeoJSON polygon geometry instead of bounding rectangles.
- Removed obsolete Leaflet styling and behavior.
- Farm map prompts now navigate to the actual farm detail workflow instead of only recentering or reloading the map.

Why: exact polygon geometry is required for credible compliance review. Bounding boxes and coordinate-order mistakes can make separate farms look overlapping or hide a real overlap.

### 2. Farm approval completeness gate

- The farms API blocks an approval transition when required farmer, area, or legality-document data is missing.
- The farm details UI disables approval below 100% completeness and explains what is required.
- The server remains the source of truth, so a direct API request cannot bypass the disabled button.

Why: UI-only validation can be bypassed. Compliance status must not become `approved` unless the underlying record is complete.

### 3. Boundary conflict correctness

- Spatial conflict analysis uses real polygon intersection rather than bounding-box overlap alone.
- GeoJSON longitude/latitude order and PostGIS WGS84 expectations are handled consistently.
- A detected overlap places both affected farms into conflict handling rather than leaving contradictory statuses.

Why: conflict decisions must be symmetric and based on the actual shared area. False positives and one-sided status changes make the review queue unreliable.

### 4. Inventory, dispatch, and shipment readiness

- Inventory and dispatch reads restore the bag → batch → farm relationship expected by the UI and scoring engine.
- Batch IDs are mapped consistently in API payloads.
- Shipment readiness can follow the restored traceability chain instead of treating present data as missing.
- Additional scoring diagnostics make broken traceability inputs visible during verification.

Why: readiness scores are only trustworthy when every upstream relationship can be resolved. Visible bags with invisible batches incorrectly depress traceability and shipment readiness.

## Illustrative Dutch buyer demo

The local demo now provides a deterministic exporter-to-buyer workflow for `Dutch Cocoa Buyer Pilot B.V.`. The organization, account, private requirements, evidence, tender, and bid are illustrative placeholders. They are not a real Dutch company or a buyer-approved specification.

The idempotent seeder creates or reconciles:

- the `.test` buyer and exporter demo accounts;
- an active buyer link to `WhiteRabbit Demo Co.`;
- `Dutch Cocoa Buyer Pilot — HS 1801 — v1`;
- Rotterdam contract `NL-COCOA-PILOT-001` and shipment `WR-SHP-NL-PILOT-001`;
- two shipment items backed by `WR-BCH-001` and `WR-BCH-002`, their bags, and approved polygon farms;
- 12 active supporting documents, one passing lab result, and an evidence package;
- an illustrative tender and WhiteRabbit bid.

The profile stores typed metadata in `custom_rules`: schema/profile version, HS code `1801`, Netherlands/Rotterdam destination, placeholder status, `buyer_approved: false`, and the disclaimer. It intentionally defines no invented residue or quality thresholds. Rainforest Alliance is identified as a placeholder private buyer requirement.

Readiness is calculated through the real `/api/shipments/[id]/recalculate` route after seeding. The current local result is `go` with an overall score of 94 and 12/12 profile checks met; the value is never hardcoded by the seeder.

### Buyer workflow

- Contract creation accepts an optional exporter-owned compliance profile.
- Buyers see minimal profile options only for exporters with an active link.
- A shipment can be linked only when its profile exactly matches its contract profile.
- Proof responses include profile identity/version/destination/disclaimer, alignment, requirements met/missing, buyer-standard flags/remediation, readiness, documents, lab results, and evidence-package state.
- Contract cards, exporter shipment details, and the buyer proof panel expose the profile and placeholder warning in English, French, and Arabic.
- Buyer traceability resolves direct shipment items through batch to farm while retaining exporter tenant scope.

### Local runbook

```powershell
npm run seed:dutch-demo -- --dry-run
npm run seed:dutch-demo -- --apply
npx playwright test tests/e2e/dutch-buyer-demo.spec.ts --project=chromium --reporter=line
```

The seeder accepts exactly one mode, rejects any Supabase URL other than loopback HTTP on port 54321, rejects any app URL other than loopback HTTP on port 5000, never deletes unrelated rows, and performs inspect → ownership check → mutate → returned-row check → database postcondition for every write. The shared local demo password is reconciled only for the reserved `.test` accounts.

## Tenant lifecycle hardening

Random navigation exposed a broader class of stale-data problems: a request started under organization A could finish after the user moved to organization B. The following controls were added.

### Scoped API resources

`hooks/use-api-resource.ts` now:

- accepts a primitive organization `scopeKey`;
- aborts superseded requests;
- tags data, loading, and error state with the scope that produced it;
- rejects stale `refetch` and `setData` callbacks;
- cancels reads on `pagehide` and revalidates after BFCache restoration.

Why: React effects run after render, and browser back/forward cache does not always remount a page. Scope tagging prevents old-tenant data from appearing even during those small lifecycle windows.

### Page and form invalidation

Tenant-bound lists, details, dialogs, and deferred dashboard values are cleared or hidden immediately when the active organization changes. This includes farms, farmers, documents, inventory, processing, shipments, settings, audit, analytics, API keys, webhooks, KYC, Smart Collect, and sync views.

Mutation handlers snapshot the active organization before sending a request and ignore stale completions. In-flight form operations are aborted where possible. Shipment payment and escrow dialogs use the same scope protections as ordinary edits.

Why: closing a list leak is not enough if an open dialog still contains organization A IDs and can submit them under organization B.

### Organization and impersonation transitions

- Profile refreshes clear tenant-bound context before loading the replacement organization.
- Only the latest profile request may commit state.
- Impersonation start/stop operations are serialized.
- Exiting impersonation redirects only after the server confirms that the impersonation cookie was cleared.

Why: the server-side tenant cookie can change before React finishes rendering. The application must become non-interactive during that transition and must not accept out-of-order profile results.

## Offline queue isolation

All tenant-owned IndexedDB records now carry an explicit `org_id`, including pending farms, batches, boundaries, uploads, OCR jobs, ID mappings, and cached bags/farms.

- Enqueue call sites snapshot and pass the active organization.
- Reads, status changes, retries, deletes, TTL cleanup, statistics, and ID lookups require an organization ID.
- Automatic and manual sync drain only the active organization's records.
- Sync rechecks that the organization is still active before network and local mutations.
- Interrupted `syncing` records recover only when their owning organization is active again.
- Legacy records with no owner are quarantined; they are never assigned to the tenant that happens to be active.
- The offline E2E fixture includes a foreign-organization record and verifies it remains untouched.

Why: inferring ownership from the current session can silently upload an offline record created for one tenant into another tenant.

## Document link integrity

Documents use the generic `linked_entity_type` and `linked_entity_id` fields. The workflow now treats those links as tenant-sensitive references.

- Link types are restricted to the database-supported entity types.
- Link IDs must be UUIDs.
- The documents API validates that a shipment, farm/farmer, or batch belongs to the authenticated organization before create/update.
- Organization links must match the authenticated organization itself.
- The entity picker no longer falls back to accepting an arbitrary pasted ID when an option list is empty.
- Stale query-string entity IDs are cleared when they are not present in the current tenant's options.

Why: the documents table is tenant-scoped, but its generic link has no database foreign key. Explicit server validation is required to prevent a tenant-B document from pointing at a tenant-A entity.

## Seeded read-only chaos testing

`tests/e2e/random-user-chaos.spec.ts` performs deterministic, bounded random user behavior across authenticated application routes.

The test:

- precomputes each action from a seed so replays remain deterministic;
- records planned, attempted, and completed actions;
- monitors page errors, console errors, HTTP 5xx responses, transport failures, auth loss, and blank/error-boundary pages;
- blocks every unexpected non-read HTTP request before dispatch;
- permits only exact local Supabase password and refresh-token requests needed for authentication;
- rejects unexpected Supabase HTTP or WebSocket origins;
- disables service workers for the spec so a worker cannot bypass request routing;
- gives safe link navigation 15 seconds to complete and does not use ineffective `noWaitAfter` behavior;
- drains document/fetch/XHR requests before health assertions and final completion;
- continues to monitor immutable scripts, styles, images, and map resources for HTTP or transport failures without treating slow local static chunks as pending business operations.

Why: observing a POST after it has been sent is too late for a read-only test. The browser harness must prevent the write, not merely report it.

## Local-only safety rules

Browser QA is hard-pinned to:

- application origin: `http://127.0.0.1:5000` or `http://localhost:5000`;
- Supabase origin: `http://127.0.0.1:54321` or `http://localhost:54321`;
- reserved `.test` user identities only.

The guards execute before session credentials are attached. Arbitrary localhost ports, hosted Supabase projects, and personal-looking fallback credentials are rejected.

A normalized public-schema catalog snapshot is calculated before and after each chaos replay. It includes relations/RLS flags, columns/defaults, constraints, indexes, policies, triggers, and public functions in stable order. This provides an independent database-level check that browser QA did not alter the schema.

## Verification status

| Gate | Current result |
|---|---|
| Dutch seeder dry-run | Passed; inspected all target rows and planned zero business-row changes |
| Dutch seeder apply | Passed; all row postconditions verified, readiness `go`, 12/12 profile checks met |
| TypeScript | Passed after the final tenant-scope/RBAC/i18n review |
| Focused unit/API tests | 30/30 passed across buyer profile, proof parsing, contract profile, and document-link integrity |
| Dutch buyer Playwright journey | Final production-build run passed 2/2 with retries disabled in 1.3 minutes; exporter/buyer flow, ownership/mismatch rejection, unrelated buyer isolation, tender, bid, and award verified |
| Offline cross-tenant Playwright regression | Passed 2/2 with retries disabled in 33.5 seconds; ordered five-stage automatic reconnect replay completed and the foreign-org record remained pending |
| Seeded chaos replay, seed `001` | Final run passed 60/60 steps and 2/2 Playwright tests with retries disabled in 14.1 minutes |
| Seeded chaos replay, seed `002` | Final run passed 60/60 steps and 2/2 Playwright tests with retries disabled in 10.4 minutes |
| Public-schema fingerprints | Both final seeds matched before/after: `a9f7c42da591ff2b41d0424054cc0612a1d9a5c1badffefd98a6e9dbb763f2d8`, 2,878 normalized objects |
| Next.js production preflight | Passed: 60 migrations validated, TypeScript passed, production compilation passed, and 290/290 static pages generated |
| Full unit suite | Passed 794/794 tests across 28 files |
| Final diff/security review | Passed: `git diff --check` clean; 0 `org_id` tables without RLS; service-role tenant filters verified; `en/fr/ar` key parity exact; no credential/private-key pattern found |

The first post-build seed-`001` attempt stopped before chaos step 1 because three slow local static chunks remained in the generic in-flight set. The rendered page was healthy and each chunk returned HTTP 200. The observer was corrected to drain only state-relevant document/fetch/XHR traffic while retaining error monitoring for all static resources; both zero-retry 60-step replays then passed.

## Verification commands used

All commands run from the repository root and use explicit local Supabase environment variables.

```powershell
npm run check
npm test
npm run preflight
npm run start -- -p 5000 -H 127.0.0.1
npx playwright test tests/e2e/dutch-buyer-demo.spec.ts --project=chromium --reporter=line --retries=0
npx playwright test tests/e2e/offline-field-work.spec.ts --project=chromium --reporter=line --retries=0
$env:E2E_CHAOS_SEED='001'; $env:E2E_CHAOS_STEPS='60'; npx playwright test tests/e2e/random-user-chaos.spec.ts --project=chromium --reporter=line --retries=0
$env:E2E_CHAOS_SEED='002'; $env:E2E_CHAOS_STEPS='60'; npx playwright test tests/e2e/random-user-chaos.spec.ts --project=chromium --reporter=line --retries=0
git diff --check
```

The two chaos seeds are supplied through `E2E_CHAOS_SEED`; each run uses `E2E_CHAOS_STEPS=60`.

## Commit plan

The work is organized as separate Conventional Commits:

1. `fix(ui): harden tenant-scoped data lifecycles`
2. `fix(sync): isolate offline queues by organization`
3. `feat(compliance): add illustrative Dutch buyer profile workflow`
4. `test(e2e): verify Dutch buyer and local-only chaos journeys`
5. `docs: explain UI traceability and Dutch buyer demo hardening`

Only files belonging to these changes are staged. Disposable scratch files such as `temp.cjs`, `tsc-output.txt`, Playwright artifacts, local logs, database dumps, and credentials are excluded; the two visible scratch files were deleted before staging.

## Security note

Personal-looking E2E fallback credentials were removed from the working tree. If those historical values were ever real, they should still be rotated because deleting them in a new commit does not remove them from existing Git history.
