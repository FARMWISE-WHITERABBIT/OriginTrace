import { NextRequest, NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase/admin';
import { z } from 'zod';

const EVENT_SLUG = 'yexdep-2026';

function isAdminAuthorized(request: NextRequest): boolean {
  const key = request.headers.get('x-admin-key');
  const adminKey = process.env.EVENTS_ADMIN_KEY;
  return !!adminKey && key === adminKey;
}

const checkinSchema = z.object({
  registrationId: z.string().uuid(),
});

export async function POST(request: NextRequest) {
  if (!isAdminAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const parsed = checkinSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid registration ID' }, { status: 422 });
  }

  const { registrationId } = parsed.data;
  const supabase = getAdminClient();

  const { data: rawData, error } = await supabase
    .from('event_registrations')
    .update({ checked_in: true, checked_in_at: new Date().toISOString() })
    .eq('id', registrationId)
    .eq('event_slug', EVENT_SLUG)
    .eq('checked_in', false) // only update if not already checked in
    .select('id, full_name, checked_in_at')
    .single();

  const data = rawData as unknown as { id: string; full_name: string | null; checked_in_at: string | null } | null;

  if (error) {
    // PGRST116 = no rows matched (already checked in or not found)
    if (error.code === 'PGRST116') {
      // Check if it exists and is already checked in
      const { data: rawExisting } = await supabase
        .from('event_registrations')
        .select('id, full_name, checked_in, checked_in_at')
        .eq('id', registrationId)
        .single();

      const existing = rawExisting as unknown as { id: string; full_name: string | null; checked_in: boolean | null; checked_in_at: string | null } | null;

      if (existing?.checked_in) {
        return NextResponse.json(
          { error: 'Already checked in', checkedInAt: existing.checked_in_at },
          { status: 409 }
        );
      }
      return NextResponse.json({ error: 'Registration not found' }, { status: 404 });
    }
    console.error('[events/checkin] DB error:', error);
    return NextResponse.json({ error: 'Check-in failed. Please try again.' }, { status: 500 });
  }

  return NextResponse.json({ success: true, fullName: data?.full_name, checkedInAt: data?.checked_in_at });
}
