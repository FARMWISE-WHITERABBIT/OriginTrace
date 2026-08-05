import { createAdminClient } from '@/lib/supabase/admin';
import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedProfile } from '@/lib/api-auth';
import { enforceTier } from '@/lib/api/tier-guard';
import { buyerProfileCustomRulesSchema } from '@/lib/compliance/buyer-profile';

const BASELINE_FIELDS = [
  'name',
  'destination_market',
  'regulation_framework',
  'required_documents',
  'required_certifications',
  'geo_verification_level',
  'min_traceability_depth',
] as const;

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: profileId } = await params;
    const supabase = createAdminClient();
    const { user, profile } = await getAuthenticatedProfile(request);

    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    if (!profile.org_id) return NextResponse.json({ error: 'No organization assigned' }, { status: 403 });

    const { data: existing, error: fetchError } = await supabase
      .from('compliance_profiles')
      .select('*')
      .eq('id', profileId)
      .single();

    if (fetchError || !existing) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    const body = await request.json();

    if (profile.role === 'buyer') {
      if (existing.buyer_org_id !== profile.org_id) {
        return NextResponse.json({ error: 'Not authorized to edit this profile' }, { status: 403 });
      }

      const attemptedBaselineChange = BASELINE_FIELDS.some(
        (field) => field in body && JSON.stringify(body[field]) !== JSON.stringify(existing[field])
      );
      if (attemptedBaselineChange) {
        return NextResponse.json(
          { error: 'The regulatory baseline cannot be modified — only your own requirement overlay can be edited' },
          { status: 403 }
        );
      }

      const nextCustomRules = body.custom_rules;
      if (nextCustomRules === undefined) {
        return NextResponse.json({ error: 'custom_rules is required' }, { status: 400 });
      }
      if (!buyerProfileCustomRulesSchema.safeParse(nextCustomRules).success) {
        return NextResponse.json({ error: 'Invalid buyer profile metadata' }, { status: 400 });
      }

      const tierBlock = await enforceTier(existing.org_id, 'compliance_profiles');
      if (tierBlock) return tierBlock;

      const { data: updated, error } = await supabase
        .from('compliance_profiles')
        .update({ custom_rules: nextCustomRules })
        .eq('id', profileId)
        .select()
        .single();

      if (error) {
        console.error('Buyer compliance profile edit error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      return NextResponse.json({ profile: updated });
    }

    if (existing.org_id !== profile.org_id) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }
    if (profile.role !== 'admin' && profile.role !== 'compliance_officer') {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const tierBlock = await enforceTier(profile.org_id, 'compliance_profiles');
    if (tierBlock) return tierBlock;

    const editable = [...BASELINE_FIELDS, 'custom_rules', 'is_default'] as const;
    const updates = Object.fromEntries(
      editable.filter((field) => field in body).map((field) => [field, body[field]])
    );

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No editable fields provided' }, { status: 400 });
    }

    const { data: updated, error } = await supabase
      .from('compliance_profiles')
      .update(updates)
      .eq('id', profileId)
      .eq('org_id', profile.org_id)
      .select()
      .single();

    if (error) {
      console.error('Compliance profile edit error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ profile: updated });
  } catch (error) {
    console.error('Compliance profile PATCH error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = createAdminClient();
    const { user, profile } = await getAuthenticatedProfile(request);

    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    if (!profile.org_id) return NextResponse.json({ error: 'No organization assigned' }, { status: 403 });

    const tierBlock = await enforceTier(profile.org_id, 'compliance_profiles');
    if (tierBlock) return tierBlock;

    if (profile.role !== 'admin' && profile.role !== 'compliance_officer') {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const profileId = id;
    if (!profileId) {
      return NextResponse.json({ error: 'Invalid profile ID' }, { status: 400 });
    }

    // Verify the profile belongs to this org before deleting
    const { data: existing, error: fetchError } = await supabase
      .from('compliance_profiles')
      .select('id, org_id')
      .eq('id', profileId)
      .eq('org_id', profile.org_id)
      .single();

    if (fetchError || !existing) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    const { error } = await supabase
      .from('compliance_profiles')
      .delete()
      .eq('id', profileId)
      .eq('org_id', profile.org_id);

    if (error) {
      console.error('Error deleting compliance profile:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Compliance profile DELETE error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = createAdminClient();
    const { user, profile } = await getAuthenticatedProfile(request);

    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    if (!profile.org_id) return NextResponse.json({ error: 'No organization assigned' }, { status: 403 });

    const tierBlock = await enforceTier(profile.org_id, 'compliance_profiles');
    if (tierBlock) return tierBlock;

    const profileId = id;
    if (!profileId) {
      return NextResponse.json({ error: 'Invalid profile ID' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('compliance_profiles')
      .select('*')
      .eq('id', profileId)
      .eq('org_id', profile.org_id)
      .single();

    if (error || !data) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    return NextResponse.json({ profile: data });
  } catch (error) {
    console.error('Compliance profile GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
