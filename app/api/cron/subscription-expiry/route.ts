/**
 * GET /api/cron/subscription-expiry
 * Run daily. Handles:
 * 1. Orgs 7 days before expiry — send warning email
 * 2. Orgs in grace period that have expired — downgrade to starter
 * 3. Orgs whose subscription_expires_at has passed — move to grace period
 *
 * Trigger via Vercel Cron: vercel.json schedule "0 6 * * *"
 * Or Supabase Edge Function scheduler.
 */
import { createAdminClient } from '@/lib/supabase/admin';
import { NextRequest, NextResponse } from 'next/server';
import { sendEmail } from '@/lib/email/resend-client';
import { logSuperadminAction } from '@/lib/superadmin-audit';

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createAdminClient();
  const now = new Date();
  const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  let warned = 0, downgraded = 0, graced = 0;
  const errors: string[] = [];

  try {
    // ── 1. Warn orgs expiring in 7 days ────────────────────────────────────
    const { data: expiringSoon } = await supabase
      .from('organizations')
      .select('id, name, subscription_tier, subscription_expires_at')
      .eq('subscription_status', 'active')
      .neq('subscription_tier', 'starter')
      .lte('subscription_expires_at', sevenDaysFromNow.toISOString())
      .gte('subscription_expires_at', now.toISOString());

    for (const org of expiringSoon || []) {
      try {
        const { data: admin } = await supabase
          .from('profiles').select('email, full_name').eq('org_id', org.id).eq('role', 'admin').limit(1).single();
        if (admin?.email) {
          const expiryDate = new Date(org.subscription_expires_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
          await sendEmail({
            to: admin.email,
            subject: 'Your OriginTrace subscription expires soon',
            html: `<div style="font-family:sans-serif;max-width:600px"><div style="background:#92400e;color:white;padding:24px;border-radius:8px 8px 0 0"><h2 style="margin:0">⚠ Subscription Expiring Soon</h2></div><div style="padding:24px;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 8px 8px"><p>Hello ${admin.full_name || 'there'},</p><p>Your <strong>${org.subscription_tier.charAt(0).toUpperCase() + org.subscription_tier.slice(1)}</strong> plan expires on <strong>${expiryDate}</strong>.</p><p>After expiry you will have a 7-day grace period before your account reverts to the Starter plan. Contact your OriginTrace account manager or reply to this email to renew.</p></div></div>`,
            text: `Your OriginTrace ${org.subscription_tier} plan expires on ${expiryDate}. Contact us to renew.`,
          });
          warned++;
        }
      } catch (e: any) { errors.push(`warn ${org.id}: ${e.message}`); }
    }

    // ── 2. Move expired active subs to grace period ─────────────────────────
    const { data: justExpired } = await supabase
      .from('organizations')
      .select('id, name, subscription_tier')
      .eq('subscription_status', 'active')
      .neq('subscription_tier', 'starter')
      .lt('subscription_expires_at', now.toISOString());

    for (const org of justExpired || []) {
      try {
        const gracePeriodEnds = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString();
        await supabase.from('organizations').update({
          subscription_status: 'grace_period',
          grace_period_ends_at: gracePeriodEnds,
        }).eq('id', org.id);

        const { data: admin } = await supabase
          .from('profiles').select('email, full_name').eq('org_id', org.id).eq('role', 'admin').limit(1).single();
        if (admin?.email) {
          await sendEmail({
            to: admin.email,
            subject: 'Your OriginTrace subscription has expired — 7 day grace period',
            html: `<div style="font-family:sans-serif;max-width:600px"><div style="background:#dc2626;color:white;padding:24px;border-radius:8px 8px 0 0"><h2 style="margin:0">Subscription Expired</h2></div><div style="padding:24px;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 8px 8px"><p>Hello ${admin.full_name || 'there'},</p><p>Your OriginTrace <strong>${org.subscription_tier}</strong> plan has expired. You have a <strong>7-day grace period</strong> to renew before your account reverts to Starter.</p><p>Contact your OriginTrace account manager immediately to keep your data and features intact.</p></div></div>`,
            text: `Your OriginTrace ${org.subscription_tier} plan has expired. You have 7 days to renew before downgrade.`,
          });
        }
        graced++;
      } catch (e: any) { errors.push(`grace ${org.id}: ${e.message}`); }
    }

    // ── 3. Downgrade orgs whose grace period has ended ─────────────────────
    const { data: graceExpired } = await supabase
      .from('organizations')
      .select('id, name, subscription_tier')
      .eq('subscription_status', 'grace_period')
      .lt('grace_period_ends_at', now.toISOString());

    for (const org of graceExpired || []) {
      try {
        const tierBefore = org.subscription_tier;
        await supabase.from('organizations').update({
          subscription_tier:       'starter',
          subscription_status:     'expired',
          grace_period_ends_at:    null,
          subscription_expires_at: null,
        }).eq('id', org.id);

        await logSuperadminAction({
          superadminId: 'system',
          action: 'subscription_downgraded',
          targetType: 'subscription',
          targetId: org.id,
          targetLabel: org.name,
          beforeState: { tier: tierBefore },
          afterState: { tier: 'starter', reason: 'grace_period_expired' },
        });

        const { data: admin } = await supabase
          .from('profiles').select('email, full_name').eq('org_id', org.id).eq('role', 'admin').limit(1).single();
        if (admin?.email) {
          await sendEmail({
            to: admin.email,
            subject: 'Your OriginTrace account has been downgraded to Starter',
            html: `<div style="font-family:sans-serif;max-width:600px"><div style="background:#166534;color:white;padding:24px;border-radius:8px 8px 0 0"><h2 style="margin:0">Account Downgraded</h2></div><div style="padding:24px;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 8px 8px"><p>Hello ${admin.full_name || 'there'},</p><p>Your OriginTrace account has been moved to the <strong>Starter</strong> plan. Your data is safe but some features are no longer accessible.</p><p>Contact us to reactivate your subscription and regain full access.</p></div></div>`,
            text: 'Your OriginTrace account has been downgraded to Starter. Contact us to reactivate.',
          });
        }
        downgraded++;
      } catch (e: any) { errors.push(`downgrade ${org.id}: ${e.message}`); }
    }

    return NextResponse.json({
      success: true,
      summary: { warned, graced, downgraded, errors: errors.length },
      errors: errors.length > 0 ? errors : undefined,
    });

  } catch (err: any) {
    console.error('[cron/subscription-expiry]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
