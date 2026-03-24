import { type NextRequest, NextResponse } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip session update for the marketing root — avoids slow Supabase call for crawlers
  if (pathname === '/') {
    return NextResponse.next();
  }

  return await updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Run middleware on all app/auth/api routes that need session handling.
     *
     * Excluded:
     *   Static/infra : _next, monitoring, favicon, robots.txt, sitemap.xml, assets
     *   Marketing    : /solutions, /pedigree, /processors, /demo, /api-docs
     *                  /compliance(/*), /industries(/*), /legal(/*)
     *                  /blog(/*) — all blog posts
     *   Public tools : /verify(/*)
     */
    '/((?!monitoring|_next/static|_next/image|favicon\\.ico|robots\\.txt|sitemap\\.xml|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$|solutions|pedigree|processors|demo|api-docs|compliance|industries|legal|verify|blog).*)',
  ],
};
