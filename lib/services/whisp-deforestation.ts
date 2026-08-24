/**
 * WHISP ("What is in that plot?") integration — the primary EUDR
 * deforestation check, ahead of the GFW tree-cover-loss fallback in
 * lib/services/gfw-deforestation.ts. WHISP is purpose-built for EUDR: it
 * evaluates a plot against a proper pre-2020 forest baseline plus
 * post-cutoff disturbance layers and returns a commodity-specific risk
 * classification, rather than a raw tree-cover-loss area sum.
 *
 * API confirmed via github.com/forestdatapartnership/whisp-app and the FAO
 * "Supporting EUDR compliance with Whisp" announcement: FastAPI service,
 * `X-API-KEY` auth, async job model (submit -> poll /status/{token}).
 *
 * IMPORTANT — the exact response JSON for /submit and /status could not be
 * fetched from this environment (whisp.openforis.org is blocked by network
 * egress here), so the parsing below is deliberately defensive: it accepts
 * a few plausible field-name variants, and anywhere it can't confidently
 * identify a token, a completion state, or a risk value, it returns `null`
 * rather than guessing — a parsing gap must fall back to GFW (or ultimately
 * the country-risk table), never silently report a false "low risk" or
 * "complete". Run scripts/whisp-live-smoke.ts against a real plot once
 * WHISP_API_KEY is configured in a networked environment to confirm the
 * real shape and tighten this up.
 */

import type { DeforestationResult, GfwPolygon } from './deforestation-types';

export const WHISP_API_BASE_URL = 'https://whisp.openforis.org/api';

type FetchLike = typeof fetch;

interface WhispRequestOptions {
  apiKey?: string;
  fetchImpl?: FetchLike;
  timeoutMs?: number;
}

export interface WhispQueryOptions extends WhispRequestOptions {
  /** Plot identifier stamped into the submitted GeoJSON feature's properties. */
  plotId?: string;
  /** How many times to poll /status before returning a 'pending' result. */
  maxPollAttempts?: number;
  /** Delay between polls, in ms. */
  pollIntervalMs?: number;
}

export function resolveWhispApiKey(explicitApiKey?: string): string | null {
  const key = (explicitApiKey ?? process.env.WHISP_API_KEY)?.trim();
  return key || null;
}

async function withTimeout<T>(
  fn: (signal: AbortSignal) => Promise<T>,
  timeoutMs: number,
): Promise<T> {
  const controller = new AbortController();
  const timeout = globalThis.setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fn(controller.signal);
  } finally {
    globalThis.clearTimeout(timeout);
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => globalThis.setTimeout(resolve, ms));
}

/**
 * Submits a plot for analysis. Returns the job token, or null on any
 * failure (missing key, network error, non-2xx response, or a response body
 * we can't find a token in).
 */
export async function submitWhispPlot(
  polygon: GfwPolygon,
  plotId: string,
  options: WhispRequestOptions = {},
): Promise<string | null> {
  const apiKey = resolveWhispApiKey(options.apiKey);
  if (!apiKey) return null;

  try {
    return await withTimeout(async (signal) => {
      const response = await (options.fetchImpl ?? fetch)(`${WHISP_API_BASE_URL}/submit/geojson`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-KEY': apiKey,
        },
        body: JSON.stringify({
          type: 'FeatureCollection',
          features: [
            {
              type: 'Feature',
              properties: { geoid: plotId },
              geometry: { type: polygon.type, coordinates: polygon.coordinates },
            },
          ],
        }),
        signal,
      });

      if (!response.ok) {
        console.error('[whisp] submit failed:', response.status, await response.text().catch(() => ''));
        return null;
      }

      const payload = await response.json().catch(() => null) as Record<string, unknown> | null;
      const token = payload?.token ?? payload?.job_id ?? payload?.id;
      return typeof token === 'string' && token.length > 0 ? token : null;
    }, options.timeoutMs ?? 15000);
  } catch (error) {
    console.error('[whisp] submit error:', error);
    return null;
  }
}

