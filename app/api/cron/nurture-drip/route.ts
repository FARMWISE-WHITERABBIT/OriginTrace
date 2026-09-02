import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { sendEmail } from '@/lib/email/resend-client';
import {
  buildNurtureEmail1,
  buildNurtureEmail2,
  buildNurtureEmail3,
  buildBuyerNurtureEmail1,
  buildBuyerNurtureEmail2,
  buildBuyerNurtureEmail3,
} from '@/lib/email/templates';

/**
 * GET /api/cron/nurture-drip
 * Runs daily at 08:00 UTC (see vercel.json).
 *
 * Sends the next nurture email to leads who haven't booked a call yet.
 * Email 1 at T+24h, Email 2 at T+72h, Email 3 at T+7d.
 * After Email 3, marks the lead as nurture_dropped.
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

  const { data: jobs, error } = await supabase
    .from('lead_nurture_jobs')
    .select('*')
    .eq('status', 'active');

  if (error) {
    console.error('[cron/nurture-drip] DB query failed:', error);
    return NextResponse.json({ error: 'DB error' }, { status: 500 });
  }

  let sent = 0;
  let dropped = 0;

  // Buyer-persona detection: org_type is authoritative today; the persona
  // column arrives with supabase/migrations/20260710_lead_attribution.sql and
  // takes precedence once present.
  const BUYER_ORG_TYPES = new Set(['importer', 'importer_buyer', 'trading_house', 'manufacturer', 'retailer']);
  const isBuyerJob = (j: { org_type: string | null } & Record<string, unknown>) =>
    (j as { persona?: string | null }).persona === 'buyer' ||
    (j.org_type !== null && BUYER_ORG_TYPES.has(j.org_type));

  for (const job of jobs ?? []) {
    const buyer = isBuyerJob(job);
    const createdAt = new Date(job.created_at);
    const hoursSinceCreated = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60);

    if (job.nurture_step === 0 && hoursSinceCreated >= 24) {
      // Email 1: T+24h
      const { html, text } = buyer
        ? buildBuyerNurtureEmail1(job.lead_name, calcomLink)
        : buildNurtureEmail1(job.lead_name, calcomLink);
      await sendEmail({
        to: job.lead_email,
        subject: buyer ? 'Verify your suppliers at origin — still happy to show you' : 'Still happy to show you OriginTrace',
        html,
        text,
      }).catch(err => console.error('[nurture-drip] Email 1 failed for', job.lead_email, err));

      await supabase
        .from('lead_nurture_jobs')
        .update({ nurture_step: 1 })
        .eq('id', job.id);
      sent++;

    } else if (job.nurture_step === 1 && hoursSinceCreated >= 72) {
      // Email 2: T+72h
      const { html, text } = buyer
        ? buildBuyerNurtureEmail2(job.lead_name, job.commodity, calcomLink)
        : buildNurtureEmail2(job.lead_name, job.commodity, job.org_type, calcomLink);
      await sendEmail({
        to: job.lead_email,
        subject: buyer
          ? 'When a supplier says they\'re compliant — how do you check?'
          : 'What does EUDR compliance actually cost you?',
        html,
        text,
      }).catch(err => console.error('[nurture-drip] Email 2 failed for', job.lead_email, err));

      await supabase
        .from('lead_nurture_jobs')
        .update({ nurture_step: 2 })
        .eq('id', job.id);
      sent++;

    } else if (job.nurture_step === 2 && hoursSinceCreated >= 168) {
      // Email 3: T+7d — final email, then mark dropped
      const { html, text } = buyer
        ? buildBuyerNurtureEmail3(job.lead_name, calcomLink)
        : buildNurtureEmail3(job.lead_name, calcomLink);
      await sendEmail({
        to: job.lead_email,
        subject: buyer ? 'Closing your buyer workspace slot' : 'Closing your OriginTrace pilot slot',
        html,
        text,
      }).catch(err => console.error('[nurture-drip] Email 3 failed for', job.lead_email, err));

      await supabase
        .from('lead_nurture_jobs')
        .update({ nurture_step: 3, status: 'nurture_dropped' })
        .eq('id', job.id);
      sent++;
      dropped++;
    }
  }

  return NextResponse.json({ ok: true, sent, dropped, total: jobs?.length ?? 0 });
}
