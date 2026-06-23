---
name: api-routes
description: >
  Use this skill when creating, modifying, or reviewing any Next.js API route
  handler in this project. Triggers for any mention of "new API endpoint",
  "route handler", "app/api", "POST handler", "GET handler", "API middleware",
  "backend endpoint", "tier guard", "API key", "rate limit", or "withErrorHandling".
  This skill codifies the 75+ route handlers' consistent pattern — auth check →
  tenant isolation → input validation → business logic → sanitized error
  response — so all new routes follow the same structure. Always use this skill
  before writing a new API route.
---

# API Routes Skill

## 1. Overview

OriginTrace API routes follow a strict pattern: Auth → RBAC → Validation →
Business Logic → Standardized Response. We use `withErrorHandling` and
`ApiError` for consistency and safety.

---

## 2. Standard Pattern

Always wrap your route handler with `withErrorHandling` and use `ApiError`
for all non-200 responses.

```typescript
import { createAdminClient } from '@/lib/supabase/admin';
import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedProfile } from '@/lib/api-auth';
import { requireRole, ROLES } from '@/lib/rbac';
import { ApiError, withErrorHandling } from '@/lib/api/errors';

export const GET = withErrorHandling(async (request: NextRequest) => {
  // 1. Auth & Profile
  const { user, profile } = await getAuthenticatedProfile(request);
  if (!user) return ApiError.unauthorized();
  if (!profile) return ApiError.notFound('Profile');

  // 2. RBAC
  const roleError = requireRole(profile, ROLES.ADMIN_AGGREGATOR);
  if (roleError) return roleError;

  // 3. Multi-Tenancy (always filter by org_id)
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('my_table')
    .select('*')
    .eq('org_id', profile.org_id);

  if (error) return ApiError.internal(error, 'my_feature/GET');

  return NextResponse.json(data);
}, 'my_feature/GET');
```

---

## 3. Error Handling (`lib/api/errors.ts`)

- `ApiError.unauthorized()`: 401
- `ApiError.forbidden(msg)`: 403
- `ApiError.notFound(resource)`: 404
- `ApiError.validation(zodError)`: 400 with field details
- `ApiError.internal(error, context)`: 500 (logs error, hides details in prod)

---

## 4. Input Validation (`lib/api/validation.ts`)

Use Zod schemas for all inputs. For query params, use `parsePagination` or
custom Zod schemas with `URLSearchParams`.

---

## 5. Tier Gating (`lib/api/tier-guard.ts`)

For subscription-gated features, use `enforceTier()`:

```typescript
import { enforceTier } from '@/lib/api/tier-guard';

export const GET = withErrorHandling(async (request: NextRequest) => {
  const { profile } = await getAuthenticatedProfile(request);
  // Check if org has access to this feature
  const tierError = await enforceTier(profile.org_id, 'shipment_readiness');
  if (tierError) return tierError;
  // ...
}, 'feature/GET');
```

---

## 6. API Key Authentication (`lib/api-auth.ts`)

For the versioned external API (`app/api/v1/`), use API key validation:

```typescript
import { validateApiKey } from '@/lib/api-auth';

export const GET = withErrorHandling(async (request: NextRequest) => {
  const auth = await validateApiKey(request);
  if (!auth.valid) return ApiError.unauthorized();

  const supabase = createAdminClient();
  const { data } = await supabase
    .from('my_table').select('*')
    .eq('org_id', auth.orgId);
  // ...
}, 'v1/feature/GET');
```

---

## 7. Rate Limiting (`lib/api/rate-limit.ts`)

```typescript
import { checkRateLimit } from '@/lib/api/rate-limit';

// Atomic, Supabase-backed rate limiting
const limited = await checkRateLimit(request, auth.orgId, {
  max: auth.rateLimitPerHour ?? 1000,
  windowSecs: 3600,
  keyPrefix: `apk:${auth.keyPrefix}`,
});
if (limited) return limited;
```

---

## 8. Best Practices

- **Explicit org_id**: Always include `.eq('org_id', profile.org_id)` even with RLS.
- **Contextual Logging**: Provide a unique context string to `withErrorHandling` and `ApiError.internal` (e.g., `'shipments/POST'`).
- **Standard Roles**: Use `ROLES` constants from `lib/rbac` instead of inline arrays.
- **File uploads**: Use `lib/api/file-validation.ts` for upload validation.

---

## 9. Gotchas

- **ReadOnly Roles**: `ROLES` constants are `readonly`. `requireRole` is typed to support this.
- **Service Role**: `createAdminClient()` bypasses RLS. Use only when necessary and always manually enforce `org_id`.
- **Empty Bodies**: `request.json()` throws if body is empty. Use `safeParse` for optional bodies.
- **Deprecated patterns**: `checkTierAccess()` in `lib/api-auth.ts` is deprecated — use `enforceTier()` from `lib/api/tier-guard.ts`.
- **Deprecated rate limit**: The `checkRateLimit` in `lib/api-auth.ts` is deprecated — use the async version from `lib/api/rate-limit.ts`.
