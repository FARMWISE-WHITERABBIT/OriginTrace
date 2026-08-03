import { describe, expect, it } from 'vitest';
import {
  DUTCH_COCOA_BUYER_PROFILE_TEMPLATE,
  evaluateBuyerRequirements,
  parseBuyerProfileMetadata,
} from '@/lib/compliance/buyer-profile';
import { computeShipmentReadiness } from '@/lib/services/shipment-scoring';

const allEvidence = Object.fromEntries([
  ...DUTCH_COCOA_BUYER_PROFILE_TEMPLATE.required_documents,
  ...DUTCH_COCOA_BUYER_PROFILE_TEMPLATE.required_certifications,
].map((label) => [label, true]));

describe('buyer profile metadata', () => {
  it('parses the illustrative Dutch cocoa pilot metadata', () => {
    const metadata = parseBuyerProfileMetadata(DUTCH_COCOA_BUYER_PROFILE_TEMPLATE.custom_rules);

    expect(metadata).toMatchObject({
      version: 'v1',
      is_placeholder: true,
      buyer_approved: false,
      commodity: { hs_code: '1801' },
      destination: { country_code: 'NL', port: 'Port of Rotterdam' },
    });
  });

  it('rejects metadata that claims the placeholder is buyer-approved', () => {
    const invalid = structuredClone(DUTCH_COCOA_BUYER_PROFILE_TEMPLATE.custom_rules) as any;
    invalid.buyer_profile.buyer_approved = true;

    expect(parseBuyerProfileMetadata(invalid)).toBeNull();
  });
});

describe('evaluateBuyerRequirements', () => {
  it('returns individual pass results for documents, certification, geo and traceability', () => {
    const checks = evaluateBuyerRequirements({
      profile: DUTCH_COCOA_BUYER_PROFILE_TEMPLATE,
      docStatus: allEvidence,
      allHaveGps: true,
      allTraceable: true,
      traceabilityDepth: 3,
    });

    expect(checks).toHaveLength(12);
    expect(checks.every((check) => check.met)).toBe(true);
    expect(checks.find((check) => check.label === 'Rainforest Alliance Certificate')).toMatchObject({
      category: 'certification',
      private_requirement: true,
    });
  });

  it('reports missing evidence and insufficient traceability without assuming success', () => {
    const checks = evaluateBuyerRequirements({
      profile: DUTCH_COCOA_BUYER_PROFILE_TEMPLATE,
      docStatus: { 'EUDR Due Diligence Statement': true },
      allHaveGps: false,
      allTraceable: true,
      traceabilityDepth: 2,
    });

    expect(checks.find((check) => check.label === 'EUDR Due Diligence Statement')?.met).toBe(true);
    expect(checks.find((check) => check.label === 'Commercial Invoice')?.met).toBe(false);
    expect(checks.find((check) => check.category === 'geolocation')?.met).toBe(false);
    expect(checks.find((check) => check.category === 'traceability')?.met).toBe(false);
  });
});

describe('Dutch buyer profile scoring integration', () => {
  it('evaluates buyer requirements alongside EUDR and persists structured checks', () => {
    const result = computeShipmentReadiness({
      shipment: {
        id: 'shipment-nl-demo',
        destination_country: 'Netherlands',
        target_regulations: ['EUDR'],
        doc_status: {
          ...allEvidence,
          legality_verified: true,
          due_diligence_statement: true,
        },
        storage_controls: {},
        estimated_ship_date: null,
      },
      items: [{
        item_type: 'batch',
        weight_kg: 1_000,
        farm_count: 3,
        traceability_complete: true,
        compliance_status: 'approved',
        batch_data: {
          has_gps: true,
          bag_count: 50,
          bags_with_farm_link: 50,
          dispatched: true,
          yield_validated: true,
        },
      }],
      compliance_profile: {
        id: 'profile-nl-demo',
        ...DUTCH_COCOA_BUYER_PROFILE_TEMPLATE,
        required_documents: [...DUTCH_COCOA_BUYER_PROFILE_TEMPLATE.required_documents],
        required_certifications: [...DUTCH_COCOA_BUYER_PROFILE_TEMPLATE.required_certifications],
        custom_rules: DUTCH_COCOA_BUYER_PROFILE_TEMPLATE.custom_rules,
      },
    });

    const regulatory = result.dimensions.find((dimension) => dimension.name === 'Regulatory Alignment');
    expect(regulatory?.requirement_checks).toHaveLength(12);
    expect(regulatory?.requirement_checks?.every((check) => check.met)).toBe(true);
    expect(regulatory?.details.some((detail) => detail.includes('Buyer Standards'))).toBe(true);
  });

  it('does not award depth three when bags are not linked through a batch to a farm', () => {
    const result = computeShipmentReadiness({
      shipment: {
        id: 'shipment-incomplete-chain',
        destination_country: 'Netherlands',
        target_regulations: ['EUDR'],
        doc_status: allEvidence,
        storage_controls: {},
        estimated_ship_date: null,
      },
      items: [{
        item_type: 'batch',
        weight_kg: 500,
        farm_count: 1,
        traceability_complete: true,
        compliance_status: 'approved',
        batch_data: {
          has_gps: true,
          bag_count: 10,
          bags_with_farm_link: 0,
          dispatched: true,
          yield_validated: true,
        },
      }],
      compliance_profile: {
        id: 'profile-nl-demo',
        ...DUTCH_COCOA_BUYER_PROFILE_TEMPLATE,
        required_documents: [...DUTCH_COCOA_BUYER_PROFILE_TEMPLATE.required_documents],
        required_certifications: [...DUTCH_COCOA_BUYER_PROFILE_TEMPLATE.required_certifications],
        custom_rules: DUTCH_COCOA_BUYER_PROFILE_TEMPLATE.custom_rules,
      },
    });

    const traceabilityCheck = result.dimensions
      .find((dimension) => dimension.name === 'Regulatory Alignment')
      ?.requirement_checks
      ?.find((check) => check.category === 'traceability');
    expect(traceabilityCheck?.met).toBe(false);
  });
});
