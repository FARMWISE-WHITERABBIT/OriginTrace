import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { NextResponse, type NextRequest } from 'next/server';
import { hasAccess, type AppRole } from '@/lib/rbac';
import { checkRouteAccess } from '@/lib/config/tier-gating';

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return supabaseResponse;
  }

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;
  const isAuthPage = pathname.startsWith('/auth');
  const publicPages = ['/', '/solutions', '/pedigree', '/demo', '/processors', '/api-docs', '/superadmin/login'];
  const isPublicPage = publicPages.includes(pathname) || pathname.startsWith('/verify') || pathname.startsWith('/compliance') || pathname.startsWith('/industries') || pathname.startsWith('/legal') || pathname.startsWith('/pedigree');
  const isResetPasswordPage = pathname === '/auth/reset-password';
  const isApiRoute = pathname.startsWith('/api');
  const isSuperadminPage = pathname.startsWith('/superadmin');
  const isSuperadminLogin = pathname === '/superadmin/login';

  if (isApiRoute) {
    return supabaseResponse;
  }

  if (!user && !isAuthPage && !isPublicPage && !isResetPasswordPage) {
    const url = request.nextUrl.clone();
    url.pathname = '/auth/login';
    return NextResponse.redirect(url);
  }

  if (user) {
    const isSuperadmin = await checkIsSuperadmin(supabase, user.id);

    const isVerifyEmailPage = pathname === '/auth/verify-email';

    if (!isSuperadmin && pathname.startsWith('/app') && !user.email_confirmed_at) {
      const url = request.nextUrl.clone();
      url.pathname = '/auth/verify-email';
      url.searchParams.set('email', user.email || '');
      return NextResponse.redirect(url);
    }

    if (isAuthPage && !isVerifyEmailPage) {
      const url = request.nextUrl.clone();
      url.pathname = isSuperadmin ? '/superadmin' : '/app';
      return NextResponse.redirect(url);
    }

    if (isSuperadminPage && !isSuperadminLogin) {
      if (!isSuperadmin) {
        const url = request.nextUrl.clone();
        url.pathname = '/app';
        return NextResponse.redirect(url);
      }
    }

    if (pathname.startsWith('/app') && isSuperadmin) {
      const impersonationCookie = request.cookies.get('origintrace_impersonation');
      let isImpersonating = false;
      if (impersonationCookie) {
        try {
          const impData = JSON.parse(impersonationCookie.value);
          if (new Date(impData.expires_at) > new Date()) {
            isImpersonating = true;
          }
        } catch {}
      }
      if (!isImpersonating) {
        const url = request.nextUrl.clone();
        url.pathname = '/superadmin';
        return NextResponse.redirect(url);
      }
    }

    if (pathname.startsWith('/app') && !isSuperadmin) {
      const role = await getUserRole(supabase, user.id);
      if (role === 'farmer' && !pathname.startsWith('/app/farmer')) {
        const url = request.nextUrl.clone();
        url.pathname = '/app/farmer';
        return NextResponse.redirect(url);
      }
      if (role && !hasAccess(role, pathname)) {
        const url = request.nextUrl.clone();
        url.pathname = role === 'buyer' ? '/app/buyer' : role === 'farmer' ? '/app/farmer' : '/app';
        return NextResponse.redirect(url);
      }

      const orgTier = await getOrgTier(supabase, user.id);
      const tierAccess = checkRouteAccess(orgTier, pathname);
      if (!tierAccess.allowed) {
        const url = request.nextUrl.clone();
        url.pathname = '/app';
        url.searchParams.set('tier_required', tierAccess.requiredTier || '');
        return NextResponse.redirect(url);
      }
    }
  }

  return supabaseResponse;
}

async function checkIsSuperadmin(_supabase: any, userId: string): Promise<boolean> {
  const admin = getServiceClient();
  if (!admin) return false;
  const { data } = await admin
    .from('system_admins')
    .select('id')
    .eq('user_id', userId)
    .single();
  return !!data;
}

async function getUserRole(_supabase: any, userId: string): Promise<AppRole | null> {
  try {
    const admin = getServiceClient();
    if (!admin) return null;
    const { data } = await admin
      .from('profiles')
      .select('role')
      .eq('user_id', userId)
      .single();
    return (data?.role as AppRole) || null;
  } catch {
    return null;
  }
}

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

async function getOrgTier(_supabase: any, userId: string): Promise<string | undefined> {
  try {
    const admin = getServiceClient();
    if (!admin) return undefined;
    const { data: profile, error: profileError } = await admin
      .from('profiles')
      .select('org_id')
      .eq('user_id', userId)
      .single();
    if (profileError) {
      console.error('[middleware] getOrgTier profile error:', profileError.message);
      return undefined;
    }
    if (!profile?.org_id) return undefined;
    const { data: org, error: orgError } = await admin
      .from('organizations')
      .select('subscription_tier, settings')
      .eq('id', profile.org_id)
      .single();
    if (orgError) {
      console.error('[middleware] getOrgTier org error:', orgError.message);
      return undefined;
    }
    if (!org) return undefined;
    const VALID_TIERS = ['starter', 'basic', 'pro', 'enterprise'];
    const columnTier = org.subscription_tier as string | undefined;
    const settingsTier = ((org.settings as import('@/lib/types/organization').OrganizationSettings) || {}).subscription_tier as string | undefined;
    const resolved = VALID_TIERS.includes(columnTier ?? '') ? columnTier : VALID_TIERS.includes(settingsTier ?? '') ? settingsTier : 'starter';
    return resolved;
  } catch (err: any) {
    console.error('[middleware] getOrgTier exception:', err?.message);
    return undefined;
  }
}
