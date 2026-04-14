import { NextRequest, NextResponse } from 'next/server';

/**
 * Next.js Middleware
 *
 * Security: IP allowlist for the /superadmin/* route namespace.
 *
 * Set SUPERADMIN_ALLOWED_IPS as a comma-separated list of CIDRs or exact IPs.
 * Example: "203.0.113.1,10.0.0.0/8"
 *
 * If the env var is unset or empty, the restriction is DISABLED (dev-friendly default).
 * In production, always set SUPERADMIN_ALLOWED_IPS.
 */

/** Parse the client's real IP from the request, honouring Vercel/Cloudflare headers. */
function getClientIp(request: NextRequest): string {
  const forwarded =
    request.headers.get('x-forwarded-for') ??
    request.headers.get('x-real-ip') ??
    request.headers.get('cf-connecting-ip');

  if (forwarded) {
    // x-forwarded-for may be comma-separated; take the first (leftmost) entry
    return forwarded.split(',')[0].trim();
  }

  // Fallback — not available in Edge Runtime but harmless
  return '127.0.0.1';
}

/** Convert a CIDR string (e.g. "10.0.0.0/8") to a matcher function. */
function makeCidrMatcher(cidr: string): (ip: string) => boolean {
  if (!cidr.includes('/')) {
    // Exact IP match
    return (ip: string) => ip === cidr;
  }

  const [networkStr, prefixStr] = cidr.split('/');
  const prefix = parseInt(prefixStr, 10);
  const networkParts = networkStr.split('.').map(Number);
  const networkInt =
    (networkParts[0] << 24) |
    (networkParts[1] << 16) |
    (networkParts[2] << 8) |
    networkParts[3];
  const mask = prefix === 0 ? 0 : (~0 << (32 - prefix)) >>> 0;

  return (ip: string) => {
    const parts = ip.split('.').map(Number);
    if (parts.length !== 4 || parts.some(isNaN)) return false;
    const ipInt =
      ((parts[0] << 24) |
       (parts[1] << 16) |
       (parts[2] << 8) |
       parts[3]) >>> 0;
    return (ipInt & mask) === (networkInt & mask);
  };
}

/** Parse the SUPERADMIN_ALLOWED_IPS env var into a list of matchers. */
function buildAllowlist(raw: string): Array<(ip: string) => boolean> {
  return raw
    .split(',')
    .map(s => s.trim())
    .filter(Boolean)
    .map(makeCidrMatcher);
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Only guard superadmin routes (pages and API)
  const isSuperadminRoute =
    pathname.startsWith('/superadmin') || pathname.startsWith('/api/superadmin');

  if (!isSuperadminRoute) return NextResponse.next();

  // The login page is always accessible (pre-auth)
  if (pathname === '/superadmin/login') return NextResponse.next();

  const allowedIpsRaw = process.env.SUPERADMIN_ALLOWED_IPS ?? '';
  if (!allowedIpsRaw.trim()) {
    // Restriction disabled — allow all (dev / staging without the env var set)
    return NextResponse.next();
  }

  const clientIp = getClientIp(request);
  const matchers = buildAllowlist(allowedIpsRaw);
  const allowed = matchers.some(match => match(clientIp));

  if (!allowed) {
    // Return a minimal 403 — don't leak that this is a superadmin route
    return new NextResponse(null, { status: 403 });
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/superadmin/:path*',
    '/api/superadmin/:path*',
  ],
};
