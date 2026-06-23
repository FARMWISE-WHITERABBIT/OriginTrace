import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getAuthenticatedProfile } from '@/lib/api-auth';

/**
 * GET /api/collect/farmers
 * Returns farms for the authenticated user's org, intended for the
 * Smart Collect contributor selection flow. Uses the admin client to
 * bypass RLS so the browser-side auth session is not required.
 */
export async function GET(request: NextRequest) {
  try {
    const { user, profile } = await getAuthenticatedProfile(request);
    if (!user)            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!profile?.org_id) return NextResponse.json({ error: 'No organization' }, { status: 403 });

    const supabase = createAdminClient();
    const { data: farms, error } = await supabase
      .from('farms')
      .select('id, farmer_name, community, commodity, area_hectares, compliance_status, boundary')
      .eq('org_id', profile.org_id)
      .neq('compliance_status', 'rejected')
      .order('farmer_name');

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ farms: farms || [] });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
