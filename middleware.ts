import { type NextRequest, NextResponse } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';

export async function middleware(request: NextRequest) {
  const hostname = request.headers.get('host') ?? '';
  const { pathname } = request.nextUrl;

  // Subdomain rewrite: events.origintrace.trade → /events/yexdep
  if (hostname.startsWith('events.')) {
    if (pathname === '/') {
      return NextResponse.rewrite(new URL('/events/yexdep', request.url));
    }
    // Pass through all other events subdomain paths without session handling
    return NextResponse.next();
  }

  // Skip session update for the marketing root — avoids slow Supabase call for crawlers
  if (pathname === '/') {
    return NextResponse.next();
  }

  return await updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Run middleware on:
     *   / — needed for events subdomain rewrite
     *   All app/auth/api routes that need session handling
     *
     * Excluded from session handling (but still matched for subdomain rewrite):
     *   Static/infra : _next, monitoring, favicon, robots.txt, sitemap.xml, assets
     *   Marketing    : /solutions, /pedigree, /processors, /demo, /api-docs
     *                  /compliance(/*), /industries(/*), /legal(/*)
     *                  /blog(/*) — all blog posts
     *   Public tools : /verify(/*)
     *   Events       : /events(/*)
     */
    '/((?!monitoring|_next/static|_next/image|favicon\\.ico|robots\\.txt|sitemap\\.xml|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$|solutions|pedigree|processors|demo|api-docs|compliance|industries|legal|verify|blog|events).*)',
  ],
};
