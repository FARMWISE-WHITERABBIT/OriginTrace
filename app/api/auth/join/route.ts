import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password, fullName, inviteCode, role } = body;

    if (!email || !password || !fullName || !inviteCode) {
      return NextResponse.json(
        { error: 'All fields are required' },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: 'Password must be at least 6 characters' },
        { status: 400 }
      );
    }

    const codeStr = String(inviteCode).trim();
    if (!/^\d{6}$/.test(codeStr)) {
      return NextResponse.json(
        { error: 'Invalid invite code format. Please enter a 6-digit code.' },
        { status: 400 }
      );
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      );
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    const { data: organization, error: orgError } = await supabaseAdmin
      .from('organizations')
      .select('id, name')
      .eq('invite_code', codeStr)
      .single();

    if (orgError || !organization) {
      return NextResponse.json(
        { error: 'Invalid invite code. Please check with your organization admin.' },
        { status: 404 }
      );
    }

    const assignedRole = role === 'aggregator' ? 'aggregator' : 'agent';

    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: false,
      user_metadata: { full_name: fullName }
    });

    if (authError || !authData.user) {
      console.error('Auth error (join):', authError);
      const message = authError?.message?.includes('already been registered')
        ? 'This email is already registered. Please sign in instead.'
        : authError?.message || 'Failed to create user account';
      return NextResponse.json({ error: message }, { status: 400 });
    }

    const userId = authData.user.id;

    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .insert({
        user_id: userId,
        org_id: organization.id,
        role: assignedRole,
        full_name: fullName,
      });

    if (profileError) {
      console.error('Profile error (join):', profileError);
      await supabaseAdmin.auth.admin.deleteUser(userId);
      return NextResponse.json(
        { error: 'Failed to create user profile' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      userId,
      orgId: organization.id,
      orgName: organization.name,
      role: assignedRole,
      message: `You have been added to ${organization.name} as ${assignedRole === 'agent' ? 'a Field Agent' : 'an Aggregator'}.`
    });

  } catch (error) {
    console.error('Join error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
