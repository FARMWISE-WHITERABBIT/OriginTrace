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

export function buildBuyerInvitationEmail(params: {
  buyerCompanyName: string;
  exporterOrgName: string;
  invitationDetails?: string;
  acceptUrl: string;
}) {
  const { buyerCompanyName, exporterOrgName, invitationDetails, acceptUrl } = params;

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Supply Chain Invitation - OriginTrace</title>
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
              <p style="margin:8px 0 0;color:#6FB8A8;font-size:13px;letter-spacing:1px;text-transform:uppercase;">Supply Chain Invitation</p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:40px;">
              <h2 style="margin:0 0 8px;color:#111827;font-size:20px;font-weight:600;">New Buyer Invitation</h2>
              <p style="margin:0 0 24px;color:#4B5563;font-size:15px;line-height:1.6;">
                Hello ${exporterOrgName} Team,
              </p>
              <p style="margin:0 0 24px;color:#4B5563;font-size:15px;line-height:1.6;">
                <strong style="color:#111827;">${buyerCompanyName}</strong> has invited your organization to join their supply chain on OriginTrace. By accepting this invitation, you will be able to share traceability data, shipments, and compliance documentation with ${buyerCompanyName}.
              </p>

              <!-- Invitation Details Box -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#F0FDF4;border:1px solid #BBF7D0;border-radius:8px;margin-bottom:24px;">
                <tr>
                  <td style="padding:24px;">
                    <p style="margin:0 0 4px;color:#166534;font-size:13px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;">Invitation Details</p>
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:12px;">
                      <tr>
                        <td style="padding:6px 0;color:#4B5563;font-size:14px;width:140px;">Buyer Company:</td>
                        <td style="padding:6px 0;color:#111827;font-size:14px;font-weight:600;">${buyerCompanyName}</td>
                      </tr>
                      <tr>
                        <td style="padding:6px 0;color:#4B5563;font-size:14px;width:140px;">Your Organization:</td>
                        <td style="padding:6px 0;color:#111827;font-size:14px;font-weight:600;">${exporterOrgName}</td>
                      </tr>
                      ${invitationDetails ? `<tr>
                        <td style="padding:6px 0;color:#4B5563;font-size:14px;width:140px;">Notes:</td>
                        <td style="padding:6px 0;color:#111827;font-size:14px;">${invitationDetails}</td>
                      </tr>` : ''}
                    </table>
                  </td>
                </tr>
              </table>

              <!-- CTA Button -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="padding:8px 0 24px;">
                    <a href="${acceptUrl}" style="display:inline-block;background-color:#2E7D6B;color:#ffffff;text-decoration:none;padding:14px 32px;border-radius:6px;font-size:15px;font-weight:600;letter-spacing:0.3px;">Review Invitation</a>
                  </td>
                </tr>
              </table>

              <!-- Info Note -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#EFF6FF;border:1px solid #BFDBFE;border-radius:8px;">
                <tr>
                  <td style="padding:16px 20px;">
                    <p style="margin:0;color:#1E40AF;font-size:13px;line-height:1.5;">
                      <strong>What happens next?</strong> Log in to your OriginTrace dashboard to review and accept this invitation. Once accepted, ${buyerCompanyName} will be able to view your shared traceability data.
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

  const text = `Supply Chain Invitation - OriginTrace

Hello ${exporterOrgName} Team,

${buyerCompanyName} has invited your organization to join their supply chain on OriginTrace.

Invitation Details:
Buyer Company: ${buyerCompanyName}
Your Organization: ${exporterOrgName}${invitationDetails ? `\nNotes: ${invitationDetails}` : ''}

Review and accept this invitation by visiting: ${acceptUrl}

Once accepted, ${buyerCompanyName} will be able to view your shared traceability data.

© 2026 OriginTrace. All rights reserved.
origintrace.trade`;

  return { html, text };
}

