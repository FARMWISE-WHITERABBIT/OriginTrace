/**
 * RFC 6238 TOTP implementation using Node.js crypto.
 * No external dependencies required.
 */
import crypto from 'crypto';

// ── Base32 decode ────────────────────────────────────────────────────────────
const BASE32_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

function base32Decode(input: string): Buffer {
  const str = input.toUpperCase().replace(/=+$/, '').replace(/\s/g, '');
  const result: number[] = [];
  let bits = 0;
  let bitsLeft = 0;
  for (const ch of str) {
    const idx = BASE32_CHARS.indexOf(ch);
    if (idx < 0) continue;
    bits = (bits << 5) | idx;
    bitsLeft += 5;
    if (bitsLeft >= 8) {
      bitsLeft -= 8;
      result.push((bits >> bitsLeft) & 0xff);
    }
  }
  return Buffer.from(result);
}

// ── HOTP ─────────────────────────────────────────────────────────────────────
function hotp(key: Buffer, counter: bigint): string {
  const msg = Buffer.alloc(8);
  msg.writeBigUInt64BE(counter);
  const hmac = crypto.createHmac('sha1', key).update(msg).digest();
  const offset = hmac[hmac.length - 1] & 0x0f;
  const code =
    (((hmac[offset] & 0x7f) << 24) |
      ((hmac[offset + 1] & 0xff) << 16) |
      ((hmac[offset + 2] & 0xff) << 8) |
      (hmac[offset + 3] & 0xff)) %
    1_000_000;
  return code.toString().padStart(6, '0');
}

// ── Public API ────────────────────────────────────────────────────────────────

/** Generate a random base32 TOTP secret (20 bytes → 32 chars). */
export function generateSecret(): string {
  const bytes = crypto.randomBytes(20);
  let secret = '';
  for (const byte of bytes) {
    secret += BASE32_CHARS[byte % 32];
  }
  return secret;
}

/** Verify a 6-digit TOTP token against the secret. tolerance=1 allows ±30s clock skew. */
export function verifyTOTP(token: string, secret: string, tolerance = 1): boolean {
  if (!/^\d{6}$/.test(token)) return false;
  const key = base32Decode(secret);
  const counter = BigInt(Math.floor(Date.now() / 30_000));
  for (let i = -tolerance; i <= tolerance; i++) {
    if (hotp(key, counter + BigInt(i)) === token) return true;
  }
  return false;
}

/** Build the otpauth:// URI for Google Authenticator / Authy QR scanning. */
export function getTOTPUri(secret: string, account: string, issuer = 'OriginTrace'): string {
  return `otpauth://totp/${encodeURIComponent(issuer)}:${encodeURIComponent(account)}?secret=${secret}&issuer=${encodeURIComponent(issuer)}&algorithm=SHA1&digits=6&period=30`;
}
