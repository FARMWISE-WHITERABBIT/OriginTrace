/**
 * modules/identity-access/domain/ports.ts
 *
 * Repository and gateway interfaces (ports) for the identity-access module.
 * Pure TypeScript — zero external dependencies (ADR-001).
 *
 * Implementations live in infra/. Application use-cases depend on these
 * interfaces, not on concrete Supabase clients.
 */

export interface UserProfile {
  user_id:  string;
  org_id:   string;
  role:     string;
  full_name?: string | null;
  email?:   string | null;
}

export interface AuthenticatedActor {
  userId:  string;
  email:   string | undefined;
  profile: UserProfile;
}

/** Port: any class that can resolve a profile by user_id. */
export interface IProfileRepository {
  findByUserId(userId: string): Promise<UserProfile | null>;
}
