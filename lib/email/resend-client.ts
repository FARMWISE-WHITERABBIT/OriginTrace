import { Resend } from 'resend';

// ---------------------------------------------------------------------------
// Resend email client — production-ready, no Replit dependency
// Set RESEND_API_KEY in your environment.
// Set EMAIL_FROM to your verified sending address (e.g. no-reply@origintrace.trade)
// Falls back to onboarding@resend.dev for local/staging use.
// ---------------------------------------------------------------------------

let _client: Resend | null = null;

function getClient(): Resend {
  if (!_client) {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      throw new Error('RESEND_API_KEY is not set. Email sending is unavailable.');
    }
    _client = new Resend(apiKey);
  }
  return _client;
}

export const FROM_ADDRESS =
  process.env.EMAIL_FROM || 'OriginTrace <onboarding@resend.dev>';

export interface SendEmailParams {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  replyTo?: string;
}

/**
 * Send a transactional email via Resend.
 * Returns { success: true } or { success: false, error: string }.
 */
export async function sendEmail(
  params: SendEmailParams
): Promise<{ success: boolean; error?: string }> {
  try {
    const resend = getClient();
    const { error } = await resend.emails.send({
      from: FROM_ADDRESS,
      to: Array.isArray(params.to) ? params.to : [params.to],
      subject: params.subject,
      html: params.html,
      text: params.text,
      reply_to: params.replyTo,
    });
    if (error) {
      console.error('[email] Resend error:', error);
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (err: any) {
    console.error('[email] Failed to send email:', err);
    return { success: false, error: err?.message || 'Unknown error' };
  }
}

/**
 * @deprecated Use sendEmail() directly.
 * Kept for backwards compatibility with routes that call getResendClient().
 */
export async function getResendClient() {
  const client = getClient();
  return { client, fromEmail: FROM_ADDRESS };
}
