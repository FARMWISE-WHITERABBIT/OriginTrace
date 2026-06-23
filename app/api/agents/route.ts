import { createAdminClient } from '@/lib/supabase/admin';
import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedProfile } from '@/lib/api-auth';
import { requireRole, ROLES } from '@/lib/rbac';
import { parsePagination } from '@/lib/api/validation';
import { ApiError, withErrorHandling } from '@/lib/api/errors';

export const GET = withErrorHandling(async (request: NextRequest) => {
  const supabaseAdmin = createAdminClient();
  
  const { user, profile } = await getAuthenticatedProfile(request);
  if (!user) return ApiError.unauthorized();
  if (!profile) return ApiError.notFound('Profile');
  if (!profile.org_id) return ApiError.forbidden('No organization assigned');

  const roleError = requireRole(profile, ROLES.ADMIN_AGGREGATOR);
  if (roleError) return roleError;

  const { searchParams } = new URL(request.url);
  const { from, to, page, limit } = parsePagination(searchParams);
  
  const { data: agents, error: agentError, count } = await supabaseAdmin
    .from('profiles')
    .select('id, user_id, full_name, assigned_state, assigned_lga, created_at', { count: 'exact' })
    .eq('org_id', profile.org_id)
    .eq('role', 'agent')
    .order('created_at', { ascending: false })
    .range(from, to);
  
  if (agentError) return ApiError.internal(agentError, 'agents/GET');
  
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
  
  return NextResponse.json({ 
    agents: agentsWithStats, 
    pagination: { page, limit, total: count ?? 0 } 
  });
}, 'agents/GET');
