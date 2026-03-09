import { createAdminClient } from '@/lib/supabase/admin';
import { NextRequest, NextResponse } from 'next/server';
import { verifyWebhookSignature, verifyTransaction } from '@/lib/payments/paystack';
import { sendEmail } from '@/lib/email/resend-client';
import { logSuperadminAction } from '@/lib/superadmin-audit';

const TIER_DURATIONS: Record<string, Record<string, number>> = {
  monthly: { starter: 30, basic: 30, pro: 30, enterprise: 30 },
  annual:  { starter: 365, basic: 365, pro: 365, enterprise: 365 },
  custom:  { starter: 30, basic: 30, pro: 30, enterprise: 30 },
};

export async function POST(request: NextRequest) {
  const rawBody = await request.text();
  const signature = request.headers.get('x-paystack-signature') || '';

  // 1. Verify webhook authenticity
  if (!verifyWebhookSignature(rawBody, signature)) {
    console.warn('[paystack-webhook] Invalid signature');
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
  }

  let event: any;
  try { event = JSON.parse(rawBody); } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const supabaseAdmin = createAdminClient();

  try {
    if (event.event === 'charge.success') {
      await handleChargeSuccess(supabaseAdmin, event.data);
    } else if (event.event === 'subscription.disable') {
      await handleSubscriptionDisabled(supabaseAdmin, event.data);
    }
  } catch (err: any) {
    console.error('[paystack-webhook] Handler error:', err?.message);
    // Return 200 so Paystack doesn't retry — log for manual investigation
    return NextResponse.json({ received: true, error: err?.message });
  }

  return NextResponse.json({ received: true });
}

async function handleChargeSuccess(supabase: any, data: any) {
  const reference = data?.reference;
  if (!reference) return;

  // Find the matching payment link
  const { data: link } = await supabase
    .from('payment_links')
    .select('*, organizations(id, name, subscription_tier)')
    .eq('paystack_reference', reference)
    .single();

  if (!link) {
    console.warn(`[paystack-webhook] No payment link for reference: ${reference}`);
    return;
  }

  if (link.status === 'paid') return; // idempotent — already processed

  // Verify with Paystack directly (don't trust webhook alone)
  const verification = await verifyTransaction(reference);
  if (verification.status !== 'success') {
    console.warn(`[paystack-webhook] Transaction not successful: ${verification.status}`);
    return;
  }

  const tier = link.tier as string;
  const billing = link.billing_period as string;
  const durationDays = TIER_DURATIONS[billing]?.[tier] ?? 30;
  const expiresAt = new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000).toISOString();

  // Update payment link status
  await supabase.from('payment_links').update({
    status: 'paid',
    paid_at: new Date().toISOString(),
  }).eq('id', link.id);

  // Upgrade org subscription
  const { data: orgBefore } = await supabase
    .from('organizations').select('subscription_tier, subscription_status').eq('id', link.org_id).single();

  await supabase.from('organizations').update({
    subscription_tier:    tier,
    subscription_expires_at: expiresAt,
    grace_period_ends_at: null,
    subscription_status:  'active',
  }).eq('id', link.org_id);

  console.log(`[paystack-webhook] Upgraded org ${link.org_id} to ${tier} until ${expiresAt}`);

  // Audit trail
  await logSuperadminAction({
    superadminId: link.created_by,
    action: 'subscription_upgraded',
    targetType: 'subscription',
    targetId: link.org_id,
    targetLabel: (link.organizations as any)?.name,
    beforeState: { tier: orgBefore?.subscription_tier, status: orgBefore?.subscription_status },
    afterState: { tier, expires_at: expiresAt, billing_period: billing, amount_ngn: link.amount_ngn },
  });

  // Email org admin about successful upgrade
  const { data: adminProfile } = await supabase
    .from('profiles').select('email, full_name').eq('org_id', link.org_id).eq('role', 'admin').limit(1).single();

  if (adminProfile?.email) {
    const tierLabel = tier.charAt(0).toUpperCase() + tier.slice(1);
    await sendEmail({
      to: adminProfile.email,
      subject: `Your OriginTrace ${tierLabel} plan is now active`,
      html: `<div style="font-family:sans-serif;max-width:600px;margin:0 auto"><div style="background:#166534;color:white;padding:24px;border-radius:8px 8px 0 0"><h2 style="margin:0">Payment Successful ✓</h2></div><div style="padding:24px;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 8px 8px"><p>Hello ${adminProfile.full_name || 'there'},</p><p>Your payment was successful and your <strong>${tierLabel}</strong> plan is now active.</p><p><strong>Valid until:</strong> ${new Date(expiresAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</p><p>Log in to OriginTrace to access your new features.</p></div></div>`,
      text: `Your OriginTrace ${tierLabel} plan is now active until ${new Date(expiresAt).toLocaleDateString()}.`,
    });
  }
}

async function handleSubscriptionDisabled(supabase: any, data: any) {
  // Handle Paystack subscription cancellation
  const email = data?.customer?.email;
  if (!email) return;

  const { data: profile } = await supabase
    .from('profiles').select('org_id').eq('email', email).single();
  if (!profile?.org_id) return;

  const gracePeriodEnds = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
  await supabase.from('organizations').update({
    subscription_status: 'grace_period',
    grace_period_ends_at: gracePeriodEnds,
  }).eq('id', profile.org_id);

  console.log(`[paystack-webhook] Subscription disabled for org ${profile.org_id}, grace period until ${gracePeriodEnds}`);
}
