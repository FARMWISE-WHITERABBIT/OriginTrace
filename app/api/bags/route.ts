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

    const { data: bags, error: bagsError } = await supabaseAdmin
      .from('bags')
      .select('id, serial, status, batch_id, created_at')
      .eq('org_id', profile.org_id)
      .order('created_at', { ascending: false })
      .limit(500);

    if (bagsError) {
      console.error('Bags fetch error:', bagsError);
      return NextResponse.json(
        { error: 'Failed to fetch bags', details: bagsError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ bags: bags || [] });

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
