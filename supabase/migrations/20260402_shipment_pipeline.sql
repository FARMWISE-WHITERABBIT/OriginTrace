-- Migration: 9-Stage Shipment Pipeline
-- Adds structured stage tracking to the shipments table.
-- The existing `status` field is preserved for backward compatibility;
-- the stage-to-status mapping is maintained by the advance-stage API handler.
-- Date: 2026-04-02

-- current_stage: which of the 9 defined stages the shipment is in (1–9)
ALTER TABLE shipments ADD COLUMN IF NOT EXISTS current_stage    INTEGER DEFAULT 1
  CHECK (current_stage BETWEEN 1 AND 9);

-- stage_data: per-stage metadata (completion timestamps, gate validation results)
-- Shape: { "1": { "completed_at": "ISO", "gatesPassed": [...] }, "2": { ... }, ... }
ALTER TABLE shipments ADD COLUMN IF NOT EXISTS stage_data       JSONB DEFAULT '{}';

-- stage_history: immutable append-only log of stage transitions
-- Shape: [{ "from": 1, "to": 2, "actor_id": "uuid", "timestamp": "ISO", "note": "..." }]
ALTER TABLE shipments ADD COLUMN IF NOT EXISTS stage_history    JSONB DEFAULT '[]';

-- Index for dashboard queries filtered by stage
CREATE INDEX IF NOT EXISTS idx_shipments_current_stage
  ON shipments(org_id, current_stage);
