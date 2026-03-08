import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { hasTierAccess, getRequiredTier, TIER_LABELS, type TierFeature } from '@/lib/config/tier-gating';

export async function enforceTier(orgId: number | string, feature: TierFeature): Promise<NextResponse | null> {
  try {
    const supabase = createAdminClient();

    const { data: org } = await supabase
      .from('organizations')
      .select('subscription_tier')
      .eq('id', orgId)
      .single();

    const tier = (org?.subscription_tier as string) || 'starter';

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
