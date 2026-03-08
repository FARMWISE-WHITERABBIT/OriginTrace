export type AppRole = 'admin' | 'aggregator' | 'agent' | 'quality_manager' | 'logistics_coordinator' | 'compliance_officer' | 'warehouse_supervisor' | 'buyer';
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
  return role !== 'buyer';
}

export function isBuyerRole(role: AppRole): boolean {
  return role === 'buyer';
}
