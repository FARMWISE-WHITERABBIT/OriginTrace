/**
 * Platform subscription tier configuration.
 *
 * Pricing is defined here as the single source of truth.
 * To change pricing, update this file — revenue calculations
 * across the superadmin automatically reflect the change.
 *
 * Future: move to a DB-backed platform_settings table so
 * platform_admin can edit pricing from the superadmin UI
 * without a code deploy.
 */

export type TierKey = 'starter' | 'basic' | 'pro' | 'enterprise';

export const TIER_ORDER: TierKey[] = ['starter', 'basic', 'pro', 'enterprise'];

/** Monthly recurring revenue per tier in USD */
export const TIER_MRR_USD: Record<TierKey, number> = {
  starter:    0,
  basic:      99,
  pro:        299,
  enterprise: 899,
};

/** Tailwind badge colour classes per tier */
export const TIER_BADGE_STYLES: Record<TierKey, string> = {
  starter:    'bg-slate-700 text-slate-300 border-slate-600',
  basic:      'bg-blue-900/50 text-blue-300 border-blue-700',
  pro:        'bg-purple-900/50 text-purple-300 border-purple-700',
  enterprise: 'bg-amber-900/50 text-amber-300 border-amber-700',
};

export const TIER_LABELS: Record<TierKey, string> = {
  starter:    'Starter',
  basic:      'Basic',
  pro:        'Pro',
  enterprise: 'Enterprise',
};
