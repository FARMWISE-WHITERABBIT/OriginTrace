export type AppRole = 'admin' | 'aggregator' | 'agent';
export type SystemRole = 'superadmin';
export type UserRole = AppRole | SystemRole;

export interface RoleConfig {
  allowedRoles: AppRole[];
}

const routePermissions: Record<string, AppRole[]> = {
  '/app': ['admin', 'aggregator', 'agent'],
  '/app/collect': ['admin', 'aggregator', 'agent'],
  '/app/farmers/new': ['admin', 'aggregator', 'agent'],
  '/app/farmers': ['admin', 'aggregator'],
  '/app/farms/map': ['admin', 'aggregator', 'agent'],
  '/app/farms': ['admin'],
  '/app/sync': ['admin', 'aggregator', 'agent'],
  '/app/bags': ['admin', 'aggregator'],
  '/app/compliance': ['admin'],
  '/app/traceability': ['admin', 'aggregator'],
  '/app/dds': ['admin'],
  '/app/settings': ['admin', 'aggregator'],
  '/app/team': ['admin'],
  '/app/guide': ['admin'],
  '/app/yield-alerts': ['admin', 'aggregator'],
  '/app/conflicts': ['admin'],
  '/app/delegations': ['admin'],
  '/app/data-vault': ['admin'],
  '/app/pedigree': ['admin'],
  '/app/processing': ['admin'],
  '/app/inventory': ['admin', 'aggregator'],
  '/app/verify': ['admin', 'aggregator', 'agent'],
  '/app/resolve': ['admin', 'aggregator'],
  '/app/dispatch': ['admin', 'aggregator'],
  '/app/agents': ['admin', 'aggregator'],
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
