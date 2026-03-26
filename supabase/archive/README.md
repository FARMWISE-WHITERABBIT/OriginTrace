# Archive

These files are historical snapshots of the OriginTrace schema from early development.
They are **not authoritative** and should not be applied to any environment.

## Authoritative schema sources

| Purpose | File |
|---------|------|
| Fresh install / standing up a new DB | `supabase/schema.sql` |
| Incremental changes to existing DB | `supabase/migrations/*.sql` (apply in timestamp order) |

## Files in this folder

| File | Notes |
|------|-------|
| `origintrace_complete_migration.sql` | Early monolithic migration — superseded by `schema.sql` |
| `origintrace_migration_clean.sql` | Cleaned variant of the above — also superseded |
