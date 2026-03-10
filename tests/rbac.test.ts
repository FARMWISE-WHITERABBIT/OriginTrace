/**
 * RBAC Test Suite
 * Tests hasAccess, requireRole, getAllowedRoles, and role helper functions.
 * These are pure functions — no mocking needed.
 */

import { describe, it, expect } from 'vitest';
import {
  hasAccess,
  requireRole,
  getAllowedRoles,
  isExporterRole,
  isFarmerRole,
  isBuyerRole,
  ROLES,
  ROLE_LABELS,
  type AppRole,
} from '@/lib/rbac';

// ---------------------------------------------------------------------------
// hasAccess — core route permission checks
// ---------------------------------------------------------------------------

describe('hasAccess — admin has full internal access', () => {
  const sensitiveRoutes = [
    '/app/dds',
    '/app/team',
    '/app/compliance',
    '/app/pedigree',
    '/app/data-vault',
    '/app/delegations',
    '/app/analytics',
    '/app/contracts',
    '/app/buyers',
    '/app/api-keys',
    '/app/settings/subscription',
    '/app/audit',
  ];

  sensitiveRoutes.forEach(route => {
    it(`allows admin on ${route}`, () => {
      expect(hasAccess('admin', route)).toBe(true);
    });
  });
});

describe('hasAccess — farmer is isolated to /app/farmer/*', () => {
  it('allows farmer on /app/farmer', () => {
    expect(hasAccess('farmer', '/app/farmer')).toBe(true);
  });

  it('allows farmer on /app/farmer/deliveries', () => {
    expect(hasAccess('farmer', '/app/farmer/deliveries')).toBe(true);
  });

  it('allows farmer on /app/farmer/payments', () => {
    expect(hasAccess('farmer', '/app/farmer/payments')).toBe(true);
  });

  it('allows farmer on /app/farmer/training', () => {
    expect(hasAccess('farmer', '/app/farmer/training')).toBe(true);
  });

  it('allows farmer on /app/farmer/inputs', () => {
    expect(hasAccess('farmer', '/app/farmer/inputs')).toBe(true);
  });

  it('allows farmer on /app/farmer/profile', () => {
    expect(hasAccess('farmer', '/app/farmer/profile')).toBe(true);
  });

  const blockedFromFarmer = [
    '/app',
    '/app/compliance',
    '/app/dds',
    '/app/pedigree',
    '/app/analytics',
    '/app/bags',
    '/app/farms',
    '/app/batches',
    '/app/team',
    '/app/settings',
    '/app/traceability',
    '/app/shipments',
  ];

  blockedFromFarmer.forEach(route => {
    it(`blocks farmer from ${route}`, () => {
      expect(hasAccess('farmer', route)).toBe(false);
    });
  });
});

describe('hasAccess — buyer is isolated to /app/buyer/*', () => {
  it('allows buyer on /app/buyer', () => {
    expect(hasAccess('buyer', '/app/buyer')).toBe(true);
  });

  it('allows buyer on /app/buyer/contracts', () => {
    expect(hasAccess('buyer', '/app/buyer/contracts')).toBe(true);
  });

  it('allows buyer on /app/buyer/shipments', () => {
    expect(hasAccess('buyer', '/app/buyer/shipments')).toBe(true);
  });

  it('allows buyer on /app/buyer/traceability', () => {
    expect(hasAccess('buyer', '/app/buyer/traceability')).toBe(true);
  });

  const blockedFromBuyer = [
    '/app',
    '/app/farmers',
    '/app/bags',
    '/app/dds',
    '/app/pedigree',
    '/app/team',
    '/app/settings',
    '/app/compliance',
    '/app/analytics',
  ];

  blockedFromBuyer.forEach(route => {
    it(`blocks buyer from ${route}`, () => {
      expect(hasAccess('buyer', route)).toBe(false);
    });
  });
});

describe('hasAccess — compliance_officer access', () => {
  const allowed = [
    '/app/dds',
    '/app/pedigree',
    '/app/compliance',
    '/app/compliance-profiles',
    '/app/dpp',
    '/app/audit',
    '/app/conflicts',
    '/app/processing',
    '/app/shipments',
    '/app/traceability',
  ];

  allowed.forEach(route => {
    it(`allows compliance_officer on ${route}`, () => {
      expect(hasAccess('compliance_officer', route)).toBe(true);
    });
  });

  const blocked = [
    '/app/team',
    '/app/agents',
    '/app/payments',
    '/app/settings',
    '/app/data-vault',
    '/app/delegations',
    '/app/contracts',
  ];

  blocked.forEach(route => {
    it(`blocks compliance_officer from ${route}`, () => {
      expect(hasAccess('compliance_officer', route)).toBe(false);
    });
  });
});

