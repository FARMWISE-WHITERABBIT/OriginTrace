/**
 * lib/services/mass-balance.ts
 * 
 * Mirror of validate_mass_balance() DB trigger (schema.sql L2616).
 * Used for processing-run validation.
 */

export interface MassBalanceResult {
  valid: boolean;
  recovery_rate: number;
  standard_rate: number;
  variance: number;
  tolerance: number;
  reason?: string;
}

/**
 * Validates output weight against input weight using commodity standards.
 * 
 * @param inputWeight Input raw weight
 * @param outputWeight Output processed weight
 * @param standardRate Expected recovery percentage (e.g. 41.6)
 * @param tolerance Allowed +/- percentage points (e.g. 5.0)
 */
export function validateMassBalance(
  inputWeight: number,
  outputWeight: number,
  standardRate: number = 41.6,
  tolerance: number = 5.0
): MassBalanceResult {
  if (!inputWeight || !outputWeight || inputWeight <= 0) {
    return {
      valid: true,
      recovery_rate: 0,
      standard_rate: standardRate,
      variance: 0,
      tolerance
    };
  }

  const recoveryRate = (outputWeight / inputWeight) * 100;
  const variance = Math.abs(recoveryRate - standardRate);
  const valid = variance <= tolerance;

  return {
    valid,
    recovery_rate: recoveryRate,
    standard_rate: standardRate,
    variance,
    tolerance,
    reason: valid 
      ? undefined 
      : `Recovery rate ${recoveryRate.toFixed(1)}% deviates from standard ${standardRate}% by ${variance.toFixed(1)}% (tolerance ${tolerance}%)`
  };
}
