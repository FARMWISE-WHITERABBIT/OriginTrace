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

## Important Conventions

- Use `icon-green.png` (192×192 square) for collapsed sidebar / favicon; `logo-white.png` for expanded sidebar
- Payment providers: never show Paystack, Blockradar, Grey, or Leatherback brand names in the UI — everything appears as "OriginTrace"
- All monetary amounts: display with `toLocaleString()`, store as numbers
- Dates: ISO strings in DB, format with `toLocaleDateString('en-GB', ...)` in UI