export interface WhispStatusResult {
  /** True once the job has finished (successfully or not). */
  complete: boolean;
  /** True if the job finished in an error state — a hard failure, not "still running". */
  errored: boolean;
  /** The result feature's properties, present only when complete && !errored. */
  properties?: Record<string, unknown>;
}

const PENDING_STATUS_WORDS = ['pending', 'processing', 'running', 'queued', 'in_progress', 'submitted'];
const COMPLETE_STATUS_WORDS = ['complete', 'completed', 'done', 'success', 'succeeded', 'finished'];
const ERROR_STATUS_WORDS = ['failed', 'error', 'cancelled', 'canceled'];

export async function pollWhispStatus(
  token: string,
  options: WhispRequestOptions = {},
): Promise<WhispStatusResult> {
  const apiKey = resolveWhispApiKey(options.apiKey);
  if (!apiKey) return { complete: true, errored: true };

  try {
    return await withTimeout(async (signal) => {
      const response = await (options.fetchImpl ?? fetch)(`${WHISP_API_BASE_URL}/status/${encodeURIComponent(token)}`, {
        method: 'GET',
        headers: { 'X-API-KEY': apiKey },
        signal,
      });

      if (!response.ok) {
        // A 4xx/5xx polling an in-flight job is treated as "not resolved yet"
        // rather than a hard error, since transient polling failures shouldn't
        // discard an otherwise-running analysis — the caller's attempt budget
        // bounds how long this can go on for.
        return { complete: false, errored: false };
      }

      const payload = await response.json().catch(() => null) as Record<string, unknown> | null;
      const statusWord = String(payload?.status ?? '').toLowerCase();

      if (ERROR_STATUS_WORDS.some((w) => statusWord.includes(w))) {
        return { complete: true, errored: true };
      }
      if (PENDING_STATUS_WORDS.some((w) => statusWord.includes(w))) {
        return { complete: false, errored: false };
      }
      if (!COMPLETE_STATUS_WORDS.some((w) => statusWord.includes(w)) && !payload?.result) {
        // Unrecognized status word and no result payload — can't confidently
        // call this complete. Keep polling rather than guessing.
        return { complete: false, errored: false };
      }

      const resultGeojson = payload?.result ?? payload;
      const features = (resultGeojson as { features?: unknown[] })?.features;
      const firstFeature = Array.isArray(features) ? features[0] : resultGeojson;
      const properties = (firstFeature as { properties?: Record<string, unknown> })?.properties
        ?? (firstFeature as Record<string, unknown> | undefined);

      if (!properties || typeof properties !== 'object') {
        return { complete: true, errored: true };
      }

      return { complete: true, errored: false, properties: properties as Record<string, unknown> };
    }, options.timeoutMs ?? 15000);
  } catch (error) {
    console.error('[whisp] poll error:', error);
    return { complete: false, errored: false };
  }
}

type WhispRiskCategory = 'low_risk' | 'high_risk' | 'more_info_needed';

const RISK_COLUMNS_BY_COMMODITY: Record<string, string> = {
  coffee: 'Risk_PCrop',
  cocoa: 'Risk_PCrop',
  rubber: 'Risk_PCrop',
  'oil palm': 'Risk_PCrop',
  'oil_palm': 'Risk_PCrop',
  palmoil: 'Risk_PCrop',
  soy: 'Risk_ACrop',
  soybean: 'Risk_ACrop',
  soybeans: 'Risk_ACrop',
  timber: 'Risk_Timber',
  wood: 'Risk_Timber',
};

const ALL_RISK_COLUMNS = ['Risk_PCrop', 'Risk_ACrop', 'Risk_Timber'];

function riskColumnForCommodity(commodity?: string): string | null {
  if (!commodity) return null;
  return RISK_COLUMNS_BY_COMMODITY[commodity.trim().toLowerCase()] ?? null;
}

function parseWhispRiskValue(value: unknown): WhispRiskCategory | null {
  if (typeof value !== 'string') return null;
  const normalized = value.trim().toLowerCase();
  if (normalized.includes('more info')) return 'more_info_needed';
  if (normalized.includes('high')) return 'high_risk';
  if (normalized.includes('low')) return 'low_risk';
  return null;
}

