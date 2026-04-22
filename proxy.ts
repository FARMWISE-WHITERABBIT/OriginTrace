import { type NextRequest, NextResponse } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';

// ── Superadmin IP allowlist ────────────────────────────────────────────────────
// Set SUPERADMIN_ALLOWED_IPS as a comma-separated list of CIDRs or exact IPs.
// e.g. "203.0.113.1,10.0.0.0/8"
// Leave unset (or empty) to disable the restriction (dev-friendly default).

function getClientIp(request: NextRequest): string {
  const forwarded =
    request.headers.get('x-forwarded-for') ??
    request.headers.get('x-real-ip') ??
    request.headers.get('cf-connecting-ip');
  return forwarded ? forwarded.split(',')[0].trim() : '127.0.0.1';
}

function ipMatchesCidr(ip: string, cidr: string): boolean {
  if (!cidr.includes('/')) return ip === cidr;
  const [networkStr, prefixStr] = cidr.split('/');
  const prefix = parseInt(prefixStr, 10);
  const toInt = (s: string) => s.split('.').reduce((acc, o) => (acc << 8) + parseInt(o, 10), 0) >>> 0;
  const mask = prefix === 0 ? 0 : (~0 << (32 - prefix)) >>> 0;
  return (toInt(ip) & mask) === (toInt(networkStr) & mask);
}

function isSuperadminIpAllowed(ip: string): boolean {
  const raw = process.env.SUPERADMIN_ALLOWED_IPS ?? '';
  if (!raw.trim()) return true; // unrestricted when env var not set
  return raw.split(',').map(s => s.trim()).filter(Boolean).some(cidr => ipMatchesCidr(ip, cidr));
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip session update for the marketing root — avoids slow Supabase call for crawlers
  if (pathname === '/') {
    return NextResponse.next();
  }

  // Superadmin IP restriction — applied to all /superadmin/* and /api/superadmin/* routes
  // except the login page (which must always be reachable pre-auth)
  const isSuperadminRoute =
    pathname.startsWith('/superadmin') || pathname.startsWith('/api/superadmin');
  const isLoginPage = pathname === '/superadmin/login';

  if (isSuperadminRoute && !isLoginPage) {
    const clientIp = getClientIp(request);
    if (!isSuperadminIpAllowed(clientIp)) {
      return new NextResponse(null, { status: 403 });
    }
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
    '/((?!monitoring|_next/static|_next/image|favicon\\.ico|robots\\.txt|sitemap\\.xml|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$|solutions|pedigree|processors|demo|api-docs|compliance|industries|legal|verify|blog|events).*)',
  ],
};