describe('hasAccess — agent is limited to field operations', () => {
  const allowed = [
    '/app/collect',
    '/app/farmers/new',
    '/app/farms/map',
    '/app/sync',
    '/app/verify',
  ];

  allowed.forEach(route => {
    it(`allows agent on ${route}`, () => {
      expect(hasAccess('agent', route)).toBe(true);
    });
  });

  const blocked = [
    '/app/compliance',
    '/app/dds',
    '/app/pedigree',
    '/app/analytics',
    '/app/team',
    '/app/settings',
    '/app/shipments',
    '/app/payments',
  ];

  blocked.forEach(route => {
    it(`blocks agent from ${route}`, () => {
      expect(hasAccess('agent', route)).toBe(false);
    });
  });
});

describe('hasAccess — route matching behaviour', () => {
  it('matches exact route', () => {
    expect(hasAccess('admin', '/app/dds')).toBe(true);
  });

  it('matches sub-route via prefix', () => {
    // /app/dds is in permissions, /app/dds/generate should inherit
    expect(hasAccess('admin', '/app/dds/generate')).toBe(true);
  });

  it('blocks role on sub-route when parent is blocked', () => {
    // agent cannot access /app/dds, so /app/dds/anything should also be blocked
    expect(hasAccess('agent', '/app/dds/generate')).toBe(false);
  });

  it('more specific route takes precedence over parent', () => {
    // /app/analytics/reports is admin + compliance_officer only
    // /app/analytics is admin + aggregator + quality_manager + compliance_officer
    // aggregator can access /app/analytics but NOT /app/analytics/reports
    expect(hasAccess('aggregator', '/app/analytics')).toBe(true);
    expect(hasAccess('aggregator', '/app/analytics/reports')).toBe(false);
  });

  it('settings/subscription is admin-only even though settings allows admin+aggregator', () => {
    expect(hasAccess('admin', '/app/settings/subscription')).toBe(true);
    expect(hasAccess('aggregator', '/app/settings/subscription')).toBe(false);
  });

  it('unlisted routes pass through (tier gating handles them)', () => {
    expect(hasAccess('admin', '/app/some/brand/new/route')).toBe(true);
    expect(hasAccess('agent', '/app/some/brand/new/route')).toBe(true);
  });
});

