export interface RegistrationData {
  fullName: string;
  email: string;
  phone: string;
  organization: string;
  role: string;
  state: string;
  currentlyExporting?: string;
  exportProducts?: string;
  nepcRegistered?: string;
}

export interface EventEmailContext {
  partners: string;
  eventTitle: string;
  shortTitle: string;
  date: string;
  time: string;
  venue: string;
  venueAddress: string;
  theme: string;
  dayWord: string;
  headerColor: string;
  accentColor: string;
  bannerBg: string;
  bannerBorder: string;
  bannerText: string;
  detailsBg: string;
  detailsBorder: string;
  detailsAccent: string;
  regBg: string;
  regBorder: string;
  regLabel: string;
}

const YEXDEP_CONTEXT: EventEmailContext = {
  partners:       'Nigerian Export Promotion Council × OriginTrace',
  eventTitle:     'Youth Export Development Programme',
  shortTitle:     'YEXDEP 2026',
  date:           'Wednesday, 25th March 2026',
  time:           '9:00 AM prompt',
  venue:          'NEPC Enugu Regional Office',
  venueAddress:   'Agric Bank Building, Upper Presidential Road, Independence Layout, Enugu',
  theme:          'From Passion to Port: Unlocking Youth Export Potential',
  dayWord:        'Wednesday',
  headerColor:    '#1F5F52',
  accentColor:    '#1F5F52',
  bannerBg:       '#D1FAE5',
  bannerBorder:   '#A7F3D0',
  bannerText:     '#065F46',
  detailsBg:      '#F8FAFC',
  detailsBorder:  '#E2E8F0',
  detailsAccent:  '#1F5F52',
  regBg:          '#F0FDF9',
  regBorder:      '#A7F3D0',
  regLabel:       '#065F46',
};

const EXPORT_READINESS_CONTEXT: EventEmailContext = {
  partners:       'NEPC × Union Bank × OriginTrace',
  eventTitle:     'Export Readiness & Mentorship Training',
  shortTitle:     'Export Readiness 2026',
  date:           'Thursday, 23rd April 2026',
  time:           '9:00 AM prompt',
  venue:          'Union Bank, Ogui Road, Enugu',
  venueAddress:   'Top Floor, Union Bank, Ogui Road, Enugu',
  theme:          'Empowering Nigerian Exporters for Sustainable Growth in Global Market',
  dayWord:        'Thursday',
  headerColor:    '#0052A3',
  accentColor:    '#0052A3',
  bannerBg:       '#DBEAFE',
  bannerBorder:   '#BFDBFE',
  bannerText:     '#1E3A8A',
  detailsBg:      '#F8FAFC',
  detailsBorder:  '#E2E8F0',
  detailsAccent:  '#0052A3',
  regBg:          '#EFF6FF',
  regBorder:      '#BFDBFE',
  regLabel:       '#1E3A8A',
};

export function getEventEmailContext(slug: string): EventEmailContext {
  if (slug === 'export-readiness-2026') return EXPORT_READINESS_CONTEXT;
  return YEXDEP_CONTEXT;
}

function yesNo(val: string | undefined): string {
  if (val === 'yes') return 'Yes';
  if (val === 'no') return 'No';
  return '—';
}