export function buildYieldFlagEmail(params: {
  recipientName: string;
  orgName: string;
  farmerName: string;
  farmId: string;
  batchWeight: number;
  expectedMax: number;
  percentageOver: number;
  commodity: string;
  dashboardUrl: string;
}) {
  const { recipientName, orgName, farmerName, farmId, batchWeight, expectedMax, percentageOver, commodity, dashboardUrl } = params;

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Yield Alert - OriginTrace</title>
</head>
<body style="margin:0;padding:0;background-color:#F8FAF9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#F8FAF9;padding:40px 20px;">
    <tr>
      <td align="center">
        <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
          <tr>
            <td style="background-color:#1F5F52;padding:32px 40px;text-align:center;">
              <h1 style="margin:0;color:#ffffff;font-size:24px;font-weight:700;letter-spacing:-0.5px;">OriginTrace</h1>
              <p style="margin:8px 0 0;color:#6FB8A8;font-size:13px;letter-spacing:1px;text-transform:uppercase;">Compliance Alert</p>
            </td>
          </tr>
          <tr>
            <td style="padding:40px;">
              <h2 style="margin:0 0 8px;color:#111827;font-size:20px;font-weight:600;">Yield Validation Flag</h2>
              <p style="margin:0 0 24px;color:#4B5563;font-size:15px;line-height:1.6;">
                Hello ${recipientName},
              </p>
              <p style="margin:0 0 24px;color:#4B5563;font-size:15px;line-height:1.6;">
                A collection batch from <strong style="color:#111827;">${orgName}</strong> has been flagged for exceeding the expected yield threshold and requires your review.
              </p>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#FEF2F2;border:1px solid #FECACA;border-radius:8px;margin-bottom:24px;">
                <tr>
                  <td style="padding:24px;">
                    <p style="margin:0 0 4px;color:#991B1B;font-size:13px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;">Flagged Batch Details</p>
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:12px;">
                      <tr>
                        <td style="padding:6px 0;color:#4B5563;font-size:14px;width:160px;">Farmer:</td>
                        <td style="padding:6px 0;color:#111827;font-size:14px;font-weight:600;">${farmerName}</td>
                      </tr>
                      <tr>
                        <td style="padding:6px 0;color:#4B5563;font-size:14px;">Commodity:</td>
                        <td style="padding:6px 0;color:#111827;font-size:14px;font-weight:600;">${commodity}</td>
                      </tr>
                      <tr>
                        <td style="padding:6px 0;color:#4B5563;font-size:14px;">Batch Weight:</td>
                        <td style="padding:6px 0;color:#DC2626;font-size:14px;font-weight:600;">${batchWeight} kg</td>
                      </tr>
                      <tr>
                        <td style="padding:6px 0;color:#4B5563;font-size:14px;">Expected Maximum:</td>
                        <td style="padding:6px 0;color:#111827;font-size:14px;font-weight:600;">${expectedMax} kg</td>
                      </tr>
                      <tr>
                        <td style="padding:6px 0;color:#4B5563;font-size:14px;">Over Threshold:</td>
                        <td style="padding:6px 0;color:#DC2626;font-size:14px;font-weight:600;">${Math.round(percentageOver)}%</td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="padding:8px 0 24px;">
                    <a href="${dashboardUrl}" style="display:inline-block;background-color:#2E7D6B;color:#ffffff;text-decoration:none;padding:14px 32px;border-radius:6px;font-size:15px;font-weight:600;letter-spacing:0.3px;">Review Flagged Batches</a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="background-color:#F9FAFB;padding:24px 40px;border-top:1px solid #E5E7EB;">
              <p style="margin:0 0 4px;color:#9CA3AF;font-size:12px;text-align:center;">&copy; 2026 OriginTrace. All rights reserved.</p>
              <p style="margin:0;color:#9CA3AF;font-size:12px;text-align:center;">EUDR Compliance Ready &bull; origintrace.trade</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  const text = `Yield Validation Flag - OriginTrace

Hello ${recipientName},

A collection batch from ${orgName} has been flagged for exceeding the expected yield threshold.

Flagged Batch Details:
Farmer: ${farmerName}
Commodity: ${commodity}
Batch Weight: ${batchWeight} kg
Expected Maximum: ${expectedMax} kg
Over Threshold: ${Math.round(percentageOver)}%

Review flagged batches at: ${dashboardUrl}

© 2026 OriginTrace. All rights reserved.
origintrace.trade`;

  return { html, text };
}

