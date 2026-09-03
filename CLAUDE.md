# OriginTrace — Claude Code Project Guide

> **Before scoping, planning, or implementing any non-trivial change, read [`docs/ORCHESTRATOR.md`](docs/ORCHESTRATOR.md).**
> It's the standing verification discipline for this repo (risk triage, evidence standards per claim type, hard
> gates before touching production/secrets, and a running log of real incidents and the bug classes they
> revealed — migration-committed-never-applied, orphaned shared schemas, route-name/behavior mismatches). It
> exists because this exact class of bug has shipped to production more than once. Trivial changes (copy,
> styling, comments) don't need it; anything else does.

## Project Overview

**OriginTrace** is a Next.js 16 (App Router) agricultural supply chain traceability platform built for African commodity cooperatives and agri-businesses.

**Core capabilities:**
- Farmer & farm registration with KYC
- Collection batch management (aggregation, dispatch)
- Shipment tracking with cost summaries and waybill PDF generation
- Payments & disbursements (farmer payouts, wallet, FX accounts)
- Compliance & audit logging
- Multi-tenant (orgs) with role-based access and subscription tiers

---

## Tech Stack

| Layer | Choice |
|-------|--------|
| Framework | Next.js 16.2.6, App Router, Turbopack (check `package.json` for exact pin) |
| Language | TypeScript (strict) |
| Database | Supabase (Postgres + RLS) — clients typed with generated `Database` types (see Database Migrations for the one still-open schema gap, `virtual_accounts`) |
| Auth | Supabase Auth + `getAuthenticatedProfile()` |
| Validation | `zod` (used in ~63 API routes) |
| UI | shadcn/ui + Tailwind CSS |
| State | React context (`useOrg()`, `useToast()`) |
| i18n | `next-intl` — see `i18n.ts` + `messages/` (partially adopted) |
| PDF | jspdf |
| PWA | next-pwa |
| CRM | `@hubspot/api-client` (marketing/lead sync) |
| Testing | Vitest (unit, `tests/*.test.ts`) + Playwright (E2E, `tests/e2e/*.spec.ts`) |
| Error tracking | Sentry |

---

## Repository Structure

This tree is illustrative, not exhaustive — `app/api/` has ~70 route groups and `app/app/` has ~40 page dirs. Run `ls` to see the current set; the ones below are just the load-bearing ones plus areas the short tree used to omit.

```
app/
  (marketing)/   # Public marketing site (own layout + design system — see below)
  api/           # ~178 route.ts handlers across ~70 groups (server-side)
    v1/          # Public/versioned API (API-key auth, not getAuthenticatedProfile)
    cron/        # Scheduled jobs (Bearer CRON_SECRET auth, not profile auth)
    webhooks/    # Inbound provider webhooks (paystack, grey, blockradar, calcom)
    superadmin/  # Cross-tenant admin endpoints
  app/           # App Router pages (client components) — ~40 domain dirs incl.
    batches/ dispatch/ farmers/ inventory/ payments/ shipments/ farms/
    compliance/ dds/ dpp/ pedigree/ traceability/ buyer/ tenders/ team/
    settings/ audit/ sync/ evidence/ conflicts/ processing/ ...
  superadmin/    # Superadmin console (separate from app/app)
  farmer/  buyer/  events/  verify/  auth/   # Standalone portals/flows
lib/
  rbac.ts        # ★ Role source of truth: AppRole union, ROLES, requireRole, route→role map
  api-auth.ts    # getAuthenticatedProfile()
  audit.ts       # Audit logging
  contexts/      # React contexts (org-context)
  config/        # navigation.ts (role/tier-gated nav), tier-gating.ts
  api/           # tier-guard.ts (enforceTier)
  supabase/      # admin.ts (service-role), client/server/middleware
  services/      # Business logic (disbursement calculator, etc.)
modules/         # Feature modules (business logic outside lib/)
supabase/migrations/  # 56 SQL migrations — canonical location
migrations/      # ⚠ LEGACY (2 files) — do NOT add here; scripts/check-migrations.ts fails on it
tests/           # Vitest unit specs + tests/e2e/ Playwright specs
messages/        # next-intl translation catalogs
content/         # Blog/marketing content
scripts/         # seed-*, check-db, check-migrations, apply-migrations, toggle-tier, ...
.agents/skills/  # ★ 22 project skills (SKILL.md files) catalogued in agents.md — see Skills below
public/images/   # logo-white.png, icon-green.png (192×192 for PWA)
```

---

## Key Patterns

