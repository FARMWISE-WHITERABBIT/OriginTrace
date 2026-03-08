import { createAdminClient } from '@/lib/supabase/admin';
import { createClient as createServerClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { logAuditEvent, getClientIp } from '@/lib/audit';
import { dispatchWebhookEvent } from '@/lib/webhooks';
import { enforceTier } from '@/lib/api/tier-guard';
import { z } from 'zod';

const farmCreateSchema = z.object({
  farmer_name: z.string().min(1, 'Farmer name is required'),
  farmer_id: z.string().optional(),
  phone: z.string().optional(),
  community: z.string().min(1, 'Community is required'),
  boundary: z.object({
    type: z.string().optional(),
    coordinates: z.array(z.any()).optional(),
  }).nullable().optional(),
  area_hectares: z.number().positive().nullable().optional(),
  legality_doc_url: z.string().url().nullable().optional(),
});

const farmPatchSchema = z.object({
  id: z.number({ required_error: 'Farm ID is required' }),
  compliance_status: z.enum(['pending', 'approved', 'rejected']).optional(),
  compliance_notes: z.string().optional(),
});

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

    const tierBlock = await enforceTier(profile.org_id, 'farm_mapping');
    if (tierBlock) return tierBlock;

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

    const tierBlock = await enforceTier(profile.org_id, 'farm_mapping');
    if (tierBlock) return tierBlock;

    const body = await request.json();

    const parsed = farmCreateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', fields: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { farmer_name, farmer_id, phone, community, boundary, area_hectares, legality_doc_url } = parsed.data;

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

    await logAuditEvent({
      orgId: profile.org_id,
      actorId: profile.user_id,
      actorEmail: user.email,
      action: 'farm.created',
      resourceType: 'farm',
      resourceId: farm.id?.toString(),
      metadata: { farmer_name, community, commodity: parsed.data.commodity },
      ipAddress: getClientIp(request),
    });

    if (phone) {
      const inviteToken = crypto.randomUUID().replace(/-/g, '').slice(0, 16);
      await supabaseAdmin.from('farmer_accounts').insert({
        farm_id: farm.id,
        org_id: profile.org_id,
        phone,
        farmer_code: farmer_id || null,
        status: 'invited',
        invite_token: inviteToken,
        created_by: profile.user_id,
      });
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

    const parsed = farmPatchSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', fields: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { id, compliance_status, compliance_notes } = parsed.data;

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

    const tierBlock = await enforceTier(profile.org_id, 'farm_mapping');
    if (tierBlock) return tierBlock;

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

    if (compliance_status === 'approved' || compliance_status === 'rejected') {
      const action = compliance_status === 'approved' ? 'farm.approved' : 'farm.rejected';
      await logAuditEvent({
        orgId: String(profile.org_id),
        actorId: user.id,
        actorEmail: user.email,
        action,
        resourceType: 'farm',
        resourceId: String(id),
        metadata: { compliance_status, compliance_notes },
        ipAddress: getClientIp(request),
      });

      const webhookEvent = compliance_status === 'approved' ? 'farm.approved' : 'farm.rejected';
      dispatchWebhookEvent(String(profile.org_id), webhookEvent, {
        farm_id: id,
        compliance_status,
        compliance_notes,
        farmer_name: updatedFarm.farmer_name,
        community: updatedFarm.community,
      });
    }

    if (compliance_status && compliance_status !== 'pending') {
      dispatchWebhookEvent(String(profile.org_id), 'compliance.changed', {
        resource_type: 'farm',
        farm_id: id,
        new_status: compliance_status,
        compliance_notes,
      });
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
