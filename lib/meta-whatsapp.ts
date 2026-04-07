/**
 * Meta WhatsApp Cloud API integration
 *
 * Uses pre-approved WhatsApp message templates for business-initiated messages.
 * All functions degrade gracefully — if phone is missing or API is unconfigured,
 * they log a warning and return without throwing.
 *
 * Required env vars:
 *   META_WA_PHONE_NUMBER_ID   — from Meta Business Dashboard
 *   META_WA_ACCESS_TOKEN      — long-lived system user token
 */

const BASE_URL = 'https://graph.facebook.com/v18.0';

function getConfig(): { phoneNumberId: string; token: string } | null {
  const phoneNumberId = process.env.META_WA_PHONE_NUMBER_ID;
  const token = process.env.META_WA_ACCESS_TOKEN;
  if (!phoneNumberId || !token) return null;
  return { phoneNumberId, token };
}

/**
 * Normalise a phone number to E.164 format.
 * Assumes Nigerian numbers (+234) when no country code is present.
 */
export function formatPhoneE164(phone: string, defaultCountry = 'NG'): string | null {
  if (!phone) return null;
  // Strip everything except digits and leading +
  let cleaned = phone.replace(/[\s\-().]/g, '');
  if (cleaned.startsWith('+')) return cleaned; // already E.164
  if (cleaned.startsWith('00')) return '+' + cleaned.slice(2);
  if (defaultCountry === 'NG') {
    if (cleaned.startsWith('0')) return '+234' + cleaned.slice(1);
    if (cleaned.startsWith('234')) return '+' + cleaned;
  }
  return '+' + cleaned;
}

async function sendTemplate(
  phone: string,
  templateName: string,
  components: object[]
): Promise<boolean> {
  const cfg = getConfig();
  if (!cfg) {
    console.warn('[meta-whatsapp] META_WA_PHONE_NUMBER_ID or META_WA_ACCESS_TOKEN not set — skipping WhatsApp');
    return false;
  }

  const e164 = formatPhoneE164(phone);
  if (!e164) {
    console.warn('[meta-whatsapp] Could not parse phone number:', phone);
    return false;
  }

  try {
    const res = await fetch(`${BASE_URL}/${cfg.phoneNumberId}/messages`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${cfg.token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to: e164,
        type: 'template',
        template: {
          name: templateName,
          language: { code: 'en' },
          components,
        },
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      console.error(`[meta-whatsapp] Template "${templateName}" failed:`, err);
      return false;
    }
    return true;
  } catch (err) {
    console.error('[meta-whatsapp] Network error:', err);
    return false;
  }
}

/**
 * Booking confirmation WhatsApp message.
 * Template: origintrace_booking_confirmation
 * Params: {{1}} name, {{2}} datetime, {{3}} commodity, {{4}} reschedule link
 */
export async function sendBookingConfirmation(
  phone: string,
  name: string,
  meetingDatetime: Date,
  commodity: string,
  rescheduleLink: string
): Promise<boolean> {
  const formatted = meetingDatetime.toLocaleString('en-GB', {
    weekday: 'short', day: 'numeric', month: 'short',
    hour: '2-digit', minute: '2-digit', timeZoneName: 'short',
  });
  return sendTemplate(phone, 'origintrace_booking_confirmation', [
    { type: 'body', parameters: [
      { type: 'text', text: name },
      { type: 'text', text: formatted },
      { type: 'text', text: commodity || 'your commodity' },
      { type: 'text', text: rescheduleLink },
    ]},
  ]);
}

/**
 * 24-hour reminder WhatsApp message.
 * Template: origintrace_reminder_24h
 * Params: {{1}} name, {{2}} datetime, {{3}} reschedule link
 */
export async function send24hReminder(
  phone: string,
  name: string,
  meetingDatetime: Date,
  rescheduleLink: string
): Promise<boolean> {
  const formatted = meetingDatetime.toLocaleString('en-GB', {
    weekday: 'short', day: 'numeric', month: 'short',
    hour: '2-digit', minute: '2-digit', timeZoneName: 'short',
  });
  return sendTemplate(phone, 'origintrace_reminder_24h', [
    { type: 'body', parameters: [
      { type: 'text', text: name },
      { type: 'text', text: formatted },
      { type: 'text', text: rescheduleLink },
    ]},
  ]);
}

/**
 * 1-hour reminder WhatsApp message.
 * Template: origintrace_reminder_1h
 * Params: {{1}} name, {{2}} datetime
 */
export async function send1hReminder(
  phone: string,
  name: string,
  meetingDatetime: Date
): Promise<boolean> {
  const formatted = meetingDatetime.toLocaleString('en-GB', {
    hour: '2-digit', minute: '2-digit', timeZoneName: 'short',
  });
  return sendTemplate(phone, 'origintrace_reminder_1h', [
    { type: 'body', parameters: [
      { type: 'text', text: name },
      { type: 'text', text: formatted },
    ]},
  ]);
}

/**
 * No-show recovery WhatsApp message.
 * Template: origintrace_noshow_recovery
 * Params: {{1}} name, {{2}} rebook link
 */
export async function sendNoShowRecovery(
  phone: string,
  name: string,
  rebookLink: string
): Promise<boolean> {
  return sendTemplate(phone, 'origintrace_noshow_recovery', [
    { type: 'body', parameters: [
      { type: 'text', text: name },
      { type: 'text', text: rebookLink },
    ]},
  ]);
}
