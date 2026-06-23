/**
 * lib/platform/scheduling/cron-policy.ts
 *
 * Canonical retry SLO constants and back-off function for cron-driven jobs.
 * See docs/architecture/adr/ADR-004-cron-retry-slo.md.
 *
 * All files that implement retry logic (webhooks, integrations, background jobs)
 * import from here — no inline back-off math anywhere else.
 */

// ---------------------------------------------------------------------------
// Webhook delivery SLO
// ---------------------------------------------------------------------------

/** Maximum delivery attempts before a webhook delivery is permanently failed. */
export const WEBHOOK_MAX_ATTEMPTS = 5;

/**
 * Maximum elapsed time from first attempt to final failure.
 * Attempt 5 fires ~2 h 36 min after attempt 1.
 * We commit to a 3-hour SLO with a small buffer.
 */
export const WEBHOOK_DELIVERY_SLO_MS = 3 * 60 * 60 * 1000; // 3 hours

/**
 * Exponential back-off with jitter for webhook delivery retries.
 *
 * Schedule:
 *   attempt 1 →   60 s  (1 min)
 *   attempt 2 →  300 s  (5 min)
 *   attempt 3 → 1800 s  (30 min)
 *   attempt 4 → 7200 s  (2 h)
 *   attempt 5+ → capped at 8 h (should never reach due to MAX_ATTEMPTS = 5)
 *
 * Formula: base × 5^(attempt-1) + jitter(0–5 s), capped at 8 h.
 *
 * @param attempt - The attempt number that just failed (1-indexed).
 * @returns Milliseconds to wait before the next attempt.
 */
export function webhookBackoffMs(attempt: number): number {
  const base    = 60_000;          // 1 minute base
  const cap     = 8 * 60 * 60_000; // 8-hour ceiling
  const jitter  = Math.random() * 5_000;
  return Math.min(base * Math.pow(5, attempt - 1) + jitter, cap);
}

// ---------------------------------------------------------------------------
// Generic job retry policy (for future background jobs)
// ---------------------------------------------------------------------------

export interface RetryPolicy {
  maxAttempts: number;
  backoffMs: (attempt: number) => number;
  sloMs: number;
}

/** Default retry policy — same schedule as webhook delivery. */
export const DEFAULT_RETRY_POLICY: RetryPolicy = {
  maxAttempts: WEBHOOK_MAX_ATTEMPTS,
  backoffMs:   webhookBackoffMs,
  sloMs:       WEBHOOK_DELIVERY_SLO_MS,
};
