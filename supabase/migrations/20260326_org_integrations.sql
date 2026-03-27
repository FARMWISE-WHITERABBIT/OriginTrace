-- Generic Integration Hub
-- Stores third-party ERP/CRM/API connector configurations per organisation

CREATE TABLE IF NOT EXISTS org_integrations (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id        UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,                          -- display name, e.g. "Rising CRM"
  type          TEXT NOT NULL DEFAULT 'generic_webhook', -- reserved for future typed adapters
  endpoint_url  TEXT NOT NULL,
  api_key_enc   TEXT,                                   -- AES-256-GCM encrypted API key (app-layer)
  http_method   TEXT NOT NULL DEFAULT 'POST',
  headers       JSONB DEFAULT '{}',                     -- extra HTTP headers
  event_subscriptions TEXT[] DEFAULT '{}',              -- e.g. ARRAY['farm.approved','batch.created']
  field_mapping JSONB DEFAULT '{}',                     -- OriginTrace field → external field name
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  last_synced_at TIMESTAMPTZ,
  last_error    TEXT,
  created_by    UUID REFERENCES profiles(user_id),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE org_integrations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage integrations in their org" ON org_integrations
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
        AND profiles.org_id = org_integrations.org_id
        AND profiles.role IN ('admin')
    )
  );

CREATE INDEX IF NOT EXISTS idx_org_integrations_org ON org_integrations(org_id);
CREATE INDEX IF NOT EXISTS idx_org_integrations_active ON org_integrations(org_id, is_active);

-- auto-update updated_at
CREATE OR REPLACE FUNCTION update_org_integrations_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$;

DROP TRIGGER IF EXISTS trg_org_integrations_updated_at ON org_integrations;
CREATE TRIGGER trg_org_integrations_updated_at
  BEFORE UPDATE ON org_integrations
  FOR EACH ROW EXECUTE FUNCTION update_org_integrations_updated_at();
