import { createAdminClient } from '@/lib/supabase/admin';
import { NextRequest, NextResponse } from 'next/server';
import { parsePagination } from '@/lib/api/validation';
import { getAuthenticatedProfile } from '@/lib/api-auth';
import { enforceTier } from '@/lib/api/tier-guard';
import { requireRole, ROLES } from '@/lib/rbac';
import { LEGACY_PROFILE_TEMPLATES as TEMPLATES } from '@/lib/compliance-templates';
import { buyerProfileCustomRulesSchema, requireActiveLink } from '@/lib/compliance/buyer-profile';

export async function GET(request: NextRequest) {
  try {
    const supabaseAdmin = createAdminClient();

    const { user, profile } = await getAuthenticatedProfile(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    if (!profile.org_id) return NextResponse.json({ error: 'No organization assigned' }, { status: 403 });

    const { searchParams } = new URL(request.url);
    const { from, to, page, limit } = parsePagination(searchParams);

    let targetOrgId = profile.org_id;

    if (profile.role === 'buyer') {
      const exporterOrgId = searchParams.get('exporter_org_id');
      if (!exporterOrgId) {
        return NextResponse.json({ error: 'exporter_org_id is required' }, { status: 400 });
      }
      if (!(await requireActiveLink(supabaseAdmin, profile.org_id, exporterOrgId))) {
        return NextResponse.json({ error: 'No active supply chain link with this exporter' }, { status: 403 });
      }
      targetOrgId = exporterOrgId;
    }

    const tierBlock = await enforceTier(targetOrgId, 'compliance_profiles');
    if (tierBlock) return tierBlock;

    const { data: profiles, error, count } = await supabaseAdmin
      .from('compliance_profiles')
      .select('*', { count: 'exact' })
      .eq('org_id', targetOrgId)
      .order('created_at', { ascending: false })
      .range(from, to);

    if (error) {
      console.error('Compliance profiles fetch error:', error);
      return NextResponse.json({ error: 'Failed to fetch compliance profiles' }, { status: 500 });
    }

    // Exporters viewing their own profile list need to know which ones were
    // set up by a buyer (not just which fields to lock) so the UI can label
    // them and guard against an exporter unilaterally deleting a buyer's
    // requirement profile.
    const buyerOrgIds = [
      ...new Set((profiles || []).map((p) => p.buyer_org_id).filter((id): id is string => !!id)),
    ];
    let buyerOrgNames = new Map<string, string>();
    if (profile.role !== 'buyer' && buyerOrgIds.length > 0) {
      const { data: buyerOrgs } = await supabaseAdmin
        .from('buyer_organizations')
        .select('id, name')
        .in('id', buyerOrgIds);
      buyerOrgNames = new Map((buyerOrgs || []).map((b) => [b.id, b.name]));
    }

    const withOwnership = (profiles || []).map((p) => ({
      ...p,
      is_own_buyer_profile: profile.role === 'buyer' ? p.buyer_org_id === profile.org_id : undefined,
      buyer_org_name: p.buyer_org_id ? buyerOrgNames.get(p.buyer_org_id) ?? null : null,
    }));

    return NextResponse.json({ profiles: withOwnership, templates: TEMPLATES, pagination: { page, limit, total: count ?? 0 } });
  } catch (error) {
    console.error('Compliance profiles API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabaseAdmin = createAdminClient();

    const { user, profile } = await getAuthenticatedProfile(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    if (!profile.org_id) return NextResponse.json({ error: 'No organization assigned' }, { status: 403 });

    const body = await request.json();

    // Buyers no longer create compliance_profiles rows directly here — they
    // build a buyer_compliance_profile_templates row (independent of any
    // exporter, see app/api/buyer/compliance-templates/route.ts) and then
    // assign it to a linked exporter, which materializes the row this
    // endpoint used to create inline.
    if (profile.role === 'buyer') {
      return NextResponse.json(
        { error: 'Buyers set up a compliance template and assign it to an exporter — see /api/buyer/compliance-templates' },
        { status: 400 }
      );
    }

    const roleError = requireRole(profile, ROLES.ADMIN_COMPLIANCE);
    if (roleError) return roleError;

    const tierBlock = await enforceTier(profile.org_id, 'compliance_profiles');
    if (tierBlock) return tierBlock;

    const {
      name,
      destination_market,
      regulation_framework,
      required_documents,
      required_certifications,
      geo_verification_level,
      min_traceability_depth,
      custom_rules,
      is_default,
      template,
    } = body;

    if (template && TEMPLATES[template]) {
      const t = TEMPLATES[template];
      const { data: created, error } = await supabaseAdmin
        .from('compliance_profiles')
        .insert({
          org_id: profile.org_id,
          name: t.name,
          destination_market: t.destination_market,
          regulation_framework: t.regulation_framework,
          required_documents: t.required_documents,
          required_certifications: t.required_certifications,
          geo_verification_level: t.geo_verification_level,
          min_traceability_depth: t.min_traceability_depth,
          is_default: false,
        })
        .select()
        .single();

      if (error) {
        console.error('Compliance profile creation error:', error);
        return NextResponse.json({ error: 'Failed to create compliance profile' }, { status: 500 });
      }

      return NextResponse.json({ profile: created }, { status: 201 });
    }

    if (!name || !destination_market || !regulation_framework) {
      return NextResponse.json({
        error: 'name, destination_market, and regulation_framework are required',
      }, { status: 400 });
    }

    const validFrameworks = ['EUDR', 'FSMA_204', 'UK_Environment_Act', 'Lacey_Act_UFLPA', 'China_Green_Trade', 'GACC', 'UAE_Halal', 'custom'];
    if (!validFrameworks.includes(regulation_framework)) {
      return NextResponse.json({ error: 'Invalid regulation_framework' }, { status: 400 });
    }

    if (
      custom_rules &&
      typeof custom_rules === 'object' &&
      'buyer_profile' in custom_rules &&
      !buyerProfileCustomRulesSchema.safeParse(custom_rules).success
    ) {
      return NextResponse.json({ error: 'Invalid buyer profile metadata' }, { status: 400 });
    }

    const { data: created, error } = await supabaseAdmin
      .from('compliance_profiles')
      .insert({
        org_id: profile.org_id,
        name,
        destination_market,
        regulation_framework,
        required_documents: required_documents || [],
        required_certifications: required_certifications || [],
        geo_verification_level: geo_verification_level || 'polygon',
        min_traceability_depth: min_traceability_depth || 1,
        custom_rules: custom_rules || {},
        is_default: is_default || false,
      })
      .select()
      .single();

    if (error) {
      console.error('Compliance profile creation error:', error);
      return NextResponse.json({ error: 'Failed to create compliance profile' }, { status: 500 });
    }

    return NextResponse.json({ profile: created }, { status: 201 });
  } catch (error) {
    console.error('Compliance profiles API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
