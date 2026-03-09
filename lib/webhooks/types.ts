/**
 * OriginTrace Webhook System
 * 
 * Phase 5 scaffold — full implementation needed:
 * - Webhook endpoint registration and management UI
 * - Delivery with retry + exponential backoff
 * - HMAC-SHA256 request signing
 * - Delivery log + replay
 * - Dead letter queue
 */

// ---------------------------------------------------------------------------
// Event type catalog
// ---------------------------------------------------------------------------
export type WebhookEventType =
  // Collection
  | 'batch.created'
  | 'batch.status_changed'
  | 'batch.flagged'
  | 'batch.dispatched'
  // Farm & compliance
  | 'farm.registered'
  | 'farm.compliance_updated'
  | 'farm.deforestation_checked'
  | 'farm.boundary_conflict_detected'
  // Shipments
  | 'shipment.created'
  | 'shipment.scored'
  | 'shipment.status_changed'
  | 'shipment.decision_changed'
  // Documents
  | 'document.expiring_soon'
  | 'document.expired'
  | 'document.uploaded'
  // Payments
  | 'payment.created'
  | 'payment.disbursed'
  | 'payment.failed'
  // Contracts
  | 'contract.created'
  | 'contract.status_changed'
  // Organization
  | 'org.tier_upgraded'
  | 'org.tier_downgraded';

export interface WebhookEndpoint {
  id: string;
  org_id: string;
  url: string;
  description?: string;
  secret: string;             // HMAC secret for signature verification
  event_types: WebhookEventType[];
  is_active: boolean;
  created_at: string;
  last_delivered_at?: string;
  failure_count: number;
}

export interface WebhookDelivery {
  id: string;
  endpoint_id: string;
  org_id: string;
  event_type: WebhookEventType;
  payload: Record<string, unknown>;
  attempt: number;
  max_attempts: number;
  status: 'pending' | 'delivered' | 'failed' | 'retrying' | 'dead';
  http_status?: number;
  error?: string;
  delivered_at?: string;
  next_retry_at?: string;
  created_at: string;
}

export interface WebhookEvent<T = Record<string, unknown>> {
  id: string;
  type: WebhookEventType;
  created_at: string;
  api_version: string;
  org_id: string;
  data: T;
}

// ---------------------------------------------------------------------------
// Delivery utility (stub — needs Redis queue for production)
// ---------------------------------------------------------------------------
export async function dispatchWebhook(
  orgId: string,
  eventType: WebhookEventType,
  data: Record<string, unknown>
): Promise<void> {
  // TODO Phase 5:
  // 1. Look up active endpoints for org with this event_type
  // 2. Build WebhookEvent payload
  // 3. Sign with HMAC-SHA256 using endpoint.secret
  // 4. Enqueue delivery job (use pg_cron or a queue service)
  // 5. Record delivery attempt in webhook_deliveries table
  console.log(`[webhook] Stub: would dispatch ${eventType} for org ${orgId}`);
}

export function buildWebhookSignature(secret: string, payload: string): string {
  // TODO: implement crypto.createHmac('sha256', secret).update(payload).digest('hex')
  throw new Error('Not implemented — requires Node crypto module');
}
