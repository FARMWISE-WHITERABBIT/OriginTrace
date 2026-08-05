-- Migration: webhook_deliveries reliability columns
-- Session 6 — OriginTrace audit remediation
-- Run once against your Supabase project.
--
-- Adds two columns required by the new cron-based retry system:
--   next_retry_at      TIMESTAMPTZ  — when the delivery should next be attempted
--   last_attempted_at  TIMESTAMPTZ  — timestamp of the most recent attempt
--
-- Also adds an index so the cron query (pending + next_retry_at < now) is fast.

ALTER TABLE webhook_deliveries
  ADD COLUMN IF NOT EXISTS next_retry_at     TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS last_attempted_at TIMESTAMPTZ;

-- Index for the cron query: WHERE status = 'pending' AND next_retry_at < now()
CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_retry
  ON webhook_deliveries (status, next_retry_at)
  WHERE status = 'pending';

-- Backfill: existing pending rows get a next_retry_at of now so they
-- are picked up on the first cron invocation after this migration runs.
UPDATE webhook_deliveries
SET
  next_retry_at     = NOW(),
  last_attempted_at = COALESCE(created_at, NOW())
WHERE status = 'pending'
  AND next_retry_at IS NULL;
