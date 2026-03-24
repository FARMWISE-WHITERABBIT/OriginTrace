import { NextRequest, NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase/admin';

function isAdminAuthorized(request: NextRequest): boolean {
  const key = request.headers.get('x-admin-key');
  const adminKey = process.env.EVENTS_ADMIN_KEY;
  return !!adminKey && key === adminKey;
}

export async function GET(request: NextRequest) {
  if (!isAdminAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const slug = request.nextUrl.searchParams.get('slug') ?? 'yexdep-2026';
  const supabase = getAdminClient();
  const { data, error } = await supabase
    .from('event_registrations')
    .select(
      'id, full_name, email, phone, organization, role, state, ' +
      'currently_exporting, export_products, nepc_registered, ' +
      'registered_at, checked_in, checked_in_at'
    )
    .eq('event_slug', slug)
    .order('registered_at', { ascending: false });

  if (error) {
    console.error('[events/registrations] DB error:', error);
    return NextResponse.json({ error: 'Failed to fetch registrations' }, { status: 500 });
  }

  return NextResponse.json({ registrations: data });
}
