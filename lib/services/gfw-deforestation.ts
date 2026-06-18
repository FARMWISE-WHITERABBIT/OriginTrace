import { createHash } from 'crypto';

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
type GfwApiKeyLabel = 'explicit' | 'company' | 'fallback';
type GfwKeyHealthStatus = 'healthy' | 'exhausted' | 'unusable' | 'failed';

interface GfwQueryOptions {
  apiKey?: string;
  origin?: string;
  fetchImpl?: FetchLike;
  timeoutMs?: number;
}

interface GfwApiKeyCandidate {
  label: GfwApiKeyLabel;
  key: string;
  fingerprint: string;
}

interface GfwKeyFailure {
  status: GfwKeyHealthStatus;
  httpStatus?: number;
  message: string;
  retryAfterSeconds?: number;
  resetAt?: string;
  shouldTryNextKey: boolean;
  shouldAlert: boolean;
}

export interface GfwKeyHealthSnapshot {
  label: GfwApiKeyLabel;
  fingerprint: string;
  status: GfwKeyHealthStatus;
  firstAttemptAt: string | null;
  lastAttemptAt: string | null;
  lastSuccessAt: string | null;
  lastFailureAt: string | null;
  exhaustedAt: string | null;
  recoveredAt: string | null;
  resetAt: string | null;
  retryAfterSeconds: number | null;
  elapsedMsUntilExhausted: number | null;
  requestCount: number;
  successCount: number;
  failureCount: number;
  exhaustedCount: number;
  lastHttpStatus: number | null;
  lastError: string | null;
}

interface GfwKeyHealthState extends GfwKeyHealthSnapshot {
  firstAttemptMs: number | null;
  lastAlertAtMs: number | null;
}

const gfwKeyHealth = new Map<string, GfwKeyHealthState>();

function firstNonEmpty(...values: Array<string | undefined>): string | null {
  for (const value of values) {
    const trimmed = value?.trim();
    if (trimmed) return trimmed;
  }
  return null;
}

export function resolveGfwApiKey(explicitApiKey?: string): string | null {
  return firstNonEmpty(
    explicitApiKey,
    process.env.GFW_COMPANY_API_KEY,
    process.env.GFW_API_KEY,
  );
}

function fingerprintGfwApiKey(apiKey: string): string {
  return createHash('sha256').update(apiKey).digest('hex').slice(0, 12);
}

function resolveGfwApiKeyCandidates(explicitApiKey?: string): GfwApiKeyCandidate[] {
  const explicit = explicitApiKey?.trim();
  if (explicit) {
    return [{ label: 'explicit', key: explicit, fingerprint: fingerprintGfwApiKey(explicit) }];
  }

  const seen = new Set<string>();
  const candidates: GfwApiKeyCandidate[] = [];

  for (const [label, rawKey] of [
    ['company', process.env.GFW_COMPANY_API_KEY],
    ['fallback', process.env.GFW_API_KEY],
  ] as const) {
    const key = rawKey?.trim();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    candidates.push({ label, key, fingerprint: fingerprintGfwApiKey(key) });
  }

  return candidates;
}

function healthKey(candidate: GfwApiKeyCandidate): string {
  return `${candidate.label}:${candidate.fingerprint}`;
}

function isoNow(nowMs = Date.now()): string {
  return new Date(nowMs).toISOString();
}

function getOrCreateKeyHealth(candidate: GfwApiKeyCandidate): GfwKeyHealthState {
  const key = healthKey(candidate);
  const existing = gfwKeyHealth.get(key);
  if (existing) return existing;

  const created: GfwKeyHealthState = {
    label: candidate.label,
    fingerprint: candidate.fingerprint,
    status: 'healthy',
    firstAttemptAt: null,
    lastAttemptAt: null,
    lastSuccessAt: null,
    lastFailureAt: null,
    exhaustedAt: null,
    recoveredAt: null,
    resetAt: null,
    retryAfterSeconds: null,
    elapsedMsUntilExhausted: null,
    requestCount: 0,
    successCount: 0,
    failureCount: 0,
    exhaustedCount: 0,
    lastHttpStatus: null,
    lastError: null,
    firstAttemptMs: null,
    lastAlertAtMs: null,
  };

  gfwKeyHealth.set(key, created);
  return created;
}

function recordGfwKeyAttempt(candidate: GfwApiKeyCandidate, nowMs = Date.now()) {
  const health = getOrCreateKeyHealth(candidate);
  if (!health.firstAttemptAt) {
    health.firstAttemptAt = isoNow(nowMs);
    health.firstAttemptMs = nowMs;
  }
  health.lastAttemptAt = isoNow(nowMs);
  health.requestCount += 1;
}

