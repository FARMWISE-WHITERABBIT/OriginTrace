import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient, getAuthenticatedProfile, checkTierAccess } from '@/lib/api-auth';
import { coldChainLogSchema, parseBody } from '@/lib/api/validation';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createServiceClient();

    const { user, profile } = await getAuthenticatedProfile(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    if (!profile.org_id) return NextResponse.json({ error: 'No organization assigned' }, { status: 403 });

    const shipmentRoles = ['admin', 'logistics_coordinator', 'compliance_officer'];
    if (!shipmentRoles.includes(profile.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
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

    const { user, profile } = await getAuthenticatedProfile(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    if (!profile.org_id) return NextResponse.json({ error: 'No organization assigned' }, { status: 403 });

    const shipmentRoles = ['admin', 'logistics_coordinator', 'compliance_officer'];
    if (!shipmentRoles.includes(profile.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const hasAccess = await checkTierAccess(supabase, profile.org_id);
    if (!hasAccess) {
      return NextResponse.json({ error: 'Shipment Readiness requires Pro tier or above' }, { status: 403 });
    }

    const rawBody = await request.json();
    const { data: body, error: validationError } = parseBody(coldChainLogSchema, rawBody);
    if (validationError) return validationError;
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
