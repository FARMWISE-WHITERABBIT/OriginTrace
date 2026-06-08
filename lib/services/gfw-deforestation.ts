export const GFW_DATA_API_BASE_URL = 'https://data-api.globalforestwatch.org';
export const GFW_TREE_COVER_LOSS_DATASET = 'umd_tree_cover_loss';
export const GFW_TREE_COVER_LOSS_VERSION = 'v1.9';
export const GFW_TREE_COVER_LOSS_SQL =
  'SELECT SUM(area__ha) AS total_area_ha FROM results WHERE umd_tree_cover_loss__year >= 2021';

type CoordinatePair = [number, number];

export interface GfwPolygon {
  type: 'Polygon';
  coordinates: CoordinatePair[][];
}

export interface DeforestationResult {
  deforestation_free: boolean;
  forest_loss_hectares: number;
  forest_loss_percentage: number;
  analysis_date: string;
  data_source: string;
  risk_level: 'low' | 'medium' | 'high';
  verification_status?: 'verified' | 'manual_review_required';
  manual_review_required?: boolean;
  gfw_dataset?: string;
  gfw_version?: string;
}

type FetchLike = typeof fetch;

interface GfwQueryOptions {
  apiKey?: string;
  origin?: string;
  fetchImpl?: FetchLike;
  timeoutMs?: number;
}

export function getGfwQueryUrl() {
  return `${GFW_DATA_API_BASE_URL}/dataset/${GFW_TREE_COVER_LOSS_DATASET}/${GFW_TREE_COVER_LOSS_VERSION}/query/json`;
}

export function getGfwFieldsUrl() {
  return `${GFW_DATA_API_BASE_URL}/dataset/${GFW_TREE_COVER_LOSS_DATASET}/${GFW_TREE_COVER_LOSS_VERSION}/fields`;
}

export function calculatePolygonAreaHectares(polygon: unknown): number {
  const coords = (polygon as Partial<GfwPolygon> | null)?.coordinates?.[0];
  if (!Array.isArray(coords) || coords.length < 4) return 0;

  const radiusMeters = 6371000;
  let area = 0;

  for (let i = 0; i < coords.length - 1; i++) {
    const [lon1, lat1] = coords[i];
    const [lon2, lat2] = coords[i + 1];
    const phi1 = (lat1 * Math.PI) / 180;
    const phi2 = (lat2 * Math.PI) / 180;
    const lambda1 = (lon1 * Math.PI) / 180;
    const lambda2 = (lon2 * Math.PI) / 180;
    area += (lambda2 - lambda1) * (2 + Math.sin(phi1) + Math.sin(phi2));
  }

  return Math.abs((area * radiusMeters * radiusMeters) / 2) / 10000;
}

function toFiniteNumber(value: unknown): number | null {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number.parseFloat(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  if (value === null || value === undefined) return 0;
  return null;
}

function riskLevelForLossPercentage(lossPercentage: number): 'low' | 'medium' | 'high' {
  if (lossPercentage > 5) return 'high';
  if (lossPercentage > 1) return 'medium';
  return 'low';
}

export function normalizeGfwTreeCoverLossResponse(payload: unknown, polygon: GfwPolygon): DeforestationResult {
  const data = Array.isArray((payload as { data?: unknown })?.data)
    ? (payload as { data: unknown[] }).data
    : Array.isArray(payload)
      ? payload
      : null;

  if (!data) {
    throw new Error('GFW response missing data array');
  }

  const row = (data[0] ?? {}) as Record<string, unknown>;
  const rawLossHa =
    row.total_area_ha ??
    row.sum ??
    row.sum_area__ha ??
    row['SUM(area__ha)'] ??
    0;

  const lossHa = toFiniteNumber(rawLossHa);
  if (lossHa === null) {
    throw new Error('GFW response total_area_ha is not numeric');
  }

  const polygonAreaHa = calculatePolygonAreaHectares(polygon);
  const lossPercentage = polygonAreaHa > 0 ? (lossHa / polygonAreaHa) * 100 : 0;
  const roundedLossHa = Math.round(lossHa * 100) / 100;
  const roundedLossPercentage = Math.round(lossPercentage * 100) / 100;

  return {
    deforestation_free: roundedLossHa === 0,
    forest_loss_hectares: roundedLossHa,
    forest_loss_percentage: roundedLossPercentage,
    analysis_date: new Date().toISOString(),
    data_source: 'Global Forest Watch (Tree Cover Loss)',
    risk_level: riskLevelForLossPercentage(roundedLossPercentage),
    verification_status: 'verified',
    manual_review_required: false,
    gfw_dataset: GFW_TREE_COVER_LOSS_DATASET,
    gfw_version: GFW_TREE_COVER_LOSS_VERSION,
  };
}

export async function queryGfwTreeCoverLoss(
  polygon: GfwPolygon,
  options: GfwQueryOptions = {},
): Promise<DeforestationResult | null> {
  const apiKey = options.apiKey ?? process.env.GFW_API_KEY;
  if (!apiKey) return null;

  const controller = new AbortController();
  const timeout = globalThis.setTimeout(() => controller.abort(), options.timeoutMs ?? 15000);

  try {
    const response = await (options.fetchImpl ?? fetch)(getGfwQueryUrl(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        Origin: options.origin ?? process.env.GFW_API_ORIGIN ?? 'http://localhost:5000',
      },
      body: JSON.stringify({
        geometry: {
          type: 'Polygon',
          coordinates: polygon.coordinates,
        },
        sql: GFW_TREE_COVER_LOSS_SQL,
      }),
      signal: controller.signal,
    });

    if (!response.ok) return null;

    const payload = await response.json();
    return normalizeGfwTreeCoverLossResponse(payload, polygon);
  } catch (error) {
    console.error('GFW tree cover loss query failed:', error);
    return null;
  } finally {
    globalThis.clearTimeout(timeout);
  }
}
