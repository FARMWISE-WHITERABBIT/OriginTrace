/**
 * Integration dispatcher — fires configured org_integrations webhooks when
 * OriginTrace events occur. Called from the same places as dispatchWebhookEvent.
 */
import { createAdminClient } from '@/lib/supabase/admin';

export type IntegrationEventType =
  | 'farm.approved'
  | 'farm.rejected'
  | 'farm.created'
  | 'batch.created'
  | 'batch.completed'
  | 'shipment.created'
  | 'shipment.status_changed'
  | 'compliance.changed'
  | 'deforestation.alert';

interface DispatchResult {
  integration_id: string;
  success: boolean;
  status?: number;
  error?: string;
}

/**
 * Dispatch an event to all active integrations subscribed to it.
 * Fire-and-forget: errors are logged but never thrown.
 */
export async function dispatchIntegrationEvent(
  orgId: string,
  event: IntegrationEventType,
  payload: Record<string, unknown>,
): Promise<void> {
  // Run async so callers don't wait
  dispatchIntegrationEventAsync(orgId, event, payload).catch((err) =>
    console.error('[integrations] dispatcher crash:', err),
  );
}

async function dispatchIntegrationEventAsync(
  orgId: string,
  event: IntegrationEventType,
  payload: Record<string, unknown>,
): Promise<DispatchResult[]> {
  const supabase = createAdminClient();

  const { data: integrations, error } = await supabase
    .from('org_integrations')
    .select('id, endpoint_url, http_method, headers, api_key_enc, event_subscriptions, field_mapping')
    .eq('org_id', orgId)
    .eq('is_active', true)
    .contains('event_subscriptions', [event]);

  if (error || !integrations || integrations.length === 0) return [];

  const results: DispatchResult[] = await Promise.allSettled(
    integrations.map((integration) => fireIntegration(integration, event, payload, orgId)),
  ).then((settled) =>
    settled.map((r, i) => {
      if (r.status === 'fulfilled') return r.value;
      return { integration_id: integrations[i].id, success: false, error: String(r.reason) };
    }),
  );

  // Persist last_error / last_synced_at without blocking
  for (const result of results) {
    supabase
      .from('org_integrations')
      .update(
        result.success
          ? { last_synced_at: new Date().toISOString(), last_error: null }
          : { last_error: result.error ?? 'Unknown error' },
      )
      .eq('id', result.integration_id)
      .then(() => {});
  }

  return results;
}

async function fireIntegration(
  integration: {
    id: string;
    endpoint_url: string;
    http_method: string;
    headers: Record<string, string> | null;
    api_key_enc: string | null;
    event_subscriptions: string[];
    field_mapping: Record<string, string> | null;
  },
  event: string,
  payload: Record<string, unknown>,
  orgId: string,
): Promise<DispatchResult> {
  const mappedPayload = applyFieldMapping(
    { event, org_id: orgId, timestamp: new Date().toISOString(), data: payload },
    integration.field_mapping ?? {},
  );

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'X-OriginTrace-Event': event,
    ...(integration.headers ?? {}),
  };

  if (integration.api_key_enc) {
    // api_key_enc stores the raw key (app-layer encryption can be layered here in future)
    headers['Authorization'] = `Bearer ${integration.api_key_enc}`;
  }

  const method = (integration.http_method || 'POST').toUpperCase();

  try {
    const response = await fetch(integration.endpoint_url, {
      method,
      headers,
      body: method !== 'GET' ? JSON.stringify(mappedPayload) : undefined,
      signal: AbortSignal.timeout(10_000),
    });

    if (!response.ok) {
      return {
        integration_id: integration.id,
        success: false,
        status: response.status,
        error: `HTTP ${response.status}`,
      };
    }

    return { integration_id: integration.id, success: true, status: response.status };
  } catch (err) {
    return {
      integration_id: integration.id,
      success: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

/**
 * Rename payload keys according to field_mapping: { origintraceKey: externalKey }
 */
function applyFieldMapping(
  payload: Record<string, unknown>,
  mapping: Record<string, string>,
): Record<string, unknown> {
  if (!mapping || Object.keys(mapping).length === 0) return payload;
  const result: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(payload)) {
    result[mapping[k] ?? k] = v;
  }
  return result;
}
