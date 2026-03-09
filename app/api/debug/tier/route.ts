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

    // 2. Get org directly via admin (bypasses RLS)
    const orgId = profile?.org_id;
    const { data: orgDirect } = orgId ? await admin
      .from('organizations')
      .select('id, name, slug, subscription_tier, subscription_status')
      .eq('id', orgId)
      .single() : { data: null };

    // 3. Test with the anon client (same as middleware uses) to check RLS
    const { data: anonProfile, error: anonProfileErr } = await supabase
      .from('profiles')
      .select('org_id')
      .eq('user_id', user.id)
      .single();
    
    let anonOrg = null;
    let anonOrgErr = null;
    if (anonProfile?.org_id) {
      const result = await supabase
        .from('organizations')
        .select('subscription_tier, settings')
        .eq('id', anonProfile.org_id)
        .single();
      anonOrg = result.data;
      anonOrgErr = result.error;
    }

    return NextResponse.json({
      user_id: user.id,
      profile_role: profile?.role,
      org_id: orgId,
      via_join: {
        subscription_tier: (profile?.organizations as any)?.subscription_tier,
        subscription_status: (profile?.organizations as any)?.subscription_status,
      },
      via_direct: {
        subscription_tier: orgDirect?.subscription_tier,
        subscription_status: orgDirect?.subscription_status,
      },
      settings_tier: ((profile?.organizations as any)?.settings || {})?.subscription_tier,
      via_anon_client: {
        profile_org_id: anonProfile?.org_id,
        profile_error: anonProfileErr?.message || null,
        org_tier: anonOrg?.subscription_tier,
        org_settings_tier: (anonOrg?.settings as any)?.subscription_tier,
        org_error: anonOrgErr?.message || null,
      },
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
