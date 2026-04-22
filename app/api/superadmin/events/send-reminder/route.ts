import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { getAdminClient } from '@/lib/supabase/admin';
import { sendEmail } from '@/lib/email/resend-client';
import {
  buildDayBeforeReminderEmail,
  buildDayOfReminderEmail,
  getEventEmailContext,
} from '@/lib/email/event-registration-templates';

async function assertSuperadmin(): Promise<boolean> {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  );
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;
  const admin = getAdminClient();
  const { data } = await admin.from('system_admins').select('id').eq('user_id', user.id).single();
  return !!data;
}

export async function POST(request: NextRequest) {
  if (!(await assertSuperadmin())) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  let body: { slug: string; type: 'day_before' | 'day_of' };
  try { body = await request.json(); } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { slug, type } = body;
  if (!slug) return NextResponse.json({ error: 'slug is required' }, { status: 400 });
  if (type !== 'day_before' && type !== 'day_of') {
    return NextResponse.json({ error: 'type must be day_before or day_of' }, { status: 400 });
  }

  const supabase = getAdminClient();

  const { data: registrants, error: regError } = await supabase
    .from('event_registrations')
    .select('id, full_name, email')
    .eq('event_slug', slug)
    .order('registered_at', { ascending: true });

  if (regError) {
    console.error('[send-reminder] DB error:', regError);
    return NextResponse.json({ error: 'Failed to fetch registrants' }, { status: 500 });
  }

  if (!registrants || registrants.length === 0) {
    return NextResponse.json({ sent: 0, failed: 0, total: 0, message: 'No registrants found' });
  }

  const ctx = getEventEmailContext(slug);
  const isTypeDayBefore = type === 'day_before';
  const subject = isTypeDayBefore
    ? `Tomorrow: ${ctx.eventTitle} — ${ctx.date}`
    : `Today: ${ctx.eventTitle} starts at ${ctx.time}`;

  const results = { sent: 0, failed: 0, failures: [] as string[] };

  for (const r of registrants) {
    const html = isTypeDayBefore
      ? buildDayBeforeReminderEmail({ fullName: r.full_name }, ctx)
      : buildDayOfReminderEmail({ fullName: r.full_name }, ctx);

    const result = await sendEmail({ to: r.email, subject, html });

    if (result.success) {
      results.sent++;
    } else {
      results.failed++;
      results.failures.push(`${r.email}: ${result.error}`);
      console.error(`[send-reminder] Failed for ${r.email}:`, result.error);
    }

    // Respect Resend rate limit — 2 req/sec on free plan
    await new Promise(res => setTimeout(res, 550));
  }

  // Mark the tracking boolean so the cron knows this reminder has been sent
  const trackingColumn = isTypeDayBefore ? 'reminder_sent_day_before' : 'reminder_sent_day_of';
  await supabase
    .from('events')
    .update({ [trackingColumn]: true })
    .eq('slug', slug);

  return NextResponse.json({
    sent: results.sent,
    failed: results.failed,
    total: registrants.length,
    failures: results.failures,
    message: `Sent ${results.sent} of ${registrants.length} ${isTypeDayBefore ? 'day-before' : 'day-of'} reminders.`,
  });
}
