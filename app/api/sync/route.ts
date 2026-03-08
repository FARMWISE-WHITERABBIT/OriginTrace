import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createServiceClient } from '@/lib/api-auth';
import { createClient as createServerClient } from '@/lib/supabase/server';

const syncBatchSchema = z.object({
  local_id: z.string().min(1, 'local_id is required'),
  batch_id: z.string().optional(),
  farm_id: z.union([z.string(), z.number()]).optional(),
  commodity: z.string().optional(),
  state: z.string().optional(),
  lga: z.string().optional(),
  community: z.string().optional(),
  gps_lat: z.number().optional(),
  gps_lng: z.number().optional(),
  contributors: z.array(z.object({
    farm_id: z.union([z.string(), z.number()]).optional(),
    farmer_name: z.string().optional(),
    weight_kg: z.number().optional(),
    bag_count: z.number().optional(),
  })).optional(),
  bags: z.array(z.object({
    serial: z.string().optional(),
    weight: z.number().optional(),
    grade: z.string().optional(),
  })).optional(),
  notes: z.string().optional(),
  collected_at: z.string().optional(),
});

const syncPutSchema = z.object({
  batches: z.array(syncBatchSchema).min(1, 'At least one batch is required'),
});

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const serviceClient = createServiceClient();

    const { data: profile, error: profileError } = await serviceClient
      .from('profiles')
      .select('id, org_id, role')
      .eq('user_id', user.id)
      .single();
    
    if (profileError || !profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    if (!profile.org_id) {
      return NextResponse.json({ error: 'No organization assigned' }, { status: 403 });
    }
    
    if (profile.role === 'admin' || profile.role === 'aggregator') {
      const { data: syncStatus, error } = await serviceClient
        .from('agent_sync_status')
        .select(`
          *,
          agent:profiles(id, full_name, role)
        `)
        .eq('org_id', profile.org_id)
        .order('last_seen_at', { ascending: false });
      
      if (error) {
        if (error.code === 'PGRST204' || error.code === 'PGRST205' || error.code === '42P01') {
          return NextResponse.json({ sync_status: [] });
        }
        console.error('Sync status fetch error:', error);
        return NextResponse.json({ error: 'Failed to fetch sync status' }, { status: 500 });
      }
      
      return NextResponse.json({ sync_status: syncStatus || [] });
    } else {
      const { data: syncStatus, error } = await serviceClient
        .from('agent_sync_status')
        .select('*')
        .eq('agent_id', profile.id)
        .order('last_seen_at', { ascending: false })
        .limit(1);
      
      if (error) {
        if (error.code === 'PGRST204' || error.code === 'PGRST205' || error.code === '42P01') {
          return NextResponse.json({ sync_status: null });
        }
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
    const supabase = await createServerClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const serviceClient = createServiceClient();

    const { data: profile, error: profileError } = await serviceClient
      .from('profiles')
      .select('id, org_id, role')
      .eq('user_id', user.id)
      .single();
    
    if (profileError || !profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    if (!profile.org_id) {
      return NextResponse.json({ error: 'No organization assigned' }, { status: 403 });
    }
    
    const body = await request.json();
    const { device_id, pending_batches, pending_bags, app_version, is_online } = body;
    
    const upsertPayload: Record<string, any> = {
      org_id: profile.org_id,
      agent_id: profile.id,
      last_seen_at: new Date().toISOString(),
      pending_batches: pending_batches || 0,
      pending_bags: pending_bags || 0,
      is_online: is_online !== false
    };

    let { data: syncStatus, error } = await serviceClient
      .from('agent_sync_status')
      .upsert(upsertPayload, {
        onConflict: 'agent_id'
      })
      .select()
      .single();
    
    if (error) {
      if (error.code === 'PGRST204' || error.code === 'PGRST205' || error.code === '42P01') {
        return NextResponse.json({ sync_status: null, success: true });
      }
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
    const supabase = await createServerClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const serviceClient = createServiceClient();

    const { data: profile, error: profileError } = await serviceClient
      .from('profiles')
      .select('id, org_id, role')
      .eq('user_id', user.id)
      .single();
    
    if (profileError || !profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    if (!profile.org_id) {
      return NextResponse.json({ error: 'No organization assigned' }, { status: 403 });
    }
    
    const body = await request.json();

    const parsed = syncPutSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', fields: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { batches } = parsed.data;
    
    const results = [];
    
    for (const batch of batches) {
      const { local_id, batch_id, farm_id, commodity, state, lga, community, gps_lat, gps_lng, contributors, bags, notes, collected_at } = batch;
      
      const { data: existingBatch } = await serviceClient
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
      
      const parsedFarmId = farm_id && String(farm_id) !== 'unknown' ? (parseInt(String(farm_id)) || null) : null;
      
      const { data: newBatch, error: batchError } = await serviceClient
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
          if ((contrib.bag_count || 0) > 0) {
            try {
              await serviceClient
                .from('batch_contributions')
                .insert({
                  batch_id: newBatch.id,
                  farm_id: contrib.farm_id ? parseInt(String(contrib.farm_id)) || null : null,
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
            await serviceClient
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
    
    const warnings: Array<{ type: string; message: string; details?: any }> = [];
    
    const syncedFarmIds = batches
      .map((b: any) => parseInt(b.farm_id))
      .filter((id: number) => !isNaN(id) && id > 0);
    
    if (syncedFarmIds.length > 0) {
      const uniqueFarmIds = [...new Set(syncedFarmIds)] as number[];
      const { data: farms } = await serviceClient
        .from('farms')
        .select('id, farmer_name, compliance_status, updated_at')
        .in('id', uniqueFarmIds)
        .eq('org_id', profile.org_id);
      
      if (farms) {
        const changedFarms = farms.filter(f => {
          if (f.compliance_status === 'rejected' || f.compliance_status === 'suspended') {
            return true;
          }
          return false;
        });
        
        if (changedFarms.length > 0) {
          warnings.push({
            type: 'farm_compliance_changed',
            message: `${changedFarms.length} farm(s) referenced in synced batches have compliance issues`,
            details: changedFarms.map(f => ({
              farm_id: f.id,
              farmer_name: f.farmer_name,
              compliance_status: f.compliance_status,
              updated_at: f.updated_at,
            })),
          });
        }
      }
    }
    
    await serviceClient
      .from('agent_sync_status')
      .update({ 
        pending_batches: 0, 
        pending_bags: 0,
        last_seen_at: new Date().toISOString()
      })
      .eq('agent_id', profile.id);
    
    return NextResponse.json({ results, warnings, success: true });
    
  } catch (error) {
    console.error('Sync API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
