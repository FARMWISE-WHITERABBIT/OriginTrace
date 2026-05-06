---
name: seed-data
description: >
  Use this skill when working with demo data, tenant onboarding scripts, or
  the database reset/seed workflow. Triggers for any mention of "seed the
  database", "create a demo tenant", "reset local data", "seed-demo",
  "seed-gacon", "seed-locations", "reset-and-seed", or "test data setup".
  Always use this skill before writing a new seed script or modifying an
  existing one — it documents the tenant anatomy, script structure, and
  the exact reset workflow.
---

# Seed Data Skill

## 1. Overview

OriginTrace uses TypeScript seed scripts to populate the local database with
realistic demo data for development and testing. The seed system supports
multiple demo tenants with different configurations.

---

## 2. Seed Scripts (`scripts/`)

| Script | Purpose |
|--------|---------|
| `seed-demo.ts` | Primary demo tenant — full-featured with all entity types |
| `seed-gacon.ts` | GACON tenant — realistic Nigerian cocoa exporter |
| `seed-locations.ts` | Reference data — Nigerian states, LGAs, villages |
| `reset-and-seed.sh` | Full reset — truncates everything and re-seeds |

---

## 3. Reset & Seed Workflow

```bash
# Full reset (wipes ALL data — never run against production!)
./scripts/reset-and-seed.sh
```

> **Warning:** `reset-and-seed.sh` wipes ALL data. Never run it against a
> production Supabase project. Guard with `NODE_ENV` checks in the script.

---

## 4. Demo Tenant Anatomy

A complete demo tenant consists of the following entities in insertion order
(respect foreign keys):

```
1. organisation         ← the tenant root
2. users                ← at least one per role (admin, manager, field_agent, viewer)
3. farms                ← 3–5 farms with GeoJSON boundaries
4. suppliers            ← linked to farms
5. shipments            ← 5–10 shipments in various statuses
6. shipment_items       ← line items per shipment
7. pedigree_certificates← one per completed shipment
8. risk_scores          ← scoring snapshot for each shipment
```

---

## 5. Creating a New Demo Tenant

Use this template as the base for any new seed script:

```typescript
// scripts/seed-acme.ts
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!   // service key bypasses RLS
)

async function seed() {
  console.log('Seeding ACME tenant...')

  // 1. Create organisation
  const { data: org, error: orgErr } = await supabase
    .from('organisations')
    .insert({
      name: 'ACME Cocoa Exports', slug: 'acme-cocoa',
      country: 'GH', plan: 'professional',
    })
    .select().single()
  if (orgErr) throw orgErr

  // 2. Create users (one per role)
  const users = [
    { email: 'admin@acme.test',   role: 'admin',       full_name: 'Ada Admin' },
    { email: 'manager@acme.test', role: 'aggregator',   full_name: 'Mike Manager' },
    { email: 'field@acme.test',   role: 'agent',        full_name: 'Femi Field' },
    { email: 'viewer@acme.test',  role: 'buyer',        full_name: 'Victor Viewer' },
  ]

  for (const u of users) {
    const { data: authUser } = await supabase.auth.admin.createUser({
      email: u.email, password: 'demo-password-123', email_confirm: true,
    })
    await supabase.from('profiles').insert({
      id: authUser.user!.id, org_id: org.id,
      role: u.role, full_name: u.full_name,
    })
  }

  // 3. Seed farms, shipments, etc. (follow anatomy in Section 4)
  console.log(`Done. Org ID: ${org.id}`)
}

seed().catch(console.error)
```

---

## 6. Seed Data Conventions

- **Emails:** Always use `.test` TLD (e.g. `user@tenant.test`) — prevents accidental sends.
- **Passwords:** `demo-password-123` for all seed users.
- **UUIDs:** Let Postgres generate them via `gen_random_uuid()` — never hardcode.
- **Dates:** Use relative dates (`new Date(Date.now() - 7 * 86400000)`) so data stays "recent".
- **GeoJSON:** For farm boundaries, use small polygons around known coordinates. See `seed-locations.ts`.

---

## 7. Adding Seed Data for a New Table

When you create a new table via migration (see `supabase-migrations` skill):

1. Add seed insertion to `seed-demo.ts` in dependency order
2. If it's reference/lookup data, add to `seed-locations.ts`
3. Update truncate scripts to include the new table with correct cascade order

---

## 8. Gotchas

- **Foreign key order matters.** Truncate child tables before parents; insert parents before children.
- **`service_role` key required.** Seed scripts must use `SUPABASE_SERVICE_ROLE_KEY`, not the `anon` key.
- **Auth users are separate from profiles.** `supabase.auth.admin.createUser()` creates the auth record; you still need a matching `profiles` row with `org_id` and `role`.
- **Idempotency.** Seed scripts are NOT idempotent by default — running twice creates duplicates. Always run `reset-and-seed.sh` to start clean, or add `ON CONFLICT DO NOTHING`.
- **Role names must match RBAC.** Use the exact role strings from `lib/rbac.ts`: `admin`, `aggregator`, `agent`, `quality_manager`, `logistics_coordinator`, `compliance_officer`, `warehouse_supervisor`, `buyer`, `farmer`.