export function buildFarmConflictEmail(params: {
  recipientName: string;
  orgName: string;
  farmAName: string;
  farmBName: string;
  overlapRatio: number;
  dashboardUrl: string;
}) {
  const { recipientName, orgName, farmAName, farmBName, overlapRatio, dashboardUrl } = params;

  const overlapPercent = Math.round(overlapRatio * 100);

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Farm Boundary Conflict - OriginTrace</title>
</head>
<body style="margin:0;padding:0;background-color:#F8FAF9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#F8FAF9;padding:40px 20px;">
    <tr>
      <td align="center">
        <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
          <tr>
            <td style="background-color:#1F5F52;padding:32px 40px;text-align:center;">
              <h1 style="margin:0;color:#ffffff;font-size:24px;font-weight:700;letter-spacing:-0.5px;">OriginTrace</h1>
              <p style="margin:8px 0 0;color:#6FB8A8;font-size:13px;letter-spacing:1px;text-transform:uppercase;">Compliance Alert</p>
            </td>
          </tr>
          <tr>
            <td style="padding:40px;">
              <h2 style="margin:0 0 8px;color:#111827;font-size:20px;font-weight:600;">Farm Boundary Conflict Detected</h2>
              <p style="margin:0 0 24px;color:#4B5563;font-size:15px;line-height:1.6;">
                Hello ${recipientName},
              </p>
              <p style="margin:0 0 24px;color:#4B5563;font-size:15px;line-height:1.6;">
                A boundary overlap has been detected between two farms in <strong style="color:#111827;">${orgName}</strong>. This conflict needs to be resolved to maintain EUDR compliance.
              </p>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#FFFBEB;border:1px solid #FDE68A;border-radius:8px;margin-bottom:24px;">
                <tr>
                  <td style="padding:24px;">
                    <p style="margin:0 0 4px;color:#92400E;font-size:13px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;">Conflict Details</p>
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:12px;">
                      <tr>
                        <td style="padding:6px 0;color:#4B5563;font-size:14px;width:120px;">Farm A:</td>
                        <td style="padding:6px 0;color:#111827;font-size:14px;font-weight:600;">${farmAName}</td>
                      </tr>
                      <tr>
                        <td style="padding:6px 0;color:#4B5563;font-size:14px;">Farm B:</td>
                        <td style="padding:6px 0;color:#111827;font-size:14px;font-weight:600;">${farmBName}</td>
                      </tr>
                      <tr>
                        <td style="padding:6px 0;color:#4B5563;font-size:14px;">Overlap:</td>
                        <td style="padding:6px 0;color:#B45309;font-size:14px;font-weight:600;">${overlapPercent}%</td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="padding:8px 0 24px;">
                    <a href="${dashboardUrl}" style="display:inline-block;background-color:#2E7D6B;color:#ffffff;text-decoration:none;padding:14px 32px;border-radius:6px;font-size:15px;font-weight:600;letter-spacing:0.3px;">Review Conflicts</a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="background-color:#F9FAFB;padding:24px 40px;border-top:1px solid #E5E7EB;">
              <p style="margin:0 0 4px;color:#9CA3AF;font-size:12px;text-align:center;">&copy; 2026 OriginTrace. All rights reserved.</p>
              <p style="margin:0;color:#9CA3AF;font-size:12px;text-align:center;">EUDR Compliance Ready &bull; origintrace.trade</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  const text = `Farm Boundary Conflict Detected - OriginTrace

Hello ${recipientName},

A boundary overlap has been detected between two farms in ${orgName}.

Conflict Details:
Farm A: ${farmAName}
Farm B: ${farmBName}
Overlap: ${overlapPercent}%

This conflict needs to be resolved to maintain EUDR compliance.

Review conflicts at: ${dashboardUrl}

© 2026 OriginTrace. All rights reserved.
origintrace.trade`;

  return { html, text };
}

