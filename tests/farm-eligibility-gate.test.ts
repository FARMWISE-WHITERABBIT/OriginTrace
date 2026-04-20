import { describe, it, expect } from 'vitest';
import { checkFarmEligibility } from '../lib/services/farm-eligibility';
import { normalizeMarketCodes } from '../lib/services/market-normalization';

describe('farm compliance gate', () => {
  const baseFarm = {
    id: 'farm-1',
    compliance_status: 'approved' as const,
    boundary_geo: { type: 'Polygon' },
    deforestation_check: { risk_level: 'low' as const },
    consent_timestamp: new Date().toISOString(),
  };

  it('normalizes mixed-case and alias market values', () => {
    const result = normalizeMarketCodes(['eu', 'Uk', 'uk environment act', 'usa', 'cn']);
    expect(result).toEqual(['EU', 'UK', 'UK_Environment_Act', 'US', 'CHINA']);
  });

  it('blocks EUDR-bound flow when GPS boundary is missing', () => {
    const eligibility = checkFarmEligibility(
      { ...baseFarm, boundary_geo: null },
      normalizeMarketCodes(['eudr'])
    );

    expect(eligibility.eligible).toBe(false);
    expect(eligibility.status).toBe('blocked');
    expect(eligibility.blockers.join(' ')).toContain('GPS boundary polygon');
    expect(eligibility.blocker_codes).toContain('MISSING_GPS_BOUNDARY');
  });

  it('allows non-EUDR market when only GPS boundary is missing', () => {
    const eligibility = checkFarmEligibility(
      { ...baseFarm, boundary_geo: null },
      normalizeMarketCodes(['UAE'])
    );

    expect(eligibility.eligible).toBe(true);
    expect(eligibility.status).toBe('eligible');
  });

  it('prevents non-admin override from bypassing blockers', () => {
    const eligibility = checkFarmEligibility(
      { ...baseFarm, compliance_status: 'rejected' },
      normalizeMarketCodes(['EU']),
      { reason: 'urgent dispatch', actorRole: 'aggregator' }
    );

    expect(eligibility.eligible).toBe(false);
    expect(eligibility.blockers.join(' ')).toContain('Only an admin can override');
    expect(eligibility.blocker_codes).toContain('OVERRIDE_NON_ADMIN');
  });

  it('requires admin override reason to be meaningful', () => {
    const eligibility = checkFarmEligibility(
      { ...baseFarm, compliance_status: 'rejected' },
      normalizeMarketCodes(['EU']),
      { reason: 'urgent', actorRole: 'admin' }
    );

    expect(eligibility.eligible).toBe(false);
    expect(eligibility.blockers.join(' ')).toContain('at least 10 characters');
    expect(eligibility.blocker_codes).toContain('OVERRIDE_REASON_TOO_SHORT');
  });
});
