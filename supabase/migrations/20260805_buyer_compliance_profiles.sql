-- Let a buyer set up (and later edit an overlay on) a compliance profile for one
-- of their linked exporters. buyer_org_id stays null for exporter-authored
-- profiles; when set, it records which buyer created the profile and is used
-- to scope edit permissions (buyer may only edit the custom_rules.buyer_profile
-- overlay, never the regulatory baseline fields).

ALTER TABLE compliance_profiles
  ADD COLUMN IF NOT EXISTS buyer_org_id UUID REFERENCES buyer_organizations(id);

CREATE INDEX IF NOT EXISTS idx_compliance_profiles_buyer_org_id
  ON compliance_profiles (buyer_org_id)
  WHERE buyer_org_id IS NOT NULL;
