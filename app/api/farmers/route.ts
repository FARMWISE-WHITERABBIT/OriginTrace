import { createAdminClient } from '@/lib/supabase/admin';
import { createClient as createServerClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { requireRole, ROLES } from '@/lib/rbac';


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
      .select('org_id, role')
      .eq('user_id', user.id)
      .single();

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    if (!profile.org_id) {
      return NextResponse.json({ error: 'No organization assigned' }, { status: 403 });
    }

    const _roleError = requireRole(profile, ['admin', 'aggregator']);
    if (_roleError) return _roleError;

    const { data: rpcFarmers, error: rpcError } = await supabaseAdmin.rpc('get_org_farmers', {
      p_org_id: profile.org_id
    });

    if (!rpcError && rpcFarmers) {
      return NextResponse.json({ farmers: rpcFarmers || [] });
    }

    const { data: farmers, error } = await supabaseAdmin
      .from('farmer_performance_ledger')
      .select('*')
      .eq('org_id', profile.org_id)
      .order('total_delivery_kg', { ascending: false });

    if (error) {
      console.error('Farmers query error:', error);
      return NextResponse.json({ farmers: [] });
    }

    return NextResponse.json({ farmers: farmers || [] });
    
  } catch (error) {
    console.error('Farmers API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
