-- ============================================================
-- Service Provider Directory
-- Registered freight forwarders, clearing agents, inspection
-- bodies, and labs per exporter organisation.
-- Used to auto-fill shipment logistics fields.
-- ============================================================

CREATE TABLE IF NOT EXISTS service_providers (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id        UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  -- Classification
  provider_type TEXT NOT NULL
    CHECK (provider_type IN ('freight_forwarder', 'clearing_agent', 'inspection_body', 'lab', 'shipping_line')),

  name          TEXT NOT NULL,
  contact_name  TEXT,
  contact_email TEXT,
  contact_phone TEXT,
  address       TEXT,
  country       TEXT,
  registration_number TEXT,   -- NCS clearing agent code, NAFDAC lab code, etc.
  notes         TEXT,

  is_preferred  BOOLEAN NOT NULL DEFAULT FALSE,  -- show at top of autocomplete
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,

  created_by    UUID REFERENCES auth.users(id),
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- RLS
ALTER TABLE service_providers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_providers_org_access"
  ON service_providers
  FOR ALL
  USING (org_id = (
    SELECT org_id FROM profiles WHERE id = auth.uid()
  ));

-- Indexes
CREATE INDEX IF NOT EXISTS idx_service_providers_org_type
  ON service_providers(org_id, provider_type, is_active);

CREATE INDEX IF NOT EXISTS idx_service_providers_preferred
  ON service_providers(org_id, is_preferred)
  WHERE is_active = TRUE;
