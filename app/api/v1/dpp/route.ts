import { createAdminClient } from '@/lib/supabase/admin';
import { NextRequest, NextResponse } from 'next/server';
import { validateApiKey, checkRateLimit } from '@/lib/api-auth';
import { enforceTier } from '@/lib/api/tier-guard';

/**
 * GET /api/v1/dpp
 * List Digital Product Passports (EUDR DPP).
 *
 * Auth: API key with 'read' scope (Authorization: Bearer <key>)
 * Query params: limit (max 500), offset, status, category
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
    const product_category = searchParams.get('category');

    let query = supabase
      .from('digital_product_passports')
      .select('id, dpp_code, product_category, origin_country, status, verify_url, qr_code_url, issued_at, created_at', { count: 'exact' })
      .eq('org_id', auth.orgId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (status) query = (query as any).eq('status', status);
    if (product_category) query = (query as any).eq('product_category', product_category);

    const { data, error, count } = await query;
    if (error) {
      console.error('[v1/dpp]', error.message);
      return NextResponse.json({ error: 'Database error' }, { status: 500 });
    }

    return NextResponse.json({
      data,
      pagination: { total: count || 0, limit, offset, has_more: (offset + limit) < (count || 0) },
    });
  } catch (err: any) {
    console.error('[v1/dpp]', err?.message);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
