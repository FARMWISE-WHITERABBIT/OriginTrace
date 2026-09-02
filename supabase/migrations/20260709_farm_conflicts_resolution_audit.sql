-- Migration: farm_conflicts resolution audit trail
-- app/api/conflicts/route.ts PATCH has always written resolved_by/resolved_at/
-- resolution_notes on farm_conflicts, but no migration ever added these columns —
-- this update has been silently failing at the DB layer since the feature was built.
-- Date: 2026-07-09

ALTER TABLE farm_conflicts
  ADD COLUMN IF NOT EXISTS resolved_by     UUID REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS resolved_at     TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS resolution_notes TEXT;

CREATE INDEX IF NOT EXISTS idx_farm_conflicts_resolved_by
  ON farm_conflicts(resolved_by)
  WHERE resolved_by IS NOT NULL;
