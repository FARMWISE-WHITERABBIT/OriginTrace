export type SubscriptionTier = 'starter' | 'basic' | 'pro' | 'enterprise';

export const TIER_HIERARCHY: Record<SubscriptionTier, number> = {
  starter: 0,
  basic: 1,
  pro: 2,
  enterprise: 3,
};

export const TIER_LABELS: Record<SubscriptionTier, string> = {
  starter: 'Starter',
  basic: 'Basic',
  pro: 'Pro',
  enterprise: 'Enterprise',
};

export const TIER_TAGLINES: Record<SubscriptionTier, string> = {
  starter: 'Proof of Value',
  basic: 'Operational Traceability',
  pro: 'Export & Compliance Ready',
  enterprise: 'Infrastructure Partner',
};

export const TIER_DESCRIPTIONS: Record<SubscriptionTier, string> = {
  starter: 'For pilots, NGOs, and early aggregators demonstrating traceability value.',
  basic: 'For active supply chains with real throughput — regional aggregators, domestic processors, co-ops.',
  pro: 'For exporters and processors supplying EU/US markets. Full compliance, buyer portal, and shipment planning.',
  enterprise: 'OriginTrace as critical trade infrastructure — Digital Product Passports, enterprise API, multinationals.',
};

export type TierFeature =
  | 'smart_collect'
  | 'farmer_registration'
  | 'farm_mapping'
  | 'sync_dashboard'
  | 'scan_verify'
  | 'inventory'
  | 'bags'
  | 'traceability'
  | 'yield_alerts'
  | 'dispatch'
  | 'agents'
  | 'farmers_list'
  | 'compliance_review'
  | 'farm_polygons'
  | 'boundary_conflicts'
  | 'dds_export'
  | 'data_vault'
  | 'processing'
  | 'pedigree'
  | 'delegations'
  | 'resolve'
  | 'shipment_readiness'
  | 'analytics'
  | 'documents'
  | 'payments'
  | 'supplier_scorecards'
  | 'cost_analysis'
  | 'compliance_profiles'
  | 'shipment_planning'
  | 'buyer_portal'
  | 'contracts'
  | 'digital_product_passport'
  | 'enterprise_api';

export const FEATURE_LABELS: Record<TierFeature, string> = {
  smart_collect: 'Smart Collection',
  farmer_registration: 'Farmer Registration',
  farm_mapping: 'Farm Mapping (GPS Walk)',
  sync_dashboard: 'Offline Collection & Sync',
  scan_verify: 'QR Bag Verification',
  inventory: 'Inventory Management',
  bags: 'Batch Management',
  traceability: 'Bag-to-Batch Traceability',
  yield_alerts: 'Yield Validation Alerts',
  dispatch: 'Dispatch Management',
  agents: 'Agent Management',
  farmers_list: 'Farmer Directory',
  compliance_review: 'Compliance Review & Approval',
  farm_polygons: 'Farm Polygon Boundaries',
  boundary_conflicts: 'Conflict Resolution',
  dds_export: 'DDS / Audit Exports',
  data_vault: 'Data Vault (Bulk Export)',
  processing: 'Processing Runs',
  pedigree: 'Pedigree Generation',
  delegations: 'Super-Aggregator Delegation',
  resolve: 'Conflict Management',
  shipment_readiness: 'Shipment Readiness',
  analytics: 'Analytics & Reporting',
  documents: 'Document Vault',
  payments: 'Payment Tracking',
  supplier_scorecards: 'Supplier Scorecards',
  cost_analysis: 'Cost & Revenue Analysis',
  compliance_profiles: 'Compliance Profiles',
  shipment_planning: 'Shipment Planning Workspace',
  buyer_portal: 'Buyer Portal',
  contracts: 'Contract Management',
  digital_product_passport: 'Digital Product Passport',
  enterprise_api: 'Enterprise API Access',
};

const FEATURE_MIN_TIER: Record<TierFeature, SubscriptionTier> = {
  smart_collect: 'starter',
  farmer_registration: 'starter',
  farm_mapping: 'starter',
  sync_dashboard: 'starter',
  traceability: 'starter',
  farm_polygons: 'starter',
  farmers_list: 'starter',

  inventory: 'basic',
  bags: 'basic',
  yield_alerts: 'basic',
  agents: 'basic',
  scan_verify: 'basic',
  dispatch: 'basic',
  analytics: 'basic',
  documents: 'basic',
  payments: 'basic',

  compliance_review: 'pro',
  dds_export: 'pro',
  processing: 'pro',
  pedigree: 'pro',
  boundary_conflicts: 'pro',
  delegations: 'pro',
  resolve: 'pro',
  shipment_readiness: 'pro',
  supplier_scorecards: 'pro',
  cost_analysis: 'pro',
  compliance_profiles: 'pro',
  shipment_planning: 'pro',
  buyer_portal: 'pro',
  contracts: 'pro',

  data_vault: 'enterprise',
  digital_product_passport: 'enterprise',
  enterprise_api: 'enterprise',
};

