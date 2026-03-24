import { type NextRequest, NextResponse } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';

export async function middleware(request: NextRequest) {
  // Subdomain rewrite: events.origintrace.trade/ → /events/yexdep
  const hostname = request.headers.get('host') ?? '';
  if (hostname.startsWith('events.') && request.nextUrl.pathname === '/') {
    return NextResponse.rewrite(new URL('/events/yexdep', request.url));
  }

  return await updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Run middleware ONLY on routes that need auth/session handling.
     * Explicitly exclude all marketing/public pages so Googlebot never triggers
     * the Supabase updateSession() call — a slow/failing call returns 5xx to
     * the crawler and blocks indexing.
     *
     * Excluded (bypass middleware entirely):
     *   Static/infra : _next, monitoring, favicon, robots.txt, sitemap.xml, assets
     *   Marketing    : /, /solutions, /pedigree, /processors, /demo, /api-docs
     *                  /compliance(/*), /industries(/*), /legal(/*)
     *                  /blog(/*) — all blog posts
     *   Public tools : /verify(/*)
     *   Events       : /events(/*)
     */
    '/((?!$|monitoring|_next/static|_next/image|favicon\\.ico|robots\\.txt|sitemap\\.xml|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$|solutions|pedigree|processors|demo|api-docs|compliance|industries|legal|verify|blog|events).*)',
  ],
};
