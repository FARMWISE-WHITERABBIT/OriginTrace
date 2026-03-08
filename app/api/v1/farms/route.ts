import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import { validateApiKey, checkRateLimit } from '@/lib/api-auth';
import { enforceTier } from '@/lib/api/tier-guard';
import { z } from 'zod';

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

    const rateLimit = await checkRateLimit(auth.keyPrefix!, auth.rateLimitPerHour);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: 'Rate limit exceeded', retry_after: Math.ceil((rateLimit.resetAt - Date.now()) / 1000) },
        { status: 429, headers: { 'X-RateLimit-Remaining': '0', 'X-RateLimit-Reset': String(Math.ceil(rateLimit.resetAt / 1000)) } }
      );
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    const { searchParams } = new URL(request.url);
    const complianceStatus = searchParams.get('compliance_status');
    const limit = Math.min(parseInt(searchParams.get('limit') || '100'), 500);
    const offset = parseInt(searchParams.get('offset') || '0');

    let query = supabase
      .from('farms')
      .select('id, farmer_name, farmer_id, phone, community, area_hectares, commodity, compliance_status, created_at', { count: 'exact' })
      .eq('org_id', auth.orgId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (complianceStatus) {
      query = query.eq('compliance_status', complianceStatus);
    }

    const { data: farms, error, count } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      data: farms || [],
      meta: { total: count || 0, limit, offset },
    }, {
      headers: {
        'X-RateLimit-Remaining': String(rateLimit.remaining),
        'X-RateLimit-Reset': String(Math.ceil(rateLimit.resetAt / 1000)),
      },
    });
  } catch (error) {
    console.error('V1 Farms API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

const createFarmSchema = z.object({
  farmer_name: z.string().min(1),
  boundary: z.any(),
  location_id: z.number().int().optional(),
  legality_doc_url: z.string().url().optional(),
  commodity: z.string().optional().default('cocoa'),
  area_hectares: z.number().positive().optional(),
  community: z.string().optional(),
  consent_timestamp: z.string().optional(),
  consent_photo_url: z.string().url().optional(),
  consent_signature: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const auth = await validateApiKey(request);
    if (!auth.valid || !auth.orgId) {
      return NextResponse.json({ error: 'Invalid or expired API key' }, { status: 401 });
    }

    const tierError = await enforceTier(auth.orgId, 'enterprise_api');
    if (tierError) return tierError;

    if (!auth.scopes?.includes('write')) {
      return NextResponse.json({ error: 'Insufficient scope. Required: write' }, { status: 403 });
    }

    const rateLimit = await checkRateLimit(auth.keyPrefix!, auth.rateLimitPerHour);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: 'Rate limit exceeded', retry_after: Math.ceil((rateLimit.resetAt - Date.now()) / 1000) },
        { status: 429, headers: { 'X-RateLimit-Remaining': '0', 'X-RateLimit-Reset': String(Math.ceil(rateLimit.resetAt / 1000)) } }
      );
    }

    const body = await request.json();
    const parsed = createFarmSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Validation failed', details: parsed.error.flatten().fieldErrors }, { status: 400 });
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    const { data: farm, error } = await supabase
      .from('farms')
      .insert({
        org_id: auth.orgId,
        farmer_name: parsed.data.farmer_name,
        boundary: parsed.data.boundary,
        location_id: parsed.data.location_id || null,
        legality_doc_url: parsed.data.legality_doc_url || null,
        commodity: parsed.data.commodity,
        area_hectares: parsed.data.area_hectares != null ? String(parsed.data.area_hectares) : null,
        community: parsed.data.community || null,
        consent_timestamp: parsed.data.consent_timestamp || null,
        consent_photo_url: parsed.data.consent_photo_url || null,
        consent_signature: parsed.data.consent_signature || null,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data: farm }, {
      status: 201,
      headers: {
        'X-RateLimit-Remaining': String(rateLimit.remaining),
        'X-RateLimit-Reset': String(Math.ceil(rateLimit.resetAt / 1000)),
      },
    });
  } catch (error) {
    console.error('V1 Farms POST API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
