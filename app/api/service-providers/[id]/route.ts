/**
 * PATCH  /api/service-providers/[id]  — update provider
 * DELETE /api/service-providers/[id]  — soft-delete (is_active = false)
 *
 * Roles: admin, logistics_coordinator
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createServiceClient, getAuthenticatedProfile } from '@/lib/api-auth';

const WRITE_ROLES = ['admin', 'logistics_coordinator'];

const patchSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  contact_name: z.string().max(255).optional(),
  contact_email: z.string().email().optional().or(z.literal('')),
  contact_phone: z.string().max(50).optional(),
  address: z.string().max(500).optional(),
  country: z.string().max(100).optional(),
  registration_number: z.string().max(100).optional(),
  notes: z.string().max(1000).optional(),
  is_preferred: z.boolean().optional(),
  is_active: z.boolean().optional(),
});

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

    const { data, error } = await supabase
      .from('service_providers')
      .update({ ...parsed.data, updated_at: new Date().toISOString() })
      .eq('id', params.id)
      .eq('org_id', profile.org_id)
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    if (!data) return NextResponse.json({ error: 'Provider not found' }, { status: 404 });

    return NextResponse.json({ provider: data });
  } catch (error) {
    console.error('Service provider PATCH error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createServiceClient();
    const { user, profile } = await getAuthenticatedProfile();

    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!profile?.org_id) return NextResponse.json({ error: 'No organization' }, { status: 403 });
    if (!WRITE_ROLES.includes(profile.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const { error } = await supabase
      .from('service_providers')
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq('id', params.id)
      .eq('org_id', profile.org_id);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Service provider DELETE error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
