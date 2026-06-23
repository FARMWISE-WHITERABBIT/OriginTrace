/**
 * modules/identity-access/application/use-cases/authenticate-request.ts
 *
 * Use-case: authenticate an incoming Next.js request and resolve the
 * caller's profile.
 *
 * Application layer: may import domain ports and infra implementations.
 * Must NOT be imported by domain files. Must NOT import from app/api/ routes.
 *
 * This is the canonical path for authenticating API requests (ADR-001).
 * The legacy lib/api-auth.ts helper delegates here via a thin wrapper
 * during the migration period.
 */

import { createClient } from '@/lib/supabase/server';
import { profileRepository } from '../../infra/profile-repository.supabase';
import type { AuthenticatedActor } from '../../domain/ports';

export type AuthResult =
  | { ok: true;  actor: AuthenticatedActor }
  | { ok: false; status: 401 | 403 | 404; message: string };

/**
 * Authenticate the caller from the current session cookie.
 *
 * Returns a typed discriminated union so the route handler can
 * destructure the result without manual null-checks:
 *
 * ```ts
 * const auth = await authenticateRequest();
 * if (!auth.ok) return NextResponse.json({ error: auth.message }, { status: auth.status });
 * const { actor } = auth;
 * ```
 */
export async function authenticateRequest(): Promise<AuthResult> {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) {
    return { ok: false, status: 401, message: 'Unauthorized' };
  }

  const profile = await profileRepository.findByUserId(user.id);
  if (!profile) {
    return { ok: false, status: 404, message: 'Profile not found' };
  }
  if (!profile.org_id) {
    return { ok: false, status: 403, message: 'No organization associated with this account' };
  }

  return {
    ok: true,
    actor: {
      userId:  user.id,
      email:   user.email,
      profile,
    },
  };
}

/**
 * Require one of the given roles. Wraps authenticateRequest() with a
 * role check so use-cases don't need to repeat the pattern.
 */
export async function authenticateWithRole(
  allowedRoles: string[],
): Promise<AuthResult> {
  const result = await authenticateRequest();
  if (!result.ok) return result;

  if (!allowedRoles.includes(result.actor.profile.role)) {
    return { ok: false, status: 403, message: 'Insufficient permissions' };
  }

  return result;
}
