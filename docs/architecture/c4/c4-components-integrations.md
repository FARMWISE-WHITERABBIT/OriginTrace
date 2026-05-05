# C4 Level 3 — Components: Integrations Module

> Shows the internal structure of the integrations feature slice: webhooks, API keys, and the platform event pipeline.

```mermaid
C4Component
  title Component diagram — Integrations Module (within Next.js App)

  Person(admin, "Admin", "Registers webhook endpoints, manages API keys, views delivery logs")
  System_Ext(buyerSystem, "Buyer / ERP System", "Subscribes to platform events via registered webhook URL")

  Container_Boundary(nextjs, "Next.js Application") {

    %% ── UI Layer ──────────────────────────────────────────────────────────────

    Component(webhooksUI, "Webhooks Settings UI", "components/settings/webhooks-content.tsx", "Manage webhook endpoint registrations: URL, secret, event subscriptions, enable/disable, test-fire, delivery log.")

    Component(apiKeysUI, "API Keys Settings UI", "components/settings/api-keys-content.tsx", "Create and revoke API keys scoped to an organisation. Key is shown once on creation; stored as a hash.")

    Component(integrationsUI, "Third-party Integrations UI", "components/settings/integrations-content.tsx", "Toggle-based panel for enabling Slack, email digest, and future third-party connectors.")

    %% ── API Layer ─────────────────────────────────────────────────────────────

    Component(webhooksApi, "Webhooks API", "app/api/webhooks/ routes", "CRUD for webhook registrations, manual test-fire endpoint, delivery log retrieval. Enforces org scoping via getAuthenticatedProfile().")

    Component(apiKeysApi, "API Keys API", "app/api/api-keys/ routes", "Create (returns plaintext once), list (returns masked), and revoke API keys stored in the api_keys table.")

    Component(integrationsApi, "Integrations API", "app/api/integrations/ routes", "Enable/disable third-party integration configurations per org.")

    %% ── Application Layer (module vertical slice) ─────────────────────────────

    Component(emitEventUseCase, "emitEvent Use-Case", "modules/integrations/application/use-cases/emit-event.ts", "Validates event string against the canonical catalog (ADR-003), then delegates to the gateway. Never throws — returns a typed result. emitEventBackground() for fire-and-forget callers.")

    Component(eventCatalog, "Platform Event Catalog", "modules/integrations/domain/event-catalog.ts", "Domain-layer: defines WEBHOOK_EVENTS string union and isPlatformEventType() type guard. Single source of truth for all emittable event names.")

    %% ── Infra Layer ───────────────────────────────────────────────────────────

    Component(webhookGateway, "Webhook Dispatcher Gateway", "modules/integrations/infra/webhook-dispatcher.gateway.ts", "Infra adapter: wraps lib/integrations/dispatcher.ts behind IWebhookDispatcherGateway interface. Dynamic import avoids circular refs during migration.")

    Component(dispatcher, "Integration Dispatcher", "lib/integrations/dispatcher.ts", "Core dispatch logic: queries registered webhook endpoints for the org, signs the payload with HMAC-SHA256, and POSTs to each URL. Handles retries and logs delivery attempts.")

    Component(supabaseAdapter, "Supabase Adapter", "lib/supabase/admin.ts", "Admin client used by dispatcher to query webhook registrations without RLS interference.")
  }

  ContainerDb(db, "Supabase Postgres", "webhook_registrations, webhook_delivery_log, api_keys, integration_configs tables")
  System_Ext(buyerSystem, "Buyer / ERP System", "Receives POST requests at registered URL")

  %% ── UI → API ────────────────────────────────────────────────────────────────
  Rel(admin, webhooksUI, "Registers endpoints, views delivery log")
  Rel(admin, apiKeysUI, "Creates and revokes API keys")
  Rel(admin, integrationsUI, "Toggles third-party connectors")

  Rel(webhooksUI, webhooksApi, "CRUD + test-fire", "fetch() /api/webhooks")
  Rel(apiKeysUI, apiKeysApi, "Create/revoke keys", "fetch() /api/api-keys")
  Rel(integrationsUI, integrationsApi, "Toggle configs", "fetch() /api/integrations")

  %% ── Event emission path ─────────────────────────────────────────────────────
  Rel(webhooksApi, emitEventUseCase, "Calls emitEventBackground() on test-fire")
  Rel(emitEventUseCase, eventCatalog, "Validates event string", "isPlatformEventType()")
  Rel(emitEventUseCase, webhookGateway, "Delegates dispatch", "IWebhookDispatcherGateway.dispatch()")
  Rel(webhookGateway, dispatcher, "Dynamic import + call", "dispatchIntegrationEvent()")
  Rel(dispatcher, supabaseAdapter, "Queries webhook_registrations", "Admin client")
  Rel(dispatcher, buyerSystem, "POSTs signed event payload", "HTTPS POST")
  Rel(dispatcher, db, "Writes delivery log entry", "Supabase JS")

  %% ── API → DB ────────────────────────────────────────────────────────────────
  Rel(webhooksApi, supabaseAdapter, "CRUD webhook_registrations", "Admin client")
  Rel(apiKeysApi, supabaseAdapter, "CRUD api_keys", "Admin client")
  Rel(integrationsApi, supabaseAdapter, "CRUD integration_configs", "Admin client")
  Rel(supabaseAdapter, db, "SQL queries via PostgREST", "Supabase JS")
```

## Platform Event Catalog (ADR-003)

All emittable event types are declared in `modules/integrations/domain/event-catalog.ts`.

**Batch lifecycle**: `batch.created`, `batch.updated`, `batch.completed`, `batch.dispatched`

**Farmer lifecycle**: `farmer.registered`, `farmer.updated`, `farmer.kyc_approved`, `farmer.kyc_rejected`

**Payment lifecycle**: `payment.initiated`, `payment.completed`, `payment.failed`, `payment.received`

**Shipment lifecycle**: `shipment.created`, `shipment.dispatched`, `shipment.delivered`, `shipment.cancelled`

**Compliance**: `compliance.profile_created`, `compliance.dds_exported`, `compliance.audit_flag`

**System**: `webhook.test`, `api_key.created`, `api_key.revoked`, `org.settings_updated`, `org.kyc_submitted`, `org.kyc_approved`, `org.kyc_rejected`

## Dispatch Payload Structure

```json
{
  "event": "batch.completed",
  "timestamp": "2026-04-11T10:00:00Z",
  "orgId": "uuid",
  "payload": { ... }
}
```

Each POST includes an `X-OriginTrace-Signature` header: `sha256=<HMAC-SHA256(secret, JSON body)>`.

## Migration Note

`lib/integrations/dispatcher.ts` is the legacy implementation. New code should call `emitEvent()` or `emitEventBackground()` from the application use-case. The gateway's dynamic import prevents circular dependencies during the migration window. Once migration is complete, direct imports of `dispatcher.ts` from outside `modules/integrations/infra/` should be removed.
