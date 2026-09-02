# ADR-003: Webhook Event Catalog as Single Source of Truth

**Status:** Accepted  
**Date:** 2026-04-10  
**Author:** Engineering  
**Deciders:** Engineering Lead

---

## Context

Two separate files define event type strings:

1. **`lib/webhooks.ts`** — exports `WEBHOOK_EVENTS` (27-element `as const` array) and derives `WebhookEventType` from it.
2. **`lib/integrations/dispatcher.ts`** — defines `IntegrationEventType` as a local union literal with 9 event strings.

The two catalogs are **neither a subset nor a superset** of each other:
- `IntegrationEventType` contains `'farm.created'`, `'batch.completed'`, `'shipment.status_changed'`, and `'deforestation.alert'` which do not appear in `WEBHOOK_EVENTS`.
- `WEBHOOK_EVENTS` contains 18+ events that are not represented in `IntegrationEventType`.

This means a feature shipped via integration webhooks may fire a different (or missing) event string than the same feature shipped via the webhook delivery system, making analytics, replay, and audit unreliable.

---

## Decision

A single canonical catalog lives at:

```
modules/integrations/domain/event-catalog.ts
```

This file:
- Exports `EVENT_CATALOG` — a complete `as const` array of all event strings used anywhere in the platform.
- Exports `PlatformEventType` — the derived union type (replaces both `WebhookEventType` and `IntegrationEventType`).
- Is the **only** place event strings may be defined.

### Catalog structure

Events follow the `noun.verb` convention (`subject.action`). The full merged catalog covers:

| Namespace | Events |
|-----------|--------|
| `batch.*` | `batch.created`, `batch.completed` |
| `shipment.*` | `shipment.created`, `shipment.updated`, `shipment.scored`, `shipment.status_changed` |
| `farm.*` | `farm.approved`, `farm.rejected`, `farm.created` |
| `document.*` | `document.uploaded`, `document.expired` |
| `compliance.*` | `compliance.changed` |
| `lab_result.*` | `lab_result.uploaded`, `lab_result.non_compliant` |
| `payment.*` | `payment.received`, `payment.recorded`, `payment.disbursed`, `payment.transfer_completed`, `payment.transfer_failed` |
| `certification.*` | `certification.expiring` |
| `tender.*` | `tender.created`, `tender.awarded` |
| `evidence_package.*` | `evidence_package.created` |
| `kyc.*` | `kyc.submitted`, `kyc.approved`, `kyc.rejected` |
| `escrow.*` | `escrow.held`, `escrow.released`, `escrow.disputed` |
| `dispute.*` | `dispute.resolved` |
| `deforestation.*` | `deforestation.alert` |

### Migration

`lib/webhooks.ts` re-exports `WEBHOOK_EVENTS` and `WebhookEventType` from the canonical module (backwards-compatible).  
`lib/integrations/dispatcher.ts` imports `PlatformEventType` instead of defining `IntegrationEventType` locally.

---

## Consequences

- Any new event string must be added to `modules/integrations/domain/event-catalog.ts` first, then used.
- `WEBHOOK_EVENTS` (the array used by the webhook subscription UI) can be re-derived as a filtered subset or kept as the full catalog depending on product requirements — but the type still comes from here.
- Integration tests that assert on specific event strings will automatically catch catalog drift.
