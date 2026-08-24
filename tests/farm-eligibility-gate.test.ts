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

  // ── Deforestation risk (WHISP/GFW integration regression coverage) ───────
  // These prove the fix: Rule 3 used to check risk_level === 'failed', a
  // value neither the WHISP nor GFW integration has ever produced, so HIGH
  // risk only ever warned, never blocked. See lib/services/farm-eligibility.ts.

  it('blocks an EU/UK-bound batch when deforestation risk is HIGH', () => {
    const eligibility = checkFarmEligibility(
      { ...baseFarm, deforestation_check: { risk_level: 'high', data_source: 'Whisp (FAO/OpenForis) — EUDR plot analysis' } },
      normalizeMarketCodes(['EU'])
    );

    expect(eligibility.eligible).toBe(false);
    expect(eligibility.status).toBe('blocked');
    expect(eligibility.blockers.join(' ')).toContain('HIGH deforestation risk');
    expect(eligibility.blocker_codes).toContain('HIGH_DEFORESTATION_RISK');
  });

  it('does not block a non-EU/UK market on HIGH deforestation risk', () => {
    const eligibility = checkFarmEligibility(
      { ...baseFarm, deforestation_check: { risk_level: 'high' } },
      normalizeMarketCodes(['UAE'])
    );

    expect(eligibility.eligible).toBe(true);
  });

  it('lets an admin override a HIGH-risk block with a documented reason', () => {
    const eligibility = checkFarmEligibility(
      { ...baseFarm, deforestation_check: { risk_level: 'high' } },
      normalizeMarketCodes(['EU']),
      { reason: 'Reviewed satellite imagery manually — loss predates 2020 cutoff.', actorRole: 'admin' }
    );

    expect(eligibility.eligible).toBe(true);
    expect(eligibility.status).toBe('conditional');
    expect(eligibility.warning_codes).toContain('ADMIN_OVERRIDE_APPLIED');
  });

  it('warns but does not block on MEDIUM deforestation risk', () => {
    const eligibility = checkFarmEligibility(
      { ...baseFarm, deforestation_check: { risk_level: 'medium' } },
      normalizeMarketCodes(['EU'])
    );

    expect(eligibility.eligible).toBe(true);
    expect(eligibility.status).toBe('conditional');
    expect(eligibility.warning_codes).toContain('MEDIUM_DEFORESTATION_RISK');
  });

  it('a legacy/malformed "failed" risk_level value is not treated as a block', () => {
    // Simulates a stray pre-fix DB row — risk_level is typed 'low'|'medium'|'high'
    // now, but nothing guarantees an old row in the database matches that at
    // runtime. Rule 3 must not accidentally match it either way; it should
    // simply fall through ineligible-for-nothing, same as risk_level: null.
    const legacyFarm = {
      ...baseFarm,
      deforestation_check: { risk_level: 'failed' as unknown as 'high' },
    };
    const eligibility = checkFarmEligibility(legacyFarm, normalizeMarketCodes(['EU']));

    expect(eligibility.blocker_codes).not.toContain('HIGH_DEFORESTATION_RISK');
    expect(eligibility.eligible).toBe(true);
  });
});
