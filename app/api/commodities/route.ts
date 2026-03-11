import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient, getAuthenticatedProfile } from '@/lib/api-auth';

export async function GET(request: NextRequest) {
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
    const { user, profile } = await getAuthenticatedProfile(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    if (!profile.org_id) return NextResponse.json({ error: 'No organization assigned' }, { status: 403 });

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
    const { user, profile } = await getAuthenticatedProfile(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    if (!profile.org_id) return NextResponse.json({ error: 'No organization assigned' }, { status: 403 });

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
