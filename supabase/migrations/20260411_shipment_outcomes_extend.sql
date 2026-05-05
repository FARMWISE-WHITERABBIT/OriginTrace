-- Migration: Extend shipment_outcomes table
-- Adds the extended fields expected by the POST /api/shipments/[id]/outcomes route.
-- The original schema only had: outcome, reason, destination_country, recorded_at
-- Date: 2026-04-11

-- Drop old narrow CHECK constraint and replace with the full outcome vocabulary
ALTER TABLE shipment_outcomes DROP CONSTRAINT IF EXISTS shipment_outcomes_outcome_check;
ALTER TABLE shipment_outcomes ADD CONSTRAINT shipment_outcomes_outcome_check
  CHECK (outcome IN ('accepted', 'approved', 'rejected', 'delayed', 'conditional', 'conditional_release', 'withdrawn'));

-- outcome_date: when the border/customs decision was issued (supplied by the user;
-- distinct from recorded_at which is the system insertion timestamp)
ALTER TABLE shipment_outcomes ADD COLUMN IF NOT EXISTS outcome_date DATE;

-- recorded_by: profile id of the user who entered the record
ALTER TABLE shipment_outcomes ADD COLUMN IF NOT EXISTS recorded_by UUID REFERENCES auth.users(id);

-- Rejection detail fields
ALTER TABLE shipment_outcomes ADD COLUMN IF NOT EXISTS rejection_reason TEXT;
ALTER TABLE shipment_outcomes ADD COLUMN IF NOT EXISTS rejection_category TEXT
  CHECK (rejection_category IS NULL OR rejection_category IN
    ('documentation', 'contamination', 'traceability', 'regulatory', 'quality', 'other'));

-- Customs / border officer fields
ALTER TABLE shipment_outcomes ADD COLUMN IF NOT EXISTS port_of_entry TEXT;
ALTER TABLE shipment_outcomes ADD COLUMN IF NOT EXISTS customs_reference TEXT;
ALTER TABLE shipment_outcomes ADD COLUMN IF NOT EXISTS inspector_notes TEXT;

-- Financial impact tracking
ALTER TABLE shipment_outcomes ADD COLUMN IF NOT EXISTS financial_impact_usd NUMERIC(14, 2);

-- Index for the common ORDER BY pattern in the GET handler
CREATE INDEX IF NOT EXISTS idx_shipment_outcomes_outcome_date
  ON shipment_outcomes(shipment_id, outcome_date DESC NULLS LAST);
