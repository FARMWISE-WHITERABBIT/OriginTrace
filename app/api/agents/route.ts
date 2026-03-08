import { createAdminClient } from '@/lib/supabase/admin';
import { createClient as createServerClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';


export async function GET(request: NextRequest) {
  try {
    const supabaseAdmin = createAdminClient();
    
    const supabase = await createServerClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('id, org_id, role')
      .eq('user_id', user.id)
      .single();
    
    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }
    
    if (!['admin', 'aggregator'].includes(profile.role)) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }
    
    const { data: agents, error: agentError } = await supabaseAdmin
      .from('profiles')
      .select('id, user_id, full_name, assigned_state, assigned_lga, created_at')
      .eq('org_id', profile.org_id)
      .eq('role', 'agent')
      .order('created_at', { ascending: false });
    
    if (agentError) {
      console.error('Agent query error:', agentError);
      return NextResponse.json({ error: agentError.message }, { status: 500 });
    }
    
    const agentsWithStats = await Promise.all((agents || []).map(async (agent) => {
      const { count } = await supabaseAdmin
        .from('collection_batches')
        .select('id', { count: 'exact', head: true })
        .eq('agent_id', agent.user_id);
      
      return {
        ...agent,
        collections_count: count || 0
      };
    }));
    
    return NextResponse.json({ agents: agentsWithStats });
    
  } catch (error) {
    console.error('Agents API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
