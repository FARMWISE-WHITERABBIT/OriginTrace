-- Reconstructed from the live schema — this table exists in production
-- (applied 2026-08-05, migration name "buyer_compliance_profile_templates")
-- but no corresponding file was ever committed to this directory, leaving a
-- gap in the migration trail. This file matches the live table exactly, so
-- it is a documentation/reconciliation commit, not a change to apply.
--
-- Lets a buyer save a reusable compliance-profile template (required docs,
-- certifications, geo-verification level, traceability depth) scoped to
-- their own buyer org, to spin up new supplier compliance profiles from
-- instead of authoring one from scratch each time.

CREATE TABLE IF NOT EXISTS buyer_compliance_profile_templates (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  buyer_org_id            UUID NOT NULL REFERENCES buyer_organizations(id) ON DELETE CASCADE,
  name                    TEXT NOT NULL,
  destination_market      TEXT NOT NULL,
  regulation_framework    TEXT NOT NULL,
  required_documents      JSONB DEFAULT '[]'::jsonb,
  required_certifications JSONB DEFAULT '[]'::jsonb,
  geo_verification_level  TEXT DEFAULT 'polygon',
  min_traceability_depth  INTEGER DEFAULT 1,
  template                TEXT,
  custom_rules            JSONB DEFAULT '{}'::jsonb,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_buyer_compliance_profile_templates_buyer_org
  ON buyer_compliance_profile_templates (buyer_org_id);

ALTER TABLE buyer_compliance_profile_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY buyer_compliance_profile_templates_isolation
  ON buyer_compliance_profile_templates
  FOR ALL
  USING (
    buyer_org_id IN (
      SELECT buyer_profiles.buyer_org_id FROM buyer_profiles
      WHERE buyer_profiles.user_id = auth.uid()
    )
  )
  WITH CHECK (
    buyer_org_id IN (
      SELECT buyer_profiles.buyer_org_id FROM buyer_profiles
      WHERE buyer_profiles.user_id = auth.uid()
    )
  );
