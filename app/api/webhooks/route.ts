import { NextRequest, NextResponse } from 'next/server';
import { createClient as createServerClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { enforceTier } from '@/lib/api/tier-guard';
import { validateBody } from '@/lib/api/validation';
import { z } from 'zod';
import type { WebhookEventType } from '@/lib/webhooks/types';

const WebhookSchema = z.object({
  url: z.string().url('Must be a valid HTTPS URL').refine(u => u.startsWith('https://'), 'Must use HTTPS'),
  description: z.string().max(500).optional(),
  event_types: z.array(z.string()).min(1, 'At least one event type is required'),
});

export async function GET(request: NextRequest) {
  try {
    const authClient = await createServerClient();
    const { data: { user } } = await authClient.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const supabase = createAdminClient();
    const { data: profile } = await supabase.from('profiles').select('org_id, role').eq('user_id', user.id).single();
    if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 });

    const tierBlock = await enforceTier(profile.org_id, 'enterprise_api');
    if (tierBlock) return tierBlock;

    const { data: endpoints } = await supabase
      .from('webhook_endpoints')
      .select('id, url, description, event_types, is_active, created_at, last_delivered_at, failure_count')
      .eq('org_id', profile.org_id)
      .order('created_at', { ascending: false });

    return NextResponse.json({ endpoints: endpoints || [] });
  } catch (err) {
    console.error('[webhooks] GET error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const authClient = await createServerClient();
    const { data: { user } } = await authClient.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const supabase = createAdminClient();
    const { data: profile } = await supabase.from('profiles').select('org_id, role').eq('user_id', user.id).single();
    if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 });

    const tierBlock = await enforceTier(profile.org_id, 'enterprise_api');
    if (tierBlock) return tierBlock;

    const validation = await validateBody(request, WebhookSchema);
    if (validation.error) return validation.error;

    // Generate a signing secret
    const secret = `ot_whsec_${Array.from(crypto.getRandomValues(new Uint8Array(32))).map(b => b.toString(16).padStart(2, '0')).join('')}`;

    const { data: endpoint, error } = await supabase
      .from('webhook_endpoints')
      .insert({
        org_id: profile.org_id,
        url: validation.data.url,
        description: validation.data.description,
        event_types: validation.data.event_types,
        secret,
        is_active: true,
        failure_count: 0,
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    // Return secret only once at creation — it won't be retrievable again
    return NextResponse.json({ endpoint, secret }, { status: 201 });
  } catch (err) {
    console.error('[webhooks] POST error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
