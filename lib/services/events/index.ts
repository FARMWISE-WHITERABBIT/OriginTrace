/**
 * OriginTrace Cross-Layer Event System
 *
 * Synchronous domain event dispatch. Handlers update related layers
 * within the same request context — no message queue, no latency.
 *
 * Usage in an API route:
 *   import { emitEvent } from '@/lib/services/events';
 *   await emitEvent({ name: 'batch.created', orgId, actorId, payload: { ... } }, supabase);
 *
 * External notifications (webhooks, org integrations) remain in:
 *   lib/webhooks.ts — dispatchWebhookEvent()
 *   lib/integrations/dispatcher.ts — dispatchIntegrationEvent()
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { DomainEvent, DomainEventName } from './types';
import { handleFarmRegistered }        from './handlers/farm-registered.handler';
import { handleBatchCreated }          from './handlers/batch-created.handler';
import { handleDocumentUploaded }      from './handlers/document-uploaded.handler';
import { handleShipmentStageAdvanced } from './handlers/shipment-stage-advanced.handler';
import { handleBorderOutcomeRecorded } from './handlers/border-outcome.handler';
import { handleFarmerInputRecorded }   from './handlers/farmer-input.handler';

type Handler = (event: DomainEvent<any>, supabase: SupabaseClient) => Promise<void>;

const HANDLERS: Partial<Record<DomainEventName, Handler>> = {
  'farm.registered':       handleFarmRegistered,
  'batch.created':         handleBatchCreated,
  'document.uploaded':     handleDocumentUploaded,
  'shipment.stage_advanced': handleShipmentStageAdvanced,
  'border_outcome.recorded': handleBorderOutcomeRecorded,
  'farmer_input.recorded': handleFarmerInputRecorded,
};

/**
 * Emit a domain event and run its cross-layer handler synchronously.
 * Never throws — errors are caught and logged so the primary API operation always completes.
 */
export async function emitEvent<T = Record<string, unknown>>(
  event: Omit<DomainEvent<T>, 'timestamp'> & { timestamp?: string },
  supabase: SupabaseClient
): Promise<void> {
  const fullEvent: DomainEvent<T> = {
    ...event,
    timestamp: event.timestamp ?? new Date().toISOString(),
  };

  const handler = HANDLERS[fullEvent.name];
  if (!handler) return;

  try {
    await handler(fullEvent, supabase);
  } catch (error) {
    // Cross-layer propagation failures must never break the primary operation.
    console.error(`[events] Handler for "${fullEvent.name}" failed:`, error);
  }
}

export type { DomainEvent, DomainEventName } from './types';
export * from './types';
