/**
 * Unit tests for lib/services/whisp-deforestation.ts's pure normalization
 * logic — the part of the WHISP integration that doesn't need network
 * mocking. The critical safety property under test: an unparseable or
 * commodity-ambiguous result must never silently resolve to "low risk" —
 * it either picks the worst finding across all risk columns, or returns
 * null so the caller falls back to GFW rather than trusting a guess.
 */

import { describe, it, expect } from 'vitest';
import { normalizeWhispResult } from '../lib/services/whisp-deforestation';

describe('normalizeWhispResult', () => {
  it('maps a known commodity to its risk column and "Low risk" to risk_level low', () => {
    const result = normalizeWhispResult({ Risk_PCrop: 'Low risk', Risk_ACrop: 'High risk' }, 'cocoa');
    expect(result?.risk_level).toBe('low');
    expect(result?.whisp_risk_category).toBe('low_risk');
    expect(result?.deforestation_free).toBe(true);
  });

  it('maps "High risk" on the commodity-appropriate column to risk_level high', () => {
    const result = normalizeWhispResult({ Risk_PCrop: 'High risk', Risk_ACrop: 'Low risk' }, 'coffee');
    expect(result?.risk_level).toBe('high');
    expect(result?.deforestation_free).toBe(false);
  });

  it('maps soy to Risk_ACrop, not the perennial-crop column', () => {
    const result = normalizeWhispResult({ Risk_PCrop: 'High risk', Risk_ACrop: 'Low risk' }, 'soy');
    expect(result?.risk_level).toBe('low');
  });

  it('maps timber to Risk_Timber', () => {
    const result = normalizeWhispResult({ Risk_Timber: 'High risk', Risk_PCrop: 'Low risk' }, 'timber');
    expect(result?.risk_level).toBe('high');
  });

  it('maps "More info needed" to medium risk with manual_review_required', () => {
    const result = normalizeWhispResult({ Risk_PCrop: 'More info needed' }, 'cocoa');
    expect(result?.risk_level).toBe('medium');
    expect(result?.manual_review_required).toBe(true);
    expect(result?.verification_status).toBe('manual_review_required');
  });

  it('is case-insensitive on the risk value text', () => {
    const result = normalizeWhispResult({ Risk_PCrop: 'HIGH RISK' }, 'cocoa');
    expect(result?.risk_level).toBe('high');
  });

  it('takes the worst finding across all risk columns when the commodity is unknown', () => {
    const result = normalizeWhispResult(
      { Risk_PCrop: 'Low risk', Risk_ACrop: 'High risk', Risk_Timber: 'Low risk' },
      undefined,
    );
    // Must not silently pick the lenient Risk_PCrop/Risk_Timber columns.
    expect(result?.risk_level).toBe('high');
  });

  it('unknown commodity with only "More info needed" and "Low risk" present resolves to medium, not low', () => {
    const result = normalizeWhispResult(
      { Risk_PCrop: 'Low risk', Risk_ACrop: 'More info needed' },
      undefined,
    );
    expect(result?.risk_level).toBe('medium');
  });

  it('returns null when no recognizable risk column is present (unparseable — caller falls back to GFW)', () => {
    const result = normalizeWhispResult({ some_other_field: 'unrelated' }, 'cocoa');
    expect(result).toBeNull();
  });

  it('returns null when the risk column value is not a recognizable string', () => {
    const result = normalizeWhispResult({ Risk_PCrop: 42 }, 'cocoa');
    expect(result).toBeNull();
  });

  it('an unrecognized commodity string checks all three columns rather than defaulting to one', () => {
    const result = normalizeWhispResult({ Risk_Timber: 'High risk' }, 'durian');
    expect(result?.risk_level).toBe('high');
  });
});
