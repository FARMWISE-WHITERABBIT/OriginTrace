import { NextRequest, NextResponse } from 'next/server';
import { sendEmail, FROM_ADDRESS } from '@/lib/email/resend-client';
import { upsertHubSpotContact } from '@/lib/hubspot';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { full_name, email, phone, role, organization_type, commodity, monthly_tonnage, farmer_count, biggest_concern, message, source } = body;

    if (!full_name || !email) {
      return NextResponse.json({ error: 'Name and email are required' }, { status: 400 });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json({ error: 'Invalid email address' }, { status: 400 });
    }

    const notifyAddress = process.env.LEAD_NOTIFY_EMAIL || 'hello@origintrace.trade';

    // ── Notify internal team ────────────────────────────────────────────────
    const internalHtml = `
      <h2 style="margin:0 0 16px">New ${source === 'calculator' ? 'Calculator Lead' : 'Demo Request'} — OriginTrace</h2>
      <table style="border-collapse:collapse;width:100%;font-size:14px">
        <tr><td style="padding:8px;background:#f4f4f4;font-weight:600;width:160px">Name</td><td style="padding:8px;border-bottom:1px solid #eee">${full_name}</td></tr>
        <tr><td style="padding:8px;background:#f4f4f4;font-weight:600">Email</td><td style="padding:8px;border-bottom:1px solid #eee"><a href="mailto:${email}">${email}</a></td></tr>
        ${phone ? `<tr><td style="padding:8px;background:#f4f4f4;font-weight:600">Phone</td><td style="padding:8px;border-bottom:1px solid #eee">${phone}</td></tr>` : ''}
        ${role ? `<tr><td style="padding:8px;background:#f4f4f4;font-weight:600">Role</td><td style="padding:8px;border-bottom:1px solid #eee">${role}</td></tr>` : ''}
        ${organization_type ? `<tr><td style="padding:8px;background:#f4f4f4;font-weight:600">Org Type</td><td style="padding:8px;border-bottom:1px solid #eee">${organization_type}</td></tr>` : ''}
        ${commodity ? `<tr><td style="padding:8px;background:#f4f4f4;font-weight:600">Commodity</td><td style="padding:8px;border-bottom:1px solid #eee">${commodity}</td></tr>` : ''}
        ${monthly_tonnage ? `<tr><td style="padding:8px;background:#f4f4f4;font-weight:600">Monthly Volume</td><td style="padding:8px;border-bottom:1px solid #eee">${monthly_tonnage} MT</td></tr>` : ''}
        ${farmer_count ? `<tr><td style="padding:8px;background:#f4f4f4;font-weight:600">Farmer Count</td><td style="padding:8px;border-bottom:1px solid #eee">${farmer_count}</td></tr>` : ''}
        ${biggest_concern ? `<tr><td style="padding:8px;background:#f4f4f4;font-weight:600">Top Challenge</td><td style="padding:8px;border-bottom:1px solid #eee">${biggest_concern}</td></tr>` : ''}
        ${message ? `<tr><td style="padding:8px;background:#f4f4f4;font-weight:600">Message</td><td style="padding:8px;border-bottom:1px solid #eee">${message}</td></tr>` : ''}
      </table>
      <p style="margin-top:24px;font-size:12px;color:#888">Submitted via origintrace.trade/${source === 'calculator' ? 'compliance calculator' : 'demo'}</p>
    `;

    await sendEmail({
      to: notifyAddress,
      subject: `[Lead] ${full_name} — ${organization_type || 'Demo Request'}`,
      html: internalHtml,
      replyTo: email,
    });

    // ── Auto-reply to prospect ──────────────────────────────────────────────
    const autoReplyHtml = `
      <div style="font-family:sans-serif;max-width:560px;margin:0 auto;color:#1a1a1a">
        <h2 style="margin:0 0 8px">Your pilot slot is secured, ${full_name.split(' ')[0]}.</h2>
        <p style="color:#555;margin:0 0 24px">Our compliance team will contact you within 24 hours to schedule your personalised demonstration.</p>
        <p style="margin:0 0 8px">Here's what happens next:</p>
        <ol style="color:#555;padding-left:20px;line-height:1.8">
          <li><strong>Discovery Call (30 min)</strong> — We review your supply chain and compliance requirements</li>
          <li><strong>Platform Demo (45 min)</strong> — Live walkthrough of polygon mapping, traceability, and DDS export</li>
          <li><strong>30-Day Pilot Setup</strong> — Organisation onboarding and farmer enrollment</li>
          <li><strong>Dedicated Support</strong> — Your compliance success manager throughout</li>
        </ol>
        <p style="margin:24px 0 0;color:#555">If you have questions in the meantime, reply directly to this email.</p>
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

    // ── Push lead to HubSpot CRM ────────────────────────────────────────────
    try {
      await upsertHubSpotContact({
        full_name, email, phone, role, organization_type,
        commodity, monthly_tonnage, farmer_count, biggest_concern, message, source,
      });
    } catch (hubspotErr) {
      console.error('[api/contact] HubSpot upsert failed (non-fatal):', hubspotErr);
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('[api/contact] error:', err);
    return NextResponse.json({ error: 'Failed to process submission' }, { status: 500 });
  }
}
