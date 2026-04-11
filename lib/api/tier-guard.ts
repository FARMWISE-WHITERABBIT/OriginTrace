import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { TIER_LABELS } from '@/lib/config/tier-gating';
import {
  hasTierAccess,
  canAccessOrg,
  getRequiredTier,
  type TierFeature,
} from '@/modules/identity-access/domain/tier-policy';

export async function enforceTier(orgId: number | string, feature: TierFeature): Promise<NextResponse | null> {
  try {
    const supabase = createAdminClient();

    const { data: org } = await supabase
      .from('organizations')
      .select('subscription_tier')
      .eq('id', orgId)
      .single();

    // Org not found → fail-closed (ADR-002: genuine auth error, return 403)
    if (!canAccessOrg(org ?? null)) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 403 });
    }

    // null / undefined tier → fail-open (ADR-002: ops error, grant access)
    const tier = (org?.subscription_tier as string) || null;

    if (!hasTierAccess(tier, feature)) {
      const requiredTier = getRequiredTier(feature);
      const requiredTierLabel = TIER_LABELS[requiredTier];
      return NextResponse.json(
        {
          error: 'Feature not available on your current plan',
          requiredTier,
          requiredTierLabel,
          message: `This feature requires the ${requiredTierLabel} plan or above.`,
        },
        { status: 403 }
      );
    }

    return null;
  } catch (error) {
    console.error('Tier enforcement error:', error);
    return NextResponse.json(
      { error: 'Unable to verify subscription tier. Access denied.' },
      { status: 500 }
    );
  }
}

/**
 * Lightweight tier check used by shipment and other routes.
 * Returns true if org has access to the given feature, false otherwise.
 * Caller is responsible for returning the appropriate 403 response.
 */
export async function checkTierAccess(
  supabaseOrOrgId: any,
  orgId: string,
  feature: TierFeature = 'shipment_readiness'
): Promise<boolean> {
  try {
    // Accept either a supabase client (legacy) or skip and use admin client
    const client = typeof supabaseOrOrgId === 'string' ? createAdminClient() : (supabaseOrOrgId ?? createAdminClient());
    const resolvedOrgId = typeof supabaseOrOrgId === 'string' ? supabaseOrOrgId : orgId;

    const { data: org } = await client
      .from('organizations')
      .select('subscription_tier, feature_flags')
      .eq('id', resolvedOrgId)
      .single();

    // Org not found → fail-closed per ADR-002
    if (!canAccessOrg(org ?? null)) return false;

    const tier = (org?.subscription_tier as string) || null;
    return hasTierAccess(tier, feature);
  } catch {
    return false;
  }
}
