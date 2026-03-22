/**
 * /api/commodities
 * Works with the LIVE commodity_master schema (is_global, created_by_org_id, code, unit, grades)
 * Normalises response so UI always gets consistent fields including slug alias.
 *
 * Auth model:
 *  - Regular users need a profiles row with an org_id.
 *  - System admins may have no profiles row at all — we check system_admins FIRST
 *    before rejecting with 404 so they are never incorrectly blocked.
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

/** Resolve who the caller is.  Returns { userId, orgId, isSysAdmin } or null on auth failure. */
async function resolveAuth(request: NextRequest) {
  const supabase = createServiceClient();
  const { user, profile } = await getAuthenticatedProfile(request);
  if (!user) return null;

  // 1. Check system_admins first — these users may have no profiles row
  const { data: adminRow } = await supabase
    .from('system_admins')
    .select('id')
    .eq('user_id', user.id)
    .single();
  if (adminRow) return { userId: user.id, orgId: null as number | null, isSysAdmin: true };

  // 2. Regular users need a profile with an org
  if (!profile) return { userId: user.id, orgId: null, isSysAdmin: false, noProfile: true };
  if (!profile.org_id) return { userId: user.id, orgId: null, isSysAdmin: false, noOrg: true };

  return { userId: user.id, orgId: profile.org_id as number, isSysAdmin: false };
}

// ─── GET ──────────────────────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  try {
    const supabase = createServiceClient();
    const auth = await resolveAuth(request);
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if ((auth as any).noProfile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    if ((auth as any).noOrg && !auth.isSysAdmin) return NextResponse.json({ error: 'No organization assigned' }, { status: 403 });

    const { searchParams } = new URL(request.url);
    const globalOnly = searchParams.get('global_only') === 'true';
    const activeOnly = searchParams.get('active_only') !== 'false';

    let commodities: Record<string, unknown>[] = [];
    try {
      let query = supabase.from('commodity_master').select('*').order('name');
      if (auth.isSysAdmin) {
        // Sysadmin sees everything
        if (activeOnly) query = query.eq('is_active', true);
      } else if (globalOnly) {
        query = (query as any).or('org_id.is.null,is_global.eq.true');
        if (activeOnly) query = query.eq('is_active', true);
      } else {
        query = (query as any).or(
          `org_id.is.null,is_global.eq.true,org_id.eq.${auth.orgId},created_by_org_id.eq.${auth.orgId}`
        );
        if (activeOnly) query = query.eq('is_active', true);
      }
      const { data, error } = await query;
      if (error) throw error;
      commodities = data || [];
    } catch {
      try {
        let q = supabase.from('commodity_master').select('*').order('name');
        if (activeOnly) q = q.eq('is_active', true);
        const { data } = await (q as any).eq('is_global', true);
        commodities = data || [];
        if (!globalOnly && auth.orgId) {
          const { data: orgData } = await supabase
            .from('commodity_master').select('*').order('name')
            .eq('created_by_org_id', auth.orgId);
          commodities = [...commodities, ...(orgData || [])];
        }
      } catch (fallbackErr: any) {
        console.warn('[commodities] fallback query failed:', fallbackErr.message?.slice(0, 80));
      }
    }

    return NextResponse.json({ commodities: commodities.map(c => normalise(c)) });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// ─── POST ─────────────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    const supabase = createServiceClient();
    const auth = await resolveAuth(request);
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if ((auth as any).noProfile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    if ((auth as any).noOrg && !auth.isSysAdmin) return NextResponse.json({ error: 'No organization assigned' }, { status: 403 });

    const body = await request.json();
    const { name, code, category, unit, is_global, grades, moisture_min, moisture_max, collection_metrics } = body;
    if (!name) return NextResponse.json({ error: 'Name is required' }, { status: 400 });

    const canCreateGlobal = auth.isSysAdmin || is_global === false ? auth.isSysAdmin : false;
    const derivedCode = (code || name).toUpperCase().replace(/\s+/g, '_').replace(/[^A-Z0-9_]/g, '');
    const insertData: Record<string, unknown> = {
      name, code: derivedCode,
      category: category || 'tree_crop',
      unit: unit || 'kg',
      is_active: true,
      grades: grades || [],
      moisture_min: moisture_min ? parseFloat(String(moisture_min)) : null,
      moisture_max: moisture_max ? parseFloat(String(moisture_max)) : null,
      collection_metrics: collection_metrics || {},
      is_global: auth.isSysAdmin && !!is_global,
      created_by_org_id: (auth.isSysAdmin && is_global) ? null : auth.orgId,
    };

    const { data: commodity, error } = await supabase.from('commodity_master').insert(insertData).select().single();
    if (error) { console.error('Commodity create error:', error); return NextResponse.json({ error: error.message }, { status: 500 }); }
    return NextResponse.json({ commodity: normalise(commodity as Record<string, unknown>) });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// ─── PATCH ────────────────────────────────────────────────────────────────────

export async function PATCH(request: NextRequest) {
  try {
    const supabase = createServiceClient();
    const auth = await resolveAuth(request);
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if ((auth as any).noProfile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    if ((auth as any).noOrg && !auth.isSysAdmin) return NextResponse.json({ error: 'No organization assigned' }, { status: 403 });

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 });

    const body = await request.json();
    const { name, category, unit, is_active, is_global, grades, moisture_min, moisture_max, collection_metrics } = body;
    const updates: Record<string, unknown> = {};
    if (name !== undefined) updates.name = name;
    if (category !== undefined) updates.category = category;
    if (unit !== undefined) updates.unit = unit;
    if (is_active !== undefined) updates.is_active = is_active;
    if (is_global !== undefined && auth.isSysAdmin) updates.is_global = is_global;
    if (grades !== undefined) updates.grades = grades;
    if (moisture_min !== undefined) updates.moisture_min = moisture_min ? parseFloat(String(moisture_min)) : null;
    if (moisture_max !== undefined) updates.moisture_max = moisture_max ? parseFloat(String(moisture_max)) : null;
    if (collection_metrics !== undefined) updates.collection_metrics = collection_metrics;

    const { data: commodity, error } = await supabase.from('commodity_master').update(updates).eq('id', id).select().single();
    if (error) { console.error('Commodity update error:', error); return NextResponse.json({ error: error.message }, { status: 500 }); }
    return NextResponse.json({ commodity: normalise(commodity as Record<string, unknown>) });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// ─── DELETE ───────────────────────────────────────────────────────────────────

export async function DELETE(request: NextRequest) {
  try {
    const supabase = createServiceClient();
    const auth = await resolveAuth(request);
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if ((auth as any).noProfile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    if ((auth as any).noOrg && !auth.isSysAdmin) return NextResponse.json({ error: 'No organization assigned' }, { status: 403 });

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 });

    const { error } = await supabase.from('commodity_master').update({ is_active: false }).eq('id', id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
