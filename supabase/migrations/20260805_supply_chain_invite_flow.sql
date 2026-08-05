-- Allow buyers to invite an exporter who does not yet have an OriginTrace account.
-- Previously exporter_org_id was NOT NULL, which forced every "invitation" to
-- actually be a link to an already-registered tenant. This adds a token-based
-- pending-invite path: exporter_org_id stays null until the invited exporter
-- accepts (via app/api/auth/exporter-activate) and provisions their own org.

ALTER TABLE supply_chain_links
  ALTER COLUMN exporter_org_id DROP NOT NULL;

ALTER TABLE supply_chain_links
  ADD COLUMN IF NOT EXISTS invited_email TEXT,
  ADD COLUMN IF NOT EXISTS invited_org_name TEXT,
  ADD COLUMN IF NOT EXISTS invite_token TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS invite_expires_at TIMESTAMPTZ;

ALTER TABLE supply_chain_links
  ADD CONSTRAINT supply_chain_links_exporter_or_invite_chk
  CHECK (exporter_org_id IS NOT NULL OR invite_token IS NOT NULL);

CREATE INDEX IF NOT EXISTS idx_supply_chain_links_invite_token
  ON supply_chain_links (invite_token)
  WHERE invite_token IS NOT NULL;
