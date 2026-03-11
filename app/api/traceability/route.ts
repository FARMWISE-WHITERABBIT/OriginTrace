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

    // Search for the bag
    const { data: bagData, error: bagError } = await supabaseAdmin
      .from('bags')
      .select('id, serial, status')
      .eq('org_id', profile.org_id)
      .eq('serial', serial.toUpperCase())
      .single();

    if (bagError || !bagData) {
      return NextResponse.json({ found: false });
    }

    let collectionData = null;
    let farmData = null;
    let agentData = null;

    if (bagData.status !== 'unused') {
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

        const { data: farm } = await supabaseAdmin
          .from('farms')
          .select('farmer_name, community, compliance_status')
          .eq('id', collection.farm_id)
          .single();

        if (farm) {
          farmData = farm;
        }

        const { data: agent } = await supabaseAdmin
          .from('profiles')
          .select('full_name')
          .eq('user_id', collection.agent_id)
          .single();

        if (agent) {
          agentData = agent;
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
    });

  } catch (error) {
    console.error('Traceability API error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
