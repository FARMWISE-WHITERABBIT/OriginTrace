import { createAdminClient } from '@/lib/supabase/admin';
import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedProfile } from '@/lib/api-auth';
import { requireRole, ROLES } from '@/lib/rbac';
import { parsePagination } from '@/lib/api/validation';


export async function GET(request: NextRequest) {
  try {
    const supabaseAdmin = createAdminClient();
    
    const { user, profile } = await getAuthenticatedProfile(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    if (!profile.org_id) return NextResponse.json({ error: 'No organization assigned' }, { status: 403 });

    const _roleError = requireRole(profile, ['admin', 'aggregator']);
    if (_roleError) return _roleError;

    const { searchParams } = new URL(request.url);
    const { from, to, page, limit } = parsePagination(searchParams);
    
    const { data: agents, error: agentError, count } = await supabaseAdmin
      .from('profiles')
      .select('id, user_id, full_name, assigned_state, assigned_lga, created_at', { count: 'exact' })
      .eq('org_id', profile.org_id)
      .eq('role', 'agent')
      .order('created_at', { ascending: false })
      .range(from, to);
    
    if (agentError) {
      console.error('Agent query error:', agentError);
      return NextResponse.json({ error: agentError.message }, { status: 500 });
    }
    
    const agentsWithStats = await Promise.all((agents || []).map(async (agent) => {
      const { count: batchCount } = await supabaseAdmin
        .from('collection_batches')
        .select('id', { count: 'exact', head: true })
        .eq('agent_id', agent.user_id);
      
      return {
        ...agent,
        collections_count: batchCount || 0
      };
    }));
    
    return NextResponse.json({ agents: agentsWithStats, pagination: { page, limit, total: count ?? 0 } });
    
  } catch (error) {
    console.error('Agents API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
