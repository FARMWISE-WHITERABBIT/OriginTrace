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

// GET — list registrations for an event
export async function GET(request: NextRequest) {
  if (!(await assertSuperadmin())) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const slug = request.nextUrl.searchParams.get('slug');
  if (!slug) {
    return NextResponse.json({ error: 'slug is required' }, { status: 400 });
  }

  const supabase = getAdminClient();
  const { data, error } = await supabase
    .from('event_registrations')
    .select('id, full_name, email, phone, organization, role, state, registered_at, checked_in, checked_in_at')
    .eq('event_slug', slug)
    .order('registered_at', { ascending: false });

  if (error) {
    console.error('[superadmin/events/checkin] fetch error:', error);
    return NextResponse.json({ error: 'Failed to fetch registrations' }, { status: 500 });
  }

  return NextResponse.json({ registrations: data ?? [] });
}

// POST — mark a registration as checked in
export async function POST(request: NextRequest) {
  if (!(await assertSuperadmin())) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  let body: unknown;
  try { body = await request.json(); } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = z.object({ registrationId: z.string().uuid() }).safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid registrationId' }, { status: 422 });
  }

  const supabase = getAdminClient();
  const { data, error } = await supabase
    .from('event_registrations')
    .update({ checked_in: true, checked_in_at: new Date().toISOString() })
    .eq('id', parsed.data.registrationId)
    .eq('checked_in', false)
    .select('full_name, checked_in_at')
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      const { data: existing } = await supabase
        .from('event_registrations')
        .select('checked_in, checked_in_at')
        .eq('id', parsed.data.registrationId)
        .single();

      if (existing?.checked_in) {
        return NextResponse.json(
          { error: 'Already checked in', checkedInAt: existing.checked_in_at },
          { status: 409 }
        );
      }
      return NextResponse.json({ error: 'Registration not found' }, { status: 404 });
    }
    console.error('[superadmin/events/checkin] update error:', error);
    return NextResponse.json({ error: 'Failed to check in' }, { status: 500 });
  }

  const row = data as unknown as { full_name: string; checked_in_at: string };
  return NextResponse.json({ success: true, fullName: row.full_name, checkedInAt: row.checked_in_at });
}
