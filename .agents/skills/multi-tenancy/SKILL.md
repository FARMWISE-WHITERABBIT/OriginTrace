---
name: multi-tenancy
description: >
  Use this skill when adding a new tenant-scoped table, writing RLS policies
  for multi-tenant isolation, implementing superadmin cross-tenant access,
  handling org_id in queries, or debugging data leaking between tenants.
  Triggers for any mention of "multi-tenant", "org_id", "tenant isolation",
  "RLS policy", "superadmin access", "cross-tenant", "add org to table",
  "new tenant", or "data isolation". Always use this skill before creating
  any table that stores per-tenant data — missing RLS is a critical data
  breach risk.
---

# Multi-Tenancy Skill

## 1. Overview

**Mission:** Every row of tenant data is strictly isolated by `org_id`.
Row-Level Security (RLS) in PostgreSQL enforces this at the database layer
as a safety net, but the application layer must also filter by `org_id`
explicitly — never rely on RLS alone.

**Golden rule:** If a table holds data that belongs to a specific organisation,
it has `org_id + RLS`. No exceptions.

---

## 2. Tenancy Architecture

```
organisations           ← tenant root (one row per customer)
    │
    ├── profiles         ← users belonging to the org
    ├── farms            ← org-scoped
    ├── suppliers        ← org-scoped
    ├── shipments        ← org-scoped
    ├── risk_scores      ← org-scoped (denormalised from shipments)
    └── pedigree_certificates ← org-scoped

reference_data          ← NOT tenant-scoped (shared across all orgs)
    ├── countries
    ├── commodity_types
    └── risk_zones
```

---

## 3. Adding a New Tenant-Scoped Table

Follow this exact template every time. See `supabase-migrations` skill for
the migration file workflow.

```sql
-- Step 1: Create the table with org_id as a non-nullable FK
CREATE TABLE IF NOT EXISTS farm_certifications (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id     UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  farm_id    UUID NOT NULL REFERENCES farms(id) ON DELETE CASCADE,
  cert_type  TEXT NOT NULL,
  issued_at  DATE NOT NULL,
  expires_at DATE,
  issuer     TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Step 2: Enable RLS (mandatory)
ALTER TABLE farm_certifications ENABLE ROW LEVEL SECURITY;

-- Step 3: Tenant isolation policy
CREATE POLICY "tenant_isolation" ON farm_certifications
  FOR ALL
  USING (org_id = (auth.jwt() ->> 'org_id')::UUID)
  WITH CHECK (org_id = (auth.jwt() ->> 'org_id')::UUID);

-- Step 4: Superadmin bypass
CREATE POLICY "superadmin_bypass" ON farm_certifications
  FOR ALL
  USING ((auth.jwt() ->> 'role') = 'superadmin');

-- Step 5: Indexes
CREATE INDEX idx_farm_certs_org  ON farm_certifications(org_id);
CREATE INDEX idx_farm_certs_farm ON farm_certifications(farm_id);
```

---

## 4. The JWT Claim Convention

`org_id` and `role` are stored in the Supabase JWT as custom claims, set
when the user logs in via a database hook or Auth hook:

```sql
-- supabase/functions/custom-claims.sql
-- This function is called by Supabase Auth after login
CREATE OR REPLACE FUNCTION public.custom_access_token_hook(event JSONB)
RETURNS JSONB LANGUAGE plpgsql AS $$
DECLARE
  claims JSONB;
  profile_row RECORD;
BEGIN
  SELECT org_id, role INTO profile_row
  FROM public.profiles
  WHERE id = (event ->> 'user_id')::UUID;

  claims := event -> 'claims';
  claims := jsonb_set(claims, '{org_id}', to_jsonb(profile_row.org_id));
  claims := jsonb_set(claims, '{role}',   to_jsonb(profile_row.role));
  RETURN jsonb_set(event, '{claims}', claims);
END;
$$;
```

In RLS policies, access these claims as:
```sql
auth.jwt() ->> 'org_id'    -- returns TEXT
auth.jwt() ->> 'role'      -- returns TEXT
```

---

## 5. Superadmin Cross-Tenant Access

Superadmins need to see all tenant data for support and billing. Two patterns:

