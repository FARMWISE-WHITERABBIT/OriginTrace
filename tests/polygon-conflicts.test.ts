import { describe, expect, it } from 'vitest';
import { computeOverlapRatio, detectConflicts } from '@/lib/geometry/polygon';

const squareA: [number, number][] = [
  [3, 7], [3.01, 7], [3.01, 7.01], [3, 7.01], [3, 7],
];

describe('farm boundary conflict geometry', () => {
  it('detects closed GeoJSON rings regardless of winding order', () => {
    const clockwise = [...squareA].reverse() as [number, number][];
    const shifted: [number, number][] = [
      [3.005, 7.005], [3.015, 7.005], [3.015, 7.015], [3.005, 7.015], [3.005, 7.005],
    ];

    expect(computeOverlapRatio(clockwise, shifted)).toBeCloseTo(0.25, 5);
    const conflicts = detectConflicts([
      { id: 'a', farmer_name: 'A', ring: clockwise },
      { id: 'b', farmer_name: 'B', ring: shifted },
    ]);
    expect(conflicts).toHaveLength(1);
    expect(conflicts[0]).toMatchObject({ farm_a_id: 'a', farm_b_id: 'b' });
    expect(conflicts[0].overlap_ratio).toBeCloseTo(0.25, 5);
  });

  it('does not report polygons that only touch at an edge', () => {
    const touching: [number, number][] = [
      [3.01, 7], [3.02, 7], [3.02, 7.01], [3.01, 7.01], [3.01, 7],
    ];
    expect(computeOverlapRatio(squareA, touching)).toBe(0);
  });
});
