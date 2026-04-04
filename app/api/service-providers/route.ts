/**
 * GET  /api/service-providers          — list providers (filterable by type)
 * POST /api/service-providers          — create a new provider
 *
 * Roles: admin, logistics_coordinator (read also compliance_officer)
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createServiceClient, getAuthenticatedProfile } from '@/lib/api-auth';

const ALLOWED_ROLES = ['admin', 'logistics_coordinator', 'compliance_officer'];
const WRITE_ROLES = ['admin', 'logistics_coordinator'];

const PROVIDER_TYPES = [
  'freight_forwarder',
  'clearing_agent',
  'inspection_body',
  'lab',
  'shipping_line',
] as const;

const providerSchema = z.object({
  provider_type: z.enum(PROVIDER_TYPES),
  name: z.string().min(1).max(255),
  contact_name: z.string().max(255).optional(),
  contact_email: z.string().email().optional().or(z.literal('')),
  contact_phone: z.string().max(50).optional(),
  address: z.string().max(500).optional(),
  country: z.string().max(100).optional(),
  registration_number: z.string().max(100).optional(),
  notes: z.string().max(1000).optional(),
  is_preferred: z.boolean().optional(),
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

    const { searchParams } = new URL(request.url);
    const typeFilter = searchParams.get('type');
    const activeOnly = searchParams.get('active') !== 'false';

    let query = supabase
      .from('service_providers')
      .select('*')
      .eq('org_id', profile.org_id)
      .order('is_preferred', { ascending: false })
      .order('name', { ascending: true });

    if (typeFilter && PROVIDER_TYPES.includes(typeFilter as any)) {
      query = query.eq('provider_type', typeFilter);
    }
    if (activeOnly) {
      query = query.eq('is_active', true);
    }

    const { data, error } = await query;
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ providers: data ?? [] });
  } catch (error) {
    console.error('Service providers GET error:', error);
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
    const parsed = providerSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation error', fields: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from('service_providers')
      .insert({
        ...parsed.data,
        contact_email: parsed.data.contact_email || null,
        org_id: profile.org_id,
        created_by: user.id,
      })
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ provider: data }, { status: 201 });
  } catch (error) {
    console.error('Service providers POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
