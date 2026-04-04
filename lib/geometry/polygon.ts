/**
 * Pure-JS polygon geometry utilities for farm boundary conflict detection.
 * No external dependencies — uses Sutherland-Hodgman clipping + Shoelace area.
 */

type Coord = [number, number]; // [lng, lat]

// ─── Shoelace area ────────────────────────────────────────────────────────────

export function polygonArea(ring: Coord[]): number {
  let area = 0;
  const n = ring.length;
  for (let i = 0, j = n - 1; i < n; j = i++) {
    area += (ring[j][0] + ring[i][0]) * (ring[j][1] - ring[i][1]);
  }
  return Math.abs(area / 2);
}

// ─── Sutherland-Hodgman polygon clipping ─────────────────────────────────────

function isInside(p: Coord, a: Coord, b: Coord): boolean {
  return (b[0] - a[0]) * (p[1] - a[1]) - (b[1] - a[1]) * (p[0] - a[0]) >= 0;
}

function lineIntersect(p1: Coord, p2: Coord, p3: Coord, p4: Coord): Coord {
  const dx1 = p2[0] - p1[0], dy1 = p2[1] - p1[1];
  const dx2 = p4[0] - p3[0], dy2 = p4[1] - p3[1];
  const denom = dx1 * dy2 - dy1 * dx2;
  if (Math.abs(denom) < 1e-12) return p1;
  const t = ((p3[0] - p1[0]) * dy2 - (p3[1] - p1[1]) * dx2) / denom;
  return [p1[0] + t * dx1, p1[1] + t * dy1];
}

function clipPolygonByEdge(poly: Coord[], a: Coord, b: Coord): Coord[] {
  if (poly.length === 0) return [];
  const output: Coord[] = [];
  for (let i = 0; i < poly.length; i++) {
    const cur = poly[i];
    const prev = poly[(i + poly.length - 1) % poly.length];
    const curIn = isInside(cur, a, b);
    const prevIn = isInside(prev, a, b);
    if (curIn) {
      if (!prevIn) output.push(lineIntersect(prev, cur, a, b));
      output.push(cur);
    } else if (prevIn) {
      output.push(lineIntersect(prev, cur, a, b));
    }
  }
  return output;
}

export function intersectPolygons(subj: Coord[], clip: Coord[]): Coord[] {
  let output = subj.slice();
  const n = clip.length;
  for (let i = 0; i < n; i++) {
    if (output.length === 0) return [];
    output = clipPolygonByEdge(output, clip[i], clip[(i + 1) % n]);
  }
  return output;
}

// ─── Overlap ratio ────────────────────────────────────────────────────────────

/**
 * Returns the overlap ratio as intersection_area / min(area_a, area_b).
 * Returns 0 if either polygon has no area or no intersection.
 */
export function computeOverlapRatio(ringA: Coord[], ringB: Coord[]): number {
  if (ringA.length < 3 || ringB.length < 3) return 0;
  const areaA = polygonArea(ringA);
  const areaB = polygonArea(ringB);
  if (areaA === 0 || areaB === 0) return 0;
  const intersection = intersectPolygons(ringA, ringB);
  if (intersection.length < 3) return 0;
  const interArea = polygonArea(intersection);
  return interArea / Math.min(areaA, areaB);
}

// ─── Bounding-box pre-filter ──────────────────────────────────────────────────

function bbox(ring: Coord[]): [number, number, number, number] {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const [x, y] of ring) {
    if (x < minX) minX = x; if (x > maxX) maxX = x;
    if (y < minY) minY = y; if (y > maxY) maxY = y;
  }
  return [minX, minY, maxX, maxY];
}

function bboxOverlap(a: [number,number,number,number], b: [number,number,number,number]): boolean {
  return a[0] <= b[2] && a[2] >= b[0] && a[1] <= b[3] && a[3] >= b[1];
}

// ─── Public detection API ─────────────────────────────────────────────────────

export interface FarmGeom {
  id: number;
  farmer_name: string;
  ring: Coord[];
}

export interface DetectedConflict {
  farm_a_id: number;
  farm_b_id: number;
  overlap_ratio: number;
}

/**
 * Scans all farm pairs and returns pairs with overlap ratio > threshold (default 0.10).
 */
export function detectConflicts(farms: FarmGeom[], threshold = 0.10): DetectedConflict[] {
  const conflicts: DetectedConflict[] = [];
  const bboxes = farms.map(f => bbox(f.ring));

  for (let i = 0; i < farms.length; i++) {
    for (let j = i + 1; j < farms.length; j++) {
      // Quick bbox reject
      if (!bboxOverlap(bboxes[i], bboxes[j])) continue;
      const ratio = computeOverlapRatio(farms[i].ring, farms[j].ring);
      if (ratio >= threshold) {
        conflicts.push({
          farm_a_id: farms[i].id,
          farm_b_id: farms[j].id,
          overlap_ratio: ratio,
        });
      }
    }
  }
  return conflicts;
}
