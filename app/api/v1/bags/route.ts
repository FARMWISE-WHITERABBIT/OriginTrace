import { createAdminClient } from '@/lib/supabase/admin';
import { NextRequest, NextResponse } from 'next/server';
import { validateApiKey, checkRateLimit } from '@/lib/api-auth';
import { enforceTier } from '@/lib/api/tier-guard';

/**
 * GET /api/v1/bags
 * List bags (individual commodity sacks) for your organisation.
 *
 * Auth: API key with 'read' scope (Authorization: Bearer <key>)
 * Query params: limit (max 500), offset, status, grade
 */
export async function GET(request: NextRequest) {
  try {
    const auth = await validateApiKey(request);
    if (!auth.valid || !auth.orgId) {
      return NextResponse.json({ error: 'Invalid or expired API key' }, { status: 401 });
    }
    const tierError = await enforceTier(auth.orgId, 'api_access');
    if (tierError) return tierError;
    if (!auth.scopes?.includes('read')) {
      return NextResponse.json({ error: 'Insufficient scope. Required: read' }, { status: 403 });
    }
    const rateLimit = await checkRateLimit(auth.keyPrefix!, auth.rateLimitPerHour);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: 'Rate limit exceeded', retry_after: Math.ceil((rateLimit.resetAt - Date.now()) / 1000) },
        { status: 429, headers: { 'X-RateLimit-Remaining': '0', 'X-RateLimit-Reset': String(Math.ceil(rateLimit.resetAt / 1000)) } }
      );
    }

    const supabase = createAdminClient();
    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get('limit') || '100'), 500);
    const offset = parseInt(searchParams.get('offset') || '0');
    const status = searchParams.get('status');
    const grade = searchParams.get('grade');

    let query = supabase
      .from('bags')
      .select('id, bag_code, batch_id, farm_id, weight_kg, grade, commodity, status, collected_at, created_at', { count: 'exact' })
      .eq('org_id', auth.orgId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (status) query = (query as any).eq('status', status);
    if (grade) query = (query as any).eq('grade', grade);

    let result = await query;
    // weight_kg/grade/bag_code/collected_at may not exist on older DB installs — retry minimal
    if (result.error?.message?.includes('weight_kg') || result.error?.message?.includes('grade') ||
        result.error?.message?.includes('bag_code') || result.error?.message?.includes('collected_at')) {
      result = await supabase
        .from('bags')
        .select('id, batch_id, farm_id, status, created_at', { count: 'exact' })
        .eq('org_id', auth.orgId)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1) as any;
    }
    const { data, error, count } = result;
    if (error) {
      console.error('[v1/bags]', error.message);
      return NextResponse.json({ error: 'Database error' }, { status: 500 });
    }

    return NextResponse.json({
      data,
      pagination: { total: count || 0, limit, offset, has_more: (offset + limit) < (count || 0) },
    });
  } catch (err: any) {
    console.error('[v1/bags]', err?.message);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
