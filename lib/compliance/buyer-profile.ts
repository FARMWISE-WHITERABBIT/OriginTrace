import { z } from 'zod';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/supabase/database.types';

export const buyerProfileMetadataSchema = z.object({
  schema_version: z.literal(1),
  profile_kind: z.literal('buyer_pilot'),
  version: z.string().min(1).max(40),
  commodity: z.object({
    name: z.string().min(1).max(120),
    hs_code: z.string().regex(/^\d{4,10}$/, 'HS code must contain 4 to 10 digits'),
  }).strict(),
  destination: z.object({
    country_code: z.string().regex(/^[A-Z]{2}$/, 'Use an ISO alpha-2 country code'),
    country: z.string().min(1).max(120),
    port: z.string().min(1).max(160),
  }).strict(),
  is_placeholder: z.literal(true),
  buyer_approved: z.literal(false),
  disclaimer: z.string().min(1).max(500),
  private_requirement_labels: z.array(z.string().min(1).max(160)).max(50),
}).strict();

export const buyerProfileCustomRulesSchema = z.object({
  buyer_profile: buyerProfileMetadataSchema,
}).passthrough();

export type BuyerProfileMetadata = z.infer<typeof buyerProfileMetadataSchema>;

export type BuyerRequirementCategory =
  | 'document'
  | 'certification'
  | 'geolocation'
  | 'traceability';

export interface BuyerRequirementCheck {
  key: string;
  label: string;
  category: BuyerRequirementCategory;
  met: boolean;
  private_requirement: boolean;
}

export interface BuyerRequirementProfileLike {
  required_documents?: string[] | null;
  required_certifications?: string[] | null;
  geo_verification_level?: string | null;
  min_traceability_depth?: number | null;
  custom_rules?: unknown;
}

export function normalizeBuyerRequirementKey(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

export function parseBuyerProfileMetadata(customRules: unknown): BuyerProfileMetadata | null {
  const parsed = buyerProfileCustomRulesSchema.safeParse(customRules);
  return parsed.success ? parsed.data.buyer_profile : null;
}

function hasEvidence(docStatus: Record<string, boolean>, label: string): boolean {
  const expected = normalizeBuyerRequirementKey(label);
  return Object.entries(docStatus).some(([key, present]) => {
    if (!present) return false;
    const normalized = normalizeBuyerRequirementKey(key);
    return normalized === expected || normalized.includes(expected) || expected.includes(normalized);
  });
}

export function evaluateBuyerRequirements(input: {
  profile: BuyerRequirementProfileLike;
  docStatus: Record<string, boolean>;
  allHaveGps: boolean;
  allTraceable: boolean;
  traceabilityDepth: number;
}): BuyerRequirementCheck[] {
  const { profile, docStatus, allHaveGps, allTraceable, traceabilityDepth } = input;
  const metadata = parseBuyerProfileMetadata(profile.custom_rules);
  const privateLabels = new Set(metadata?.private_requirement_labels ?? []);

  const documentChecks = (profile.required_documents ?? []).map((label) => ({
    key: normalizeBuyerRequirementKey(label),
    label,
    category: 'document' as const,
    met: hasEvidence(docStatus, label),
    private_requirement: privateLabels.has(label),
  }));

  const certificationChecks = (profile.required_certifications ?? []).map((label) => ({
    key: normalizeBuyerRequirementKey(label),
    label,
    category: 'certification' as const,
    met: hasEvidence(docStatus, label),
    private_requirement: true,
  }));

  const geoLevel = profile.geo_verification_level ?? 'basic';
  const geoCheck: BuyerRequirementCheck = {
    key: `geolocation_${normalizeBuyerRequirementKey(geoLevel)}`,
    label: `${geoLevel[0]?.toUpperCase() ?? ''}${geoLevel.slice(1)} geolocation`,
    category: 'geolocation',
    met: geoLevel === 'basic' || allHaveGps,
    private_requirement: false,
  };

  const requiredDepth = Math.max(1, profile.min_traceability_depth ?? 1);
  const traceabilityCheck: BuyerRequirementCheck = {
    key: `traceability_depth_${requiredDepth}`,
    label: `Traceability depth ${requiredDepth}`,
    category: 'traceability',
    met: allTraceable && traceabilityDepth >= requiredDepth,
    private_requirement: false,
  };

  return [...documentChecks, ...certificationChecks, geoCheck, traceabilityCheck];
}

// A buyer has no compliance data of their own org — everything they read or
// write against a specific exporter (compliance_profiles rows, template
// assignment) requires an *active* supply_chain_links row to that exporter.
// Shared by app/api/compliance-profiles/route.ts and
// app/api/buyer/compliance-templates/**/route.ts so both enforce the same
// cross-org access check.
export async function requireActiveLink(
  supabaseAdmin: SupabaseClient<Database>,
  buyerOrgId: string,
  exporterOrgId: string
): Promise<boolean> {
  const { data: link } = await supabaseAdmin
    .from('supply_chain_links')
    .select('id')
    .eq('buyer_org_id', buyerOrgId)
    .eq('exporter_org_id', exporterOrgId)
    .eq('status', 'active')
    .maybeSingle();
  return !!link;
}

export const DUTCH_COCOA_BUYER_PROFILE_TEMPLATE = {
  name: 'Dutch Cocoa Buyer Pilot — HS 1801 — v1',
  destination_market: 'Netherlands — Port of Rotterdam',
  regulation_framework: 'EUDR',
  required_documents: [
    'EUDR Due Diligence Statement',
    'Deforestation Risk Assessment',
    'Local Legality Evidence',
    'Lot-Level Chain of Custody Record',
    'Certificate of Origin',
    'Commercial Invoice',
    'Packing List',
    'Bill of Lading',
    'Quality Certificate',
  ],
  required_certifications: ['Rainforest Alliance Certificate'],
  geo_verification_level: 'polygon',
  min_traceability_depth: 3,
  custom_rules: {
    buyer_profile: {
      schema_version: 1,
      profile_kind: 'buyer_pilot',
      version: 'v1',
      commodity: { name: 'Cocoa beans', hs_code: '1801' },
      destination: {
        country_code: 'NL',
        country: 'Netherlands',
        port: 'Port of Rotterdam',
      },
      is_placeholder: true,
      buyer_approved: false,
      disclaimer: 'Illustrative pilot profile for product demonstration. It is not approved or issued by a real buyer.',
      private_requirement_labels: ['Rainforest Alliance Certificate'],
    },
  },
} as const;