const RISK_SEVERITY: Record<WhispRiskCategory, number> = {
  low_risk: 0,
  more_info_needed: 1,
  high_risk: 2,
};

/**
 * Reads the commodity-appropriate risk column from a Whisp result feature's
 * properties. When the commodity isn't recognized, evaluates every risk
 * column present and returns the worst finding — never silently picks a
 * lenient column when the commodity is unknown.
 *
 * Returns null when no risk value could be confidently parsed (caller
 * should fall back to GFW rather than trust an unparseable result).
 */
export function normalizeWhispResult(
  properties: Record<string, unknown>,
  commodity?: string,
): DeforestationResult | null {
  const targetColumn = riskColumnForCommodity(commodity);
  const columnsToCheck = targetColumn ? [targetColumn] : ALL_RISK_COLUMNS;

  let worst: WhispRiskCategory | null = null;
  for (const column of columnsToCheck) {
    const parsed = parseWhispRiskValue(properties[column]);
    if (parsed && (worst === null || RISK_SEVERITY[parsed] > RISK_SEVERITY[worst])) {
      worst = parsed;
    }
  }

  if (worst === null) return null;

  const riskLevel = worst === 'high_risk' ? 'high' : worst === 'low_risk' ? 'low' : 'medium';
  const forestLossHectares = typeof properties.deforestation_after_2020 === 'number'
    ? properties.deforestation_after_2020
    : 0;

  return {
    deforestation_free: riskLevel === 'low',
    forest_loss_hectares: forestLossHectares,
    forest_loss_percentage: 0,
    analysis_date: new Date().toISOString(),
    data_source: 'Whisp (FAO/OpenForis) — EUDR plot analysis',
    risk_level: riskLevel,
    verification_status: worst === 'more_info_needed' ? 'manual_review_required' : 'verified',
    manual_review_required: worst === 'more_info_needed',
    whisp_status: 'complete',
    whisp_risk_category: worst,
  };
}

/**
 * Orchestrates a full Whisp check: submit, then poll within a bounded
 * budget. Returns:
 *   - a complete DeforestationResult if the job resolves in time,
 *   - a 'pending' DeforestationResult (manual_review_required, carrying the
 *     token) if it's still running when the budget runs out — visibly
 *     unresolved rather than silently "fine",
 *   - null on any hard failure (no key, submit failure, error status, or an
 *     unparseable result) so the caller falls back to GFW.
 */
export async function queryWhispDeforestation(
  polygon: GfwPolygon,
  commodity: string | undefined,
  options: WhispQueryOptions = {},
): Promise<DeforestationResult | null> {
  const apiKey = resolveWhispApiKey(options.apiKey);
  if (!apiKey) return null;

  const token = await submitWhispPlot(polygon, options.plotId ?? 'adhoc', options);
  if (!token) return null;

  const maxAttempts = options.maxPollAttempts ?? 6;
  const intervalMs = options.pollIntervalMs ?? 4000;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    if (attempt > 0) await sleep(intervalMs);

    const status = await pollWhispStatus(token, options);
    if (status.errored) return null;
    if (status.complete && status.properties) {
      return normalizeWhispResult(status.properties, commodity);
    }
  }

  return {
    deforestation_free: false,
    forest_loss_hectares: 0,
    forest_loss_percentage: 0,
    analysis_date: new Date().toISOString(),
    data_source: 'Whisp (FAO/OpenForis) — analysis still in progress',
    risk_level: 'medium',
    verification_status: 'manual_review_required',
    manual_review_required: true,
    whisp_status: 'pending',
    whisp_token: token,
  };
}

/**
 * Used by the GET /api/deforestation-check handler to opportunistically
 * resolve a farm's pending Whisp job the next time someone looks at it,
 * without needing a dedicated cron slot. A single poll attempt — the
 * caller's request/response cycle is the only budget available here.
 */
export async function resumePendingWhispCheck(
  token: string,
  commodity: string | undefined,
  options: WhispRequestOptions = {},
): Promise<DeforestationResult | null> {
  const status = await pollWhispStatus(token, options);
  if (status.errored) return null;
  if (status.complete && status.properties) {
    return normalizeWhispResult(status.properties, commodity);
  }
  return null;
}
