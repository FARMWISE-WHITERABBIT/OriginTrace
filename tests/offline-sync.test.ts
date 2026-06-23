import { describe, expect, it } from 'vitest';
import {
  FIELD_WORK_SYNC_ORDER,
  applyFarmMappingsToBatch,
  batchHasUnresolvedFarmDependencies,
  isLocalFarmId,
} from '../lib/offline/sync-service';
import type { PendingBatch } from '../lib/offline/sync-store';

function batch(overrides: Partial<PendingBatch> = {}): PendingBatch {
  return {
    id: 'batch-local-1',
    local_id: 'batch-local-1',
    batch_id: 'BAT-001',
    farm_id: 'farm-local-1',
    local_farm_id: 'farm-local-1',
    contributors: [
      {
        farm_id: 'farm-local-1',
        local_farm_id: 'farm-local-1',
        farmer_name: 'Ada Farmer',
        bag_count: 2,
        weight_kg: 120,
      },
    ],
    bags: [
      { serial: '', weight: 60, grade: 'A', is_compliant: true },
      { serial: '', weight: 60, grade: 'A', is_compliant: true },
    ],
    collected_at: '2026-05-26T10:00:00.000Z',
    status: 'pending',
    created_at: '2026-05-26T10:00:00.000Z',
    ...overrides,
  };
}

describe('offline field-work sync helpers', () => {
  it('keeps the production sync order dependency-safe', () => {
    expect(FIELD_WORK_SYNC_ORDER).toEqual(['farms', 'uploads', 'ocr', 'boundaries', 'batches', 'status']);
    expect(FIELD_WORK_SYNC_ORDER.indexOf('farms')).toBeLessThan(FIELD_WORK_SYNC_ORDER.indexOf('batches'));
    expect(FIELD_WORK_SYNC_ORDER.indexOf('farms')).toBeLessThan(FIELD_WORK_SYNC_ORDER.indexOf('boundaries'));
  });

  it('detects local farm IDs that require server mapping', () => {
    expect(isLocalFarmId('farm-123')).toBe(true);
    expect(isLocalFarmId('offline-123')).toBe(true);
    expect(isLocalFarmId('temp-123')).toBe(true);
    expect(isLocalFarmId('local-123')).toBe(true);
    expect(isLocalFarmId('0f2f1714-19fb-41d3-a60d-7df4e97ab931')).toBe(false);
  });

  it('blocks batch sync until every local farm reference is resolved', () => {
    expect(batchHasUnresolvedFarmDependencies(batch(), new Map())).toBe(true);

    const mappings = new Map([['farm-local-1', '0f2f1714-19fb-41d3-a60d-7df4e97ab931']]);
    expect(batchHasUnresolvedFarmDependencies(batch(), mappings)).toBe(false);
  });

  it('rewrites batch and contributor farm IDs using id mappings', () => {
    const mappings = new Map([['farm-local-1', '0f2f1714-19fb-41d3-a60d-7df4e97ab931']]);
    const resolved = applyFarmMappingsToBatch(batch(), mappings);

    expect(resolved.farm_id).toBe('0f2f1714-19fb-41d3-a60d-7df4e97ab931');
    expect(resolved.contributors[0].farm_id).toBe('0f2f1714-19fb-41d3-a60d-7df4e97ab931');
  });
});
