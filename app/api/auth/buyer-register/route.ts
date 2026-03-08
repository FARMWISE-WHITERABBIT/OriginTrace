import { createAdminClient } from '@/lib/supabase/admin';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password, fullName, companyName, country, contactEmail } = body;

    if (!email || !password || !fullName || !companyName) {
      return NextResponse.json(
        { error: 'Email, password, full name, and company name are required' },
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
        { error: 'Supabase is not properly configured' },
        { status: 500 }
      );
    }

    const supabaseAdmin = createAdminClient();

    const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: false,
      user_metadata: { full_name: fullName, account_type: 'buyer' }
    });

    if (authError || !authUser.user) {
      const message = authError?.message || 'Could not create user account';
      return NextResponse.json({ error: message }, { status: 400 });
    }

    const slug = companyName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 50);

    const { data: buyerOrg, error: orgError } = await supabaseAdmin
      .from('buyer_organizations')
      .insert({
        name: companyName,
        slug: `${slug}-${Date.now().toString(36)}`,
        country: country || null,
        contact_email: contactEmail || email,
        settings: {}
      })
      .select()
      .single();

    if (orgError || !buyerOrg) {
      await supabaseAdmin.auth.admin.deleteUser(authUser.user.id);
      return NextResponse.json(
        { error: 'Failed to create buyer organization' },
        { status: 500 }
      );
    }

    const { error: profileError } = await supabaseAdmin
      .from('buyer_profiles')
      .insert({
        user_id: authUser.user.id,
        buyer_org_id: buyerOrg.id,
        full_name: fullName,
        role: 'buyer_admin'
      });

    if (profileError) {
      await supabaseAdmin.from('buyer_organizations').delete().eq('id', buyerOrg.id);
      await supabaseAdmin.auth.admin.deleteUser(authUser.user.id);
      return NextResponse.json(
        { error: 'Failed to create buyer profile' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Buyer account created. Please check your email to verify your account.',
      user: { id: authUser.user.id, email: authUser.user.email }
    });

  } catch (err) {
    console.error('Buyer registration error:', err);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
