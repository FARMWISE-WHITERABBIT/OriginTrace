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

Every database schema change goes through a timestamped SQL migration file applied via the Supabase CLI and then reflected in `supabase/schema.sql`. No ad-hoc schema edits via the dashboard — all changes must be reproducible from migration history.

---

## 2. Project Structure

```
supabase/
├── schema.sql                              ← Canonical full-schema snapshot (keep in sync)
├── migrations/
│   ├── 20240101_000000_init.sql
│   ├── 20240215_143022_add_shipment_status.sql
│   └── YYYYMMDD_HHMMSS_<description>.sql  ← naming convention
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
**Mission:** Database schema changes are managed via SQL migration files located in the `migrations/` directory. `supabase/schema.sql` serves as the consolidated source of truth representing the current state of the database.

---

## 2. Workflow

1. **Incremental Changes**: Create a new `.sql` file in `migrations/` prefixed with the date (e.g., `20260311_add_new_table.sql`).
2. **Local Testing**: Run the SQL in your local Supabase instance or the Supabase SQL Editor.
3. **Consolidation**: After a successful migration, update `supabase/schema.sql` to reflect the new state. This allows for clean environment resets using `npm run seed:demo:wipe && npm run seed:demo`.

---

## 3. Best Practices

- **Idempotency**: Use `CREATE TABLE IF NOT EXISTS` and `DO $$ BEGIN ... END $$` blocks for adding columns or constraints to ensure scripts can be run multiple times safely.
- **Search Path**: Always include `SET search_path = public, extensions;` at the top of functions or complex migrations to ensure PostGIS and other extensions are resolvable.
- **Naming Convention**:
  - Tables: plural, lowercase (`farms`, `batches`).
  - Columns: snake_case (`org_id`, `created_at`).
  - Functions: descriptive snake_case (`get_user_org_id`).

---

## 4. Core Extensions

OriginTrace relies on:
- `uuid-ossp`: For primary keys.
- `postgis`: For geographic data and spatial analysis.
- `pg_net` (optional): For outgoing webhooks.

---

## 5. Gotchas

- **RLS by Default**: Every new table **must** enable RLS and have policies defined in the same migration file.
- **Function Permissions**: Functions used in RLS policies must be defined with `SECURITY DEFINER` and a restricted `search_path` to prevent privilege escalation.
- **Type Compatibility**: The live database might use adapted types (e.g., `INTEGER` for some IDs); always check `schema.sql` before assuming `UUID` for legacy tables.

---

## 6. RLS Policy Patterns

Every tenant-scoped table must have RLS enabled with `org_id` isolation.

```sql
ALTER TABLE your_table ENABLE ROW LEVEL SECURITY;

-- Standard tenant isolation
CREATE POLICY "tenant_isolation" ON your_table
  FOR ALL
  USING (org_id = auth.jwt() ->> 'org_id')
  WITH CHECK (org_id = auth.jwt() ->> 'org_id');

-- Superadmin bypass — always pair with tenant policy
CREATE POLICY "superadmin_bypass" ON your_table
  FOR ALL
  USING (auth.jwt() ->> 'role' = 'superadmin');
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
  FOR ALL USING (org_id = auth.jwt() ->> 'org_id')
  WITH CHECK (org_id = auth.jwt() ->> 'org_id');

CREATE POLICY "superadmin_bypass" ON farm_audits
  FOR ALL USING (auth.jwt() ->> 'role' = 'superadmin');

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

## 6. Pre-Commit Checklist

- [ ] File named `YYYYMMDD_HHMMSS_description.sql`
- [ ] Wrapped in `BEGIN; ... COMMIT;`
- [ ] `IF NOT EXISTS` guards on all CREATE statements
- [ ] RLS enabled + policies added for every new table
- [ ] `schema.sql` regenerated via `supabase db dump`
- [ ] Migration tested on local dev environment
- [ ] No credentials or sensitive data in SQL comments

---

## 7. Gotchas

- **Never edit the Supabase dashboard schema directly in prod** without a matching migration file.
- **`schema.sql` is a snapshot, not a runnable script.** Only `migrations/` files are applied incrementally.
- **Column renames break existing code silently.** Add new column → migrate data → drop old in a later migration.
- **Service-key API routes bypass RLS.** Verify this is intentional for any route using the Supabase service role key.
