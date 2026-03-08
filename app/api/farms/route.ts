import { createAdminClient } from '@/lib/supabase/admin';
import { createClient as createServerClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json(
        { error: 'Supabase is not properly configured' },
        { status: 500 }
      );
    }

    const supabase = await createServerClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    const supabaseAdmin = createAdminClient();

    // Get user's org_id from their profile
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('org_id')
      .eq('user_id', user.id)
      .single();

    if (!profile) {
      return NextResponse.json(
        { error: 'Profile not found' },
        { status: 404 }
      );
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const forExport = searchParams.get('forExport') === 'true';

    let query = supabaseAdmin
      .from('farms')
      .select('*')
      .eq('org_id', profile.org_id)
      .order('created_at', { ascending: false });

    if (status) {
      query = query.eq('compliance_status', status);
    }

    if (forExport) {
      query = query.eq('compliance_status', 'approved').not('boundary', 'is', null);
    }

    const { data: farms, error: farmsError } = await query;

    if (farmsError) {
      console.error('Farms fetch error:', farmsError);
      return NextResponse.json(
        { error: 'Failed to fetch farms', details: farmsError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ farms: farms || [] });

  } catch (error) {
    console.error('Farms API error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json(
        { error: 'Supabase is not properly configured' },
        { status: 500 }
      );
    }

    const supabase = await createServerClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    const supabaseAdmin = createAdminClient();

    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('org_id, user_id')
      .eq('user_id', user.id)
      .single();

    if (!profile) {
      return NextResponse.json(
        { error: 'Profile not found' },
        { status: 404 }
      );
    }

    const body = await request.json();
    const { farmer_name, farmer_id, phone, community, boundary, area_hectares, legality_doc_url } = body;

    if (!farmer_name || !community) {
      return NextResponse.json(
        { error: 'Farmer name and community are required' },
        { status: 400 }
      );
    }

    const { data: org } = await supabaseAdmin
      .from('organizations')
      .select('settings')
      .eq('id', profile.org_id)
      .single();

    const settings = org?.settings || {};

    if (settings.require_polygon && (!boundary || !boundary.coordinates || boundary.coordinates[0]?.length < 4)) {
      return NextResponse.json(
        { error: 'GPS polygon boundary is required by your organization' },
        { status: 400 }
      );
    }

    if (settings.require_national_id && !farmer_id) {
      return NextResponse.json(
        { error: 'National ID is required by your organization' },
        { status: 400 }
      );
    }

    if (settings.require_land_deed && !legality_doc_url) {
      return NextResponse.json(
        { error: 'Land deed document is required by your organization' },
        { status: 400 }
      );
    }

    const { data: farm, error: insertError } = await supabaseAdmin
      .from('farms')
      .insert({
        org_id: profile.org_id,
        farmer_name,
        farmer_id: farmer_id || null,
        phone: phone || null,
        community,
        boundary: boundary || null,
        area_hectares: area_hectares || null,
        legality_doc_url: legality_doc_url || null,
        created_by: profile.user_id,
        compliance_status: 'pending',
      })
      .select()
      .single();

    if (insertError) {
      console.error('Farm creation error:', insertError);
      return NextResponse.json(
        { error: 'Failed to create farm', details: insertError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ farm, success: true });

  } catch (error) {
    console.error('Farm creation error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, compliance_status, compliance_notes } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'Farm ID is required' },
        { status: 400 }
      );
    }

    const allowedStatuses = ['pending', 'approved', 'rejected'];
    if (compliance_status && !allowedStatuses.includes(compliance_status)) {
      return NextResponse.json(
        { error: 'Invalid compliance status' },
        { status: 400 }
      );
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json(
        { error: 'Supabase is not properly configured' },
        { status: 500 }
      );
    }

    const supabase = await createServerClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    const supabaseAdmin = createAdminClient();

    // Verify user has access to this farm's organization
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('org_id, role')
      .eq('user_id', user.id)
      .single();

    if (!profile || profile.role !== 'admin') {
      return NextResponse.json(
        { error: 'Only admins can update farm status' },
        { status: 403 }
      );
    }

    // Verify farm belongs to user's org
    const { data: farm } = await supabaseAdmin
      .from('farms')
      .select('org_id')
      .eq('id', id)
      .single();

    if (!farm || farm.org_id !== profile.org_id) {
      return NextResponse.json(
        { error: 'Farm not found' },
        { status: 404 }
      );
    }

    const updateData: any = {};
    if (compliance_status) updateData.compliance_status = compliance_status;
    if (compliance_notes !== undefined) updateData.compliance_notes = compliance_notes;

    const { data: updatedFarm, error: updateError } = await supabaseAdmin
      .from('farms')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      console.error('Farm update error:', updateError);
      return NextResponse.json(
        { error: 'Failed to update farm', details: updateError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ farm: updatedFarm });

  } catch (error) {
    console.error('Farm update error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
