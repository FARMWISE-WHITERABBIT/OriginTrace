import { createAdminClient } from '@/lib/supabase/admin';
import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedProfile } from '@/lib/api-auth';
import { predictYieldForOrg } from '@/lib/services/yield-prediction';

export async function GET(request: NextRequest) {
  try {
    const { user, profile } = await getAuthenticatedProfile(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    if (!profile.org_id) return NextResponse.json({ error: 'No organization assigned' }, { status: 403 });

    const result = await predictYieldForOrg(profile.org_id);

    return NextResponse.json(result);
  } catch (error) {
    console.error('Yield predictions error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
