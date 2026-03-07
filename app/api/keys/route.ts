import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';
import { createClient as createServerClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

function createServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

async function getAuthProfile(supabaseAdmin: ReturnType<typeof createServiceClient>) {
  const supabase = await createServerClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return null;

  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('id, org_id, role, user_id')
    .eq('user_id', user.id)
    .single();

  if (!profile || profile.role !== 'admin') return null;
  return profile;
}

export async function GET() {
  try {
    const supabaseAdmin = createServiceClient();
    const profile = await getAuthProfile(supabaseAdmin);
    if (!profile) {
      return NextResponse.json({ error: 'Unauthorized or admin access required' }, { status: 401 });
    }

    const { data: keys, error } = await supabaseAdmin
      .from('api_keys')
      .select('id, key_prefix, name, scopes, last_used_at, status, expires_at, rate_limit_per_hour, created_at')
      .eq('org_id', profile.org_id)
      .order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ keys: keys || [] });
  } catch (error) {
    console.error('API keys GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabaseAdmin = createServiceClient();
    const profile = await getAuthProfile(supabaseAdmin);
    if (!profile) {
      return NextResponse.json({ error: 'Unauthorized or admin access required' }, { status: 401 });
    }

    const body = await request.json();
    const { name, scopes, expires_in_days, rate_limit_per_hour } = body;

    if (!name) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }

    const rawKey = crypto.randomBytes(32).toString('hex');
    const keyPrefix = rawKey.substring(0, 8);
    const keyHash = crypto.createHash('sha256').update(rawKey).digest('hex');

    const insertData: Record<string, unknown> = {
      org_id: profile.org_id,
      key_hash: keyHash,
      key_prefix: keyPrefix,
      name,
      scopes: scopes || ['read'],
      created_by: profile.user_id,
      status: 'active',
    };

    if (rate_limit_per_hour) {
      insertData.rate_limit_per_hour = rate_limit_per_hour;
    }

    if (expires_in_days) {
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + expires_in_days);
      insertData.expires_at = expiresAt.toISOString();
    }

    const { data: apiKey, error } = await supabaseAdmin
      .from('api_keys')
      .insert(insertData)
      .select('id, key_prefix, name, scopes, status, expires_at, rate_limit_per_hour, created_at')
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      key: apiKey,
      secret: rawKey,
      message: 'Store this key securely. It will not be shown again.',
    });
  } catch (error) {
    console.error('API keys POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const supabaseAdmin = createServiceClient();
    const profile = await getAuthProfile(supabaseAdmin);
    if (!profile) {
      return NextResponse.json({ error: 'Unauthorized or admin access required' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const keyId = searchParams.get('id');

    if (!keyId) {
      return NextResponse.json({ error: 'Key ID is required' }, { status: 400 });
    }

    const { data: existing } = await supabaseAdmin
      .from('api_keys')
      .select('id, org_id')
      .eq('id', keyId)
      .single();

    if (!existing || existing.org_id !== profile.org_id) {
      return NextResponse.json({ error: 'API key not found' }, { status: 404 });
    }

    const { error } = await supabaseAdmin
      .from('api_keys')
      .update({ status: 'revoked' })
      .eq('id', keyId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: 'API key revoked' });
  } catch (error) {
    console.error('API keys DELETE error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
