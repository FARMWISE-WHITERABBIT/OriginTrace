/**
 * Canonical Tier Policy — Unit Tests
 *
 * Covers all ADR-002 semantics:
 *   1. null / undefined tier  → fail-open  (true)
 *   2. empty string tier      → fail-open  (true)
 *   3. unknown tier string    → treat as 'starter'
 *   4. valid tier             → hierarchy comparison
 *   5. canAccessOrg(null)     → false (fail-closed)
 *   6. canAccessOrg(orgRow)   → true
 *   7. checkOrgTierAccess     → combined check
 *
 * Pure functions — no mocking needed.
 */

import { describe, it, expect } from 'vitest';
import {
  hasTierAccess,
  canAccessOrg,
  checkOrgTierAccess,
  getRequiredTier,
  TIER_HIERARCHY,
  type SubscriptionTier,
  type TierFeature,
  type OrgRow,
} from '@/modules/identity-access/domain/tier-policy';

// ---------------------------------------------------------------------------
// hasTierAccess — null / undefined / empty → fail-open
// ---------------------------------------------------------------------------

describe('hasTierAccess — null/undefined/empty → fail-open', () => {
  const ENTERPRISE_FEATURE: TierFeature = 'enterprise_api';

  it('returns true for null tier (new org, not yet billed)', () => {
    expect(hasTierAccess(null, ENTERPRISE_FEATURE)).toBe(true);
  });

  it('returns true for undefined tier (query error / missing join)', () => {
    expect(hasTierAccess(undefined, ENTERPRISE_FEATURE)).toBe(true);
  });

  it('returns true for empty string tier', () => {
    expect(hasTierAccess('', ENTERPRISE_FEATURE)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// hasTierAccess — unknown string → treat as 'starter'
// ---------------------------------------------------------------------------

describe('hasTierAccess — unknown tier string → treat as starter', () => {
  it('unknown tier grants access to starter features', () => {
    expect(hasTierAccess('future_tier', 'inventory')).toBe(true);      // starter feature
    expect(hasTierAccess('unknown_xyz', 'smart_collect')).toBe(true);  // starter feature
  });

  it('unknown tier blocks basic and above features', () => {
    expect(hasTierAccess('future_tier', 'yield_alerts')).toBe(false);  // basic feature
    expect(hasTierAccess('unknown_xyz', 'dds_export')).toBe(false);    // pro feature
    expect(hasTierAccess('future_tier', 'enterprise_api')).toBe(false); // enterprise feature
  });
});

// ---------------------------------------------------------------------------
// hasTierAccess — valid tier → hierarchy comparison
// ---------------------------------------------------------------------------

describe('hasTierAccess — valid tier hierarchy', () => {
  it('starter can access starter features', () => {
    expect(hasTierAccess('starter', 'inventory')).toBe(true);
    expect(hasTierAccess('starter', 'smart_collect')).toBe(true);
    expect(hasTierAccess('starter', 'traceability')).toBe(true);
  });

  it('starter cannot access basic+ features', () => {
    expect(hasTierAccess('starter', 'yield_alerts')).toBe(false);
    expect(hasTierAccess('starter', 'payments')).toBe(false);
    expect(hasTierAccess('starter', 'dds_export')).toBe(false);
    expect(hasTierAccess('starter', 'enterprise_api')).toBe(false);
  });

  it('basic can access starter and basic features', () => {
    expect(hasTierAccess('basic', 'inventory')).toBe(true);
    expect(hasTierAccess('basic', 'yield_alerts')).toBe(true);
    expect(hasTierAccess('basic', 'payments')).toBe(true);
  });

  it('basic cannot access pro+ features', () => {
    expect(hasTierAccess('basic', 'dds_export')).toBe(false);
    expect(hasTierAccess('basic', 'compliance_review')).toBe(false);
    expect(hasTierAccess('basic', 'enterprise_api')).toBe(false);
  });

  it('pro can access starter, basic, pro features', () => {
    expect(hasTierAccess('pro', 'inventory')).toBe(true);
    expect(hasTierAccess('pro', 'yield_alerts')).toBe(true);
    expect(hasTierAccess('pro', 'dds_export')).toBe(true);
    expect(hasTierAccess('pro', 'shipment_readiness')).toBe(true);
  });

  it('pro cannot access enterprise features', () => {
    expect(hasTierAccess('pro', 'enterprise_api')).toBe(false);
    expect(hasTierAccess('pro', 'digital_product_passport')).toBe(false);
  });

  it('enterprise can access all features', () => {
    const features: TierFeature[] = [
      'smart_collect', 'inventory', 'yield_alerts', 'payments',
      'dds_export', 'compliance_review', 'enterprise_api', 'digital_product_passport',
    ];
    for (const f of features) {
      expect(hasTierAccess('enterprise', f)).toBe(true);
    }
  });
});

// ---------------------------------------------------------------------------
// hasTierAccess — tier hierarchy is strictly ordered
// ---------------------------------------------------------------------------

describe('TIER_HIERARCHY ordering', () => {
  it('starter < basic < pro < enterprise', () => {
    expect(TIER_HIERARCHY.starter).toBeLessThan(TIER_HIERARCHY.basic);
    expect(TIER_HIERARCHY.basic).toBeLessThan(TIER_HIERARCHY.pro);
    expect(TIER_HIERARCHY.pro).toBeLessThan(TIER_HIERARCHY.enterprise);
  });
});

// ---------------------------------------------------------------------------
// canAccessOrg — ADR-002 §Org not found → fail-closed
// ---------------------------------------------------------------------------

describe('canAccessOrg', () => {
  it('returns false for null org row (org not found)', () => {
    expect(canAccessOrg(null)).toBe(false);
  });

  it('returns true for a found org row', () => {
    const row: OrgRow = { id: 'org-123', subscription_tier: 'basic' };
    expect(canAccessOrg(row)).toBe(true);
  });

  it('returns true even for org with null tier (existence check only)', () => {
    const row: OrgRow = { id: 'org-456', subscription_tier: null };
    expect(canAccessOrg(row)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// checkOrgTierAccess — combined existence + tier check
// ---------------------------------------------------------------------------

describe('checkOrgTierAccess', () => {
  it('org not found → denied with reason org_not_found', () => {
    const result = checkOrgTierAccess(null, 'yield_alerts');
    expect(result.granted).toBe(false);
    expect(result.reason).toBe('org_not_found');
  });

  it('org found, null tier → granted (fail-open)', () => {
    const row: OrgRow = { id: '1', subscription_tier: null };
    const result = checkOrgTierAccess(row, 'enterprise_api');
    expect(result.granted).toBe(true);
  });

  it('org found, starter tier, pro feature → denied with required tier', () => {
    const row: OrgRow = { id: '1', subscription_tier: 'starter' };
    const result = checkOrgTierAccess(row, 'dds_export');
    expect(result.granted).toBe(false);
    expect(result.reason).toBe('tier_insufficient');
    expect(result.requiredTier).toBe('pro');
  });

  it('org found, pro tier, pro feature → granted', () => {
    const row: OrgRow = { id: '1', subscription_tier: 'pro' };
    const result = checkOrgTierAccess(row, 'dds_export');
    expect(result.granted).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// getRequiredTier
// ---------------------------------------------------------------------------

describe('getRequiredTier', () => {
  it('returns correct minimum tier for each level', () => {
    expect(getRequiredTier('smart_collect')).toBe('starter');
    expect(getRequiredTier('yield_alerts')).toBe('basic');
    expect(getRequiredTier('dds_export')).toBe('pro');
    expect(getRequiredTier('enterprise_api')).toBe('enterprise');
  });
});
