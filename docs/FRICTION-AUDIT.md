# OriginTrace — Friction Audit & Automation Proposals

_Audited 2026-07-05 on branch `claude/origintrace-audit-wdk6q0`. Method: parallel subagents over 312 commits of git history, the meta-doc corpus (`ANTHONY.md`, `agents.md`, `Operations_ai.md`, `failure_ai.md`, `cve.md`, `untested.md`), all 178 API route handlers, the test suite, and CLAUDE.md claims vs. reality._

This is where the team keeps losing time, grouped into clusters, each with the evidence behind it and a concrete fix (new skill, automation, or doc change).

## 0. Status — what has been fixed in this branch

| Fix | Status |
|-----|--------|
| CLAUDE.md stale/wrong facts (branch, 9 roles, migrations, tree, auth nuance, `lib/api/errors.ts` path) | ✅ applied |
| `tsconfig.json` deprecated `baseUrl` removed → `npm run check` clean on TS 5.6 **and** 6.x | ✅ applied (typecheck + build verified) |
| Broken `scripts/check-migrations.ts` (`__dirname` ESM crash; over-strict same-day dup rule) fixed | ✅ applied (now passes: 56 migrations) |
| Stale legacy `migrations/*.sql` (superseded Session 7/8 drafts) deleted; dir removed | ✅ applied |
| `check-migrations` + `skills:check` wired into CI | ✅ applied |
| 22 `.agents/skills/` mirrored into `.claude/skills/` so they auto-load; `npm run skills:sync` + CI drift guard | ✅ applied (24 skills live) |
| 4 new skills: `schema-verify`, `vercel-preflight`, `marketing-page`, `page-data-fetch` | ✅ authored + catalogued |
| `hooks/use-api-resource.ts` canonical data hook (C4) | ✅ added |
| `npm run preflight` (migrations + tsc + build) automation (C3) | ✅ added |
| Supabase type generation tooling: `npm run gen:types` + `scripts/gen-types.ts` | ⚠️ tooling shipped — **cannot generate the file here**: none of the 3 Supabase projects this session can reach is the OriginTrace DB (they are FarmWise, a bookings app, and a trading-bot app). Run `SUPABASE_PROJECT_ID=<ref> npm run gen:types` against the real project ref to finish C1. |
| API "gold standard" (`withErrorHandling`/`ApiError`) adoption: 3/178 routes | ▶ campaign — helper exists + skill added; mass migration intentionally not swept blind |
| Page boilerplate migration onto `useApiResource`: 40 pages | ▶ campaign — hook + skill added; per-page migration left as follow-up |

Verification: `npm run check` ✓, `npm run check:migrations` ✓, `npm run skills:check` ✓, `npm test` → **691 passed**, `npm run build` compiles with **0** module/path errors (only offline Google-Fonts fetch fails in this sandbox; CI/Vercel builds normally).

---

The remaining sections are the underlying analysis. The CLAUDE.md fixes in §4 were applied first; §2–§3 record the skills and automations, now built.

---

## 1. Friction clusters (ranked by cost)

### C1 — Schema/DB drift is the #1 bug source ★
**Evidence:** 41% of all non-merge commits are `fix:`. A recurring sub-family fixes column-name mismatches against the live DB _after_ deploy: `4d364a1` (bags/batch_contributions/farms), `a76bd39` (`batch_id`→`batch_code`), `111a445`+`edf2b34` ("remaining schema column mismatches"), `e8a765d` (phantom `weight_kg`), `48f7275`→`cdf9c33` (a UUID/INTEGER org-id migration flip-flop where one fix contradicted the next), `a9e6de0`/`0c032ad` (missing columns → Vercel 500s).
**Root cause:** migrations are applied manually via the Supabase SQL editor, and **there is no generated `Database` type** — `lib/supabase/admin.ts` calls `createClient(url, key)` untyped. A wrong column name compiles clean and fails only in production. `app/app/farmers/[id]/page.tsx` (17 commits) and `app/api/farmers/[id]/route.ts` (13) are the churn hotspots.
**Fix:** generate + commit `lib/supabase/database.types.ts`, type both clients, and add a CI drift check (§3-A). This converts a class of production 500s into compile errors.

### C2 — Marketing pixel-pushing & build-then-rebuild
**Evidence:** `app/marketing.css` is the single most-churned file (26 commits). The solutions hero card was repositioned in three consecutive commits (`e4dff53`→`36d6eeb`→`3b0c494`); mobile hero visibility/height/padding was fixed 6+ separate ways (`e9392ae`, `ef2d99f`, `9bf81f3`, `f9db9ca`, `3417251`, `d88fa81`). Whole page families were built then wholesale redesigned to "match the EUDR pattern" (`241a5db`, `7976bc6`, `7656f02`, `f6eb57f` — 22 redesign/rebuild commits, ~8% of history). The design-system doc (`6fd9681`) was written _after_ this churn.
**Root cause:** pixel-matching an external reference (Mivora) by iteration with no spec, and no shared page template — each "rebuild to match EUDR" is a full-file rewrite instead of a component swap. Inline `gridTemplateColumns` fighting CSS breakpoints was a repeated trap (`aa201bc`).
**Fix:** a marketing-page skill + a compliance/industry page scaffold generator (§2-B, §3-D).

