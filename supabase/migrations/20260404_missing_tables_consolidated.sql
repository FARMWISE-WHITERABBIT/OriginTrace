-- ============================================================
-- Consolidated: apply all tables that may not yet be in DB
-- Safe to run even if some tables already exist (IF NOT EXISTS).
-- Run this in Supabase SQL editor to fix all 500/404 errors.
-- ============================================================

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. FARMER BANK ACCOUNTS (from 20260403_org_kyc.sql)
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS farmer_bank_accounts (
  id                      UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id                  UUID        NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  farm_id                 UUID        REFERENCES farms(id) ON DELETE CASCADE,
  farmer_name             TEXT        NOT NULL,
  account_number          TEXT        NOT NULL,
  account_name            TEXT        NOT NULL,
  bank_code               TEXT        NOT NULL,
  bank_name               TEXT        NOT NULL,
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

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'farmer_bank_accounts'
      AND policyname = 'org_members_manage_farmer_bank_accounts'
  ) THEN
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
  END IF;
END $$;


-- ─────────────────────────────────────────────────────────────────────────────
-- 2. SERVICE PROVIDERS (from 20260403_service_providers.sql)
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS service_providers (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id        UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  provider_type TEXT NOT NULL
    CHECK (provider_type IN ('freight_forwarder', 'clearing_agent', 'inspection_body', 'lab', 'shipping_line')),
  name          TEXT NOT NULL,
  contact_name  TEXT,
  contact_email TEXT,
  contact_phone TEXT,
  address       TEXT,
  country       TEXT,
  registration_number TEXT,
  notes         TEXT,
  is_preferred  BOOLEAN NOT NULL DEFAULT FALSE,
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  created_by    UUID REFERENCES auth.users(id),
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE service_providers ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'service_providers'
      AND policyname = 'service_providers_org_access'
  ) THEN
    CREATE POLICY "service_providers_org_access"
      ON service_providers
      FOR ALL
      USING (org_id IN (SELECT org_id FROM profiles WHERE user_id = auth.uid()));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_service_providers_org_type
  ON service_providers(org_id, provider_type, is_active);

CREATE INDEX IF NOT EXISTS idx_service_providers_preferred
  ON service_providers(org_id, is_preferred)
  WHERE is_active = TRUE;


-- ─────────────────────────────────────────────────────────────────────────────
-- 3. LAB RESULTS (from 20260403_lab_results.sql)
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS lab_results (
  id                        UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id                    UUID        NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  batch_id                  UUID        REFERENCES collection_batches(id) ON DELETE SET NULL,
  finished_good_id          UUID        REFERENCES finished_goods(id)     ON DELETE SET NULL,
  shipment_id               UUID        REFERENCES shipments(id)           ON DELETE SET NULL,
  lab_provider              TEXT        NOT NULL,
  test_method               TEXT,
  test_date                 DATE        NOT NULL,
  test_type                 TEXT        NOT NULL
                            CHECK (test_type IN (
                              'aflatoxin', 'pesticide_residue', 'heavy_metal',
                              'microbiological', 'moisture', 'other'
                            )),
  commodity                 TEXT,
  result                    TEXT        NOT NULL
                            CHECK (result IN ('pass', 'fail', 'conditional')),
  result_value              DECIMAL(10,4),
  result_unit               TEXT,
  result_notes              TEXT,
  certificate_number        TEXT,
  certificate_validity_days INTEGER     DEFAULT 90,
  certificate_expiry_date   DATE,
  mrl_flags                 JSONB       DEFAULT '[]',
  target_markets            TEXT[]      DEFAULT ARRAY[]::TEXT[],
  file_url                  TEXT,
  file_name                 TEXT,
  document_id               UUID        REFERENCES documents(id) ON DELETE SET NULL,
  uploaded_by               UUID        REFERENCES auth.users(id),
  created_at                TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'lab_results_requires_link' AND conrelid = 'lab_results'::regclass
  ) THEN
    ALTER TABLE lab_results
      ADD CONSTRAINT lab_results_requires_link
      CHECK (
        batch_id IS NOT NULL OR
        finished_good_id IS NOT NULL OR
        shipment_id IS NOT NULL
      );
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_lab_results_org
  ON lab_results(org_id, test_date DESC);

CREATE INDEX IF NOT EXISTS idx_lab_results_batch
  ON lab_results(batch_id)
  WHERE batch_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_lab_results_shipment
  ON lab_results(shipment_id)
  WHERE shipment_id IS NOT NULL;

