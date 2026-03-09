import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { NextResponse } from 'next/server';

// TEMPORARY DEBUG ENDPOINT — remove after confirming tier is correct
// GET /api/debug/tier → returns your org's subscription_tier from DB
export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'not authenticated' }, { status: 401 });

    const admin = createAdminClient();

    // 1. Get profile + org via join (what /api/profile returns)
    const { data: profile } = await admin
      .from('profiles')
      .select('id, role, org_id, organizations(id, name, slug, subscription_tier, subscription_status, settings)')
      .eq('user_id', user.id)
      .single();

    // 2. Get org directly (what middleware uses)
    const orgId = profile?.org_id;
    const { data: orgDirect } = orgId ? await admin
      .from('organizations')
      .select('id, name, slug, subscription_tier, subscription_status')
      .eq('id', orgId)
      .single() : { data: null };

    return NextResponse.json({
      user_id: user.id,
      profile_role: profile?.role,
      org_id: orgId,
      // What the profile join returns (used by org-context)
      via_join: {
        subscription_tier: (profile?.organizations as any)?.subscription_tier,
        subscription_status: (profile?.organizations as any)?.subscription_status,
      },
      // What the direct query returns (used by middleware)
      via_direct: {
        subscription_tier: orgDirect?.subscription_tier,
        subscription_status: orgDirect?.subscription_status,
      },
      // Settings JSONB fallback
      settings_tier: ((profile?.organizations as any)?.settings || {})?.subscription_tier,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
