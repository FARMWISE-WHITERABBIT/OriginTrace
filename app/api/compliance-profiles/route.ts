import { createAdminClient } from '@/lib/supabase/admin';
import { NextRequest, NextResponse } from 'next/server';
import { parsePagination } from '@/lib/api/validation';
import { getAuthenticatedProfile } from '@/lib/api-auth';
import { COMPLIANCE_TEMPLATES } from '@/lib/compliance-templates';

// Convert shared ComplianceTemplate format to the legacy TEMPLATES format expected by this route
const TEMPLATES = Object.fromEntries(
  Object.entries(COMPLIANCE_TEMPLATES).map(([key, tpl]) => [
    key,
    {
      name: tpl.market_name,
      destination_market: tpl.destination_market,
      regulation_framework: tpl.regulation_framework,
      required_documents: tpl.docs.filter(d => d.required).map(d => d.label),
      required_certifications: tpl.required_certifications,
      geo_verification_level: tpl.geo_verification_level,
      min_traceability_depth: tpl.min_traceability_depth,
    },
  ])
);

export async function GET(request: NextRequest) {
  try {
    const supabaseAdmin = createAdminClient();

    const { user, profile } = await getAuthenticatedProfile(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    if (!profile.org_id) return NextResponse.json({ error: 'No organization assigned' }, { status: 403 });

    const { searchParams } = new URL(request.url);
    const { from, to, page, limit } = parsePagination(searchParams);

    const { data: profiles, error, count } = await supabaseAdmin
      .from('compliance_profiles')
      .select('*', { count: 'exact' })
      .eq('org_id', profile.org_id)
      .order('created_at', { ascending: false })
      .range(from, to);

    if (error) {
      console.error('Compliance profiles fetch error:', error);
      return NextResponse.json({ error: 'Failed to fetch compliance profiles' }, { status: 500 });
    }

    return NextResponse.json({ profiles: profiles || [], templates: TEMPLATES, pagination: { page, limit, total: count ?? 0 } });
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

    const validFrameworks = ['EUDR', 'FSMA_204', 'UK_Environment_Act', 'Lacey_Act_UFLPA', 'China_Green_Trade', 'UAE_Halal', 'custom'];
    if (!validFrameworks.includes(regulation_framework)) {
      return NextResponse.json({ error: 'Invalid regulation_framework' }, { status: 400 });
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
