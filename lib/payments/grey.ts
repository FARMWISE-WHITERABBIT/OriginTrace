/**
 * Grey (virtual USD/GBP/EUR bank accounts) integration for OriginTrace.
 *
 * Used for Flow A (Inbound): traditional buyers who cannot use crypto
 * wire USD/GBP/EUR to a virtual bank account provisioned per org.
 * Inbound wires are confirmed via webhook (POST /api/webhooks/grey).
 *
 * Env vars required:
 *   GREY_API_KEY   — API key from Grey dashboard
 *   GREY_BASE_URL  — API base URL (defaults to https://api.grey.co/v1)
 *
 * Note: If switching to Leatherback, update GREY_BASE_URL to their endpoint.
 * The payload shapes are similar enough that only minor field mapping changes
 * would be needed.
 */

function baseUrl() {
  return process.env.GREY_BASE_URL ?? 'https://api.grey.co/v1';
}

function headers() {
  return {
    Authorization: `Bearer ${process.env.GREY_API_KEY ?? ''}`,
    'Content-Type': 'application/json',
  };
}

export type VirtualAccountCurrency = 'USD' | 'GBP' | 'EUR';

export interface GreyVirtualAccount {
  account_id: string;
  currency: VirtualAccountCurrency;
  account_number: string;
  routing_number?: string;
  bank_name: string;
  iban?: string;
  swift?: string;
  bic?: string;
  reference: string;
  created_at: string;
}

export interface GreyInboundTransfer {
  id: string;
  account_id: string;
  amount: number;
  currency: VirtualAccountCurrency;
  sender_name?: string;
  sender_bank?: string;
  reference?: string;
  narration?: string;
  status: 'pending' | 'confirmed' | 'returned';
  created_at: string;
}

/** Provision a new virtual bank account for an org/currency */
export async function createVirtualAccount(params: {
  business_name: string;
  currency: VirtualAccountCurrency;
  reference: string;
}): Promise<GreyVirtualAccount> {
  const res = await fetch(`${baseUrl()}/virtual-accounts`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify(params),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(`Grey createVirtualAccount failed: ${err.message ?? res.status}`);
  }
  const data = await res.json();
  return data.data ?? data;
}

/** Fetch details of an existing virtual account */
export async function getVirtualAccount(accountId: string): Promise<GreyVirtualAccount> {
  const res = await fetch(`${baseUrl()}/virtual-accounts/${accountId}`, {
    headers: headers(),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(`Grey getVirtualAccount failed: ${err.message ?? res.status}`);
  }
  const data = await res.json();
  return data.data ?? data;
}

/** List recent inbound transfers for a virtual account */
export async function listInboundTransfers(
  accountId: string,
  params?: { page?: number; limit?: number }
): Promise<{ transfers: GreyInboundTransfer[]; total: number }> {
  const qs = new URLSearchParams();
  if (params?.page) qs.set('page', String(params.page));
  if (params?.limit) qs.set('limit', String(params.limit ?? 20));

  const res = await fetch(`${baseUrl()}/virtual-accounts/${accountId}/transfers?${qs}`, {
    headers: headers(),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(`Grey listInboundTransfers failed: ${err.message ?? res.status}`);
  }
  const data = await res.json();
  return {
    transfers: data.data ?? data.transfers ?? [],
    total: data.total ?? 0,
  };
}

/** Verify a Grey webhook signature */
export function verifyGreySignature(rawBody: string, signatureHeader: string): boolean {
  const secret = process.env.GREY_WEBHOOK_SECRET;
  if (!secret) return true; // Skip in dev

  const crypto = require('crypto');
  const expected = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
  return expected === signatureHeader;
}
