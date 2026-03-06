import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

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
  const publicPages = ['/', '/solutions', '/pedigree', '/demo', '/processors', '/superadmin/login'];
  const isPublicPage = publicPages.includes(pathname) || pathname.startsWith('/verify');
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
  }

  return supabaseResponse;
}

async function checkIsSuperadmin(supabase: any, userId: string): Promise<boolean> {
  const { data } = await supabase
    .from('system_admins')
    .select('id')
    .eq('user_id', userId)
    .single();
  return !!data;
}
