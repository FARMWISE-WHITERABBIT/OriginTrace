import { createAdminClient } from '@/lib/supabase/admin';
import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedProfile } from '@/lib/api-auth';

export async function GET(request: NextRequest) {
  try {
    const { user, profile } = await getAuthenticatedProfile(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    if (!profile.org_id) return NextResponse.json({ error: 'No organization assigned' }, { status: 403 });
    const supabase = createAdminClient();

    const farmId = request.nextUrl.searchParams.get('farm_id');
    if (!farmId) {
      return NextResponse.json({ error: 'farm_id required' }, { status: 400 });
    }

    const { data: farmerAccount } = await supabase
      .from('farmer_accounts')
      .select('id, phone, status, invite_token, farmer_code')
      .eq('farm_id', farmId)
      .eq('org_id', profile.org_id)
      .single();

    if (!farmerAccount) {
      return NextResponse.json({ error: 'No farmer account for this farm' }, { status: 404 });
    }

    const baseUrl = request.nextUrl.origin;
    const inviteLink = `${baseUrl}/farmer/activate?token=${farmerAccount.invite_token}`;
    const smsText = `Welcome to OriginTrace! Activate your farmer portal: ${inviteLink}`;

    return NextResponse.json({
      account: farmerAccount,
      inviteLink,
      smsText,
    });
  } catch (error) {
    console.error('Farmer invite error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { user, profile } = await getAuthenticatedProfile(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    if (!profile.org_id) return NextResponse.json({ error: 'No organization assigned' }, { status: 403 });
    const supabase = createAdminClient();

    const body = await request.json();
    const { farm_id } = body;

    if (!farm_id) {
      return NextResponse.json({ error: 'farm_id required' }, { status: 400 });
    }

    const newToken = crypto.randomUUID().replace(/-/g, '').slice(0, 16);

    const { data: account, error: updateError } = await supabase
      .from('farmer_accounts')
      .update({ invite_token: newToken, status: 'invited' })
      .eq('farm_id', farm_id)
      .eq('org_id', profile.org_id)
      .select()
      .single();

    if (updateError) {
      return NextResponse.json({ error: 'Failed to regenerate invite' }, { status: 500 });
    }

    const baseUrl = request.nextUrl.origin;
    const inviteLink = `${baseUrl}/farmer/activate?token=${account.invite_token}`;

    return NextResponse.json({ inviteLink, account });
  } catch (error) {
    console.error('Farmer invite POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
