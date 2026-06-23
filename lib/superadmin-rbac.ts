/**
 * Superadmin RBAC — Role-Based Access Control
 *
 * Five internal roles for system_admins:
 *   platform_admin     Full access; can manage other admins
 *   compliance_manager Compliance rulesets, EUDR, MRL, DDS monitoring
 *   support_agent      Read-only tenant view + impersonation (read)
 *   finance_manager    Revenue, payments, escrow, billing operations
 *   infra_admin        Feature toggles, API health, platform config
 *
 * Usage in API routes:
 *   const admin = await requireSuperadminRole(request, 'platform_admin');
 *   if (admin.error) return admin.error;
 *   // admin.data is the system_admins row
 */

import { createClient as createServerClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/api-auth';
import { NextRequest, NextResponse } from 'next/server';

export type SuperadminRole =
  | 'platform_admin'
  | 'compliance_manager'
  | 'support_agent'
  | 'finance_manager'
  | 'infra_admin';

export interface SystemAdminRecord {
  id: string;
  user_id: string;
  role: SuperadminRole;
  mfa_enrolled: boolean;
  is_active: boolean;
  last_login_at: string | null;
  last_login_ip: string | null;
}

/**
 * Permission matrix — maps capabilities to the minimum roles that hold them.
 * A role is "allowed" if it appears in the array for a given capability.
 *
 * platform_admin is always implicitly allowed for everything.
 */
const PERMISSION_ROLES: Record<string, SuperadminRole[]> = {
  // Tenant & user management
  'tenants.read':          ['platform_admin', 'compliance_manager', 'support_agent', 'finance_manager', 'infra_admin'],
  'tenants.write':         ['platform_admin', 'finance_manager'],
  'tenants.impersonate':   ['platform_admin', 'support_agent'],
  'tenants.tier_change':   ['platform_admin', 'finance_manager'],

  // Compliance
  'compliance.read':       ['platform_admin', 'compliance_manager', 'support_agent'],
  'compliance.write':      ['platform_admin', 'compliance_manager'],

  // Revenue & payments
  'finance.read':          ['platform_admin', 'finance_manager'],
  'finance.write':         ['platform_admin', 'finance_manager'],
  'payments.read':         ['platform_admin', 'finance_manager'],
  'payments.write':        ['platform_admin', 'finance_manager'],
  'billing.read':          ['platform_admin', 'finance_manager', 'support_agent'],
  'billing.write':         ['platform_admin', 'finance_manager'],

  // Platform config
  'config.read':           ['platform_admin', 'infra_admin', 'compliance_manager'],
  'config.write':          ['platform_admin', 'infra_admin'],
  'feature_toggles.write': ['platform_admin', 'infra_admin'],

  // Security & audit
  'security.read':         ['platform_admin'],
  'security.write':        ['platform_admin'],
  'admins.manage':         ['platform_admin'],

  // Reference data (commodities, locations)
  'reference_data.read':   ['platform_admin', 'compliance_manager', 'support_agent', 'finance_manager', 'infra_admin'],
  'reference_data.write':  ['platform_admin', 'infra_admin', 'compliance_manager'],
};

/**
 * Check if a given role has a specific permission.
 */
export function roleHasPermission(role: SuperadminRole, permission: string): boolean {
  const allowed = PERMISSION_ROLES[permission];
  if (!allowed) return false;
  return allowed.includes(role);
}

/**
 * Fetch the system_admins record for the currently authenticated user.
 * Returns null if the user is not a system admin or is deactivated.
 */
export async function getSystemAdmin(userId: string): Promise<SystemAdminRecord | null> {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from('system_admins')
    .select('id, user_id, role, mfa_enrolled, is_active, last_login_at, last_login_ip')
    .eq('user_id', userId)
    .eq('is_active', true)
    .single();

  if (error || !data) return null;
  return data as SystemAdminRecord;
}

/**
 * Middleware-style guard for API routes.
 *
 * Pass `requiredPermission` (e.g. 'tenants.write') to restrict by permission,
 * or `requiredRole` to require an exact role (or platform_admin override).
 *
 * Returns either:
 *   { data: SystemAdminRecord, error: null }
 *   { data: null, error: NextResponse }   ← return this immediately from your route
 */
export async function requireSuperadmin(
  request: NextRequest,
  options?: {
    requiredPermission?: string;
    requiredRole?: SuperadminRole;
  }
): Promise<
  | { data: SystemAdminRecord; error: null }
  | { data: null; error: NextResponse }
> {
  const authClient = await createServerClient();
  const { data: { user }, error: userError } = await authClient.auth.getUser();

  if (userError || !user) {
    return {
      data: null,
      error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
    };
  }

  const admin = await getSystemAdmin(user.id);
  if (!admin) {
    return {
      data: null,
      error: NextResponse.json({ error: 'Forbidden: Superadmin access required' }, { status: 403 }),
    };
  }

  if (options?.requiredRole && options.requiredRole !== 'platform_admin') {
    if (admin.role !== options.requiredRole && admin.role !== 'platform_admin') {
      return {
        data: null,
        error: NextResponse.json(
          { error: `Forbidden: ${options.requiredRole} role required` },
          { status: 403 }
        ),
      };
    }
  }

  if (options?.requiredPermission) {
    if (!roleHasPermission(admin.role, options.requiredPermission)) {
      return {
        data: null,
        error: NextResponse.json(
          { error: `Forbidden: insufficient permissions (requires ${options.requiredPermission})` },
          { status: 403 }
        ),
      };
    }
  }

  return { data: admin, error: null };
}

/**
 * Simple boolean check — use in layout / server components.
 * Does NOT return role details; use getSystemAdmin() for that.
 */
export async function isSuperadmin(userId: string): Promise<boolean> {
  const admin = await getSystemAdmin(userId);
  return admin !== null;
}

/**
 * Update last_login_at and last_login_ip after a successful superadmin login.
 */
export async function recordSuperadminLogin(
  userId: string,
  ipAddress?: string
): Promise<void> {
  const supabase = createServiceClient();
  await supabase
    .from('system_admins')
    .update({
      last_login_at: new Date().toISOString(),
      ...(ipAddress ? { last_login_ip: ipAddress } : {}),
    })
    .eq('user_id', userId);
}
