import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient as createServerClient } from '@/lib/supabase/server';


export async function GET(request: NextRequest) {
  try {
    const supabaseAdmin = createAdminClient();

    const supabase = await createServerClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('org_id, role')
      .eq('user_id', user.id)
      .single();

    if (profileError || !profile || !profile.org_id) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    if (profile.role !== 'admin' && profile.role !== 'aggregator') {
      return NextResponse.json({ error: 'Forbidden: admin or aggregator role required' }, { status: 403 });
    }

    const { data: orgFarms, error: farmsError } = await supabaseAdmin
      .from('farms')
      .select('id')
      .eq('org_id', profile.org_id);

    if (farmsError) {
      console.error('Error fetching org farms:', farmsError);
    }

    const orgFarmIds = (orgFarms || []).map(f => f.id);

    let pendingConflicts = 0;
    if (orgFarmIds.length > 0) {
      const { count, error: conflictError } = await supabaseAdmin
        .from('farm_conflicts')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending')
        .or(`farm_a_id.in.(${orgFarmIds.join(',')}),farm_b_id.in.(${orgFarmIds.join(',')})`);

      if (conflictError) {
        console.error('Error fetching conflicts:', conflictError);
      }
      pendingConflicts = count || 0;
    }

    const [unsyncedBagsRes, agentsRes] = await Promise.all([
      supabaseAdmin
        .from('bags')
        .select('*', { count: 'exact', head: true })
        .eq('org_id', profile.org_id)
        .eq('status', 'unused'),

      supabaseAdmin
        .from('profiles')
        .select('user_id, full_name')
        .eq('org_id', profile.org_id)
        .eq('role', 'agent'),
    ]);

    return NextResponse.json({
      pendingConflicts,
      unsyncedBags: unsyncedBagsRes.count || 0,
      agentCount: agentsRes.data?.length || 0,
    });
  } catch (error) {
    console.error('Sync metrics error:', error);
    return NextResponse.json({ error: 'Failed to fetch metrics' }, { status: 500 });
  }
}