### Pattern A: RLS bypass (service role key)
```typescript
// Only for superadmin API routes — never use in tenant-facing routes
import { createClient } from '@supabase/supabase-js'

const adminSupabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!   // bypasses RLS entirely
)

// Always add a comment explaining why service role is used
// Reason: superadmin route to list all organisations for billing dashboard
const { data: allOrgs } = await adminSupabase.from('organisations').select('*')
**Mission:** OriginTrace is a multi-tenant SaaS. Data for different organizations must never leak. We enforce this through mandatory `org_id` columns on all tenant-scoped tables and strict PostgreSQL Row Level Security (RLS).

---

## 2. RLS Helper Functions (`supabase/schema.sql`)

Always use the following helpers in RLS policies to ensure consistency:
- `get_user_org_id()`: Returns the `org_id` of the currently authenticated user from their profile.
- `is_system_admin()`: Returns `true` if the user is a superadmin, bypassing tenant isolation.

---

## 3. Enforcement Pattern

Every tenant-scoped table must follow this pattern:

```sql
ALTER TABLE my_table ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their org data" ON my_table
  FOR SELECT USING (org_id = get_user_org_id() OR is_system_admin());

CREATE POLICY "Users can create their org data" ON my_table
  FOR INSERT WITH CHECK (org_id = get_user_org_id());

CREATE POLICY "Admins can manage their org data" ON my_table
  FOR ALL USING (
    org_id = get_user_org_id() 
    AND EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role = 'admin')
  );
```

---

## 4. Application Layer Responsibility

Even with RLS, the application layer should always filter by `org_id` for performance and as a defense-in-depth measure.
- **Supabase Client**: Always include `.eq('org_id', orgId)` in queries.
- **API Routes**: Retrieve `org_id` from the authenticated profile and inject it into all database operations.

---

## 5. Gotchas

- **Profile Protection**: The `profiles` table has a special policy that prevents users from updating their own `org_id` or `role`. This is critical to prevent "org hopping".
- **Superadmin Access**: Superadmins can see data across all tenants. Use this power sparingly and only via the `admin-dashboard`.
- **Foreign Keys**: Ensure all tenant-scoped tables have a foreign key to `organizations(id) ON DELETE CASCADE`.

---

## 6. Creating a New Tenant (Programmatic)

```typescript
// lib/admin/create-tenant.ts (superadmin only)
export async function createTenant(input: {
  orgName:    string
  orgSlug:    string
  adminEmail: string
  plan:       string
}) {
  // 1. Create organisation
  const { data: org } = await adminSupabase
    .from('organisations')
    .insert({ name: input.orgName, slug: input.orgSlug, plan: input.plan })
    .select()
    .single()

  // 2. Create Supabase Auth user
  const { data: authUser } = await adminSupabase.auth.admin.createUser({
    email:         input.adminEmail,
    password:      generateTempPassword(),
    email_confirm: true,
  })

  // 3. Create profile linking user to org
  await adminSupabase.from('profiles').insert({
    id:       authUser.user!.id,
    org_id:   org!.id,
    role:     'admin',
    full_name: 'Admin',
  })

  // 4. Send invitation email
  await adminSupabase.auth.admin.inviteUserByEmail(input.adminEmail)

  return { org, userId: authUser.user!.id }
}
```

---

## 8. RLS Verification Query

Run this after every migration to confirm no tenant-scoped tables are missing RLS:

```sql
SELECT t.tablename, t.rowsecurity
FROM pg_tables t
LEFT JOIN information_schema.columns c
  ON c.table_name = t.tablename AND c.column_name = 'org_id'
WHERE t.schemaname = 'public'
  AND c.column_name = 'org_id'   -- only tables with org_id column
  AND t.rowsecurity = false;     -- that are missing RLS
-- Should return 0 rows
```

---

## 9. Gotchas

- **`ON DELETE CASCADE` on `org_id FK` is required.** When an organisation is deleted, all their data must cascade-delete. Without this, orphaned rows accumulate and can surface in queries.
- **JWT org_id is set at login time.** If you change a user's `org_id` in the `profiles` table, they must log out and back in for the new `org_id` to appear in their JWT.
- **Reference tables must NOT have tenant RLS.** Tables like `countries`, `risk_zones`, and `commodity_types` are shared — adding RLS to them breaks lookups for all tenants.
- **Supabase Realtime subscriptions also respect RLS.** If you enable Realtime on a tenant-scoped table, each client will only receive events for their own `org_id` — no extra filtering needed in the subscription.
