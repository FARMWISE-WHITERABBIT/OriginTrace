import { createAdminClient } from '@/lib/supabase/admin';
import { NextRequest, NextResponse } from 'next/server';
import { validateApiKey } from '@/lib/api-auth';
import { checkRateLimit } from '@/lib/api/rate-limit';
import { enforceTier } from '@/lib/api/tier-guard';

/**
 * GET /api/v1/yield-predictions
 * List AI-generated yield predictions for farms in your organisation.
 *
 * Auth: API key with 'read' scope (Authorization: Bearer <key>)
 * Query params: limit (max 500), offset, commodity, season
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
    const limited = await checkRateLimit(request, auth.orgId, {
      max: auth.rateLimitPerHour ?? 1000,
      windowSecs: 3600,
      keyPrefix: `apk:${auth.keyPrefix}`,
    });
    if (limited) return limited;

    const supabase = createAdminClient();
    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get('limit') || '100'), 500);
    const offset = parseInt(searchParams.get('offset') || '0');
    const commodity = searchParams.get('commodity');
    const season = searchParams.get('season');

    let query = supabase
      .from('yield_predictions')
      .select('id, farm_id, commodity, predicted_yield_kg, confidence_score, prediction_date, season, created_at', { count: 'exact' })
      .eq('org_id', auth.orgId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (commodity) query = (query as any).eq('commodity', commodity);
    if (season) query = (query as any).eq('season', season);

    const { data, error, count } = await query;
    if (error) {
      console.error('[v1/yield-predictions]', error.message);
      return NextResponse.json({ error: 'Database error' }, { status: 500 });
    }

    return NextResponse.json({
      data,
      pagination: { total: count || 0, limit, offset, has_more: (offset + limit) < (count || 0) },
    });
  } catch (err: any) {
    console.error('[v1/yield-predictions]', err?.message);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
