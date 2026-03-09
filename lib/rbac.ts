export type AppRole = 'admin' | 'aggregator' | 'agent' | 'quality_manager' | 'logistics_coordinator' | 'compliance_officer' | 'warehouse_supervisor' | 'buyer' | 'farmer';
export type SystemRole = 'superadmin';
export type UserRole = AppRole | SystemRole;

export interface RoleConfig {
  allowedRoles: AppRole[];
}

export const ROLE_LABELS: Record<AppRole, string> = {
  admin: 'Admin',
  aggregator: 'Aggregator',
  agent: 'Field Agent',
  quality_manager: 'Quality Manager',
  logistics_coordinator: 'Logistics Coordinator',
  compliance_officer: 'Compliance Officer',
  warehouse_supervisor: 'Warehouse Supervisor',
  buyer: 'Buyer',
  farmer: 'Farmer',
};

export const ROLE_DESCRIPTIONS: Record<AppRole, string> = {
  admin: 'Full organizational access — settings, team, compliance, exports, analytics.',
  aggregator: 'Procurement and field operations — batches, bags, agents, farmers.',
  agent: 'Field operations — collection, farm mapping, farmer registration, sync.',
  quality_manager: 'Quality control — compliance review, yield alerts, lab results, grading.',
  logistics_coordinator: 'Shipment planning — dispatch, cold chain, inventory, documents.',
  compliance_officer: 'Regulatory compliance — DDS, pedigree, DPP, compliance profiles, farm polygons.',
  warehouse_supervisor: 'Warehouse operations — inventory, bags, receiving, dispatch.',
  buyer: 'Supply chain visibility — contracts, shipments, traceability, shared documents.',
  farmer: 'Farmer portal — own farm data, deliveries, payments, training, inputs.',
};

const routePermissions: Record<string, AppRole[]> = {
  '/app': ['admin', 'aggregator', 'agent', 'quality_manager', 'logistics_coordinator', 'compliance_officer', 'warehouse_supervisor'],
  '/app/collect': ['admin', 'aggregator', 'agent'],
  '/app/farmers/new': ['admin', 'aggregator', 'agent'],
  '/app/farmers': ['admin', 'aggregator', 'quality_manager'],
  '/app/farms/map': ['admin', 'aggregator', 'agent'],
  '/app/farms': ['admin', 'quality_manager', 'compliance_officer'],
  '/app/sync': ['admin', 'aggregator', 'agent'],
  '/app/bags': ['admin', 'aggregator', 'quality_manager', 'logistics_coordinator', 'warehouse_supervisor'],
  '/app/compliance': ['admin', 'quality_manager', 'compliance_officer'],
  '/app/traceability': ['admin', 'aggregator', 'quality_manager', 'compliance_officer'],
  '/app/dds': ['admin', 'compliance_officer'],
  '/app/settings': ['admin', 'aggregator'],
  '/app/team': ['admin'],
  '/app/guide': ['admin'],
  '/app/yield-alerts': ['admin', 'aggregator', 'quality_manager'],
  '/app/conflicts': ['admin', 'compliance_officer'],
  '/app/delegations': ['admin'],
  '/app/data-vault': ['admin'],
  '/app/pedigree': ['admin', 'compliance_officer'],
  '/app/processing': ['admin', 'compliance_officer'],
  '/app/inventory': ['admin', 'aggregator', 'logistics_coordinator', 'warehouse_supervisor'],
  '/app/verify': ['admin', 'aggregator', 'agent', 'quality_manager', 'warehouse_supervisor'],
  '/app/resolve': ['admin', 'aggregator'],
  '/app/dispatch': ['admin', 'aggregator', 'logistics_coordinator', 'warehouse_supervisor'],
  '/app/agents': ['admin', 'aggregator'],
  '/app/shipments': ['admin', 'logistics_coordinator', 'compliance_officer'],
  '/app/documents': ['admin', 'quality_manager', 'logistics_coordinator', 'compliance_officer', 'warehouse_supervisor'],
  '/app/payments': ['admin', 'aggregator'],
  '/app/compliance-profiles': ['admin', 'compliance_officer'],
  '/app/dpp': ['admin', 'compliance_officer'],
  '/app/analytics': ['admin', 'aggregator', 'quality_manager', 'compliance_officer'],
  '/app/analytics/reports': ['admin', 'compliance_officer'],
  '/app/contracts': ['admin'],
  '/app/buyers': ['admin'],
  '/app/api-keys': ['admin'],
  '/app/buyer': ['buyer'],
  '/app/buyer/contracts': ['buyer'],
  '/app/buyer/shipments': ['buyer'],
  '/app/buyer/traceability': ['buyer'],
  '/app/buyer/documents': ['buyer'],
  '/app/buyer/suppliers': ['buyer'],
  '/app/buyer/tenders': ['buyer'],
  '/app/tenders': ['admin', 'aggregator', 'logistics_coordinator', 'compliance_officer'],
  '/app/audit': ['admin', 'compliance_officer'],
  '/app/farmer': ['farmer'],
  '/app/farmer/deliveries': ['farmer'],
  '/app/farmer/payments': ['farmer'],
  '/app/farmer/training': ['farmer'],
  '/app/farmer/inputs': ['farmer'],
  '/app/farmer/profile': ['farmer'],
};

