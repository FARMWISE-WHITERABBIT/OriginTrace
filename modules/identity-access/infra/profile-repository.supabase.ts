/**
 * modules/identity-access/infra/profile-repository.supabase.ts
 *
 * Supabase implementation of IProfileRepository.
 * Infra layer: may import Supabase clients. Must NOT be imported by domain files.
 */

import { createAdminClient } from '@/lib/supabase/admin';
import type { IProfileRepository, UserProfile } from '../domain/ports';

export class SupabaseProfileRepository implements IProfileRepository {
  async findByUserId(userId: string): Promise<UserProfile | null> {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from('profiles')
      .select('user_id, org_id, role, full_name')
      .eq('user_id', userId)
      .single();

    if (error || !data) return null;

    return {
      user_id:   data.user_id,
      org_id:    data.org_id,
      role:      data.role,
      full_name: data.full_name ?? null,
    };
  }
}

/** Convenience singleton — use this in application use-cases. */
export const profileRepository = new SupabaseProfileRepository();
