/**
 * modules/integrations/infra/webhook-dispatcher.gateway.ts
 *
 * Infra adapter: wraps the existing lib/integrations/dispatcher.ts so
 * the application layer talks to an interface, not a concrete module.
 *
 * During migration, both the legacy dispatcher.ts path and this gateway
 * are operational. New code should use the gateway via emit-event.ts.
 */

import type { PlatformEventType } from '../domain/event-catalog';

export interface IWebhookDispatcherGateway {
  dispatch(event: PlatformEventType, payload: Record<string, unknown>): Promise<void>;
}

/**
 * Lazy-load the dispatcher to avoid circular module issues during the
 * migration period where lib/integrations/dispatcher.ts may import
 * from modules/integrations/domain/.
 */
export const webhookDispatcherGateway: IWebhookDispatcherGateway = {
  async dispatch(event, payload) {
    try {
      // Dynamic import keeps the dependency at runtime, not parse-time,
      // avoiding circular references during the migration period.
      const { dispatchIntegrationEvent } = await import('@/lib/integrations/dispatcher');
      await dispatchIntegrationEvent(event as any, payload);
    } catch (err) {
      // Gateway errors must never crash the caller — log and continue.
      console.error('[webhook-dispatcher-gateway] dispatch failed:', event, err);
    }
  },
};
