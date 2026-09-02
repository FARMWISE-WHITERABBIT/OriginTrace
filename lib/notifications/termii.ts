/**
 * Termii SMS integration for OriginTrace.
 * Used to notify farmers when payments are sent or fail.
 *
 * Env vars required:
 *   TERMII_API_KEY   — API key from Termii dashboard
 *   TERMII_SENDER_ID — Alphanumeric sender ID (default: 'OriginTrace')
 */

const BASE_URL = 'https://api.ng.termii.com/api';

export interface SendSMSParams {
  to: string;       // Recipient phone number (e.g. +2348012345678)
  sms: string;      // Message body (max 160 chars for single SMS)
  from?: string;    // Sender ID override
}

export interface SendSMSResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

export async function sendSMS({ to, sms, from }: SendSMSParams): Promise<SendSMSResult> {
  const apiKey = process.env.TERMII_API_KEY;
  if (!apiKey) {
    console.warn('[Termii] TERMII_API_KEY not set — SMS skipped');
    return { success: false, error: 'TERMII_API_KEY not configured' };
  }

  const senderId = from ?? process.env.TERMII_SENDER_ID ?? 'OriginTrace';

  try {
    const response = await fetch(`${BASE_URL}/sms/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        api_key: apiKey,
        to,
        from: senderId,
        sms,
        type: 'plain',
        channel: 'generic',
      }),
    });

    const data = await response.json();

    if (!response.ok || data.code === 'ok' === false) {
      const errMsg = data.message || `HTTP ${response.status}`;
      console.error('[Termii] SMS send failed:', errMsg);
      return { success: false, error: errMsg };
    }

    return { success: true, messageId: data.message_id };
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    console.error('[Termii] SMS send error:', msg);
    return { success: false, error: msg };
  }
}

/** Convenience: payment confirmation SMS */
export function buildPaymentConfirmationSMS(params: {
  amount: number;
  currency: string;
  weightKg: number;
  commodity: string;
  reference: string;
}): string {
  const { amount, currency, weightKg, commodity, reference } = params;
  const amountStr = `${currency} ${amount.toLocaleString()}`;
  return `OriginTrace: ${amountStr} paid for ${weightKg}kg ${commodity}. Ref: ${reference}. Questions? Contact your agent.`;
}

/** Convenience: payment failure SMS */
export function buildPaymentFailureSMS(params: {
  amount: number;
  currency: string;
  reference: string;
}): string {
  const { amount, currency, reference } = params;
  return `OriginTrace: Payment of ${currency} ${amount.toLocaleString()} failed. Ref: ${reference}. Contact your aggregator.`;
}
