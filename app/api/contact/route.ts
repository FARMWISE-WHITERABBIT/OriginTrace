import { NextRequest, NextResponse } from 'next/server';
import { sendEmail } from '@/lib/email/resend-client';
import { upsertHubSpotContact } from '@/lib/hubspot';
import { createAdminClient } from '@/lib/supabase/admin';

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      full_name, email, phone, company, role,
      organization_type, commodity, monthly_tonnage,
      farmer_count, biggest_concern, message, source,
    } = body;

    if (!full_name || !email) {
      return NextResponse.json({ error: 'Name and email are required' }, { status: 400 });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json({ error: 'Invalid email address' }, { status: 400 });
    }

    const notifyAddress = process.env.LEAD_NOTIFY_EMAIL || 'hello@origintrace.trade';
    const calcomLink = process.env.CALCOM_LINK || 'https://cal.com/origintrace/discovery';

    // ── Notify internal team ──────────────────────────────────────────────────
    const safeFullName = escapeHtml(full_name);
    const safeEmail = escapeHtml(email);
    const safeCompany = company ? escapeHtml(company) : '';
    const safePhone = phone ? escapeHtml(phone) : '';
    const safeRole = role ? escapeHtml(role) : '';
    const safeOrgType = organization_type ? escapeHtml(organization_type) : '';
    const safeCommodity = commodity ? escapeHtml(commodity) : '';
    const safeMonthlyTonnage = monthly_tonnage ? escapeHtml(String(monthly_tonnage)) : '';
    const safeFarmerCount = farmer_count ? escapeHtml(String(farmer_count)) : '';
    const safeBiggestConcern = biggest_concern ? escapeHtml(biggest_concern) : '';
    const safeMessage = message ? escapeHtml(message) : '';

    const internalHtml = `
      <h2 style="margin:0 0 16px">New ${source === 'calculator' ? 'Calculator Lead' : 'Demo Request'} — OriginTrace</h2>
      <table style="border-collapse:collapse;width:100%;font-size:14px">
        <tr><td style="padding:8px;background:#f4f4f4;font-weight:600;width:160px">Name</td><td style="padding:8px;border-bottom:1px solid #eee">${safeFullName}</td></tr>
        <tr><td style="padding:8px;background:#f4f4f4;font-weight:600">Email</td><td style="padding:8px;border-bottom:1px solid #eee"><a href="mailto:${safeEmail}">${safeEmail}</a></td></tr>
        ${safeCompany ? `<tr><td style="padding:8px;background:#f4f4f4;font-weight:600">Company</td><td style="padding:8px;border-bottom:1px solid #eee">${safeCompany}</td></tr>` : ''}
        ${safePhone ? `<tr><td style="padding:8px;background:#f4f4f4;font-weight:600">Phone</td><td style="padding:8px;border-bottom:1px solid #eee">${safePhone}</td></tr>` : ''}
        ${safeRole ? `<tr><td style="padding:8px;background:#f4f4f4;font-weight:600">Role</td><td style="padding:8px;border-bottom:1px solid #eee">${safeRole}</td></tr>` : ''}
        ${safeOrgType ? `<tr><td style="padding:8px;background:#f4f4f4;font-weight:600">Org Type</td><td style="padding:8px;border-bottom:1px solid #eee">${safeOrgType}</td></tr>` : ''}
        ${safeCommodity ? `<tr><td style="padding:8px;background:#f4f4f4;font-weight:600">Commodity</td><td style="padding:8px;border-bottom:1px solid #eee">${safeCommodity}</td></tr>` : ''}
        ${safeMonthlyTonnage ? `<tr><td style="padding:8px;background:#f4f4f4;font-weight:600">Monthly Volume</td><td style="padding:8px;border-bottom:1px solid #eee">${safeMonthlyTonnage} MT</td></tr>` : ''}
        ${safeFarmerCount ? `<tr><td style="padding:8px;background:#f4f4f4;font-weight:600">Farmer Count</td><td style="padding:8px;border-bottom:1px solid #eee">${safeFarmerCount}</td></tr>` : ''}
        ${safeBiggestConcern ? `<tr><td style="padding:8px;background:#f4f4f4;font-weight:600">Top Challenge</td><td style="padding:8px;border-bottom:1px solid #eee">${safeBiggestConcern}</td></tr>` : ''}
        ${safeMessage ? `<tr><td style="padding:8px;background:#f4f4f4;font-weight:600">Message</td><td style="padding:8px;border-bottom:1px solid #eee">${safeMessage}</td></tr>` : ''}
      </table>
      <p style="margin-top:24px;font-size:12px;color:#888">Submitted via origintrace.trade/${source === 'calculator' ? 'compliance calculator' : 'demo'}</p>
    `;

    await sendEmail({
      to: notifyAddress,
      subject: `[Lead] ${full_name} — ${organization_type || 'Demo Request'}`,
      html: internalHtml,
      replyTo: email,
    });

    // ── Auto-reply with Cal.com booking CTA ───────────────────────────────────
    const firstName = escapeHtml(full_name.split(' ')[0]);
    const autoReplyHtml = `
      <div style="font-family:sans-serif;max-width:560px;margin:0 auto;color:#1a1a1a">
        <h2 style="margin:0 0 8px">Your pilot slot is secured, ${firstName}.</h2>
        <p style="color:#555;margin:0 0 24px">Skip the wait — book your discovery call directly at a time that works for you:</p>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 28px;">
          <tr><td align="center">
            <a href="${calcomLink}" style="display:inline-block;background-color:#2E7D6B;color:#ffffff;text-decoration:none;padding:14px 36px;border-radius:6px;font-size:16px;font-weight:600;">
              Pick a time that works for you →
            </a>
          </td></tr>
        </table>
        <p style="color:#555;margin:0 0 8px">Alternatively, our compliance team will follow up within 24 hours. Here's what to expect:</p>
        <ol style="color:#555;padding-left:20px;line-height:1.8">
          <li><strong>Discovery Call (30 min)</strong> — We review your supply chain and compliance requirements</li>
          <li><strong>Platform Demo (45 min)</strong> — Live walkthrough of polygon mapping, traceability, and DDS export</li>
          <li><strong>30-Day Pilot Setup</strong> — Organisation onboarding and farmer enrollment</li>
          <li><strong>Dedicated Support</strong> — Your compliance success manager throughout</li>
        </ol>
        <p style="margin:24px 0 0;color:#555">Questions? Reply directly to this email.</p>
        <p style="margin:4px 0 0;color:#555">— The OriginTrace Team</p>
        <hr style="border:none;border-top:1px solid #eee;margin:32px 0" />
        <p style="font-size:11px;color:#aaa">OriginTrace — Supply Chain Compliance &amp; Traceability Platform<br/>origintrace.trade</p>
      </div>
    `;

    await sendEmail({
      to: email,
      subject: 'Your OriginTrace pilot slot is secured',
      html: autoReplyHtml,
    });

    // ── Push lead to HubSpot CRM ──────────────────────────────────────────────
    let hubspotDealId: string | null = null;
    try {
      const result = await upsertHubSpotContact({
        full_name, email, phone, company, role, organization_type,
        commodity, monthly_tonnage, farmer_count, biggest_concern, message, source,
      });
      hubspotDealId = result.dealId;
    } catch (hubspotErr) {
      console.error('[api/contact] HubSpot upsert failed (non-fatal):', hubspotErr);
    }

    // ── Create lead nurture job ───────────────────────────────────────────────
    try {
      const supabase = createAdminClient();
      // Deactivate any existing active job for this email to prevent duplicate sequences
      await supabase
        .from('lead_nurture_jobs')
        .update({ status: 'replaced' })
        .eq('lead_email', email)
        .eq('status', 'active');

      await supabase.from('lead_nurture_jobs').insert({
        lead_email:      email,
        lead_name:       full_name,
        lead_phone:      phone || null,
        lead_company:    company || null,
        commodity:       commodity || null,
        org_type:        organization_type || null,
        hubspot_deal_id: hubspotDealId,
        status:          'active',
      });
    } catch (nurtureErr) {
      console.error('[api/contact] Failed to create nurture job (non-fatal):', nurtureErr);
    }

    const confirmUrl = `/demo/confirm?name=${encodeURIComponent(full_name)}&email=${encodeURIComponent(email)}`;
    return NextResponse.json({ success: true, redirect: confirmUrl });
  } catch (err: any) {
    console.error('[api/contact] error:', err);
    return NextResponse.json({ error: 'Failed to process submission' }, { status: 500 });
  }
}
