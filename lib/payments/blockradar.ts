/**
 * Blockradar USDC/stablecoin wallet integration for OriginTrace.
 *
 * Used for Flow A (Inbound): international buyers pay exporters in USDC/USDT.
 * Each org gets a dedicated wallet. Buyers send to the org's deposit address.
 * Incoming deposits are confirmed via webhook (POST /api/webhooks/blockradar).
 *
 * Env vars required:
 *   BLOCKRADAR_API_KEY  — API key from Blockradar dashboard
 */

const BASE_URL = 'https://api.blockradar.co/v1';

function headers() {
  return {
    'x-api-key': process.env.BLOCKRADAR_API_KEY ?? '',
    'Content-Type': 'application/json',
  };
}

export interface BlockradarWallet {
  id: string;
  label: string;
  network: string;
  address: string;
  balance: number;
  currency: string;
}

export interface BlockradarTransaction {
  id: string;
  type: 'deposit' | 'withdrawal';
  amount: number;
  currency: string;
  network: string;
  hash: string;
  from?: string;
  to: string;
  status: 'pending' | 'confirmed' | 'failed';
  reference?: string;
  created_at: string;
}

export interface BlockradarBalance {
  currency: string;
  available: number;
  pending: number;
}

/** Create a new custodial wallet for an org */
export async function createWallet(label: string): Promise<BlockradarWallet> {
  const res = await fetch(`${BASE_URL}/wallets`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({ label, currency: 'USDC' }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(`Blockradar createWallet failed: ${err.message ?? res.status}`);
  }
  const data = await res.json();
  return data.data ?? data;
}

/** Get wallet balance */
export async function getWalletBalance(walletId: string): Promise<BlockradarBalance> {
  const res = await fetch(`${BASE_URL}/wallets/${walletId}/balance`, {
    headers: headers(),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(`Blockradar getWalletBalance failed: ${err.message ?? res.status}`);
  }
  const data = await res.json();
  return data.data ?? data;
}

/** Get deposit address for a specific network */
export async function getDepositAddress(
  walletId: string,
  network: 'ethereum' | 'polygon' | 'tron' = 'polygon'
): Promise<string> {
  const res = await fetch(`${BASE_URL}/wallets/${walletId}/address?network=${network}`, {
    headers: headers(),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(`Blockradar getDepositAddress failed: ${err.message ?? res.status}`);
  }
  const data = await res.json();
  return (data.data ?? data).address;
}

/** List recent transactions for a wallet */
export async function listTransactions(
  walletId: string,
  params?: { page?: number; limit?: number; type?: 'deposit' | 'withdrawal' }
): Promise<{ transactions: BlockradarTransaction[]; total: number }> {
  const qs = new URLSearchParams();
  if (params?.page) qs.set('page', String(params.page));
  if (params?.limit) qs.set('limit', String(params.limit ?? 20));
  if (params?.type) qs.set('type', params.type);

  const res = await fetch(`${BASE_URL}/wallets/${walletId}/transactions?${qs}`, {
    headers: headers(),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(`Blockradar listTransactions failed: ${err.message ?? res.status}`);
  }
  const data = await res.json();
  return {
    transactions: data.data ?? data.transactions ?? [],
    total: data.total ?? 0,
  };
}

/** Verify a Blockradar webhook signature */
export function verifyBlockradarSignature(
  rawBody: string,
  signatureHeader: string
): boolean {
  const secret = process.env.BLOCKRADAR_WEBHOOK_SECRET;
  if (!secret) return true; // Skip verification if not configured (dev mode)

  const crypto = require('crypto');
  const expected = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
  return expected === signatureHeader;
}
