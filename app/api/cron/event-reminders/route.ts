import { createAdminClient } from '@/lib/supabase/admin';
import { NextRequest, NextResponse } from 'next/server';
import { sendEmail } from '@/lib/email/resend-client';
import {
  buildDayBeforeReminderEmail,
  buildDayOfReminderEmail,
  getEventEmailContext,
} from '@/lib/email/event-registration-templates';

export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    console.error('[cron/event-reminders] CRON_SECRET is not configured');
    return NextResponse.json({ error: 'Server misconfiguration' }, { status: 500 });
  }

  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createAdminClient();

  // Use UTC date — cron fires at 06:00 UTC (07:00 WAT)
  const todayUtc = new Date().toISOString().slice(0, 10);
  const tomorrowUtc = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

  // Fetch events needing day-before reminders (date = tomorrow, not yet sent)
  const { data: dayBeforeEvents } = await supabase
    .from('events')
    .select('slug, title, short_title')
    .eq('date', tomorrowUtc)
    .eq('reminder_sent_day_before', false);

  // Fetch events needing day-of reminders (date = today, not yet sent)
  const { data: dayOfEvents } = await supabase
    .from('events')
    .select('slug, title, short_title')
    .eq('date', todayUtc)
    .eq('reminder_sent_day_of', false);

  const summary = {
    day_before: { events: 0, sent: 0, failed: 0 },
    day_of:     { events: 0, sent: 0, failed: 0 },
  };

  async function sendReminders(
    events: { slug: string }[],
    type: 'day_before' | 'day_of',
  ) {
    const isTypeDayBefore = type === 'day_before';
    const bucket = isTypeDayBefore ? summary.day_before : summary.day_of;
    const trackingColumn = isTypeDayBefore ? 'reminder_sent_day_before' : 'reminder_sent_day_of';

    for (const event of events) {
      bucket.events++;
      const ctx = getEventEmailContext(event.slug);
      const subject = isTypeDayBefore
        ? `Tomorrow: ${ctx.eventTitle} — ${ctx.date}`
        : `Today: ${ctx.eventTitle} starts at ${ctx.time}`;

      const { data: registrants } = await supabase
        .from('event_registrations')
        .select('full_name, email')
        .eq('event_slug', event.slug)
        .order('registered_at', { ascending: true });

      for (const r of registrants ?? []) {
        const html = isTypeDayBefore
          ? buildDayBeforeReminderEmail({ fullName: r.full_name }, ctx)
          : buildDayOfReminderEmail({ fullName: r.full_name }, ctx);

        const result = await sendEmail({ to: r.email, subject, html });

        if (result.success) {
          bucket.sent++;
        } else {
          bucket.failed++;
          console.error(`[cron/event-reminders] ${type} failed for ${r.email} (${event.slug}):`, result.error);
        }

        // Respect Resend rate limit — 2 req/sec on free plan
        await new Promise(res => setTimeout(res, 550));
      }

      // Mark sent regardless of individual failures — prevents re-running on next cron tick
      await supabase
        .from('events')
        .update({ [trackingColumn]: true })
        .eq('slug', event.slug);
    }
  }

  await sendReminders(dayBeforeEvents ?? [], 'day_before');
  await sendReminders(dayOfEvents ?? [], 'day_of');

  console.info('[cron/event-reminders] Complete:', summary);

  return NextResponse.json({ success: true, summary });
}
