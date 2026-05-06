---
name: supabase-migrations
description: >
  Use this skill whenever working with the Supabase database schema, creating
  new migrations, applying SQL changes, writing or modifying RLS policies, or
  keeping schema.sql in sync with the migrations/ folder. Triggers for any
  mention of "add a column", "new table", "migration file", "RLS policy",
  "schema change", "database update", or "Supabase SQL". Always use this skill
  before writing any SQL that touches the database structure.
---

# Supabase Migrations Skill

## 1. Overview

Every database schema change goes through a timestamped SQL migration file
applied via the Supabase CLI and then reflected in `supabase/schema.sql`.
No ad-hoc schema edits via the dashboard — all changes must be reproducible
from migration history.

---

## 2. Project Structure

```
supabase/
├── schema.sql                              ← Canonical full-schema snapshot
├── migrations/
│   ├── 20240101_000000_init.sql
│   ├── 20240215_143022_add_shipment_status.sql
│   └── YYYYMMDD_HHMMSS_<description>.sql  ← naming convention
├── rls-policies.sql                        ← RLS policy reference
├── seed-locations.sql                      ← Location reference data
└── seeds/                                  ← Seed data files
```

---

## 3. Creating a New Migration

### Step 1 — Generate the file
```bash
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
touch supabase/migrations/${TIMESTAMP}_your_description.sql
```

### Step 2 — Write the SQL
```sql
-- Always wrap in a transaction
BEGIN;

ALTER TABLE pedigree_certificates
  ADD COLUMN expiry_date DATE,
  ADD COLUMN issued_by   TEXT NOT NULL DEFAULT '';

CREATE INDEX IF NOT EXISTS idx_certs_expiry
  ON pedigree_certificates (expiry_date)
  WHERE expiry_date IS NOT NULL;

COMMIT;
```

### Step 3 — Apply locally
```bash
supabase link --project-ref LOCAL_PROJECT_REF
supabase db push --linked
```

### Step 4 — Regenerate schema snapshot
```bash
supabase db dump > supabase/schema.sql
```

---

## 4. Best Practices

- **Idempotency**: Use `CREATE TABLE IF NOT EXISTS` and `DO $$ BEGIN ... END $$`
  blocks to ensure scripts can be run safely multiple times.
- **Search Path**: Include `SET search_path = public, extensions;` at the top of
  functions or complex migrations to ensure PostGIS and other extensions resolve.
- **Naming Convention**:
  - Tables: plural, lowercase (`farms`, `batches`)
  - Columns: snake_case (`org_id`, `created_at`)
  - Functions: descriptive snake_case (`get_user_org_id`)

---

## 5. Core Extensions

OriginTrace relies on:
- `uuid-ossp`: For primary keys
- `postgis`: For geographic data and spatial analysis
- `pg_net` (optional): For outgoing webhooks

---

## 6. RLS Policy Patterns

Every tenant-scoped table must have RLS enabled with `org_id` isolation:

```sql
ALTER TABLE your_table ENABLE ROW LEVEL SECURITY;

-- Standard tenant isolation (uses helper functions from schema)
CREATE POLICY "tenant_isolation" ON your_table
  FOR SELECT USING (org_id = get_user_org_id() OR is_system_admin());

CREATE POLICY "tenant_insert" ON your_table
  FOR INSERT WITH CHECK (org_id = get_user_org_id());

-- Superadmin bypass — always pair with tenant policy
CREATE POLICY "superadmin_bypass" ON your_table
  FOR ALL USING (is_system_admin());
```

---

## 7. New Table Template

```sql
CREATE TABLE IF NOT EXISTS farm_audits (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id     UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  farm_id    UUID NOT NULL REFERENCES farms(id) ON DELETE CASCADE,
  auditor    TEXT NOT NULL,
  audit_date DATE NOT NULL,
  result     TEXT CHECK (result IN ('pass','fail','pending')),
  notes      TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE farm_audits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_isolation" ON farm_audits
  FOR ALL USING (org_id = get_user_org_id() OR is_system_admin());

CREATE INDEX idx_farm_audits_org  ON farm_audits(org_id);
CREATE INDEX idx_farm_audits_farm ON farm_audits(farm_id);
```

### Auto-update `updated_at` trigger
```sql
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON farm_audits
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
```

---

## 8. Pre-Commit Checklist

- [ ] File named `YYYYMMDD_HHMMSS_description.sql`
- [ ] Wrapped in `BEGIN; ... COMMIT;`
- [ ] `IF NOT EXISTS` guards on all CREATE statements
- [ ] RLS enabled + policies added for every new table
- [ ] `schema.sql` regenerated via `supabase db dump`
- [ ] Migration tested on local dev environment
- [ ] No credentials or sensitive data in SQL comments

---

## 9. Gotchas

- **Never edit the Supabase dashboard schema directly in prod** without a matching migration file.
- **`schema.sql` is a snapshot, not a runnable script.** Only `migrations/` files are applied incrementally.
- **Column renames break existing code silently.** Add new column → migrate data → drop old in a later migration.
- **Service-key API routes bypass RLS.** Verify this is intentional for any route using `createAdminClient()`.
- **RLS by Default**: Every new table must enable RLS with policies in the same migration file.
- **Function Permissions**: Functions in RLS policies must use `SECURITY DEFINER` with a restricted `search_path`.
- **Type Compatibility**: Check `schema.sql` before assuming UUID for legacy tables — some use INTEGER.