export function buildRegistrantConfirmationEmail(data: RegistrationData, ctx: EventEmailContext = YEXDEP_CONTEXT): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Registration Confirmed – ${ctx.shortTitle}</title>
</head>
<body style="margin:0;padding:0;background-color:#F0F7F4;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#F0F7F4;padding:40px 20px;">
    <tr>
      <td align="center">
        <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:10px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">

          <!-- Header -->
          <tr>
            <td style="background-color:${ctx.headerColor};padding:32px 40px;text-align:center;">
              <p style="margin:0 0 4px;color:rgba(255,255,255,0.65);font-size:11px;font-weight:600;letter-spacing:2px;text-transform:uppercase;">${ctx.partners}</p>
              <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:700;letter-spacing:-0.3px;">${ctx.eventTitle}</h1>
              <p style="margin:8px 0 0;color:rgba(255,255,255,0.7);font-size:13px;">${ctx.shortTitle}</p>
            </td>
          </tr>

          <!-- Banner -->
          <tr>
            <td style="background-color:${ctx.bannerBg};padding:16px 40px;text-align:center;border-bottom:1px solid ${ctx.bannerBorder};">
              <p style="margin:0;color:${ctx.bannerText};font-size:15px;font-weight:600;">✓ You're registered! See you on ${ctx.dayWord}.</p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:36px 40px;">
              <p style="margin:0 0 20px;color:#374151;font-size:15px;line-height:1.6;">
                Dear <strong style="color:#111827;">${data.fullName}</strong>,
              </p>
              <p style="margin:0 0 28px;color:#4B5563;font-size:15px;line-height:1.6;">
                Your registration for the <strong>${ctx.eventTitle}</strong> has been confirmed. We look forward to seeing you there!
              </p>

              <!-- Event Details Box -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:${ctx.detailsBg};border:1px solid ${ctx.detailsBorder};border-radius:8px;margin-bottom:28px;">
                <tr>
                  <td style="padding:24px;">
                    <p style="margin:0 0 16px;color:${ctx.detailsAccent};font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:1px;">Event Details</p>
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="padding:6px 0;color:#6B7280;font-size:13px;width:90px;vertical-align:top;">Date</td>
                        <td style="padding:6px 0;color:#111827;font-size:14px;font-weight:500;">${ctx.date}</td>
                      </tr>
                      <tr>
                        <td style="padding:6px 0;color:#6B7280;font-size:13px;vertical-align:top;">Time</td>
                        <td style="padding:6px 0;color:#111827;font-size:14px;font-weight:500;">${ctx.time}</td>
                      </tr>
                      <tr>
                        <td style="padding:6px 0;color:#6B7280;font-size:13px;vertical-align:top;">Venue</td>
                        <td style="padding:6px 0;color:#111827;font-size:14px;font-weight:500;">${ctx.venue}<br>${ctx.venueAddress}</td>
                      </tr>
                      <tr>
                        <td style="padding:6px 0;color:#6B7280;font-size:13px;vertical-align:top;">Theme</td>
                        <td style="padding:6px 0;color:#111827;font-size:14px;font-style:italic;">"${ctx.theme}"</td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- Your Registration -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:${ctx.regBg};border:1px solid ${ctx.regBorder};border-radius:8px;margin-bottom:28px;">
                <tr>
                  <td style="padding:20px 24px;">
                    <p style="margin:0 0 12px;color:${ctx.regLabel};font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:1px;">Your Registration</p>
                    <table role="presentation" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="padding:3px 0;color:#6B7280;font-size:13px;width:160px;">Name</td>
                        <td style="padding:3px 0;color:#111827;font-size:13px;">${data.fullName}</td>
                      </tr>
                      <tr>
                        <td style="padding:3px 0;color:#6B7280;font-size:13px;">Organisation</td>
                        <td style="padding:3px 0;color:#111827;font-size:13px;">${data.organization}</td>
                      </tr>
                      <tr>
                        <td style="padding:3px 0;color:#6B7280;font-size:13px;">Role</td>
                        <td style="padding:3px 0;color:#111827;font-size:13px;">${data.role}</td>
                      </tr>
                      <tr>
                        <td style="padding:3px 0;color:#6B7280;font-size:13px;">State</td>
                        <td style="padding:3px 0;color:#111827;font-size:13px;">${data.state}</td>
                      </tr>
                      ${data.exportProducts ? `
                      <tr>
                        <td style="padding:3px 0;color:#6B7280;font-size:13px;">Export Products</td>
                        <td style="padding:3px 0;color:#111827;font-size:13px;">${data.exportProducts}</td>
                      </tr>` : ''}
                      ${data.nepcRegistered ? `
                      <tr>
                        <td style="padding:3px 0;color:#6B7280;font-size:13px;">NEPC Registered</td>
                        <td style="padding:3px 0;color:#111827;font-size:13px;">${yesNo(data.nepcRegistered)}</td>
                      </tr>` : ''}
                    </table>
                  </td>
                </tr>
              </table>

              <p style="margin:0 0 8px;color:#4B5563;font-size:14px;line-height:1.6;">
                Please arrive on time. For enquiries, contact us at <a href="mailto:info@origintrace.trade" style="color:${ctx.accentColor};font-weight:500;">info@origintrace.trade</a>.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color:#F8FAFC;padding:20px 40px;text-align:center;border-top:1px solid #E5E7EB;">
              <p style="margin:0;color:#9CA3AF;font-size:12px;">
                ${ctx.partners}
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export function buildAdminNotificationEmail(data: RegistrationData, totalCount: number, ctx: EventEmailContext = YEXDEP_CONTEXT): string {
  const registeredAt = new Date().toLocaleString('en-NG', { timeZone: 'Africa/Lagos', dateStyle: 'medium', timeStyle: 'short' });

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>New ${ctx.shortTitle} Registration</title>
</head>
<body style="margin:0;padding:0;background-color:#F0F7F4;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#F0F7F4;padding:40px 20px;">
    <tr>
      <td align="center">
        <table role="presentation" width="520" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:10px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">

          <!-- Header -->
          <tr>
            <td style="background-color:${ctx.headerColor};padding:24px 32px;">
              <p style="margin:0 0 2px;color:rgba(255,255,255,0.65);font-size:11px;font-weight:600;letter-spacing:2px;text-transform:uppercase;">${ctx.shortTitle} — Admin Alert</p>
              <h2 style="margin:0;color:#ffffff;font-size:18px;font-weight:700;">New Registration</h2>
            </td>
          </tr>

          <!-- Stats banner -->
          <tr>
            <td style="background-color:${ctx.bannerBg};padding:12px 32px;border-bottom:1px solid ${ctx.bannerBorder};">
              <p style="margin:0;color:${ctx.bannerText};font-size:13px;">
                Total registrations so far: <strong style="font-size:15px;">${totalCount}</strong>
              </p>
            </td>
          </tr>

          <!-- Registrant details -->
          <tr>
            <td style="padding:28px 32px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #E5E7EB;border-radius:8px;overflow:hidden;">
                <tr style="background-color:#F9FAFB;">
                  <td style="padding:10px 16px;color:#6B7280;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;width:160px;">Field</td>
                  <td style="padding:10px 16px;color:#6B7280;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;">Value</td>
                </tr>
                <tr style="border-top:1px solid #F3F4F6;">
                  <td style="padding:10px 16px;color:#6B7280;font-size:13px;">Full Name</td>
                  <td style="padding:10px 16px;color:#111827;font-size:13px;font-weight:500;">${data.fullName}</td>
                </tr>
                <tr style="border-top:1px solid #F3F4F6;background-color:#F9FAFB;">
                  <td style="padding:10px 16px;color:#6B7280;font-size:13px;">Email</td>
                  <td style="padding:10px 16px;color:#111827;font-size:13px;">${data.email}</td>
                </tr>
                <tr style="border-top:1px solid #F3F4F6;">
                  <td style="padding:10px 16px;color:#6B7280;font-size:13px;">Phone</td>
                  <td style="padding:10px 16px;color:#111827;font-size:13px;">${data.phone}</td>
                </tr>
                <tr style="border-top:1px solid #F3F4F6;background-color:#F9FAFB;">
                  <td style="padding:10px 16px;color:#6B7280;font-size:13px;">Organisation</td>
                  <td style="padding:10px 16px;color:#111827;font-size:13px;">${data.organization}</td>
                </tr>
                <tr style="border-top:1px solid #F3F4F6;">
                  <td style="padding:10px 16px;color:#6B7280;font-size:13px;">Role</td>
                  <td style="padding:10px 16px;color:#111827;font-size:13px;">${data.role}</td>
                </tr>
                <tr style="border-top:1px solid #F3F4F6;background-color:#F9FAFB;">
                  <td style="padding:10px 16px;color:#6B7280;font-size:13px;">State</td>
                  <td style="padding:10px 16px;color:#111827;font-size:13px;">${data.state}</td>
                </tr>
                <tr style="border-top:1px solid #F3F4F6;">
                  <td style="padding:10px 16px;color:#6B7280;font-size:13px;">Currently Exporting</td>
                  <td style="padding:10px 16px;color:#111827;font-size:13px;">${yesNo(data.currentlyExporting)}</td>
                </tr>
                <tr style="border-top:1px solid #F3F4F6;background-color:#F9FAFB;">
                  <td style="padding:10px 16px;color:#6B7280;font-size:13px;">Export Products</td>
                  <td style="padding:10px 16px;color:#111827;font-size:13px;">${data.exportProducts ?? '—'}</td>
                </tr>
                <tr style="border-top:1px solid #F3F4F6;">
                  <td style="padding:10px 16px;color:#6B7280;font-size:13px;">NEPC Registered</td>
                  <td style="padding:10px 16px;color:#111827;font-size:13px;">${yesNo(data.nepcRegistered)}</td>
                </tr>
                <tr style="border-top:1px solid #F3F4F6;background-color:#F9FAFB;">
                  <td style="padding:10px 16px;color:#6B7280;font-size:13px;">Registered At</td>
                  <td style="padding:10px 16px;color:#111827;font-size:13px;">${registeredAt} (WAT)</td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color:#F8FAFC;padding:16px 32px;border-top:1px solid #E5E7EB;text-align:center;">
              <p style="margin:0;color:#9CA3AF;font-size:12px;">
                ${ctx.partners}
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}
