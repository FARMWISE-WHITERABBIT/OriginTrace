export interface BoundaryAnalysisResult {
  confidence_score: number;
  confidence_level: 'high' | 'medium' | 'low';
  flags: {
    shape_regularity: { score: number; detail: string };
    vertex_spacing: { score: number; detail: string };
    area_plausibility: { score: number; detail: string };
    location_plausibility: { score: number; detail: string };
    edge_straightness: { score: number; detail: string };
  };
  analyzed_at: string;
}

interface Coord {
  lng: number;
  lat: number;
}

function toRadians(deg: number): number {
  return (deg * Math.PI) / 180;
}

function haversineDistance(a: Coord, b: Coord): number {
  const R = 6371000;
  const dLat = toRadians(b.lat - a.lat);
  const dLng = toRadians(b.lng - a.lng);
  const sinLat = Math.sin(dLat / 2);
  const sinLng = Math.sin(dLng / 2);
  const h = sinLat * sinLat + Math.cos(toRadians(a.lat)) * Math.cos(toRadians(b.lat)) * sinLng * sinLng;
  return 2 * R * Math.asin(Math.sqrt(h));
}

function angleBetweenEdges(a: Coord, b: Coord, c: Coord): number {
  const v1 = { lng: a.lng - b.lng, lat: a.lat - b.lat };
  const v2 = { lng: c.lng - b.lng, lat: c.lat - b.lat };
  const dot = v1.lng * v2.lng + v1.lat * v2.lat;
  const mag1 = Math.sqrt(v1.lng * v1.lng + v1.lat * v1.lat);
  const mag2 = Math.sqrt(v2.lng * v2.lng + v2.lat * v2.lat);
  if (mag1 === 0 || mag2 === 0) return 0;
  const cosAngle = Math.max(-1, Math.min(1, dot / (mag1 * mag2)));
  return (Math.acos(cosAngle) * 180) / Math.PI;
}

function computePolygonAreaHectares(coords: Coord[]): number {
  if (coords.length < 3) return 0;
  const R = 6371000;
  let area = 0;
  const n = coords.length;
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    area += toRadians(coords[j].lng - coords[i].lng) *
      (2 + Math.sin(toRadians(coords[i].lat)) + Math.sin(toRadians(coords[j].lat)));
  }
  area = Math.abs((area * R * R) / 2);
  return area / 10000;
}

function checkShapeRegularity(coords: Coord[]): { score: number; detail: string } {
  if (coords.length < 3) return { score: 0, detail: 'Too few vertices to assess shape' };

  const n = coords.length;
  const angles: number[] = [];
  for (let i = 0; i < n; i++) {
    const a = coords[(i - 1 + n) % n];
    const b = coords[i];
    const c = coords[(i + 1) % n];
    angles.push(angleBetweenEdges(a, b, c));
  }

  if (n === 4) {
    const rightAngleCount = angles.filter(a => Math.abs(a - 90) < 8).length;
    if (rightAngleCount >= 3) {
      return { score: 15, detail: 'Near-perfect rectangle detected (4 right angles) — suspicious, real farm boundaries are irregular' };
    }
    if (rightAngleCount >= 2) {
      return { score: 40, detail: 'Two near-right angles — somewhat regular shape' };
    }
  }

  const meanAngle = angles.reduce((s, a) => s + a, 0) / angles.length;
  const angleVariance = angles.reduce((s, a) => s + (a - meanAngle) ** 2, 0) / angles.length;
  const cv = Math.sqrt(angleVariance) / (meanAngle || 1);

  if (cv < 0.05) {
    return { score: 20, detail: `Very uniform angles (CV=${(cv * 100).toFixed(1)}%) — suspiciously regular` };
  }
  if (cv < 0.15) {
    return { score: 55, detail: `Moderately uniform angles (CV=${(cv * 100).toFixed(1)}%)` };
  }
  if (cv < 0.35) {
    return { score: 80, detail: `Good angle variation (CV=${(cv * 100).toFixed(1)}%) — natural boundary` };
  }
  return { score: 95, detail: `High angle variation (CV=${(cv * 100).toFixed(1)}%) — very natural boundary` };
}

