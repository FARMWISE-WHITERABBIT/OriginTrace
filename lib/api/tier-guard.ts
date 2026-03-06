import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { hasTierAccess, getRequiredTier, TIER_LABELS, type TierFeature } from '@/lib/config/tier-gating';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function enforceTier(orgId: number | string, feature: TierFeature): Promise<NextResponse | null> {
  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    const { data: org } = await supabase
      .from('organizations')
      .select('settings')
      .eq('id', orgId)
      .single();

    const settings = org?.settings as Record<string, unknown> | null;
    const tier = (settings?.subscription_tier as string) || 'starter';

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
