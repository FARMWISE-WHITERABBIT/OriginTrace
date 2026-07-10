/**
 * Tests for the Terminal49 adapter + subscribe function
 * (lib/services/terminal49.ts).
 *
 * We have no live Terminal49 credentials, so payload fixtures below are
 * representative examples constructed from Terminal49's public documentation
 * (JSON:API webhook_notification envelope, transport_event attributes
 * event/timestamp/location_locode/voyage_number, shipment ref_numbers/tags,
 * X-T49-Webhook-Signature = HMAC-SHA256 hex of the raw body). All HTTP is
 * mocked — nothing here talks to the real API.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createHmac } from 'crypto';

// ─── Mock infrastructure ──────────────────────────────────────────────────────

const h = vi.hoisted(() => {
  function chainable(result: unknown) {
    const target = () => {};
    const proxy: any = new Proxy(target, {
      get(_t, prop) {
        if (prop === 'then') {
          return (res: (v: unknown) => unknown, rej: (e: unknown) => unknown) =>
            Promise.resolve(result).then(res, rej);
        }
        return () => proxy;
      },
    });
    return proxy;
  }
  const mockFrom = vi.fn();
  return { chainable, mockFrom };
});

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: () => ({ from: h.mockFrom }),
}));
vi.mock('@/lib/audit', () => ({ logAuditEvent: vi.fn(async () => {}) }));

import {
  verifyTerminal49Signature,
  parseTerminal49Webhook,
  subscribeShipmentToTerminal49,
  TERMINAL49_EVENT_MAP,
  T49_SUBSCRIPTION_REF_PREFIX,
} from '@/lib/services/terminal49';
import { EVENT_STAGE_MAP } from '@/lib/services/shipping-events';

const SUB_ID = '11111111-2222-3333-4444-555555555555';

beforeEach(() => {
  vi.clearAllMocks();
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

// ─── Signature verification ───────────────────────────────────────────────────

describe('verifyTerminal49Signature', () => {
  const body = '{"data":{"type":"webhook_notification"}}';

  it('accepts a valid HMAC-SHA256 hex signature', () => {
    vi.stubEnv('TERMINAL49_WEBHOOK_SECRET', 'whsec_test');
    const sig = createHmac('sha256', 'whsec_test').update(body).digest('hex');
    expect(verifyTerminal49Signature(body, sig)).toBe(true);
  });

  it('rejects a wrong signature', () => {
    vi.stubEnv('TERMINAL49_WEBHOOK_SECRET', 'whsec_test');
    const sig = createHmac('sha256', 'wrong_secret').update(body).digest('hex');
    expect(verifyTerminal49Signature(body, sig)).toBe(false);
  });

  it('rejects a tampered body', () => {
    vi.stubEnv('TERMINAL49_WEBHOOK_SECRET', 'whsec_test');
    const sig = createHmac('sha256', 'whsec_test').update(body).digest('hex');
    expect(verifyTerminal49Signature(body + ' ', sig)).toBe(false);
  });

  it('fails safe when the secret is unset or the header is missing', () => {
    const sig = createHmac('sha256', 'whsec_test').update(body).digest('hex');
    expect(verifyTerminal49Signature(body, sig)).toBe(false); // no env secret
    vi.stubEnv('TERMINAL49_WEBHOOK_SECRET', 'whsec_test');
    expect(verifyTerminal49Signature(body, null)).toBe(false);
  });
});

// ─── Payload parsing ──────────────────────────────────────────────────────────

function transportEventNotification(overrides: {
  notificationEvent?: string;
  transportEvent?: string;
  refNumbers?: string[];
  locode?: string | null;
} = {}) {
  const teEvent = overrides.transportEvent ?? 'container.transport.vessel_loaded';
  return {
    data: {
      id: 'notif-0001',
      type: 'webhook_notification',
      attributes: {
        event: overrides.notificationEvent ?? teEvent,
        delivery_status: 'pending',
        created_at: '2026-07-01T10:00:00Z',
      },
      relationships: {
        reference_object: { data: { id: 'te-0001', type: 'transport_event' } },
        webhook: { data: { id: 'wh-0001', type: 'webhook' } },
      },
    },
    included: [
      {
        id: 'te-0001',
        type: 'transport_event',
        attributes: {
          event: teEvent,
          created_at: '2026-07-01T10:00:00Z',
          timestamp: '2026-07-01T09:38:00Z',
          location_locode: overrides.locode === undefined ? 'NGAPP' : overrides.locode,
          timezone: 'Africa/Lagos',
          voyage_number: '0082E',
          data_source: 'shipping_line',
        },
        relationships: {
          shipment: { data: { id: 'shp-t49-1', type: 'shipment' } },
          container: { data: { id: 'cont-1', type: 'container' } },
          vessel: { data: { id: 'ves-1', type: 'vessel' } },
          location: { data: { id: 'loc-1', type: 'port' } },
        },
      },
      {
        id: 'shp-t49-1',
        type: 'shipment',
        attributes: {
          bill_of_lading_number: 'MAEU123456789',
          ref_numbers: overrides.refNumbers ?? [`${T49_SUBSCRIPTION_REF_PREFIX}${SUB_ID}`],
          tags: [],
          port_of_lading_locode: 'NGAPP',
          port_of_discharge_locode: 'NLRTM',
        },
      },
      { id: 'ves-1', type: 'vessel', attributes: { name: 'MSC AMSTERDAM' } },
      { id: 'loc-1', type: 'port', attributes: { name: 'Apapa' } },
    ],
  };
}

describe('parseTerminal49Webhook — transport events', () => {
  it('maps vessel_loaded onto LOAD (ACT) with location, vessel and voyage', () => {
    const parsed = parseTerminal49Webhook(JSON.stringify(transportEventNotification()));

    expect(parsed.subscriptionId).toBe(SUB_ID);
    expect(parsed.referenceId).toBeNull(); // transport payloads carry no tracking_request id
    expect(parsed.events).toHaveLength(1);
    expect(parsed.events[0]).toMatchObject({
      providerEventId: 'te-0001',
      eventCode: 'LOAD',
      classifier: 'ACT',
      eventTime: '2026-07-01T09:38:00Z',
      locationLocode: 'NGAPP',
      locationName: 'Apapa',
      vesselName: 'MSC AMSTERDAM',
      voyageNumber: '0082E',
    });
  });

  it('maps the core milestone vocabulary', () => {
    const cases: Array<[string, string]> = [
      ['container.transport.vessel_departed', 'DEPA'],
      ['container.transport.vessel_arrived', 'ARRI'],
      ['container.transport.vessel_discharged', 'DISC'],
      ['container.transport.full_in', 'GTIN'],
      ['container.transport.full_out', 'GTOT'],
    ];
    for (const [t49Event, code] of cases) {
      const parsed = parseTerminal49Webhook(
        JSON.stringify(transportEventNotification({ transportEvent: t49Event }))
      );
      expect(parsed.events[0]?.eventCode).toBe(code);
      expect(parsed.events[0]?.classifier).toBe('ACT');
    }
  });

  it('maps transshipment events to TS* codes that can NEVER release', () => {
    const parsed = parseTerminal49Webhook(
      JSON.stringify(
        transportEventNotification({
          transportEvent: 'container.transport.transshipment_discharged',
          locode: 'ESALG',
        })
      )
    );
    expect(parsed.events[0]?.eventCode).toBe('TSDIS');
    // Safety pin: no TS* code may ever appear in the release stage map.
    for (const code of Object.values(TERMINAL49_EVENT_MAP)) {
      if (code.startsWith('TS')) {
        expect(EVENT_STAGE_MAP[code as keyof typeof EVENT_STAGE_MAP]).toBeUndefined();
      }
    }
  });

  it('marks estimated events as EST (engine will never release them)', () => {
    const parsed = parseTerminal49Webhook(
      JSON.stringify(
        transportEventNotification({
          transportEvent: 'container.transport.estimated.vessel_departed',
        })
      )
    );
    expect(parsed.events[0]).toMatchObject({ eventCode: 'DEPA', classifier: 'EST' });
  });

  it('skips event types with no confident mapping instead of guessing', () => {
    for (const t49Event of [
      'container.transport.rail_loaded',
      'container.transport.empty_out',
      'container.transport.vessel_berthed',
      'container.transport.delivered',
    ]) {
      const parsed = parseTerminal49Webhook(
        JSON.stringify(transportEventNotification({ transportEvent: t49Event }))
      );
      expect(parsed.events).toHaveLength(0);
    }
  });

  it('returns no subscriptionId when the ref_numbers round-trip is absent', () => {
    const parsed = parseTerminal49Webhook(
      JSON.stringify(transportEventNotification({ refNumbers: ['CUSTOMER-PO-1'] }))
    );
    expect(parsed.subscriptionId).toBeNull();
    expect(parsed.events).toHaveLength(1); // events still parsed; route will no-op without a reference
  });

  it('throws on a structurally invalid payload', () => {
    expect(() => parseTerminal49Webhook('{"data":{"type":"something_else"}}')).toThrow();
    expect(() => parseTerminal49Webhook('not json')).toThrow();
  });
});

describe('parseTerminal49Webhook — tracking_request lifecycle', () => {
  function lifecycleNotification(event: string) {
    return {
      data: {
        id: 'notif-0002',
        type: 'webhook_notification',
        attributes: { event, delivery_status: 'pending', created_at: '2026-07-01T10:00:00Z' },
        relationships: {
          reference_object: { data: { id: 'tr-0001', type: 'tracking_request' } },
          webhook: { data: { id: 'wh-0001', type: 'webhook' } },
        },
      },
      included: [
        {
          id: 'tr-0001',
          type: 'tracking_request',
          attributes: { request_number: 'MSKU1234567', request_type: 'container', status: 'created' },
        },
      ],
    };
  }

  it('resolves the tracking_request id directly and emits no shipping events', () => {
    const parsed = parseTerminal49Webhook(
      JSON.stringify(lifecycleNotification('tracking_request.succeeded'))
    );
    expect(parsed.referenceId).toBe('tr-0001');
    expect(parsed.events).toHaveLength(0);
    expect(parsed.subscriptionStatus).toBeUndefined();
  });

  it('flags tracking_request.failed as a subscription error', () => {
    const parsed = parseTerminal49Webhook(
      JSON.stringify(lifecycleNotification('tracking_request.failed'))
    );
    expect(parsed).toMatchObject({ referenceId: 'tr-0001', subscriptionStatus: 'error' });
  });

  it('flags tracking_request.tracking_stopped as cancelled', () => {
    const parsed = parseTerminal49Webhook(
      JSON.stringify(lifecycleNotification('tracking_request.tracking_stopped'))
    );
    expect(parsed).toMatchObject({ referenceId: 'tr-0001', subscriptionStatus: 'cancelled' });
  });
});

// ─── Subscribe function ───────────────────────────────────────────────────────

describe('subscribeShipmentToTerminal49', () => {
  const params = {
    shipmentId: 'shp-1',
    orgId: 'org-1',
    actorId: 'user-1',
    actorEmail: 'ops@example.com',
    containerNumber: 'MSKU1234567',
    billOfLadingNumber: null,
    carrierScac: null,
  };

  function stubSubscriptionTables(existing: Array<{ id: string }> = []) {
    const inserts: any[] = [];
    h.mockFrom.mockImplementation((table: string) => {
      if (table === 'tracking_subscriptions') {
        return {
          select: () => h.chainable({ data: existing, error: null }),
          insert: (row: unknown) => {
            inserts.push(row);
            return h.chainable({ error: null });
          },
        };
      }
      throw new Error(`unexpected table: ${table}`);
    });
    return { inserts };
  }

  it('no-ops with a log line (never throws) when TERMINAL49_API_KEY is unset', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    const result = await subscribeShipmentToTerminal49(params);
    expect(result).toMatchObject({ subscribed: false, reason: 'api_key_unset' });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('creates a tracking request and inserts the subscription row (auto_release_enabled always false)', async () => {
    vi.stubEnv('TERMINAL49_API_KEY', 't49_test_key');
    const { inserts } = stubSubscriptionTables();
    const fetchMock = vi.fn(async () => ({
      ok: true,
      status: 201,
      json: async () => ({ data: { id: 'tr-9999', type: 'tracking_request' } }),
      text: async () => '',
    }));
    vi.stubGlobal('fetch', fetchMock);

    const result = await subscribeShipmentToTerminal49(params);

    expect(result.subscribed).toBe(true);
    expect(result.trackingRequestId).toBe('tr-9999');

    // Request shape per Terminal49 docs
    expect(fetchMock).toHaveBeenCalledOnce();
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('https://api.terminal49.com/v2/tracking_requests');
    expect((init.headers as Record<string, string>).Authorization).toBe('Token t49_test_key');
    const sent = JSON.parse(String(init.body));
    expect(sent.data.type).toBe('tracking_request');
    expect(sent.data.attributes).toMatchObject({
      request_type: 'container',
      request_number: 'MSKU1234567',
      auto_detect_vocc_scac: true,
    });
    expect(sent.data.attributes.ref_numbers[0]).toMatch(
      new RegExp(`^${T49_SUBSCRIPTION_REF_PREFIX}[0-9a-f-]{36}$`)
    );

    // Subscription row: visibility only — money automation stays opt-in.
    expect(inserts).toHaveLength(1);
    expect(inserts[0]).toMatchObject({
      provider: 'terminal49',
      provider_reference_id: 'tr-9999',
      auto_release_enabled: false,
      created_by: 'user-1',
      org_id: 'org-1',
      shipment_id: 'shp-1',
    });
    // The pre-generated subscription id rides along as the ref_number.
    expect(sent.data.attributes.ref_numbers[0]).toBe(
      `${T49_SUBSCRIPTION_REF_PREFIX}${inserts[0].id}`
    );
  });

  it('prefers bill_of_lading tracking when a B/L number exists, and passes an explicit SCAC', async () => {
    vi.stubEnv('TERMINAL49_API_KEY', 't49_test_key');
    stubSubscriptionTables();
    const fetchMock = vi.fn(async () => ({
      ok: true,
      status: 201,
      json: async () => ({ data: { id: 'tr-1' } }),
      text: async () => '',
    }));
    vi.stubGlobal('fetch', fetchMock);

    await subscribeShipmentToTerminal49({
      ...params,
      billOfLadingNumber: 'MAEU987654321',
      carrierScac: 'MAEU',
    });

    const sent = JSON.parse(String((fetchMock.mock.calls[0] as any)[1].body));
    expect(sent.data.attributes).toMatchObject({
      request_type: 'bill_of_lading',
      request_number: 'MAEU987654321',
      scac: 'MAEU',
    });
    expect(sent.data.attributes.auto_detect_vocc_scac).toBeUndefined();
  });

  it('skips when a live Terminal49 subscription already exists (idempotent)', async () => {
    vi.stubEnv('TERMINAL49_API_KEY', 't49_test_key');
    const { inserts } = stubSubscriptionTables([{ id: 'sub-existing' }]);
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    const result = await subscribeShipmentToTerminal49(params);
    expect(result).toMatchObject({ subscribed: false, reason: 'already_subscribed' });
    expect(fetchMock).not.toHaveBeenCalled();
    expect(inserts).toHaveLength(0);
  });

  it('swallows API errors (non-2xx) without throwing and inserts nothing', async () => {
    vi.stubEnv('TERMINAL49_API_KEY', 't49_test_key');
    const { inserts } = stubSubscriptionTables();
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({ ok: false, status: 422, json: async () => ({}), text: async () => 'unprocessable' }))
    );

    const result = await subscribeShipmentToTerminal49(params);
    expect(result).toMatchObject({ subscribed: false, reason: 'api_http_422' });
    expect(inserts).toHaveLength(0);
  });

  it('swallows network failures without throwing', async () => {
    vi.stubEnv('TERMINAL49_API_KEY', 't49_test_key');
    stubSubscriptionTables();
    vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('ECONNRESET'); }));

    const result = await subscribeShipmentToTerminal49(params);
    expect(result).toMatchObject({ subscribed: false, reason: 'unexpected_error' });
  });

  it('no-ops when the shipment has no container or B/L number', async () => {
    vi.stubEnv('TERMINAL49_API_KEY', 't49_test_key');
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    const result = await subscribeShipmentToTerminal49({
      ...params,
      containerNumber: null,
      billOfLadingNumber: null,
    });
    expect(result).toMatchObject({ subscribed: false, reason: 'no_tracking_number' });
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
