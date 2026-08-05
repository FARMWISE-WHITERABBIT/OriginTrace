-- Add export-profile and NEPC fields to event_registrations
ALTER TABLE event_registrations
  ADD COLUMN IF NOT EXISTS currently_exporting boolean,
  ADD COLUMN IF NOT EXISTS export_products     text,
  ADD COLUMN IF NOT EXISTS nepc_registered     boolean;
