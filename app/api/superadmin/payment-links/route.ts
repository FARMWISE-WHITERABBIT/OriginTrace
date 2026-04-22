import { createClient as createServerClient } from '@/lib/supabase/server';
/**
 * POST /api/superadmin/payment-links — Generate Paystack payment link for org upgrade
 * GET  /api/superadmin/payment-links?org_id=xxx — List payment links
 */
import { createAdminClient } from '@/lib/supabase/admin';
import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedProfile } from '@/lib/api-auth';
import { z } from 'zod';
import { initializePayment, generateReference } from '@/lib/payments/paystack';
import { logSuperadminAction } from '@/lib/superadmin-audit';
import { sendEmail } from '@/lib/email/resend-client';
import { getSystemAdmin } from '@/lib/superadmin-rbac';

const createLinkSchema = z.object({
  org_id:         z.string().uuid(),
  tier:           z.enum(['starter', 'basic', 'pro', 'enterprise']),
  amount_ngn:     z.number().positive(),
  billing_period: z.enum(['monthly', 'annual', 'custom']).default('monthly'),
  note:           z.string().max(500).optional(),
});

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const supabaseAdmin = createAdminClient();
    const adminRecord = await getSystemAdmin(user.id);
    if (!adminRecord) return NextResponse.json({ error: 'Forbidden: Superadmin access required' }, { status: 403 });
    if (!['platform_admin', 'finance_manager'].includes(adminRecord.role)) {
      return NextResponse.json({ error: 'Forbidden: only platform_admin or finance_manager may generate payment links' }, { status: 403 });
    }

    const body = await request.json();
    const parsed = createLinkSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Validation failed', details: parsed.error.flatten().fieldErrors }, { status: 400 });
    }

    const { org_id, tier, amount_ngn, billing_period, note } = parsed.data;

    const { data: org } = await supabaseAdmin.from('organizations').select('id, name, subscription_tier').eq('id', org_id).single();
    if (!org) return NextResponse.json({ error: 'Organization not found' }, { status: 404 });

    const { data: adminProfile } = await supabaseAdmin.from('profiles').select('email, full_name').eq('org_id', org_id).eq('role', 'admin').limit(1).single();
    const adminEmail = adminProfile?.email || '';
    const reference  = generateReference(org_id, tier);
    const appUrl     = process.env.NEXT_PUBLIC_APP_URL || 'https://origintrace.trade';

    let paystackLink = '', paystackRef = reference;
    try {
      const result = await initializePayment({
        email: adminEmail, amountKobo: Math.round(amount_ngn * 100),
        reference, callbackUrl: `${appUrl}/api/payments/callback?source=subscription`,
        metadata: { org_id, tier, billing_period, created_by: user.id, note: note || '', payment_type: 'subscription_upgrade' },
        channels: ['card', 'bank', 'bank_transfer'],
      });
      paystackLink = result.authorizationUrl;
      paystackRef  = result.reference;
    } catch (e: any) { console.error('[payment-links] Paystack init failed:', e?.message); }

    const { data: linkRecord, error: insertErr } = await supabaseAdmin.from('payment_links').insert({
      org_id, created_by: user.id, tier, billing_period, amount_ngn,
      paystack_reference: paystackRef, paystack_link: paystackLink, status: 'pending',
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      metadata: { note },
    }).select().single();
    if (insertErr) throw insertErr;

    if (adminEmail && paystackLink) {
      const tierLabel = tier.charAt(0).toUpperCase() + tier.slice(1);
      await sendEmail({
        to: adminEmail,
        subject: `Your OriginTrace ${tierLabel} plan payment link`,
        html: `<div style="font-family:sans-serif;max-width:600px;margin:0 auto"><div style="background:#166534;color:white;padding:24px;border-radius:8px 8px 0 0"><h2 style="margin:0">OriginTrace Subscription Upgrade</h2></div><div style="padding:24px;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 8px 8px"><p>Hello ${adminProfile?.full_name || 'there'},</p><p>Your organisation <strong>${org.name}</strong> has been approved for the <strong>${tierLabel}</strong> plan.</p><p><strong>Amount:</strong> &#x20A6;${amount_ngn.toLocaleString()} / ${billing_period}</p>${note ? `<p><em>${note}</em></p>` : ''}<p style="margin:24px 0"><a href="${paystackLink}" style="background:#166534;color:white;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:bold">Complete Payment &rarr;</a></p><p style="color:#6b7280;font-size:12px">This link expires in 7 days.</p></div></div>`,
        text: `Hello,\n\nYour OriginTrace ${tierLabel} plan payment link:\n${paystackLink}\n\nAmount: NGN ${amount_ngn.toLocaleString()}/${billing_period}\n\nExpires in 7 days.`,
      });
    }

    await logSuperadminAction({
      superadminId: user.id, action: 'create_payment_link', targetType: 'payment_link',
      targetId: linkRecord.id, targetLabel: org.name,
      afterState: { org_id, tier, amount_ngn, billing_period, reference: paystackRef }, request,
    });

    return NextResponse.json({ link: linkRecord, paystackLink }, { status: 201 });
  } catch (err: any) {
    console.error('[payment-links POST]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerClient();
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const supabaseAdmin = createAdminClient();
    if (!(await getSystemAdmin(user.id))) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    const orgId = new URL(request.url).searchParams.get('org_id');
    let query = supabaseAdmin.from('payment_links').select('*, organizations(name)').order('created_at', { ascending: false });
    if (orgId) query = (query as any).eq('org_id', orgId);
    const { data, error: fetchErr } = await query;
    if (fetchErr) throw fetchErr;
    return NextResponse.json({ links: data });
  } catch (err) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
