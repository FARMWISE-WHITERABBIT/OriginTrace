/**
 * modules/identity-access/domain/tier-policy.ts
 *
 * Canonical tier-access policy engine — the single source of truth
 * for all subscription tier comparisons in OriginTrace.
 *
 * Semantics (ADR-002):
 *   hasTierAccess(null | undefined, feature) → true   (fail-open: ops error, not user error)
 *   hasTierAccess('<unknown string>', feature) → hasTierAccess('starter', feature)
 *   hasTierAccess('<valid tier>', feature)    → hierarchy comparison
 *
 *   canAccessOrg(null)    → false  (fail-closed: org not found = genuine auth error)
 *   canAccessOrg(orgRow)  → true   (org exists, proceed to tier check)
 *
 * This file is pure TypeScript — zero external dependencies (ADR-001 domain rules).
 * All tier level maps and comparison logic live here. No other file may define them.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type SubscriptionTier = 'starter' | 'basic' | 'pro' | 'enterprise';

export type TierFeature =
  | 'smart_collect'
  | 'farmer_registration'
  | 'farm_mapping'
  | 'sync_dashboard'
  | 'scan_verify'
  | 'inventory'
  | 'bags'
  | 'traceability'
  | 'yield_alerts'
  | 'dispatch'
  | 'agents'
  | 'farmers_list'
  | 'compliance_review'
  | 'farm_polygons'
  | 'boundary_conflicts'
  | 'dds_export'
  | 'data_vault'
  | 'processing'
  | 'pedigree'
  | 'delegations'
  | 'resolve'
  | 'shipment_readiness'
  | 'analytics'
  | 'documents'
  | 'payments'
  | 'compliance_profiles'
  | 'buyer_portal'
  | 'contracts'
  | 'spot_market'
  | 'enterprise_api'
  | 'digital_product_passport'
  | 'api_access';

/** Minimal org row shape needed for the existence check. */
export interface OrgRow {
  id?: string | number;
  subscription_tier?: string | null;
}

// ---------------------------------------------------------------------------
// Tier hierarchy — the only place this map is defined
// ---------------------------------------------------------------------------

export const TIER_HIERARCHY: Record<SubscriptionTier, number> = {
  starter:    0,
  basic:      1,
  pro:        2,
  enterprise: 3,
};

const KNOWN_TIERS = new Set<string>(Object.keys(TIER_HIERARCHY));

function resolvedTier(raw: string): SubscriptionTier {
  return KNOWN_TIERS.has(raw) ? (raw as SubscriptionTier) : 'starter';
}

// ---------------------------------------------------------------------------
// Feature → minimum tier map
// ---------------------------------------------------------------------------

const FEATURE_MIN_TIER: Record<TierFeature, SubscriptionTier> = {
  // Starter features — available to all paying tiers
  smart_collect:       'starter',
  farmer_registration: 'starter',
  farm_mapping:        'starter',
  sync_dashboard:      'starter',
  scan_verify:         'starter',
  inventory:           'starter',
  bags:                'starter',
  traceability:        'starter',
  // Basic features
  yield_alerts:        'basic',
  dispatch:            'basic',
  agents:              'basic',
  farmers_list:        'basic',
  analytics:           'basic',
  documents:           'basic',
  payments:            'basic',
  // Pro features
  compliance_review:   'pro',
  farm_polygons:       'pro',
  boundary_conflicts:  'pro',
  dds_export:          'pro',
  processing:          'pro',
  pedigree:            'pro',
  delegations:         'pro',
  resolve:             'pro',
  shipment_readiness:  'pro',
  compliance_profiles: 'pro',
  buyer_portal:        'pro',
  contracts:           'pro',
  spot_market:         'pro',
  // Enterprise features
  data_vault:              'enterprise',
  enterprise_api:          'enterprise',
  digital_product_passport:'enterprise',
  api_access:              'enterprise',
};

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Determine whether an org with the given tier string has access to a feature.
 *
 * @param orgTier - The `subscription_tier` value from the organizations table.
 *   null | undefined → fail-open (full access): org is new / migration gap.
 *   unknown string   → treated as 'starter' (safe-conservative).
 *   valid tier       → standard hierarchy comparison.
 *
 * @param feature - The feature to check.
 */
export function hasTierAccess(
  orgTier: string | null | undefined,
  feature: TierFeature,
): boolean {
  // null / undefined → fail-open (ADR-002 §Null / undefined tier)
  if (orgTier == null || orgTier === '') return true;

  const tier = resolvedTier(orgTier);
  const currentLevel  = TIER_HIERARCHY[tier];
  const requiredLevel = TIER_HIERARCHY[FEATURE_MIN_TIER[feature]];
  return currentLevel >= requiredLevel;
}

/**
 * Determine whether an org row grants access at all.
 * A null row means the org was not found — this is a genuine auth error.
 *
 * @param orgRow - The org row from the database, or null if not found.
 * @returns false when org is null (fail-closed); true otherwise.
 */
export function canAccessOrg(orgRow: OrgRow | null): boolean {
  return orgRow !== null;
}

/**
 * Convenience: combine existence check + tier check in one call.
 * Returns the tier string if access is granted, null if denied.
 *
 * Use enforceTier() in API route handlers (infra layer) which wraps this
 * in a NextResponse. This function stays pure.
 */
export function checkOrgTierAccess(
  orgRow: OrgRow | null,
  feature: TierFeature,
): { granted: boolean; reason?: 'org_not_found' | 'tier_insufficient'; requiredTier?: SubscriptionTier } {
  if (!canAccessOrg(orgRow)) {
    return { granted: false, reason: 'org_not_found' };
  }
  const tier = orgRow!.subscription_tier ?? null;
  if (!hasTierAccess(tier, feature)) {
    return { granted: false, reason: 'tier_insufficient', requiredTier: FEATURE_MIN_TIER[feature] };
  }
  return { granted: true };
}

/**
 * Return the minimum tier required for a given feature.
 */
export function getRequiredTier(feature: TierFeature): SubscriptionTier {
  return FEATURE_MIN_TIER[feature];
}
