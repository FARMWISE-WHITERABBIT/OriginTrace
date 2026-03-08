import { createAdminClient } from '@/lib/supabase/admin';
import { createClient as createServerClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json(
        { error: 'Supabase is not properly configured' },
        { status: 500 }
      );
    }

    const supabase = await createServerClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    const supabaseAdmin = createAdminClient();

    let profileResult: { data: any; error: any };
    let systemAdminResult: { data: any; error: any };

    try {
      [profileResult, systemAdminResult] = await Promise.all([
        supabaseAdmin
          .from('profiles')
          .select('*, organizations(*)')
          .eq('user_id', user.id)
          .single(),
        supabaseAdmin
          .from('system_admins')
          .select('id')
          .eq('user_id', user.id)
          .single()
      ]);
    } catch (fetchError) {
      console.error('Profile fetch error (Supabase may be temporarily unavailable):', fetchError);
      return NextResponse.json(
        { error: 'Service temporarily unavailable, please try again' },
        { status: 503 }
      );
    }

    if (profileResult.error && profileResult.error.code !== 'PGRST116') {
      if (profileResult.error.message?.includes('503') || profileResult.error.message?.includes('unavailable')) {
        return NextResponse.json(
          { error: 'Service temporarily unavailable, please try again' },
          { status: 503 }
        );
      }
    }

    const isSystemAdmin = !!systemAdminResult.data;
    const profile = profileResult.data;

    if (!profile && !isSystemAdmin) {
      return NextResponse.json(
        { error: 'No profile found', details: profileResult.error?.message },
        { status: 404 }
      );
    }

    if (!profile && isSystemAdmin) {
      return NextResponse.json({
        profile: {
          user_id: user.id,
          full_name: user.email || 'System Admin',
          email: user.email,
          role: 'superadmin',
        },
        organization: null,
        isSystemAdmin: true
      });
    }

    return NextResponse.json({
      profile,
      organization: profile?.organizations || null,
      isSystemAdmin
    });

  } catch (error) {
    console.error('Profile API error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Strict validation: only allow full_name field
    if (typeof body !== 'object' || body === null) {
      return NextResponse.json(
        { error: 'Invalid request body' },
        { status: 400 }
      );
    }
    
    const { full_name } = body;
    
    // Validate full_name is a string between 2 and 100 characters
    if (typeof full_name !== 'string' || full_name.trim().length < 2 || full_name.trim().length > 100) {
      return NextResponse.json(
        { error: 'Full name must be between 2 and 100 characters' },
        { status: 400 }
      );
    }

    // Reject any extra fields to prevent privilege escalation
    const allowedFields = ['full_name'];
    const extraFields = Object.keys(body).filter(key => !allowedFields.includes(key));
    if (extraFields.length > 0) {
      return NextResponse.json(
        { error: 'Invalid fields provided' },
        { status: 400 }
      );
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json(
        { error: 'Supabase is not properly configured' },
        { status: 500 }
      );
    }

    const supabase = await createServerClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    const supabaseAdmin = createAdminClient();

    // Only update the validated full_name field
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .update({ full_name: full_name.trim() })
      .eq('user_id', user.id)
      .select('*, organizations(*)')
      .single();

    if (profileError) {
      console.error('Profile update error:', profileError);
      return NextResponse.json(
        { error: 'Failed to update profile', details: profileError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      profile,
      organization: profile?.organizations || null
    });

  } catch (error) {
    console.error('Profile update error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
