---
name: security
description: >
  Use this skill to ensure OriginTrace features follow "Secure by Default" 
  principles—specifically multi-tenant isolation, RBAC, tier-gating, audit 
  logging, and sanitized error handling. Trigger for "security audit", 
  "harden API", "fix RLS", "tenant isolation", "API authentication", 
  "audit logs", "sanitise errors", or "security middleware".
---

# Security Skill

## 1. Overview
OriginTrace handles sensitive agricultural and trade data. Security is built on five pillars: Multi-Tenant Isolation, Role-Based Access Control (RBAC), Subscription Tier Gating, Audit Logging, and Sanitized Error Handling.

---

## 2. Multi-Tenancy & RLS
Every table with user data must include an `org_id` column and Row-Level Security (RLS).

### Standard RLS Policy Template
```sql
ALTER TABLE my_table ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_isolation" ON my_table
  FOR ALL USING (org_id = get_user_org_id() OR is_system_admin());
```

### Application Logic
Always filter by `org_id` in application code, even if RLS is enabled, to prevent accidental leakage. Use the `getAuthenticatedProfile` helper to retrieve the tenant context.

```typescript
const { profile } = await getAuthenticatedProfile(request);
const { data } = await supabase
  .from('my_table')
  .select('*')
  .eq('org_id', profile.org_id); // Explicit filter
```

---

## 3. Role-Based Access Control (RBAC)
Never use inline role checks (e.g., `role === 'admin'`). Use the `requireRole` helper and `ROLES` constants from `@/lib/rbac`.

```typescript
import { requireRole, ROLES } from '@/lib/rbac';

const roleError = requireRole(profile, ROLES.ADMIN_AGGREGATOR);
if (roleError) return roleError; // Returns ApiError.forbidden()
```

---

## 4. Subscription Tier Gating
Protect premium features by checking the organization's subscription tier using `enforceTier` from `@/lib/api/tier-guard`.

```typescript
import { enforceTier } from '@/lib/api/tier-guard';

const tierError = await enforceTier(profile.org_id, 'shipment_readiness');
if (tierError) return tierError; // Returns ApiError.forbidden("Tier upgrade required")
```

---

## 5. Audit Logging
Record sensitive actions (mutations, exports, security setting changes) using the appropriate audit helper.

### User/Tenant Actions
```typescript
import { logAuditEvent, getClientIp } from '@/lib/audit';

await logAuditEvent({
  orgId: profile.org_id,
  actorId: profile.id,
  action: 'shipment.export_dds',
  resourceType: 'shipment',
  resourceId: shipmentId,
  ipAddress: getClientIp(request),
});
```

### Superadmin Actions
```typescript
import { logSuperadminAction } from '@/lib/superadmin-audit';

await logSuperadminAction({
  superadminId: profile.id,
  action: 'org.toggle_feature',
  targetType: 'organization',
  targetId: targetOrgId,
  request: request as any,
});
```

---

## 6. Sanitized Error Handling
Use `ApiError` from `@/lib/api/errors` to ensure error messages are informative to developers but sanitized for users.

- `ApiError.unauthorized()`: 401 (Missing/invalid auth)
- `ApiError.forbidden(msg)`: 403 (Permission/Tier issues)
- `ApiError.notFound(resource)`: 404 (Item missing)
- `ApiError.validation(zodError)`: 400 (Bad input)
- `ApiError.internal(error, context)`: 500 (Logs full error internally, returns generic message to client)

---

## 7. Best Practices
1. **Parameterized Queries**: Never concatenate strings into SQL; use the Supabase JS client or parameterized raw SQL.
2. **Secrets Management**: Never hardcode API keys. Use `process.env`.
3. **Least Privilege**: Grant the minimum role necessary to each user.
4. **Input Validation**: Use Zod schemas for all API requests.
