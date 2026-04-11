import { createAdminClient } from '@/lib/supabase/admin';
import { NextRequest, NextResponse } from 'next/server';
import { validateApiKey } from '@/lib/api-auth';
import { checkRateLimit } from '@/lib/api/rate-limit';
import { enforceTier } from '@/lib/api/tier-guard';

export async function GET(request: NextRequest) {
  try {
    const auth = await validateApiKey(request);
    if (!auth.valid || !auth.orgId) {
      return NextResponse.json({ error: 'Invalid or expired API key' }, { status: 401 });
    }

    const tierError = await enforceTier(auth.orgId, 'enterprise_api');
    if (tierError) return tierError;

    if (!auth.scopes?.includes('read')) {
      return NextResponse.json({ error: 'Insufficient scope. Required: read' }, { status: 403 });
    }

    const limited = await checkRateLimit(request, auth.orgId, {
      max: auth.rateLimitPerHour ?? 1000,
      windowSecs: 3600,
      keyPrefix: `apk:${auth.keyPrefix}`,
    });
    if (limited) return limited;

    const supabase = createAdminClient();

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const limit = Math.min(parseInt(searchParams.get('limit') || '100'), 500);
    const offset = parseInt(searchParams.get('offset') || '0');

    let query = supabase
      .from('shipments')
      .select('id, shipment_code, status, destination_country, destination_port, buyer_company, commodity, total_weight_kg, total_items, readiness_score, readiness_decision, estimated_ship_date, created_at', { count: 'exact' })
      .eq('org_id', auth.orgId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (status) {
      query = query.eq('status', status);
    }

    const { data: shipments, error, count } = await query;

    if (error) {
      console.error('V1 Shipments GET DB error:', error.message);
      return NextResponse.json({ error: 'Failed to fetch shipments' }, { status: 500 });
    }

    return NextResponse.json({
      data: shipments || [],
      meta: { total: count || 0, limit, offset },
    }, {
      headers: {
        'X-RateLimit-Remaining': String(rateLimit.remaining),
        'X-RateLimit-Reset': String(Math.ceil(rateLimit.resetAt / 1000)),
      },
    });
  } catch (error) {
    console.error('V1 Shipments API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
