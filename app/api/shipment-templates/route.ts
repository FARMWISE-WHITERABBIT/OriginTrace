/**
 * GET  /api/shipment-templates   — list all templates for org
 * POST /api/shipment-templates   — create a template
 *
 * Roles: admin, logistics_coordinator
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createServiceClient, getAuthenticatedProfile } from '@/lib/api-auth';

const ALLOWED_ROLES = ['admin', 'logistics_coordinator', 'compliance_officer'];
const WRITE_ROLES = ['admin', 'logistics_coordinator'];

const templateSchema = z.object({
  name: z.string().min(1).max(255),
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
});

export async function GET(request: NextRequest) {
  try {
    const supabase = createServiceClient();
    const { user, profile } = await getAuthenticatedProfile(request);

    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!profile?.org_id) return NextResponse.json({ error: 'No organization' }, { status: 403 });
    if (!ALLOWED_ROLES.includes(profile.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const { data, error } = await supabase
      .from('shipment_templates')
      .select('*')
      .eq('org_id', profile.org_id)
      .eq('is_active', true)
      .order('name', { ascending: true });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ templates: data ?? [] });
  } catch (error) {
    console.error('Templates GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createServiceClient();
    const { user, profile } = await getAuthenticatedProfile(request);

    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!profile?.org_id) return NextResponse.json({ error: 'No organization' }, { status: 403 });
    if (!WRITE_ROLES.includes(profile.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const body = await request.json().catch(() => ({}));
    const parsed = templateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation error', fields: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from('shipment_templates')
      .insert({
        ...parsed.data,
        buyer_contact: parsed.data.buyer_contact || null,
        org_id: profile.org_id,
        created_by: user.id,
      })
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ template: data }, { status: 201 });
  } catch (error) {
    console.error('Templates POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