export function buildDeforestationRiskEmail(params: {
  recipientName: string;
  orgName: string;
  farmerName: string;
  farmId: string;
  forestLossHectares: number;
  forestLossPercentage: number;
  riskLevel: string;
  dashboardUrl: string;
}) {
  const { recipientName, orgName, farmerName, farmId, forestLossHectares, forestLossPercentage, riskLevel, dashboardUrl } = params;

  const riskColor = riskLevel === 'high' ? '#DC2626' : riskLevel === 'medium' ? '#D97706' : '#16A34A';
  const riskBg = riskLevel === 'high' ? '#FEF2F2' : riskLevel === 'medium' ? '#FFFBEB' : '#F0FDF4';
  const riskBorder = riskLevel === 'high' ? '#FECACA' : riskLevel === 'medium' ? '#FDE68A' : '#BBF7D0';

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Deforestation Risk Alert - OriginTrace</title>
</head>
<body style="margin:0;padding:0;background-color:#F8FAF9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#F8FAF9;padding:40px 20px;">
    <tr>
      <td align="center">
        <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
          <tr>
            <td style="background-color:#1F5F52;padding:32px 40px;text-align:center;">
              <h1 style="margin:0;color:#ffffff;font-size:24px;font-weight:700;letter-spacing:-0.5px;">OriginTrace</h1>
              <p style="margin:8px 0 0;color:#6FB8A8;font-size:13px;letter-spacing:1px;text-transform:uppercase;">Compliance Alert</p>
            </td>
          </tr>
          <tr>
            <td style="padding:40px;">
              <h2 style="margin:0 0 8px;color:#111827;font-size:20px;font-weight:600;">Deforestation Risk Detected</h2>
              <p style="margin:0 0 24px;color:#4B5563;font-size:15px;line-height:1.6;">
                Hello ${recipientName},
              </p>
              <p style="margin:0 0 24px;color:#4B5563;font-size:15px;line-height:1.6;">
                A deforestation risk check for a farm in <strong style="color:#111827;">${orgName}</strong> has returned a <strong style="color:${riskColor};">${riskLevel.toUpperCase()}</strong> risk level. Immediate review is recommended.
              </p>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:${riskBg};border:1px solid ${riskBorder};border-radius:8px;margin-bottom:24px;">
                <tr>
                  <td style="padding:24px;">
                    <p style="margin:0 0 4px;color:${riskColor};font-size:13px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;">Risk Assessment</p>
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:12px;">
                      <tr>
                        <td style="padding:6px 0;color:#4B5563;font-size:14px;width:160px;">Farm:</td>
                        <td style="padding:6px 0;color:#111827;font-size:14px;font-weight:600;">${farmerName}</td>
                      </tr>
                      <tr>
                        <td style="padding:6px 0;color:#4B5563;font-size:14px;">Risk Level:</td>
                        <td style="padding:6px 0;color:${riskColor};font-size:14px;font-weight:600;">${riskLevel.toUpperCase()}</td>
                      </tr>
                      <tr>
                        <td style="padding:6px 0;color:#4B5563;font-size:14px;">Forest Loss:</td>
                        <td style="padding:6px 0;color:#111827;font-size:14px;font-weight:600;">${forestLossHectares} hectares (${forestLossPercentage}%)</td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="padding:8px 0 24px;">
                    <a href="${dashboardUrl}" style="display:inline-block;background-color:#2E7D6B;color:#ffffff;text-decoration:none;padding:14px 32px;border-radius:6px;font-size:15px;font-weight:600;letter-spacing:0.3px;">Review Farm Details</a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="background-color:#F9FAFB;padding:24px 40px;border-top:1px solid #E5E7EB;">
              <p style="margin:0 0 4px;color:#9CA3AF;font-size:12px;text-align:center;">&copy; 2026 OriginTrace. All rights reserved.</p>
              <p style="margin:0;color:#9CA3AF;font-size:12px;text-align:center;">EUDR Compliance Ready &bull; origintrace.trade</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  const text = `Deforestation Risk Detected - OriginTrace

Hello ${recipientName},

A deforestation risk check for a farm in ${orgName} has returned a ${riskLevel.toUpperCase()} risk level.

Risk Assessment:
Farm: ${farmerName}
Risk Level: ${riskLevel.toUpperCase()}
Forest Loss: ${forestLossHectares} hectares (${forestLossPercentage}%)

Review farm details at: ${dashboardUrl}

© 2026 OriginTrace. All rights reserved.
origintrace.trade`;

  return { html, text };
}

