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
export type EligibilityCode =
  | 'FARM_REJECTED'
  | 'UNRESOLVED_BOUNDARY_CONFLICT'
  | 'MISSING_GPS_BOUNDARY'
  | 'FAILED_DEFORESTATION_CHECK'
  | 'MISSING_FARMER_CONSENT'
  | 'PENDING_COMPLIANCE_REVIEW'
  | 'DEFORESTATION_CHECK_PENDING'
  | 'HIGH_DEFORESTATION_RISK'
  | 'OVERRIDE_NON_ADMIN'
  | 'OVERRIDE_REASON_TOO_SHORT'
  | 'ADMIN_OVERRIDE_APPLIED';

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
  /** Set by the farm_conflicts trigger when an unresolved overlap is detected */
  conflict_status?: 'none' | 'conflict' | 'detected' | 'clear' | null;
}

export interface FarmEligibilityResult {
  eligible: boolean;
  status: EligibilityStatus;
  blockers: string[];
  blocker_codes: EligibilityCode[];
  warnings: string[];
  warning_codes: EligibilityCode[];
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
  const blockerCodes: EligibilityCode[] = [];
  const warnings: string[] = [];
  const warningCodes: EligibilityCode[] = [];

  const addBlocker = (code: EligibilityCode, message: string) => {
    blockerCodes.push(code);
    blockers.push(message);
  };
  const addWarning = (code: EligibilityCode, message: string) => {
    warningCodes.push(code);
    warnings.push(message);
  };

  const isEUDRBound = targetMarkets.some((m) => EUDR_MARKETS.includes(m));
  const isDeforestationMarket = targetMarkets.some((m) => DEFORESTATION_BLOCKED_MARKETS.includes(m));

  // ── Rule 1: Rejected farm is always blocked ───────────────────────────────
  if (farm.compliance_status === 'rejected') {
    addBlocker(
      'FARM_REJECTED',
      'Farm compliance status is REJECTED. An administrator must review this farm before it can contribute produce.'
    );
  }

  // ── Rule 1b: Unresolved GPS boundary conflict → blocked for EUDR batches ──
  // When a conflict exists the GPS polygon data is in question. EUDR Article 3
  // requires verifiable geospatial data — an unresolved conflict invalidates it.
  if (
    isEUDRBound &&
    (farm.conflict_status === 'conflict' || farm.conflict_status === 'detected')
  ) {
    addBlocker(
      'UNRESOLVED_BOUNDARY_CONFLICT',
      'Farm has an unresolved GPS boundary conflict. The geospatial data cannot be verified until an administrator resolves the conflict. EUDR-bound batches require verified GPS traceability (Article 3).'
    );
  }

  // ── Rule 2: No GPS boundary → blocked for EUDR-bound batches ─────────────
  if (isEUDRBound && !farm.boundary_geo) {
    addBlocker(
      'MISSING_GPS_BOUNDARY',
      'Farm has no GPS boundary polygon. A GPS boundary is required for EU and UK-bound shipments (EUDR Article 3).'
    );
  }

  // ── Rule 3: Failed deforestation check → blocked for EU/UK markets ────────
  if (isDeforestationMarket && farm.deforestation_check?.risk_level === 'failed') {
    addBlocker(
      'FAILED_DEFORESTATION_CHECK',
      'Farm has a FAILED deforestation check. EU/UK-bound batches cannot include produce from this farm until an administrator reviews and resolves the deforestation finding.'
    );
  }

  // ── Rule 4: No farmer consent → blocked for EUDR batches ─────────────────
  if (isEUDRBound && !farm.consent_timestamp) {
    addBlocker(
      'MISSING_FARMER_CONSENT',
      'Farmer consent has not been recorded. Farmer consent is required for EUDR compliance (Article 3). Record consent before assigning this farm to an EU-bound batch.'
    );
  }

  // ── Warnings (non-blocking) ───────────────────────────────────────────────
  if (farm.compliance_status === 'pending') {
    addWarning('PENDING_COMPLIANCE_REVIEW', 'Farm compliance review is pending. Approve or reject before the shipment reaches Documentation stage.');
  }

  if (farm.deforestation_check === null && isDeforestationMarket) {
    addWarning('DEFORESTATION_CHECK_PENDING', 'Deforestation check has not been run for this farm. Run the check before shipping to the EU or UK.');
  }

  if (farm.deforestation_check?.risk_level === 'high' && !blockers.some((b) => b.includes('deforestation'))) {
    addWarning('HIGH_DEFORESTATION_RISK', 'Farm has a HIGH deforestation risk rating. Ensure additional due diligence is documented.');
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
        blocker_codes: [...blockerCodes, 'OVERRIDE_NON_ADMIN'],
        warnings,
        warning_codes: warningCodes,
      };
    }
    if (!override.reason || override.reason.trim().length < 10) {
      return {
        eligible: false,
        status: 'blocked',
        blockers: [...blockers, 'Admin override reason is required and must be at least 10 characters.'],
        blocker_codes: [...blockerCodes, 'OVERRIDE_REASON_TOO_SHORT'],
        warnings,
        warning_codes: warningCodes,
      };
    }
    // Admin override accepted — return eligible with all warnings
    return {
      eligible: true,
      status: 'conditional',
      blockers: [],
      blocker_codes: [],
      warnings: [
        ...warnings,
        ...blockers.map((b) => `[ADMIN OVERRIDE] ${b} — Reason: ${override.reason}`),
      ],
      warning_codes: [...warningCodes, 'ADMIN_OVERRIDE_APPLIED'],
    };
  }

  if (blockers.length > 0) {
    return { eligible: false, status: 'blocked', blockers, blocker_codes: blockerCodes, warnings, warning_codes: warningCodes };
  }

  const status: EligibilityStatus =
    warnings.length > 0 ? 'conditional' : 'eligible';

  return { eligible: true, status, blockers: [], blocker_codes: [], warnings, warning_codes: warningCodes };
}
