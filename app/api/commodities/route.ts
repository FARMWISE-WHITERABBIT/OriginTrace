/**
 * /api/commodities
 * Works with the LIVE commodity_master schema (is_global, created_by_org_id, code, unit, grades)
 * Normalises response so UI always gets consistent fields including slug alias.
 */
import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient, getAuthenticatedProfile } from '@/lib/api-auth';

function normalise(c: Record<string, unknown>) {
  return {
    ...c,
    slug: c.slug ?? (typeof c.code === 'string' ? (c.code as string).toLowerCase() : ''),
    org_id: c.org_id ?? c.created_by_org_id ?? null,
  };
}

export async function GET(request: NextRequest) {
  try {
    const supabase = createServiceClient();
    const { user, profile } = await getAuthenticatedProfile(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    // Allow system admins (no org_id) to view all commodities
    const isSysAdmin = !profile.org_id
      ? !!(await supabase.from('system_admins').select('id').eq('user_id', user.id).single()).data
      : false;
    if (!profile.org_id && !isSysAdmin) return NextResponse.json({ error: 'No organization assigned' }, { status: 403 });

    const { searchParams } = new URL(request.url);
    const globalOnly = searchParams.get('global_only') === 'true';
    const activeOnly = searchParams.get('active_only') !== 'false';

    let commodities: Record<string, unknown>[] = [];
    try {
      // Try full filter (works once org_id column migration has run)
      let query = supabase.from('commodity_master').select('*').order('name');
      if (globalOnly) {
        query = (query as any).or('org_id.is.null,is_global.eq.true');
      } else {
        query = (query as any).or(
          `org_id.is.null,is_global.eq.true,org_id.eq.${profile.org_id},created_by_org_id.eq.${profile.org_id}`
        );
      }
      if (activeOnly) query = query.eq('is_active', true);
      const { data, error } = await query;
      if (error) throw error;
      commodities = data || [];
    } catch {
      // org_id column missing on live DB — fall back to is_global filter only
      try {
        let q = supabase.from('commodity_master').select('*').order('name');
        if (activeOnly) q = q.eq('is_active', true);
        const { data } = await (q as any).eq('is_global', true);
        commodities = data || [];
        // Also fetch org-specific commodities separately if not global-only
        if (!globalOnly) {
          const { data: orgData } = await supabase
            .from('commodity_master').select('*').order('name')
            .eq('created_by_org_id', profile.org_id);
          commodities = [...commodities, ...(orgData || [])];
        }
      } catch (fallbackErr: any) {
        console.warn('[commodities] fallback query also failed:', fallbackErr.message?.slice(0, 80));
      }
    }

    return NextResponse.json({ commodities: commodities.map(c => normalise(c)) });
  } catch (error) { return NextResponse.json({ error: 'Internal server error' }, { status: 500 }); }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createServiceClient();
    const { user, profile } = await getAuthenticatedProfile(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    // System admins (no org_id) can create global commodities
    const isSysAdmin = !profile.org_id
      ? !!(await supabase.from('system_admins').select('id').eq('user_id', user.id).single()).data
      : false;
    if (!profile.org_id && !isSysAdmin) return NextResponse.json({ error: 'No organization assigned' }, { status: 403 });

    const body = await request.json();
    const { name, code, category, unit, is_global, grades, moisture_min, moisture_max, collection_metrics } = body;
    if (!name) return NextResponse.json({ error: 'Name is required' }, { status: 400 });

    let canCreateGlobal = isSysAdmin;
    if (!canCreateGlobal && is_global) {
      const { data: adminCheck } = await supabase.from('system_admins').select('id').eq('user_id', user.id).single();
      canCreateGlobal = !!adminCheck;
    }

    const derivedCode = (code || name).toUpperCase().replace(/\s+/g, '_').replace(/[^A-Z0-9_]/g, '');
    const insertData: Record<string, unknown> = {
      name, code: derivedCode, category: category || 'crop',
      unit: unit || 'kg', is_active: true,
      grades: grades || [], moisture_min: moisture_min ? parseFloat(String(moisture_min)) : null,
      moisture_max: moisture_max ? parseFloat(String(moisture_max)) : null,
      collection_metrics: collection_metrics || {},
      is_global: canCreateGlobal && is_global,
      created_by_org_id: (canCreateGlobal && is_global) ? null : profile.org_id,
    };

    const { data: commodity, error } = await supabase.from('commodity_master').insert(insertData).select().single();
    if (error) { console.error('Commodity create error:', error); return NextResponse.json({ error: error.message }, { status: 500 }); }
    return NextResponse.json({ commodity: normalise(commodity as Record<string, unknown>) });
  } catch (error) { return NextResponse.json({ error: 'Internal server error' }, { status: 500 }); }
}

export async function PATCH(request: NextRequest) {
  try {
    const supabase = createServiceClient();
    const { user, profile } = await getAuthenticatedProfile(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    const isSysAdmin = !profile.org_id
      ? !!(await supabase.from('system_admins').select('id').eq('user_id', user.id).single()).data
      : false;
    if (!profile.org_id && !isSysAdmin) return NextResponse.json({ error: 'No organization assigned' }, { status: 403 });

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 });

    const body = await request.json();
    const { name, category, unit, is_active, grades, moisture_min, moisture_max, collection_metrics } = body;
    const updates: Record<string, unknown> = {};
    if (name !== undefined) updates.name = name;
    if (category !== undefined) updates.category = category;
    if (unit !== undefined) updates.unit = unit;
    if (is_active !== undefined) updates.is_active = is_active;
    if (grades !== undefined) updates.grades = grades;
    if (moisture_min !== undefined) updates.moisture_min = moisture_min ? parseFloat(String(moisture_min)) : null;
    if (moisture_max !== undefined) updates.moisture_max = moisture_max ? parseFloat(String(moisture_max)) : null;
    if (collection_metrics !== undefined) updates.collection_metrics = collection_metrics;

    const { data: commodity, error } = await supabase.from('commodity_master').update(updates).eq('id', id).select().single();
    if (error) { console.error('Commodity update error:', error); return NextResponse.json({ error: error.message }, { status: 500 }); }
    return NextResponse.json({ commodity: normalise(commodity as Record<string, unknown>) });
  } catch (error) { return NextResponse.json({ error: 'Internal server error' }, { status: 500 }); }
}

export async function DELETE(request: NextRequest) {
  try {
    const supabase = createServiceClient();
    const { user, profile } = await getAuthenticatedProfile(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    const isSysAdmin = !profile.org_id
      ? !!(await supabase.from('system_admins').select('id').eq('user_id', user.id).single()).data
      : false;
    if (!profile.org_id && !isSysAdmin) return NextResponse.json({ error: 'No organization assigned' }, { status: 403 });

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 });

    const { error } = await supabase.from('commodity_master').update({ is_active: false }).eq('id', id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  } catch (error) { return NextResponse.json({ error: 'Internal server error' }, { status: 500 }); }
}
