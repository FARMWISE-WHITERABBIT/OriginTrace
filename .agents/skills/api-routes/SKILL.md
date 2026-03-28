---
name: api-routes
description: >
  Use this skill when creating, modifying, or reviewing any Next.js API route
  handler in this project. Triggers for any mention of "new API endpoint",
  "route handler", "pages/api", "app/api", "POST handler", "GET handler",
  "API middleware", or "backend endpoint". This skill codifies the 35+ route
  handlers' consistent pattern — auth check → tenant isolation → input
  validation → business logic → sanitized error response — so all new routes
  follow the same structure. Always use this skill before writing a new API Routes Skill

# API Routes Skill

## 1. Overview

**Mission:** OriginTrace API routes follow a strict pattern: Auth → RBAC → Validation → Business Logic → Standardized Response. We use `withErrorHandling` and `ApiError` to ensure consistency and safety.

---

## 2. Standard Pattern

Always wrap your route handler with `withErrorHandling` and use `ApiError` for all non-200 responses.

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

## 3. Error Handling (`ApiError`)

- `ApiError.unauthorized()`: 401
- `ApiError.forbidden(msg)`: 403
- `ApiError.notFound(resource)`: 404
- `ApiError.validation(zodError)`: 400 with field details
- `ApiError.internal(error, context)`: 500 (logs error, hides details in prod)

---

## 4. Input Validation

Use Zod schemas for all inputs. For query params, use `parsePagination` or custom Zod schemas with `URLSearchParams`.

---

## 5. Best Practices

- **Explicit org_id**: Always include `.eq('org_id', profile.org_id)` even if RLS is enabled.
- **Contextual Logging**: Always provide a unique context string to `withErrorHandling` and `ApiError.internal` (e.g., `'shipments/POST'`).
- **Standard Roles**: Use `ROLES` constants from `lib/rbac` instead of inline arrays.

---

## 6. Gotchas

- **ReadOnly Roles**: `ROLES` constants are `readonly`. The `requireRole` helper is typed to support this.
- **Service Role**: `createAdminClient` bypasses RLS. Use it only when necessary and always manually enforce `org_id` filtering.
- **Empty Bodies**: `request.json()` throws if the body is empty. Use `safeParse` for optional bodies.
