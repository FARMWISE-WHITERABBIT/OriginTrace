import { createAdminClient } from '@/lib/supabase/admin';
import { createClient as createServerClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';


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
      .select('id, org_id, role')
      .eq('user_id', user.id)
      .single();
    
    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    if (!profile.org_id) {
      return NextResponse.json({ error: 'No organization assigned' }, { status: 403 });
    }
    
    const { searchParams } = new URL(request.url);
    const stateId = searchParams.get('state_id');
    const fetchAll = searchParams.get('all') === 'true';
    
    const lgaId = searchParams.get('lga_id');

    if (lgaId) {
      const { data: villages, error } = await supabaseAdmin
        .from('villages')
        .select('id, name, lga_id')
        .eq('lga_id', lgaId)
        .order('name');

      if (error) {
        console.error('Villages fetch error:', error);
        return NextResponse.json({ error: 'Failed to fetch villages' }, { status: 500 });
      }
      return NextResponse.json({ villages: villages || [] });
    }

    if (fetchAll) {
      const [statesRes, lgasRes, villagesRes] = await Promise.all([
        supabaseAdmin.from('states').select('id, name, code').order('name'),
        supabaseAdmin.from('lgas').select('id, name, state_id').order('name'),
        supabaseAdmin.from('villages').select('id, name, lga_id').order('name')
      ]);
      
      if (statesRes.error) {
        console.error('States fetch error:', statesRes.error);
        return NextResponse.json({ error: 'Failed to fetch locations' }, { status: 500 });
      }
      if (lgasRes.error) {
        console.error('LGAs fetch error:', lgasRes.error);
        return NextResponse.json({ error: 'Failed to fetch locations' }, { status: 500 });
      }
      
      return NextResponse.json({ 
        states: statesRes.data || [], 
        lgas: lgasRes.data || [],
        villages: villagesRes.data || []
      });
    }
    
    if (stateId) {
      const { data: lgas, error } = await supabaseAdmin
        .from('lgas')
        .select('id, name, state_id')
        .eq('state_id', stateId)
        .order('name');
      
      if (error) {
        console.error('LGAs fetch error:', error);
        return NextResponse.json({ error: 'Failed to fetch LGAs' }, { status: 500 });
      }
      
      const { data: organization } = await supabaseAdmin
        .from('organizations')
        .select('active_lgas')
        .eq('id', profile.org_id)
        .single();
      
      const activeLgas = organization?.active_lgas || [];
      
      const lgasWithStatus = lgas?.map(lga => ({
        ...lga,
        is_active: activeLgas.includes(lga.id)
      }));
      
      return NextResponse.json({ lgas: lgasWithStatus });
    }
    
    const { data: states, error } = await supabaseAdmin
      .from('states')
      .select('id, name, code')
      .order('name');
    
    if (error) {
      console.error('States fetch error:', error);
      return NextResponse.json({ error: 'Failed to fetch states' }, { status: 500 });
    }
    
    return NextResponse.json({ states: states || [] });
    
  } catch (error) {
    console.error('Locations API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabaseAdmin = createAdminClient();
    
    const supabase = await createServerClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const body = await request.json();
    const { type, name, state_id, lga_id, code } = body;
    
    if (!name || !type) {
      return NextResponse.json({ error: 'Name and type are required' }, { status: 400 });
    }
    
    switch (type) {
      case 'state': {
        const { data: adminCheck } = await supabaseAdmin
          .from('system_admins')
          .select('id')
          .eq('user_id', user.id)
          .single();
        
        if (!adminCheck) {
          return NextResponse.json({ error: 'Only superadmins can add states' }, { status: 403 });
        }
        
        const { data: state, error } = await supabaseAdmin
          .from('states')
          .insert({ name, code: code || name.substring(0, 2).toUpperCase() })
          .select()
          .single();
        
        if (error) {
          console.error('State create error:', error);
          return NextResponse.json({ error: 'Failed to create state' }, { status: 500 });
        }
        
        return NextResponse.json({ state });
      }
      
      case 'lga': {
        if (!state_id) {
          return NextResponse.json({ error: 'State ID required for LGA' }, { status: 400 });
        }
        
        const { data: lga, error } = await supabaseAdmin
          .from('lgas')
          .insert({ name, state_id })
          .select()
          .single();
        
        if (error) {
          console.error('LGA create error:', error);
          return NextResponse.json({ error: 'Failed to create LGA' }, { status: 500 });
        }
        
        return NextResponse.json({ lga });
      }
      
      case 'village': {
        if (!lga_id) {
          return NextResponse.json({ error: 'LGA ID required for village' }, { status: 400 });
        }
        
        const { data: village, error } = await supabaseAdmin
          .from('villages')
          .insert({ name, lga_id })
          .select()
          .single();
        
        if (error) {
          console.error('Village create error:', error);
          return NextResponse.json({ error: 'Failed to create village' }, { status: 500 });
        }
        
        return NextResponse.json({ village });
      }
      
      default:
        return NextResponse.json({ error: 'Invalid type parameter' }, { status: 400 });
    }
  } catch (error) {
    console.error('Locations API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const supabaseAdmin = createAdminClient();
    
    const supabase = await createServerClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('id, org_id, role')
      .eq('user_id', user.id)
      .single();
    
    if (!profile || profile.role !== 'admin') {
      return NextResponse.json({ error: 'Only admins can update active locations' }, { status: 403 });
    }
    
    const body = await request.json();
    const { active_lgas } = body;
    
    if (!Array.isArray(active_lgas)) {
      return NextResponse.json({ error: 'active_lgas must be an array' }, { status: 400 });
    }
    
    const { data: organization, error } = await supabaseAdmin
      .from('organizations')
      .update({ 
        active_lgas,
        updated_at: new Date().toISOString()
      })
      .eq('id', profile.org_id)
      .select()
      .single();
    
    if (error) {
      console.error('Update error:', error);
      return NextResponse.json({ error: 'Failed to update locations' }, { status: 500 });
    }
    
    return NextResponse.json({ organization, success: true });
    
  } catch (error) {
    console.error('Locations API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
