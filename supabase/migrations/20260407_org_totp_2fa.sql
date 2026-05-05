-- Add TOTP / 2FA columns to organizations table
-- Used by the wallet withdrawal 2FA flow

ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS totp_secret TEXT,
  ADD COLUMN IF NOT EXISTS totp_enabled BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS totp_pending_secret TEXT;

-- Index for quick lookup of 2FA status
CREATE INDEX IF NOT EXISTS idx_organizations_totp_enabled
  ON organizations (totp_enabled)
  WHERE totp_enabled = true;