export function getTierFeatures(tier: SubscriptionTier): TierFeature[] {
  const level = TIER_HIERARCHY[tier];
  return (Object.entries(FEATURE_MIN_TIER) as [TierFeature, SubscriptionTier][])
    .filter(([, minTier]) => TIER_HIERARCHY[minTier] <= level)
    .map(([feature]) => feature);
}

export function getTierNewFeatures(tier: SubscriptionTier): TierFeature[] {
  return (Object.entries(FEATURE_MIN_TIER) as [TierFeature, SubscriptionTier][])
    .filter(([, minTier]) => minTier === tier)
    .map(([feature]) => feature);
}

const ROUTE_TO_FEATURE: Record<string, TierFeature> = {
  '/app/collect': 'smart_collect',
  '/app/farmers/new': 'farmer_registration',
  '/app/farms/map': 'farm_mapping',
  '/app/sync': 'sync_dashboard',
  '/app/verify': 'scan_verify',
  '/app/inventory': 'inventory',
  '/app/bags': 'bags',
  '/app/traceability': 'traceability',
  '/app/yield-alerts': 'yield_alerts',
  '/app/dispatch': 'dispatch',
  '/app/agents': 'agents',
  '/app/farmers': 'farmers_list',
  '/app/compliance': 'compliance_review',
  '/app/farms': 'farm_polygons',
  '/app/conflicts': 'boundary_conflicts',
  '/app/dds': 'dds_export',
  '/app/data-vault': 'data_vault',
  '/app/processing': 'processing',
  '/app/pedigree': 'pedigree',
  '/app/delegations': 'delegations',
  '/app/resolve': 'resolve',
  '/app/shipments': 'shipment_readiness',
  '/app/analytics': 'analytics',
  '/app/documents': 'documents',
  '/app/payments': 'payments',
  '/app/compliance-profiles': 'compliance_profiles',
  '/app/dpp': 'digital_product_passport',
  '/app/contracts': 'contracts',
  '/app/buyers': 'buyer_portal',
  '/app/buyer': 'buyer_portal',
};

const API_ROUTE_TO_FEATURE: Record<string, TierFeature> = {
  '/api/batches': 'smart_collect',
  '/api/farms': 'farm_mapping',
  '/api/sync': 'sync_dashboard',
  '/api/bags': 'bags',
  '/api/traceability': 'traceability',
  '/api/yield-validation': 'yield_alerts',
  '/api/batch-contributions': 'inventory',
  '/api/conflicts': 'boundary_conflicts',
  '/api/data-vault': 'data_vault',
  '/api/pedigree': 'pedigree',
  '/api/processing-runs': 'processing',
  '/api/finished-goods': 'processing',
  '/api/delegations': 'delegations',
  '/api/shipments': 'shipment_readiness',
  '/api/analytics': 'analytics',
  '/api/documents': 'documents',
  '/api/payments': 'payments',
  '/api/compliance-profiles': 'compliance_profiles',
  '/api/dpp': 'digital_product_passport',
  '/api/contracts': 'contracts',
  '/api/buyers': 'buyer_portal',
  '/api/supply-chain-links': 'buyer_portal',
  '/api/keys': 'enterprise_api',
  '/api/v1': 'enterprise_api',
};

export function hasTierAccess(orgTier: string | undefined, feature: TierFeature): boolean {
  const tier = (orgTier || 'starter') as SubscriptionTier;
  const currentLevel = TIER_HIERARCHY[tier] ?? 0;
  const requiredLevel = TIER_HIERARCHY[FEATURE_MIN_TIER[feature]] ?? 0;
  return currentLevel >= requiredLevel;
}

export function getRequiredTier(feature: TierFeature): SubscriptionTier {
  return FEATURE_MIN_TIER[feature];
}

export function getFeatureForRoute(pathname: string): TierFeature | null {
  const match = Object.keys(ROUTE_TO_FEATURE)
    .sort((a, b) => b.length - a.length)
    .find(route => pathname === route || pathname.startsWith(route + '/'));
  return match ? ROUTE_TO_FEATURE[match] : null;
}

export function getFeatureForApiRoute(pathname: string): TierFeature | null {
  const match = Object.keys(API_ROUTE_TO_FEATURE)
    .sort((a, b) => b.length - a.length)
    .find(route => pathname === route || pathname.startsWith(route + '/'));
  return match ? API_ROUTE_TO_FEATURE[match] : null;
}

export function checkRouteAccess(orgTier: string | undefined, pathname: string): { allowed: boolean; requiredTier?: SubscriptionTier } {
  const feature = getFeatureForRoute(pathname);
  if (!feature) return { allowed: true };
  if (hasTierAccess(orgTier, feature)) return { allowed: true };
  return { allowed: false, requiredTier: getRequiredTier(feature) };
}

export function checkApiAccess(orgTier: string | undefined, pathname: string): { allowed: boolean; requiredTier?: SubscriptionTier } {
  const feature = getFeatureForApiRoute(pathname);
  if (!feature) return { allowed: true };
  if (hasTierAccess(orgTier, feature)) return { allowed: true };
  return { allowed: false, requiredTier: getRequiredTier(feature) };
}
