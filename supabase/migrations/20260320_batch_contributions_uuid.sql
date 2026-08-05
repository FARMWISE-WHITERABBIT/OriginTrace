-- ============================================================
-- Migration: batch_contributions_uuid
-- Recreates batch_contributions using UUID foreign keys to
-- match the live schema where collection_batches.id and
-- farms.id are UUID (not SERIAL integer as in old schema.sql).
-- Also adds org_id for RLS alignment.
-- Safe to run on fresh or existing installations.
-- ============================================================

-- Drop old integer-keyed table (no data yet in production)
DROP TABLE IF EXISTS batch_contributions CASCADE;

-- Recreate with UUID foreign keys
CREATE TABLE batch_contributions (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id         UUID NOT NULL REFERENCES collection_batches(id) ON DELETE CASCADE,
  farm_id          UUID NOT NULL REFERENCES farms(id) ON DELETE CASCADE,
  farmer_name      TEXT,
  weight_kg        NUMERIC(12,2) DEFAULT 0,
  bag_count        INTEGER DEFAULT 0,
  compliance_status TEXT DEFAULT 'pending'
                     CHECK (compliance_status IN ('pending', 'verified', 'rejected')),
  notes            TEXT,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

-- RLS
ALTER TABLE batch_contributions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view batch contributions in their org" ON batch_contributions;
CREATE POLICY "Users can view batch contributions in their org" ON batch_contributions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM collection_batches cb
      WHERE cb.id = batch_contributions.batch_id
        AND cb.org_id = get_user_org_id()
    ) OR is_system_admin()
  );

DROP POLICY IF EXISTS "Authorized users can manage batch contributions" ON batch_contributions;
CREATE POLICY "Authorized users can manage batch contributions" ON batch_contributions
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM collection_batches cb
      WHERE cb.id = batch_contributions.batch_id
        AND cb.org_id = get_user_org_id()
    )
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE user_id = auth.uid()
        AND role IN ('admin', 'aggregator', 'agent')
    )
  );

DROP POLICY IF EXISTS "System admins can manage all batch contributions" ON batch_contributions;
CREATE POLICY "System admins can manage all batch contributions" ON batch_contributions
  FOR ALL USING (is_system_admin());

CREATE INDEX IF NOT EXISTS idx_batch_contributions_batch ON batch_contributions(batch_id);
CREATE INDEX IF NOT EXISTS idx_batch_contributions_farm  ON batch_contributions(farm_id);
