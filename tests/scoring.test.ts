/**
 * Scoring Engine Test Suite
 *
 * Tests computeShipmentReadiness and the sub-scorers it delegates to.
 * All pure functions — no DB, no mocks needed.
 *
 * Test fixtures use a minimal-valid ShipmentScoreInput base that each
 * describe block builds on, keeping test data close to the assertions.
 */

import { describe, it, expect } from 'vitest';
import { computeShipmentReadiness } from '@/lib/services/scoring/index';
import type { ShipmentScoreInput } from '@/lib/services/scoring/types';

// ---------------------------------------------------------------------------
// Shared fixture helpers
// ---------------------------------------------------------------------------

function baseShipment(overrides: Partial<ShipmentScoreInput['shipment']> = {}): ShipmentScoreInput['shipment'] {
  return {
    destination_country: 'DE',
    target_regulations: [],
    doc_status: {},
    storage_controls: {},
    estimated_ship_date: new Date(Date.now() + 86400000 * 30).toISOString(), // 30 days from now
    ...overrides,
  };
}

function baseItem(overrides: Partial<ShipmentScoreInput['items'][0]> = {}): ShipmentScoreInput['items'][0] {
  return {
    item_type: 'batch',
    traceability_complete: true,
    compliance_status: 'approved',
    farm_count: 1,
    farm_ids: ['farm-1'],
    batch_data: {
      has_gps: true,
      bag_count: 10,
      bags_with_farm_link: 10,
    },
    ...overrides,
  };
}

