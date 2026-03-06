export interface YieldLimit {
  commodity: string;
  minYieldPerHa: number;
  maxYieldPerHa: number;
  unit: string;
}

export const YIELD_LIMITS: YieldLimit[] = [
  { commodity: 'Cocoa', minYieldPerHa: 0.3, maxYieldPerHa: 1.5, unit: 'tons' },
  { commodity: 'Coffee', minYieldPerHa: 0.5, maxYieldPerHa: 2.0, unit: 'tons' },
  { commodity: 'Cashew', minYieldPerHa: 0.3, maxYieldPerHa: 1.2, unit: 'tons' },
  { commodity: 'Palm Oil', minYieldPerHa: 3.0, maxYieldPerHa: 6.0, unit: 'tons' },
  { commodity: 'Rubber', minYieldPerHa: 1.0, maxYieldPerHa: 2.5, unit: 'tons' },
  { commodity: 'Shea', minYieldPerHa: 0.1, maxYieldPerHa: 0.5, unit: 'tons' },
  { commodity: 'Sesame', minYieldPerHa: 0.3, maxYieldPerHa: 0.8, unit: 'tons' },
  { commodity: 'Groundnut', minYieldPerHa: 0.8, maxYieldPerHa: 2.5, unit: 'tons' },
  { commodity: 'Soybean', minYieldPerHa: 1.0, maxYieldPerHa: 3.0, unit: 'tons' },
  { commodity: 'Maize', minYieldPerHa: 1.5, maxYieldPerHa: 6.0, unit: 'tons' },
];

export interface YieldValidationResult {
  isValid: boolean;
  warningLevel: 'none' | 'low' | 'high';
  message: string;
  expectedRange: { min: number; max: number } | null;
  actualYield: number;
  exceedsBy?: number;
  requiresPhoto: boolean;
}

export function validateYieldToArea(
  commodity: string,
  weightKg: number,
  areaHectares: number,
  tolerancePercent: number = 20
): YieldValidationResult {
  if (areaHectares <= 0) {
    return {
      isValid: false,
      warningLevel: 'high',
      message: 'Invalid farm area. Cannot calculate yield.',
      expectedRange: null,
      actualYield: 0,
      requiresPhoto: true
    };
  }

  const yieldLimit = YIELD_LIMITS.find(
    y => y.commodity.toLowerCase() === commodity.toLowerCase()
  );

  if (!yieldLimit) {
    return {
      isValid: true,
      warningLevel: 'none',
      message: 'Commodity not in yield database. Manual review recommended.',
      expectedRange: null,
      actualYield: weightKg / 1000 / areaHectares,
      requiresPhoto: false
    };
  }

  const weightTons = weightKg / 1000;
  const actualYieldPerHa = weightTons / areaHectares;
  
  const maxAllowedYield = yieldLimit.maxYieldPerHa * (1 + tolerancePercent / 100);
  const minAllowedYield = yieldLimit.minYieldPerHa * (1 - tolerancePercent / 100);

  if (actualYieldPerHa > maxAllowedYield) {
    const exceedsPercent = ((actualYieldPerHa - yieldLimit.maxYieldPerHa) / yieldLimit.maxYieldPerHa) * 100;
    return {
      isValid: false,
      warningLevel: 'high',
      message: `High Yield Warning: ${actualYieldPerHa.toFixed(2)} tons/ha exceeds expected maximum of ${yieldLimit.maxYieldPerHa} tons/ha by ${exceedsPercent.toFixed(0)}%. Photo proof required.`,
      expectedRange: { min: yieldLimit.minYieldPerHa, max: yieldLimit.maxYieldPerHa },
      actualYield: actualYieldPerHa,
      exceedsBy: exceedsPercent,
      requiresPhoto: true
    };
  }

  if (actualYieldPerHa < minAllowedYield) {
    return {
      isValid: true,
      warningLevel: 'low',
      message: `Low yield detected: ${actualYieldPerHa.toFixed(2)} tons/ha is below expected minimum of ${yieldLimit.minYieldPerHa} tons/ha.`,
      expectedRange: { min: yieldLimit.minYieldPerHa, max: yieldLimit.maxYieldPerHa },
      actualYield: actualYieldPerHa,
      requiresPhoto: false
    };
  }

  return {
    isValid: true,
    warningLevel: 'none',
    message: `Yield within expected range: ${actualYieldPerHa.toFixed(2)} tons/ha`,
    expectedRange: { min: yieldLimit.minYieldPerHa, max: yieldLimit.maxYieldPerHa },
    actualYield: actualYieldPerHa,
    requiresPhoto: false
  };
}

export function detectMockLocation(): Promise<{ isMocked: boolean; confidence: string }> {
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      resolve({ isMocked: false, confidence: 'unknown' });
      return;
    }

    const startTime = Date.now();
    let positionCount = 0;
    const positions: GeolocationPosition[] = [];

    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        positions.push(position);
        positionCount++;

        if (positionCount >= 3 || Date.now() - startTime > 5000) {
          navigator.geolocation.clearWatch(watchId);

          const isMocked = positions.some(pos => {
            const coords = pos.coords;
            const hasNoAccuracy = coords.accuracy === 0;
            const hasPerfectAltitude = coords.altitude === 0 || coords.altitude === null;
            const hasNoSpeed = coords.speed === 0 || coords.speed === null;
            
            return hasNoAccuracy || (hasPerfectAltitude && hasNoSpeed && coords.accuracy < 5);
          });

          resolve({ 
            isMocked, 
            confidence: positions.length >= 3 ? 'high' : 'medium' 
          });
        }
      },
      () => {
        resolve({ isMocked: false, confidence: 'unknown' });
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );

    setTimeout(() => {
      navigator.geolocation.clearWatch(watchId);
      if (positionCount === 0) {
        resolve({ isMocked: false, confidence: 'unknown' });
      }
    }, 10000);
  });
}

export function calculatePolygonArea(coordinates: [number, number][]): number {
  if (coordinates.length < 3) return 0;

  const toRadians = (deg: number) => deg * Math.PI / 180;
  const EARTH_RADIUS = 6371000;

  let area = 0;
  const n = coordinates.length;

  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    const [lng1, lat1] = coordinates[i];
    const [lng2, lat2] = coordinates[j];

    area += toRadians(lng2 - lng1) * (2 + Math.sin(toRadians(lat1)) + Math.sin(toRadians(lat2)));
  }

  area = Math.abs(area * EARTH_RADIUS * EARTH_RADIUS / 2);
  
  return area / 10000;
}
