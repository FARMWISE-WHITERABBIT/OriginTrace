/**
 * GET    /api/shipment-templates/[id]  — get a template (for applying to new shipment)
 * PATCH  /api/shipment-templates/[id]  — update template
 * DELETE /api/shipment-templates/[id]  — soft-delete
 *
 * Roles: admin, logistics_coordinator
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createServiceClient, getAuthenticatedProfile } from '@/lib/api-auth';

const ALLOWED_ROLES = ['admin', 'logistics_coordinator', 'compliance_officer'];
const WRITE_ROLES = ['admin', 'logistics_coordinator'];

const patchSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().max(500).optional(),
  destination_country: z.string().max(100).optional(),
  destination_port: z.string().max(100).optional(),
  buyer_company: z.string().max(255).optional(),
  buyer_contact: z.string().email().optional().or(z.literal('')),
  commodity: z.string().max(255).optional(),
  target_regulations: z.array(z.string()).optional(),
  freight_forwarder_name: z.string().max(255).optional(),
  freight_forwarder_contact: z.string().max(255).optional(),
  shipping_line: z.string().max(255).optional(),
  port_of_loading: z.string().max(100).optional(),
  port_of_discharge: z.string().max(100).optional(),
  clearing_agent_name: z.string().max(255).optional(),
  clearing_agent_contact: z.string().max(255).optional(),
  container_type: z.enum(['20FT', '40FT', '40HC', 'Reefer']).optional(),
  contract_price_per_mt: z.number().optional(),
  usd_ngn_rate: z.number().positive().optional(),
  customs_fees_ngn: z.number().optional(),
  inspection_fees_ngn: z.number().optional(),
  phyto_lab_costs_ngn: z.number().optional(),
  certification_costs_ngn: z.number().optional(),
  port_handling_charges_ngn: z.number().optional(),
  freight_cost_usd: z.number().optional(),
  freight_insurance_usd: z.number().optional(),
}).partial();

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createServiceClient();
    const { user, profile } = await getAuthenticatedProfile(request);

    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!profile?.org_id) return NextResponse.json({ error: 'No organization' }, { status: 403 });
    if (!ALLOWED_ROLES.includes(profile.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    // TODO(schema-drift): table 'shipment_templates' does not exist on the live DB — the
    // migration (supabase/migrations/20260403_shipment_templates.sql) that creates it has not
    // been applied. This query will fail at runtime until that migration is applied. Needs a
    // product decision: apply the migration, or remove this feature until it is.
    const { data, error } = await supabase
      .from('shipment_templates' as any) // TODO(schema-drift): table missing on live DB, see supabase/migrations/20260403_shipment_templates.sql
      .select('*')
      .eq('id', params.id)
      .eq('org_id', profile.org_id)
      .single();

    if (error || !data) return NextResponse.json({ error: 'Template not found' }, { status: 404 });

    return NextResponse.json({ template: data });
  } catch (error) {
    console.error('Template GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createServiceClient();
    const { user, profile } = await getAuthenticatedProfile(request);

    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!profile?.org_id) return NextResponse.json({ error: 'No organization' }, { status: 403 });
    if (!WRITE_ROLES.includes(profile.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const body = await request.json().catch(() => ({}));
    const parsed = patchSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation error', fields: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    // TODO(schema-drift): table 'shipment_templates' does not exist on the live DB — see note
    // in GET above.
    const { data, error } = await supabase
      .from('shipment_templates' as any) // TODO(schema-drift): table missing on live DB, see supabase/migrations/20260403_shipment_templates.sql
      .update({ ...parsed.data, updated_at: new Date().toISOString() })
      .eq('id', params.id)
      .eq('org_id', profile.org_id)
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    if (!data) return NextResponse.json({ error: 'Template not found' }, { status: 404 });

    return NextResponse.json({ template: data });
  } catch (error) {
    console.error('Template PATCH error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createServiceClient();
    const { user, profile } = await getAuthenticatedProfile(request);

    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!profile?.org_id) return NextResponse.json({ error: 'No organization' }, { status: 403 });
    if (!WRITE_ROLES.includes(profile.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    // TODO(schema-drift): table 'shipment_templates' does not exist on the live DB — see note
    // in GET above.
    const { error } = await supabase
      .from('shipment_templates' as any) // TODO(schema-drift): table missing on live DB, see supabase/migrations/20260403_shipment_templates.sql
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq('id', params.id)
      .eq('org_id', profile.org_id);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Template DELETE error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
