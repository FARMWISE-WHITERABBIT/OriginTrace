/**
 * Shared compliance framework templates.
 *
 * Used by:
 *   - /api/compliance-profiles  (org-facing: template selection when creating profiles)
 *   - /api/superadmin/compliance-rulesets  (superadmin: view + override per-framework defaults)
 *   - /app/superadmin/compliance  (superadmin UI)
 */

export interface ComplianceDocument {
  id: string;
  label: string;
  required: boolean;
  notes?: string;
}

export interface ComplianceTemplate {
  market_id: string;             // canonical key: 'EU' | 'UK' | 'US' | 'LACEY_UFLPA' | 'CHINA' | 'UAE'
  market_name: string;
  short_code: string;
  regulation_framework: string;
  destination_market: string;
  color: string;                 // Tailwind badge colour classes
  description: string;
  docs: ComplianceDocument[];
  required_certifications: string[];
  geo_verification_level: 'basic' | 'polygon' | 'satellite';
  min_traceability_depth: number;
}

export const COMPLIANCE_TEMPLATES: Record<string, ComplianceTemplate> = {
  EU: {
    market_id: 'EU',
    market_name: 'EU Deforestation Regulation',
    short_code: 'EUDR',
    regulation_framework: 'EUDR',
    destination_market: 'European Union',
    color: 'bg-blue-900/40 text-blue-300 border-blue-700',
    description: 'Regulation (EU) 2023/1115 — applies to cocoa, coffee, palm oil, soy, cattle, wood, rubber and derived products placed on the EU market after 30 Dec 2024.',
    docs: [
      { id: 'deforestation_declaration', label: 'Deforestation-free declaration', required: true },
      { id: 'gps_polygon', label: 'GPS polygon boundaries', required: true },
      { id: 'land_title', label: 'Land title / ownership proof', required: true },
      { id: 'farmer_id', label: 'Farmer ID verification', required: true },
      { id: 'traceability_chain', label: 'Traceability chain documentation', required: true },
      { id: 'dds_statement', label: 'Due Diligence Statement (DDS)', required: true },
      { id: 'supplier_list', label: 'Full supply chain supplier list', required: false, notes: 'Required for Tier 1 operators' },
    ],
    required_certifications: ['Rainforest Alliance', 'UTZ', 'Fairtrade'],
    geo_verification_level: 'satellite',
    min_traceability_depth: 3,
  },
  UK: {
    market_id: 'UK',
    market_name: 'UK Environment Act / Forest Risk',
    short_code: 'UK-FRC',
    regulation_framework: 'UK_Environment_Act',
    destination_market: 'United Kingdom',
    color: 'bg-red-900/40 text-red-300 border-red-700',
    description: 'UK Forest Risk Commodities (FRC) framework under the Environment Act 2021 — mirrors EUDR scope for UK market access.',
    docs: [
      { id: 'due_diligence_assessment', label: 'Due diligence assessment', required: true },
      { id: 'risk_assessment', label: 'Risk assessment report', required: true },
      { id: 'supply_chain_mapping', label: 'Supply chain mapping', required: true },
      { id: 'farmer_registration', label: 'Farmer registration records', required: true },
      { id: 'land_use_docs', label: 'Land use documentation', required: true },
    ],
    required_certifications: ['Rainforest Alliance', 'Fairtrade'],
    geo_verification_level: 'polygon',
    min_traceability_depth: 2,
  },
  US: {
    market_id: 'US',
    market_name: 'US FSMA 204 Compliance',
    short_code: 'US-FDA',
    regulation_framework: 'FSMA_204',
    destination_market: 'United States',
    color: 'bg-slate-700 text-slate-300 border-slate-600',
    description: 'US Food Safety Modernization Act Section 204 — FDA traceability rule for high-risk foods.',
    docs: [
      { id: 'kde_records', label: 'Key Data Elements (KDE) records', required: true },
      { id: 'cte_log', label: 'Critical Tracking Events (CTE) log', required: true },
      { id: 'lot_traceability', label: 'Lot traceability records', required: true },
      { id: 'supplier_verification', label: 'Supplier verification', required: true },
      { id: 'food_safety_plan', label: 'Food safety plan', required: true },
    ],
    required_certifications: ['FDA Registration', 'HACCP'],
    geo_verification_level: 'basic',
    min_traceability_depth: 1,
  },
  LACEY_UFLPA: {
    market_id: 'LACEY_UFLPA',
    market_name: 'US Lacey Act / UFLPA',
    short_code: 'LACEY',
    regulation_framework: 'Lacey_Act_UFLPA',
    destination_market: 'United States',
    color: 'bg-purple-900/40 text-purple-300 border-purple-700',
    description: 'US Lacey Act and Uyghur Forced Labor Prevention Act — supply chain due diligence for forced-labor-free sourcing.',
    docs: [
      { id: 'certificate_of_origin', label: 'Certificate of Origin', required: true },
      { id: 'species_id', label: 'Species / product identification', required: true },
      { id: 'import_declaration', label: 'Import declaration', required: true },
      { id: 'forced_labor_declaration', label: 'Forced labor declaration', required: true },
      { id: 'supply_chain_mapping', label: 'Supply chain mapping', required: true },
      { id: 'coo_documentation', label: 'Country-of-origin documentation', required: false },
    ],
    required_certifications: ['Chain of Custody', 'FSC/PEFC'],
    geo_verification_level: 'polygon',
    min_traceability_depth: 3,
  },
  CHINA: {
    market_id: 'CHINA',
    market_name: 'China GACC / Green Trade',
    short_code: 'GACC',
    regulation_framework: 'China_Green_Trade',
    destination_market: 'China',
    color: 'bg-red-900/40 text-red-300 border-red-800',
    description: 'General Administration of Customs China (GACC) — food safety registration and phytosanitary requirements for agri-commodity exporters.',
    docs: [
      { id: 'gacc_registration', label: 'GACC registration certificate', required: true },
      { id: 'phytosanitary', label: 'Phytosanitary certificate per shipment', required: true },
      { id: 'fumigation_cert', label: 'Fumigation certificate', required: true },
      { id: 'coo', label: 'Certificate of origin', required: true },
      { id: 'gb_standards', label: 'GB standards compliance report', required: true },
      { id: 'inspection_report', label: 'Inspection report', required: true },
      { id: 'chinese_label', label: 'Chinese-language product label', required: false },
    ],
    required_certifications: ['GACC Registration', 'GB Standards'],
    geo_verification_level: 'polygon',
    min_traceability_depth: 2,
  },
  UAE: {
    market_id: 'UAE',
    market_name: 'UAE / Halal Compliance',
    short_code: 'UAE',
    regulation_framework: 'UAE_Halal',
    destination_market: 'UAE / Middle East',
    color: 'bg-amber-900/40 text-amber-300 border-amber-700',
    description: 'UAE food import requirements — ESMA, MOCCAE, and Halal certification for agri-commodities via Dubai / Abu Dhabi ports.',
    docs: [
      { id: 'halal_cert', label: 'Halal certification (accredited body)', required: false, notes: 'Required for animal-derived products' },
      { id: 'esma_cert', label: 'ESMA compliance certificate', required: true },
      { id: 'moccae_permit', label: 'MOCCAE import permit', required: true },
      { id: 'coo', label: 'Certificate of origin', required: true },
      { id: 'health_cert', label: 'Health certificate', required: true },
      { id: 'arabic_labeling', label: 'Arabic-language labeling compliance', required: true },
    ],
    required_certifications: ['Halal Certification', 'ESMA Compliance'],
    geo_verification_level: 'basic',
    min_traceability_depth: 1,
  },
};

/** Ordered list for consistent display */
export const TEMPLATE_ORDER = ['EU', 'UK', 'US', 'LACEY_UFLPA', 'CHINA', 'UAE'] as const;
export type TemplateKey = typeof TEMPLATE_ORDER[number];

/**
 * Merge superadmin overrides (from compliance_rulesets table) into the base templates.
 * The DB row's `docs` array replaces the template docs for that market_id.
 */
export function mergeRulesetOverrides(
  overrides: Array<{ market_id: string; docs: ComplianceDocument[] }>
): ComplianceTemplate[] {
  return TEMPLATE_ORDER.map(key => {
    const base = COMPLIANCE_TEMPLATES[key];
    const override = overrides.find(r => r.market_id === key);
    return override ? { ...base, docs: override.docs } : base;
  });
}