### C3 — Next.js 16 / Vercel platform traps caught only at deploy
**Evidence:** `bab6624` (function props Server→Client), `06a2769`/`4dda692`/`bb3a107`/`df3ad29` (missing `useSearchParams` Suspense boundaries), `46af1df`+`2f6624e` (middleware→`proxy.ts` rename fallout), cron limits fixed 3× for Vercel Hobby (`57ce3b9`, `5c80531`, `65df0b5`), and a run of deploy-only TS failures (`128f8c5`, `b60e35d`, `a404910`, `bec7bc3`). The events feature alone took **six consecutive** TS-error fix commits after merge; `app/api/events/register/route.ts` churned 14×.
**Root cause:** commits pushed without a local `next build`/typecheck gate; App Router Server/Client + Suspense rules violated repeatedly.
**Fix:** a pre-push build/typecheck hook (§3-B) and a codified trap checklist (added to CLAUDE.md §4).

### C4 — Core workflow (dispatch / shipments / payments) fixed in omnibus sweeps
**Evidence:** `app/app/dispatch/page.tsx` (20 commits), `shipments/[id]/page.tsx` (15), `payments/page.tsx` (14). Bugs land in batches — `528726e` "resolve dispatch, shipments, payment and inventory workflow bugs", `5448225` "shipment columns, dispatch RLS, payment workflow bugs", `232b23f` "three production 404/500 errors". The `orgName` trap (`2227ac1`→`e87079d`: a wrong fix immediately re-fixed) is now memorialized in CLAUDE.md.
**Root cause:** the workflow spans many pages/routes with **duplicated data-access + auth boilerplate** and no unit tests over the flow — bugs are found by manual production clicking, then swept up together. The largest files are enormous: `shipments/[id]/page.tsx` is **2,305 lines**, `settings/page.tsx` 1,971, `payments/disbursements/page.tsx` 1,473.
**Fix:** the api-routes "gold standard" is real but adopted by only 3/178 routes — drive adoption via a skill + codemod (§2-A), and add a data-fetch hook to kill page boilerplate (§2-D).

### C5 — Tests chase marketing copy; QA is retroactive
**Evidence:** `99aecf6` "update EUDR test to match new heading copy", `6b82cda`, `dc83640` (syntax error in marketing spec), `83c88b7`, `a57000f`/`e35cad9` (CI Node-version fix done twice). E2E specs assert exact marketing copy while copy is in constant flux.
**Root cause:** brittle text assertions on a fast-moving marketing site; QA runs as periodic Playwright "closure passes" (per `failure_ai.md`/`untested.md`) rather than per-change.
**Fix:** switch marketing smoke assertions to structural/`data-testid` checks (§2-B guidance) and stop asserting literal headings.

### C6 — GIS / GFW satellite stack is hard to verify headlessly
**Evidence:** `588cf71`, `ff574de`, `879e4dd`, `e0ae55d`, `66d2169`, `cce9c89` (satellite tiles, map pan, deforestation false-positives, `DEFORESTATION_COLORS` undefined). GFW API keys needed three passes: integrate → `77f6662` company-key-with-fallback → `8332dc6` key-exhaustion monitor.
**Root cause:** map rendering + external API quotas can't be checked without a browser and live keys; failures surface in production.
**Fix:** the existing `geospatial` skill + `scripts/gfw-live-smoke.ts` are the right tools — surface them in CLAUDE.md (done) and add a key-exhaustion alerting note.

### C7 — Meta-doc sprawl & agent-persona overhead
**Evidence:** `ANTHONY.md` (49 KB, 21 commits — a per-agent journal) plus `agents.md`, `Operations_ai.md` (33 KB), `replit.md`, `failure_ai.md`, `untested.md`, `cve.md`, and `CLAUDE.md` overlap heavily and contradict each other (CLAUDE.md named a dead branch and a 5-role hierarchy; `lib/rbac.ts` has 9 roles). Multiple agents (`Anthony`, `codex/*`, 8+ `claude/*`) use different commit conventions, making history noisy.
**Root cause:** each agent maintains its own doc; no single canonical index; docs written as scar tissue after each burn and never reconciled.
**Fix:** make CLAUDE.md the thin canonical index that points to `agents.md`/skills (done in §4); treat `ANTHONY.md`/`Operations_ai.md` as append-only journals, not sources of truth.

---

## 2. Proposed new skills

