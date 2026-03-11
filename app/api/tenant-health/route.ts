import { createClient as createServerClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedProfile } from '@/lib/api-auth';


async function isSystemAdmin(supabase: any, userId: string): Promise<boolean> {
  const { data } = await supabase
    .from('system_admins')
    .select('id')
    .eq('user_id', userId)
    .single();
  return !!data;
}

export async function GET(request: NextRequest) {
  try {
    const supabaseAdmin = createAdminClient();
    
    const supabase = await createServerClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const isSuperAdmin = await isSystemAdmin(supabaseAdmin, user.id);
    if (!isSuperAdmin) {
      return NextResponse.json({ error: 'Superadmin access required' }, { status: 403 });
    }

    const { data: metrics, error } = await supabaseAdmin
      .from('tenant_health_metrics')
      .select('*')
      .order('total_batches', { ascending: false });

    if (error) {
      console.error('Tenant health query error:', error);
      return NextResponse.json({ error: 'Failed to fetch tenant health' }, { status: 500 });
    }

    const { data: flaggedBatches } = await supabaseAdmin
      .from('collection_batches')
      .select(`
        id,
        org_id,
        farm_id,
        total_weight,
        status,
        yield_flag_reason,
        created_at,
        farms (farmer_name, area_hectares, commodity),
        organizations (name)
      `)
      .eq('status', 'flagged_for_review')
      .order('created_at', { ascending: false })
      .limit(50);

    const summary = {
      total_orgs: metrics?.length || 0,
      growing_orgs: metrics?.filter(m => m.growth_trend === 'growing').length || 0,
      total_flagged: metrics?.reduce((sum, m) => sum + (m.flagged_batches || 0), 0) || 0,
      total_weight: metrics?.reduce((sum, m) => sum + (Number(m.total_weight_kg) || 0), 0) || 0,
    };

    return NextResponse.json({ 
      metrics,
      flaggedBatches: flaggedBatches || [],
      summary
    });
    
  } catch (error) {
    console.error('Tenant health API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
