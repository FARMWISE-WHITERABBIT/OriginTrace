-- Migration: Compliance Rulesets table
-- Stores per-market document requirement overrides set by superadmins.

CREATE TABLE IF NOT EXISTS compliance_rulesets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  market_id TEXT NOT NULL UNIQUE,          -- e.g. 'eudr', 'gacc', 'uk_tr'
  market_name TEXT NOT NULL,
  short_code TEXT NOT NULL,
  description TEXT,
  docs JSONB NOT NULL DEFAULT '[]',        -- Array of { id, label, required, notes }
  updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE compliance_rulesets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role full access to compliance_rulesets" ON compliance_rulesets;
CREATE POLICY "Service role full access to compliance_rulesets"
  ON compliance_rulesets FOR ALL
  TO service_role USING (true) WITH CHECK (true);

-- Authenticated users can read rulesets (needed by farm eligibility checks)
DROP POLICY IF EXISTS "Authenticated read compliance_rulesets" ON compliance_rulesets;
CREATE POLICY "Authenticated read compliance_rulesets"
  ON compliance_rulesets FOR SELECT
  TO authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_compliance_rulesets_market ON compliance_rulesets (market_id);
