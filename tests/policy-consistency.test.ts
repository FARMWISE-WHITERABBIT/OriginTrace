import { describe, it, expect } from 'vitest';
import { agentBottomNavItems, getNavigationConfig } from '../lib/config/navigation';
import { getRequiredTier, TIER_HIERARCHY, type TierFeature } from '../lib/config/tier-gating';

const APP_ROLES = [
  'admin',
  'aggregator',
  'agent',
  'quality_manager',
  'logistics_coordinator',
  'compliance_officer',
  'warehouse_supervisor',
] as const;

describe('policy consistency: navigation tier declarations', () => {
  it('agent bottom nav requiredTier matches feature minimum tier', () => {
    for (const item of agentBottomNavItems) {
      if (!item.tierFeature || !item.requiredTier) continue;
      expect(item.requiredTier).toBe(getRequiredTier(item.tierFeature));
    }
  });

  it('all app navigation items with tierFeature have matching requiredTier', () => {
    for (const role of APP_ROLES) {
      const nav = getNavigationConfig(role);
      for (const group of nav.groups) {
        for (const item of group.items) {
          if (!item.tierFeature) continue;
          const expectedTier = getRequiredTier(item.tierFeature as TierFeature);
          // if requiredTier is omitted, the feature mapping remains the source of truth
          if (item.requiredTier) {
            expect(TIER_HIERARCHY[item.requiredTier]).toBeGreaterThanOrEqual(TIER_HIERARCHY[expectedTier]);
          }
        }
      }
    }
  });
});
