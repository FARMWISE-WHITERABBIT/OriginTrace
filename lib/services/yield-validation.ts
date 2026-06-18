/**
 * lib/services/yield-validation.ts
 * 
 * Mirror of validate_batch_yield() DB trigger (schema.sql L2581).
 * Provides early feedback in the UI before data is synced/inserted.
 */

export interface YieldValidationResult {
  valid: boolean;
  threshold?: number;
  reason?: string;
  expected_yield?: number;
}

/**
 * Validates a batch weight against the farm's expected yield.
 * Flags if weight exceeds 120% of the benchmark.
 * 
 * @param totalWeightKg Actual weight of the batch
 * @param farmAreaHectares Farm area in hectares
 * @param avgYieldPerHectare Benchmark yield for the commodity (from crop_standards)
 * @param commodity Name of the commodity for reporting
 */
export function validateBatchYield(
  totalWeightKg: number,
  farmAreaHectares: number | null | undefined,
  avgYieldPerHectare: number | null | undefined,
  commodity: string = 'commodity'
): YieldValidationResult {
  if (!farmAreaHectares || !avgYieldPerHectare || farmAreaHectares <= 0) {
    return { valid: true }; // Cannot validate without area/standard
  }

  const threshold = farmAreaHectares * avgYieldPerHectare * 1.2;

  if (totalWeightKg > threshold) {
    return {
      valid: false,
      threshold,
      expected_yield: avgYieldPerHectare,
      reason: `Weight ${totalWeightKg.toFixed(0)}kg exceeds 120% of expected yield (${threshold.toFixed(0)}kg) for ${farmAreaHectares.toFixed(2)} ha of ${commodity}`
    };
  }

  return { 
    valid: true,
    threshold,
    expected_yield: avgYieldPerHectare
  };
}
