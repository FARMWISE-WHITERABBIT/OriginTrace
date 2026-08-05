import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getAuthenticatedProfile } from '@/lib/api-auth';
import { z } from 'zod';

const SUPPORTED_EVENTS = [
  'farm.approved', 'farm.rejected', 'farm.created',
  'batch.created', 'batch.completed',
  'shipment.created', 'shipment.status_changed',
  'compliance.changed', 'deforestation.alert',
] as const;

const createIntegrationSchema = z.object({
  name: z.string().min(1).max(100),
  endpoint_url: z.string().url(),
  http_method: z.enum(['POST', 'PUT', 'PATCH']).default('POST'),
  headers: z.record(z.string()).optional().default({}),
  api_key: z.string().optional(),
  event_subscriptions: z.array(z.enum(SUPPORTED_EVENTS)).min(1),
  field_mapping: z.record(z.string()).optional().default({}),
  is_active: z.boolean().default(true),
});

const updateIntegrationSchema = createIntegrationSchema.partial().extend({
  id: z.string().uuid(),
});

export async function GET(request: NextRequest) {
  try {
    const { user, profile } = await getAuthenticatedProfile(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!profile?.org_id) return NextResponse.json({ error: 'No organization' }, { status: 403 });
    if (profile.role !== 'admin') return NextResponse.json({ error: 'Admins only' }, { status: 403 });

    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from('org_integrations')
      .select('id, name, type, endpoint_url, http_method, headers, event_subscriptions, field_mapping, is_active, last_synced_at, last_error, created_at')
      .eq('org_id', profile.org_id)
      .order('created_at', { ascending: false });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ integrations: data });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { user, profile } = await getAuthenticatedProfile(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!profile?.org_id) return NextResponse.json({ error: 'No organization' }, { status: 403 });
    if (profile.role !== 'admin') return NextResponse.json({ error: 'Admins only' }, { status: 403 });

    const body = await request.json();
    const parsed = createIntegrationSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Validation failed', fields: parsed.error.flatten().fieldErrors }, { status: 400 });
    }

    const { api_key, ...rest } = parsed.data;
    const supabase = createAdminClient();

    const { data, error } = await supabase
      .from('org_integrations')
      .insert({
        org_id: profile.org_id,
        created_by: user.id,
        ...rest,
        api_key_enc: api_key ?? null,
      })
      .select('id, name, endpoint_url, http_method, event_subscriptions, is_active, created_at')
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ integration: data }, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const { user, profile } = await getAuthenticatedProfile(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!profile?.org_id) return NextResponse.json({ error: 'No organization' }, { status: 403 });
    if (profile.role !== 'admin') return NextResponse.json({ error: 'Admins only' }, { status: 403 });

    const body = await request.json();
    const parsed = updateIntegrationSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Validation failed', fields: parsed.error.flatten().fieldErrors }, { status: 400 });
    }

    const { id, api_key, ...rest } = parsed.data;
    const updateData: Record<string, unknown> = { ...rest };
    if (api_key !== undefined) updateData.api_key_enc = api_key;

    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from('org_integrations')
      .update(updateData)
      .eq('id', id)
      .eq('org_id', profile.org_id)
      .select('id, name, endpoint_url, http_method, event_subscriptions, is_active, last_synced_at, last_error')
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ integration: data });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { user, profile } = await getAuthenticatedProfile(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!profile?.org_id) return NextResponse.json({ error: 'No organization' }, { status: 403 });
    if (profile.role !== 'admin') return NextResponse.json({ error: 'Admins only' }, { status: 403 });

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 });

    const supabase = createAdminClient();
    const { error } = await supabase
      .from('org_integrations')
      .delete()
      .eq('id', id)
      .eq('org_id', profile.org_id);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
