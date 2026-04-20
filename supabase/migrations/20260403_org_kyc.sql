-- Migration: Exporter KYC & Farmer Bank Accounts
-- Adds KYC verification records for exporter organisations and bank account
-- storage for farmer bank transfer disbursements.
-- Date: 2026-04-03

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. ORG KYC RECORDS — exporter business verification
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS org_kyc_records (
  id                          UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id                      UUID        NOT NULL UNIQUE REFERENCES organizations(id) ON DELETE CASCADE,

  -- Business registration
  cac_registration_number     TEXT,       -- Corporate Affairs Commission (Nigeria)
  tin                         TEXT,       -- Tax Identification Number
  rc_number                   TEXT,       -- Registration Certificate number

  -- Director/owner identity
  director_name               TEXT,
  director_id_type            TEXT
                              CHECK (director_id_type IN ('nin', 'passport', 'drivers_license')),
  director_id_number          TEXT,
  director_id_url             TEXT,       -- uploaded document

  -- KYC status
  kyc_status                  TEXT        NOT NULL DEFAULT 'pending'
                              CHECK (kyc_status IN ('pending', 'under_review', 'approved', 'rejected')),
  kyc_notes                   TEXT,       -- reviewer notes on rejection reason
  submitted_at                TIMESTAMPTZ,
  reviewed_by                 UUID        REFERENCES auth.users(id),
  reviewed_at                 TIMESTAMPTZ,

  -- Nigerian bank account (for NGN payouts)
  bank_account_number         TEXT,
  bank_account_name           TEXT,       -- as returned by Paystack account resolution
  bank_code                   TEXT,       -- Paystack bank code (e.g. '058' for GTBank)
  bank_name                   TEXT,       -- human-readable (e.g. 'Guaranty Trust Bank')
  paystack_recipient_code     TEXT,       -- created via Paystack Transfer Recipients API
  account_verified_at         TIMESTAMPTZ,

  created_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_org_kyc_status
  ON org_kyc_records(kyc_status);

ALTER TABLE org_kyc_records ENABLE ROW LEVEL SECURITY;

-- Org admins can manage their own KYC record
CREATE POLICY "org_admin_manage_kyc"
  ON org_kyc_records
  FOR ALL
  TO authenticated
  USING (
    org_id IN (
      SELECT org_id FROM profiles WHERE user_id = auth.uid() AND role = 'admin'
    )
  )
  WITH CHECK (
    org_id IN (
      SELECT org_id FROM profiles WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- All org members can read their own KYC status
CREATE POLICY "org_members_read_kyc"
  ON org_kyc_records
  FOR SELECT
  TO authenticated
  USING (
    org_id IN (SELECT org_id FROM profiles WHERE user_id = auth.uid())
  );

-- updated_at trigger
CREATE OR REPLACE FUNCTION update_org_kyc_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER org_kyc_updated_at
  BEFORE UPDATE ON org_kyc_records
  FOR EACH ROW EXECUTE FUNCTION update_org_kyc_timestamp();

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. FARMER BANK ACCOUNTS — for Paystack bank transfer disbursements
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS farmer_bank_accounts (
  id                      UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id                  UUID        NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  -- Link to the farm (farmer) record
  farm_id                 UUID        REFERENCES farms(id) ON DELETE CASCADE,
  farmer_name             TEXT        NOT NULL,
  account_number          TEXT        NOT NULL,
  account_name            TEXT        NOT NULL,  -- as verified by Paystack resolution
  bank_code               TEXT        NOT NULL,  -- Paystack bank code
  bank_name               TEXT        NOT NULL,
  -- Paystack Transfer Recipients API — created on first transfer
  paystack_recipient_code TEXT,
  is_verified             BOOLEAN     NOT NULL DEFAULT false,
  verified_at             TIMESTAMPTZ,
  created_by              UUID        REFERENCES auth.users(id),
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(org_id, farm_id, account_number)
);

CREATE INDEX IF NOT EXISTS idx_farmer_bank_accounts_org
  ON farmer_bank_accounts(org_id);

CREATE INDEX IF NOT EXISTS idx_farmer_bank_accounts_farm
  ON farmer_bank_accounts(farm_id)
  WHERE farm_id IS NOT NULL;

ALTER TABLE farmer_bank_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org_members_manage_farmer_bank_accounts"
  ON farmer_bank_accounts
  FOR ALL
  TO authenticated
  USING (
    org_id IN (SELECT org_id FROM profiles WHERE user_id = auth.uid())
  )
  WITH CHECK (
    org_id IN (SELECT org_id FROM profiles WHERE user_id = auth.uid())
  );
