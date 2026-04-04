-- ============================================================
-- Farmer Pricing: price agreements + disbursement calculations
-- ============================================================

-- Price agreements: price_per_kg for a given commodity per org,
-- optionally scoped to a specific farm (NULL = org-wide default).
CREATE TABLE IF NOT EXISTS farmer_price_agreements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  farm_id INTEGER REFERENCES farms(id) ON DELETE CASCADE,  -- NULL = org-wide default
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

CREATE POLICY "org_member_read_price_agreements" ON farmer_price_agreements
  FOR SELECT USING (
    org_id IN (SELECT org_id FROM profiles WHERE user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role = 'superadmin')
  );

CREATE POLICY "admin_manage_price_agreements" ON farmer_price_agreements
  FOR ALL USING (
    org_id IN (SELECT org_id FROM profiles WHERE user_id = auth.uid() AND role IN ('admin', 'aggregator'))
  );


-- Disbursement calculations: pre-computed payout per farm per batch.
-- Created automatically when a batch is dispatched (or on demand via API).
CREATE TABLE IF NOT EXISTS disbursement_calculations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  batch_id INTEGER NOT NULL REFERENCES collection_batches(id) ON DELETE CASCADE,
  farm_id INTEGER NOT NULL REFERENCES farms(id) ON DELETE CASCADE,
  farmer_name TEXT NOT NULL,
  community TEXT,
  weight_kg DECIMAL(10,3) NOT NULL,
  price_per_kg DECIMAL(10,4) NOT NULL DEFAULT 0,
  gross_amount DECIMAL(14,2) NOT NULL DEFAULT 0,  -- weight_kg * price_per_kg
  deductions DECIMAL(14,2) NOT NULL DEFAULT 0,    -- advances, levies, etc.
  net_amount DECIMAL(14,2) NOT NULL DEFAULT 0,    -- gross - deductions
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

CREATE POLICY "org_member_read_disbursements" ON disbursement_calculations
  FOR SELECT USING (
    org_id IN (SELECT org_id FROM profiles WHERE user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role = 'superadmin')
  );

CREATE POLICY "admin_manage_disbursements" ON disbursement_calculations
  FOR ALL USING (
    org_id IN (SELECT org_id FROM profiles WHERE user_id = auth.uid() AND role IN ('admin', 'aggregator'))
  );


-- ============================================================
-- Organization wallet columns (USDC + virtual bank accounts)
-- ============================================================

ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS blockradar_wallet_id TEXT,
  ADD COLUMN IF NOT EXISTS usdc_deposit_address TEXT,
  ADD COLUMN IF NOT EXISTS usdc_balance DECIMAL(18,6) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS grey_virtual_accounts JSONB DEFAULT '[]'::jsonb;
