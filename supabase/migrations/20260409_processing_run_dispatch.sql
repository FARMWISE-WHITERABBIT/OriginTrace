-- Add dispatch tracking fields to processing_runs
-- Supports the workflow: processing facility → dispatch to warehouse → shipment

ALTER TABLE processing_runs
  ADD COLUMN IF NOT EXISTS dispatch_destination    TEXT,
  ADD COLUMN IF NOT EXISTS dispatch_vehicle_ref    TEXT,
  ADD COLUMN IF NOT EXISTS dispatch_driver_phone   TEXT,
  ADD COLUMN IF NOT EXISTS dispatched_output_at    TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS dispatch_notes          TEXT;

COMMENT ON COLUMN processing_runs.dispatch_destination  IS 'Warehouse or location the processed output is being sent to';
COMMENT ON COLUMN processing_runs.dispatch_vehicle_ref  IS 'Truck/vehicle plate or reference number';
COMMENT ON COLUMN processing_runs.dispatch_driver_phone IS 'Driver contact number';
COMMENT ON COLUMN processing_runs.dispatched_output_at  IS 'Timestamp when processed output left the facility';
COMMENT ON COLUMN processing_runs.dispatch_notes        IS 'Additional notes for this dispatch leg';
