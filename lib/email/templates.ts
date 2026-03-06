export function buildWelcomeEmail(params: {
  orgName: string;
  adminName: string;
  email: string;
  temporaryPassword: string;
  loginUrl: string;
}) {
  const { orgName, adminName, email, temporaryPassword, loginUrl } = params;

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Welcome to OriginTrace</title>
</head>
<body style="margin:0;padding:0;background-color:#F8FAF9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#F8FAF9;padding:40px 20px;">
    <tr>
      <td align="center">
        <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
          
          <!-- Header -->
          <tr>
            <td style="background-color:#1F5F52;padding:32px 40px;text-align:center;">
              <h1 style="margin:0;color:#ffffff;font-size:24px;font-weight:700;letter-spacing:-0.5px;">OriginTrace</h1>
              <p style="margin:8px 0 0;color:#6FB8A8;font-size:13px;letter-spacing:1px;text-transform:uppercase;">Agricultural Traceability Platform</p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:40px;">
              <h2 style="margin:0 0 8px;color:#111827;font-size:20px;font-weight:600;">Welcome to OriginTrace</h2>
              <p style="margin:0 0 24px;color:#4B5563;font-size:15px;line-height:1.6;">
                Hello ${adminName},
              </p>
              <p style="margin:0 0 24px;color:#4B5563;font-size:15px;line-height:1.6;">
                Your organization <strong style="color:#111827;">${orgName}</strong> has been set up on OriginTrace. You can now log in to manage your farms, track collections, and ensure compliance across your supply chain.
              </p>

              <!-- Credentials Box -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#F0FDF4;border:1px solid #BBF7D0;border-radius:8px;margin-bottom:24px;">
                <tr>
                  <td style="padding:24px;">
                    <p style="margin:0 0 4px;color:#166534;font-size:13px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;">Your Login Details</p>
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:12px;">
                      <tr>
                        <td style="padding:6px 0;color:#4B5563;font-size:14px;width:120px;">Email:</td>
                        <td style="padding:6px 0;color:#111827;font-size:14px;font-weight:600;">${email}</td>
                      </tr>
                      <tr>
                        <td style="padding:6px 0;color:#4B5563;font-size:14px;width:120px;">Temp Password:</td>
                        <td style="padding:6px 0;font-family:'Courier New',monospace;color:#111827;font-size:14px;font-weight:600;background-color:#ffffff;padding:6px 10px;border-radius:4px;border:1px solid #D1FAE5;">${temporaryPassword}</td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- CTA Button -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="padding:8px 0 24px;">
                    <a href="${loginUrl}" style="display:inline-block;background-color:#2E7D6B;color:#ffffff;text-decoration:none;padding:14px 32px;border-radius:6px;font-size:15px;font-weight:600;letter-spacing:0.3px;">Log In to OriginTrace</a>
                  </td>
                </tr>
              </table>

              <!-- Security Note -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#FFFBEB;border:1px solid #FDE68A;border-radius:8px;">
                <tr>
                  <td style="padding:16px 20px;">
                    <p style="margin:0;color:#92400E;font-size:13px;line-height:1.5;">
                      <strong>Security Notice:</strong> Please change your password after your first login. Go to Settings to update your credentials.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color:#F9FAFB;padding:24px 40px;border-top:1px solid #E5E7EB;">
              <p style="margin:0 0 4px;color:#9CA3AF;font-size:12px;text-align:center;">
                &copy; 2026 OriginTrace. All rights reserved.
              </p>
              <p style="margin:0;color:#9CA3AF;font-size:12px;text-align:center;">
                EUDR Compliance Ready &bull; origintrace.trade
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  const text = `Welcome to OriginTrace

Hello ${adminName},

Your organization "${orgName}" has been set up on OriginTrace.

Your Login Details:
Email: ${email}
Temporary Password: ${temporaryPassword}

Log in at: ${loginUrl}

IMPORTANT: Please change your password after your first login.

© 2026 OriginTrace. All rights reserved.
origintrace.trade`;

  return { html, text };
}
