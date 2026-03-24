import { NextRequest, NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase/admin';

export async function GET(request: NextRequest) {
  const slug = request.nextUrl.searchParams.get('slug');
  if (!slug) {
    return NextResponse.json({ error: 'slug is required' }, { status: 400 });
  }

  const supabase = getAdminClient();
  const { data, error } = await supabase
    .from('events')
    .select('registration_open, registration_closes_at')
    .eq('slug', slug)
    .single();

  if (error || !data) {
    // Default open if event not found — avoids blocking legacy registrations
    return NextResponse.json({ registrationOpen: true });
  }

  const now = new Date();
  const closedByFlag = !data.registration_open;
  const closedByTime = data.registration_closes_at
    ? now > new Date(data.registration_closes_at)
    : false;

  return NextResponse.json({ registrationOpen: !closedByFlag && !closedByTime });
}
