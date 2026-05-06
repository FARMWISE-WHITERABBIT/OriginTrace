---
name: rbac
description: >
  Use this skill when adding a new user role, gating a new page behind a
  permission, protecting a new API route with role-based access, modifying the
  navigation visibility rules, or understanding what any role can or cannot do.
  Triggers for any mention of "permission", "role", "access control", "gate a
  page", "who can see", "admin only", "field agent", "RBAC", "lib/rbac",
  "buyer portal", "farmer portal", or "requireRole". Always use this skill
  before adding any role-conditional logic to avoid inconsistent permission
  checks.
---

# RBAC Skill

## 1. Overview

A single source of truth (`lib/rbac.ts`) governs what every role can do across
navigation, page access, and API endpoints. OriginTrace uses a route-based
access model for the UI and role-set groupings for API enforcement.

---

## 2. The Roles

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

Key route mappings (see `routePermissions` in `lib/rbac.ts` for the full map):

| Route | Allowed Roles |
|-------|---------------|
| `/app/collect` | admin, aggregator, agent |
| `/app/compliance` | admin, quality_manager, compliance_officer |
| `/app/shipments` | admin, logistics_coordinator, compliance_officer |
| `/app/dds` | admin, compliance_officer |
| `/app/settings` | admin, aggregator |
| `/app/team` | admin |
| `/app/analytics` | admin, aggregator, quality_manager, compliance_officer |
| `/app/tenders` | admin, aggregator, logistics_coordinator, compliance_officer |
| `/app/buyer/*` | buyer |
| `/app/farmer/*` | farmer |

Use `hasAccess(role, pathname)` to check UI visibility.

### Helper functions
```typescript
isExporterRole(role)  // true for all roles except buyer and farmer
isBuyerRole(role)     // true only for buyer
isFarmerRole(role)    // true only for farmer
```

---

## 4. API Route Enforcement

API routes must use `requireRole` with a standard role set from `ROLES`:

```typescript
import { requireRole, ROLES } from '@/lib/rbac';

export const POST = withErrorHandling(async (request: NextRequest) => {
  const { profile } = await getAuthenticatedProfile(request);
  const roleError = requireRole(profile, ROLES.ADMIN_AGGREGATOR);
  if (roleError) return roleError;
  // ...
}, 'feature/POST');
```

---

## 5. Standard Role Sets (`ROLES`)

```typescript
export const ROLES = {
  ADMIN_ONLY:       ['admin'] as const,
  ADMIN_AGGREGATOR: ['admin', 'aggregator'] as const,
  ADMIN_COMPLIANCE: ['admin', 'compliance_officer'] as const,
  ADMIN_QUALITY:    ['admin', 'quality_manager'] as const,
  FIELD_ROLES:      ['admin', 'aggregator', 'agent'] as const,
  COMPLIANCE_ROLES: ['admin', 'quality_manager', 'compliance_officer'] as const,
  LOGISTICS_ROLES:  ['admin', 'logistics_coordinator', 'warehouse_supervisor'] as const,
  DOC_ROLES:        ['admin', 'quality_manager', 'logistics_coordinator', 'compliance_officer'] as const,
  ALL_INTERNAL:     ['admin', 'aggregator', 'agent', 'quality_manager',
                     'logistics_coordinator', 'compliance_officer',
                     'warehouse_supervisor'] as const,
} as const;
```

---

## 6. Middleware Integration

Permissions are enforced at the edge via `middleware.ts` which uses
`lib/rbac.ts` to block unauthorized navigation.

---

## 7. Gotchas

- **Never check role strings directly** (`if (role === 'admin')`). Use `requireRole(profile, ROLES.X)` for APIs and `hasAccess(role, path)` for UI.
- **Aggregators can manage teams** but cannot access subscription or webhooks settings (Admin only).
- **Service role bypass** is available for `superadmin` internal operations but should never be used in tenant-facing routes without strict validation.
- **ROLES constants are `readonly`**. The `requireRole` helper is typed to accept `readonly` arrays.
- **Buyer and Farmer portals** have their own route trees (`/app/buyer/*`, `/app/farmer/*`) isolated from internal routes.
- **Superadmin is a SystemRole**, separate from AppRole. It's defined in `lib/rbac.ts` but handled differently from org-level roles.
