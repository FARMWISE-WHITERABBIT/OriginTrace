/**
 * modules/integrations/application/use-cases/emit-event.ts
 *
 * Use-case: emit a typed platform event through all registered integration
 * sinks (webhooks, Slack, third-party connectors, etc.).
 *
 * Application layer: orchestrates domain validation + infra dispatch.
 * Domain rules (event catalog, type guard) are imported from domain/.
 * Actual dispatch is delegated to the infra gateway.
 *
 * Usage:
 *   await emitEvent('batch.completed', { batchId, orgId, weight });
 *
 * The caller never touches lib/integrations/dispatcher.ts directly.
 * That module is now an implementation detail behind the gateway.
 */

import { isPlatformEventType, type PlatformEventType } from '../../domain/event-catalog';
import { webhookDispatcherGateway } from '../../infra/webhook-dispatcher.gateway';

export interface EmitEventInput {
  event:   PlatformEventType;
  payload: Record<string, unknown>;
  /** Optional: skip dispatch (useful in tests / dry-run). */
  dryRun?: boolean;
}

export type EmitEventResult =
  | { dispatched: true }
  | { dispatched: false; reason: 'unknown_event' | 'dry_run' | 'dispatch_error'; detail?: string };

/**
 * Validate and emit a platform event.
 *
 * - Validates the event string against the canonical catalog (ADR-003).
 * - Delegates to the webhook dispatcher gateway (infra layer).
 * - Never throws: errors are caught and returned as a typed result.
 */
export async function emitEvent(input: EmitEventInput): Promise<EmitEventResult> {
  if (!isPlatformEventType(input.event)) {
    console.warn('[emit-event] Unknown event type:', input.event);
    return { dispatched: false, reason: 'unknown_event' };
  }

  if (input.dryRun) {
    return { dispatched: false, reason: 'dry_run' };
  }

  try {
    await webhookDispatcherGateway.dispatch(input.event, input.payload);
    return { dispatched: true };
  } catch (err: any) {
    console.error('[emit-event] Dispatch error:', err);
    return { dispatched: false, reason: 'dispatch_error', detail: err?.message };
  }
}

/**
 * Convenience: fire-and-forget variant for route handlers that
 * shouldn't be blocked by integration failures.
 */
export function emitEventBackground(
  event: PlatformEventType,
  payload: Record<string, unknown>,
): void {
  emitEvent({ event, payload }).catch((err) =>
    console.error('[emit-event-background] Unhandled error:', err),
  );
}
