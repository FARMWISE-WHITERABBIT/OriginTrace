import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { getAdminClient } from '@/lib/supabase/admin';
import { z } from 'zod';

async function assertSuperadmin(): Promise<boolean> {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: () => {},
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;

  const admin = getAdminClient();
  const { data } = await admin
    .from('system_admins')
    .select('id')
    .eq('user_id', user.id)
    .single();

  return !!data;
}

const eventSchema = z.object({
  slug:                    z.string().min(2).max(100).regex(/^[a-z0-9-]+$/),
  title:                   z.string().min(2).max(200),
  short_title:             z.string().max(80).optional(),
  description:             z.string().max(1000).optional(),
  theme:                   z.string().max(300).optional(),
  partner:                 z.string().max(200).optional(),
  date:                    z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  start_time:              z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/).optional(),
  location:                z.string().min(2).max(300),
  location_address:        z.string().max(500).optional(),
  tags:                    z.array(z.string()).optional(),
  is_free:                 z.boolean().optional(),
  registration_open:       z.boolean().optional(),
  registration_closes_at:  z.string().nullable().optional(),
  image_url:               z.string().url().nullable().optional(),
});

// GET — list all events with registration counts
export async function GET() {
  if (!(await assertSuperadmin())) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const supabase = getAdminClient();

  const { data: events, error } = await supabase
    .from('events')
    .select('*')
    .order('date', { ascending: false });

  if (error) {
    return NextResponse.json({ error: 'Failed to fetch events' }, { status: 500 });
  }

  // Attach registration counts
  const slugs = (events ?? []).map(e => e.slug);
  const counts: Record<string, number> = {};

  if (slugs.length > 0) {
    const { data: regData } = await supabase
      .from('event_registrations')
      .select('event_slug')
      .in('event_slug', slugs);

    (regData ?? []).forEach(r => {
      counts[r.event_slug] = (counts[r.event_slug] ?? 0) + 1;
    });
  }

  const enriched = (events ?? []).map(e => ({
    ...e,
    registration_count: counts[e.slug] ?? 0,
  }));

  return NextResponse.json({ events: enriched });
}

// POST — create a new event
export async function POST(request: NextRequest) {
  if (!(await assertSuperadmin())) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  let body: unknown;
  try { body = await request.json(); } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = eventSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Validation failed', details: parsed.error.flatten().fieldErrors },
      { status: 422 }
    );
  }

  const supabase = getAdminClient();
  const { data, error } = await supabase
    .from('events')
    .insert(parsed.data)
    .select()
    .single();

  if (error) {
    if (error.code === '23505') {
      return NextResponse.json({ error: 'An event with that slug already exists.' }, { status: 409 });
    }
    console.error('[superadmin/events] insert error:', error);
    return NextResponse.json({ error: 'Failed to create event' }, { status: 500 });
  }

  return NextResponse.json({ event: data }, { status: 201 });
}

// PATCH — update event (pass slug in body)
export async function PATCH(request: NextRequest) {
  if (!(await assertSuperadmin())) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  let body: unknown;
  try { body = await request.json(); } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { slug, ...rest } = body as Record<string, unknown>;
  if (!slug || typeof slug !== 'string') {
    return NextResponse.json({ error: 'slug is required' }, { status: 400 });
  }

  const partial = eventSchema.partial().omit({ slug: true }).safeParse(rest);
  if (!partial.success) {
    return NextResponse.json(
      { error: 'Validation failed', details: partial.error.flatten().fieldErrors },
      { status: 422 }
    );
  }

  const supabase = getAdminClient();
  const { data, error } = await supabase
    .from('events')
    .update({ ...partial.data, updated_at: new Date().toISOString() })
    .eq('slug', slug)
    .select()
    .single();

  if (error) {
    console.error('[superadmin/events] update error:', error);
    return NextResponse.json({ error: 'Failed to update event' }, { status: 500 });
  }

  return NextResponse.json({ event: data });
}

// DELETE — remove event (pass slug as query param)
export async function DELETE(request: NextRequest) {
  if (!(await assertSuperadmin())) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const slug = request.nextUrl.searchParams.get('slug');
  if (!slug) {
    return NextResponse.json({ error: 'slug is required' }, { status: 400 });
  }

  const supabase = getAdminClient();
  const { error } = await supabase.from('events').delete().eq('slug', slug);

  if (error) {
    console.error('[superadmin/events] delete error:', error);
    return NextResponse.json({ error: 'Failed to delete event' }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
