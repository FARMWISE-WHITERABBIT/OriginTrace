import { createClient as createServerClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/api-auth';
import { logSuperadminAction } from '@/lib/superadmin-audit';

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
    const supabase = createServiceClient();
    const authClient = await createServerClient();
    const { data: { user }, error: userError } = await authClient.auth.getUser();
    if (userError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!(await isSystemAdmin(supabase, user.id)))
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const { searchParams } = new URL(request.url);
    const resource = searchParams.get('resource');

    switch (resource) {
      case 'shipping_lanes': {
        const { data, error } = await supabase
          .from('shipping_lanes')
          .select('*')
          .order('port_of_loading')
          .order('port_of_discharge');
        if (error) return NextResponse.json({ error: error.message }, { status: 500 });
        return NextResponse.json({ lanes: data ?? [] });
      }

      case 'notification_templates': {
        const { data, error } = await supabase
          .from('notification_templates')
          .select('*')
          .order('channel')
          .order('shipment_stage');
        if (error) return NextResponse.json({ error: error.message }, { status: 500 });
        return NextResponse.json({ templates: data ?? [] });
      }

      case 'stage_gates': {
        const { data, error } = await supabase
          .from('stage_gate_config')
          .select('*')
          .order('framework')
          .order('stage_name');
        if (error) return NextResponse.json({ error: error.message }, { status: 500 });
        return NextResponse.json({ gates: data ?? [] });
      }

      case 'inspection_bodies': {
        const { data, error } = await supabase
          .from('inspection_bodies')
          .select('*')
          .eq('is_active', true)
          .order('country')
          .order('name');
        if (error) return NextResponse.json({ error: error.message }, { status: 500 });
        return NextResponse.json({ bodies: data ?? [] });
      }

      default:
        return NextResponse.json({ error: 'Unknown resource' }, { status: 400 });
    }
  } catch (err) {
    console.error('Logistics API error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createServiceClient();
    const authClient = await createServerClient();
    const { data: { user }, error: userError } = await authClient.auth.getUser();
    if (userError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!(await isSystemAdmin(supabase, user.id)))
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const body = await request.json();
    const { action } = body;

    switch (action) {
      case 'upsert_shipping_lane': {
        const { id, port_of_loading, port_of_loading_code, port_of_discharge, port_of_discharge_code, standard_transit_days, freight_route, commodity, notes } = body;
        if (!port_of_loading || !port_of_discharge)
          return NextResponse.json({ error: 'port_of_loading and port_of_discharge required' }, { status: 400 });

        let result;
        if (id) {
          const { data, error } = await supabase
            .from('shipping_lanes')
            .update({ port_of_loading, port_of_loading_code, port_of_discharge, port_of_discharge_code, standard_transit_days, freight_route, commodity, notes, updated_at: new Date().toISOString() })
            .eq('id', id)
            .select()
            .single();
          if (error) return NextResponse.json({ error: error.message }, { status: 500 });
          result = data;
        } else {
          const { data, error } = await supabase
            .from('shipping_lanes')
            .insert({ port_of_loading, port_of_loading_code, port_of_discharge, port_of_discharge_code, standard_transit_days, freight_route, commodity, notes, created_by: user.id })
            .select()
            .single();
          if (error) return NextResponse.json({ error: error.message }, { status: 500 });
          result = data;
        }

        return NextResponse.json({ lane: result, success: true });
      }

      case 'upsert_notification_template': {
        const { id, template_key, channel, shipment_stage, subject, body: templateBody, variables } = body;
        if (!template_key || !channel || !shipment_stage || !templateBody)
          return NextResponse.json({ error: 'template_key, channel, shipment_stage, body required' }, { status: 400 });

        let result;
        if (id) {
          const { data, error } = await supabase
            .from('notification_templates')
            .update({ template_key, channel, shipment_stage, subject, body: templateBody, variables, updated_by: user.id, updated_at: new Date().toISOString() })
            .eq('id', id)
            .select()
            .single();
          if (error) return NextResponse.json({ error: error.message }, { status: 500 });
          result = data;
        } else {
          const { data, error } = await supabase
            .from('notification_templates')
            .insert({ template_key, channel, shipment_stage, subject, body: templateBody, variables })
            .select()
            .single();
          if (error) return NextResponse.json({ error: error.message }, { status: 500 });
          result = data;
        }

        await logSuperadminAction({
          superadminId: user.id,
          action: id ? 'update_notification_template' : 'create_notification_template',
          targetType: 'notification_template',
          targetId: template_key,
          request,
        });

        return NextResponse.json({ template: result, success: true });
      }

      case 'upsert_stage_gate': {
        const { framework, stage_name, is_mandatory, gate_action, description } = body;
        if (!framework || !stage_name)
          return NextResponse.json({ error: 'framework and stage_name required' }, { status: 400 });

        const { data, error } = await supabase
          .from('stage_gate_config')
          .upsert({
            framework,
            stage_name,
            is_mandatory: is_mandatory ?? false,
            gate_action: gate_action ?? 'warn',
            description,
            updated_by: user.id,
            updated_at: new Date().toISOString(),
          }, { onConflict: 'framework,stage_name' })
          .select()
          .single();

        if (error) return NextResponse.json({ error: error.message }, { status: 500 });
        return NextResponse.json({ gate: data, success: true });
      }

      case 'upsert_inspection_body': {
        const { id, name, abbreviation, country, region, body_type, commodities, accreditation, contact_info } = body;
        if (!name || !country || !body_type)
          return NextResponse.json({ error: 'name, country, body_type required' }, { status: 400 });

        let result;
        if (id) {
          const { data, error } = await supabase
            .from('inspection_bodies')
            .update({ name, abbreviation, country, region, body_type, commodities, accreditation, contact_info, updated_at: new Date().toISOString() })
            .eq('id', id)
            .select()
            .single();
          if (error) return NextResponse.json({ error: error.message }, { status: 500 });
          result = data;
        } else {
          const { data, error } = await supabase
            .from('inspection_bodies')
            .insert({ name, abbreviation, country, region, body_type, commodities, accreditation, contact_info, created_by: user.id })
            .select()
            .single();
          if (error) return NextResponse.json({ error: error.message }, { status: 500 });
          result = data;
        }

        return NextResponse.json({ body: result, success: true });
      }

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (err) {
    console.error('Logistics API error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
