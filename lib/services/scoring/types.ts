export interface ComplianceProfile {
  id: string;
  name: string;
  destination_market: string;
  regulation_framework: string;
  required_documents: string[];
  required_certifications: string[];
  geo_verification_level: string;
  min_traceability_depth: number;
  custom_rules?: Record<string, any>;
}

export interface FarmDeforestationCheck {
  farm_id: string;
  deforestation_free: boolean;
  forest_loss_hectares: number;
  forest_loss_percentage: number;
  analysis_date: string;
  data_source: string;
  risk_level: 'low' | 'medium' | 'high';
}

export interface ShipmentScoreInput {
  shipment: {
    id: string;
    destination_country: string | null;
    target_regulations: string[];
    doc_status: Record<string, boolean>;
    storage_controls: Record<string, boolean>;
    estimated_ship_date: string | null;
  };
  items: Array<{
    item_type: string;
    weight_kg: number;
    farm_count: number;
    traceability_complete: boolean;
    compliance_status: string;
    farm_ids?: string[];
    batch_data?: {
      has_gps: boolean;
      bag_count: number;
      bags_with_farm_link: number;
      dispatched: boolean;
      yield_validated: boolean;
    };
    finished_good_data?: {
      mass_balance_valid: boolean;
      pedigree_verified: boolean;
      processing_run_complete: boolean;
    };
  }>;
  org_compliance_status?: string;
  historical_rejection_rate?: number;
  cold_chain_alert_count?: number;
  cold_chain_total_entries?: number;
  lot_count?: number;
  lots_with_valid_mass_balance?: number;
  compliance_profile?: ComplianceProfile;
  farm_deforestation_checks?: FarmDeforestationCheck[];
}

export interface ScoreDimension {
  name: string;
  weight: number;
  score: number;
  weighted_score: number;
  details: string[];
}

export interface RiskFlag {
  severity: 'critical' | 'warning' | 'info';
  category: string;
  message: string;
  is_hard_fail: boolean;
}

export interface RemediationItem {
  priority: 'urgent' | 'important' | 'recommended';
  title: string;
  description: string;
  dimension: string;
}

export type ReadinessDecision = 'go' | 'conditional' | 'no_go' | 'pending';

export interface ShipmentReadinessResult {
  overall_score: number;
  decision: ReadinessDecision;
  decision_label: string;
  dimensions: ScoreDimension[];
  risk_flags: RiskFlag[];
  remediation_items: RemediationItem[];
  summary: string;
}

export interface FrameworkScorerContext {
  input: ShipmentScoreInput;
  allHaveGps: boolean;
  allTraceable: boolean;
  batches: ShipmentScoreInput['items'];
  doc_status: Record<string, boolean>;
  shipment: ShipmentScoreInput['shipment'];
  items: ShipmentScoreInput['items'];
  profile?: ComplianceProfile;
}

export interface FrameworkScorerResult {
  met: number;
  total: number;
  details: string[];
  riskFlags: RiskFlag[];
  remediation: RemediationItem[];
}
