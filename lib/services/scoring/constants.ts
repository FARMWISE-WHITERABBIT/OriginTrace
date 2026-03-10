/**
 * Scoring Engine Constants
 *
 * All numeric thresholds, weights, and penalties used across the scoring
 * engine live here. Centralising them:
 *   - Makes business-rule changes a one-line edit
 *   - Makes the policy intent legible to non-engineers
 *   - Lets tests assert against named constants, not magic numbers
 *
 * Sections:
 *   DIMENSION_WEIGHTS        — how each dimension contributes to overall score
 *   TRACEABILITY             — sub-weights and thresholds for the traceability scorer
 *   CHEMICAL_RISK            — per-document point allocations
 *   STORAGE                  — cold chain alert penalty parameters
 *   REGULATORY               — rejection-rate penalty parameters
 *   DECISION                 — go / conditional / no_go / pending score cutoffs
 */

// ---------------------------------------------------------------------------
// Dimension weights
// Must sum to exactly 1.0
// ---------------------------------------------------------------------------
export const DIMENSION_WEIGHTS = {
  TRACEABILITY_INTEGRITY:    0.25,
  CHEMICAL_CONTAMINATION:    0.25,
  DOCUMENTATION_COMPLETENESS: 0.20,
  STORAGE_HANDLING:          0.15,
  REGULATORY_ALIGNMENT:      0.15,
} as const;

// ---------------------------------------------------------------------------
// Traceability Integrity
// ---------------------------------------------------------------------------
export const TRACEABILITY = {
  /** Weight of traceable-item percentage within the dimension score. */
  SCORE_WEIGHT_TRACEABILITY: 0.4,

  /** Weight of GPS-linked-batches percentage within the dimension score. */
  SCORE_WEIGHT_GPS:          0.3,

  /** Weight of bags-linked-to-farm percentage within the dimension score. */
  SCORE_WEIGHT_BAG_LINK:     0.2,

  /** Weight of all-items-have-at-least-one-farm within the dimension score. */
  SCORE_WEIGHT_FARM_COUNT:   0.1,

  /**
   * Fraction of traceable items below which a hard-fail flag is raised.
   * e.g. 0.5 means < 50% traceable → hard fail.
   */
  HARD_FAIL_THRESHOLD: 0.5,
} as const;

// ---------------------------------------------------------------------------
// Chemical & Contamination Risk
// Point allocations (must add to 100)
// ---------------------------------------------------------------------------
export const CHEMICAL_RISK = {
  LAB_TEST_POINTS:     40,
  PESTICIDE_POINTS:    30,
  AFLATOXIN_POINTS:    30,

  /**
   * Penalty applied when *no* chemical document exists.
   * Applied on top of the zero score, clamped to 0.
   */
  NO_DOCS_PENALTY: 20,
} as const;

// ---------------------------------------------------------------------------
// Storage & Handling Controls
// ---------------------------------------------------------------------------
export const STORAGE = {
  /**
   * Alert rate threshold above which a cold-chain penalty is applied.
   * e.g. 0.2 means > 20% of readings were alerts → penalty kicks in.
   */
  COLD_CHAIN_ALERT_THRESHOLD: 0.2,

  /**
   * Multiplier applied to alert rate to compute the score penalty.
   * penalty = min(alertRate * PENALTY_MULTIPLIER, MAX_PENALTY)
   */
  COLD_CHAIN_PENALTY_MULTIPLIER: 30,

  /**
   * Maximum penalty deductible from the storage score for cold-chain issues.
   */
  COLD_CHAIN_MAX_PENALTY: 20,

  /**
   * Bonus awarded when cold-chain data exists and *all* readings are clean.
   */
  COLD_CHAIN_CLEAN_BONUS: 5,
} as const;

// ---------------------------------------------------------------------------
// Regulatory Alignment
// ---------------------------------------------------------------------------
export const REGULATORY = {
  /**
   * Score below which a critical "low regulatory alignment" flag is raised.
   */
  LOW_SCORE_THRESHOLD: 50,

  /**
   * Multiplier for the historical rejection rate penalty.
   * penalty = min(rate * REJECTION_PENALTY_MULTIPLIER, MAX_REJECTION_PENALTY)
   */
  REJECTION_PENALTY_MULTIPLIER: 50,

  /**
   * Maximum points deducted for historical rejection rate.
   */
  MAX_REJECTION_PENALTY: 25,

  /**
   * Rejection rate at or above which a critical flag (vs. warning) is raised.
   * e.g. 0.3 means ≥ 30% → critical; < 30% but > 0% → warning.
   */
  REJECTION_CRITICAL_THRESHOLD: 0.3,
} as const;

// ---------------------------------------------------------------------------
// Decision thresholds
// ---------------------------------------------------------------------------
export const DECISION = {
  /**
   * Overall score at or above which the shipment is "go" (ready to ship).
   * Score in [GO_THRESHOLD, 100] → 'go'
   */
  GO_THRESHOLD: 75,

  /**
   * Overall score above which (and below GO_THRESHOLD) the shipment is
   * "conditional". Score in [CONDITIONAL_FLOOR, GO_THRESHOLD) → 'conditional'
   */
  CONDITIONAL_FLOOR: 50,

  /**
   * Below CONDITIONAL_FLOOR (or when hard fails present) → 'no_go'.
   */
} as const;
