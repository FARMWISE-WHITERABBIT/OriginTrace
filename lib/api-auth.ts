import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';
import { NextRequest } from 'next/server';

interface ApiKeyValidation {
  valid: boolean;
  orgId?: string;
  scopes?: string[];
  keyPrefix?: string;
  rateLimitPerHour?: number;
}

const rateLimitStore = new Map<string, { count: number; resetAt: number }>();

export async function validateApiKey(request: NextRequest): Promise<ApiKeyValidation> {
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return { valid: false };
  }

  const token = authHeader.split(' ')[1];
  if (!token) {
    return { valid: false };
  }

  const keyHash = crypto.createHash('sha256').update(token).digest('hex');

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    return { valid: false };
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: apiKey, error } = await supabase
    .from('api_keys')
    .select('id, org_id, key_prefix, scopes, status, expires_at, rate_limit_per_hour')
    .eq('key_hash', keyHash)
    .single();

  if (error || !apiKey) {
    return { valid: false };
  }

  if (apiKey.status !== 'active') {
    return { valid: false };
  }

  if (apiKey.expires_at && new Date(apiKey.expires_at) < new Date()) {
    return { valid: false };
  }

  await supabase
    .from('api_keys')
    .update({ last_used_at: new Date().toISOString() })
    .eq('id', apiKey.id);

  const scopes = Array.isArray(apiKey.scopes) ? apiKey.scopes : ['read'];

  return {
    valid: true,
    orgId: apiKey.org_id,
    scopes,
    keyPrefix: apiKey.key_prefix,
    rateLimitPerHour: apiKey.rate_limit_per_hour || 1000,
  };
}

export function checkRateLimit(keyPrefix: string, limitPerHour: number = 1000): { allowed: boolean; remaining: number; resetAt: number } {
  const now = Date.now();
  const key = `rate:${keyPrefix}`;
  const entry = rateLimitStore.get(key);

  if (!entry || now >= entry.resetAt) {
    const resetAt = now + 3600000;
    rateLimitStore.set(key, { count: 1, resetAt });
    return { allowed: true, remaining: limitPerHour - 1, resetAt };
  }

  if (entry.count >= limitPerHour) {
    return { allowed: false, remaining: 0, resetAt: entry.resetAt };
  }

  entry.count += 1;
  rateLimitStore.set(key, entry);
  return { allowed: true, remaining: limitPerHour - entry.count, resetAt: entry.resetAt };
}
