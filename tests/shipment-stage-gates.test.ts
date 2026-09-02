import { describe, it, expect } from 'vitest';
import { validateReadinessHardGate, validateStageGate, type ShipmentForGate } from '../lib/services/shipment-stages';

function baseShipment(overrides: Partial<ShipmentForGate> = {}): ShipmentForGate {
  return {
    id: 'ship-1',
    current_stage: 6,
    compliance_profile_id: '1',
    purchase_order_number: 'PO-1',
    inspection_body: 'SON',
    inspection_result: 'pass',
    doc_status: { commercial_invoice: true, packing_list: true, phyto: true, coo: true },
    clearing_agent_name: 'Agent',
    customs_declaration_number: 'NCS-1',
    exit_certificate_number: 'EXIT-1',
    freight_forwarder_name: 'FF',
    vessel_name: 'MSC One',
    etd: '2026-06-01',
    eta: '2026-06-30',
    container_number: 'CONT-1',
    container_seal_number: 'SEAL-1',
    actual_departure_date: null,
    bill_of_lading_number: null,
    actual_arrival_date: null,
    shipment_outcome: null,
    target_regulations: ['EUDR'],
    readiness_score: 85,
    readiness_decision: 'GO',
    ...overrides,
  };
}

describe('shipment readiness hard gate', () => {
  it('blocks stage 7 advancement when readiness decision is NO_GO', () => {
    const result = validateReadinessHardGate(baseShipment({ readiness_decision: 'NO_GO' }), 7);
    expect(result.valid).toBe(false);
    expect(result.blockers.join(' ')).toContain('NO_GO');
  });

  it('blocks stage 7 advancement when readiness score is below threshold', () => {
    const result = validateReadinessHardGate(baseShipment({ readiness_score: 72 }), 7);
    expect(result.valid).toBe(false);
    expect(result.blockers.join(' ')).toContain('Minimum score is 80');
  });

  it('allows stage 7 advancement when score and decision pass', () => {
    const result = validateReadinessHardGate(baseShipment({ readiness_score: 90, readiness_decision: 'GO' }), 7);
    expect(result.valid).toBe(true);
  });

  it('does not apply readiness hard gate before stage 7', () => {
    const result = validateReadinessHardGate(baseShipment({ readiness_score: 10, readiness_decision: 'NO_GO' }), 6);
    expect(result.valid).toBe(true);
  });
});

describe('stage gate baseline behavior remains intact', () => {
  it('still enforces non-skippable stage transitions', () => {
    const shipment = baseShipment({ current_stage: 4 });
    const result = validateStageGate(shipment, 6);
    expect(result.valid).toBe(false);
    expect(result.blockers.join(' ')).toContain('Cannot skip stages');
  });
});
