/**
 * Shared types for the organizations table and its settings JSONB column.
 *
 * Before this file, every access to org.settings was cast to
 * `Record<string, any>`, scattering type-unsafe reads across lib/ and
 * app/api/. This file provides a typed interface derived from every
 * settings field actually used in the codebase.
 *
 * Usage:
 *   import type { OrganizationSettings } from '@/lib/types/organization';
 *
 *   const settings = (org.settings as OrganizationSettings) ?? {};
 *   const tier = settings.subscription_tier ?? 'starter';
 */

import type { SubscriptionTier } from '@/lib/config/tier-gating';

// ---------------------------------------------------------------------------
// OrganizationSettings
// Typed representation of the organizations.settings JSONB column.
// All fields are optional — the column may be null or partially populated.
// ---------------------------------------------------------------------------
export interface OrganizationSettings {
  /**
   * Subscription tier stored in JSONB settings.
   * NOTE: the canonical source of truth is the organizations.subscription_tier
   * column. This field mirrors it for historical reasons; prefer reading from
   * the column directly where possible.
   */
  subscription_tier?: SubscriptionTier;

  /**
   * Per-org feature flag overrides.
   * Keys are feature names (matching TierFeature), values are booleans.
   * A `true` value grants access regardless of subscription tier.
   */
  feature_flags?: Record<string, boolean>;

  /**
   * Maximum number of field agent accounts this org can have.
   * Defaults to 5 on starter, higher on paid tiers.
   */
  agent_seat_limit?: number;

  /**
   * Maximum number of batch collections per month.
   * Defaults to 500 on starter, higher on paid tiers.
   */
  monthly_collection_limit?: number;

  /**
   * Farm registration validation: require a GPS polygon boundary.
   * When true, farm creation rejects requests without a valid boundary.
   */
  require_polygon?: boolean;

  /**
   * Farm registration validation: require a national ID document.
   * When true, farm creation rejects requests without farmer_id.
   */
  require_national_id?: boolean;

  /**
   * Farm registration validation: require a land deed document URL.
   * When true, farm creation rejects requests without legality_doc_url.
   */
  require_land_deed?: boolean;

  /**
   * Allow additional arbitrary keys that may be set by future features.
   * Using `unknown` rather than `any` — callers must narrow before use.
   */
  [key: string]: unknown;
}

// ---------------------------------------------------------------------------
// Helper: safely read OrganizationSettings from a raw DB row.
// Replaces scattered `(org.settings as Record<string, any>) || {}` casts.
//
// Usage:
//   const settings = getOrgSettings(org);
//   const tier = settings.subscription_tier ?? 'starter';
// ---------------------------------------------------------------------------
export function getOrgSettings(org: { settings?: unknown } | null | undefined): OrganizationSettings {
  if (!org || !org.settings || typeof org.settings !== 'object') return {};
  return org.settings as OrganizationSettings;
}

// ---------------------------------------------------------------------------
// Organization — minimal typed shape for rows from the organizations table.
// Extend as needed; this covers the fields used across lib/ and app/api/.
// ---------------------------------------------------------------------------
export interface Organization {
  id: string | number;
  name?: string;
  subscription_tier?: SubscriptionTier;
  settings?: OrganizationSettings;
  created_at?: string;
  updated_at?: string;
}
