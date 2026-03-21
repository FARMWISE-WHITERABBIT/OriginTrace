import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient, getAuthenticatedProfile } from '@/lib/api-auth';

export async function GET(request: NextRequest) {
  try {
    const supabase = createServiceClient();
    const { user, profile } = await getAuthenticatedProfile(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    if (!profile.org_id) return NextResponse.json({ error: 'No organization assigned' }, { status: 403 });

    const { searchParams } = new URL(request.url);
    const globalOnly = searchParams.get('global_only') === 'true';
    const activeOnly = searchParams.get('active_only') !== 'false'; // default true

    let query = supabase
      .from('commodity_master')
      .select('id, name, slug, category, hs_code, is_eudr_regulated, is_active, is_global, org_id')
      .order('name');

    if (globalOnly) {
      query = query.is('org_id', null);
    } else {
      // Return global + org-specific commodities
      query = query.or(`org_id.is.null,org_id.eq.${profile.org_id}`);
    }

    if (activeOnly) {
      query = query.eq('is_active', true);
    }

    const { data: commodities, error } = await query;

    if (error) {
      console.error('Commodities list error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ commodities: commodities || [] });
  } catch (error) {
    console.error('Commodities GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createServiceClient();
    const { user, profile } = await getAuthenticatedProfile(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    if (!profile.org_id) return NextResponse.json({ error: 'No organization assigned' }, { status: 403 });

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
    
    const slug = (code || name).toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
    const insertData: Record<string, unknown> = {
      name,
      slug,
      org_id: (canCreateGlobal && is_global) ? null : profile.org_id,
      category: category || 'crop',
      is_active: true,
      metadata: { unit: unit || 'kg', grades: grades || [], moisture_min, moisture_max, collection_metrics: collection_metrics || {} },
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
    console.error('Commodities POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const supabase = createServiceClient();
    const { user, profile } = await getAuthenticatedProfile(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    if (!profile.org_id) return NextResponse.json({ error: 'No organization assigned' }, { status: 403 });

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 });

    const isSystemAdmin = profile.role === 'superadmin';
    const body = await request.json();
    const { name, category, unit, is_active, grades, moisture_min, moisture_max, collection_metrics, is_global } = body;

    const updates: Record<string, unknown> = {};
    if (name !== undefined) updates.name = name;
    if (category !== undefined) updates.category = category;
    if (is_active !== undefined) updates.is_active = is_active;
    // Pack extended fields into metadata JSONB
    if (unit !== undefined || grades !== undefined || moisture_min !== undefined || moisture_max !== undefined || collection_metrics !== undefined) {
      // Fetch existing metadata first
      const { data: existing } = await supabase.from('commodity_master').select('metadata').eq('id', id).single();
      const meta = (existing?.metadata as Record<string, unknown>) || {};
      if (unit !== undefined) meta.unit = unit;
      if (grades !== undefined) meta.grades = grades;
      if (moisture_min !== undefined) meta.moisture_min = moisture_min ? parseFloat(String(moisture_min)) : null;
      if (moisture_max !== undefined) meta.moisture_max = moisture_max ? parseFloat(String(moisture_max)) : null;
      if (collection_metrics !== undefined) meta.collection_metrics = collection_metrics;
      updates.metadata = meta;
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
    const { user, profile } = await getAuthenticatedProfile(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    if (!profile.org_id) return NextResponse.json({ error: 'No organization assigned' }, { status: 403 });

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 });

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
