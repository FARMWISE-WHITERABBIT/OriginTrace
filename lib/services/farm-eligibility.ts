/**
 * Farm Compliance Gate — API-layer enforcement
 *
 * Implements the hard rules from PRD §4.1. This function is called in the
 * batch creation API route BEFORE inserting a new collection batch.
 * Failures return a structured error that the API returns as 422.
 *
 * Gate rules:
 * - compliance_status = 'rejected'   → always blocked (admin override allowed)
 * - boundary_geo IS NULL             → blocked for EUDR-bound batches
 * - deforestation_check failed       → blocked for EU/UK-bound batches
 * - consent_timestamp IS NULL        → blocked for EUDR batches
 */

export type EligibilityStatus = 'eligible' | 'conditional' | 'blocked';

export interface FarmRecord {
  id: string;
  compliance_status: 'pending' | 'approved' | 'rejected';
  boundary_geo: unknown | null;          // non-null means GPS captured
  deforestation_check: {
    risk_level?: 'low' | 'medium' | 'high' | 'failed' | null;
    check_date?: string;
    data_source?: string;
  } | null;
  consent_timestamp: string | null;
  eligibility_status?: EligibilityStatus | null;
}

export interface FarmEligibilityResult {
  eligible: boolean;
  status: EligibilityStatus;
  blockers: string[];
  warnings: string[];
}

/**
 * Markets that require GPS boundary polygon (EUDR and UK Environment Act).
 * US, China, UAE do not mandate farm-level GPS in the same way.
 */
const EUDR_MARKETS = ['EU', 'EUDR', 'UK', 'UK_Environment_Act'];

/**
 * Markets where a failed deforestation check blocks the batch.
 */
const DEFORESTATION_BLOCKED_MARKETS = ['EU', 'EUDR', 'UK', 'UK_Environment_Act'];

/**
 * Check whether a farm is eligible to contribute to a batch.
 *
 * @param farm            Farm record fetched from DB with required fields
 * @param targetMarkets   Markets for this batch/shipment (e.g. ['EU', 'US'])
 * @param override        Admin override — allows a blocked farm through with an audit trail
 */
export function checkFarmEligibility(
  farm: FarmRecord,
  targetMarkets: string[],
  override?: { reason: string; actorRole: string }
): FarmEligibilityResult {
  const blockers: string[] = [];
  const warnings: string[] = [];

  const isEUDRBound = targetMarkets.some((m) => EUDR_MARKETS.includes(m));
  const isDeforestationMarket = targetMarkets.some((m) => DEFORESTATION_BLOCKED_MARKETS.includes(m));

  // ── Rule 1: Rejected farm is always blocked ───────────────────────────────
  if (farm.compliance_status === 'rejected') {
    blockers.push(
      'Farm compliance status is REJECTED. An administrator must review this farm before it can contribute produce.'
    );
  }

  // ── Rule 2: No GPS boundary → blocked for EUDR-bound batches ─────────────
  if (isEUDRBound && !farm.boundary_geo) {
    blockers.push(
      'Farm has no GPS boundary polygon. A GPS boundary is required for EU and UK-bound shipments (EUDR Article 3).'
    );
  }

  // ── Rule 3: Failed deforestation check → blocked for EU/UK markets ────────
  if (isDeforestationMarket && farm.deforestation_check?.risk_level === 'failed') {
    blockers.push(
      'Farm has a FAILED deforestation check. EU/UK-bound batches cannot include produce from this farm until an administrator reviews and resolves the deforestation finding.'
    );
  }

  // ── Rule 4: No farmer consent → blocked for EUDR batches ─────────────────
  if (isEUDRBound && !farm.consent_timestamp) {
    blockers.push(
      'Farmer consent has not been recorded. Farmer consent is required for EUDR compliance (Article 3). Record consent before assigning this farm to an EU-bound batch.'
    );
  }

  // ── Warnings (non-blocking) ───────────────────────────────────────────────
  if (farm.compliance_status === 'pending') {
    warnings.push('Farm compliance review is pending. Approve or reject before the shipment reaches Documentation stage.');
  }

  if (farm.deforestation_check === null && isDeforestationMarket) {
    warnings.push('Deforestation check has not been run for this farm. Run the check before shipping to the EU or UK.');
  }

  if (farm.deforestation_check?.risk_level === 'high' && !blockers.some((b) => b.includes('deforestation'))) {
    warnings.push('Farm has a HIGH deforestation risk rating. Ensure additional due diligence is documented.');
  }

  // ── Admin override ────────────────────────────────────────────────────────
  // An admin can override blockers with a documented reason. The override itself
  // is logged as an audit event by the caller (batch creation route).
  if (blockers.length > 0 && override) {
    if (override.actorRole !== 'admin') {
      // Override rejected — only admins can override
      return {
        eligible: false,
        status: 'blocked',
        blockers: [...blockers, 'Only an admin can override farm compliance gate blockers.'],
        warnings,
      };
    }
    // Admin override accepted — return eligible with all warnings
    return {
      eligible: true,
      status: 'conditional',
      blockers: [],
      warnings: [
        ...warnings,
        ...blockers.map((b) => `[ADMIN OVERRIDE] ${b} — Reason: ${override.reason}`),
      ],
    };
  }

  if (blockers.length > 0) {
    return { eligible: false, status: 'blocked', blockers, warnings };
  }

  const status: EligibilityStatus =
    warnings.length > 0 ? 'conditional' : 'eligible';

  return { eligible: true, status, blockers: [], warnings };
}
