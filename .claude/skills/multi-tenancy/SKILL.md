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

Every row of tenant data is strictly isolated by `org_id`. Row-Level Security
(RLS) in PostgreSQL enforces this at the database layer as a safety net, but
the application layer must also filter by `org_id` explicitly — never rely
on RLS alone.

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

## 3. RLS Helper Functions

The schema provides two helpers for consistent RLS policies:

- `get_user_org_id()`: Returns the `org_id` of the currently authenticated
  user from their profile.
- `is_system_admin()`: Returns `true` if the user is a superadmin, bypassing
  tenant isolation.

---

## 4. Adding a New Tenant-Scoped Table

Follow this exact template every time:

```sql
-- Step 1: Create the table with org_id as a non-nullable FK
CREATE TABLE IF NOT EXISTS farm_certifications (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id     UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  farm_id    UUID NOT NULL REFERENCES farms(id) ON DELETE CASCADE,
  cert_type  TEXT NOT NULL,
  issued_at  DATE NOT NULL,
  expires_at DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Step 2: Enable RLS (mandatory)
ALTER TABLE farm_certifications ENABLE ROW LEVEL SECURITY;

-- Step 3: Tenant isolation policies
CREATE POLICY "Users can view their org data" ON farm_certifications
  FOR SELECT USING (org_id = get_user_org_id() OR is_system_admin());

CREATE POLICY "Users can create their org data" ON farm_certifications
  FOR INSERT WITH CHECK (org_id = get_user_org_id());

CREATE POLICY "Admins can manage their org data" ON farm_certifications
  FOR ALL USING (
    org_id = get_user_org_id()
    AND EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role = 'admin')
  );

-- Step 4: Superadmin bypass
CREATE POLICY "superadmin_bypass" ON farm_certifications
  FOR ALL USING (is_system_admin());

-- Step 5: Indexes
CREATE INDEX idx_farm_certs_org  ON farm_certifications(org_id);
CREATE INDEX idx_farm_certs_farm ON farm_certifications(farm_id);
```

---

## 5. Application Layer Responsibility

Even with RLS, the application layer should always filter by `org_id` for
performance and as a defense-in-depth measure.

- **Supabase Client**: Always include `.eq('org_id', orgId)` in queries.
- **API Routes**: Retrieve `org_id` from the authenticated profile and inject
  it into all database operations.

```typescript
const { user, profile } = await getAuthenticatedProfile(request);
const supabase = createAdminClient();
const { data } = await supabase
  .from('my_table')
  .select('*')
  .eq('org_id', profile.org_id);  // Always filter!
```

---

## 6. Superadmin Cross-Tenant Access

Superadmins need to see all tenant data for support and billing. Use the
service role key, which bypasses RLS entirely:

```typescript
// Only for superadmin API routes — never in tenant-facing routes
import { createAdminClient } from '@/lib/supabase/admin'
const adminSupabase = createAdminClient()
// Always add a comment explaining why service role is used
const { data: allOrgs } = await adminSupabase.from('organisations').select('*')
```

---

## 7. Creating a New Tenant (Programmatic)

```typescript
// lib/admin/create-tenant.ts (superadmin only)
export async function createTenant(input: {
  orgName: string; orgSlug: string; adminEmail: string; plan: string;
}) {
  const adminSupabase = createAdminClient()
  // 1. Create organisation
  const { data: org } = await adminSupabase
    .from('organisations')
    .insert({ name: input.orgName, slug: input.orgSlug, plan: input.plan })
    .select().single()
  // 2. Create auth user
  const { data: authUser } = await adminSupabase.auth.admin.createUser({
    email: input.adminEmail, password: generateTempPassword(),
    email_confirm: true,
  })
  // 3. Create profile linking user to org
  await adminSupabase.from('profiles').insert({
    id: authUser.user!.id, org_id: org!.id,
    role: 'admin', full_name: 'Admin',
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
  AND c.column_name = 'org_id'
  AND t.rowsecurity = false;
-- Should return 0 rows
```

---

## 9. Gotchas

- **`ON DELETE CASCADE` on `org_id` FK is required.** Without this, orphaned rows accumulate.
- **JWT org_id is set at login time.** Changing a user's `org_id` in `profiles` requires re-login.
- **Reference tables must NOT have tenant RLS.** Tables like `countries`, `risk_zones`, `commodity_types` are shared.
- **Supabase Realtime subscriptions respect RLS.** Each client only receives events for their own `org_id`.
- **Profile Protection**: The `profiles` table prevents users from updating their own `org_id` or `role`.
- **Superadmin Access**: Use sparingly, only via `admin-dashboard`.
- **Foreign Keys**: All tenant-scoped tables need FK to `organisations(id) ON DELETE CASCADE`.
- **Tier Policy**: Subscription-based feature gating uses `modules/identity-access/domain/tier-policy.ts`.
