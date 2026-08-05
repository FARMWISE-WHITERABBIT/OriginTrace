/**
 * Paystack payment integration for OriginTrace subscription billing.
 * Handles payment link generation and webhook verification.
 */

const PAYSTACK_BASE = 'https://api.paystack.co';

function getSecretKey(): string {
  const key = process.env.PAYSTACK_SECRET_KEY;
  if (!key) throw new Error('PAYSTACK_SECRET_KEY is not set');
  return key;
}

export interface PaystackPaymentLinkParams {
  email: string;
  amountKobo: number;         // Amount in kobo (NGN * 100)
  reference: string;          // Unique reference
  callbackUrl: string;
  metadata?: Record<string, unknown>;
  channels?: ('card' | 'bank' | 'ussd' | 'qr' | 'mobile_money' | 'bank_transfer')[];
}

export interface PaystackInitResponse {
  authorizationUrl: string;
  accessCode: string;
  reference: string;
}

/**
 * Initialize a Paystack transaction and return the hosted payment URL.
 */
export async function initializePayment(
  params: PaystackPaymentLinkParams
): Promise<PaystackInitResponse> {
  const res = await fetch(`${PAYSTACK_BASE}/transaction/initialize`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${getSecretKey()}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email:        params.email,
      amount:       params.amountKobo,
      reference:    params.reference,
      callback_url: params.callbackUrl,
      metadata:     params.metadata || {},
      channels:     params.channels || ['card', 'bank', 'bank_transfer'],
    }),
  });

  const data = await res.json();
  if (!data.status) {
    throw new Error(`Paystack error: ${data.message}`);
  }

  return {
    authorizationUrl: data.data.authorization_url,
    accessCode:       data.data.access_code,
    reference:        data.data.reference,
  };
}

/**
 * Verify a Paystack transaction by reference.
 */
export async function verifyTransaction(reference: string): Promise<{
  status: 'success' | 'failed' | 'abandoned' | 'pending';
  amount: number;       // kobo
  currency: string;
  paidAt: string;
  metadata: Record<string, unknown>;
  customerEmail: string;
}> {
  const res = await fetch(`${PAYSTACK_BASE}/transaction/verify/${encodeURIComponent(reference)}`, {
    headers: { Authorization: `Bearer ${getSecretKey()}` },
  });
  const data = await res.json();
  if (!data.status) throw new Error(`Paystack verify error: ${data.message}`);

  const tx = data.data;
  return {
    status:        tx.status,
    amount:        tx.amount,
    currency:      tx.currency,
    paidAt:        tx.paid_at,
    metadata:      tx.metadata || {},
    customerEmail: tx.customer?.email,
  };
}

/**
 * Verify the HMAC-SHA512 signature on incoming Paystack webhooks.
 * Returns true if signature matches.
 */
export function verifyWebhookSignature(body: string, signature: string): boolean {
  const crypto = require('crypto');
  const hash = crypto
    .createHmac('sha512', getSecretKey())
    .update(body)
    .digest('hex');
  return hash === signature;
}

/**
 * Generate a unique Paystack reference for a payment link.
 */
export function generateReference(orgId: string, tier: string): string {
  const ts = Date.now().toString(36).toUpperCase();
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `OT-${tier.toUpperCase()}-${ts}-${rand}`;
}

// ─── Transfer / Disbursement API ─────────────────────────────────────────────

/**
 * Resolve a Nigerian bank account to get the account holder name.
 * Used to verify farmer/exporter bank details before creating a recipient.
 */
export async function resolveAccount(params: {
  accountNumber: string;
  bankCode: string;
}): Promise<{ accountName: string; accountNumber: string; bankId: number }> {
  const url = `${PAYSTACK_BASE}/bank/resolve?account_number=${encodeURIComponent(params.accountNumber)}&bank_code=${encodeURIComponent(params.bankCode)}`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${getSecretKey()}` },
  });
  const data = await res.json();
  if (!data.status) {
    throw new Error(data.message ?? 'Account resolution failed');
  }
  return {
    accountName:   data.data.account_name,
    accountNumber: data.data.account_number,
    bankId:        data.data.bank_id,
  };
}

/**
 * Create a Paystack Transfer Recipient for a bank account.
 * The recipient code is stored and reused for future transfers.
 */
export async function createTransferRecipient(params: {
  name: string;
  accountNumber: string;
  bankCode: string;
  currency?: string;
}): Promise<{ recipientCode: string; recipientId: number }> {
  const res = await fetch(`${PAYSTACK_BASE}/transferrecipient`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${getSecretKey()}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      type:           'nuban',
      name:           params.name,
      account_number: params.accountNumber,
      bank_code:      params.bankCode,
      currency:       params.currency ?? 'NGN',
    }),
  });
  const data = await res.json();
  if (!data.status) {
    throw new Error(data.message ?? 'Failed to create transfer recipient');
  }
  return {
    recipientCode: data.data.recipient_code,
    recipientId:   data.data.id,
  };
}

/**
 * Initiate a bank transfer to a Paystack recipient.
 * Amount must be in kobo (NGN * 100).
 */
export async function initiateTransfer(params: {
  amount: number;         // kobo
  recipientCode: string;
  reference: string;
  reason: string;
}): Promise<{ transferCode: string; status: string; reference: string }> {
  const res = await fetch(`${PAYSTACK_BASE}/transfer`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${getSecretKey()}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      source:          'balance',
      amount:          params.amount,
      recipient:       params.recipientCode,
      reference:       params.reference,
      reason:          params.reason,
    }),
  });
  const data = await res.json();
  if (!data.status) {
    throw new Error(data.message ?? 'Transfer initiation failed');
  }
  return {
    transferCode: data.data.transfer_code,
    status:       data.data.status,
    reference:    data.data.reference,
  };
}
