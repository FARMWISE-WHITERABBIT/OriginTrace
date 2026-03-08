import { createClient } from '@supabase/supabase-js';
import { createClient as createServerClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

function createServiceClient() {
  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  });
}

export async function GET(request: NextRequest) {
  try {
    const supabase = createServiceClient();
    const authClient = await createServerClient();
    const { data: { user }, error: userError } = await authClient.auth.getUser();
    
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('org_id, role')
      .eq('user_id', user.id)
      .single();

    const { searchParams } = new URL(request.url);
    const globalOnly = searchParams.get('global_only') === 'true';
    const includeInactive = searchParams.get('include_inactive') === 'true';

    const userOrgId = profile?.org_id;
    
    let query = supabase
      .from('commodity_master')
      .select('*')
      .order('name');
    
    if (!includeInactive) {
      query = query.eq('is_active', true);
    }
    
    if (globalOnly) {
      query = query.eq('is_global', true);
    } else if (userOrgId) {
      query = query.or(`is_global.eq.true,created_by_org_id.eq.${userOrgId}`);
    } else {
      query = query.eq('is_global', true);
    }
    
    const { data: commodities, error } = await query;
    
    if (error) {
      if (error.code === 'PGRST205' || error.message?.includes('schema cache')) {
        const defaultCommodities = [
          { id: 1, name: 'Cocoa', code: 'COCOA', category: 'crop', unit: 'kg', is_active: true, is_global: true, created_by_org_id: null, grades: ['A', 'B', 'C'], moisture_min: 6, moisture_max: 8, collection_metrics: {} },
          { id: 2, name: 'Cashew', code: 'CASHEW', category: 'crop', unit: 'kg', is_active: true, is_global: true, created_by_org_id: null, grades: ['A', 'B', 'C'], moisture_min: 5, moisture_max: 8, collection_metrics: {} },
          { id: 3, name: 'Palm Oil', code: 'PALM', category: 'crop', unit: 'kg', is_active: true, is_global: true, created_by_org_id: null, grades: ['A', 'B'], moisture_min: null, moisture_max: null, collection_metrics: {} },
          { id: 4, name: 'Ginger', code: 'GINGER', category: 'crop', unit: 'kg', is_active: true, is_global: true, created_by_org_id: null, grades: ['A', 'B', 'C'], moisture_min: 10, moisture_max: 12, collection_metrics: {} },
          { id: 5, name: 'Sesame', code: 'SESAME', category: 'crop', unit: 'kg', is_active: true, is_global: true, created_by_org_id: null, grades: ['A', 'B', 'C'], moisture_min: 6, moisture_max: 8, collection_metrics: {} },
          { id: 6, name: 'Shea', code: 'SHEA', category: 'crop', unit: 'kg', is_active: true, is_global: true, created_by_org_id: null, grades: ['A', 'B'], moisture_min: 6, moisture_max: 8, collection_metrics: {} },
          { id: 7, name: 'Timber', code: 'TIMBER', category: 'forestry', unit: 'kg', is_active: true, is_global: true, created_by_org_id: null, grades: ['A', 'B', 'C'], moisture_min: null, moisture_max: null, collection_metrics: {} },
          { id: 8, name: 'Minerals', code: 'MINERALS', category: 'minerals', unit: 'kg', is_active: true, is_global: true, created_by_org_id: null, grades: ['A', 'B'], moisture_min: null, moisture_max: null, collection_metrics: {} },
          { id: 9, name: 'Seafood', code: 'SEAFOOD', category: 'seafood', unit: 'kg', is_active: true, is_global: true, created_by_org_id: null, grades: ['A', 'B', 'C'], moisture_min: null, moisture_max: null, collection_metrics: {} },
        ];
        return NextResponse.json({ commodities: defaultCommodities, source: 'defaults' });
      }
      console.error('Commodities fetch error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    
    return NextResponse.json({ commodities: commodities || [] });
  } catch (error) {
    console.error('Commodities API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createServiceClient();
    const authClient = await createServerClient();
    const { data: { user }, error: userError } = await authClient.auth.getUser();
    
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('org_id, role')
      .eq('user_id', user.id)
      .single();
    if (!profile || !['admin'].includes(profile.role)) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }
    
    const body = await request.json();
    const { name, code, category, unit, is_global, grades, moisture_min, moisture_max, collection_metrics } = body;
    
    if (!name || !code) {
      return NextResponse.json({ error: 'Name and code are required' }, { status: 400 });
    }
    
    let canCreateGlobal = false;
    if (is_global) {
      const { data: adminCheck } = await supabase
        .from('system_admins')
        .select('id')
        .eq('user_id', user.id)
        .single();
      canCreateGlobal = !!adminCheck;
    }
    
    const insertData: any = {
      name,
      code: code.toUpperCase().replace(/\s+/g, '_'),
      category: category || 'crop',
      unit: unit || 'kg',
      is_global: canCreateGlobal && is_global,
      created_by_org_id: profile.org_id,
      grades: grades || [],
      moisture_min: moisture_min ? parseFloat(moisture_min) : null,
      moisture_max: moisture_max ? parseFloat(moisture_max) : null,
      collection_metrics: collection_metrics || {}
    };
    
    const { data: commodity, error } = await supabase
      .from('commodity_master')
      .insert(insertData)
      .select()
      .single();
    
    if (error) {
      console.error('Commodity create error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    
    return NextResponse.json({ commodity });
  } catch (error) {
    console.error('Commodities API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const supabase = createServiceClient();
    const authClient = await createServerClient();
    const { data: { user }, error: userError } = await authClient.auth.getUser();
    
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('org_id, role')
      .eq('user_id', user.id)
      .single();
    if (!profile || !['admin'].includes(profile.role)) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const isSystemAdmin = !!(await supabase
      .from('system_admins')
      .select('id')
      .eq('user_id', user.id)
      .single()).data;
    
    const body = await request.json();
    const { id, name, category, unit, is_active, is_global, grades, moisture_min, moisture_max, collection_metrics } = body;
    
    if (!id) {
      return NextResponse.json({ error: 'Commodity ID required' }, { status: 400 });
    }

    const { data: existing } = await supabase
      .from('commodity_master')
      .select('id, is_global, created_by_org_id')
      .eq('id', id)
      .single();
    if (!existing) {
      return NextResponse.json({ error: 'Commodity not found' }, { status: 404 });
    }
    if (existing.is_global && !isSystemAdmin) {
      return NextResponse.json({ error: 'Only superadmins can modify global commodities' }, { status: 403 });
    }
    if (!existing.is_global && existing.created_by_org_id !== profile.org_id && !isSystemAdmin) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }
    
    const updates: any = {};
    if (name !== undefined) updates.name = name;
    if (category !== undefined) updates.category = category;
    if (unit !== undefined) updates.unit = unit;
    if (is_active !== undefined) updates.is_active = is_active;
    if (grades !== undefined) updates.grades = grades;
    if (moisture_min !== undefined) updates.moisture_min = moisture_min ? parseFloat(moisture_min) : null;
    if (moisture_max !== undefined) updates.moisture_max = moisture_max ? parseFloat(moisture_max) : null;
    if (collection_metrics !== undefined) updates.collection_metrics = collection_metrics;
    if (is_global !== undefined && isSystemAdmin) {
      updates.is_global = is_global;
    }
    
    const { data: commodity, error } = await supabase
      .from('commodity_master')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    
    if (error) {
      console.error('Commodity update error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    
    return NextResponse.json({ commodity });
  } catch (error) {
    console.error('Commodities API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const supabase = createServiceClient();
    const authClient = await createServerClient();
    const { data: { user }, error: userError } = await authClient.auth.getUser();
    
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('org_id, role')
      .eq('user_id', user.id)
      .single();
    if (!profile || !['admin'].includes(profile.role)) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const isSystemAdmin = !!(await supabase
      .from('system_admins')
      .select('id')
      .eq('user_id', user.id)
      .single()).data;
    
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    
    if (!id) {
      return NextResponse.json({ error: 'Commodity ID required' }, { status: 400 });
    }

    const { data: existing } = await supabase
      .from('commodity_master')
      .select('id, is_global, created_by_org_id')
      .eq('id', id)
      .single();
    if (!existing) {
      return NextResponse.json({ error: 'Commodity not found' }, { status: 404 });
    }
    if (existing.is_global && !isSystemAdmin) {
      return NextResponse.json({ error: 'Only superadmins can delete global commodities' }, { status: 403 });
    }
    if (!existing.is_global && existing.created_by_org_id !== profile.org_id && !isSystemAdmin) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }
    
    const { error } = await supabase
      .from('commodity_master')
      .update({ is_active: false })
      .eq('id', id);
    
    if (error) {
      console.error('Commodity delete error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Commodities API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
