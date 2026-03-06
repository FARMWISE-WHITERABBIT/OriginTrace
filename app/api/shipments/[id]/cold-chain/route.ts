'use server';

import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

function createServiceClient() {
  return createClient(supabaseUrl, supabaseServiceKey);
}

async function getAuthenticatedUser(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.split(' ')[1];
  const supabase = createServiceClient();

  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) return null;

  return user;
}

async function getUserFromCookies(request: NextRequest) {
  const supabase = createServiceClient();
  const cookieHeader = request.headers.get('cookie');

  if (!cookieHeader) return null;

  const cookies = Object.fromEntries(
    cookieHeader.split(';').map(c => {
      const [key, ...val] = c.trim().split('=');
      return [key, val.join('=')];
    })
  );

  const accessToken = cookies['sb-access-token'] ||
    Object.entries(cookies).find(([k]) => k.includes('auth-token'))?.[1];

  if (!accessToken) return null;

  try {
    const { data: { user }, error } = await supabase.auth.getUser(accessToken);
    if (error || !user) return null;
    return user;
  } catch {
    return null;
  }
}

async function checkTierAccess(supabase: ReturnType<typeof createServiceClient>, orgId: number): Promise<boolean> {
  const { data: org } = await supabase
    .from('organizations')
    .select('subscription_tier, feature_flags')
    .eq('id', orgId)
    .single();
  if (!org) return false;
  const tier = org.subscription_tier || 'starter';
  const tierLevels: Record<string, number> = { starter: 0, basic: 1, pro: 2, enterprise: 3 };
  const hasFeatureFlag = org.feature_flags?.shipment_readiness === true;
  return hasFeatureFlag || (tierLevels[tier] ?? 0) >= tierLevels['pro'];
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createServiceClient();

    let user = await getAuthenticatedUser(request);
    if (!user) {
      user = await getUserFromCookies(request);
    }

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, org_id, role')
      .eq('user_id', user.id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    if (profile.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const hasAccess = await checkTierAccess(supabase, profile.org_id);
    if (!hasAccess) {
      return NextResponse.json({ error: 'Shipment Readiness requires Pro tier or above' }, { status: 403 });
    }

    const { data: logs, error } = await supabase
      .from('cold_chain_logs')
      .select('*')
      .eq('shipment_id', params.id)
      .eq('org_id', profile.org_id)
      .order('recorded_at', { ascending: false });

    if (error) {
      console.error('Error fetching cold chain logs:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const allLogs = logs || [];
    const tempLogs = allLogs.filter((l: any) => l.log_type === 'temperature' && l.value !== null);
    const values = tempLogs.map((l: any) => l.value);

    const summary = {
      avg_temp: values.length > 0 ? Math.round((values.reduce((a: number, b: number) => a + b, 0) / values.length) * 100) / 100 : null,
      min_temp: values.length > 0 ? Math.min(...values) : null,
      max_temp: values.length > 0 ? Math.max(...values) : null,
      alert_count: allLogs.filter((l: any) => l.is_alert === true).length,
      total_entries: allLogs.length,
    };

    return NextResponse.json({ logs: allLogs, summary });

  } catch (error) {
    console.error('Cold chain logs API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createServiceClient();

    let user = await getAuthenticatedUser(request);
    if (!user) {
      user = await getUserFromCookies(request);
    }

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, org_id, role')
      .eq('user_id', user.id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    if (profile.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const hasAccess = await checkTierAccess(supabase, profile.org_id);
    if (!hasAccess) {
      return NextResponse.json({ error: 'Shipment Readiness requires Pro tier or above' }, { status: 403 });
    }

    const body = await request.json();
    const { log_type, value } = body;

    if (!log_type) {
      return NextResponse.json({ error: 'Log type is required' }, { status: 400 });
    }

    const validLogTypes = ['temperature', 'humidity', 'inspection'];
    if (!validLogTypes.includes(log_type)) {
      return NextResponse.json({ error: `Log type must be one of: ${validLogTypes.join(', ')}` }, { status: 400 });
    }

    if (value === undefined || value === null) {
      return NextResponse.json({ error: 'Value is required' }, { status: 400 });
    }

    if (typeof value !== 'number') {
      return NextResponse.json({ error: 'Value must be a number' }, { status: 400 });
    }

    const defaultThresholds: Record<string, { min: number; max: number; unit: string }> = {
      temperature: { min: 15, max: 25, unit: 'celsius' },
      humidity: { min: 40, max: 70, unit: 'percent' },
    };

    const defaults = defaultThresholds[log_type];
    const thresholdMin = body.threshold_min !== undefined ? body.threshold_min : (defaults?.min ?? null);
    const thresholdMax = body.threshold_max !== undefined ? body.threshold_max : (defaults?.max ?? null);

    let isAlert = false;
    let alertMessage: string | null = null;

    if (thresholdMin !== null && value < thresholdMin) {
      isAlert = true;
      alertMessage = `${log_type} value ${value} is below minimum threshold ${thresholdMin}`;
    } else if (thresholdMax !== null && value > thresholdMax) {
      isAlert = true;
      alertMessage = `${log_type} value ${value} is above maximum threshold ${thresholdMax}`;
    }

    const insertData: Record<string, any> = {
      shipment_id: params.id,
      org_id: profile.org_id,
      recorded_by: profile.id,
      log_type,
      value,
      is_alert: isAlert,
      alert_message: alertMessage,
      threshold_min: thresholdMin,
      threshold_max: thresholdMax,
    };

    if (body.unit !== undefined) {
      insertData.unit = body.unit;
    } else if (defaults) {
      insertData.unit = defaults.unit;
    }

    if (body.location !== undefined) insertData.location = body.location;
    if (body.recorded_at !== undefined) insertData.recorded_at = body.recorded_at;

    const { data: log, error: insertError } = await supabase
      .from('cold_chain_logs')
      .insert(insertData)
      .select()
      .single();

    if (insertError) {
      console.error('Error recording cold chain log:', insertError);
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    return NextResponse.json({ log, success: true });

  } catch (error) {
    console.error('Cold chain logs API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
