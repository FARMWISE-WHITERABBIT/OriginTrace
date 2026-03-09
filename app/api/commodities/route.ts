import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/api-auth';
import { createClient as createServerClient } from '@/lib/supabase/server';
import pool from '@/lib/db';

async function getAuthProfile(supabase: any, userId: string) {
  const { data: profile } = await supabase
    .from('profiles')
    .select('org_id, role')
    .eq('user_id', userId)
    .single();
  return profile;
}

async function checkSystemAdmin(supabase: any, userId: string) {
  const { data } = await supabase
    .from('system_admins')
    .select('id')
    .eq('user_id', userId)
    .single();
  return !!data;
}

export async function GET(request: NextRequest) {
  try {
    const supabase = createServiceClient();
    const authClient = await createServerClient();
    const { data: { user }, error: userError } = await authClient.auth.getUser();
    
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const profile = await getAuthProfile(supabase, user.id);

    const { searchParams } = new URL(request.url);
    const globalOnly = searchParams.get('global_only') === 'true';
    const includeInactive = searchParams.get('include_inactive') === 'true';

    const userOrgId = profile?.org_id;

    if (!userOrgId) {
      return NextResponse.json({ error: 'No organization assigned' }, { status: 403 });
    }
    
    let sql = 'SELECT * FROM commodity_master';
    const conditions: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;
    
    if (!includeInactive) {
      conditions.push('is_active = true');
    }
    
    if (globalOnly) {
      conditions.push('is_global = true');
    } else {
      conditions.push(`(is_global = true OR created_by_org_id = $${paramIndex})`);
      params.push(userOrgId);
      paramIndex++;
    }
    
    if (conditions.length > 0) {
      sql += ' WHERE ' + conditions.join(' AND ');
    }
    sql += ' ORDER BY name';
    
    const result = await pool.query(sql, params);
    
    return NextResponse.json({ commodities: result.rows });
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

    const profile = await getAuthProfile(supabase, user.id);
    if (!profile || !['admin'].includes(profile.role)) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    if (!profile.org_id) {
      return NextResponse.json({ error: 'No organization assigned' }, { status: 403 });
    }
    
    const body = await request.json();
    const { name, code, category, unit, is_global, grades, moisture_min, moisture_max, collection_metrics } = body;
    
    if (!name || !code) {
      return NextResponse.json({ error: 'Name and code are required' }, { status: 400 });
    }
    
    let canCreateGlobal = false;
    if (is_global) {
      canCreateGlobal = await checkSystemAdmin(supabase, user.id);
    }
    
    const result = await pool.query(
      `INSERT INTO commodity_master (name, code, category, unit, is_global, created_by_org_id, grades, moisture_min, moisture_max, collection_metrics)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING *`,
      [
        name,
        code.toUpperCase().replace(/\s+/g, '_'),
        category || 'crop',
        unit || 'kg',
        canCreateGlobal && is_global,
        profile.org_id,
        grades || [],
        moisture_min ? parseFloat(moisture_min) : null,
        moisture_max ? parseFloat(moisture_max) : null,
        JSON.stringify(collection_metrics || {})
      ]
    );
    
    return NextResponse.json({ commodity: result.rows[0] });
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

    const profile = await getAuthProfile(supabase, user.id);
    if (!profile || !['admin'].includes(profile.role)) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const isSystemAdmin = await checkSystemAdmin(supabase, user.id);
    
    const body = await request.json();
    const { id, name, category, unit, is_active, is_global, grades, moisture_min, moisture_max, collection_metrics } = body;
    
    if (!id) {
      return NextResponse.json({ error: 'Commodity ID required' }, { status: 400 });
    }

    const existingResult = await pool.query(
      'SELECT id, is_global, created_by_org_id FROM commodity_master WHERE id = $1',
      [id]
    );
    const existing = existingResult.rows[0];
    
    if (!existing) {
      return NextResponse.json({ error: 'Commodity not found' }, { status: 404 });
    }
    if (existing.is_global && !isSystemAdmin) {
      return NextResponse.json({ error: 'Only superadmins can modify global commodities' }, { status: 403 });
    }
    if (!existing.is_global && existing.created_by_org_id !== profile.org_id && !isSystemAdmin) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }
    
    const setClauses: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;
    
    if (name !== undefined) { setClauses.push(`name = $${paramIndex++}`); values.push(name); }
    if (category !== undefined) { setClauses.push(`category = $${paramIndex++}`); values.push(category); }
    if (unit !== undefined) { setClauses.push(`unit = $${paramIndex++}`); values.push(unit); }
    if (is_active !== undefined) { setClauses.push(`is_active = $${paramIndex++}`); values.push(is_active); }
    if (grades !== undefined) { setClauses.push(`grades = $${paramIndex++}`); values.push(grades); }
    if (moisture_min !== undefined) { setClauses.push(`moisture_min = $${paramIndex++}`); values.push(moisture_min ? parseFloat(moisture_min) : null); }
    if (moisture_max !== undefined) { setClauses.push(`moisture_max = $${paramIndex++}`); values.push(moisture_max ? parseFloat(moisture_max) : null); }
    if (collection_metrics !== undefined) { setClauses.push(`collection_metrics = $${paramIndex++}`); values.push(JSON.stringify(collection_metrics)); }
    if (is_global !== undefined && isSystemAdmin) { setClauses.push(`is_global = $${paramIndex++}`); values.push(is_global); }
    
    if (setClauses.length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
    }
    
    values.push(id);
    const result = await pool.query(
      `UPDATE commodity_master SET ${setClauses.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
      values
    );
    
    return NextResponse.json({ commodity: result.rows[0] });
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

    const profile = await getAuthProfile(supabase, user.id);
    if (!profile || !['admin'].includes(profile.role)) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const isSystemAdmin = await checkSystemAdmin(supabase, user.id);
    
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    
    if (!id) {
      return NextResponse.json({ error: 'Commodity ID required' }, { status: 400 });
    }

    const existingResult = await pool.query(
      'SELECT id, is_global, created_by_org_id FROM commodity_master WHERE id = $1',
      [id]
    );
    const existing = existingResult.rows[0];
    
    if (!existing) {
      return NextResponse.json({ error: 'Commodity not found' }, { status: 404 });
    }
    if (existing.is_global && !isSystemAdmin) {
      return NextResponse.json({ error: 'Only superadmins can delete global commodities' }, { status: 403 });
    }
    if (!existing.is_global && existing.created_by_org_id !== profile.org_id && !isSystemAdmin) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }
    
    await pool.query('UPDATE commodity_master SET is_active = false WHERE id = $1', [id]);
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Commodities API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