function recordGfwKeySuccess(candidate: GfwApiKeyCandidate, nowMs = Date.now()) {
  const health = getOrCreateKeyHealth(candidate);
  const wasUnhealthy = health.status !== 'healthy';
  health.status = 'healthy';
  health.lastSuccessAt = isoNow(nowMs);
  health.successCount += 1;
  health.lastHttpStatus = 200;
  health.lastError = null;
  health.retryAfterSeconds = null;
  health.resetAt = null;
  if (wasUnhealthy) health.recoveredAt = isoNow(nowMs);
}

function recordGfwKeyFailure(candidate: GfwApiKeyCandidate, failure: GfwKeyFailure, nowMs = Date.now()) {
  const health = getOrCreateKeyHealth(candidate);
  health.status = failure.status;
  health.lastFailureAt = isoNow(nowMs);
  health.failureCount += 1;
  health.lastHttpStatus = failure.httpStatus ?? null;
  health.lastError = failure.message;
  health.retryAfterSeconds = failure.retryAfterSeconds ?? null;
  health.resetAt = failure.resetAt ?? null;

  if (failure.status === 'exhausted' || failure.status === 'unusable') {
    health.exhaustedAt = health.exhaustedAt ?? isoNow(nowMs);
    health.exhaustedCount += 1;
    if (health.firstAttemptMs !== null) {
      health.elapsedMsUntilExhausted = nowMs - health.firstAttemptMs;
    }
  }
}

export function getGfwKeyHealthSnapshot(): GfwKeyHealthSnapshot[] {
  return Array.from(gfwKeyHealth.values()).map((health) => ({
    label: health.label,
    fingerprint: health.fingerprint,
    status: health.status,
    firstAttemptAt: health.firstAttemptAt,
    lastAttemptAt: health.lastAttemptAt,
    lastSuccessAt: health.lastSuccessAt,
    lastFailureAt: health.lastFailureAt,
    exhaustedAt: health.exhaustedAt,
    recoveredAt: health.recoveredAt,
    resetAt: health.resetAt,
    retryAfterSeconds: health.retryAfterSeconds,
    elapsedMsUntilExhausted: health.elapsedMsUntilExhausted,
    requestCount: health.requestCount,
    successCount: health.successCount,
    failureCount: health.failureCount,
    exhaustedCount: health.exhaustedCount,
    lastHttpStatus: health.lastHttpStatus,
    lastError: health.lastError,
  }));
}

export function getConfiguredGfwKeyFingerprints(explicitApiKey?: string) {
  return resolveGfwApiKeyCandidates(explicitApiKey).map(({ label, fingerprint }) => ({
    label,
    fingerprint,
  }));
}