The repo already has 22 skills in `.agents/skills/`, but they live outside `.claude/skills/` so Claude Code doesn't auto-load them. **Highest-leverage automation of all: symlink or copy `.agents/skills/*` into `.claude/skills/`** (each already has valid `SKILL.md` frontmatter) so they load natively. Beyond that, these gaps have no skill:

| # | Skill | Solves | What it does |
|---|-------|--------|--------------|
| A | **`schema-verify`** | C1 | Before writing DB code: dump the live table shape (via `scripts/check-db.ts` or Supabase MCP `list_tables`), diff against the query, and refuse to guess column names. Regenerates `database.types.ts`. |
| B | **`marketing-page`** | C2, C5 | Wraps the CLAUDE.md design-system rules into an active checklist; scaffolds a new compliance/industry page from the EUDR template instead of copy-pasting 300 lines; uses `data-testid` not copy for any test hooks. |
| C | **`vercel-preflight`** | C3 | Runs the App-Router trap checklist (Server/Client props, Suspense around `useSearchParams`, `proxy.ts`, cron limits) + `next build` before declaring a change done. |
| D | **`page-data-fetch`** | C4 | Enforces a shared client data-fetching hook (see §3-C) instead of raw `fetch()` + `useOrg()` + loading/toast boilerplate repeated across 40 pages. |

`schema-verify` (C1) is the one to build first — it attacks the single largest bug family.

---

## 3. Proposed automations (hooks / CI / scripts)

**A. Supabase type-drift CI gate (attacks C1).** Add to `.github/workflows/ci.yml`:
```yaml
- name: Generate Supabase types
  run: npx supabase gen types typescript --project-id "$SUPABASE_PROJECT_ID" > lib/supabase/database.types.ts
- name: Fail if committed types are stale
  run: git diff --exit-code lib/supabase/database.types.ts
```
Then type the clients (`createClient<Database>(...)`). Wrong column names become red squiggles, not 500s.

**B. Pre-push build+typecheck hook (attacks C3, C4).** A `.claude/settings.json` `PreToolUse`/`Stop` hook — or a git `pre-push` — running `npm run check && npm run build`. Most deploy-only failures in history would have been caught locally. (Use the `update-config` skill to wire the hook safely.)

**C. Shared page data hook (attacks C4).** Introduce `hooks/use-api-resource.ts` (org-scoped fetch + loading/error/toast + refetch) and migrate the biggest pages onto it, shrinking the 1,500–2,300-line page files and removing the duplicated auth/error handling where workflow bugs breed.

**D. Marketing page generator (attacks C2).** `scripts/new-compliance-page.ts <slug>` that stamps the EUDR page structure (hero + reg-tags + calculator + FAQ) using shared `components/marketing/*` so "rebuild to match EUDR" is a 1-command scaffold, not a rewrite.

**E. `check-migrations` in CI (attacks C1/C7).** `scripts/check-migrations.ts` already exists and fails on the legacy `migrations/` root — but 2 SQL files still sit there. Either wire it into CI (it currently isn't) or move those files; right now the guard is unenforced.

---

## 4. CLAUDE.md fixes — **applied in this branch**

| Was | Now |
|-----|-----|
| Active branch `claude/implement-planned-features-LMqz5` | ❌ Branch doesn't exist → replaced with per-task guidance |
| Role hierarchy = 5 roles (`admin>aggregator>logistics_coordinator>compliance_officer>viewer`) | ❌ `lib/rbac.ts` defines **9** roles → corrected + pointed to source of truth + `requireRole` |
| "Pending migration `20260407_org_totp_2fa.sql` not yet applied" | ❌ File is present, ~40 migrations deep → removed; documented drift + no generated types |
| Repo tree lists ~8 `app/app` dirs | Reality is ~40 dirs / ~70 API groups → expanded, flagged legacy `migrations/`, `.agents/skills/`, `modules/`, `v1`, `cron`, `webhooks` |
| Framework "Next.js 16.1.6" | Actually 16.2.6 (per `cve.md`); added zod, next-intl, Vitest/Playwright, HubSpot to stack |
| "All API routes use `getAuthenticatedProfile`. Never skip." | Nuanced: 128/178 do; `v1`/`cron`/`webhooks`/`auth`/`public` authenticate differently by design |
| (missing) | Added **Running & Verifying** (dev port 5000, test/build/CI, Vercel trap checklist) and **Skills Registry** sections |

---

## 5. If you do three things

1. **Generate + commit typed Supabase types and gate them in CI** (C1) — kills the biggest bug family.
2. **Copy `.agents/skills/*` into `.claude/skills/`** so the 22 existing skills load natively, and add `schema-verify` + `vercel-preflight`.
3. **Add a local `next build && npm run check` pre-push gate** (C3) — most deploy-only breakages were locally catchable.
