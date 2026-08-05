'use client';

import { useOrg } from '@/lib/contexts/org-context';

export type SupportedCurrency = 'NGN' | 'USD' | 'EUR' | 'GBP' | 'GHS' | 'XOF';

const CURRENCY_SYMBOLS: Record<SupportedCurrency, string> = {
  NGN: '₦',
  USD: '$',
  EUR: '€',
  GBP: '£',
  GHS: 'GH₵',
  XOF: 'CFA ',
};

const CURRENCY_LABELS: Record<SupportedCurrency, string> = {
  NGN: 'Nigerian Naira (₦)',
  USD: 'US Dollar ($)',
  EUR: 'Euro (€)',
  GBP: 'British Pound (£)',
  GHS: 'Ghanaian Cedi (GH₵)',
  XOF: 'CFA Franc (XOF)',
};

export const SUPPORTED_CURRENCIES = Object.keys(CURRENCY_SYMBOLS) as SupportedCurrency[];
export { CURRENCY_LABELS };

export function useCurrency() {
  const { organization } = useOrg();

  // Read from org settings, fall back to NGN
  const settings = (organization?.settings || {}) as Record<string, unknown>;
  const raw = (settings.preferred_currency as string) || 'NGN';
  const currency: SupportedCurrency = (CURRENCY_SYMBOLS[raw as SupportedCurrency] ? raw : 'NGN') as SupportedCurrency;
  const symbol = CURRENCY_SYMBOLS[currency];

  function format(amount: number | null | undefined, opts?: { compact?: boolean }): string {
    if (amount == null) return `${symbol}—`;
    if (opts?.compact) {
      if (Math.abs(amount) >= 1_000_000) return `${symbol}${(amount / 1_000_000).toFixed(1)}M`;
      if (Math.abs(amount) >= 1_000) return `${symbol}${(amount / 1_000).toFixed(1)}K`;
    }
    return `${symbol}${Number(amount).toLocaleString('en-NG', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  }

  return { currency, symbol, format };
}
