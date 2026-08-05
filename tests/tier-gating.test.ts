/**
 * Tier Gating Test Suite
 * Tests hasTierAccess, getTierFeatures, checkRouteAccess, checkApiAccess.
 * Pure functions — no mocking needed.
 *
 * These tests protect against billing regressions where a feature becomes
 * accessible below its intended tier, or where a tier upgrade stops working.
 */

import { describe, it, expect } from 'vitest';
import {
  hasTierAccess,
  getTierFeatures,
  getTierNewFeatures,
  checkRouteAccess,
  checkApiAccess,
  getRequiredTier,
  TIER_HIERARCHY,
  FEATURE_LABELS,
  type TierFeature,
  type SubscriptionTier,
} from '@/lib/config/tier-gating';

// ---------------------------------------------------------------------------
// Tier hierarchy sanity
// ---------------------------------------------------------------------------

describe('TIER_HIERARCHY', () => {
  it('starter < basic < pro < enterprise', () => {
    expect(TIER_HIERARCHY.starter).toBeLessThan(TIER_HIERARCHY.basic);
    expect(TIER_HIERARCHY.basic).toBeLessThan(TIER_HIERARCHY.pro);
    expect(TIER_HIERARCHY.pro).toBeLessThan(TIER_HIERARCHY.enterprise);
  });
});

// ---------------------------------------------------------------------------
// hasTierAccess — starter features
// Starter = complete core traceability
// ---------------------------------------------------------------------------

describe('hasTierAccess — starter features available to all tiers', () => {
  const starterFeatures: TierFeature[] = [
    'farmer_registration',
    'farm_mapping',
    'farm_polygons',
    'farmers_list',
    'smart_collect',
    'sync_dashboard',
    'bags',
    'traceability',
    'inventory',
    'scan_verify',
    'documents',
  ];

  const allTiers: SubscriptionTier[] = ['starter', 'basic', 'pro', 'enterprise'];

  starterFeatures.forEach(feature => {
    allTiers.forEach(tier => {
      it(`${tier} can access ${feature}`, () => {
        expect(hasTierAccess(tier, feature)).toBe(true);
      });
    });
  });
});

// ---------------------------------------------------------------------------
// hasTierAccess — basic features
// ---------------------------------------------------------------------------

describe('hasTierAccess — basic features', () => {
  const basicFeatures: TierFeature[] = [
    'yield_alerts',
    'agents',
    'dispatch',
    'analytics',
    'payments',
  ];

  it('starter cannot access basic features', () => {
    basicFeatures.forEach(feature => {
      expect(hasTierAccess('starter', feature)).toBe(false);
    });
  });

  const tiersThatHaveBasic: SubscriptionTier[] = ['basic', 'pro', 'enterprise'];
  basicFeatures.forEach(feature => {
    tiersThatHaveBasic.forEach(tier => {
      it(`${tier} can access ${feature}`, () => {
        expect(hasTierAccess(tier, feature)).toBe(true);
      });
    });
  });
});

// ---------------------------------------------------------------------------
// hasTierAccess — pro features (export & compliance)
// ---------------------------------------------------------------------------

describe('hasTierAccess — pro features', () => {
  const proFeatures: TierFeature[] = [
    'compliance_review',
    'boundary_conflicts',
    'dds_export',
    'processing',
    'pedigree',
    'delegations',
    'resolve',
    'shipment_readiness',
    'compliance_profiles',
    'buyer_portal',
    'contracts',
  ];

  it('starter cannot access pro features', () => {
    proFeatures.forEach(feature => {
      expect(hasTierAccess('starter', feature)).toBe(false);
    });
  });

  it('basic cannot access pro features', () => {
    proFeatures.forEach(feature => {
      expect(hasTierAccess('basic', feature)).toBe(false);
    });
  });

  const tiersThatHavePro: SubscriptionTier[] = ['pro', 'enterprise'];
  proFeatures.forEach(feature => {
    tiersThatHavePro.forEach(tier => {
      it(`${tier} can access ${feature}`, () => {
        expect(hasTierAccess(tier, feature)).toBe(true);
      });
    });
  });
});

// ---------------------------------------------------------------------------
// hasTierAccess — enterprise features
// ---------------------------------------------------------------------------

describe('hasTierAccess — enterprise features', () => {
  const enterpriseFeatures: TierFeature[] = [
    'data_vault',
    'digital_product_passport',
    'enterprise_api',
    'api_access',
  ];

  it('starter cannot access enterprise features', () => {
    enterpriseFeatures.forEach(feature => {
      expect(hasTierAccess('starter', feature)).toBe(false);
    });
  });

  it('basic cannot access enterprise features', () => {
    enterpriseFeatures.forEach(feature => {
      expect(hasTierAccess('basic', feature)).toBe(false);
    });
  });

  it('pro cannot access enterprise features', () => {
    enterpriseFeatures.forEach(feature => {
      expect(hasTierAccess('pro', feature)).toBe(false);
    });
  });

  enterpriseFeatures.forEach(feature => {
    it(`enterprise can access ${feature}`, () => {
      expect(hasTierAccess('enterprise', feature)).toBe(true);
    });
  });
});

