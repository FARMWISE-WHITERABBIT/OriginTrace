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

    const { data: rpcFarmers, error: rpcError } = await supabaseAdmin.rpc('get_org_farmers', {
      p_org_id: profile.org_id
    });

    if (!rpcError && rpcFarmers) {
      // RPC doesn't support .range() — slice in-process
      const total = (rpcFarmers as any[]).length;
      const paged = (rpcFarmers as any[]).slice(from, to + 1);
      return NextResponse.json({ farmers: paged, pagination: { page, limit, total } });
    }

    const { data: farmers, error, count } = await supabaseAdmin
      .from('farmer_performance_ledger')
      .select('*', { count: 'exact' })
      .eq('org_id', profile.org_id)
      .order('total_delivery_kg', { ascending: false })
      .range(from, to);

    if (error) {
      console.error('Farmers query error:', error);
      return NextResponse.json({ farmers: [], pagination: { page, limit, total: 0 } });
    }

    return NextResponse.json({ farmers: farmers || [], pagination: { page, limit, total: count ?? 0 } });
    
  } catch (error) {
    console.error('Farmers API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
