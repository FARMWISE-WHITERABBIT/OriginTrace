import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import { validateApiKey, checkRateLimit } from '@/lib/api-auth';
import { z } from 'zod';
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
    const status = searchParams.get('status');
    const limit = Math.min(parseInt(searchParams.get('limit') || '100'), 500);
    const offset = parseInt(searchParams.get('offset') || '0');

    let query = supabase
      .from('collection_batches')
      .select('id, farm_id, agent_id, status, total_weight, bag_count, notes, collected_at, created_at', { count: 'exact' })
      .eq('org_id', auth.orgId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (status) {
      query = query.eq('status', status);
    }

    const { data: batches, error, count } = await query;

    if (error) {
      console.error('V1 Batches GET DB error:', error.message);
      return NextResponse.json({ error: 'Failed to fetch batches' }, { status: 500 });
    }

    return NextResponse.json({
      data: batches || [],
      meta: { total: count || 0, limit, offset },
    }, {
      headers: {
        'X-RateLimit-Remaining': String(rateLimit.remaining),
        'X-RateLimit-Reset': String(Math.ceil(rateLimit.resetAt / 1000)),
      },
    });
  } catch (error) {
    console.error('V1 Batches API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

const createBatchSchema = z.object({
  farm_id: z.number().int().positive(),
  agent_id: z.string().uuid(),
  status: z.string().optional().default('collecting'),
  total_weight: z.number().optional().default(0),
  bag_count: z.number().int().optional().default(0),
  notes: z.string().optional(),
  commodity: z.string().optional(),
  batch_id: z.string().optional(),
  gps_lat: z.number().optional(),
  gps_lng: z.number().optional(),
  estimated_bags: z.number().int().optional(),
  estimated_weight: z.number().optional(),
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
    const parsed = createBatchSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Validation failed', details: parsed.error.flatten().fieldErrors }, { status: 400 });
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    const { data: farm } = await supabase
      .from('farms')
      .select('id')
      .eq('id', parsed.data.farm_id)
      .eq('org_id', auth.orgId)
      .single();

    if (!farm) {
      return NextResponse.json({ error: 'Farm not found or does not belong to your organization' }, { status: 404 });
    }

    const { data: batch, error } = await supabase
      .from('collection_batches')
      .insert({
        org_id: auth.orgId,
        farm_id: parsed.data.farm_id,
        agent_id: parsed.data.agent_id,
        status: parsed.data.status,
        total_weight: String(parsed.data.total_weight),
        bag_count: parsed.data.bag_count,
        notes: parsed.data.notes || null,
        commodity: parsed.data.commodity || null,
        batch_id: parsed.data.batch_id || null,
        gps_lat: parsed.data.gps_lat != null ? String(parsed.data.gps_lat) : null,
        gps_lng: parsed.data.gps_lng != null ? String(parsed.data.gps_lng) : null,
        estimated_bags: parsed.data.estimated_bags || null,
        estimated_weight: parsed.data.estimated_weight != null ? String(parsed.data.estimated_weight) : null,
      })
      .select()
      .single();

    if (error) {
      console.error('V1 Batches POST DB error:', error.message);
      return NextResponse.json({ error: 'Failed to create batch' }, { status: 500 });
    }

    return NextResponse.json({ data: batch }, {
      status: 201,
      headers: {
        'X-RateLimit-Remaining': String(rateLimit.remaining),
        'X-RateLimit-Reset': String(Math.ceil(rateLimit.resetAt / 1000)),
      },
    });
  } catch (error) {
    console.error('V1 Batches POST API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
