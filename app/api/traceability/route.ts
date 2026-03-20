import { createAdminClient } from '@/lib/supabase/admin';
import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedProfile } from '@/lib/api-auth';
import { enforceTier } from '@/lib/api/tier-guard';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const serial = searchParams.get('serial');

    if (!serial) {
      return NextResponse.json(
        { error: 'Serial number is required' },
        { status: 400 }
      );
    }

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

    const tierBlock = await enforceTier(profile.org_id, 'traceability');
    if (tierBlock) return tierBlock;

    const { data: bagData, error: bagError } = await supabaseAdmin
      .from('bags')
      .select('id, serial, status, collection_batch_id')
      .eq('org_id', profile.org_id)
      .eq('serial', serial.toUpperCase())
      .single();

    if (bagError || !bagData) {
      return NextResponse.json({ found: false });
    }

    let collectionData = null;
    let farmData = null;
    let agentData = null;
    let contributors: Array<{ farmer_name: string | null; weight_kg: number; bag_count: number; farm_id: string | null; community: string | null; compliance_status: string | null }> = [];

    if (bagData.status !== 'unused') {
      // Primary path: legacy collections table (individual bag scan)
      const { data: collection } = await supabaseAdmin
        .from('collections')
        .select('weight, grade, collected_at, farm_id, agent_id')
        .eq('bag_id', bagData.id)
        .single();

      if (collection) {
        collectionData = {
          weight: collection.weight,
          grade: collection.grade,
          collected_at: collection.collected_at,
        };

        if (collection.farm_id) {
          const { data: farm } = await supabaseAdmin
            .from('farms')
            .select('farmer_name, community, compliance_status')
            .eq('id', collection.farm_id)
            .single();
          if (farm) farmData = farm;
        }

        if (collection.agent_id) {
          const { data: agent } = await supabaseAdmin
            .from('profiles')
            .select('full_name')
            .eq('user_id', collection.agent_id)
            .single();
          if (agent) agentData = agent;
        }
      }

      // Fallback/supplemental path: bag linked to a collection_batch
      if (bagData.collection_batch_id) {
        const { data: batch } = await supabaseAdmin
          .from('collection_batches')
          .select('id, farm_id, agent_id, weight_kg, grade, created_at')
          .eq('id', bagData.collection_batch_id)
          .single();

        if (batch) {
          if (!collectionData) {
            collectionData = {
              weight: null,
              grade: batch.grade,
              collected_at: batch.created_at,
            };
          }

          // Resolve agent from batch if not already set
          if (batch.agent_id && !agentData) {
            const { data: agent } = await supabaseAdmin
              .from('profiles')
              .select('full_name')
              .eq('user_id', batch.agent_id)
              .single();
            if (agent) agentData = agent;
          }

          // Prefer batch_contributions for farmer attribution (cooperative or multi-farm)
          const { data: contribs } = await supabaseAdmin
            .from('batch_contributions')
            .select('farmer_name, weight_kg, bag_count, farm_id, compliance_status')
            .eq('batch_id', batch.id)
            .order('weight_kg', { ascending: false });

          if (contribs && contribs.length > 0) {
            // Enrich with farm community
            const farmIds = contribs.map(c => c.farm_id).filter(Boolean) as string[];
            let farmCommunityMap: Record<string, string | null> = {};
            if (farmIds.length > 0) {
              const { data: farms } = await supabaseAdmin
                .from('farms')
                .select('id, community, farmer_name, compliance_status')
                .in('id', farmIds);
              if (farms) {
                farms.forEach(f => { farmCommunityMap[f.id] = f.community; });
              }
            }

            contributors = contribs.map(c => ({
              farmer_name: c.farmer_name,
              weight_kg: c.weight_kg,
              bag_count: c.bag_count,
              farm_id: c.farm_id,
              community: c.farm_id ? (farmCommunityMap[c.farm_id] ?? null) : null,
              compliance_status: c.compliance_status,
            }));

            // Set primary farm from top contributor if not already set
            if (!farmData && contributors.length > 0) {
              const top = contributors[0];
              if (top.farm_id && farmCommunityMap[top.farm_id] !== undefined) {
                farmData = {
                  farmer_name: top.farmer_name,
                  community: farmCommunityMap[top.farm_id],
                  compliance_status: top.compliance_status,
                };
              } else if (top.farmer_name) {
                farmData = {
                  farmer_name: top.farmer_name,
                  community: top.community,
                  compliance_status: top.compliance_status,
                };
              }
            }
          } else if (!farmData && batch.farm_id) {
            // Final fallback: single farm on the batch itself
            const { data: batchFarm } = await supabaseAdmin
              .from('farms')
              .select('farmer_name, community, compliance_status')
              .eq('id', batch.farm_id)
              .single();
            if (batchFarm) farmData = batchFarm;
          }
        }
      }
    }

    return NextResponse.json({
      found: true,
      bag: {
        serial: bagData.serial,
        status: bagData.status,
      },
      farm: farmData,
      collection: collectionData,
      agent: agentData,
      contributors: contributors.length > 1 ? contributors : [],
    });

  } catch (error) {
    console.error('Traceability API error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
