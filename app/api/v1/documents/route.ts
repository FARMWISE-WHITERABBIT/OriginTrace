import { createAdminClient } from '@/lib/supabase/admin';
import { NextRequest, NextResponse } from 'next/server';
import { validateApiKey } from '@/lib/api-auth';
import { checkRateLimit } from '@/lib/api/rate-limit';
import { enforceTier } from '@/lib/api/tier-guard';

/**
 * GET /api/v1/documents
 * List compliance documents (phytosanitary certificates, lab reports, etc.).
 *
 * Auth: API key with 'read' scope (Authorization: Bearer <key>)
 * Query params: limit (max 500), offset, type, status
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
    const document_type = searchParams.get('type');
    const status = searchParams.get('status');

    let query = supabase
      .from('documents')
      .select('id, title, document_type, issued_date, expiry_date, status, file_url, file_name, notes, linked_entity_type, linked_entity_id, created_at', { count: 'exact' })
      .eq('org_id', auth.orgId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (document_type) query = (query as any).eq('document_type', document_type);
    if (status) query = (query as any).eq('status', status);

    const { data, error, count } = await query;
    if (error) {
      console.error('[v1/documents]', error.message);
      return NextResponse.json({ error: 'Database error' }, { status: 500 });
    }

    return NextResponse.json({
      data,
      pagination: { total: count || 0, limit, offset, has_more: (offset + limit) < (count || 0) },
    });
  } catch (err: any) {
    console.error('[v1/documents]', err?.message);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