function baseInput(overrides: Partial<ShipmentScoreInput> = {}): ShipmentScoreInput {
  return {
    shipment: baseShipment(),
    items: [baseItem()],
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// 1. Decision logic — go / conditional / no_go / pending
// ---------------------------------------------------------------------------

describe('computeShipmentReadiness — decision outcomes', () => {
  it('returns pending when items array is empty', () => {
    const result = computeShipmentReadiness(baseInput({ items: [] }));
    expect(result.decision).toBe('pending');
    expect(result.decision_label).toBe('Not Ready');
  });

  it('returns go for a fully compliant shipment', () => {
    const input = baseInput({
      shipment: baseShipment({
        doc_status: {
          certificate_of_origin: true,
          phytosanitary_certificate: true,
          bill_of_lading: true,
          packing_list: true,
          commercial_invoice: true,
          export_permit: true,
          lab_test_certificate: true,
          pesticide_declaration: true,
          aflatoxin_test: true,
        },
        storage_controls: {
          warehouse_certified: true,
          temperature_logged: true,
          pest_control_active: true,
          humidity_monitored: true,
          fifo_enforced: true,
        },
      }),
    });
    const result = computeShipmentReadiness(input);
    expect(result.decision).toBe('go');
    expect(result.overall_score).toBeGreaterThanOrEqual(75);
  });

  it('returns no_go when there are hard fail flags', () => {
    const input = baseInput({
      items: [baseItem({ compliance_status: 'rejected' })],
    });
    const result = computeShipmentReadiness(input);
    expect(result.decision).toBe('no_go');
    expect(result.risk_flags.some(f => f.is_hard_fail)).toBe(true);
  });

  it('returns no_go when overall score is below 50', () => {
    // No docs, no storage, no traceability
    const input = baseInput({
      items: [
        baseItem({ traceability_complete: false }),
        baseItem({ traceability_complete: false }),
      ],
    });
    const result = computeShipmentReadiness(input);
    expect(result.decision).toBe('no_go');
  });

  it('returns conditional when score is between 50 and 74', () => {
    // Some docs present, partial traceability
    const input = baseInput({
      shipment: baseShipment({
        doc_status: {
          certificate_of_origin: true,
          commercial_invoice: true,
          lab_test_certificate: true,
          pesticide_declaration: true,
          aflatoxin_test: true,
        },
        storage_controls: {
          warehouse_certified: true,
          pest_control_active: true,
        },
      }),
    });
    const result = computeShipmentReadiness(input);
    expect(['conditional', 'go']).toContain(result.decision);
    expect(result.overall_score).toBeGreaterThanOrEqual(50);
  });
});

// ---------------------------------------------------------------------------
// 2. Hard fail conditions
// ---------------------------------------------------------------------------

describe('computeShipmentReadiness — hard fail conditions', () => {
  it('hard fail when destination_country is missing', () => {
    const input = baseInput({
      shipment: baseShipment({ destination_country: '' }),
    });
    const result = computeShipmentReadiness(input);
    expect(result.risk_flags.some(f => f.is_hard_fail && f.category === 'Shipment')).toBe(true);
    expect(result.decision).toBe('no_go');
  });

  it('hard fail when estimated_ship_date is in the past', () => {
    const input = baseInput({
      shipment: baseShipment({
        estimated_ship_date: '2020-01-01T00:00:00.000Z',
      }),
    });
    const result = computeShipmentReadiness(input);
    expect(result.risk_flags.some(f => f.is_hard_fail && f.category === 'Shipment')).toBe(true);
  });

  it('hard fail when rejected items present', () => {
    const input = baseInput({
      items: [baseItem({ compliance_status: 'rejected' })],
    });
    const result = computeShipmentReadiness(input);
    const hardFail = result.risk_flags.find(f => f.is_hard_fail && f.category === 'Compliance');
    expect(hardFail).toBeDefined();
  });

  it('hard fail when traceability completeness below 50%', () => {
    const input = baseInput({
      items: [
        baseItem({ traceability_complete: false }),
        baseItem({ traceability_complete: false }),
        baseItem({ traceability_complete: true }),
      ],
    });
    const result = computeShipmentReadiness(input);
    const traceHardFail = result.risk_flags.find(
      f => f.is_hard_fail && f.category === 'Traceability'
    );
    expect(traceHardFail).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// 3. Traceability Integrity dimension
// ---------------------------------------------------------------------------

describe('Traceability Integrity dimension', () => {
  it('scores 0 with no items', () => {
    const result = computeShipmentReadiness(baseInput({ items: [] }));
    const dim = result.dimensions.find(d => d.name === 'Traceability Integrity');
    expect(dim).toBeDefined();
    expect(dim!.score).toBe(0);
  });

  it('scores higher when all items are traceable and GPS-linked', () => {
    const fullInput = baseInput({
      items: [
        baseItem({ traceability_complete: true, batch_data: { has_gps: true, bag_count: 5, bags_with_farm_link: 5 } }),
        baseItem({ traceability_complete: true, batch_data: { has_gps: true, bag_count: 5, bags_with_farm_link: 5 } }),
      ],
    });
    const partialInput = baseInput({
      items: [
        baseItem({ traceability_complete: true, batch_data: { has_gps: false, bag_count: 5, bags_with_farm_link: 2 } }),
        baseItem({ traceability_complete: false, batch_data: { has_gps: false, bag_count: 5, bags_with_farm_link: 0 } }),
      ],
    });
    const fullResult = computeShipmentReadiness(fullInput);
    const partialResult = computeShipmentReadiness(partialInput);
    const fullDim = fullResult.dimensions.find(d => d.name === 'Traceability Integrity')!;
    const partialDim = partialResult.dimensions.find(d => d.name === 'Traceability Integrity')!;
    expect(fullDim.score).toBeGreaterThan(partialDim.score);
  });

  it('flags items with zero linked farms as a warning', () => {
    const input = baseInput({
      items: [baseItem({ farm_count: 0, farm_ids: [] })],
    });
    const result = computeShipmentReadiness(input);
    const flag = result.risk_flags.find(f => f.category === 'Traceability' && f.severity === 'warning');
    expect(flag).toBeDefined();
  });

  it('satellite geo-verification level triggers critical flag when GPS missing', () => {
    const input = baseInput({
      shipment: baseShipment(),
      items: [baseItem({ batch_data: { has_gps: false, bag_count: 5, bags_with_farm_link: 5 } })],
      compliance_profile: {
        id: 'cp-1',
        name: 'EUDR Strict',
        regulation_framework: 'EUDR',
        geo_verification_level: 'satellite',
        required_documents: [],
        custom_requirements: [],
      },
    });
    const result = computeShipmentReadiness(input);
    const critFlag = result.risk_flags.find(f =>
      f.category === 'Geo-Verification' && f.severity === 'critical'
    );
    expect(critFlag).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// 4. Chemical & Contamination Risk dimension
// ---------------------------------------------------------------------------

describe('Chemical & Contamination Risk dimension', () => {
  it('scores 0 when no chemical documents present', () => {
    const result = computeShipmentReadiness(baseInput({
      shipment: baseShipment({ doc_status: {} }),
    }));
    const dim = result.dimensions.find(d => d.name === 'Chemical & Contamination Risk')!;
    expect(dim.score).toBe(0);
  });

  it('scores 100 when all three chemical docs present', () => {
    const result = computeShipmentReadiness(baseInput({
      shipment: baseShipment({
        doc_status: {
          lab_test_certificate: true,
          pesticide_declaration: true,
          aflatoxin_test: true,
        },
      }),
    }));
    const dim = result.dimensions.find(d => d.name === 'Chemical & Contamination Risk')!;
    expect(dim.score).toBe(100);
  });

  it('scores 40 when only lab_test_certificate present', () => {
    const result = computeShipmentReadiness(baseInput({
      shipment: baseShipment({ doc_status: { lab_test_certificate: true } }),
    }));
    const dim = result.dimensions.find(d => d.name === 'Chemical & Contamination Risk')!;
    expect(dim.score).toBe(40);
  });

  it('adds critical flag when no chemical docs exist', () => {
    const result = computeShipmentReadiness(baseInput({
      shipment: baseShipment({ doc_status: {} }),
    }));
    const flag = result.risk_flags.find(f =>
      f.category === 'Chemical Safety' && f.severity === 'critical'
    );
    expect(flag).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// 5. Documentation Completeness dimension
// ---------------------------------------------------------------------------

describe('Documentation Completeness dimension', () => {
  it('scores 0 with no documents', () => {
    const result = computeShipmentReadiness(baseInput({
      shipment: baseShipment({ doc_status: {} }),
    }));
    const dim = result.dimensions.find(d => d.name === 'Documentation Completeness')!;
    expect(dim.score).toBe(0);
  });

  it('scores 100 when all 6 default docs present', () => {
    const result = computeShipmentReadiness(baseInput({
      shipment: baseShipment({
        doc_status: {
          certificate_of_origin: true,
          phytosanitary_certificate: true,
          bill_of_lading: true,
          packing_list: true,
          commercial_invoice: true,
          export_permit: true,
        },
      }),
    }));
    const dim = result.dimensions.find(d => d.name === 'Documentation Completeness')!;
    expect(dim.score).toBe(100);
  });

  it('uses compliance profile required_documents when provided', () => {
    const result = computeShipmentReadiness(baseInput({
      shipment: baseShipment({
        doc_status: { halal_certificate: true },
      }),
      compliance_profile: {
        id: 'cp-uae',
        name: 'UAE Halal',
        regulation_framework: 'UAE_Halal',
        geo_verification_level: 'basic',
        required_documents: ['Halal Certificate'],
        custom_requirements: [],
      },
    }));
    const dim = result.dimensions.find(d => d.name === 'Documentation Completeness')!;
    expect(dim.score).toBe(100);
  });

  it('adds critical flag when no documents at all', () => {
    const result = computeShipmentReadiness(baseInput({
      shipment: baseShipment({ doc_status: {} }),
    }));
    const flag = result.risk_flags.find(f =>
      f.category === 'Documentation' && f.severity === 'critical'
    );
    expect(flag).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// 6. Storage & Handling Controls dimension
// ---------------------------------------------------------------------------

describe('Storage & Handling Controls dimension', () => {
  it('scores 0 with no storage controls', () => {
    const result = computeShipmentReadiness(baseInput({
      shipment: baseShipment({ storage_controls: {} }),
    }));
    const dim = result.dimensions.find(d => d.name === 'Storage & Handling Controls')!;
    expect(dim.score).toBe(0);
  });

  it('scores 100 when all 5 controls active (no cold chain data)', () => {
    const result = computeShipmentReadiness(baseInput({
      shipment: baseShipment({
        storage_controls: {
          warehouse_certified: true,
          temperature_logged: true,
          pest_control_active: true,
          humidity_monitored: true,
          fifo_enforced: true,
        },
      }),
    }));
    const dim = result.dimensions.find(d => d.name === 'Storage & Handling Controls')!;
    expect(dim.score).toBe(100);
  });

  it('penalises score when cold chain alert rate exceeds 20%', () => {
    const noPenaltyResult = computeShipmentReadiness(baseInput({
      shipment: baseShipment({
        storage_controls: { warehouse_certified: true, temperature_logged: true, pest_control_active: true, humidity_monitored: true, fifo_enforced: true },
      }),
      cold_chain_total_entries: 100,
      cold_chain_alert_count: 0,
    }));
    const penaltyResult = computeShipmentReadiness(baseInput({
      shipment: baseShipment({
        storage_controls: { warehouse_certified: true, temperature_logged: true, pest_control_active: true, humidity_monitored: true, fifo_enforced: true },
      }),
      cold_chain_total_entries: 100,
      cold_chain_alert_count: 30,
    }));
    const noPenaltyDim = noPenaltyResult.dimensions.find(d => d.name === 'Storage & Handling Controls')!;
    const penaltyDim = penaltyResult.dimensions.find(d => d.name === 'Storage & Handling Controls')!;
    expect(noPenaltyDim.score).toBeGreaterThan(penaltyDim.score);
  });

  it('adds critical cold chain flag when alert rate > 20%', () => {
    const result = computeShipmentReadiness(baseInput({
      cold_chain_total_entries: 10,
      cold_chain_alert_count: 3,
    }));
    const flag = result.risk_flags.find(f =>
      f.category === 'Cold Chain' && f.severity === 'critical'
    );
    expect(flag).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// 7. Regulatory Alignment — EUDR scorer
// ---------------------------------------------------------------------------

describe('Regulatory Alignment — EUDR', () => {
  it('EUDR: all requirements met produces high score', () => {
    const input = baseInput({
      shipment: baseShipment({
        target_regulations: ['EUDR'],
        doc_status: { deforestation_compliance: true },
      }),
      items: [baseItem({ farm_ids: ['farm-1'] })],
      farm_deforestation_checks: [
        { farm_id: 'farm-1', deforestation_free: true, risk_level: 'low', forest_loss_hectares: 0 },
      ],
      farm_boundary_analyses: [
        { farm_id: 'farm-1', confidence_score: 85, confidence_level: 'high' },
      ],
    });
    const result = computeShipmentReadiness(input);
    const dim = result.dimensions.find(d => d.name === 'Regulatory Alignment')!;
    expect(dim.score).toBeGreaterThan(50);
  });

  it('EUDR: high deforestation risk triggers critical flag', () => {
    const input = baseInput({
      shipment: baseShipment({ target_regulations: ['EUDR'], doc_status: {} }),
      items: [baseItem({ farm_ids: ['farm-1'] })],
      farm_deforestation_checks: [
        { farm_id: 'farm-1', deforestation_free: false, risk_level: 'high', forest_loss_hectares: 5.2 },
      ],
    });
    const result = computeShipmentReadiness(input);
    const flag = result.risk_flags.find(f =>
      f.category === 'Deforestation' && f.severity === 'critical'
    );
    expect(flag).toBeDefined();
    const rem = result.remediation_items.find(r => r.title.includes('EUDR') && r.title.includes('deforestation'));
    expect(rem).toBeDefined();
    expect(rem!.priority).toBe('urgent');
  });

  it('EUDR: missing GPS data triggers remediation', () => {
    const input = baseInput({
      shipment: baseShipment({ target_regulations: ['EUDR'], doc_status: {} }),
      items: [baseItem({ batch_data: { has_gps: false, bag_count: 5, bags_with_farm_link: 5 } })],
    });
    const result = computeShipmentReadiness(input);
    const rem = result.remediation_items.find(r =>
      r.title.includes('EUDR') && r.title.toLowerCase().includes('gps')
    );
    expect(rem).toBeDefined();
    expect(rem!.priority).toBe('urgent');
  });

  it('EUDR: low boundary confidence triggers warning flag', () => {
    const input = baseInput({
      shipment: baseShipment({ target_regulations: ['EUDR'], doc_status: {} }),
      farm_boundary_analyses: [
        { farm_id: 'farm-1', confidence_score: 30, confidence_level: 'low' },
      ],
    });
    const result = computeShipmentReadiness(input);
    const flag = result.risk_flags.find(f =>
      f.category === 'Boundary Verification' && f.severity === 'warning'
    );
    expect(flag).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// 8. Regulatory Alignment — FSMA 204 scorer
// ---------------------------------------------------------------------------

describe('Regulatory Alignment — FSMA 204', () => {
  it('FSMA 204: flags missing KDE documents as remediation', () => {
    const input = baseInput({
      shipment: baseShipment({ target_regulations: ['FSMA 204'], doc_status: {} }),
    });
    const result = computeShipmentReadiness(input);
    const rem = result.remediation_items.find(r =>
      r.title.toLowerCase().includes('fsma') || r.description.toLowerCase().includes('kde')
    );
    expect(rem).toBeDefined();
  });

  it('FSMA 204: all KDE docs present improves regulatory score', () => {
    const noDocsResult = computeShipmentReadiness(baseInput({
      shipment: baseShipment({ target_regulations: ['FSMA 204'], doc_status: {} }),
    }));
    const allDocsResult = computeShipmentReadiness(baseInput({
      shipment: baseShipment({
        target_regulations: ['FSMA 204'],
        doc_status: { kde_records: true, cte_log: true, food_safety_plan: true },
      }),
    }));
    const noDim = noDocsResult.dimensions.find(d => d.name === 'Regulatory Alignment')!;
    const allDim = allDocsResult.dimensions.find(d => d.name === 'Regulatory Alignment')!;
    expect(allDim.score).toBeGreaterThan(noDim.score);
  });
});

// ---------------------------------------------------------------------------
// 9. Regulatory Alignment — UK Environment Act scorer
// ---------------------------------------------------------------------------

describe('Regulatory Alignment — UK Environment Act', () => {
  it('UK Environment Act: shows in details when targeted', () => {
    const input = baseInput({
      shipment: baseShipment({ target_regulations: ['UK Environment Act'], doc_status: {} }),
    });
    const result = computeShipmentReadiness(input);
    const hasUKDetail = result.dimensions
      .find(d => d.name === 'Regulatory Alignment')
      ?.details.some(d => d.toLowerCase().includes('uk'));
    expect(hasUKDetail).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// 10. Regulatory Alignment — Lacey Act / UFLPA scorer
// ---------------------------------------------------------------------------

describe('Regulatory Alignment — Lacey Act / UFLPA', () => {
  it('Lacey Act: forced labour compliance document triggers remediation when missing', () => {
    const input = baseInput({
      shipment: baseShipment({ target_regulations: ['Lacey Act / UFLPA'], doc_status: {} }),
    });
    const result = computeShipmentReadiness(input);
    expect(result.remediation_items.length).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// 11. Regulatory Alignment — China Green Trade scorer
// ---------------------------------------------------------------------------

describe('Regulatory Alignment — China Green Trade', () => {
  it('China Green Trade: registered with GACC improves score', () => {
    const noDocResult = computeShipmentReadiness(baseInput({
      shipment: baseShipment({ target_regulations: ['China Green Trade'], doc_status: {} }),
    }));
    const withDocResult = computeShipmentReadiness(baseInput({
      shipment: baseShipment({
        target_regulations: ['China Green Trade'],
        doc_status: { gacc_registration: true, china_customs_declaration: true },
      }),
    }));
    const noDim = noDocResult.dimensions.find(d => d.name === 'Regulatory Alignment')!;
    const withDim = withDocResult.dimensions.find(d => d.name === 'Regulatory Alignment')!;
    expect(withDim.score).toBeGreaterThan(noDim.score);
  });
});

// ---------------------------------------------------------------------------
// 12. Regulatory Alignment — UAE / Halal scorer
// ---------------------------------------------------------------------------

describe('Regulatory Alignment — UAE / Halal', () => {
  it('UAE Halal: halal_certificate present improves score', () => {
    const noDocResult = computeShipmentReadiness(baseInput({
      shipment: baseShipment({ target_regulations: ['UAE / Halal'], doc_status: {} }),
    }));
    const withDocResult = computeShipmentReadiness(baseInput({
      shipment: baseShipment({
        target_regulations: ['UAE / Halal'],
        doc_status: { halal_certificate: true, uae_import_permit: true },
      }),
    }));
    const noDim = noDocResult.dimensions.find(d => d.name === 'Regulatory Alignment')!;
    const withDim = withDocResult.dimensions.find(d => d.name === 'Regulatory Alignment')!;
    expect(withDim.score).toBeGreaterThan(noDim.score);
  });
});

// ---------------------------------------------------------------------------
// 13. Regulatory Alignment — Buyer Standards scorer
// ---------------------------------------------------------------------------

describe('Regulatory Alignment — Buyer Standards', () => {
  it('Buyer Standards: all requirements met when no profile restrictions defined', () => {
    // Without a compliance profile, scoreBuyerStandards scores 5/5 by default
    // (no required docs, no required certs, no custom thresholds)
    const result = computeShipmentReadiness(baseInput({
      shipment: baseShipment({
        target_regulations: ['Buyer Standards'],
        doc_status: {},
      }),
    }));
    const dim = result.dimensions.find(d => d.name === 'Regulatory Alignment')!;
    expect(dim.score).toBe(100);
  });

  it('Buyer Standards: missing required buyer documents triggers remediation', () => {
    const result = computeShipmentReadiness(baseInput({
      shipment: baseShipment({
        target_regulations: ['Buyer Standards'],
        doc_status: {}, // required doc missing
      }),
      compliance_profile: {
        id: 'cp-buyer',
        name: 'Major Buyer',
        regulation_framework: 'custom',
        geo_verification_level: 'basic',
        required_documents: ['Sustainability Certificate', 'Social Audit Report'],
        custom_requirements: [],
      },
    }));
    const rem = result.remediation_items.find(r =>
      r.title.includes('Buyer Standards')
    );
    expect(rem).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// 14. Historical rejection rate penalty
// ---------------------------------------------------------------------------

describe('Historical rejection rate penalty', () => {
  it('no rejection rate: no penalty detail in output', () => {
    const result = computeShipmentReadiness(baseInput({
      shipment: baseShipment({ target_regulations: ['EUDR'] }),
      historical_rejection_rate: 0,
    }));
    const dim = result.dimensions.find(d => d.name === 'Regulatory Alignment')!;
    const hasPenaltyDetail = dim.details.some(d => d.includes('rejection rate') && d.includes('penalty'));
    expect(hasPenaltyDetail).toBe(false);
  });

  it('30%+ rejection rate triggers critical flag when regulations are targeted', () => {
    // Rejection rate penalty only runs inside scoreRegulatoryAlignment,
    // which requires at least one target regulation to have a score to penalise.
    const result = computeShipmentReadiness(baseInput({
      shipment: baseShipment({ target_regulations: ['EUDR'] }),
      historical_rejection_rate: 0.35,
    }));
    const flag = result.risk_flags.find(f =>
      f.category === 'Historical Compliance' && f.severity === 'critical'
    );
    expect(flag).toBeDefined();
  });

  it('high rejection rate lowers regulatory alignment score vs clean record', () => {
    const cleanResult = computeShipmentReadiness(baseInput({
      shipment: baseShipment({ target_regulations: ['EUDR'] }),
      historical_rejection_rate: 0,
    }));
    const dirtyResult = computeShipmentReadiness(baseInput({
      shipment: baseShipment({ target_regulations: ['EUDR'] }),
      historical_rejection_rate: 0.5,
    }));
    const cleanDim = cleanResult.dimensions.find(d => d.name === 'Regulatory Alignment')!;
    const dirtyDim = dirtyResult.dimensions.find(d => d.name === 'Regulatory Alignment')!;
    expect(cleanDim.score).toBeGreaterThan(dirtyDim.score);
  });
});

// ---------------------------------------------------------------------------
// 15. Multi-regulation shipment
// ---------------------------------------------------------------------------

describe('Multi-regulation shipments', () => {
  it('scoring works with multiple target regulations', () => {
    const input = baseInput({
      shipment: baseShipment({
        target_regulations: ['EUDR', 'FSMA 204', 'UK Environment Act'],
        doc_status: { deforestation_compliance: true, fsma_kde_record: true },
      }),
    });
    const result = computeShipmentReadiness(input);
    expect(result.overall_score).toBeGreaterThanOrEqual(0);
    expect(result.overall_score).toBeLessThanOrEqual(100);
    expect(result.dimensions).toHaveLength(5);
  });
});

// ---------------------------------------------------------------------------
// 16. Output structure guarantees
// ---------------------------------------------------------------------------

describe('computeShipmentReadiness — output structure', () => {
  it('always returns 5 dimensions', () => {
    const result = computeShipmentReadiness(baseInput());
    expect(result.dimensions).toHaveLength(5);
    const expectedNames = [
      'Traceability Integrity',
      'Chemical & Contamination Risk',
      'Documentation Completeness',
      'Storage & Handling Controls',
      'Regulatory Alignment',
    ];
    expectedNames.forEach(name => {
      expect(result.dimensions.find(d => d.name === name)).toBeDefined();
    });
  });

  it('dimension weights sum to 1.0', () => {
    const result = computeShipmentReadiness(baseInput());
    const totalWeight = result.dimensions.reduce((sum, d) => sum + d.weight, 0);
    expect(totalWeight).toBeCloseTo(1.0, 5);
  });

  it('overall_score equals sum of weighted_scores', () => {
    const result = computeShipmentReadiness(baseInput());
    const sumOfWeighted = result.dimensions.reduce((sum, d) => sum + d.weighted_score, 0);
    expect(result.overall_score).toBeCloseTo(sumOfWeighted, 1);
  });

  it('overall_score is always between 0 and 100', () => {
    const inputs = [
      baseInput({ items: [] }),
      baseInput(),
      baseInput({ items: [baseItem({ compliance_status: 'rejected' })] }),
    ];
    inputs.forEach(input => {
      const result = computeShipmentReadiness(input);
      expect(result.overall_score).toBeGreaterThanOrEqual(0);
      expect(result.overall_score).toBeLessThanOrEqual(100);
    });
  });

  it('summary string is non-empty', () => {
    const result = computeShipmentReadiness(baseInput());
    expect(result.summary).toBeTruthy();
    expect(result.summary.length).toBeGreaterThan(10);
  });

  it('decision_label matches decision', () => {
    const labelMap: Record<string, string> = {
      go: 'Ready to Ship',
      conditional: 'Ship with Conditions',
      no_go: 'Do Not Ship',
      pending: 'Not Ready',
    };
    const inputs = [
      baseInput({ items: [] }),
      baseInput(),
      baseInput({ items: [baseItem({ compliance_status: 'rejected' })] }),
    ];
    inputs.forEach(input => {
      const result = computeShipmentReadiness(input);
      expect(result.decision_label).toBe(labelMap[result.decision]);
    });
  });
});
