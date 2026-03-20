import { createAdminClient } from '@/lib/supabase/admin';
import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedProfile } from '@/lib/api-auth';
import { enforceTier } from '@/lib/api/tier-guard';
import { bagCreateSchema, parseBody } from '@/lib/api/validation';

export async function GET(request: NextRequest) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json(
        { error: 'Supabase is not properly configured' },
        { status: 500 }
      );
    }

    const { user, profile } = await getAuthenticatedProfile(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    if (!profile.org_id) return NextResponse.json({ error: 'No organization assigned' }, { status: 403 });
    const supabaseAdmin = createAdminClient();

    const tierBlock = await enforceTier(profile.org_id, 'bags');
    if (tierBlock) return tierBlock;

    const { searchParams } = new URL(request.url);
    const batchIdFilter = searchParams.get('batch_id');

    let query = supabaseAdmin
      .from('bags')
      .select('id, serial, status, collection_batch_id, weight_kg, grade, created_at, collection_batches(id, batch_id, farm_id, farms(farmer_name, community))')
      .eq('org_id', profile.org_id)
      .order('created_at', { ascending: false })
      .limit(500);

    if (batchIdFilter) {
      query = query.eq('collection_batch_id', batchIdFilter);
    }

    const { data: bags, error: bagsError } = await query;

    if (bagsError) {
      console.error('Bags fetch error:', bagsError);
      return NextResponse.json(
        { error: 'Failed to fetch bags', details: bagsError.message },
        { status: 500 }
      );
    }

    const enriched = (bags || []).map((b: any) => ({
      id: b.id,
      serial: b.serial,
      status: b.status,
      collection_batch_id: b.collection_batch_id,
      batch_id: b.collection_batches?.batch_id ?? null,
      weight_kg: b.weight_kg ?? null,
      grade: b.grade ?? null,
      farmer_name: b.collection_batches?.farms?.farmer_name ?? null,
      community: b.collection_batches?.farms?.community ?? null,
      created_at: b.created_at,
    }));

    return NextResponse.json({ bags: enriched });

  } catch (error) {
    console.error('Bags API error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.json();
    const { data: body, error: validationError } = parseBody(bagCreateSchema, rawBody);
    if (validationError) return validationError;
    const { count } = body;

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json(
        { error: 'Supabase is not properly configured' },
        { status: 500 }
      );
    }

    const { user, profile } = await getAuthenticatedProfile(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    if (!profile.org_id) return NextResponse.json({ error: 'No organization assigned' }, { status: 403 });
    const supabaseAdmin = createAdminClient();

    const bagRows = Array.from({ length: count }, () => ({
      org_id: profile.org_id,
      status: 'empty',
    }));

    const { data: createdBags, error: insertError } = await supabaseAdmin
      .from('bags')
      .insert(bagRows)
      .select('id');

    if (insertError) {
      console.error('Bags insert error:', insertError);
      return NextResponse.json({ error: 'Failed to create bags' }, { status: 500 });
    }

    return NextResponse.json({ 
      bags: createdBags,
      count: createdBags?.length || 0
    });

  } catch (error) {
    console.error('Bags create error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
