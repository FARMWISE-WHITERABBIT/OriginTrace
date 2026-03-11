/**
 * HMAC-SHA256 cookie signing for the impersonation cookie.
 *
 * Format: <base64url(payload)>.<base64url(hmac-sha256(payload, secret))>
 *
 * The secret is read from IMPERSONATION_COOKIE_SECRET env var.
 * Falls back to NEXTAUTH_SECRET if not set (so existing deployments don't break).
 * Throws if neither is available — impersonation should fail closed, not open.
 */

function getSecret(): string {
  const secret = process.env.IMPERSONATION_COOKIE_SECRET || process.env.NEXTAUTH_SECRET;
  if (!secret) {
    throw new Error('IMPERSONATION_COOKIE_SECRET is not configured');
  }
  return secret;
}

async function hmac(payload: string, secret: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(payload));
  return Buffer.from(sig).toString('base64url');
}

/** Sign a JSON payload and return a tamper-evident cookie value. */
export async function signCookiePayload(data: Record<string, unknown>): Promise<string> {
  const secret = getSecret();
  const payload = Buffer.from(JSON.stringify(data)).toString('base64url');
  const signature = await hmac(payload, secret);
  return `${payload}.${signature}`;
}

/** Verify a signed cookie value. Returns the parsed payload or null if invalid. */
export async function verifyCookiePayload<T = Record<string, unknown>>(
  value: string
): Promise<T | null> {
  try {
    const secret = getSecret();
    const dotIndex = value.lastIndexOf('.');
    if (dotIndex === -1) return null;

    const payload = value.slice(0, dotIndex);
    const signature = value.slice(dotIndex + 1);

    // Constant-time comparison via re-signing
    const expectedSig = await hmac(payload, secret);
    if (signature !== expectedSig) return null;

    return JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as T;
  } catch {
    return null;
  }
}
