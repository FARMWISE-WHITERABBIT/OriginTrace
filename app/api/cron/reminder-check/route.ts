import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { updateDealStage } from '@/lib/hubspot';
import { send24hReminder, send1hReminder, sendNoShowRecovery } from '@/lib/meta-whatsapp';
import { sendEmail } from '@/lib/email/resend-client';
import { buildNoShowRecoveryEmail } from '@/lib/email/templates';

/**
 * GET /api/cron/reminder-check
 * Runs once daily at 07:00 UTC (see vercel.json) — NOT hourly. A previous
 * version of this comment claimed hourly execution; the schedule was never
 * that frequent, which silently broke the timing assumptions below.
 *
 * Three responsibilities per run:
 *  1. Send a "day before" WhatsApp + email reminder for meetings roughly
 *     12-36h away (widened from a narrow 23-25h band so a single daily
 *     pass is guaranteed to catch every meeting at least once, regardless
 *     of what time of day it was booked relative to the 07:00 UTC run).
 *  2. Send a 1h-before WhatsApp reminder for imminent meetings. NOTE: this
 *     is only reachable if the cron happens to run 55-65 minutes before a
 *     meeting, which a once-daily schedule essentially never satisfies —
 *     this reminder will not fire for the vast majority of bookings as
 *     currently deployed. Fixing this for real needs either a more
 *     frequent cron (Vercel plan-dependent) or replacing it with a
 *     same-day-morning reminder instead of a true 1h one — a scheduling
 *     decision, not something to silently reinterpret here.
 *  3. Detect no-shows (meeting time passed 30+ min ago), send recovery
 *     messages. Also only checked once daily, so detection can lag by up
 *     to ~24h.
 */
export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    return NextResponse.json({ error: 'CRON_SECRET not configured' }, { status: 500 });
  }
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createAdminClient();
  const calcomLink = process.env.CALCOM_LINK || 'https://cal.com/origintrace/discovery';
  const now = new Date();

  const results = { reminders_24h: 0, reminders_1h: 0, no_shows: 0 };

  // ── 1. "Day before" reminder window: meeting is 12-36 hours away ────────────
  // Widened from the original 23-25h band (see file header) so this always
  // overlaps with the next daily run, whatever time the meeting was booked for.
  const window24hStart = new Date(now.getTime() + 12 * 60 * 60 * 1000);
  const window24hEnd   = new Date(now.getTime() + 36 * 60 * 60 * 1000);

  const { data: jobs24h } = await supabase
    .from('lead_nurture_jobs')
    .select('id, lead_email, lead_name, lead_phone, meeting_at, hubspot_deal_id, reminders_sent')
    .eq('status', 'booked')
    .gte('meeting_at', window24hStart.toISOString())
    .lte('meeting_at', window24hEnd.toISOString())
    .is('reminders_sent->24h', null);

  for (const job of jobs24h ?? []) {
    const meetingAt = new Date(job.meeting_at!);

    if (job.lead_phone) {
      await send24hReminder(job.lead_phone, job.lead_name, meetingAt, calcomLink)
        .catch(err => console.error('[reminder-check] 24h WhatsApp failed:', err));
    }

    // 24h reminder email
    const reminderHtml = `
      <div style="font-family:sans-serif;max-width:560px;margin:0 auto;color:#1a1a1a">
        <h2 style="margin:0 0 8px">Your OriginTrace call is tomorrow</h2>
        <p style="color:#555;margin:0 0 16px">Hi ${job.lead_name.split(' ')[0]}, just a quick reminder that your discovery call is scheduled for:</p>
        <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:16px 20px;margin-bottom:20px">
          <p style="margin:0;font-size:16px;font-weight:600;color:#166534">
            ${meetingAt.toLocaleString('en-GB', { weekday:'long', day:'numeric', month:'long', hour:'2-digit', minute:'2-digit', timeZoneName:'short' })}
          </p>
        </div>
        <p style="color:#555;margin:0 0 16px">Check your calendar invite for the video link. See you then!</p>
        <p style="color:#555;margin:0">— The OriginTrace Team</p>
      </div>
    `;

    await sendEmail({
      to: job.lead_email,
      subject: 'Reminder: Your OriginTrace call is tomorrow',
      html: reminderHtml,
    }).catch(err => console.error('[reminder-check] 24h email failed:', err));

    await supabase
      .from('lead_nurture_jobs')
      .update({ reminders_sent: { ...((job.reminders_sent as Record<string, boolean>) || {}), '24h': true } })
      .eq('id', job.id);

    results.reminders_24h++;
  }

  // ── 2. 1h reminder window: meeting is 55-65 minutes away ────────────────────
  const window1hStart = new Date(now.getTime() + 55 * 60 * 1000);
  const window1hEnd   = new Date(now.getTime() + 65 * 60 * 1000);

  const { data: jobs1h } = await supabase
    .from('lead_nurture_jobs')
    .select('id, lead_name, lead_phone, meeting_at, reminders_sent')
    .eq('status', 'booked')
    .gte('meeting_at', window1hStart.toISOString())
    .lte('meeting_at', window1hEnd.toISOString())
    .is('reminders_sent->1h', null);

  for (const job of jobs1h ?? []) {
    const meetingAt = new Date(job.meeting_at!);

    if (job.lead_phone) {
      await send1hReminder(job.lead_phone, job.lead_name, meetingAt)
        .catch(err => console.error('[reminder-check] 1h WhatsApp failed:', err));
    }

    await supabase
      .from('lead_nurture_jobs')
      .update({
        reminders_sent: { ...((job.reminders_sent as Record<string, boolean>) || {}), '1h': true },
      })
      .eq('id', job.id);

    results.reminders_1h++;
  }

  // ── 3. No-show detection: meeting was 30+ min ago, still status=booked ──────
  const noShowCutoff = new Date(now.getTime() - 30 * 60 * 1000);

  const { data: noShows } = await supabase
    .from('lead_nurture_jobs')
    .select('id, lead_email, lead_name, lead_phone, hubspot_deal_id, reminders_sent')
    .eq('status', 'booked')
    .lte('meeting_at', noShowCutoff.toISOString())
    .is('reminders_sent->no_show', null);

  for (const job of noShows ?? []) {
    // WhatsApp no-show recovery
    if (job.lead_phone) {
      await sendNoShowRecovery(job.lead_phone, job.lead_name, calcomLink)
        .catch(err => console.error('[reminder-check] No-show WhatsApp failed:', err));
    }

    // Email no-show recovery
    const { html, text } = buildNoShowRecoveryEmail(job.lead_name, calcomLink);
    await sendEmail({
      to: job.lead_email,
      subject: 'We missed you — reschedule your OriginTrace call',
      html,
      text,
    }).catch(err => console.error('[reminder-check] No-show email failed:', err));

    // Update HubSpot deal stage
    if (job.hubspot_deal_id) {
      await updateDealStage(job.hubspot_deal_id, 'no_show')
        .catch(err => console.error('[reminder-check] HubSpot no-show update failed:', err));
    }

    await supabase
      .from('lead_nurture_jobs')
      .update({
        status: 'no_show',
        reminders_sent: { ...((job.reminders_sent as Record<string, boolean>) || {}), no_show: true },
      })
      .eq('id', job.id);

    results.no_shows++;
  }

  return NextResponse.json({ ok: true, ...results });
}