export function buildDocumentExpiryEmail(params: {
  recipientName: string;
  orgName: string;
  documents: Array<{
    title: string;
    documentType: string;
    expiryDate: string;
    daysRemaining: number;
  }>;
  documentVaultUrl: string;
}) {
  const { recipientName, orgName, documents, documentVaultUrl } = params;

  const formatDocType = (t: string) =>
    t.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

  const urgencyColor = (days: number) =>
    days <= 0 ? '#DC2626' : days <= 7 ? '#F59E0B' : '#2E7D6B';

  const urgencyLabel = (days: number) =>
    days <= 0 ? 'EXPIRED' : days <= 7 ? `${days} days left` : `${days} days left`;

  const docRows = documents
    .map(
      doc => `
        <tr>
          <td style="padding:10px 12px;border-bottom:1px solid #E5E7EB;color:#111827;font-size:14px;">${doc.title}</td>
          <td style="padding:10px 12px;border-bottom:1px solid #E5E7EB;color:#4B5563;font-size:14px;">${formatDocType(doc.documentType)}</td>
          <td style="padding:10px 12px;border-bottom:1px solid #E5E7EB;color:#4B5563;font-size:14px;">${doc.expiryDate}</td>
          <td style="padding:10px 12px;border-bottom:1px solid #E5E7EB;text-align:center;">
            <span style="display:inline-block;padding:3px 10px;border-radius:12px;font-size:12px;font-weight:600;color:#ffffff;background-color:${urgencyColor(doc.daysRemaining)};">${urgencyLabel(doc.daysRemaining)}</span>
          </td>
        </tr>`
    )
    .join('');

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Document Expiry Alert</title>
</head>
<body style="margin:0;padding:0;background-color:#F8FAF9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#F8FAF9;padding:40px 20px;">
    <tr>
      <td align="center">
        <table role="presentation" width="620" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1);">

          <!-- Header -->
          <tr>
            <td style="background-color:#1F5F52;padding:32px 40px;text-align:center;">
              <h1 style="margin:0;color:#ffffff;font-size:24px;font-weight:700;letter-spacing:-0.5px;">OriginTrace</h1>
              <p style="margin:8px 0 0;color:#6FB8A8;font-size:13px;letter-spacing:1px;text-transform:uppercase;">Document Expiry Alert</p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:40px;">
              <h2 style="margin:0 0 8px;color:#111827;font-size:20px;font-weight:600;">Documents Requiring Attention</h2>
              <p style="margin:0 0 24px;color:#4B5563;font-size:15px;line-height:1.6;">
                Hello ${recipientName},
              </p>
              <p style="margin:0 0 24px;color:#4B5563;font-size:15px;line-height:1.6;">
                The following documents for <strong style="color:#111827;">${orgName}</strong> are expiring soon or have already expired. Please review and renew them to maintain compliance.
              </p>

              <!-- Documents Table -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #E5E7EB;border-radius:8px;overflow:hidden;margin-bottom:24px;">
                <tr style="background-color:#F9FAFB;">
                  <th style="padding:10px 12px;text-align:left;color:#6B7280;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;border-bottom:1px solid #E5E7EB;">Document</th>
                  <th style="padding:10px 12px;text-align:left;color:#6B7280;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;border-bottom:1px solid #E5E7EB;">Type</th>
                  <th style="padding:10px 12px;text-align:left;color:#6B7280;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;border-bottom:1px solid #E5E7EB;">Expiry Date</th>
                  <th style="padding:10px 12px;text-align:center;color:#6B7280;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;border-bottom:1px solid #E5E7EB;">Status</th>
                </tr>
                ${docRows}
              </table>

              <!-- CTA Button -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="padding:8px 0 24px;">
                    <a href="${documentVaultUrl}" style="display:inline-block;background-color:#2E7D6B;color:#ffffff;text-decoration:none;padding:14px 32px;border-radius:6px;font-size:15px;font-weight:600;letter-spacing:0.3px;">Go to Document Vault</a>
                  </td>
                </tr>
              </table>

              <!-- Warning Note -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#FFFBEB;border:1px solid #FDE68A;border-radius:8px;">
                <tr>
                  <td style="padding:16px 20px;">
                    <p style="margin:0;color:#92400E;font-size:13px;line-height:1.5;">
                      <strong>Compliance Notice:</strong> Expired or missing documents may impact your shipment compliance scores and EUDR readiness. Please renew documents before their expiry date.
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

  const docList = documents
    .map(
      doc =>
        `- ${doc.title} (${formatDocType(doc.documentType)}) -- Expires: ${doc.expiryDate} -- ${urgencyLabel(doc.daysRemaining)}`
    )
    .join('\n');

  const text = `Document Expiry Alert

Hello ${recipientName},

The following documents for "${orgName}" are expiring soon or have already expired:

${docList}

Please review and renew them at: ${documentVaultUrl}

IMPORTANT: Expired or missing documents may impact your compliance scores.

© 2026 OriginTrace. All rights reserved.
origintrace.trade`;

  return { html, text };
}