ALTER TABLE lab_results ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'lab_results'
      AND policyname = 'org_members_manage_lab_results'
  ) THEN
    CREATE POLICY "org_members_manage_lab_results"
      ON lab_results
      FOR ALL
      TO authenticated
      USING (
        org_id IN (SELECT org_id FROM profiles WHERE user_id = auth.uid())
      )
      WITH CHECK (
        org_id IN (SELECT org_id FROM profiles WHERE user_id = auth.uid())
      );
  END IF;
END $$;


-- ─────────────────────────────────────────────────────────────────────────────
-- 4. FARMER PRICE AGREEMENTS + DISBURSEMENT CALCULATIONS (20260404_farmer_pricing.sql)
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS farmer_price_agreements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  farm_id UUID REFERENCES farms(id) ON DELETE CASCADE,
  commodity TEXT NOT NULL,
  price_per_kg DECIMAL(10,4) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'NGN',
  effective_from DATE NOT NULL DEFAULT CURRENT_DATE,
  effective_to DATE,
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_farmer_price_agreements_org_commodity
  ON farmer_price_agreements(org_id, commodity, effective_from);

CREATE INDEX IF NOT EXISTS idx_farmer_price_agreements_farm
  ON farmer_price_agreements(farm_id);

ALTER TABLE farmer_price_agreements ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'farmer_price_agreements'
      AND policyname = 'org_member_read_price_agreements'
  ) THEN
    CREATE POLICY "org_member_read_price_agreements" ON farmer_price_agreements
      FOR SELECT USING (
        org_id IN (SELECT org_id FROM profiles WHERE user_id = auth.uid())
        OR EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role = 'superadmin')
      );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'farmer_price_agreements'
      AND policyname = 'admin_manage_price_agreements'
  ) THEN
    CREATE POLICY "admin_manage_price_agreements" ON farmer_price_agreements
      FOR ALL USING (
        org_id IN (SELECT org_id FROM profiles WHERE user_id = auth.uid() AND role IN ('admin', 'aggregator'))
      );
  END IF;
END $$;


CREATE TABLE IF NOT EXISTS disbursement_calculations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  batch_id UUID NOT NULL REFERENCES collection_batches(id) ON DELETE CASCADE,
  farm_id UUID NOT NULL REFERENCES farms(id) ON DELETE CASCADE,
  farmer_name TEXT NOT NULL,
  community TEXT,
  weight_kg DECIMAL(10,3) NOT NULL,
  price_per_kg DECIMAL(10,4) NOT NULL DEFAULT 0,
  gross_amount DECIMAL(14,2) NOT NULL DEFAULT 0,
  deductions DECIMAL(14,2) NOT NULL DEFAULT 0,
  net_amount DECIMAL(14,2) NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'NGN',
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'disbursed', 'failed')),
  payment_id UUID REFERENCES payments(id),
  approved_by UUID REFERENCES auth.users(id),
  approved_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_disbursement_calculations_org_batch
  ON disbursement_calculations(org_id, batch_id);

CREATE INDEX IF NOT EXISTS idx_disbursement_calculations_status
  ON disbursement_calculations(status);

CREATE INDEX IF NOT EXISTS idx_disbursement_calculations_farm
  ON disbursement_calculations(farm_id);

ALTER TABLE disbursement_calculations ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'disbursement_calculations'
      AND policyname = 'org_member_read_disbursements'
  ) THEN
    CREATE POLICY "org_member_read_disbursements" ON disbursement_calculations
      FOR SELECT USING (
        org_id IN (SELECT org_id FROM profiles WHERE user_id = auth.uid())
        OR EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role = 'superadmin')
      );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'disbursement_calculations'
      AND policyname = 'admin_manage_disbursements'
  ) THEN
    CREATE POLICY "admin_manage_disbursements" ON disbursement_calculations
      FOR ALL USING (
        org_id IN (SELECT org_id FROM profiles WHERE user_id = auth.uid() AND role IN ('admin', 'aggregator'))
      );
  END IF;
END $$;


-- ─────────────────────────────────────────────────────────────────────────────
-- 5. ORGANIZATION WALLET COLUMNS (from 20260404_farmer_pricing.sql)
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS blockradar_wallet_id TEXT,
  ADD COLUMN IF NOT EXISTS usdc_deposit_address TEXT,
  ADD COLUMN IF NOT EXISTS usdc_balance DECIMAL(18,6) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS grey_virtual_accounts JSONB DEFAULT '[]'::jsonb;
