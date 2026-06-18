import { describe, it, expect } from 'vitest';
import { validateBatchYield } from '../lib/services/yield-validation';

describe('Yield Validation Service', () => {
  it('passes if no area or standard is provided', () => {
    expect(validateBatchYield(100, null, 500).valid).toBe(true);
    expect(validateBatchYield(100, 2.5, null).valid).toBe(true);
  });

  it('calculates threshold correctly (area * yield * 1.2)', () => {
    // 2 ha * 500kg/ha * 1.2 = 1200kg threshold
    const result = validateBatchYield(1000, 2, 500);
    expect(result.valid).toBe(true);
    expect(result.threshold).toBe(1200);
  });

  it('flags if weight exceeds 120% of expected yield', () => {
    // 1 ha * 1000kg/ha * 1.2 = 1200kg
    const result = validateBatchYield(1300, 1, 1000, 'Cocoa');
    expect(result.valid).toBe(false);
    expect(result.reason).toContain('exceeds 120%');
    expect(result.reason).toContain('1200kg');
  });

  it('not flags if weight is exactly at the 120% threshold', () => {
    const result = validateBatchYield(1200, 1, 1000);
    expect(result.valid).toBe(true);
  });
});
