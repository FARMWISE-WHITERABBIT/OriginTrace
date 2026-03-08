import { createAdminClient } from '@/lib/supabase/admin';
import { createClient as createServerClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const ALLOWED_READ_ROLES = ['admin', 'aggregator', 'agent'];

const batchContributionSchema = z.object({
  batch_id: z.number({ required_error: 'batch_id is required' }).int().positive(),
  farm_id: z.number({ required_error: 'farm_id is required' }).int().positive(),
  farmer_name: z.string().nullable().optional(),
  weight_kg: z.number().min(0).default(0),
  bag_count: z.number().int().min(0).default(0),
  notes: z.string().nullable().optional(),
});

export async function GET(request: NextRequest) {
  try {
    const supabaseAdmin = createAdminClient();

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

    if (!profile.org_id) {
      return NextResponse.json({ error: 'No organization assigned' }, { status: 403 });
    }

    if (!ALLOWED_READ_ROLES.includes(profile.role)) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
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
    const supabaseAdmin = createAdminClient();

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

    if (!profile.org_id) {
      return NextResponse.json({ error: 'No organization assigned' }, { status: 403 });
    }

    const body = await request.json();
    const parsed = batchContributionSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { batch_id, farm_id, farmer_name, weight_kg, bag_count, notes } = parsed.data;

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
        farmer_name: farmer_name ?? null,
        weight_kg,
        bag_count,
        compliance_status: complianceStatus,
        notes: notes ?? null
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
    const supabaseAdmin = createAdminClient();

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

    if (!profile.org_id) {
      return NextResponse.json({ error: 'No organization assigned' }, { status: 403 });
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
