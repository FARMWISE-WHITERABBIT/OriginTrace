import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  GFW_TREE_COVER_LOSS_SQL,
  getConfiguredGfwKeyFingerprints,
  getGfwKeyHealthSnapshot,
  getGfwQueryUrl,
  normalizeGfwTreeCoverLossResponse,
  queryGfwTreeCoverLoss,
  resetGfwKeyHealthForTests,
  resolveGfwApiKey,
  type GfwPolygon,
} from '@/lib/services/gfw-deforestation';

const polygon: GfwPolygon = {
  type: 'Polygon',
  coordinates: [[
    [5.108, 7.087],
    [5.118, 7.087],
    [5.118, 7.097],
    [5.108, 7.097],
    [5.108, 7.087],
  ]],
};

afterEach(() => {
  delete process.env.GFW_COMPANY_API_KEY;
  delete process.env.GFW_API_KEY;
  delete process.env.GFW_KEY_ALERT_WEBHOOK_URL;
  delete process.env.GFW_KEY_ALERT_EMAIL;
  delete process.env.GFW_KEY_ALERT_COOLDOWN_MS;
  resetGfwKeyHealthForTests();
  vi.restoreAllMocks();
});

describe('GFW tree cover loss helper', () => {
  it('queries the stable GFW endpoint with API key, origin, SQL, and polygon geometry', async () => {
    const calls: Array<{ input: RequestInfo | URL; init?: RequestInit }> = [];
    const fetchImpl: typeof fetch = async (input, init) => {
      calls.push({ input, init });
      return new Response(JSON.stringify({ data: [{ total_area_ha: '0.42' }] }), { status: 200 });
    };

    const result = await queryGfwTreeCoverLoss(polygon, {
      apiKey: 'test-gfw-key',
      origin: 'http://localhost:5000',
      fetchImpl,
    });

    expect(result).toMatchObject({
      deforestation_free: false,
      forest_loss_hectares: 0.42,
      data_source: 'Global Forest Watch (Tree Cover Loss)',
      verification_status: 'verified',
      manual_review_required: false,
      gfw_dataset: 'umd_tree_cover_loss',
      gfw_version: 'v1.9',
    });
    expect(calls).toHaveLength(1);
    expect(String(calls[0].input)).toBe(getGfwQueryUrl());
    expect(calls[0].init?.method).toBe('POST');
    expect(calls[0].init?.headers).toMatchObject({
      'Content-Type': 'application/json',
      'x-api-key': 'test-gfw-key',
      Origin: 'http://localhost:5000',
    });

    const body = JSON.parse(String(calls[0].init?.body));
    expect(body).toEqual({
      geometry: polygon,
      sql: GFW_TREE_COVER_LOSS_SQL,
    });
  });

  it('treats empty GFW result rows as zero forest loss', () => {
    const result = normalizeGfwTreeCoverLossResponse({ data: [] }, polygon);

    expect(result.deforestation_free).toBe(true);
    expect(result.forest_loss_hectares).toBe(0);
    expect(result.forest_loss_percentage).toBe(0);
    expect(result.risk_level).toBe('low');
  });

  it('returns null when the GFW response shape is malformed', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const fetchImpl: typeof fetch = async () =>
      new Response(JSON.stringify({ data: [{ total_area_ha: 'not-a-number' }] }), { status: 200 });

    await expect(queryGfwTreeCoverLoss(polygon, { apiKey: 'key', fetchImpl })).resolves.toBeNull();
  });

  it('returns null for GFW auth or permission failures', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const fetchImpl: typeof fetch = async () =>
      new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403 });

    await expect(queryGfwTreeCoverLoss(polygon, { apiKey: 'key', fetchImpl })).resolves.toBeNull();
  });

  it('returns null when the GFW request is aborted by timeout', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const fetchImpl: typeof fetch = async (_input, init) =>
      new Promise<Response>((_resolve, reject) => {
        init?.signal?.addEventListener('abort', () => {
          reject(new DOMException('Aborted', 'AbortError'));
        });
      });

    await expect(queryGfwTreeCoverLoss(polygon, {
      apiKey: 'key',
      fetchImpl,
      timeoutMs: 1,
    })).resolves.toBeNull();
  });

  it('does not call GFW when the API key is missing', async () => {
    const fetchImpl = vi.fn<typeof fetch>();

    await expect(queryGfwTreeCoverLoss(polygon, { fetchImpl })).resolves.toBeNull();
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('prefers the company key and falls back to the local key when company key is blank', () => {
    process.env.GFW_COMPANY_API_KEY = 'company-key';
    process.env.GFW_API_KEY = 'fallback-key';
    expect(resolveGfwApiKey()).toBe('company-key');

    process.env.GFW_COMPANY_API_KEY = '   ';
    expect(resolveGfwApiKey()).toBe('fallback-key');
  });

  it('rotates to the fallback key when the company key is exhausted and records health telemetry', async () => {
    process.env.GFW_COMPANY_API_KEY = 'company-key';
    process.env.GFW_API_KEY = 'fallback-key';
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);

    const calls: Array<{ key: string | undefined }> = [];
    const fetchImpl: typeof fetch = async (_input, init) => {
      const key = (init?.headers as Record<string, string>)?.['x-api-key'];
      calls.push({ key });

      if (key === 'company-key') {
        return new Response('quota exceeded', {
          status: 429,
          statusText: 'Too Many Requests',
          headers: { 'retry-after': '120' },
        });
      }

      return new Response(JSON.stringify({ data: [{ total_area_ha: '0' }] }), { status: 200 });
    };

    const result = await queryGfwTreeCoverLoss(polygon, { fetchImpl });

    expect(result?.deforestation_free).toBe(true);
    expect(calls.map((call) => call.key)).toEqual(['company-key', 'fallback-key']);

    const health = getGfwKeyHealthSnapshot();
    const company = health.find((entry) => entry.label === 'company');
    const fallback = health.find((entry) => entry.label === 'fallback');

    expect(company).toMatchObject({
      status: 'exhausted',
      requestCount: 1,
      failureCount: 1,
      exhaustedCount: 1,
      lastHttpStatus: 429,
      retryAfterSeconds: 120,
    });
    expect(company?.fingerprint).not.toContain('company-key');
    expect(company?.exhaustedAt).toBeTruthy();
    expect(company?.elapsedMsUntilExhausted).toEqual(expect.any(Number));

    expect(fallback).toMatchObject({
      status: 'healthy',
      requestCount: 1,
      successCount: 1,
      lastHttpStatus: 200,
    });
  });

  it('exposes configured key fingerprints without exposing key values', () => {
    process.env.GFW_COMPANY_API_KEY = 'company-key';
    process.env.GFW_API_KEY = 'fallback-key';

    const keys = getConfiguredGfwKeyFingerprints();

    expect(keys).toHaveLength(2);
    expect(keys.map((key) => key.label)).toEqual(['company', 'fallback']);
    expect(keys[0].fingerprint).toMatch(/^[a-f0-9]{12}$/);
    expect(JSON.stringify(keys)).not.toContain('company-key');
    expect(JSON.stringify(keys)).not.toContain('fallback-key');
  });
});
