import { createAdminClient } from '@/lib/supabase/admin';
import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedProfile } from '@/lib/api-auth';
import { enforceTier } from '@/lib/api/tier-guard';
import { requireActiveLink } from '@/lib/compliance/buyer-profile';

// Materializes a buyer's compliance template onto a linked exporter: creates
// (or, idempotently, returns) the compliance_profiles row that
// /api/compliance-profiles and the exporter's Settings -> Compliance page
// read. This is the "once an exporter is linked, they choose that exporter
// and it automatically receives the profile" step.

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: templateId } = await params;
    const supabaseAdmin = createAdminClient();
    const { user, profile } = await getAuthenticatedProfile(request);

    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!profile || profile.role !== 'buyer') {
      return NextResponse.json({ error: 'Buyer profile required' }, { status: 403 });
    }

    const body = await request.json();
    const { exporter_org_id: exporterOrgId } = body;
    if (!exporterOrgId) {
      return NextResponse.json({ error: 'exporter_org_id is required' }, { status: 400 });
    }

    const { data: template, error: fetchError } = await supabaseAdmin
      .from('buyer_compliance_profile_templates')
      .select('*')
      .eq('id', templateId)
      .eq('buyer_org_id', profile.org_id)
      .single();

    if (fetchError || !template) {
      return NextResponse.json({ error: 'Compliance template not found' }, { status: 404 });
    }

    if (!(await requireActiveLink(supabaseAdmin, profile.org_id, exporterOrgId))) {
      return NextResponse.json({ error: 'No active supply chain link with this exporter' }, { status: 403 });
    }

    const tierBlock = await enforceTier(exporterOrgId, 'compliance_profiles');
    if (tierBlock) return tierBlock;

    const { data: existingAssignment } = await supabaseAdmin
      .from('compliance_profiles')
      .select('*')
      .eq('source_buyer_template_id', templateId)
      .eq('org_id', exporterOrgId)
      .maybeSingle();

    if (existingAssignment) {
      return NextResponse.json({ profile: existingAssignment, already_assigned: true });
    }

    const { data: created, error } = await supabaseAdmin
      .from('compliance_profiles')
      .insert({
        org_id: exporterOrgId,
        buyer_org_id: profile.org_id,
        source_buyer_template_id: template.id,
        name: template.name,
        destination_market: template.destination_market,
        regulation_framework: template.regulation_framework,
        required_documents: template.required_documents,
        required_certifications: template.required_certifications,
        geo_verification_level: template.geo_verification_level,
        min_traceability_depth: template.min_traceability_depth,
        custom_rules: template.custom_rules,
        is_default: false,
      })
      .select()
      .single();

    if (error) {
      console.error('Compliance template assignment error:', error);
      return NextResponse.json({ error: 'Failed to assign compliance template' }, { status: 500 });
    }

    return NextResponse.json({ profile: created, already_assigned: false }, { status: 201 });
  } catch (error) {
    console.error('Compliance template assign POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
