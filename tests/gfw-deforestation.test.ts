import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  GFW_TREE_COVER_LOSS_SQL,
  getGfwQueryUrl,
  normalizeGfwTreeCoverLossResponse,
  queryGfwTreeCoverLoss,
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
});
