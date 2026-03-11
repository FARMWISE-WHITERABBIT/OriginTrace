/**
 * lib/supabase/middleware.ts
 *
 * Session 8: JWT custom claims — zero DB calls per page load.
 *
 * Previous implementation made 3-4 DB round-trips on every authenticated
 * /app route:
 *   1. supabase.auth.getUser()  (network call to Supabase Auth)
 *   2. system_admins SELECT     (is superadmin?)
 *   3. profiles SELECT          (role)
 *   4. profiles + organizations SELECT (tier)
 *
 * New implementation reads role, org_id, org_tier, and is_superadmin
 * directly from the JWT app_metadata, which Supabase embeds at token
 * mint time via the custom_access_token_hook (see migrations/20260311_session8_9.sql).
 *
 * The only remaining network call is supabase.auth.getUser() — required by
 * Supabase SSR to validate the session cookie and refresh it if needed.
 * Role/tier/superadmin data comes from the already-decoded JWT, not the DB.
 *
 * Setup required (one-time, in Supabase Dashboard):
 *   Authentication → Hooks → Custom Access Token Hook
 *   Function: custom_access_token_hook
 *
 * Fallback: if claims are missing (user logged in before the hook was enabled,
 * or during a deploy), the middleware falls back to the old DB-lookup path so
 * no user is ever incorrectly blocked.
 */

import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { hasAccess, type AppRole } from '@/lib/rbac';
import { checkRouteAccess } from '@/lib/config/tier-gating';
import { createClient } from '@supabase/supabase-js';
import { verifyCookiePayload } from '@/lib/security/signed-cookie';

// ---------------------------------------------------------------------------
// JWT claim helpers
// ---------------------------------------------------------------------------

interface AppClaims {
  app_role:      string | null;
  org_id:        number | null;
  org_tier:      string | null;
  is_superadmin: boolean;
}

/** Extract custom claims from the Supabase JWT user object */
function extractClaims(user: any): AppClaims | null {
  const meta = user?.app_metadata;
  if (!meta || meta.app_role === undefined) return null; // claims not yet set

  return {
    app_role:      meta.app_role      ?? null,
    org_id:        meta.org_id        ?? null,
    org_tier:      meta.org_tier      ?? 'starter',
    is_superadmin: meta.is_superadmin ?? false,
  };
}

// ---------------------------------------------------------------------------
// DB fallback helpers (used only when JWT claims are absent)
// ---------------------------------------------------------------------------

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

async function fetchClaimsFromDb(userId: string): Promise<AppClaims> {
  const admin = getServiceClient();
  if (!admin) {
    return { app_role: null, org_id: null, org_tier: 'starter', is_superadmin: false };
  }

  const [profileResult, superadminResult] = await Promise.all([
    admin
      .from('profiles')
      .select('role, org_id')
      .eq('user_id', userId)
      .single(),
    admin
      .from('system_admins')
      .select('id')
      .eq('user_id', userId)
      .single(),
  ]);

  const role   = profileResult.data?.role   ?? null;
  const org_id = profileResult.data?.org_id ?? null;
  const is_superadmin = !!superadminResult.data;

  let org_tier = 'starter';
  if (org_id) {
    const { data: org } = await admin
      .from('organizations')
      .select('subscription_tier, settings')
      .eq('id', org_id)
      .single();

    const VALID = ['starter', 'basic', 'pro', 'enterprise'];
    const col  = org?.subscription_tier as string | undefined;
    const stg  = (org?.settings as any)?.subscription_tier as string | undefined;
    org_tier   = VALID.includes(col ?? '') ? col! : VALID.includes(stg ?? '') ? stg! : 'starter';
  }

  return { app_role: role, org_id, org_tier, is_superadmin };
}

// ---------------------------------------------------------------------------
// Main middleware
// ---------------------------------------------------------------------------

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

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
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Required: validates session, refreshes token if needed.
  // This is the only network call in the happy path.
  const { data: { user } } = await supabase.auth.getUser();

  const pathname         = request.nextUrl.pathname;
  const isAuthPage       = pathname.startsWith('/auth');
  const isApiRoute       = pathname.startsWith('/api');
  const isSuperadminPage = pathname.startsWith('/superadmin');
  const isSuperadminLogin = pathname === '/superadmin/login';
  const isResetPasswordPage = pathname === '/auth/reset-password';
  const isPublicPage =
    ['/', '/solutions', '/pedigree', '/demo', '/processors', '/api-docs', '/superadmin/login'].includes(pathname) ||
    pathname.startsWith('/verify') ||
    pathname.startsWith('/compliance') ||
    pathname.startsWith('/industries') ||
    pathname.startsWith('/legal') ||
    pathname.startsWith('/pedigree');

  // API routes do their own auth
  if (isApiRoute) return supabaseResponse;

  // Unauthenticated redirect
  if (!user && !isAuthPage && !isPublicPage && !isResetPasswordPage) {
    const url = request.nextUrl.clone();
    url.pathname = '/auth/login';
    return NextResponse.redirect(url);
  }

  if (!user) return supabaseResponse;

  // ── Authenticated path ──────────────────────────────────────────────────
  // Try JWT claims first (zero DB calls). Fall back to DB if claims absent
  // (e.g. user signed in before the hook was enabled).

  let claims = extractClaims(user);
  if (!claims) {
    claims = await fetchClaimsFromDb(user.id);
  }

  const { is_superadmin, app_role, org_tier } = claims;
  const role = app_role as AppRole | null;

  const isVerifyEmailPage = pathname === '/auth/verify-email';

  // Email verification gate
  if (!is_superadmin && pathname.startsWith('/app') && !user.email_confirmed_at) {
    const url = request.nextUrl.clone();
    url.pathname = '/auth/verify-email';
    url.searchParams.set('email', user.email || '');
    return NextResponse.redirect(url);
  }

  // Redirect away from auth pages
  if (isAuthPage && !isVerifyEmailPage) {
    const url = request.nextUrl.clone();
    url.pathname = is_superadmin ? '/superadmin' : '/app';
    return NextResponse.redirect(url);
  }

  // Superadmin section gate
  if (isSuperadminPage && !isSuperadminLogin) {
    if (!is_superadmin) {
      const url = request.nextUrl.clone();
      url.pathname = '/app';
      return NextResponse.redirect(url);
    }
  }

  // Superadmin impersonation check on /app
  if (pathname.startsWith('/app') && is_superadmin) {
    const impersonationCookie = request.cookies.get('origintrace_impersonation');
    let isImpersonating = false;
    if (impersonationCookie) {
      try {
        const impData = await verifyCookiePayload(impersonationCookie.value) as any;
        if (impData && new Date(impData.expires_at) > new Date()) {
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

  // Role + tier gates on /app
  if (pathname.startsWith('/app') && !is_superadmin) {
    if (role === 'farmer' && !pathname.startsWith('/app/farmer')) {
      const url = request.nextUrl.clone();
      url.pathname = '/app/farmer';
      return NextResponse.redirect(url);
    }
    if (role && !hasAccess(role, pathname)) {
      const url = request.nextUrl.clone();
      url.pathname =
        role === 'buyer'  ? '/app/buyer' :
        role === 'farmer' ? '/app/farmer' : '/app';
      return NextResponse.redirect(url);
    }

    const tierAccess = checkRouteAccess(org_tier ?? 'starter', pathname);
    if (!tierAccess.allowed) {
      const url = request.nextUrl.clone();
      url.pathname = '/app';
      url.searchParams.set('tier_required', tierAccess.requiredTier || '');
      return NextResponse.redirect(url);
    }
  }

  return supabaseResponse;
}