// ─── Stage transition notification ───────────────────────────────────────────

const STAGE_NAMES: Record<number, string> = {
  1: 'Preparation',
  2: 'Quality & Certification',
  3: 'Documentation',
  4: 'Customs & Clearance',
  5: 'Freight & Vessel',
  6: 'Container Stuffing',
  7: 'Departure',
  8: 'Arrival & Clearance',
  9: 'Close',
};

const STAGE_NEXT_ACTIONS: Record<number, string> = {
  1: 'Commission lab tests and arrange pre-shipment inspection.',
  2: 'Collect all required export documents (commercial invoice, packing list, COO, phytosanitary certificate).',
  3: 'Assign clearing agent and file NCS/NESS customs declaration.',
  4: 'Confirm vessel booking, ETD and ETA with freight forwarder.',
  5: 'Record container number and seal number after container stuffing.',
  6: 'Confirm actual vessel departure and upload Bill of Lading.',
  7: 'Monitor transit and record actual arrival date.',
  8: 'Confirm customs clearance at destination and record shipment outcome.',
  9: 'Shipment is at the close stage. Record the final outcome to complete.',
};

export function buildShipmentStageEmail(params: {
  recipientName: string;
  recipientRole: 'exporter' | 'buyer' | 'freight_forwarder' | 'internal';
  shipmentCode: string;
  previousStage: number;
  newStage: number;
  dashboardUrl: string;
  orgName: string;
}) {
  const {
    recipientName,
    recipientRole,
    shipmentCode,
    previousStage,
    newStage,
    dashboardUrl,
    orgName,
  } = params;

  const stageName = STAGE_NAMES[newStage] ?? `Stage ${newStage}`;
  const prevStageName = STAGE_NAMES[previousStage] ?? `Stage ${previousStage}`;
  const nextAction = STAGE_NEXT_ACTIONS[newStage] ?? '';

  const roleLabel =
    recipientRole === 'buyer'
      ? 'As the buyer, you can view the shipment status and compliance documentation in your buyer portal.'
      : recipientRole === 'freight_forwarder'
      ? 'As the freight forwarder, please ensure all vessel and container details are up to date in the system.'
      : 'Log in to OriginTrace to review the current stage and complete required actions.';

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Shipment ${shipmentCode} — Stage Advanced</title>
</head>
<body style="margin:0;padding:0;background-color:#F8FAF9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#F8FAF9;padding:40px 20px;">
    <tr>
      <td align="center">
        <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
          <tr>
            <td style="background-color:#1F5F52;padding:32px 40px;text-align:center;">
              <h1 style="margin:0;color:#ffffff;font-size:24px;font-weight:700;letter-spacing:-0.5px;">OriginTrace</h1>
              <p style="margin:8px 0 0;color:#6FB8A8;font-size:13px;letter-spacing:1px;text-transform:uppercase;">Shipment Pipeline Update</p>
            </td>
          </tr>
          <tr>
            <td style="padding:40px;">
              <h2 style="margin:0 0 8px;color:#111827;font-size:20px;font-weight:600;">Shipment Advanced to Stage ${newStage}</h2>
              <p style="margin:0 0 24px;color:#4B5563;font-size:15px;line-height:1.6;">Hello ${recipientName},</p>
              <p style="margin:0 0 24px;color:#4B5563;font-size:15px;line-height:1.6;">
                Shipment <strong style="color:#111827;font-family:'Courier New',monospace;">${shipmentCode}</strong> has advanced from
                <strong>Stage ${previousStage}: ${prevStageName}</strong> to
                <strong>Stage ${newStage}: ${stageName}</strong>.
              </p>

              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#F0FDF4;border:1px solid #BBF7D0;border-radius:8px;margin-bottom:24px;">
                <tr>
                  <td style="padding:20px 24px;">
                    <p style="margin:0 0 4px;color:#166534;font-size:13px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;">Current Stage</p>
                    <p style="margin:0;color:#111827;font-size:18px;font-weight:700;">Stage ${newStage}: ${stageName}</p>
                    <p style="margin:8px 0 0;color:#166534;font-size:13px;">${orgName}</p>
                  </td>
                </tr>
              </table>

              ${nextAction ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#FFF7ED;border:1px solid #FED7AA;border-radius:8px;margin-bottom:24px;">
                <tr>
                  <td style="padding:20px 24px;">
                    <p style="margin:0 0 8px;color:#92400E;font-size:13px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;">Next Actions</p>
                    <p style="margin:0;color:#78350F;font-size:14px;line-height:1.6;">${nextAction}</p>
                  </td>
                </tr>
              </table>` : ''}

              <p style="margin:0 0 24px;color:#4B5563;font-size:14px;line-height:1.6;">${roleLabel}</p>

              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="padding:8px 0 24px;">
                    <a href="${dashboardUrl}" style="display:inline-block;background-color:#2E7D6B;color:#ffffff;text-decoration:none;padding:14px 32px;border-radius:6px;font-size:15px;font-weight:600;letter-spacing:0.3px;">View Shipment</a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="background-color:#F9FAFB;padding:24px 40px;border-top:1px solid #E5E7EB;">
              <p style="margin:0 0 4px;color:#9CA3AF;font-size:12px;text-align:center;">&copy; 2026 OriginTrace. All rights reserved.</p>
              <p style="margin:0;color:#9CA3AF;font-size:12px;text-align:center;">EUDR Compliance Ready &bull; origintrace.trade</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  const text = `Shipment ${shipmentCode} — Stage Advanced to ${stageName}

Hello ${recipientName},

Shipment ${shipmentCode} has advanced from Stage ${previousStage}: ${prevStageName} to Stage ${newStage}: ${stageName}.

${nextAction ? `Next actions: ${nextAction}` : ''}

${roleLabel}

View shipment: ${dashboardUrl}

© 2026 OriginTrace. All rights reserved.
origintrace.trade`;

  return { html, text };
}
