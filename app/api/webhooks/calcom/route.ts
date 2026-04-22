import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { updateDealStage } from '@/lib/hubspot';
import { sendBookingConfirmation } from '@/lib/meta-whatsapp';
import { sendEmail } from '@/lib/email/resend-client';
import { createHmac } from 'crypto';

/**
 * POST /api/webhooks/calcom
 *
 * Receives Cal.com booking events and:
 *  - Marks the lead_nurture_jobs row as booked (cancels nurture drip)
 *  - Updates HubSpot deal stage
 *  - Sends WhatsApp booking confirmation
 *  - Stores meeting datetime for the hourly reminder cron
 *
 * Set CALCOM_WEBHOOK_SECRET in your environment (from Cal.com → Settings → Webhooks).
 */
export async function POST(request: NextRequest) {
  const rawBody = await request.text();

  // Verify Cal.com webhook signature
  const secret = process.env.CALCOM_WEBHOOK_SECRET;
  if (secret) {
    const signature = request.headers.get('X-Cal-Signature-256') || '';
    const expected = createHmac('sha256', secret).update(rawBody).digest('hex');
    if (signature !== expected) {
      console.warn('[webhooks/calcom] Invalid signature');
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }
  }

  let payload: any;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { triggerEvent, payload: eventPayload } = payload;

  const supabase = createAdminClient();
  const calcomLink = process.env.CALCOM_LINK || 'https://cal.com/origintrace/discovery';

  if (triggerEvent === 'BOOKING_CREATED' || triggerEvent === 'BOOKING_RESCHEDULED') {
    const attendee = eventPayload?.attendees?.[0];
    const email: string = attendee?.email || eventPayload?.email || '';
    const name: string = attendee?.name || eventPayload?.name || '';
    const startTime: string = eventPayload?.startTime || '';
    const bookingUid: string = eventPayload?.uid || '';

    if (!email || !startTime) {
      return NextResponse.json({ error: 'Missing email or startTime' }, { status: 400 });
    }

    const meetingAt = new Date(startTime);

    // Update nurture job
    const { data: jobs } = await supabase
      .from('lead_nurture_jobs')
      .select('id, lead_phone, commodity, hubspot_deal_id')
      .eq('lead_email', email)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(1);

    const job = jobs?.[0];

    if (job) {
      await supabase
        .from('lead_nurture_jobs')
        .update({
          status: 'booked',
          meeting_at: meetingAt.toISOString(),
          calcom_booking_uid: bookingUid,
        })
        .eq('id', job.id);

      // Update HubSpot deal stage
      if (job.hubspot_deal_id) {
        await updateDealStage(
          job.hubspot_deal_id,
          triggerEvent === 'BOOKING_RESCHEDULED' ? 'meeting_rescheduled' : 'meeting_scheduled'
        );
      }

      // WhatsApp booking confirmation (non-fatal if it fails)
      if (job.lead_phone) {
        await sendBookingConfirmation(
          job.lead_phone,
          name,
          meetingAt,
          job.commodity || 'your commodity',
          calcomLink
        ).catch(err => console.error('[webhooks/calcom] WhatsApp confirmation failed:', err));
      }
    }

    // Send Resend confirmation email
    const confirmHtml = `
      <div style="font-family:sans-serif;max-width:560px;margin:0 auto;color:#1a1a1a">
        <h2 style="margin:0 0 8px">Discovery call confirmed${triggerEvent === 'BOOKING_RESCHEDULED' ? ' (rescheduled)' : ''}</h2>
        <p style="color:#555;margin:0 0 16px">Hi ${name.split(' ')[0]}, your OriginTrace discovery call is booked for:</p>
        <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:16px 20px;margin-bottom:20px">
          <p style="margin:0;font-size:16px;font-weight:600;color:#166534">
            ${meetingAt.toLocaleString('en-GB', { weekday:'long', day:'numeric', month:'long', hour:'2-digit', minute:'2-digit', timeZoneName:'short' })}
          </p>
        </div>
        <p style="color:#555;margin:0 0 16px">You'll receive a calendar invite with the video call link. We look forward to speaking with you.</p>
        <p style="color:#555;margin:0">— The OriginTrace Team</p>
        <hr style="border:none;border-top:1px solid #eee;margin:24px 0" />
        <p style="font-size:11px;color:#aaa">origintrace.trade</p>
      </div>
    `;

    await sendEmail({
      to: email,
      subject: `Discovery call confirmed — ${meetingAt.toLocaleDateString('en-GB', { weekday:'short', day:'numeric', month:'short' })}`,
      html: confirmHtml,
    }).catch(err => console.error('[webhooks/calcom] Resend confirmation failed:', err));

    return NextResponse.json({ ok: true, event: triggerEvent });
  }

  if (triggerEvent === 'BOOKING_CANCELLED') {
    const email: string = eventPayload?.attendees?.[0]?.email || eventPayload?.email || '';
    if (email) {
      // Reactivate nurture drip so they receive follow-up emails
      await supabase
        .from('lead_nurture_jobs')
        .update({ status: 'active', meeting_at: null, calcom_booking_uid: null })
        .eq('lead_email', email)
        .eq('status', 'booked');
    }
    return NextResponse.json({ ok: true, event: 'BOOKING_CANCELLED' });
  }

  // Unhandled event — return 200 so Cal.com doesn't retry
  return NextResponse.json({ ok: true, event: triggerEvent, handled: false });
}