export function resetGfwKeyHealthForTests() {
  gfwKeyHealth.clear();
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

function compactResponseText(text: string): string {
  return text.replace(/\s+/g, ' ').trim().slice(0, 500);
}

async function readFailureText(response: Response): Promise<string> {
  try {
    return compactResponseText(await response.text());
  } catch {
    return '';
  }
}

function parseRetryAfterSeconds(value: string | null): number | null {
  if (!value) return null;

  const seconds = Number.parseInt(value, 10);
  if (Number.isFinite(seconds) && seconds >= 0) return seconds;

  const dateMs = Date.parse(value);
  if (!Number.isFinite(dateMs)) return null;
  return Math.max(0, Math.ceil((dateMs - Date.now()) / 1000));
}

function parseResetAt(headers: Headers, retryAfterSeconds: number | null): string | null {
  if (retryAfterSeconds !== null) {
    return new Date(Date.now() + retryAfterSeconds * 1000).toISOString();
  }

  const rawReset =
    headers.get('x-ratelimit-reset') ??
    headers.get('x-rate-limit-reset') ??
    headers.get('ratelimit-reset') ??
    headers.get('rate-limit-reset');

  if (!rawReset) return null;

  const numeric = Number(rawReset);
  if (Number.isFinite(numeric)) {
    const resetMs = numeric > 10_000_000_000 ? numeric : numeric * 1000;
    return new Date(resetMs).toISOString();
  }

  const dateMs = Date.parse(rawReset);
  return Number.isFinite(dateMs) ? new Date(dateMs).toISOString() : null;
}

function classifyGfwFailure(response: Response, responseText: string): GfwKeyFailure {
  const retryAfterSeconds = parseRetryAfterSeconds(response.headers.get('retry-after'));
  const resetAt = parseResetAt(response.headers, retryAfterSeconds);
  const statusLine = `HTTP ${response.status} ${response.statusText}`.trim();
  const message = responseText ? `${statusLine}: ${responseText}` : statusLine;

  if (
    response.status === 429 ||
    /\b(rate|quota|limit|exceeded|too many requests)\b/i.test(responseText)
  ) {
    return {
      status: 'exhausted',
      httpStatus: response.status,
      message,
      retryAfterSeconds: retryAfterSeconds ?? undefined,
      resetAt: resetAt ?? undefined,
      shouldTryNextKey: true,
      shouldAlert: true,
    };
  }

  if (response.status === 401 || response.status === 403) {
    return {
      status: 'unusable',
      httpStatus: response.status,
      message,
      retryAfterSeconds: retryAfterSeconds ?? undefined,
      resetAt: resetAt ?? undefined,
      shouldTryNextKey: true,
      shouldAlert: true,
    };
  }

  return {
    status: 'failed',
    httpStatus: response.status,
    message,
    retryAfterSeconds: retryAfterSeconds ?? undefined,
    resetAt: resetAt ?? undefined,
    shouldTryNextKey: false,
    shouldAlert: false,
  };
}

function getAlertCooldownMs(): number {
  const configured = Number.parseInt(process.env.GFW_KEY_ALERT_COOLDOWN_MS ?? '', 10);
  return Number.isFinite(configured) && configured >= 0 ? configured : 60 * 60 * 1000;
}

async function maybeSendGfwKeyAlert(candidate: GfwApiKeyCandidate, failure: GfwKeyFailure) {
  if (!failure.shouldAlert) return;

  const health = getOrCreateKeyHealth(candidate);
  const nowMs = Date.now();
  const cooldownMs = getAlertCooldownMs();
  if (health.lastAlertAtMs !== null && nowMs - health.lastAlertAtMs < cooldownMs) return;
  health.lastAlertAtMs = nowMs;

  const snapshot = getGfwKeyHealthSnapshot().find(
    (item) => item.label === candidate.label && item.fingerprint === candidate.fingerprint,
  );

  const payload = {
    type: 'gfw_key_health_alert',
    key_label: candidate.label,
    key_fingerprint: candidate.fingerprint,
    status: failure.status,
    http_status: failure.httpStatus ?? null,
    message: failure.message,
    first_attempt_at: snapshot?.firstAttemptAt ?? null,
    exhausted_at: snapshot?.exhaustedAt ?? null,
    elapsed_ms_until_exhausted: snapshot?.elapsedMsUntilExhausted ?? null,
    request_count: snapshot?.requestCount ?? null,
    failure_count: snapshot?.failureCount ?? null,
    exhausted_count: snapshot?.exhaustedCount ?? null,
    retry_after_seconds: snapshot?.retryAfterSeconds ?? null,
    reset_at: snapshot?.resetAt ?? null,
  };

  console.warn('[gfw] API key health alert', payload);

  const webhookUrl = process.env.GFW_KEY_ALERT_WEBHOOK_URL?.trim();
  if (webhookUrl) {
    try {
      await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
    } catch (error) {
      console.error('[gfw] Failed to send key alert webhook:', error);
    }
  }

  const alertEmail = process.env.GFW_KEY_ALERT_EMAIL?.trim();
  if (alertEmail && process.env.RESEND_API_KEY) {
    try {
      const { sendEmail } = await import('@/lib/email/resend-client');
      await sendEmail({
        to: alertEmail,
        subject: `[OriginTrace] GFW API key ${failure.status}: ${candidate.label}`,
        html: `<p>Global Forest Watch API key <strong>${candidate.label}</strong> (${candidate.fingerprint}) is ${failure.status}.</p><pre>${JSON.stringify(payload, null, 2)}</pre>`,
        text: `Global Forest Watch API key ${candidate.label} (${candidate.fingerprint}) is ${failure.status}.\n\n${JSON.stringify(payload, null, 2)}`,
      });
    } catch (error) {
      console.error('[gfw] Failed to send key alert email:', error);
    }
  }
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
  const candidates = resolveGfwApiKeyCandidates(options.apiKey);
  if (candidates.length === 0) return null;

  for (const [index, candidate] of candidates.entries()) {
    const controller = new AbortController();
    const timeout = globalThis.setTimeout(() => controller.abort(), options.timeoutMs ?? 15000);

    try {
      recordGfwKeyAttempt(candidate);

      const response = await (options.fetchImpl ?? fetch)(getGfwQueryUrl(), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': candidate.key,
          Origin: options.origin ?? process.env.GFW_API_ORIGIN ?? 'https://origintrace.trade',
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

      if (!response.ok) {
        const failure = classifyGfwFailure(response, await readFailureText(response));
        recordGfwKeyFailure(candidate, failure);
        await maybeSendGfwKeyAlert(candidate, failure);

        if (failure.shouldTryNextKey && index < candidates.length - 1) {
          continue;
        }

        return null;
      }

      recordGfwKeySuccess(candidate);
      const payload = await response.json();
      return normalizeGfwTreeCoverLossResponse(payload, polygon);
    } catch (error) {
      const failure: GfwKeyFailure = {
        status: 'failed',
        message: error instanceof Error ? error.message : String(error),
        shouldTryNextKey: false,
        shouldAlert: false,
      };
      recordGfwKeyFailure(candidate, failure);
      console.error('GFW tree cover loss query failed:', error);
      return null;
    } finally {
      globalThis.clearTimeout(timeout);
    }
  }

  return null;
}
