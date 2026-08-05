-- Enhanced dispatch fields for collection_batches
ALTER TABLE collection_batches
  ADD COLUMN IF NOT EXISTS driver_name          TEXT,
  ADD COLUMN IF NOT EXISTS driver_phone         TEXT,
  ADD COLUMN IF NOT EXISTS expected_arrival_at  TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS dispatch_recorded_at TIMESTAMPTZ;

COMMENT ON COLUMN collection_batches.driver_name          IS 'Driver full name';
COMMENT ON COLUMN collection_batches.driver_phone         IS 'Driver contact number';
COMMENT ON COLUMN collection_batches.expected_arrival_at  IS 'Expected time the shipment arrives at the destination';
COMMENT ON COLUMN collection_batches.dispatch_recorded_at IS 'System timestamp when the dispatch was entered into the platform';
-- Note: dispatched_at is user-specified (actual departure time), dispatch_recorded_at is system time

-- Enhanced dispatch fields for processing_runs
ALTER TABLE processing_runs
  ADD COLUMN IF NOT EXISTS dispatch_driver_name    TEXT,
  ADD COLUMN IF NOT EXISTS expected_arrival_at     TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS dispatch_recorded_at    TIMESTAMPTZ;

COMMENT ON COLUMN processing_runs.dispatch_driver_name    IS 'Driver full name for processed output dispatch';
COMMENT ON COLUMN processing_runs.expected_arrival_at     IS 'Expected arrival time at dispatch destination';
COMMENT ON COLUMN processing_runs.dispatch_recorded_at    IS 'System timestamp when the dispatch was recorded';
