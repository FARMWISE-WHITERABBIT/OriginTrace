import { createClient as createServerClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { NextRequest, NextResponse } from 'next/server';
import { profileUpdateSchema, parseBody } from '@/lib/api/validation';
import { cookies } from 'next/headers';
import { verifyCookiePayload } from '@/lib/security/signed-cookie';

const IMPERSONATION_COOKIE = 'origintrace_impersonation';

async function readImpersonationState() {
  try {
    const cookieStore = await cookies();
    const impersonationCookie = cookieStore.get(IMPERSONATION_COOKIE);
    if (!impersonationCookie) return { isImpersonating: false };

    const payload = await verifyCookiePayload<{
      org_id?: number;
      org_name?: string;
      original_admin_id?: string;
      expires_at?: string;
    }>(impersonationCookie.value);

    if (!payload?.org_id || !payload.expires_at || new Date(payload.expires_at) <= new Date()) {
      return { isImpersonating: false };
    }

    return {
      isImpersonating: true,
      orgId: payload.org_id,
      orgName: payload.org_name,
      originalAdminId: payload.original_admin_id,
      expiresAt: payload.expires_at,
    };
  } catch {
    return { isImpersonating: false };
  }
}

function normalizeBuyerProfile(buyerProfile: any, buyerOrganization: any, userEmail?: string | null) {
  return {
    id: buyerProfile.id,
    user_id: buyerProfile.user_id,
    full_name: buyerProfile.full_name || userEmail || 'Buyer',
    email: userEmail,
    role: 'buyer',
    org_id: buyerProfile.buyer_org_id,
    buyer_org_id: buyerProfile.buyer_org_id,
    buyer_role: buyerProfile.role,
    organizations: buyerOrganization || null,
  };
}

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

    const [profileResult, systemAdminResult] = await Promise.all([
      supabaseAdmin
        .from('profiles')
        .select('*, organizations(*)')
        .eq('user_id', user.id)
        .maybeSingle(),
      supabaseAdmin
        .from('system_admins')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle()
    ]);

    if (profileResult.error) {
      console.error('Profile fetch error:', profileResult.error);
      return NextResponse.json(
        { error: 'Service temporarily unavailable, please try again' },
        { status: 503 }
      );
    }

    if (systemAdminResult.error) {
      console.error('System admin fetch error:', systemAdminResult.error);
      return NextResponse.json(
        { error: 'Service temporarily unavailable, please try again' },
        { status: 503 }
      );
    }

    const isSystemAdmin = !!systemAdminResult.data;
    const impersonation = await readImpersonationState();
    let profile = profileResult.data;
    let organization = profile?.organizations || null;

    if (!profile && !isSystemAdmin) {
      const { data: buyerProfile, error: buyerProfileError } = await supabaseAdmin
        .from('buyer_profiles')
        .select('id, buyer_org_id, role, user_id, full_name')
        .eq('user_id', user.id)
        .maybeSingle();

      if (buyerProfileError) {
        console.error('Buyer profile fetch error:', buyerProfileError);
        return NextResponse.json(
          { error: 'Service temporarily unavailable, please try again' },
          { status: 503 }
        );
      }

      if (buyerProfile) {
        const { data: buyerOrganization } = await supabaseAdmin
          .from('buyer_organizations')
          .select('*')
          .eq('id', buyerProfile.buyer_org_id)
          .maybeSingle();

        profile = normalizeBuyerProfile(buyerProfile, buyerOrganization, user.email);
        organization = buyerOrganization || null;
      }
    }

    if (!profile && !isSystemAdmin) {
      return NextResponse.json(
        { error: 'No profile found' },
        { status: 404 }
      );
    }

    if (isSystemAdmin && impersonation.isImpersonating && impersonation.orgId) {
      const { data: impersonatedOrg, error: impersonatedOrgError } = await supabaseAdmin
        .from('organizations')
        .select('*')
        .eq('id', impersonation.orgId)
        .maybeSingle();

      if (impersonatedOrgError) {
        console.error('Impersonated organization fetch error:', impersonatedOrgError);
        return NextResponse.json(
          { error: 'Service temporarily unavailable, please try again' },
          { status: 503 }
        );
      }

      if (impersonatedOrg) {
        organization = impersonatedOrg;
      }
    }

    if (!profile && isSystemAdmin) {
      return NextResponse.json({
        profile: {
          user_id: user.id,
          full_name: user.email || 'System Admin',
          email: user.email,
          role: 'superadmin',
        },
        organization,
        isSystemAdmin: true,
        impersonation
      });
    }

    return NextResponse.json({
      profile,
      organization,
      isSystemAdmin,
      impersonation
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
    const rawBody = await request.json();
    const { data: body, error: validationError } = parseBody(profileUpdateSchema, rawBody);
    if (validationError) return validationError;
    
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

    // Only update the validated full_name field.
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .update({ full_name: full_name.trim() })
      .eq('user_id', user.id)
      .select('*, organizations(*)')
      .maybeSingle();

    if (profileError) {
      console.error('Profile update error:', profileError);
      return NextResponse.json(
        { error: 'Failed to update profile', details: profileError.message },
        { status: 500 }
      );
    }

    if (profile) {
      return NextResponse.json({
        profile,
        organization: profile?.organizations || null
      });
    }

    const { data: buyerProfile, error: buyerProfileError } = await supabaseAdmin
      .from('buyer_profiles')
      .update({ full_name: full_name.trim() })
      .eq('user_id', user.id)
      .select('id, buyer_org_id, role, user_id, full_name')
      .maybeSingle();

    if (buyerProfileError) {
      console.error('Buyer profile update error:', buyerProfileError);
      return NextResponse.json(
        { error: 'Failed to update buyer profile', details: buyerProfileError.message },
        { status: 500 }
      );
    }

    if (!buyerProfile) {
      return NextResponse.json(
        { error: 'Profile not found' },
        { status: 404 }
      );
    }

    const { data: buyerOrganization } = await supabaseAdmin
      .from('buyer_organizations')
      .select('*')
      .eq('id', buyerProfile.buyer_org_id)
      .maybeSingle();

    const normalizedBuyerProfile = normalizeBuyerProfile(buyerProfile, buyerOrganization, user.email);

    return NextResponse.json({
      profile: normalizedBuyerProfile,
      organization: buyerOrganization || null
    });

  } catch (error) {
    console.error('Profile update error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
