import { createClient } from '@supabase/supabase-js';
import { createClient as createServerClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function GET(request: NextRequest) {
  try {
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('org_id, role')
      .eq('user_id', user.id)
      .single();

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    const batchId = request.nextUrl.searchParams.get('batch_id');
    if (!batchId) {
      return NextResponse.json({ error: 'batch_id required' }, { status: 400 });
    }

    const { data: batch } = await supabaseAdmin
      .from('collection_batches')
      .select('id, org_id')
      .eq('id', batchId)
      .eq('org_id', profile.org_id)
      .single();

    if (!batch) {
      return NextResponse.json({ error: 'Batch not found' }, { status: 404 });
    }

    const { data: contributions, error } = await supabaseAdmin
      .from('batch_contributions')
      .select('*')
      .eq('batch_id', parseInt(batchId))
      .order('created_at', { ascending: true });

    if (error) {
      if (error.code === '42P01') {
        return NextResponse.json({ contributions: [], table_missing: true });
      }
      throw error;
    }

    return NextResponse.json({ contributions: contributions || [] });
  } catch (error) {
    console.error('Batch contributions GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('org_id, role')
      .eq('user_id', user.id)
      .single();

    if (!profile || !['admin', 'aggregator'].includes(profile.role)) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const body = await request.json();
    const { batch_id, farm_id, farmer_name, weight_kg, bag_count, notes } = body;

    if (!batch_id || !farm_id) {
      return NextResponse.json({ error: 'batch_id and farm_id required' }, { status: 400 });
    }

    const { data: batch } = await supabaseAdmin
      .from('collection_batches')
      .select('id, org_id, status')
      .eq('id', batch_id)
      .eq('org_id', profile.org_id)
      .single();

    if (!batch) {
      return NextResponse.json({ error: 'Batch not found' }, { status: 404 });
    }

    if (batch.status !== 'collecting') {
      return NextResponse.json({ error: 'Batch is not in collecting status' }, { status: 400 });
    }

    const { data: farm } = await supabaseAdmin
      .from('farms')
      .select('id, compliance_status')
      .eq('id', farm_id)
      .eq('org_id', profile.org_id)
      .single();

    if (!farm) {
      return NextResponse.json({ error: 'Farm not found' }, { status: 404 });
    }

    const complianceStatus = farm.compliance_status === 'verified' ? 'verified' : 'pending';

    const { data: contribution, error } = await supabaseAdmin
      .from('batch_contributions')
      .insert({
        batch_id,
        farm_id,
        farmer_name: farmer_name || null,
        weight_kg: weight_kg || 0,
        bag_count: bag_count || 0,
        compliance_status: complianceStatus,
        notes: notes || null
      })
      .select()
      .single();

    if (error) {
      console.error('Insert contribution error:', error);
      return NextResponse.json({ error: 'Failed to add contribution' }, { status: 500 });
    }

    const { data: allContributions } = await supabaseAdmin
      .from('batch_contributions')
      .select('weight_kg, bag_count')
      .eq('batch_id', batch_id);

    if (allContributions) {
      const totalWeight = allContributions.reduce((sum, c) => sum + (parseFloat(c.weight_kg) || 0), 0);
      const totalBags = allContributions.reduce((sum, c) => sum + (c.bag_count || 0), 0);

      await supabaseAdmin
        .from('collection_batches')
        .update({
          total_weight: totalWeight.toString(),
          bag_count: totalBags
        })
        .eq('id', batch_id);
    }

    return NextResponse.json({ contribution });
  } catch (error) {
    console.error('Batch contributions POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('org_id, role')
      .eq('user_id', user.id)
      .single();

    if (!profile || !['admin', 'aggregator'].includes(profile.role)) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const contributionId = request.nextUrl.searchParams.get('id');
    if (!contributionId) {
      return NextResponse.json({ error: 'id required' }, { status: 400 });
    }

    const { data: contribution } = await supabaseAdmin
      .from('batch_contributions')
      .select('batch_id')
      .eq('id', contributionId)
      .single();

    if (!contribution) {
      return NextResponse.json({ error: 'Contribution not found' }, { status: 404 });
    }

    const { error } = await supabaseAdmin
      .from('batch_contributions')
      .delete()
      .eq('id', contributionId);

    if (error) throw error;

    const { data: remaining } = await supabaseAdmin
      .from('batch_contributions')
      .select('weight_kg, bag_count')
      .eq('batch_id', contribution.batch_id);

    const totalWeight = (remaining || []).reduce((sum, c) => sum + (parseFloat(c.weight_kg) || 0), 0);
    const totalBags = (remaining || []).reduce((sum, c) => sum + (c.bag_count || 0), 0);

    await supabaseAdmin
      .from('collection_batches')
      .update({
        total_weight: totalWeight.toString(),
        bag_count: totalBags
      })
      .eq('id', contribution.batch_id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Batch contributions DELETE error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
