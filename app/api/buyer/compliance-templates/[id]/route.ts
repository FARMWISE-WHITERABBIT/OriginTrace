import { createAdminClient } from '@/lib/supabase/admin';
import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedProfile } from '@/lib/api-auth';
import { buyerProfileCustomRulesSchema } from '@/lib/compliance/buyer-profile';

// A buyer's compliance template is the single source of truth for anything
// they've assigned to an exporter (see ./assign/route.ts) — the baseline
// (which regulation, which documents) is locked once created, same rule as
// the exporter side; only the buyer_profile overlay in custom_rules can be
// edited, and that edit propagates to every materialized compliance_profiles
// row this template has been assigned to, so an exporter never sees a stale
// copy of "the profile the buyer has."

export async function PATCH(
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

    const { data: existing, error: fetchError } = await supabaseAdmin
      .from('buyer_compliance_profile_templates')
      .select('*')
      .eq('id', templateId)
      .eq('buyer_org_id', profile.org_id)
      .single();

    if (fetchError || !existing) {
      return NextResponse.json({ error: 'Compliance template not found' }, { status: 404 });
    }

    const body = await request.json();
    const nextCustomRules = body.custom_rules;
    if (nextCustomRules === undefined) {
      return NextResponse.json({ error: 'custom_rules is required' }, { status: 400 });
    }
    if (!buyerProfileCustomRulesSchema.safeParse(nextCustomRules).success) {
      return NextResponse.json({ error: 'Invalid buyer profile metadata' }, { status: 400 });
    }

    const { data: updated, error } = await supabaseAdmin
      .from('buyer_compliance_profile_templates')
      .update({ custom_rules: nextCustomRules, updated_at: new Date().toISOString() })
      .eq('id', templateId)
      .select()
      .single();

    if (error) {
      console.error('Buyer compliance template edit error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const { error: propagateError } = await supabaseAdmin
      .from('compliance_profiles')
      .update({ custom_rules: nextCustomRules })
      .eq('source_buyer_template_id', templateId);

    if (propagateError) {
      // The template itself saved fine; log so this doesn't silently drift
      // and surface it to the caller rather than reporting a clean success.
      console.error('Compliance template propagation error:', propagateError);
      return NextResponse.json(
        { error: 'Template updated but failed to sync to assigned exporters', template: updated },
        { status: 207 }
      );
    }

    return NextResponse.json({ template: updated });
  } catch (error) {
    console.error('Buyer compliance template PATCH error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
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

    const { data: existing, error: fetchError } = await supabaseAdmin
      .from('buyer_compliance_profile_templates')
      .select('id')
      .eq('id', templateId)
      .eq('buyer_org_id', profile.org_id)
      .single();

    if (fetchError || !existing) {
      return NextResponse.json({ error: 'Compliance template not found' }, { status: 404 });
    }

    const { count: assignedCount } = await supabaseAdmin
      .from('compliance_profiles')
      .select('id', { count: 'exact', head: true })
      .eq('source_buyer_template_id', templateId);

    if (assignedCount && assignedCount > 0) {
      return NextResponse.json(
        { error: `This template is assigned to ${assignedCount} exporter(s). Unassign it from each before deleting.` },
        { status: 409 }
      );
    }

    const { error } = await supabaseAdmin
      .from('buyer_compliance_profile_templates')
      .delete()
      .eq('id', templateId);

    if (error) {
      console.error('Buyer compliance template delete error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Buyer compliance template DELETE error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
