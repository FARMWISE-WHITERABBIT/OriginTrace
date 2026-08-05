import { createAdminClient } from '@/lib/supabase/admin';
import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedProfile } from '@/lib/api-auth';
import { LEGACY_PROFILE_TEMPLATES as TEMPLATES } from '@/lib/compliance-templates';
import { buyerProfileCustomRulesSchema } from '@/lib/compliance/buyer-profile';

// A buyer's own compliance profile templates — set up independent of any
// exporter link, then assigned to a linked exporter via
// /api/buyer/compliance-templates/[id]/assign. See
// supabase/migrations/20260805_buyer_compliance_profile_templates.sql.

async function requireBuyerAdmin(supabaseAdmin: ReturnType<typeof createAdminClient>, userId: string) {
  const { data: buyerProfile } = await supabaseAdmin
    .from('buyer_profiles')
    .select('role, buyer_org_id')
    .eq('user_id', userId)
    .single();
  return buyerProfile;
}

export async function GET(request: NextRequest) {
  try {
    const supabaseAdmin = createAdminClient();
    const { user, profile } = await getAuthenticatedProfile(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!profile || profile.role !== 'buyer') {
      return NextResponse.json({ error: 'Buyer profile required' }, { status: 403 });
    }

    const { data: templates, error } = await supabaseAdmin
      .from('buyer_compliance_profile_templates')
      .select('*')
      .eq('buyer_org_id', profile.org_id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Buyer compliance templates fetch error:', error);
      return NextResponse.json({ error: 'Failed to fetch compliance templates' }, { status: 500 });
    }

    return NextResponse.json({ templates: templates || [], regulationTemplates: TEMPLATES });
  } catch (error) {
    console.error('Buyer compliance templates GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabaseAdmin = createAdminClient();
    const { user, profile } = await getAuthenticatedProfile(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!profile || profile.role !== 'buyer') {
      return NextResponse.json({ error: 'Buyer profile required' }, { status: 403 });
    }

    const buyerProfile = await requireBuyerAdmin(supabaseAdmin, user.id);
    if (!buyerProfile || buyerProfile.role !== 'buyer_admin') {
      return NextResponse.json({ error: 'Only buyer admins can set up compliance templates' }, { status: 403 });
    }

    const body = await request.json();
    const { template, custom_rules: buyerCustomRules } = body;

    if (!template || !TEMPLATES[template]) {
      return NextResponse.json(
        { error: 'A regulatory template must be selected — the baseline requirements cannot be hand-written' },
        { status: 400 }
      );
    }

    if (
      buyerCustomRules &&
      typeof buyerCustomRules === 'object' &&
      !buyerProfileCustomRulesSchema.safeParse(buyerCustomRules).success
    ) {
      return NextResponse.json({ error: 'Invalid buyer profile metadata' }, { status: 400 });
    }

    const t = TEMPLATES[template];
    const { data: created, error } = await supabaseAdmin
      .from('buyer_compliance_profile_templates')
      .insert({
        buyer_org_id: profile.org_id,
        name: t.name,
        destination_market: t.destination_market,
        regulation_framework: t.regulation_framework,
        required_documents: t.required_documents,
        required_certifications: t.required_certifications,
        geo_verification_level: t.geo_verification_level,
        min_traceability_depth: t.min_traceability_depth,
        template,
        custom_rules: buyerCustomRules || {},
      })
      .select()
      .single();

    if (error) {
      console.error('Buyer compliance template creation error:', error);
      return NextResponse.json({ error: 'Failed to create compliance template' }, { status: 500 });
    }

    return NextResponse.json({ template: created }, { status: 201 });
  } catch (error) {
    console.error('Buyer compliance templates POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
