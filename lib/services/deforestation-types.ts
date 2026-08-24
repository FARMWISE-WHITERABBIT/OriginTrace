/**
 * Shared types for the deforestation-check pipeline. Both
 * lib/services/gfw-deforestation.ts and lib/services/whisp-deforestation.ts
 * produce this same DeforestationResult shape — WHISP is tried first, GFW is
 * the fallback (see app/api/deforestation-check/route.ts).
 */

type CoordinatePair = [number, number];

export interface GfwPolygon {
  type: 'Polygon';
  coordinates: CoordinatePair[][];
}

export interface DeforestationResult {
  deforestation_free: boolean;
  forest_loss_hectares: number;
  forest_loss_percentage: number;
  analysis_date: string;
  data_source: string;
  /**
   * 'high' is a real hard block for EU/UK-bound farms (see
   * lib/services/farm-eligibility.ts). There is no 'failed' value — a check
   * that couldn't complete resolves to 'medium' + manual_review_required,
   * never a silently-ignored fourth risk_level.
   */
  risk_level: 'low' | 'medium' | 'high';
  verification_status?: 'verified' | 'manual_review_required';
  manual_review_required?: boolean;
  gfw_dataset?: string;
  gfw_version?: string;
  /** Present only when this result came from (or was attempted via) WHISP. */
  whisp_status?: 'complete' | 'pending' | 'unavailable';
  whisp_token?: string;
  whisp_risk_category?: 'low_risk' | 'high_risk' | 'more_info_needed';
}
