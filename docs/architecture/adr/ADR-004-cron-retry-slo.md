# ADR-004: Cron Retry SLO for Webhook Delivery

**Status:** Accepted  
**Date:** 2026-04-10  
**Author:** Engineering  
**Deciders:** Engineering Lead

---

## Context

The webhook delivery system (`lib/webhooks.ts`) performs fire-and-forget delivery on the first attempt, then relies on a cron job (`/api/cron/webhook-retry`) to pick up `status: 'pending'` rows and retry with exponential back-off.

The retry math (`backoffMs`) is defined inline in `lib/webhooks.ts` alongside delivery logic, making it invisible to the cron job file. A developer reading the cron job has no way to know:
- How many retries are attempted
- What the back-off delays are
- When a delivery is permanently failed
- What the worst-case delivery window is

There is also no documented SLO — teams have no contract to hold the system against.

---

## Decision

### Retry schedule (formal SLO)

| Attempt | Delay after previous | Cumulative elapsed |
|---------|----------------------|--------------------|
| 1       | Immediate            | 0 s                |
| 2       | ~1 min               | ~1 min             |
| 3       | ~5 min               | ~6 min             |
| 4       | ~30 min              | ~36 min            |
| 5       | ~2 h                 | ~2 h 36 min        |

**SLO commitment:** All webhook deliveries complete within **3 hours** of the originating event, or are permanently failed (dead-lettered) after 5 attempts.  
**Monitoring:** A Sentry alert fires when `webhook_deliveries` rows age past 3 h with `status = 'pending'`.

### Single source

All retry constants and the `backoffMs` function move to:

```
lib/platform/scheduling/cron-policy.ts
```

Exports:
```typescript
export const WEBHOOK_MAX_ATTEMPTS = 5;
export const WEBHOOK_DELIVERY_SLO_MS = 3 * 60 * 60 * 1000; // 3 hours

export function webhookBackoffMs(attempt: number): number;
// attempt 1 → 60_000 ms  (1 min)
// attempt 2 → 300_000 ms (5 min)
// attempt 3 → 1_800_000 ms (30 min)
// attempt 4 → 7_200_000 ms (2 h)
// Uses base * 5^(attempt-1) + jitter(0–5 s), capped at 8 h
```

`lib/webhooks.ts` imports from `cron-policy.ts` — no constants duplicated.

### Jitter

Random jitter of 0–5 s is added to each delay to prevent thundering-herd retries when multiple deliveries fail simultaneously (e.g., downstream outage).

---

## Consequences

- The cron job file can import `WEBHOOK_MAX_ATTEMPTS` and `webhookBackoffMs` directly — no magic numbers.
- A future change to the retry schedule is a one-file change.
- The 3-hour SLO is observable: any `webhook_deliveries` row with `status = 'pending'` and `created_at < now() - interval '3 hours'` is a SLO breach.
