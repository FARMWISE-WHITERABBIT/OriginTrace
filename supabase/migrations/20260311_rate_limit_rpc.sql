-- Migration: atomic rate limit counter RPC
-- Session 7 — OriginTrace audit remediation
-- Run once against your Supabase project.
--
-- Creates an RPC function that atomically increments the request counter
-- for a rate limit window, or creates a new window if the current one
-- has expired. Returns the new count so the caller can decide whether
-- to allow the request.
--
-- This eliminates the SELECT + UPDATE race condition in the previous
-- implementation where two concurrent requests could both read count=0
-- and both be allowed even when the limit was 1.

-- Extend api_rate_limits to support per-IP / per-org keys by allowing
-- the key to be any composite string (already the case — key_prefix TEXT).
-- Add a compound unique on (key_prefix) — already the PRIMARY KEY.
-- No schema changes needed for the table itself.

-- ─── Atomic increment RPC ────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION increment_rate_limit(
  p_key        TEXT,
  p_window_sec INTEGER,
  p_max        INTEGER
)
RETURNS TABLE (
  current_count  INTEGER,
  window_end     TIMESTAMPTZ,
  allowed        BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_now         TIMESTAMPTZ := NOW();
  v_window_end  TIMESTAMPTZ := v_now + (p_window_sec || ' seconds')::INTERVAL;
  v_count       INTEGER;
  v_end         TIMESTAMPTZ;
BEGIN
  -- Atomically insert a new window OR increment existing window's counter.
  -- ON CONFLICT: if the existing window is still valid, increment its count.
  -- If the window has expired, replace it with a fresh one (count=1).
  INSERT INTO api_rate_limits (key_prefix, request_count, window_start, window_end)
  VALUES (p_key, 1, v_now, v_window_end)
  ON CONFLICT (key_prefix) DO UPDATE
    SET
      request_count = CASE
        WHEN api_rate_limits.window_end <= NOW()
          THEN 1                                  -- expired window → reset
        ELSE api_rate_limits.request_count + 1    -- active window → increment
      END,
      window_start = CASE
        WHEN api_rate_limits.window_end <= NOW()
          THEN NOW()
        ELSE api_rate_limits.window_start
      END,
      window_end = CASE
        WHEN api_rate_limits.window_end <= NOW()
          THEN NOW() + (p_window_sec || ' seconds')::INTERVAL
        ELSE api_rate_limits.window_end
      END
  RETURNING api_rate_limits.request_count, api_rate_limits.window_end
  INTO v_count, v_end;

  RETURN QUERY SELECT
    v_count,
    v_end,
    (v_count <= p_max)::BOOLEAN;
END;
$$;

-- Grant execute to service role only (rate limiter runs server-side)
REVOKE ALL ON FUNCTION increment_rate_limit(TEXT, INTEGER, INTEGER) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION increment_rate_limit(TEXT, INTEGER, INTEGER) TO service_role;

-- Cleanup index: purge expired windows efficiently
CREATE INDEX IF NOT EXISTS idx_api_rate_limits_expiry
  ON api_rate_limits (window_end)
  WHERE window_end < NOW();
