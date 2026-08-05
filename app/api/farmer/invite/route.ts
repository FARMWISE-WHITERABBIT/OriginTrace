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
    const { farm_id, phone: providedPhone } = body;

    if (!farm_id) {
      return NextResponse.json({ error: 'farm_id required' }, { status: 400 });
    }

    // Check if a farmer account already exists for this farm
    const { data: existing } = await supabase
      .from('farmer_accounts')
      .select('id, phone, status, invite_token, farmer_code')
      .eq('farm_id', farm_id)
      .eq('org_id', profile.org_id)
      .maybeSingle();

    const newToken = crypto.randomUUID().replace(/-/g, '').slice(0, 16);
    const baseUrl = request.nextUrl.origin;

    if (existing) {
      // Regenerate token for existing account
      const { data: account, error: updateError } = await supabase
        .from('farmer_accounts')
        .update({ invite_token: newToken, status: 'invited' })
        .eq('id', existing.id)
        .select()
        .single();

      if (updateError) {
        return NextResponse.json({ error: 'Failed to regenerate invite' }, { status: 500 });
      }

      const inviteLink = `${baseUrl}/farmer/activate?token=${account.invite_token}`;
      return NextResponse.json({ inviteLink, account, created: false });
    }

    // No farmer_accounts record exists — create one
    // First, look up the farm to get the phone number
    const { data: farm, error: farmError } = await supabase
      .from('farms')
      .select('id, phone, farmer_id, farmer_name')
      .eq('id', farm_id)
      .eq('org_id', profile.org_id)
      .single();

    if (farmError || !farm) {
      return NextResponse.json({ error: 'Farm not found in your organization' }, { status: 404 });
    }

    const phone = providedPhone || farm.phone;
    if (!phone) {
      return NextResponse.json({ error: 'Phone number is required to invite a farmer. Please add a phone number to the farm record first.' }, { status: 400 });
    }

    const { data: account, error: insertError } = await supabase
      .from('farmer_accounts')
      .insert({
        farm_id: farm.id,
        org_id: profile.org_id,
        phone,
        farmer_code: farm.farmer_id || null,
        status: 'invited',
        invite_token: newToken,
        created_by: user.id,
      })
      .select()
      .single();

    if (insertError) {
      console.error('Farmer account creation error:', insertError);
      return NextResponse.json({ error: 'Failed to create farmer account' }, { status: 500 });
    }

    const inviteLink = `${baseUrl}/farmer/activate?token=${account.invite_token}`;
    return NextResponse.json({ inviteLink, account, created: true });
  } catch (error) {
    console.error('Farmer invite POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