export function hasAccess(role: AppRole, pathname: string): boolean {
  const match = Object.keys(routePermissions)
    .sort((a, b) => b.length - a.length)
    .find(route => pathname === route || pathname.startsWith(route + '/'));

  if (!match) return false;
  return routePermissions[match].includes(role);
}

export function getAllowedRoles(pathname: string): AppRole[] {
  const match = Object.keys(routePermissions)
    .sort((a, b) => b.length - a.length)
    .find(route => pathname === route || pathname.startsWith(route + '/'));

  return match ? routePermissions[match] : [];
}

export function isExporterRole(role: AppRole): boolean {
  return role !== 'buyer' && role !== 'farmer';
}

export function isFarmerRole(role: AppRole): boolean {
  return role === 'farmer';
}

export function isBuyerRole(role: AppRole): boolean {
  return role === 'buyer';
}

// ---------------------------------------------------------------------------
// API route role enforcement helper
// Use instead of inline role string comparisons in API routes:
//   const roleError = requireRole(profile, ROLES.ADMIN_AGGREGATOR);
//   if (roleError) return roleError;
// ---------------------------------------------------------------------------
import { NextResponse } from 'next/server';

export interface ProfileWithRole {
  role: AppRole | SystemRole | string;
  org_id?: string | null;
}

/**
 * Returns a 403 NextResponse if profile.role is not in allowedRoles, otherwise null.
 */
export function requireRole(
  profile: ProfileWithRole | null | undefined,
  allowedRoles: (AppRole | SystemRole)[]
): NextResponse | null {
  if (!profile) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (!allowedRoles.includes(profile.role as AppRole | SystemRole)) {
    return NextResponse.json(
      { error: 'Forbidden', required: allowedRoles },
      { status: 403 }
    );
  }
  return null;
}

/**
 * Convenience role sets for common groupings used across API routes.
 */
export const ROLES = {
  ADMIN_ONLY:       ['admin'] as const,
  ADMIN_AGGREGATOR: ['admin', 'aggregator'] as const,
  ADMIN_COMPLIANCE: ['admin', 'compliance_officer'] as const,
  ADMIN_QUALITY:    ['admin', 'quality_manager'] as const,
  FIELD_ROLES:      ['admin', 'aggregator', 'agent'] as const,
  COMPLIANCE_ROLES: ['admin', 'quality_manager', 'compliance_officer'] as const,
  LOGISTICS_ROLES:  ['admin', 'logistics_coordinator', 'warehouse_supervisor'] as const,
  DOC_ROLES:        ['admin', 'quality_manager', 'logistics_coordinator', 'compliance_officer'] as const,
  ALL_INTERNAL:     ['admin', 'aggregator', 'agent', 'quality_manager', 'logistics_coordinator',
                     'compliance_officer', 'warehouse_supervisor'] as const,
} as const;
