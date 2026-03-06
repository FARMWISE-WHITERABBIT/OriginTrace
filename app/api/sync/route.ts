'use server';

import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

function createServiceClient() {
  return createClient(supabaseUrl, supabaseServiceKey);
}

async function getAuthenticatedUser(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return null;
  }
  
  const token = authHeader.split(' ')[1];
  const supabase = createServiceClient();
  
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) return null;
  
  return user;
}

async function getUserFromCookies(request: NextRequest) {
  const supabase = createServiceClient();
  const cookieHeader = request.headers.get('cookie');
  
  if (!cookieHeader) return null;
  
  const cookies = Object.fromEntries(
    cookieHeader.split(';').map(c => {
      const [key, ...val] = c.trim().split('=');
      return [key, val.join('=')];
    })
  );
  
  const accessToken = cookies['sb-access-token'] || 
    Object.entries(cookies).find(([k]) => k.includes('auth-token'))?.[1];
  
  if (!accessToken) return null;
  
  try {
    const { data: { user }, error } = await supabase.auth.getUser(accessToken);
    if (error || !user) return null;
    return user;
  } catch {
    return null;
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = createServiceClient();
    
    let user = await getAuthenticatedUser(request);
    if (!user) {
      user = await getUserFromCookies(request);
    }
    
    if (!user) {
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
    
    if (profile.role === 'admin' || profile.role === 'aggregator') {
      const { data: syncStatus, error } = await supabase
        .from('agent_sync_status')
        .select(`
          *,
          agent:profiles(id, full_name, role)
        `)
        .eq('org_id', profile.org_id)
        .order('last_seen_at', { ascending: false });
      
      if (error) {
        console.error('Sync status fetch error:', error);
        return NextResponse.json({ error: 'Failed to fetch sync status' }, { status: 500 });
      }
      
      return NextResponse.json({ sync_status: syncStatus || [] });
    } else {
      const { data: syncStatus, error } = await supabase
        .from('agent_sync_status')
        .select('*')
        .eq('agent_id', profile.id)
        .order('last_seen_at', { ascending: false })
        .limit(1);
      
      if (error) {
        console.error('Sync status fetch error:', error);
        return NextResponse.json({ error: 'Failed to fetch sync status' }, { status: 500 });
      }
      
      return NextResponse.json({ sync_status: syncStatus?.[0] || null });
    }
    
  } catch (error) {
    console.error('Sync API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createServiceClient();
    
    let user = await getAuthenticatedUser(request);
    if (!user) {
      user = await getUserFromCookies(request);
    }
    
    if (!user) {
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
    const { device_id, pending_batches, pending_bags, app_version, is_online } = body;
    
    const { data: syncStatus, error } = await supabase
      .from('agent_sync_status')
      .upsert({
        org_id: profile.org_id,
        agent_id: profile.id,
        device_id: device_id || 'web',
        last_seen_at: new Date().toISOString(),
        pending_batches: pending_batches || 0,
        pending_bags: pending_bags || 0,
        app_version: app_version || '1.0.0',
        is_online: is_online !== false
      }, {
        onConflict: 'agent_id,device_id'
      })
      .select()
      .single();
    
    if (error) {
      console.error('Error updating sync status:', error);
      return NextResponse.json({ error: 'Failed to update sync status' }, { status: 500 });
    }
    
    return NextResponse.json({ sync_status: syncStatus, success: true });
    
  } catch (error) {
    console.error('Sync API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const supabase = createServiceClient();
    
    let user = await getAuthenticatedUser(request);
    if (!user) {
      user = await getUserFromCookies(request);
    }
    
    if (!user) {
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
    const { batches } = body;
    
    if (!batches || !Array.isArray(batches)) {
      return NextResponse.json({ error: 'Batches array required' }, { status: 400 });
    }
    
    const results = [];
    
    for (const batch of batches) {
      const { local_id, batch_id, farm_id, commodity, state, lga, community, gps_lat, gps_lng, contributors, bags, notes, collected_at } = batch;
      
      const { data: existingBatch } = await supabase
        .from('collection_batches')
        .select('id')
        .eq('local_id', local_id)
        .eq('org_id', profile.org_id)
        .single();
      
      if (existingBatch) {
        results.push({ local_id, status: 'already_synced', id: existingBatch.id });
        continue;
      }
      
      const totalWeight = contributors?.reduce((sum: number, c: any) => sum + (c.weight_kg || 0), 0) 
        || bags?.reduce((sum: number, bag: any) => sum + (bag.weight || 0), 0) || 0;
      const bagCount = contributors?.reduce((sum: number, c: any) => sum + (c.bag_count || 0), 0) 
        || bags?.length || 0;
      
      const parsedFarmId = farm_id && farm_id !== 'unknown' ? (parseInt(farm_id) || null) : null;
      
      const { data: newBatch, error: batchError } = await supabase
        .from('collection_batches')
        .insert({
          org_id: profile.org_id,
          farm_id: parsedFarmId || 0,
          agent_id: user.id,
          batch_id: batch_id || null,
          status: 'collecting',
          commodity: commodity || null,
          gps_lat: gps_lat || null,
          gps_lng: gps_lng || null,
          estimated_bags: bagCount,
          estimated_weight: totalWeight || null,
          total_weight: totalWeight,
          bag_count: bagCount,
          notes,
          local_id,
          synced_at: new Date().toISOString()
        })
        .select()
        .single();
      
      if (batchError) {
        console.error('Batch sync error:', batchError);
        results.push({ local_id, status: 'error', error: 'Failed to sync batch' });
        continue;
      }
      
      if (contributors && contributors.length > 0) {
        for (const contrib of contributors) {
          if (contrib.bag_count > 0) {
            try {
              await supabase
                .from('batch_contributions')
                .insert({
                  batch_id: newBatch.id,
                  farm_id: parseInt(contrib.farm_id) || null,
                  farmer_name: contrib.farmer_name,
                  weight_kg: contrib.weight_kg,
                  bag_count: contrib.bag_count,
                  org_id: profile.org_id,
                });
            } catch {}
          }
        }
      }
      
      if (bags && bags.length > 0) {
        for (const bag of bags) {
          if (bag.serial) {
            await supabase
              .from('bags')
              .update({
                collection_batch_id: newBatch.id,
                weight_kg: bag.weight,
                grade: bag.grade,
                status: 'collected'
              })
              .eq('id', bag.serial)
              .eq('org_id', profile.org_id);
          }
        }
      }
      
      results.push({ local_id, status: 'synced', id: newBatch.id });
    }
    
    await supabase
      .from('agent_sync_status')
      .update({ 
        pending_batches: 0, 
        pending_bags: 0,
        last_seen_at: new Date().toISOString()
      })
      .eq('agent_id', profile.id);
    
    return NextResponse.json({ results, success: true });
    
  } catch (error) {
    console.error('Sync API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
