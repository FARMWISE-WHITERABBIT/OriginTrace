import { describe, expect, it } from 'vitest';
import { extractRequirementChecks } from '@/app/api/buyer/shipments/[id]/proof-status/route';

describe('buyer shipment proof requirement extraction', () => {
  it('extracts persisted document, certification, geo, and traceability checks', () => {
    const checks = extractRequirementChecks([
      { name: 'Traceability Integrity', score: 100 },
      {
        name: 'Regulatory Alignment',
        requirement_checks: [
          { key: 'commercial_invoice', label: 'Commercial Invoice', category: 'document', met: true, private_requirement: false },
          { key: 'rainforest_alliance', label: 'Rainforest Alliance Certificate', category: 'certification', met: false, private_requirement: true },
          { key: 'geolocation_polygon', label: 'Polygon geolocation', category: 'geolocation', met: true, private_requirement: false },
          { key: 'traceability_depth_3', label: 'Traceability depth 3', category: 'traceability', met: true, private_requirement: false },
        ],
      },
    ]);

    expect(checks).toHaveLength(4);
    expect(checks.find((check) => check.category === 'certification')).toMatchObject({
      met: false,
      private_requirement: true,
    });
  });

  it('fails closed for malformed or absent score breakdown data', () => {
    expect(extractRequirementChecks(null)).toEqual([]);
    expect(extractRequirementChecks({ requirement_checks: [] })).toEqual([]);
    expect(extractRequirementChecks([{
      requirement_checks: [
        { key: 'missing-fields' },
        { key: 'bad-category', label: 'Bad', category: 'unknown', met: true, private_requirement: false },
      ],
    }])).toEqual([]);
  });
});
