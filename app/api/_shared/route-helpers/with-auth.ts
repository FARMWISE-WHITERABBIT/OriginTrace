/**
 * app/api/_shared/route-helpers/with-auth.ts
 *
 * Higher-order function that enforces authentication and injects the
 * authenticated profile into the handler.
 *
 * Usage:
 *   export const GET = withAuth(async (request, { profile }) => {
 *     // profile.org_id, profile.role are guaranteed non-null here
 *     return NextResponse.json({ ok: true });
 *   });
 *
 *   // Require a specific role:
 *   export const POST = withAuth(handler, { requiredRole: 'admin' });
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedProfile } from '@/lib/api-auth';

export type Role = 'admin' | 'aggregator' | 'logistics_coordinator' | 'compliance_officer' | 'viewer';

const ROLE_LEVELS: Record<Role, number> = {
  viewer:                 0,
  compliance_officer:     1,
  logistics_coordinator:  2,
  aggregator:             3,
  admin:                  4,
};

export interface AuthContext {
  profile: {
    id: string;
    user_id: string;
    org_id: string;
    role: Role;
    full_name: string | null;
  };
}

export interface WithAuthOptions {
  /** Minimum role required. Defaults to 'viewer' (any authenticated user). */
  requiredRole?: Role;
}

type AuthedHandler<Ctx = Record<string, never>> = (
  request: NextRequest,
  context: AuthContext & Ctx,
) => Promise<NextResponse>;

export function withAuth<Ctx = Record<string, never>>(
  handler: AuthedHandler<Ctx>,
  options: WithAuthOptions = {},
) {
  return async (request: NextRequest, ctx?: Ctx): Promise<NextResponse> => {
    const { user, profile } = await getAuthenticatedProfile(request);

    if (!user || !profile) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!profile.org_id) {
      return NextResponse.json({ error: 'No organization associated with this account' }, { status: 403 });
    }

    if (options.requiredRole) {
      const userLevel = ROLE_LEVELS[profile.role as Role] ?? -1;
      const requiredLevel = ROLE_LEVELS[options.requiredRole];
      if (userLevel < requiredLevel) {
        return NextResponse.json(
          { error: `Insufficient role. Required: ${options.requiredRole}` },
          { status: 403 },
        );
      }
    }

    return handler(request, {
      ...((ctx ?? {}) as Ctx),
      profile: profile as AuthContext['profile'],
    });
  };
}
