import { createClient } from '@supabase/supabase-js';
import { createClient as createServerClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

function createServiceClient() {
  return createClient(supabaseUrl, supabaseServiceKey);
}


export async function GET(request: NextRequest) {
  try {
    const supabase = createServiceClient();
    
    const authClient = await createServerClient();
    const { data: { user }, error: userError } = await authClient.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, org_id, role')
      .eq('user_id', user.id)
      .single();
    
    if (profileError || !profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }
    
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const farmId = searchParams.get('farm_id');
    const agentId = searchParams.get('agent_id');
    
    let query = supabase
      .from('collection_batches')
      .select(`
        *,
        farm:farms(id, farmer_name, community),
        agent:profiles(id, full_name)
      `)
      .eq('org_id', profile.org_id)
      .order('created_at', { ascending: false });
    
    if (status) {
      query = query.eq('status', status);
    }
    
    if (farmId) {
      query = query.eq('farm_id', farmId);
    }
    
    if (agentId) {
      query = query.eq('agent_id', agentId);
    }
    
    if (profile.role === 'agent') {
      query = query.eq('agent_id', profile.id);
    }
    
    const { data: batches, error } = await query;
    
    if (error) {
      console.error('Error fetching batches:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    
    return NextResponse.json({ batches: batches || [] });
    
  } catch (error) {
    console.error('Batches API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createServiceClient();
    
    const authClient = await createServerClient();
    const { data: { user }, error: userError } = await authClient.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, org_id, role')
      .eq('user_id', user.id)
      .single();
    
    if (profileError || !profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }
    
    const body = await request.json();
    const { farm_id, bags, notes, local_id, collected_at } = body;
    
    if (!farm_id) {
      return NextResponse.json({ error: 'Farm ID is required' }, { status: 400 });
    }
    
    const { data: farm, error: farmError } = await supabase
      .from('farms')
      .select('id')
      .eq('id', farm_id)
      .eq('org_id', profile.org_id)
      .single();
    
    if (farmError || !farm) {
      return NextResponse.json({ error: 'Farm not found' }, { status: 404 });
    }
    
    const totalWeight = bags?.reduce((sum: number, bag: any) => sum + (bag.weight || 0), 0) || 0;
    const bagCount = bags?.length || 0;
    
    const { data: batch, error: batchError } = await supabase
      .from('collection_batches')
      .insert({
        org_id: profile.org_id,
        farm_id,
        agent_id: profile.id,
        status: 'collecting',
        total_weight: totalWeight,
        bag_count: bagCount,
        notes,
        local_id,
        collected_at: collected_at || new Date().toISOString(),
        synced_at: new Date().toISOString()
      })
      .select()
      .single();
    
    if (batchError) {
      console.error('Error creating batch:', batchError);
      return NextResponse.json({ error: batchError.message }, { status: 500 });
    }
    
    if (bags && bags.length > 0) {
      for (const bag of bags) {
        if (bag.serial) {
          await supabase
            .from('bags')
            .update({
              collection_batch_id: batch.id,
              weight: bag.weight,
              grade: bag.grade,
              is_compliant: bag.is_compliant !== false,
              status: 'collected'
            })
            .eq('serial', bag.serial)
            .eq('org_id', profile.org_id);
        }
      }
    }
    
    return NextResponse.json({ batch, success: true });
    
  } catch (error) {
    console.error('Batches API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const supabase = createServiceClient();
    
    const authClient = await createServerClient();
    const { data: { user }, error: userError } = await authClient.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, org_id, role')
      .eq('user_id', user.id)
      .single();
    
    if (profileError || !profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }
    
    const body = await request.json();
    const { id, status, notes, total_weight, bag_count } = body;
    
    if (!id) {
      return NextResponse.json({ error: 'Batch ID is required' }, { status: 400 });
    }
    
    const updateData: Record<string, any> = {};
    if (status) updateData.status = status;
    if (notes !== undefined) updateData.notes = notes;
    if (total_weight !== undefined) updateData.total_weight = total_weight;
    if (bag_count !== undefined) updateData.bag_count = bag_count;
    
    const { data: batch, error } = await supabase
      .from('collection_batches')
      .update(updateData)
      .eq('id', id)
      .eq('org_id', profile.org_id)
      .select('*, farms(farmer_name, phone)')
      .single();
    
    if (error) {
      console.error('Error updating batch:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    
    return NextResponse.json({ batch, success: true });
    
  } catch (error) {
    console.error('Batches API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