### Authentication
Tenant-scoped API routes use `getAuthenticatedProfile(request)` from `lib/api-auth.ts` (~128 of 178 routes), then check `profile.org_id` / role. **Do not blindly add it everywhere** — these route families authenticate differently by design: `app/api/v1/*` (public API key), `app/api/cron/*` (Bearer `CRON_SECRET`), `app/api/webhooks/*` (provider signature), `app/api/auth/*` and `app/api/public/*` (pre-login). Match the pattern already used by sibling routes in the same folder.

### Roles (source of truth: `lib/rbac.ts`)
`AppRole` = `admin` · `aggregator` · `agent` · `quality_manager` · `logistics_coordinator` · `compliance_officer` · `warehouse_supervisor` · `buyer` · `farmer` (9 roles, **not** a strict linear hierarchy — access is per-route/per-feature).
- Gate access with `requireRole()` / the route→roles map in `lib/rbac.ts`; nav visibility uses `allowedRoles` in `lib/config/navigation.ts`. Do **not** hand-roll `profile.role === 'admin'` string checks — grep first for an existing helper.
- `buyer` and `farmer` use separate portals (`app/buyer`, `app/farmer`), not the main `app/app` console.

### Org Context (client)
```typescript
const { profile, organization } = useOrg();
// org name: organization?.name  (NOT orgName — that doesn't exist at top level)
```

### Admin Supabase Client
For API routes that need to bypass RLS:
```typescript
import { createAdminClient } from '@/lib/supabase/admin';
const supabase = createAdminClient();
```

### Tier Gating
```typescript
const tierBlock = await enforceTier(profile.org_id, 'payments');
if (tierBlock) return tierBlock;
```
Client-side: `<TierGate feature="payments" requiredTier="basic">`.
`null` tier = full access (no blocking).

### Audit Logging
```typescript
await logAuditEvent({ orgId, actorId, actorEmail, action: 'entity.action', resourceType, metadata, ipAddress });
```

---

## Development Branch

Develop on the branch assigned to your current task (the harness names it per-session). Never push to `main` without explicit approval. Do not hard-code a "current" branch here — the previous pin (`claude/implement-planned-features-LMqz5`) no longer exists and multiple agents (`Anthony`, `codex/*`, `claude/*`) work this repo in parallel.

---

## Database Migrations