function checkVertexSpacing(coords: Coord[]): { score: number; detail: string } {
  if (coords.length < 3) return { score: 0, detail: 'Too few vertices' };

  const n = coords.length;
  const distances: number[] = [];
  for (let i = 0; i < n; i++) {
    distances.push(haversineDistance(coords[i], coords[(i + 1) % n]));
  }

  const meanDist = distances.reduce((s, d) => s + d, 0) / distances.length;
  if (meanDist === 0) return { score: 0, detail: 'All vertices at same location' };

  const cv = Math.sqrt(distances.reduce((s, d) => s + (d - meanDist) ** 2, 0) / distances.length) / meanDist;

  if (cv < 0.05) {
    return { score: 15, detail: `Nearly identical edge lengths (CV=${(cv * 100).toFixed(1)}%) — suggests drawn polygon, not GPS-walked` };
  }
  if (cv < 0.15) {
    return { score: 40, detail: `Low edge length variation (CV=${(cv * 100).toFixed(1)}%) — possibly drawn` };
  }
  if (cv < 0.4) {
    return { score: 75, detail: `Moderate edge length variation (CV=${(cv * 100).toFixed(1)}%) — plausible GPS walk` };
  }
  return { score: 95, detail: `High edge length variation (CV=${(cv * 100).toFixed(1)}%) — consistent with GPS walking` };
}

function checkAreaPlausibility(coords: Coord[], commodity?: string): { score: number; detail: string } {
  const areaHa = computePolygonAreaHectares(coords);

  const commodityRanges: Record<string, { min: number; max: number }> = {
    cocoa: { min: 0.2, max: 30 },
    coffee: { min: 0.1, max: 25 },
    cashew: { min: 0.5, max: 50 },
    palm_kernel: { min: 1, max: 100 },
    rubber: { min: 1, max: 80 },
    shea: { min: 0.5, max: 40 },
    sesame: { min: 0.2, max: 30 },
    groundnut: { min: 0.3, max: 30 },
    soybean: { min: 0.5, max: 50 },
    maize: { min: 0.3, max: 40 },
  };

  const range = commodity ? commodityRanges[commodity.toLowerCase()] : null;
  const effectiveRange = range || { min: 0.1, max: 100 };

  if (areaHa < 0.01) {
    return { score: 5, detail: `Area ${areaHa.toFixed(4)} ha is implausibly small` };
  }
  if (areaHa < effectiveRange.min) {
    return { score: 35, detail: `Area ${areaHa.toFixed(2)} ha is below typical range (${effectiveRange.min}-${effectiveRange.max} ha)` };
  }
  if (areaHa > effectiveRange.max * 3) {
    return { score: 20, detail: `Area ${areaHa.toFixed(2)} ha far exceeds typical maximum of ${effectiveRange.max} ha` };
  }
  if (areaHa > effectiveRange.max) {
    return { score: 50, detail: `Area ${areaHa.toFixed(2)} ha exceeds typical max of ${effectiveRange.max} ha` };
  }
  return { score: 90, detail: `Area ${areaHa.toFixed(2)} ha is within plausible range (${effectiveRange.min}-${effectiveRange.max} ha)` };
}

function checkLocationPlausibility(coords: Coord[]): { score: number; detail: string } {
  const centroid = {
    lat: coords.reduce((s, c) => s + c.lat, 0) / coords.length,
    lng: coords.reduce((s, c) => s + c.lng, 0) / coords.length,
  };

  const agriculturalZones: Array<{ name: string; latMin: number; latMax: number; lngMin: number; lngMax: number }> = [
    { name: 'West Africa', latMin: 4, latMax: 15, lngMin: -18, lngMax: 16 },
    { name: 'East Africa', latMin: -12, latMax: 5, lngMin: 28, lngMax: 42 },
    { name: 'Central Africa', latMin: -6, latMax: 12, lngMin: 8, lngMax: 32 },
    { name: 'Southern Africa', latMin: -35, latMax: -10, lngMin: 15, lngMax: 40 },
    { name: 'South America', latMin: -35, latMax: 10, lngMin: -82, lngMax: -35 },
    { name: 'Southeast Asia', latMin: -10, latMax: 25, lngMin: 95, lngMax: 140 },
    { name: 'South Asia', latMin: 5, latMax: 35, lngMin: 60, lngMax: 95 },
  ];

  const inZone = agriculturalZones.find(
    z => centroid.lat >= z.latMin && centroid.lat <= z.latMax && centroid.lng >= z.lngMin && centroid.lng <= z.lngMax
  );

  if (inZone) {
    return { score: 95, detail: `Centroid is in ${inZone.name} agricultural zone (${centroid.lat.toFixed(4)}, ${centroid.lng.toFixed(4)})` };
  }

  if (centroid.lat >= -50 && centroid.lat <= 50) {
    return { score: 60, detail: `Centroid at (${centroid.lat.toFixed(4)}, ${centroid.lng.toFixed(4)}) is in a tropical/subtropical region but outside known agricultural zones` };
  }

  return { score: 20, detail: `Centroid at (${centroid.lat.toFixed(4)}, ${centroid.lng.toFixed(4)}) is outside typical agricultural latitudes` };
}

