import { describe, it, expect } from 'vitest';
import { validateMassBalance } from '../lib/services/mass-balance';

describe('Mass Balance Service', () => {
  it('calculates recovery rate and variance correctly', () => {
    // Input 1000kg, Output 400kg → recovery 40%
    // Standard 45%, Tolerance 5% → Variance 5% → VALID
    const result = validateMassBalance(1000, 400, 45, 5);
    expect(result.valid).toBe(true);
    expect(result.recovery_rate).toBe(40);
    expect(result.variance).toBe(5);
  });

  it('flags if variance exceeds tolerance', () => {
    // Input 1000, Output 300 → recovery 30%
    // Standard 41.6, Tolerance 5 → Variance 11.6 → INVALID
    const result = validateMassBalance(1000, 300, 41.6, 5);
    expect(result.valid).toBe(false);
    expect(result.variance).toBeCloseTo(11.6);
    expect(result.reason).toContain('deviates');
  });

  it('handles default values (41.6% rate, 5% tolerance)', () => {
    // 1000 input, 380 output → 38% recovery
    // 41.6 - 38 = 3.6 variance (<= 5)
    expect(validateMassBalance(1000, 380).valid).toBe(true);
    // 1000 input, 350 output → 35% recovery
    // 41.6 - 35 = 6.6 variance (> 5)
    expect(validateMassBalance(1000, 350).valid).toBe(false);
  });
});
