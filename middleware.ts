import { type NextRequest } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';

export async function middleware(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Run middleware ONLY on routes that need auth/session handling.
     * Explicitly exclude all marketing pages so Googlebot never triggers
     * the Supabase updateSession() call on public pages — a slow or failing
     * Supabase call would return 5xx to the crawler and block indexing.
     *
     * Excluded (bypass middleware entirely):
     *   Static/infra : _next, monitoring, favicon, robots.txt, sitemap.xml, assets
     *   Marketing    : /, /solutions, /pedigree, /processors, /demo, /api-docs
     *                  /compliance(/*), /industries(/*), /legal(/*)
     *   Public tool  : /verify(/*)
     */
    '/((?!$|monitoring|_next/static|_next/image|favicon\\.ico|robots\\.txt|sitemap\\.xml|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$|solutions|pedigree|processors|demo|api-docs|compliance|industries|legal|verify).*)',
  ],
};