function checkEdgeStraightness(coords: Coord[]): { score: number; detail: string } {
  if (coords.length < 4) {
    if (coords.length === 3) {
      return { score: 50, detail: 'Only 3 vertices — triangle has straight edges by definition; add more points for better assessment' };
    }
    return { score: 0, detail: 'Too few vertices' };
  }

  const n = coords.length;
  let straightEdgeCount = 0;
  const edgeAngles: number[] = [];

  for (let i = 0; i < n; i++) {
    const a = coords[i];
    const b = coords[(i + 1) % n];
    const bearing = Math.atan2(b.lng - a.lng, b.lat - a.lat) * (180 / Math.PI);
    edgeAngles.push(bearing);
  }

  for (const angle of edgeAngles) {
    const normalized = ((angle % 90) + 90) % 90;
    if (normalized < 3 || normalized > 87) {
      straightEdgeCount++;
    }
  }

  const straightRatio = straightEdgeCount / edgeAngles.length;

  if (straightRatio > 0.8) {
    return { score: 15, detail: `${straightEdgeCount}/${edgeAngles.length} edges aligned to cardinal directions — suspiciously grid-like` };
  }
  if (straightRatio > 0.5) {
    return { score: 40, detail: `${straightEdgeCount}/${edgeAngles.length} edges aligned to cardinal directions — somewhat regular` };
  }
  if (straightRatio > 0.25) {
    return { score: 70, detail: `${straightEdgeCount}/${edgeAngles.length} edges near cardinal directions — moderately natural` };
  }
  return { score: 90, detail: `Only ${straightEdgeCount}/${edgeAngles.length} edges near cardinal directions — natural boundary orientation` };
}

export function analyzeBoundaryAuthenticity(
  boundary: { type: string; coordinates: number[][][] },
  commodity?: string
): BoundaryAnalysisResult {
  const ring = boundary.coordinates[0];
  const coords: Coord[] = ring
    .slice(0, -1)
    .map(([lng, lat]) => ({ lng, lat }));

  if (coords.length < 3) {
    return {
      confidence_score: 0,
      confidence_level: 'low',
      flags: {
        shape_regularity: { score: 0, detail: 'Insufficient vertices' },
        vertex_spacing: { score: 0, detail: 'Insufficient vertices' },
        area_plausibility: { score: 0, detail: 'Insufficient vertices' },
        location_plausibility: { score: 0, detail: 'Insufficient vertices' },
        edge_straightness: { score: 0, detail: 'Insufficient vertices' },
      },
      analyzed_at: new Date().toISOString(),
    };
  }

  const shape = checkShapeRegularity(coords);
  const spacing = checkVertexSpacing(coords);
  const area = checkAreaPlausibility(coords, commodity);
  const location = checkLocationPlausibility(coords);
  const edges = checkEdgeStraightness(coords);

  const weights = {
    shape_regularity: 0.25,
    vertex_spacing: 0.25,
    area_plausibility: 0.20,
    location_plausibility: 0.15,
    edge_straightness: 0.15,
  };

  const confidence_score = Math.round(
    shape.score * weights.shape_regularity +
    spacing.score * weights.vertex_spacing +
    area.score * weights.area_plausibility +
    location.score * weights.location_plausibility +
    edges.score * weights.edge_straightness
  );

  let confidence_level: 'high' | 'medium' | 'low';
  if (confidence_score >= 70) confidence_level = 'high';
  else if (confidence_score >= 40) confidence_level = 'medium';
  else confidence_level = 'low';

  return {
    confidence_score,
    confidence_level,
    flags: {
      shape_regularity: shape,
      vertex_spacing: spacing,
      area_plausibility: area,
      location_plausibility: location,
      edge_straightness: edges,
    },
    analyzed_at: new Date().toISOString(),
  };
}
