-- ============================================================
-- Ship-ready migration — apply to live Supabase DB
-- Generated: 2026-03-09
-- Safe to run multiple times (IF NOT EXISTS / ON CONFLICT DO NOTHING)
-- Paste full contents into Supabase SQL Editor → Run
-- ============================================================

-- 1. Superadmin audit log
CREATE TABLE IF NOT EXISTS superadmin_audit_logs (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  superadmin_id    UUID NOT NULL,
  action           TEXT NOT NULL,
  target_type      TEXT NOT NULL CHECK (target_type IN (
                     'organization','user','subscription','feature_toggle',
                     'impersonation','payment_link','system'
                   )),
  target_id        TEXT,
  target_label     TEXT,
  before_state     JSONB,
  after_state      JSONB,
  metadata         JSONB DEFAULT '{}',
  ip_address       TEXT,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_superadmin_audit_admin   ON superadmin_audit_logs(superadmin_id);
CREATE INDEX IF NOT EXISTS idx_superadmin_audit_target  ON superadmin_audit_logs(target_type, target_id);
CREATE INDEX IF NOT EXISTS idx_superadmin_audit_created ON superadmin_audit_logs(created_at DESC);
ALTER TABLE superadmin_audit_logs ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename='superadmin_audit_logs' AND policyname='superadmin_audit_service_only'
  ) THEN
    CREATE POLICY "superadmin_audit_service_only" ON superadmin_audit_logs USING (false);
  END IF;
END $$;

-- 2. Subscription plans (reference table)
CREATE TABLE IF NOT EXISTS subscription_plans (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tier           TEXT NOT NULL CHECK (tier IN ('starter','basic','pro','enterprise')),
  label          TEXT NOT NULL,
  description    TEXT,
  price_ngn      DECIMAL(12,2),
  price_usd      DECIMAL(10,2),
  billing_period TEXT DEFAULT 'monthly' CHECK (billing_period IN ('monthly','annual','custom')),
  features       JSONB DEFAULT '[]',
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (tier, billing_period)
);
ALTER TABLE subscription_plans ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename='subscription_plans' AND policyname='plans_public_read'
  ) THEN
    CREATE POLICY "plans_public_read" ON subscription_plans FOR SELECT USING (true);
  END IF;
END $$;
INSERT INTO subscription_plans (tier, label, description, billing_period) VALUES
  ('starter',    'Starter',    'Proof of Value — for pilots and early aggregators', 'monthly'),
  ('basic',      'Basic',      'Operational Traceability — for active supply chains', 'monthly'),
  ('pro',        'Pro',        'Export & Compliance Ready — for EU/US market exporters', 'monthly'),
  ('enterprise', 'Enterprise', 'Infrastructure Partner — for multinationals', 'monthly')
ON CONFLICT (tier, billing_period) DO NOTHING;

-- 3. Payment links
CREATE TABLE IF NOT EXISTS payment_links (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id              UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  created_by          UUID NOT NULL,
  tier                TEXT NOT NULL CHECK (tier IN ('starter','basic','pro','enterprise')),
  billing_period      TEXT NOT NULL DEFAULT 'monthly' CHECK (billing_period IN ('monthly','annual','custom')),
  amount_ngn          DECIMAL(12,2) NOT NULL,
  paystack_reference  TEXT UNIQUE,
  paystack_link       TEXT,
  status              TEXT DEFAULT 'pending' CHECK (status IN ('pending','paid','expired','cancelled')),
  expires_at          TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '7 days'),
  paid_at             TIMESTAMPTZ,
  metadata            JSONB DEFAULT '{}',
  created_at          TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_payment_links_org    ON payment_links(org_id);
CREATE INDEX IF NOT EXISTS idx_payment_links_ref    ON payment_links(paystack_reference);
CREATE INDEX IF NOT EXISTS idx_payment_links_status ON payment_links(status);
ALTER TABLE payment_links ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename='payment_links' AND policyname='payment_links_service_only'
  ) THEN
    CREATE POLICY "payment_links_service_only" ON payment_links USING (false);
  END IF;
END $$;

-- 4. Add subscription_tier column first (required before constraint below)
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS subscription_tier TEXT DEFAULT 'starter';

-- 5. Org subscription tracking columns
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS subscription_expires_at TIMESTAMPTZ;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS grace_period_ends_at    TIMESTAMPTZ;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS subscription_status TEXT DEFAULT 'active';

-- Add subscription_status constraint safely
ALTER TABLE organizations DROP CONSTRAINT IF EXISTS organizations_subscription_status_check;
ALTER TABLE organizations ADD CONSTRAINT organizations_subscription_status_check
  CHECK (subscription_status IN ('active','grace_period','expired','cancelled'));

CREATE INDEX IF NOT EXISTS idx_org_sub_expires ON organizations(subscription_expires_at)
  WHERE subscription_expires_at IS NOT NULL;

-- 6. Fix tier constraint
ALTER TABLE organizations DROP CONSTRAINT IF EXISTS organizations_subscription_tier_check;
ALTER TABLE organizations ADD CONSTRAINT organizations_subscription_tier_check
  CHECK (subscription_tier IN ('starter','basic','pro','enterprise'));

-- 7. QR code columns on digital_product_passports
ALTER TABLE digital_product_passports ADD COLUMN IF NOT EXISTS qr_code_url TEXT;
ALTER TABLE digital_product_passports ADD COLUMN IF NOT EXISTS verify_url  TEXT;
