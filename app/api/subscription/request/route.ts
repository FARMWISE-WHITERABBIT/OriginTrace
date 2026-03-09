/**
 * POST /api/subscription/request
 * Org admin requests a plan upgrade. Sends email notification to the superadmin
 * team so they can follow up with a custom payment link.
 */
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient as createServerClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { sendEmail } from '@/lib/email/resend-client';

const schema = z.object({
  tier: z.enum(['starter', 'basic', 'pro', 'enterprise']),
  note: z.string().max(500).optional(),
});

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid request', details: parsed.error.flatten().fieldErrors }, { status: 400 });
    }

    const supabaseAdmin = createAdminClient();
    const { data: profile } = await supabaseAdmin
      .from('profiles').select('full_name, email, org_id, role').eq('user_id', user.id).single();

    if (!profile?.org_id) return NextResponse.json({ error: 'No organisation' }, { status: 400 });
    if (profile.role !== 'admin') return NextResponse.json({ error: 'Only org admins can request upgrades' }, { status: 403 });

    const { data: org } = await supabaseAdmin
      .from('organizations').select('name, subscription_tier').eq('id', profile.org_id).single();

    const tierLabel = parsed.data.tier.charAt(0).toUpperCase() + parsed.data.tier.slice(1);
    const currentLabel = (org?.subscription_tier || 'starter').charAt(0).toUpperCase() + (org?.subscription_tier || 'starter').slice(1).slice(0);

    // Notify support/superadmin team
    const supportEmail = process.env.SUPPORT_EMAIL || 'support@origintrace.trade';
    await sendEmail({
      to: supportEmail,
      subject: `[Upgrade Request] ${org?.name} → ${tierLabel}`,
      html: `<div style="font-family:sans-serif;max-width:600px">
        <div style="background:#166534;color:white;padding:20px;border-radius:8px 8px 0 0">
          <h2 style="margin:0">Upgrade Request</h2>
        </div>
        <div style="padding:20px;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 8px 8px">
          <table style="width:100%;border-collapse:collapse">
            <tr><td style="padding:6px 0;color:#6b7280;font-size:13px">Organisation</td><td style="font-weight:600">${org?.name}</td></tr>
            <tr><td style="padding:6px 0;color:#6b7280;font-size:13px">Contact</td><td>${profile.full_name} &lt;${profile.email}&gt;</td></tr>
            <tr><td style="padding:6px 0;color:#6b7280;font-size:13px">Current plan</td><td>${currentLabel}</td></tr>
            <tr><td style="padding:6px 0;color:#6b7280;font-size:13px">Requested plan</td><td><strong>${tierLabel}</strong></td></tr>
            ${parsed.data.note ? `<tr><td style="padding:6px 0;color:#6b7280;font-size:13px">Note</td><td>${parsed.data.note}</td></tr>` : ''}
          </table>
          <p style="margin-top:20px"><a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://origintrace.trade'}/superadmin/organisations" style="background:#166534;color:white;padding:10px 20px;border-radius:6px;text-decoration:none;font-weight:bold">Generate Payment Link →</a></p>
        </div>
      </div>`,
      text: `Upgrade request from ${org?.name} (${profile.email}) to ${tierLabel}. Note: ${parsed.data.note || 'none'}.`,
    });

    // Log the request
    await supabaseAdmin.from('audit_logs').insert({
      user_id: user.id,
      action: 'subscription.upgrade_requested',
      resource_type: 'organization',
      resource_id: profile.org_id,
      metadata: {
        from_tier: org?.subscription_tier,
        to_tier: parsed.data.tier,
        note: parsed.data.note,
      },
    }).catch(() => {});

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('[subscription/request]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
