---
name: rbac
description: >
  Use this skill when adding a new user role, gating a new page behind a
  permission, protecting a new API route with role-based access, modifying the
  navigation visibility rules, or understanding what any role can or cannot do.
  Triggers for any mention of "permission", "role", "access control", "gate a
  page", "who can see", "admin only", "field agent", "RBAC", or "lib/rbac".
  Always use this skill before adding any role-conditional logic to avoid
  inconsistent permission checks.
---

# RBAC Skill

## 1. Overview

**Mission:** A single source of truth (`lib/rbac.ts`) governs what every role can do across navigation, page access, and API endpoints. OriginTrace uses a route-based access model for the UI and role-set groupings for API enforcement.

---

## 2. The Ten Roles

| Role | Category | Description |
|------|----------|-------------|
| `superadmin` | System | Platform command tower. Bypasses tenant boundaries. |
| `admin` | Internal | Full org access: settings, team, compliance, exports. |
| `aggregator` | Internal | Field operations lead: batches, bags, agents, farmers. |
| `agent` | Internal | Field worker: collection, mapping, registration, sync. |
| `quality_manager` | Internal | QC: compliance review, yield alerts, lab results. |
| `logistics_coordinator` | Internal | Supply chain: shipment planning, cold chain, docs. |
| `compliance_officer` | Internal | Regulatory: DDS, pedigree, DPP, farm polygons. |
| `warehouse_supervisor` | Internal | Ops: inventory, bags, receiving, dispatch. |
| `buyer` | External | Transparency: contracts, shipments, traceability. |
| `farmer` | External | Self-service: farm data, deliveries, payments. |

---

## 3. UI Route Permissions (`lib/rbac.ts`)

Navigation and page access are mapped to roles in `routePermissions`.

- **/app/collect**: `['admin', 'aggregator', 'agent']`
- **/app/compliance**: `['admin', 'quality_manager', 'compliance_officer']`
- **/app/shipments**: `['admin', 'logistics_coordinator', 'compliance_officer']`
- **/app/dds**: `['admin', 'compliance_officer']`
- **/app/settings**: `['admin', 'aggregator']`

Use `hasAccess(role, pathname)` to check UI visibility.

---

## 4. API Route Enforcement

API routes must use `requireRole` with a standard role set from `ROLES`.

```typescript
import { requireRole, ROLES } from '@/lib/rbac';

export async function POST(request: NextRequest) {
  const { profile } = await getAuthenticatedProfile(request);
  
  // Enforce role
  const roleError = requireRole(profile, ROLES.ADMIN_AGGREGATOR);
  if (roleError) return roleError;
  
  // Logic...
}
```

### Standard Role Sets (`ROLES`)
- `ADMIN_ONLY`: `['admin']`
- `ADMIN_AGGREGATOR`: `['admin', 'aggregator']`
- `FIELD_ROLES`: `['admin', 'aggregator', 'agent']`
- `COMPLIANCE_ROLES`: `['admin', 'quality_manager', 'compliance_officer']`
- `LOGISTICS_ROLES`: `['admin', 'logistics_coordinator', 'warehouse_supervisor']`
- `ALL_INTERNAL`: Everything except `buyer` and `farmer`.

---

## 5. Middleware Integration

Permissions are enforced at the edge via `middleware.ts` which uses `lib/rbac.ts` to block unauthorized navigation.

---

## 6. Gotchas

- **Never check role strings directly** (`if (role === 'admin')`). Use `requireRole(profile, ROLES.X)` for APIs and `hasAccess(role, path)` for UI.
- **Aggregators can manage teams** but cannot access subscription or webhooks settings (Admin only).
- **Service role bypass** is available for `superadmin` internal operations but should never be used in tenant-facing `app/api/` routes without strict validation.