describe('hasAccess — shipments/new specificity', () => {
  it('logistics_coordinator can create new shipment', () => {
    expect(hasAccess('logistics_coordinator', '/app/shipments/new')).toBe(true);
  });

  it('aggregator cannot create new shipment', () => {
    expect(hasAccess('aggregator', '/app/shipments/new')).toBe(false);
  });

  it('warehouse_supervisor cannot access shipments at all', () => {
    expect(hasAccess('warehouse_supervisor', '/app/shipments')).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// requireRole
// ---------------------------------------------------------------------------

describe('requireRole', () => {
  it('returns null when role is in allowed list', () => {
    const profile = { role: 'admin' as AppRole };
    expect(requireRole(profile, ['admin', 'compliance_officer'])).toBeNull();
  });

  it('returns 403 when role is not in allowed list', async () => {
    const profile = { role: 'agent' as AppRole };
    const response = requireRole(profile, ['admin', 'compliance_officer']);
    expect(response).not.toBeNull();
    expect(response!.status).toBe(403);
    const body = await response!.json();
    expect(body.error).toBe('Forbidden');
    expect(body.required).toContain('admin');
  });

  it('returns 401 when profile is null', async () => {
    const response = requireRole(null, ['admin']);
    expect(response).not.toBeNull();
    expect(response!.status).toBe(401);
    const body = await response!.json();
    expect(body.error).toBe('Unauthorized');
  });

  it('returns 401 when profile is undefined', async () => {
    const response = requireRole(undefined, ['admin']);
    expect(response).not.toBeNull();
    expect(response!.status).toBe(401);
  });

  it('works with superadmin role', () => {
    const profile = { role: 'superadmin' as const };
    expect(requireRole(profile, ['superadmin'])).toBeNull();
  });

  it('ROLES constants work with requireRole', () => {
    const adminProfile = { role: 'admin' as AppRole };
    const agentProfile = { role: 'agent' as AppRole };

    expect(requireRole(adminProfile, [...ROLES.ADMIN_COMPLIANCE])).toBeNull();
    expect(requireRole(agentProfile, [...ROLES.ADMIN_COMPLIANCE])).not.toBeNull();
  });
});

// ---------------------------------------------------------------------------
// getAllowedRoles
// ---------------------------------------------------------------------------

describe('getAllowedRoles', () => {
  it('returns correct roles for /app/dds', () => {
    const roles = getAllowedRoles('/app/dds');
    expect(roles).toContain('admin');
    expect(roles).toContain('compliance_officer');
    expect(roles).not.toContain('agent');
    expect(roles).not.toContain('farmer');
    expect(roles).not.toContain('buyer');
  });

  it('returns /app roles for unlisted sub-routes (prefix match on /app)', () => {
    // /app is registered and is a prefix of any /app/... route, so
    // getAllowedRoles returns the /app role set — not []. The specificity
    // guarantee is that longer registered routes (e.g. /app/dds) always win
    // over /app via the longest-match sort.
    const roles = getAllowedRoles('/app/some/unknown/route');
    expect(roles).toContain('admin');
    expect(roles).not.toContain('farmer');
    expect(roles).not.toContain('buyer');
  });

  it('returns empty array for a path with no registered prefix', () => {
    expect(getAllowedRoles('/completely/unknown/path')).toEqual([]);
  });

  it('returns correct roles for /app/team (admin only)', () => {
    const roles = getAllowedRoles('/app/team');
    expect(roles).toEqual(['admin']);
  });
});

// ---------------------------------------------------------------------------
// Role helper functions
// ---------------------------------------------------------------------------

describe('isExporterRole', () => {
  const exporterRoles: AppRole[] = [
    'admin', 'aggregator', 'agent', 'quality_manager',
    'logistics_coordinator', 'compliance_officer', 'warehouse_supervisor',
  ];

  exporterRoles.forEach(role => {
    it(`returns true for ${role}`, () => {
      expect(isExporterRole(role)).toBe(true);
    });
  });

  it('returns false for buyer', () => {
    expect(isExporterRole('buyer')).toBe(false);
  });

  it('returns false for farmer', () => {
    expect(isExporterRole('farmer')).toBe(false);
  });
});

describe('isFarmerRole', () => {
  it('returns true for farmer', () => {
    expect(isFarmerRole('farmer')).toBe(true);
  });

  const nonFarmerRoles: AppRole[] = ['admin', 'aggregator', 'agent', 'buyer', 'compliance_officer'];
  nonFarmerRoles.forEach(role => {
    it(`returns false for ${role}`, () => {
      expect(isFarmerRole(role)).toBe(false);
    });
  });
});

describe('isBuyerRole', () => {
  it('returns true for buyer', () => {
    expect(isBuyerRole('buyer')).toBe(true);
  });

  const nonBuyerRoles: AppRole[] = ['admin', 'aggregator', 'agent', 'farmer', 'compliance_officer'];
  nonBuyerRoles.forEach(role => {
    it(`returns false for ${role}`, () => {
      expect(isBuyerRole(role)).toBe(false);
    });
  });
});

// ---------------------------------------------------------------------------
// ROLES constants completeness
// ---------------------------------------------------------------------------

describe('ROLES constants', () => {
  it('ALL_INTERNAL contains all internal roles', () => {
    const internal: AppRole[] = ['admin', 'aggregator', 'agent', 'quality_manager',
      'logistics_coordinator', 'compliance_officer', 'warehouse_supervisor'];
    internal.forEach(role => {
      expect(ROLES.ALL_INTERNAL).toContain(role);
    });
  });

  it('ALL_INTERNAL does not contain buyer or farmer', () => {
    expect(ROLES.ALL_INTERNAL).not.toContain('buyer');
    expect(ROLES.ALL_INTERNAL).not.toContain('farmer');
  });

  it('FIELD_ROLES covers collection operations', () => {
    expect(ROLES.FIELD_ROLES).toContain('admin');
    expect(ROLES.FIELD_ROLES).toContain('aggregator');
    expect(ROLES.FIELD_ROLES).toContain('agent');
  });

  it('COMPLIANCE_ROLES covers compliance operations', () => {
    expect(ROLES.COMPLIANCE_ROLES).toContain('admin');
    expect(ROLES.COMPLIANCE_ROLES).toContain('quality_manager');
    expect(ROLES.COMPLIANCE_ROLES).toContain('compliance_officer');
  });
});

// ---------------------------------------------------------------------------
// ROLE_LABELS completeness — catches missing label if new role is added
// ---------------------------------------------------------------------------

describe('ROLE_LABELS', () => {
  const allRoles: AppRole[] = [
    'admin', 'aggregator', 'agent', 'quality_manager',
    'logistics_coordinator', 'compliance_officer', 'warehouse_supervisor',
    'buyer', 'farmer',
  ];

  allRoles.forEach(role => {
    it(`has label for ${role}`, () => {
      expect(ROLE_LABELS[role]).toBeTruthy();
      expect(typeof ROLE_LABELS[role]).toBe('string');
    });
  });
});
