---
name: schema-verify
description: >
  Use this skill BEFORE writing or editing any code that reads from or writes to
  a Supabase table — every `.from('table').select/insert/update`, new query,
  RPC call, or migration that assumes a column exists. Triggers for "column",
  "select from", "insert into", ".from(", "supabase query", "does this column
  exist", "schema", "table shape", or any DB read/write. This repo's #1 bug
  family is code/live-DB schema drift (batch_id vs batch_code, phantom
  weight_kg, INTEGER-vs-UUID org ids) because the Supabase client is UNTYPED —
  wrong column names compile clean and fail as production 500s. Always verify
  the live schema before trusting a column name.
---

# Schema Verify Skill

## Why this exists

There is **no generated `Database` type** — `lib/supabase/admin.ts` calls
`createClient(url, key)` untyped, so `tsc` cannot catch a wrong column name.
Migrations are applied by hand in the Supabase SQL editor, so committed code and
the live DB drift constantly. See `docs/FRICTION-AUDIT.md` cluster C1.

## Before writing DB code — verify the column names

Pick whichever is available, in order:

1. **Generated types (best).** If `lib/supabase/database.types.ts` exists, read
   the table's `Row` type — it is authoritative. If it does not exist, generate
   it: `SUPABASE_PROJECT_ID=<ref> npm run gen:types`.
   > The OriginTrace DB has `farms`, `collection_batches`, `shipments`,
   > `profiles`. It is **not** the "FarmWise" Supabase project (a different
   > product with `beehives`/`fish_ponds`). Use the ref whose schema matches.

2. **Live introspection.** `scripts/check-db.ts` and
   `scripts/probe-constraints.ts` dump real table/column/constraint info. Or use
   the Supabase MCP `list_tables` with `verbose: true` for the target schema.

3. **Migrations as fallback.** Grep `supabase/migrations/` for the `CREATE TABLE`
   / `ALTER TABLE ... ADD COLUMN` that defines the column. Remember migrations
   may have been superseded — prefer 1 or 2.

## Known drift traps (do not repeat)

- Collection batch identifier is **`batch_code`**, not `batch_id`.
- There is **no** `weight_kg` on `processing_run_batches`.
- `organizations.id` is **INTEGER/BIGINT**, not UUID — foreign keys and RPC
  params must match (`p_org_id BIGINT`).
- `documents` link via `linked_entity_type` + `linked_entity_id`, not a bare
  `shipment_id`.

## When adding a column

Write the migration in `supabase/migrations/YYYYMMDD_<desc>.sql` (never the
legacy root `migrations/`), then **also apply it to the live DB** — code merged
before the column exists is the classic production 500. Run
`npm run check:migrations` to validate filename hygiene.
