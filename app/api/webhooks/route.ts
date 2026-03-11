import { createAdminClient } from '@/lib/supabase/admin';
import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedProfile } from '@/lib/api-auth';
import { z } from 'zod';
import { WEBHOOK_EVENTS } from '@/lib/webhooks';
import { logAuditEvent, getClientIp } from '@/lib/audit';
import crypto from 'crypto';

const webhookCreateSchema = z.object({
  url: z.string().url('Must be a valid URL'),
  events: z.array(z.string()).min(1, 'At least one event is required'),
  description: z.string().optional(),
});

export async function GET(request: NextRequest) {
  try {
    const supabase = createAdminClient();
    const { user, profile } = await getAuthenticatedProfile(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    if (!profile.org_id) return NextResponse.json({ error: 'No organization assigned' }, { status: 403 });

    const { data: endpoints } = await supabase
      .from('webhook_endpoints')
      .select('*')
      .eq('org_id', profile.org_id)
      .order('created_at', { ascending: false });

    const { data: recentDeliveries } = await supabase
      .from('webhook_deliveries')
      .select('*, webhook_endpoints!inner(org_id)')
      .eq('webhook_endpoints.org_id', profile.org_id)
      .order('created_at', { ascending: false })
      .limit(50);

    return NextResponse.json({
      endpoints: endpoints || [],
      deliveries: recentDeliveries || [],
      availableEvents: WEBHOOK_EVENTS,
    });
  } catch (error) {
    console.error('Webhooks GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createAdminClient();
    const { user, profile } = await getAuthenticatedProfile(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    if (!profile.org_id) return NextResponse.json({ error: 'No organization assigned' }, { status: 403 });

    const body = await request.json();
    const parsed = webhookCreateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', fields: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const secret = crypto.randomBytes(32).toString('hex');

    const { data: endpoint, error: insertError } = await supabase
      .from('webhook_endpoints')
      .insert({
        org_id: profile.org_id,
        url: parsed.data.url,
        secret,
        events: parsed.data.events,
        description: parsed.data.description || null,
        status: 'active',
      })
      .select()
      .single();

    if (insertError) {
      console.error('Webhook create error:', insertError);
      return NextResponse.json({ error: 'Failed to create webhook' }, { status: 500 });
    }

    await logAuditEvent({
      orgId: profile.org_id,
      actorId: user.id,
      actorEmail: user.email,
      action: 'webhook.created',
      resourceType: 'webhook',
      resourceId: endpoint.id,
      metadata: { url: parsed.data.url, events: parsed.data.events },
      ipAddress: getClientIp(request),
    });

    return NextResponse.json({ endpoint: { ...endpoint, secret } });
  } catch (error) {
    console.error('Webhooks POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const supabase = createAdminClient();
    const { user, profile } = await getAuthenticatedProfile(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    if (!profile.org_id) return NextResponse.json({ error: 'No organization assigned' }, { status: 403 });

    const webhookId = request.nextUrl.searchParams.get('id');
    if (!webhookId) {
      return NextResponse.json({ error: 'Webhook ID required' }, { status: 400 });
    }

    await supabase
      .from('webhook_endpoints')
      .delete()
      .eq('id', webhookId)
      .eq('org_id', profile.org_id);

    await logAuditEvent({
      orgId: profile.org_id,
      actorId: user.id,
      actorEmail: user.email,
      action: 'webhook.deleted',
      resourceType: 'webhook',
      resourceId: webhookId,
      ipAddress: getClientIp(request),
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Webhooks DELETE error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
