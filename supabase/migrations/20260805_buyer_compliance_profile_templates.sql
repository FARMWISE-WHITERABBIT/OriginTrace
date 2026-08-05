BEGIN;

-- A buyer's own compliance profile template, independent of any exporter
-- link. Buyers set this up ahead of time (pick a market regulation, add
-- their commodity/destination/extra requirements); it's later "assigned" to
-- one or more linked exporters, which materializes a row in
-- compliance_profiles for that exporter (see source_buyer_template_id
-- below). Mirrors the shape of compliance_profiles so materialization is a
-- straight copy.
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

-- Tenant isolation follows the same buyer_profiles.user_id = auth.uid()
-- pattern used elsewhere for buyer-owned data (not profiles.id).
CREATE POLICY buyer_compliance_profile_templates_isolation
  ON buyer_compliance_profile_templates
  FOR ALL
  USING (
    buyer_org_id IN (
      SELECT buyer_org_id FROM buyer_profiles WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    buyer_org_id IN (
      SELECT buyer_org_id FROM buyer_profiles WHERE user_id = auth.uid()
    )
  );

-- Marks a materialized exporter-side compliance_profiles row as having been
-- assigned from a specific buyer template, so editing the template can
-- propagate to every exporter it's been assigned to. NULL for
-- exporter-authored profiles and for the pre-existing direct-create buyer
-- flow this replaces.
ALTER TABLE compliance_profiles
  ADD COLUMN IF NOT EXISTS source_buyer_template_id UUID
    REFERENCES buyer_compliance_profile_templates(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_compliance_profiles_source_buyer_template
  ON compliance_profiles (source_buyer_template_id)
  WHERE source_buyer_template_id IS NOT NULL;

COMMIT;
