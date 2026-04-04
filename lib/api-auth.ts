import crypto from 'crypto';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { NextRequest } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient as createServerClient } from '@/lib/supabase/server';

export function createServiceClient() {
  return createAdminClient();
}

export async function getAuthenticatedUser(request?: NextRequest) {
  if (request) {
    const authHeader = request.headers.get('authorization');
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      const supabase = createServiceClient();
      const { data: { user }, error } = await supabase.auth.getUser(token);
      if (!error && user) return user;
    }
  }
  const supabase = await createServerClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return null;
  return user;
}

export async function getAuthenticatedProfile(request?: NextRequest) {
  const user = await getAuthenticatedUser(request);
  if (!user) return { user: null, profile: null };

  const supabase = createServiceClient();
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('id, org_id, role, user_id, full_name')
    .eq('user_id', user.id)
    .single();

  if (error || !profile) return { user, profile: null };
  return { user, profile };
}

export async function checkTierAccess(supabase: ReturnType<typeof createServiceClient>, orgId: number): Promise<boolean> {
  const { data: org } = await supabase
    .from('organizations')
    .select('subscription_tier, settings')
    .eq('id', orgId)
    .single();
  if (!org) return false;
  // subscription_tier is a top-level column; settings JSONB may also carry overrides
  const settings = (org as any).settings || {};
  const featureFlags = settings.feature_flags || {};
  const hasFeatureFlag = featureFlags.shipment_readiness === true;
  // Read tier from top-level column; null/unset → no billing configured → full access
  const tier = (org as any).subscription_tier || settings.subscription_tier;
  if (!tier) return true; // no tier set → grant access
  const tierLevels: Record<string, number> = { starter: 0, basic: 1, pro: 2, enterprise: 3 };
  return hasFeatureFlag || (tierLevels[tier] ?? 0) >= tierLevels['pro'];
}

interface ApiKeyValidation {
  valid: boolean;
  orgId?: string;
  scopes?: string[];
  keyPrefix?: string;
  rateLimitPerHour?: number;
}

function getServiceSupabase(): SupabaseClient | null {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !supabaseServiceKey) return null;
  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

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

  const supabase = getServiceSupabase();
  if (!supabase) {
    return { valid: false };
  }

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

export async function checkRateLimit(keyPrefix: string, limitPerHour: number = 1000): Promise<{ allowed: boolean; remaining: number; resetAt: number }> {
  const supabase = getServiceSupabase();
  if (!supabase) {
    return { allowed: true, remaining: limitPerHour - 1, resetAt: Date.now() + 3600000 };
  }

  const now = new Date();
  const windowEnd = new Date(now.getTime() + 3600000);

  const { data: existing } = await supabase
    .from('api_rate_limits')
    .select('request_count, window_end')
    .eq('key_prefix', keyPrefix)
    .single();

  if (!existing || new Date(existing.window_end) <= now) {
    await supabase
      .from('api_rate_limits')
      .upsert({
        key_prefix: keyPrefix,
        request_count: 1,
        window_start: now.toISOString(),
        window_end: windowEnd.toISOString(),
      }, { onConflict: 'key_prefix' });

    return { allowed: true, remaining: limitPerHour - 1, resetAt: windowEnd.getTime() };
  }

  if (existing.request_count >= limitPerHour) {
    return { allowed: false, remaining: 0, resetAt: new Date(existing.window_end).getTime() };
  }

  const newCount = existing.request_count + 1;
  await supabase
    .from('api_rate_limits')
    .update({ request_count: newCount })
    .eq('key_prefix', keyPrefix);

  return {
    allowed: true,
    remaining: limitPerHour - newCount,
    resetAt: new Date(existing.window_end).getTime(),
  };
}
