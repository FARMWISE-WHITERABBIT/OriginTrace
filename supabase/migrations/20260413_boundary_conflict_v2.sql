-- ──────────────────────────────────────────────────────────────────────────────
-- Boundary conflict workflow v2
-- Adds severity classification, structured resolution_action, and escalation
-- status to farm_conflicts.
-- ──────────────────────────────────────────────────────────────────────────────

-- 1. Extend farm_conflicts with severity and resolution_action
ALTER TABLE farm_conflicts
  ADD COLUMN IF NOT EXISTS severity TEXT
    CHECK (severity IN ('critical', 'high', 'low')) DEFAULT 'low',
  ADD COLUMN IF NOT EXISTS resolution_action TEXT
    CHECK (resolution_action IN (
      'keep_a', 'keep_b', 'merged', 'dismissed',
      'deactivated', 'confirmed_correct', 'escalated_survey'
    ));

-- 2. Extend the status constraint to include 'escalated'
--    Drop and recreate the check constraint
ALTER TABLE farm_conflicts DROP CONSTRAINT IF EXISTS farm_conflicts_status_check;
ALTER TABLE farm_conflicts
  ADD CONSTRAINT farm_conflicts_status_check
    CHECK (status IN ('pending', 'resolved', 'dismissed', 'escalated'));

-- 3. Backfill severity for any existing records that still have the DEFAULT
UPDATE farm_conflicts
SET severity = CASE
  WHEN overlap_ratio > 0.50 THEN 'critical'
  WHEN overlap_ratio > 0.25 THEN 'high'
  ELSE 'low'
END
WHERE severity IS NULL OR severity = 'low';

-- 4. Add an index for fast pending+severity queries (admin dashboard card)
CREATE INDEX IF NOT EXISTS idx_farm_conflicts_status_severity
  ON farm_conflicts (status, severity);
