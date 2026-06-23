# OriginTrace — Claude Code Project Guide

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
| Framework | Next.js 16.1.6, App Router, Turbopack |
| Language | TypeScript (strict) |
| Database | Supabase (Postgres + RLS) |
| Auth | Supabase Auth + `getAuthenticatedProfile()` |
| UI | shadcn/ui + Tailwind CSS |
| State | React context (`useOrg()`, `useToast()`) |
| PDF | jspdf |
| PWA | next-pwa |
| Error tracking | Sentry |

---

## Repository Structure

```
app/
  api/           # Next.js API routes (server-side, uses Supabase admin client)
  app/           # App Router pages (client components)
    audit/       # Audit log
    batches/     # Collection batch management
    dispatch/    # Dispatch workflow + details
    farmers/     # Farmer profiles
    inventory/   # Inventory + bulk dispatch
    payments/    # Wallet, disbursements, transactions
    shipments/   # Shipment management
    ...
components/      # Shared UI components
lib/
  contexts/      # React contexts (org-context)
  config/        # Navigation, tier config
  supabase/      # Supabase client + admin
  services/      # Business logic (disbursement calculator, etc.)
  totp.ts        # RFC 6238 TOTP (2FA)
  audit.ts       # Audit logging
  webhooks.ts    # Webhook dispatch
supabase/
  migrations/    # SQL migrations (apply via Supabase SQL editor)
public/
  images/        # logo-white.png, icon-green.png (192×192 for PWA)
```

---

## Key Patterns

### Authentication
All API routes use `getAuthenticatedProfile(request)` from `lib/api-auth.ts`. Never skip this. Always check `profile.org_id` and `profile.role`.

### Role Hierarchy
`admin` > `aggregator` > `logistics_coordinator` > `compliance_officer` > `viewer`

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

Active feature branch: `claude/implement-planned-features-LMqz5`

Always develop on this branch. Never push to `main` without explicit approval.

---

## Database Migrations

Migrations live in `supabase/migrations/`. They must be applied manually via the Supabase SQL editor or `supabase db push`. Check existing migrations before adding columns that may already exist.

Pending migration (not yet applied):
- `20260407_org_totp_2fa.sql` — adds `totp_secret`, `totp_enabled`, `totp_pending_secret` to `organizations`

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
