# ADR-005: Environment Variable Validation — Fail-Fast at Startup

**Status:** Accepted  
**Date:** 2026-04-10  
**Author:** Engineering  
**Deciders:** Engineering Lead

---

## Context

40+ places across `lib/` and `app/api/` access `process.env` directly (e.g. `process.env.SUPABASE_SERVICE_ROLE_KEY`). This creates several problems:

1. **Silent misconfiguration** — a missing env var is only discovered when the code path runs, not at startup.
2. **No type safety** — `process.env.X` is `string | undefined` everywhere; callers either ignore this or add their own non-DRY undefined checks.
3. **No canonical list** — developers don't know which vars are required vs. optional without reading every file.

`lib/env.ts` already implements a Zod schema with fail-fast behaviour in production. The problem is that it exists but is not consistently imported — most code still reaches for `process.env` directly.

---

## Decision

### Rule: Never access `process.env` directly

All environment variable access **must** go through `lib/env.ts`:

```typescript
// ✅ Correct
import { env } from '@/lib/env';
const url = env.NEXT_PUBLIC_SUPABASE_URL;

// ❌ Forbidden
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
```

**Exception:** `lib/env.ts` itself (the schema definition and validation call), and Next.js config files (`next.config.mjs`, `sentry.*.ts`) which run before module resolution.

### Fail-fast contract

`lib/env.ts` calls `validateEnv()` at module load time:
- **Production:** throws immediately if any required variable is missing or fails its Zod validator.
- **Development / test:** logs a warning but continues, returning `process.env as Env` for local setup flexibility.

This means bad deployments are caught at cold-start, not mid-request.

### Schema ownership

The schema in `lib/env.ts` is the **only** source of truth for which env vars exist. Adding a new env var requires:
1. Adding it to the Zod schema (required or optional).
2. Documenting it in `.env.example`.

### Enforcement

ESLint rule (`no-restricted-globals` or custom plugin) flags direct `process.env` access outside `lib/env.ts` and `*.config.*` files. The rule is added to `eslint.config.mjs`.

---

## Consequences

- Deployment misconfiguration is caught at startup, not in production mid-request.
- TypeScript callers get typed env vars (no `| undefined` noise where var is required).
- Adding a new env var has one place to update.
- Existing code must be migrated to import from `lib/env`. Migration is low-risk and purely mechanical.
