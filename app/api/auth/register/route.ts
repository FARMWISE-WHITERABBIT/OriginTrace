import { createAdminClient } from '@/lib/supabase/admin';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password, fullName, orgName } = body;

    // Validate inputs
    if (!email || !password || !fullName || !orgName) {
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

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json(
        { error: 'Supabase is not properly configured. Please add the service role key.' },
        { status: 500 }
      );
    }

    // Use service role client for secure admin operations
    const supabaseAdmin = createAdminClient();

    // 1. Create the user account using admin API
    // email_confirm: false requires user to verify email before accessing /app
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: false,
      user_metadata: { full_name: fullName }
    });

    if (authError || !authData.user) {
      console.error('Auth error:', authError);
      return NextResponse.json(
        { error: authError?.message || 'Failed to create user account' },
        { status: 400 }
      );
    }

    const userId = authData.user.id;

    // 2. Create the organization (using service role bypasses RLS)
    const slug = orgName.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-');
    
    let inviteCode = '';
    for (let attempt = 0; attempt < 10; attempt++) {
      const candidate = String(Math.floor(100000 + Math.random() * 900000));
      const { data: existing } = await supabaseAdmin
        .from('organizations')
        .select('id')
        .eq('invite_code', candidate)
        .maybeSingle();
      if (!existing) {
        inviteCode = candidate;
        break;
      }
    }
    if (!inviteCode) {
      inviteCode = String(Math.floor(100000 + Math.random() * 900000));
    }

    const { data: orgData, error: orgError } = await supabaseAdmin
      .from('organizations')
      .insert({
        name: orgName,
        slug: `${slug}-${Date.now().toString(36)}`,
        subscription_status: 'trial',
        invite_code: inviteCode,
      })
      .select()
      .single();

    if (orgError || !orgData) {
      console.error('Org error:', orgError);
      // Cleanup: delete the created user
      await supabaseAdmin.auth.admin.deleteUser(userId);
      return NextResponse.json(
        { error: 'Failed to create organization' },
        { status: 500 }
      );
    }

    // 3. Create the user profile (as admin of their org)
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .insert({
        user_id: userId,
        org_id: orgData.id,
        role: 'admin',
        full_name: fullName,
      });

    if (profileError) {
      console.error('Profile error:', profileError);
      // Cleanup: delete org and user
      await supabaseAdmin.from('organizations').delete().eq('id', orgData.id);
      await supabaseAdmin.auth.admin.deleteUser(userId);
      return NextResponse.json(
        { error: 'Failed to create user profile' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      userId,
      orgId: orgData.id,
      message: 'Account created successfully'
    });

  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