Migrations live in **`supabase/migrations/`** (58 files as of 2026-07-09). Historically they were applied manually via the Supabase SQL editor rather than `supabase db push` — Supabase's own migration-tracking table only recorded 2 of them before 2026-07-09, even though dozens more were live. This caused real drift: several migration files existed in the repo but were **never actually run against the live DB**, so code referencing their tables/columns compiled but 500'd in production (or, worse, failed silently). Known cases as of 2026-07-09 were found and resolved — see `docs/FRICTION-AUDIT.md` §0 "C1 result" for that list, including two RPC functions (`create_shipment_atomic`, `sync_batches_atomic`) that had to be rewritten (not just applied) because they were written against a pre-UUID schema. **This is not a closed problem**: the same class recurred on 2026-09-03 (`farms.local_id` — see `docs/ORCHESTRATOR.md`'s Log), breaking farmer registration in production. Two CI jobs now guard against it going forward — `db-schema-local-check` (active, no secret needed) and `db-schema-check` (stub, needs a human-provisioned `SUPABASE_DB_URL` secret to activate) — but **read `docs/ORCHESTRATOR.md` before trusting that any migration you write has actually reached production**; don't assume from a clean `npm run check`.

Before writing code against a table, **verify the live schema** — don't guess column names. Use the `schema-verify` skill, `scripts/check-db.ts` / `scripts/probe-constraints.ts`, or the Supabase MCP `list_tables`. `lib/supabase/database.types.ts` **is generated and committed**, and all 4 client factories (`lib/supabase/{client,server,admin,middleware}.ts`) are typed with `createClient<Database>(...)` — a wrong column name now fails `npm run check`, not just production.

- Regenerate with **`SUPABASE_PROJECT_ID=gnvcvvsnnesieugnzmrz npm run gen:types`** (OriginTrace project ref) after any schema change → rewrites `lib/supabase/database.types.ts`. ⚠ The OriginTrace DB has `farms`/`collection_batches`/`shipments`/`profiles`; it is **not** the "FarmWise" Supabase project (a different product) — `gen:types` refuses to write if the signature tables are absent.
- Applying a migration by hand (Supabase MCP `apply_migration` or the dashboard SQL editor)? **Review it against the live schema first** — several past migration files assumed a schema shape (BIGINT ids, columns like `gps_lat`/`estimated_bags`) that no longer matches reality. Check column types via `information_schema.columns`, and for anything with an RLS policy, verify the policy actually references `profiles.user_id = auth.uid()` (not `profiles.id`) — two migrations were found with that exact bug, which would have made the table silently unreadable despite RLS "working."
- ⚠ **`virtual_accounts` is still genuinely missing** — no migration defines it at all (only an unverified `grey_virtual_accounts` JSONB column on `organizations`). SWIFT payment instructions are broken pending a product decision on the real shape. `app/api/farmers/[id]/files/route.ts`'s `compliance_files.file_name` NOT NULL constraint with no populating caller is also still open.
- ⚠ **Two migration dirs exist.** `supabase/migrations/` is canonical; the top-level `migrations/` is legacy and `scripts/check-migrations.ts` fails CI on any SQL left there. Never add migrations to the root.
- Filename convention: `YYYYMMDD_<description>.sql`; no duplicate date prefixes (the check script enforces both).

---

## Running & Verifying

- Dev server: `npm run dev` (port **5000**, host `0.0.0.0`).
- Type check: `npm run check` (`tsc`). Unit tests: `npm test` (Vitest). E2E: `npm run test:e2e` (Playwright, needs the dev server + seeded users).
- Seed data: `npm run seed:demo` / `seed:qa` / `seed:gacon` (see `scripts/seed-*`). Toggle a tenant's tier with `scripts/toggle-tier.ts`.
- **CI** (`.github/workflows/ci.yml`) runs typecheck + Vitest, then a build + E2E smoke lane. **App Router / Vercel traps that have repeatedly broken the Vercel build — check before pushing:** no function props passed Server→Client component; wrap `useSearchParams()` pages in `<Suspense>`; keep middleware in `proxy.ts` (Next 16 rename); Vercel Hobby allows limited cron. Run `npm run check` **and** `npm run build` locally before pushing marketing or events work.

---

## Skills Registry (`.agents/skills/` + `agents.md`)

This repo ships **22 project-specific skills** as `SKILL.md` files under `.agents/skills/` (api-routes, rbac, multi-tenancy, supabase-migrations, geospatial, compliance-regulations, offline-sync, playwright-tester, seed-data, deployment, i18n, ocr, security, testing, ui-components, release-notes, shipment-scoring, …), catalogued with trigger keywords in `agents.md`. Consult `agents.md` and the relevant `SKILL.md` before working in that domain — they encode the hard-won conventions.

> Note: these live in `.agents/skills/`, so Claude Code does not auto-load them as native `/skills`. The API-routes skill prescribes a `withErrorHandling` + `ApiError` "gold standard" (`lib/api/errors.ts`) that is currently used by only ~3 of 178 routes — treat it as the target pattern for new/edited routes, but expect most existing routes to use ad-hoc `try/catch` + `NextResponse.json({ error })`.

---

## Marketing Website Design System

**All marketing page work must follow the design system.** Before building or modifying any page under `app/(marketing)/`, read the design system first.

### Reference locations

| What | Where |
|------|-------|
| CSS source (canonical) | `app/marketing.css` |
| Live reference page | `/design-system` → `app/(marketing)/design-system/page.tsx` |
| Marketing layout (fonts, nav, footer) | `app/(marketing)/layout.tsx` |
| Animation primitives | `components/marketing/motion.tsx` |
| Shared section components | `components/marketing/` |

### Design system quick-reference

**Tokens** — all defined as CSS custom properties on `:root` in `marketing.css` section 1.
- Brand: `--mk-green` (#2E7D6B) · `--mk-green-dark` · `--mk-green-mid` · `--mk-green-light` · `--mk-green-pale`
- Text: `--mk-text-primary` · `--mk-text-secondary` · `--mk-text-muted` · `--mk-text-on-dark` · `--mk-text-on-dark-2`
- Surfaces: `--mk-surface-white/warm/green/gray/dark/black`
- Spacing: `--section-xs/sm/md/lg/xl` (md = 8.125rem, the Mivora standard)
- Radii: `--mk-radius-xs/sm/md/card/hero/pill`
- Shadows: `--mk-shadow-xs/sm/md/lg/xl` · `--mk-glow-green`

**Typography** — display scale uses Instrument Sans (`--font-display`), body uses Inter.
- Classes: `.text-display-2xl` → `.text-display-sm` (clamp-based, responsive)
- Colour helpers: `.text-mk-primary` · `.text-mk-muted` · `.text-mk-brand` · `.text-mk-on-dark` · `.text-mk-faded`

**Containers** — always use a container class; never set `max-width` inline on a page section.
- `.mk-container-2xs` (576px) · `.mk-container-xs` (704px) · `.mk-container-sm` (980px)
- `.mk-container` / `.mk-container-md` (1200px) · `.mk-container-lg` (1390px) · `.mk-container-full`

**Section surfaces** — apply to `<section>` to set background + auto-adapt child components.
- `.section-white` · `.section-warm` · `.section-green` · `.section-gray` · `.section-dark` · `.section-black`
- Border strips: `.section-bordered` · `.section-bordered-t` · `.section-bordered-b`

**Buttons** — always use button classes; never write ad-hoc button styles.
- `.btn-mk-primary` (green) · `.btn-mk-dark` (black) · `.btn-mk-outline` (green outline) · `.btn-mk-ghost` (on dark)
- Size modifiers: `.btn-mk-sm` · `.btn-mk-lg`

**Component classes** (all defined in `marketing.css`):
- Pre-title chip: `.pre-title`
- Section header: `.section-header` + `.section-header--left` / `.--center`; inner: `.section-header__title` · `.section-header__body`
- Feature card: `.mk-card` + `.mk-card__icon` · `.mk-card__title` · `.mk-card__body` · `.mk-card__arrow`
- Stat card: `.mk-stat-card` + `.mk-stat-card__value` · `.mk-stat-card__label`
- Counter row: `.mk-stat-row` + `.mk-stat-row__item` · `.mk-stat-row__value` · `.mk-stat-row__label` · `.mk-stat-row__divider`
- Counter grid: `.mk-counter-grid` + `.mk-counter-item` · `.mk-counter-number` · `.mk-counter-title`
- Blog card: `.mk-blog-card` (full component)
- Blog carousel: `.mk-blog-layout` / `.mk-blog-slider` / `.mk-blog-cards` / `.mk-blog-item`
- Icon badge: `.mk-icon-badge` + `--lg` / `--xl`
- Reg-tags: `.reg-tag` + `.reg-tag--eudr/fsma/uk/china/uae`
- Mission items: `.mk-mission-item` + `.mk-mission-item__icon`
- List items: `.mk-list-item` + `.mk-list-item__icon`
- Cert marquee item: `.mk-cert-item` + `.mk-cert-dot`
- Grid helpers: `.mk-grid-2/3/4` · `.mk-grid-auto` · `.mk-gap-sm/md/lg/xl`
- Dividers: `.mk-divider-h` · `.mk-divider-v` · `.mk-rule`
- Role panels: `.mk-role-grid` · `.mk-role-image` · `.mk-role-content` · `.mk-role-stats`
- Timeline strip: `.mk-timeline-strip` · `.mk-timeline-item` · `.mk-timeline-item--active` · `.mk-timeline-year` · `.mk-timeline-label`
- Demo grids: `.mk-feature-grid` (3→2→1 col) · `.mk-form-grid` (2→1 col)

**Responsive rules**
- Mobile breakpoint: 767px. All grid/panel classes collapse at this point.
- Inline `style={{ gridTemplateColumns }}` cannot be overridden by CSS without `!important` — always use a CSS class for column definitions; keep only dynamic values (e.g. `order`) as inline styles.
- The marketing layout wraps pages in `<div class="min-h-screen overflow-x-hidden">`. Never add `overflow:hidden` to a child that must scroll horizontally (e.g. timeline strip uses `overflow-x:auto`).

**Page titles** — the marketing layout sets `template: '%s | OriginTrace'`. Page-level `metadata.title` must be the bare title only (no `| OriginTrace` suffix). The compliance layout (`app/(marketing)/compliance/layout.tsx`) re-exports its own template so sub-pages inherit it correctly.

**Animations** — prefer `FadeIn` / `FadeInStagger` from `components/marketing/motion.tsx`. CSS-only fallback: `[data-animate="fade-up"]` + add `.is-visible` via IntersectionObserver, or `.animate-fade-in-up` for one-shot keyframe.

---

## Important Conventions

- Use `icon-green.png` (192×192 square) for collapsed sidebar / favicon; `logo-white.png` for expanded sidebar
- Payment providers: never show Paystack, Blockradar, Grey, or Leatherback brand names in the UI — everything appears as "OriginTrace"
- All monetary amounts: display with `toLocaleString()`, store as numbers
- Dates: ISO strings in DB, format with `toLocaleDateString('en-GB', ...)` in UI
