import { NextRequest, NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase/admin';

const EVENT_SLUG = 'yexdep-2026';

function isAdminAuthorized(request: NextRequest): boolean {
  const key = request.headers.get('x-admin-key');
  const adminKey = process.env.EVENTS_ADMIN_KEY;
  return !!adminKey && key === adminKey;
}

export async function GET(request: NextRequest) {
  if (!isAdminAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = getAdminClient();
  const { data, error } = await supabase
    .from('event_registrations')
    .select('id, full_name, email, phone, organization, role, state, registered_at, checked_in, checked_in_at')
    .eq('event_slug', EVENT_SLUG)
    .order('registered_at', { ascending: false });

  if (error) {
    console.error('[events/registrations] DB error:', error);
    return NextResponse.json({ error: 'Failed to fetch registrations' }, { status: 500 });
  }

  return NextResponse.json({ registrations: data });
}