// ---------------------------------------------------------------------------
// hasTierAccess — edge cases
// ---------------------------------------------------------------------------

describe('hasTierAccess — edge cases', () => {
  it('undefined tier defaults to starter behaviour', () => {
    // starter features should still be accessible
    expect(hasTierAccess(undefined, 'farmer_registration')).toBe(true);
    // pro features should be blocked
    expect(hasTierAccess(undefined, 'dds_export')).toBe(false);
  });

  it('unknown tier string defaults to starter (level 0)', () => {
    expect(hasTierAccess('unknown_tier', 'farmer_registration')).toBe(true);
    expect(hasTierAccess('unknown_tier', 'dds_export')).toBe(false);
  });

  it('dds_export — the most critical compliance feature — is pro+', () => {
    expect(hasTierAccess('starter', 'dds_export')).toBe(false);
    expect(hasTierAccess('basic', 'dds_export')).toBe(false);
    expect(hasTierAccess('pro', 'dds_export')).toBe(true);
    expect(hasTierAccess('enterprise', 'dds_export')).toBe(true);
  });

  it('digital_product_passport is enterprise-only', () => {
    expect(hasTierAccess('starter', 'digital_product_passport')).toBe(false);
    expect(hasTierAccess('basic', 'digital_product_passport')).toBe(false);
    expect(hasTierAccess('pro', 'digital_product_passport')).toBe(false);
    expect(hasTierAccess('enterprise', 'digital_product_passport')).toBe(true);
  });

  it('pedigree is pro+', () => {
    expect(hasTierAccess('starter', 'pedigree')).toBe(false);
    expect(hasTierAccess('basic', 'pedigree')).toBe(false);
    expect(hasTierAccess('pro', 'pedigree')).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// getTierFeatures — higher tiers include lower tier features
// ---------------------------------------------------------------------------

describe('getTierFeatures', () => {
  it('starter includes all starter features', () => {
    const features = getTierFeatures('starter');
    expect(features).toContain('farmer_registration');
    expect(features).toContain('farm_mapping');
    expect(features).toContain('traceability');
  });

  it('starter does not include basic+ features', () => {
    const features = getTierFeatures('starter');
    expect(features).not.toContain('yield_alerts');
    expect(features).not.toContain('dds_export');
    expect(features).not.toContain('digital_product_passport');
  });

  it('pro includes all starter and basic features', () => {
    const features = getTierFeatures('pro');
    // starter features
    expect(features).toContain('farmer_registration');
    expect(features).toContain('traceability');
    // basic features
    expect(features).toContain('yield_alerts');
    expect(features).toContain('agents');
    // pro features
    expect(features).toContain('dds_export');
    expect(features).toContain('pedigree');
  });

  it('pro does not include enterprise features', () => {
    const features = getTierFeatures('pro');
    expect(features).not.toContain('digital_product_passport');
    expect(features).not.toContain('data_vault');
    expect(features).not.toContain('enterprise_api');
  });

  it('enterprise includes every feature', () => {
    const features = getTierFeatures('enterprise');
    const allFeatures: TierFeature[] = Object.keys(FEATURE_LABELS) as TierFeature[];
    allFeatures.forEach(feature => {
      expect(features).toContain(feature);
    });
  });

  it('higher tiers always have more features than lower tiers', () => {
    const tiers: SubscriptionTier[] = ['starter', 'basic', 'pro', 'enterprise'];
    for (let i = 0; i < tiers.length - 1; i++) {
      const lower = getTierFeatures(tiers[i]);
      const higher = getTierFeatures(tiers[i + 1]);
      expect(higher.length).toBeGreaterThan(lower.length);
    }
  });
});

// ---------------------------------------------------------------------------
// getTierNewFeatures — each tier introduces distinct features
// ---------------------------------------------------------------------------

describe('getTierNewFeatures', () => {
  it('basic introduces yield_alerts and agents', () => {
    const basicNew = getTierNewFeatures('basic');
    expect(basicNew).toContain('yield_alerts');
    expect(basicNew).toContain('agents');
  });

  it('pro introduces dds_export and pedigree', () => {
    const proNew = getTierNewFeatures('pro');
    expect(proNew).toContain('dds_export');
    expect(proNew).toContain('pedigree');
    expect(proNew).toContain('shipment_readiness');
  });

  it('enterprise introduces digital_product_passport and data_vault', () => {
    const enterpriseNew = getTierNewFeatures('enterprise');
    expect(enterpriseNew).toContain('digital_product_passport');
    expect(enterpriseNew).toContain('data_vault');
    expect(enterpriseNew).toContain('enterprise_api');
  });

  it('no feature appears in two different tiers new features', () => {
    const tiers: SubscriptionTier[] = ['starter', 'basic', 'pro', 'enterprise'];
    const seen = new Set<string>();
    for (const tier of tiers) {
      const newFeatures = getTierNewFeatures(tier);
      for (const feature of newFeatures) {
        expect(seen.has(feature), `${feature} appears in multiple tiers' new features`).toBe(false);
        seen.add(feature);
      }
    }
  });
});

// ---------------------------------------------------------------------------
// getRequiredTier
// ---------------------------------------------------------------------------

describe('getRequiredTier', () => {
  it('returns starter for farmer_registration', () => {
    expect(getRequiredTier('farmer_registration')).toBe('starter');
  });

  it('returns basic for yield_alerts', () => {
    expect(getRequiredTier('yield_alerts')).toBe('basic');
  });

  it('returns pro for dds_export', () => {
    expect(getRequiredTier('dds_export')).toBe('pro');
  });

  it('returns enterprise for digital_product_passport', () => {
    expect(getRequiredTier('digital_product_passport')).toBe('enterprise');
  });
});

// ---------------------------------------------------------------------------
// checkRouteAccess — frontend route tier checks
// ---------------------------------------------------------------------------

describe('checkRouteAccess', () => {
  it('allows starter org on /app/collect (starter feature)', () => {
    const result = checkRouteAccess('starter', '/app/collect');
    expect(result.allowed).toBe(true);
  });

  it('blocks starter org on /app/dds (pro feature)', () => {
    const result = checkRouteAccess('starter', '/app/dds');
    expect(result.allowed).toBe(false);
    expect(result.requiredTier).toBe('pro');
  });

  it('blocks basic org on /app/pedigree (pro feature)', () => {
    const result = checkRouteAccess('basic', '/app/pedigree');
    expect(result.allowed).toBe(false);
    expect(result.requiredTier).toBe('pro');
  });

  it('allows pro org on /app/dds', () => {
    const result = checkRouteAccess('pro', '/app/dds');
    expect(result.allowed).toBe(true);
  });

  it('allows enterprise org on /app/dpp (enterprise feature)', () => {
    const result = checkRouteAccess('enterprise', '/app/dpp');
    expect(result.allowed).toBe(true);
  });

  it('blocks pro org on /app/data-vault (enterprise feature)', () => {
    const result = checkRouteAccess('pro', '/app/data-vault');
    expect(result.allowed).toBe(false);
    expect(result.requiredTier).toBe('enterprise');
  });

  it('allows any tier on unmapped route', () => {
    expect(checkRouteAccess('starter', '/app/some/new/page').allowed).toBe(true);
    expect(checkRouteAccess('starter', '/app/profile').allowed).toBe(true);
  });

  it('sub-routes of gated routes inherit tier requirement', () => {
    const result = checkRouteAccess('starter', '/app/dds/export/pdf');
    expect(result.allowed).toBe(false);
    expect(result.requiredTier).toBe('pro');
  });
});

// ---------------------------------------------------------------------------
// checkApiAccess — API route tier checks
// ---------------------------------------------------------------------------

describe('checkApiAccess', () => {
  it('blocks starter from /api/shipments (pro feature)', () => {
    const result = checkApiAccess('starter', '/api/shipments');
    expect(result.allowed).toBe(false);
    expect(result.requiredTier).toBe('pro');
  });

  it('allows pro on /api/pedigree', () => {
    const result = checkApiAccess('pro', '/api/pedigree');
    expect(result.allowed).toBe(true);
  });

  it('blocks pro from /api/v1 (enterprise API)', () => {
    const result = checkApiAccess('pro', '/api/v1');
    expect(result.allowed).toBe(false);
    expect(result.requiredTier).toBe('enterprise');
  });

  it('allows enterprise on /api/v1', () => {
    const result = checkApiAccess('enterprise', '/api/v1');
    expect(result.allowed).toBe(true);
  });

  it('allows starter on /api/batches (starter feature)', () => {
    const result = checkApiAccess('starter', '/api/batches');
    expect(result.allowed).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// FEATURE_LABELS completeness — catches missing label if new feature is added
// ---------------------------------------------------------------------------

describe('FEATURE_LABELS completeness', () => {
  it('every TierFeature has a label', () => {
    const features = Object.keys(FEATURE_LABELS) as TierFeature[];
    features.forEach(feature => {
      expect(FEATURE_LABELS[feature]).toBeTruthy();
      expect(typeof FEATURE_LABELS[feature]).toBe('string');
    });
    // Sanity: we have a reasonable number of features
    expect(features.length).toBeGreaterThan(25);
  });
});
