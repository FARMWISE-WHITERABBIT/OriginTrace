-- Session 7: Rate limiting RPC function
CREATE OR REPLACE FUNCTION increment_rate_limit(
  p_key TEXT,
  p_max_requests INTEGER,
  p_window_secs INTEGER
)
RETURNS TABLE (
  limited BOOLEAN,
  remaining INTEGER,
  reset_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  INSERT INTO rate_limits (key, count, window_start)
  VALUES (p_key, 1, NOW())
  ON CONFLICT (key) DO UPDATE
  SET count = rate_limits.count + 1
  WHERE rate_limits.window_start > NOW() - (p_window_secs || ' seconds')::INTERVAL
  RETURNING
    (rate_limits.count > p_max_requests) AS limited,
    (p_max_requests - rate_limits.count) AS remaining,
    (rate_limits.window_start + (p_window_secs || ' seconds')::INTERVAL) AS reset_at;
END;
$$ LANGUAGE plpgsql;

GRANT EXECUTE ON FUNCTION increment_rate_limit TO service_role;
REVOKE ALL ON FUNCTION increment_rate_limit FROM public;
