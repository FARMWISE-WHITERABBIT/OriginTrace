-- =============================================
-- MIGRATION: Create all missing tables
-- Run this in Supabase SQL Editor
-- Safe to re-run (uses IF NOT EXISTS)
-- =============================================

-- Ensure extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- DOCUMENT VAULT
-- ============================================

CREATE TABLE IF NOT EXISTS documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  document_type TEXT NOT NULL CHECK (document_type IN (
    'export_license', 'phytosanitary', 'fumigation', 'organic_cert', 'insurance',
    'lab_result', 'customs_declaration', 'bill_of_lading', 'certificate_of_origin',
    'quality_cert', 'other'
  )),
  file_url TEXT,
  file_name TEXT,
  file_size INTEGER,
  issued_date DATE,
  expiry_date DATE,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'expired', 'expiring_soon', 'archived')),
  linked_entity_type TEXT CHECK (linked_entity_type IN ('shipment', 'farm', 'farmer', 'organization', 'batch')),
  linked_entity_id UUID,
  notes TEXT,
  uploaded_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS document_alerts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  alert_type TEXT NOT NULL CHECK (alert_type IN ('expiry_30d', 'expiry_7d', 'expired')),
  triggered_at TIMESTAMPTZ DEFAULT NOW(),
  acknowledged_by UUID REFERENCES auth.users(id),
  acknowledged_at TIMESTAMPTZ
);

ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view documents in their org" ON documents
  FOR SELECT USING (org_id = get_user_org_id() OR is_system_admin());
CREATE POLICY "Users can create documents in their org" ON documents
  FOR INSERT WITH CHECK (org_id = get_user_org_id());
CREATE POLICY "Users can update documents in their org" ON documents
  FOR UPDATE USING (org_id = get_user_org_id());
CREATE POLICY "Admins can delete documents in their org" ON documents
  FOR DELETE USING (
    org_id = get_user_org_id()
    AND EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role IN ('admin', 'compliance_officer'))
  );
CREATE POLICY "System admins can manage all documents" ON documents
  FOR ALL USING (is_system_admin());

CREATE POLICY "Users can view document alerts in their org" ON document_alerts
  FOR SELECT USING (org_id = get_user_org_id() OR is_system_admin());
CREATE POLICY "Users can manage document alerts in their org" ON document_alerts
  FOR ALL USING (org_id = get_user_org_id());

CREATE INDEX IF NOT EXISTS idx_documents_org_id ON documents(org_id);
CREATE INDEX IF NOT EXISTS idx_documents_expiry ON documents(expiry_date);
CREATE INDEX IF NOT EXISTS idx_documents_status ON documents(status);
CREATE INDEX IF NOT EXISTS idx_document_alerts_org_id ON document_alerts(org_id);

-- ============================================
-- PAYMENTS
-- ============================================

CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  payee_type TEXT NOT NULL CHECK (payee_type IN ('farmer', 'aggregator', 'supplier')),
  payee_id UUID,
  payee_name TEXT NOT NULL,
  amount DECIMAL(12,2) NOT NULL,
  currency TEXT DEFAULT 'NGN' CHECK (currency IN ('NGN', 'USD', 'EUR', 'GBP', 'XOF')),
  payment_method TEXT NOT NULL CHECK (payment_method IN ('cash', 'bank_transfer', 'mobile_money', 'cheque')),
  reference_number TEXT,
  linked_entity_type TEXT CHECK (linked_entity_type IN ('collection_batch', 'contract')),
  linked_entity_id UUID,
  payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
  status TEXT DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'failed', 'reversed')),
  notes TEXT,
  recorded_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view payments in their org" ON payments
  FOR SELECT USING (org_id = get_user_org_id() OR is_system_admin());
CREATE POLICY "Users can create payments in their org" ON payments
  FOR INSERT WITH CHECK (org_id = get_user_org_id());
CREATE POLICY "Admins can manage payments in their org" ON payments
  FOR ALL USING (
    org_id = get_user_org_id()
    AND EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role IN ('admin', 'aggregator'))
  );
CREATE POLICY "System admins can manage all payments" ON payments
  FOR ALL USING (is_system_admin());

CREATE INDEX IF NOT EXISTS idx_payments_org_id ON payments(org_id);
CREATE INDEX IF NOT EXISTS idx_payments_payee ON payments(payee_id);
CREATE INDEX IF NOT EXISTS idx_payments_date ON payments(payment_date);

-- ============================================
-- BUYER PORTAL
-- ============================================

CREATE TABLE IF NOT EXISTS buyer_organizations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  country TEXT,
  industry TEXT,
  contact_email TEXT,
  logo_url TEXT,
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS buyer_profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  buyer_org_id UUID NOT NULL REFERENCES buyer_organizations(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  role TEXT DEFAULT 'buyer_admin' CHECK (role IN ('buyer_admin', 'buyer_viewer')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

CREATE TABLE IF NOT EXISTS supply_chain_links (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  buyer_org_id UUID NOT NULL REFERENCES buyer_organizations(id) ON DELETE CASCADE,
  exporter_org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'suspended', 'terminated')),
  invited_at TIMESTAMPTZ DEFAULT NOW(),
  accepted_at TIMESTAMPTZ,
  invited_by UUID REFERENCES auth.users(id),
  UNIQUE(buyer_org_id, exporter_org_id)
);

CREATE TABLE IF NOT EXISTS contracts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  buyer_org_id UUID NOT NULL REFERENCES buyer_organizations(id) ON DELETE CASCADE,
  exporter_org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  contract_reference TEXT NOT NULL,
  commodity TEXT NOT NULL,
  quantity_mt DECIMAL(12,2),
  quality_requirements JSONB DEFAULT '{}',
  required_certifications JSONB DEFAULT '[]',
  delivery_deadline DATE,
  destination_port TEXT,
  compliance_profile_id UUID,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'fulfilled', 'cancelled')),
  price_per_unit DECIMAL(12,2),
  currency TEXT DEFAULT 'USD',
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE buyer_organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE buyer_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE supply_chain_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE contracts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Buyer users can view their own org" ON buyer_organizations
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM buyer_profiles WHERE user_id = auth.uid() AND buyer_org_id = buyer_organizations.id)
    OR is_system_admin()
  );
CREATE POLICY "System admins can manage buyer orgs" ON buyer_organizations
  FOR ALL USING (is_system_admin());

CREATE POLICY "Buyer users can view their own profile" ON buyer_profiles
  FOR SELECT USING (user_id = auth.uid() OR is_system_admin());
CREATE POLICY "System admins can manage buyer profiles" ON buyer_profiles
  FOR ALL USING (is_system_admin());

CREATE POLICY "Linked parties can view supply chain links" ON supply_chain_links
  FOR SELECT USING (
    exporter_org_id = get_user_org_id()
    OR EXISTS (SELECT 1 FROM buyer_profiles WHERE user_id = auth.uid() AND buyer_org_id = supply_chain_links.buyer_org_id)
    OR is_system_admin()
  );
CREATE POLICY "Buyer admins can create supply chain links" ON supply_chain_links
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM buyer_profiles WHERE user_id = auth.uid() AND buyer_org_id = supply_chain_links.buyer_org_id AND role = 'buyer_admin')
  );

CREATE POLICY "Linked parties can view contracts" ON contracts
  FOR SELECT USING (
    exporter_org_id = get_user_org_id()
    OR EXISTS (SELECT 1 FROM buyer_profiles WHERE user_id = auth.uid() AND buyer_org_id = contracts.buyer_org_id)
    OR is_system_admin()
  );
CREATE POLICY "Buyer admins can manage contracts" ON contracts
  FOR ALL USING (
    EXISTS (SELECT 1 FROM buyer_profiles WHERE user_id = auth.uid() AND buyer_org_id = contracts.buyer_org_id AND role = 'buyer_admin')
  );
CREATE POLICY "System admins can manage all contracts" ON contracts
  FOR ALL USING (is_system_admin());

CREATE INDEX IF NOT EXISTS idx_supply_chain_links_buyer ON supply_chain_links(buyer_org_id);
CREATE INDEX IF NOT EXISTS idx_supply_chain_links_exporter ON supply_chain_links(exporter_org_id);
CREATE INDEX IF NOT EXISTS idx_contracts_buyer ON contracts(buyer_org_id);
CREATE INDEX IF NOT EXISTS idx_contracts_exporter ON contracts(exporter_org_id);

-- ============================================
-- SHIPMENTS
-- ============================================

CREATE TABLE IF NOT EXISTS shipments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  shipment_code TEXT,
  commodity TEXT,
  compliance_profile_id UUID,
  destination_country TEXT,
  destination_port TEXT,
  total_weight_kg DECIMAL(12,2),
  readiness_score DECIMAL(5,2),
  readiness_decision TEXT CHECK (readiness_decision IN ('go', 'conditional_go', 'no_go', 'pending')),
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'ready', 'shipped', 'cancelled')),
  risk_flags JSONB DEFAULT '[]',
  score_breakdown JSONB DEFAULT '{}',
  buyer_company TEXT,
  buyer_contact TEXT,
  target_regulations TEXT[],
  notes TEXT,
  estimated_ship_date DATE,
  total_items INTEGER DEFAULT 0,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS contract_shipments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  contract_id UUID NOT NULL REFERENCES contracts(id) ON DELETE CASCADE,
  shipment_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(contract_id, shipment_id)
);

ALTER TABLE shipments ENABLE ROW LEVEL SECURITY;
ALTER TABLE contract_shipments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view shipments in their org" ON shipments
  FOR SELECT USING (org_id = get_user_org_id());
CREATE POLICY "Admins can manage shipments" ON shipments
  FOR ALL USING (
    org_id = get_user_org_id()
    AND EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role IN ('admin', 'compliance_officer'))
  );

CREATE POLICY "Linked parties can view contract shipments" ON contract_shipments
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM contracts c WHERE c.id = contract_shipments.contract_id AND (
      c.exporter_org_id = get_user_org_id()
      OR EXISTS (SELECT 1 FROM buyer_profiles WHERE user_id = auth.uid() AND buyer_org_id = c.buyer_org_id)
    ))
    OR is_system_admin()
  );

CREATE INDEX IF NOT EXISTS idx_shipments_org ON shipments(org_id);
CREATE INDEX IF NOT EXISTS idx_shipments_status ON shipments(status);

-- ============================================
-- COMPLIANCE PROFILES
-- ============================================

CREATE TABLE IF NOT EXISTS compliance_profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  destination_market TEXT NOT NULL,
  regulation_framework TEXT NOT NULL CHECK (regulation_framework IN ('EUDR', 'FSMA_204', 'UK_Environment_Act', 'Lacey_Act_UFLPA', 'China_Green_Trade', 'UAE_Halal', 'custom')),
  required_documents JSONB DEFAULT '[]',
  required_certifications JSONB DEFAULT '[]',
  geo_verification_level TEXT DEFAULT 'polygon' CHECK (geo_verification_level IN ('basic', 'polygon', 'satellite')),
  min_traceability_depth INTEGER DEFAULT 1,
  custom_rules JSONB DEFAULT '{}',
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE compliance_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view compliance profiles in their org" ON compliance_profiles
  FOR SELECT USING (org_id = get_user_org_id() OR is_system_admin());
CREATE POLICY "Admins can manage compliance profiles" ON compliance_profiles
  FOR ALL USING (
    org_id = get_user_org_id()
    AND EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role IN ('admin', 'compliance_officer'))
  );
CREATE POLICY "System admins can manage all compliance profiles" ON compliance_profiles
  FOR ALL USING (is_system_admin());

CREATE INDEX IF NOT EXISTS idx_compliance_profiles_org ON compliance_profiles(org_id);

-- ============================================
-- PROCESSING & FINISHED GOODS (Pedigree System)
-- ============================================

CREATE TABLE IF NOT EXISTS processing_runs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  run_code TEXT NOT NULL,
  facility_name TEXT NOT NULL,
  facility_location TEXT,
  commodity TEXT NOT NULL,
  input_weight_kg DECIMAL(12,2) NOT NULL,
  output_weight_kg DECIMAL(12,2),
  recovery_rate DECIMAL(5,2),
  standard_recovery_rate DECIMAL(5,2) DEFAULT 41.6,
  mass_balance_valid BOOLEAN DEFAULT true,
  mass_balance_variance DECIMAL(5,2),
  processed_at TIMESTAMPTZ NOT NULL,
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(org_id, run_code)
);

CREATE TABLE IF NOT EXISTS processing_run_batches (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  processing_run_id UUID NOT NULL REFERENCES processing_runs(id) ON DELETE CASCADE,
  collection_batch_id UUID NOT NULL REFERENCES collection_batches(id) ON DELETE CASCADE,
  weight_contribution_kg DECIMAL(12,2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(processing_run_id, collection_batch_id)
);

CREATE TABLE IF NOT EXISTS finished_goods (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  pedigree_code TEXT NOT NULL,
  product_name TEXT NOT NULL,
  product_type TEXT NOT NULL,
  processing_run_id UUID NOT NULL REFERENCES processing_runs(id) ON DELETE CASCADE,
  weight_kg DECIMAL(12,2) NOT NULL,
  batch_number TEXT,
  lot_number TEXT,
  production_date DATE NOT NULL,
  expiry_date DATE,
  destination_country TEXT DEFAULT 'EU',
  buyer_name TEXT,
  buyer_company TEXT,
  dds_submitted BOOLEAN DEFAULT false,
  dds_submitted_at TIMESTAMPTZ,
  dds_reference TEXT,
  qr_code_url TEXT,
  certificate_url TEXT,
  pedigree_verified BOOLEAN DEFAULT true,
  verification_notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(org_id, pedigree_code)
);

ALTER TABLE processing_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE processing_run_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE finished_goods ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view processing runs in their org" ON processing_runs
  FOR SELECT USING (org_id = get_user_org_id() OR is_system_admin());
CREATE POLICY "Admins can manage processing runs" ON processing_runs
  FOR ALL USING (
    org_id = get_user_org_id()
    AND EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role = 'admin')
  );
CREATE POLICY "System admins can manage all processing runs" ON processing_runs
  FOR ALL USING (is_system_admin());

CREATE POLICY "Users can view processing run batches in their org" ON processing_run_batches
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM processing_runs pr WHERE pr.id = processing_run_id AND pr.org_id = get_user_org_id())
    OR is_system_admin()
  );
CREATE POLICY "Admins can manage processing run batches" ON processing_run_batches
  FOR ALL USING (
    EXISTS (SELECT 1 FROM processing_runs pr WHERE pr.id = processing_run_id AND pr.org_id = get_user_org_id())
    AND EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Users can view finished goods in their org" ON finished_goods
  FOR SELECT USING (org_id = get_user_org_id() OR is_system_admin());
CREATE POLICY "Admins can manage finished goods" ON finished_goods
  FOR ALL USING (
    org_id = get_user_org_id()
    AND EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role = 'admin')
  );
CREATE POLICY "System admins can manage all finished goods" ON finished_goods
  FOR ALL USING (is_system_admin());

-- ============================================
-- DIGITAL PRODUCT PASSPORTS
-- ============================================

CREATE TABLE IF NOT EXISTS digital_product_passports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  finished_good_id UUID NOT NULL REFERENCES finished_goods(id) ON DELETE CASCADE,
  dpp_code TEXT NOT NULL UNIQUE,
  product_category TEXT NOT NULL,
  origin_country TEXT DEFAULT 'NG',
  sustainability_claims JSONB DEFAULT '{}',
  carbon_footprint_kg DECIMAL(10,2),
  certifications JSONB DEFAULT '[]',
  processing_history JSONB DEFAULT '[]',
  chain_of_custody JSONB DEFAULT '[]',
  regulatory_compliance JSONB DEFAULT '{}',
  machine_readable_data JSONB DEFAULT '{}',
  passport_version INTEGER DEFAULT 1,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'revoked')),
  issued_at TIMESTAMPTZ,
  valid_until DATE,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE digital_product_passports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view DPPs in their org" ON digital_product_passports
  FOR SELECT USING (org_id = get_user_org_id() OR is_system_admin());
CREATE POLICY "Admins can manage DPPs" ON digital_product_passports
  FOR ALL USING (
    org_id = get_user_org_id()
    AND EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role IN ('admin', 'compliance_officer'))
  );
CREATE POLICY "System admins can manage all DPPs" ON digital_product_passports
  FOR ALL USING (is_system_admin());
CREATE POLICY "Public can view active DPPs" ON digital_product_passports
  FOR SELECT USING (status = 'active');

CREATE INDEX IF NOT EXISTS idx_dpp_org ON digital_product_passports(org_id);
CREATE INDEX IF NOT EXISTS idx_dpp_code ON digital_product_passports(dpp_code);
CREATE INDEX IF NOT EXISTS idx_dpp_finished_good ON digital_product_passports(finished_good_id);

-- ============================================
-- API KEYS
-- ============================================

CREATE TABLE IF NOT EXISTS api_keys (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  key_hash TEXT NOT NULL,
  key_prefix TEXT NOT NULL,
  name TEXT NOT NULL,
  scopes JSONB DEFAULT '["read"]',
  rate_limit_per_hour INTEGER DEFAULT 1000,
  last_used_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'revoked')),
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view API keys in their org" ON api_keys
  FOR SELECT USING (
    org_id = get_user_org_id()
    AND EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role = 'admin')
  );
CREATE POLICY "Admins can manage API keys" ON api_keys
  FOR ALL USING (
    org_id = get_user_org_id()
    AND EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role = 'admin')
  );
CREATE POLICY "System admins can manage all API keys" ON api_keys
  FOR ALL USING (is_system_admin());

CREATE INDEX IF NOT EXISTS idx_api_keys_org ON api_keys(org_id);
CREATE INDEX IF NOT EXISTS idx_api_keys_prefix ON api_keys(key_prefix);

-- API Rate Limits
CREATE TABLE IF NOT EXISTS api_rate_limits (
  key_prefix TEXT NOT NULL,
  request_count INTEGER NOT NULL DEFAULT 1,
  window_start TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  window_end TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (key_prefix)
);

CREATE INDEX IF NOT EXISTS idx_api_rate_limits_window ON api_rate_limits(window_end);

-- ============================================
-- AUDIT EVENTS
-- ============================================

CREATE TABLE IF NOT EXISTS audit_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
  actor_id UUID,
  actor_email TEXT,
  action TEXT NOT NULL,
  resource_type TEXT,
  resource_id TEXT,
  metadata JSONB DEFAULT '{}',
  ip_address TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE audit_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view audit events" ON audit_events
  FOR SELECT USING (
    org_id IN (SELECT org_id FROM profiles WHERE user_id = auth.uid())
  );

CREATE INDEX IF NOT EXISTS idx_audit_events_org ON audit_events(org_id);
CREATE INDEX IF NOT EXISTS idx_audit_events_action ON audit_events(action);
CREATE INDEX IF NOT EXISTS idx_audit_events_created ON audit_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_events_resource ON audit_events(resource_type, resource_id);

-- ============================================
-- WEBHOOK ENDPOINTS & DELIVERIES
-- ============================================

CREATE TABLE IF NOT EXISTS webhook_endpoints (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  secret TEXT NOT NULL,
  events TEXT[] NOT NULL DEFAULT '{}',
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'paused', 'disabled')),
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE webhook_endpoints ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org admins can manage webhooks" ON webhook_endpoints
  FOR ALL USING (
    org_id IN (SELECT org_id FROM profiles WHERE user_id = auth.uid() AND role = 'admin')
  );

CREATE TABLE IF NOT EXISTS webhook_deliveries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  webhook_id UUID NOT NULL REFERENCES webhook_endpoints(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}',
  response_status INTEGER,
  response_body TEXT,
  attempts INTEGER DEFAULT 0,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'delivered', 'failed')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_webhook ON webhook_deliveries(webhook_id);
CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_created ON webhook_deliveries(created_at DESC);

-- webhook_events alias (used in some API routes)
CREATE TABLE IF NOT EXISTS webhook_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  webhook_id UUID REFERENCES webhook_endpoints(id) ON DELETE CASCADE,
  org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}',
  response_status INTEGER,
  response_body TEXT,
  attempts INTEGER DEFAULT 0,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'delivered', 'failed')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- FARMER DIGITAL IDENTITY
-- ============================================

CREATE TABLE IF NOT EXISTS farmer_accounts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  farm_id UUID REFERENCES farms(id) ON DELETE SET NULL,
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  phone TEXT NOT NULL,
  farmer_code TEXT,
  status TEXT DEFAULT 'invited' CHECK (status IN ('invited', 'active', 'suspended')),
  pin_hash TEXT,
  invite_token TEXT UNIQUE,
  preferred_locale TEXT DEFAULT 'en',
  verified_at TIMESTAMPTZ,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE farmer_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Farmers can view own account" ON farmer_accounts
  FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Org members can view farmer accounts" ON farmer_accounts
  FOR SELECT USING (
    org_id IN (SELECT org_id FROM profiles WHERE user_id = auth.uid())
  );

CREATE INDEX IF NOT EXISTS idx_farmer_accounts_phone ON farmer_accounts(phone);
CREATE INDEX IF NOT EXISTS idx_farmer_accounts_farm ON farmer_accounts(farm_id);
CREATE INDEX IF NOT EXISTS idx_farmer_accounts_org ON farmer_accounts(org_id);
CREATE INDEX IF NOT EXISTS idx_farmer_accounts_token ON farmer_accounts(invite_token);

-- ============================================
-- FARMER DELIVERIES (used in farmer portal)
-- ============================================

CREATE TABLE IF NOT EXISTS farmer_deliveries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  farmer_account_id UUID REFERENCES farmer_accounts(id) ON DELETE CASCADE,
  farm_id UUID REFERENCES farms(id) ON DELETE SET NULL,
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  batch_id UUID REFERENCES collection_batches(id) ON DELETE SET NULL,
  commodity TEXT,
  weight_kg DECIMAL(12,2),
  grade TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
  notes TEXT,
  delivered_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE farmer_deliveries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Farmers can view own deliveries" ON farmer_deliveries
  FOR SELECT USING (
    farmer_account_id IN (SELECT id FROM farmer_accounts WHERE user_id = auth.uid())
  );
CREATE POLICY "Org members can view farmer deliveries" ON farmer_deliveries
  FOR ALL USING (
    org_id IN (SELECT org_id FROM profiles WHERE user_id = auth.uid())
  );

CREATE INDEX IF NOT EXISTS idx_farmer_deliveries_farmer ON farmer_deliveries(farmer_account_id);
CREATE INDEX IF NOT EXISTS idx_farmer_deliveries_org ON farmer_deliveries(org_id);

-- ============================================
-- FARMER PAYMENTS (farmer portal payment view)
-- ============================================

CREATE TABLE IF NOT EXISTS farmer_payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  farmer_account_id UUID REFERENCES farmer_accounts(id) ON DELETE CASCADE,
  farm_id UUID REFERENCES farms(id) ON DELETE SET NULL,
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  amount DECIMAL(12,2) NOT NULL,
  currency TEXT DEFAULT 'NGN',
  payment_method TEXT CHECK (payment_method IN ('cash', 'bank_transfer', 'mobile_money')),
  reference_number TEXT,
  status TEXT DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'failed')),
  payment_date DATE DEFAULT CURRENT_DATE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE farmer_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Farmers can view own payments" ON farmer_payments
  FOR SELECT USING (
    farmer_account_id IN (SELECT id FROM farmer_accounts WHERE user_id = auth.uid())
  );
CREATE POLICY "Org members can manage farmer payments" ON farmer_payments
  FOR ALL USING (
    org_id IN (SELECT org_id FROM profiles WHERE user_id = auth.uid())
  );

CREATE INDEX IF NOT EXISTS idx_farmer_payments_farmer ON farmer_payments(farmer_account_id);
CREATE INDEX IF NOT EXISTS idx_farmer_payments_org ON farmer_payments(org_id);

-- ============================================
-- FARMER TRAINING
-- ============================================

CREATE TABLE IF NOT EXISTS farmer_training (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  farmer_account_id UUID REFERENCES farmer_accounts(id) ON DELETE CASCADE,
  farm_id UUID REFERENCES farms(id) ON DELETE SET NULL,
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  module_name TEXT NOT NULL,
  module_type TEXT NOT NULL CHECK (module_type IN ('gap', 'safety', 'sustainability', 'organic', 'child_labor', 'eudr_awareness')),
  status TEXT DEFAULT 'not_started' CHECK (status IN ('not_started', 'in_progress', 'completed')),
  completed_at TIMESTAMPTZ,
  score DECIMAL,
  certificate_url TEXT,
  assigned_by UUID,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE farmer_training ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can manage training" ON farmer_training
  FOR ALL USING (
    org_id IN (SELECT org_id FROM profiles WHERE user_id = auth.uid())
  );

CREATE INDEX IF NOT EXISTS idx_farmer_training_farmer ON farmer_training(farmer_account_id);
CREATE INDEX IF NOT EXISTS idx_farmer_training_org ON farmer_training(org_id);

-- ============================================
-- FARMER INPUTS
-- ============================================

CREATE TABLE IF NOT EXISTS farmer_inputs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  farm_id UUID NOT NULL REFERENCES farms(id) ON DELETE CASCADE,
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  input_type TEXT NOT NULL CHECK (input_type IN ('fertilizer', 'pesticide', 'herbicide', 'seed', 'organic_amendment')),
  product_name TEXT,
  quantity DECIMAL,
  unit TEXT CHECK (unit IN ('kg', 'liters', 'bags', 'units')),
  application_date DATE,
  area_applied_hectares DECIMAL,
  notes TEXT,
  recorded_by UUID,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE farmer_inputs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can manage inputs" ON farmer_inputs
  FOR ALL USING (
    org_id IN (SELECT org_id FROM profiles WHERE user_id = auth.uid())
  );

CREATE INDEX IF NOT EXISTS idx_farmer_inputs_farm ON farmer_inputs(farm_id);

-- ============================================
-- TENDERS (Spot Market)
-- ============================================

CREATE TABLE IF NOT EXISTS tenders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  buyer_org_id UUID NOT NULL REFERENCES buyer_organizations(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  commodity TEXT NOT NULL,
  quantity_mt DECIMAL(12,2) NOT NULL,
  target_price_per_mt DECIMAL(12,2),
  currency TEXT DEFAULT 'USD',
  delivery_deadline DATE,
  destination_country TEXT,
  destination_port TEXT,
  quality_requirements JSONB DEFAULT '{}',
  certifications_required TEXT[] DEFAULT '{}',
  regulation_framework TEXT,
  status TEXT DEFAULT 'open' CHECK (status IN ('open', 'closed', 'awarded', 'cancelled')),
  visibility TEXT DEFAULT 'public' CHECK (visibility IN ('public', 'invited')),
  invited_orgs UUID[] DEFAULT '{}',
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  closes_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS tender_bids (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tender_id UUID NOT NULL REFERENCES tenders(id) ON DELETE CASCADE,
  exporter_org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  price_per_mt DECIMAL(12,2) NOT NULL,
  quantity_available_mt DECIMAL(12,2) NOT NULL,
  delivery_date DATE,
  notes TEXT,
  compliance_score DECIMAL(5,2),
  certifications TEXT[] DEFAULT '{}',
  status TEXT DEFAULT 'submitted' CHECK (status IN ('submitted', 'shortlisted', 'awarded', 'rejected', 'withdrawn')),
  submitted_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE tenders ENABLE ROW LEVEL SECURITY;
ALTER TABLE tender_bids ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Buyer orgs can manage their tenders" ON tenders
  FOR ALL USING (
    EXISTS (SELECT 1 FROM buyer_profiles WHERE user_id = auth.uid() AND buyer_org_id = tenders.buyer_org_id AND role = 'buyer_admin')
  );
CREATE POLICY "Exporters can view public or invited tenders" ON tenders
  FOR SELECT USING (
    (visibility = 'public' AND status = 'open')
    OR (visibility = 'invited' AND get_user_org_id() = ANY(invited_orgs))
    OR EXISTS (SELECT 1 FROM buyer_profiles WHERE user_id = auth.uid() AND buyer_org_id = tenders.buyer_org_id)
    OR is_system_admin()
  );
CREATE POLICY "System admins can manage all tenders" ON tenders
  FOR ALL USING (is_system_admin());

CREATE POLICY "Exporters can manage their own bids" ON tender_bids
  FOR ALL USING (
    exporter_org_id = get_user_org_id()
    OR EXISTS (SELECT 1 FROM tenders t WHERE t.id = tender_bids.tender_id AND EXISTS (SELECT 1 FROM buyer_profiles WHERE user_id = auth.uid() AND buyer_org_id = t.buyer_org_id))
    OR is_system_admin()
  );

CREATE INDEX IF NOT EXISTS idx_tenders_buyer_org ON tenders(buyer_org_id);
CREATE INDEX IF NOT EXISTS idx_tenders_status ON tenders(status);
CREATE INDEX IF NOT EXISTS idx_tenders_commodity ON tenders(commodity);
CREATE INDEX IF NOT EXISTS idx_tender_bids_tender ON tender_bids(tender_id);
CREATE INDEX IF NOT EXISTS idx_tender_bids_exporter ON tender_bids(exporter_org_id);

-- ============================================
-- ADDITIONAL TABLES
-- ============================================

CREATE TABLE IF NOT EXISTS recovery_standards (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  commodity TEXT NOT NULL,
  product_type TEXT NOT NULL,
  standard_recovery_rate DECIMAL(5,2) NOT NULL,
  tolerance_percent DECIMAL(5,2) DEFAULT 5.0,
  unit TEXT DEFAULT 'kg',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(commodity, product_type)
);

ALTER TABLE recovery_standards ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view recovery standards" ON recovery_standards
  FOR SELECT USING (true);

INSERT INTO recovery_standards (commodity, product_type, standard_recovery_rate, tolerance_percent, notes) VALUES
  ('cocoa', 'cocoa_butter', 41.6, 5.0, 'Standard butter extraction from dried beans'),
  ('cocoa', 'cocoa_powder', 22.0, 5.0, 'Standard powder yield after butter extraction'),
  ('cocoa', 'cocoa_liquor', 82.0, 5.0, 'Liquor from roasted nibs'),
  ('cocoa', 'cocoa_nibs', 87.0, 5.0, 'Nibs from shelled beans'),
  ('cashew', 'cashew_kernel', 25.0, 5.0, 'Raw kernel extraction rate'),
  ('cashew', 'cashew_butter', 20.0, 5.0, 'Butter from kernels'),
  ('palm_kernel', 'palm_kernel_oil', 45.0, 5.0, 'Oil extraction from palm kernels'),
  ('ginger', 'ginger_powder', 15.0, 5.0, 'Dried powder from fresh ginger'),
  ('rubber', 'dry_rubber_content', 30.0, 5.0, 'DRC from latex')
ON CONFLICT (commodity, product_type) DO NOTHING;

CREATE TABLE IF NOT EXISTS yield_benchmarks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  commodity TEXT NOT NULL,
  country TEXT,
  region TEXT,
  season TEXT,
  avg_yield_per_hectare DECIMAL,
  min_yield DECIMAL,
  max_yield DECIMAL,
  source TEXT,
  year INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO yield_benchmarks (commodity, country, region, avg_yield_per_hectare, min_yield, max_yield, source, year) VALUES
  ('Cocoa', 'Nigeria', 'South West', 0.35, 0.15, 0.60, 'ICCO/FAO', 2024),
  ('Cocoa', 'Ghana', 'Western Region', 0.45, 0.20, 0.80, 'COCOBOD', 2024),
  ('Cashew', 'Nigeria', 'Kogi', 0.80, 0.40, 1.50, 'ACA', 2024),
  ('Sesame', 'Nigeria', 'Nassarawa', 0.45, 0.20, 0.80, 'FAO', 2024),
  ('Shea', 'Nigeria', 'Niger', 0.25, 0.10, 0.50, 'Global Shea Alliance', 2024)
ON CONFLICT DO NOTHING;

CREATE TABLE IF NOT EXISTS farm_certifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  farm_id UUID NOT NULL REFERENCES farms(id) ON DELETE CASCADE,
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  certification_body TEXT NOT NULL CHECK (certification_body IN ('rainforest_alliance', 'utz', 'fairtrade', 'organic', 'globalgap', 'fsc', 'pefc', 'other')),
  certificate_number TEXT,
  issued_date DATE,
  expiry_date DATE,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'expired', 'revoked', 'pending')),
  verification_url TEXT,
  verified_by UUID,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE farm_certifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Org members can manage certifications" ON farm_certifications
  FOR ALL USING (
    org_id IN (SELECT org_id FROM profiles WHERE user_id = auth.uid())
  );
CREATE INDEX IF NOT EXISTS idx_farm_certifications_farm ON farm_certifications(farm_id);
CREATE INDEX IF NOT EXISTS idx_farm_certifications_expiry ON farm_certifications(expiry_date);

-- System config
CREATE TABLE IF NOT EXISTS system_config (
  key VARCHAR(100) PRIMARY KEY,
  value JSONB NOT NULL DEFAULT '{}',
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_by UUID
);
ALTER TABLE system_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY "system_config_service_role_only" ON system_config
  FOR ALL USING (auth.role() = 'service_role');

-- Shipment Items
CREATE TABLE IF NOT EXISTS shipment_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  shipment_id UUID NOT NULL REFERENCES shipments(id) ON DELETE CASCADE,
  item_type TEXT NOT NULL CHECK (item_type IN ('batch', 'finished_good')),
  batch_id UUID REFERENCES collection_batches(id) ON DELETE SET NULL,
  finished_good_id UUID REFERENCES finished_goods(id) ON DELETE SET NULL,
  farm_id UUID REFERENCES farms(id) ON DELETE SET NULL,
  weight_kg NUMERIC(12,2) DEFAULT 0,
  farm_count INTEGER DEFAULT 0,
  traceability_complete BOOLEAN DEFAULT false,
  compliance_status TEXT DEFAULT 'pending' CHECK (compliance_status IN ('pending', 'approved', 'rejected')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE shipment_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view shipment items in their org" ON shipment_items
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM shipments s WHERE s.id = shipment_items.shipment_id AND s.org_id = get_user_org_id())
    OR is_system_admin()
  );
CREATE POLICY "Authorized users can manage shipment items" ON shipment_items
  FOR ALL USING (
    EXISTS (SELECT 1 FROM shipments s WHERE s.id = shipment_items.shipment_id AND s.org_id = get_user_org_id())
    AND EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role IN ('admin', 'logistics_coordinator', 'compliance_officer'))
  );
CREATE POLICY "System admins can manage all shipment items" ON shipment_items
  FOR ALL USING (is_system_admin());
CREATE INDEX IF NOT EXISTS idx_shipment_items_shipment ON shipment_items(shipment_id);

-- Shipment Lots
CREATE TABLE IF NOT EXISTS shipment_lots (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  shipment_id UUID NOT NULL REFERENCES shipments(id) ON DELETE CASCADE,
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  lot_code TEXT NOT NULL,
  commodity TEXT,
  notes TEXT,
  total_weight_kg NUMERIC(12,2) DEFAULT 0,
  total_bags INTEGER DEFAULT 0,
  farm_count INTEGER DEFAULT 0,
  mass_balance_valid BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE shipment_lots ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view shipment lots in their org" ON shipment_lots
  FOR SELECT USING (org_id = get_user_org_id() OR is_system_admin());
CREATE POLICY "Authorized users can manage shipment lots" ON shipment_lots
  FOR ALL USING (
    org_id = get_user_org_id()
    AND EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role IN ('admin', 'logistics_coordinator', 'compliance_officer'))
  );
CREATE POLICY "System admins can manage all shipment lots" ON shipment_lots
  FOR ALL USING (is_system_admin());
CREATE INDEX IF NOT EXISTS idx_shipment_lots_shipment ON shipment_lots(shipment_id);

-- Shipment Lot Items
CREATE TABLE IF NOT EXISTS shipment_lot_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lot_id UUID NOT NULL REFERENCES shipment_lots(id) ON DELETE CASCADE,
  shipment_item_id UUID REFERENCES shipment_items(id) ON DELETE SET NULL,
  batch_id UUID REFERENCES collection_batches(id) ON DELETE SET NULL,
  weight_kg NUMERIC(12,2) DEFAULT 0,
  bag_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE shipment_lot_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view shipment lot items via lot org" ON shipment_lot_items
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM shipment_lots sl WHERE sl.id = shipment_lot_items.lot_id AND sl.org_id = get_user_org_id())
    OR is_system_admin()
  );
CREATE POLICY "Authorized users can manage shipment lot items" ON shipment_lot_items
  FOR ALL USING (
    EXISTS (SELECT 1 FROM shipment_lots sl WHERE sl.id = shipment_lot_items.lot_id AND sl.org_id = get_user_org_id())
    AND EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role IN ('admin', 'logistics_coordinator', 'compliance_officer'))
  );
CREATE POLICY "System admins can manage all shipment lot items" ON shipment_lot_items
  FOR ALL USING (is_system_admin());

-- Notifications
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT,
  link TEXT,
  is_read BOOLEAN DEFAULT false,
  read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own notifications" ON notifications
  FOR SELECT USING (user_id = auth.uid() OR is_system_admin());
CREATE POLICY "Users can update their own notifications" ON notifications
  FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "System can insert notifications" ON notifications
  FOR INSERT WITH CHECK (true);
CREATE POLICY "System admins can manage all notifications" ON notifications
  FOR ALL USING (is_system_admin());
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_org ON notifications(org_id);

-- Audit Logs
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  resource_type TEXT,
  resource_id TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "System admins can view audit logs" ON audit_logs
  FOR SELECT USING (is_system_admin());
CREATE POLICY "Service role can insert audit logs" ON audit_logs
  FOR INSERT WITH CHECK (true);
CREATE POLICY "System admins can manage all audit logs" ON audit_logs
  FOR ALL USING (is_system_admin());

-- Delegations
CREATE TABLE IF NOT EXISTS delegations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  delegated_to UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  delegated_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  permission TEXT NOT NULL CHECK (permission IN ('conflict_resolution', 'compliance_review')),
  region_scope JSONB,
  is_active BOOLEAN DEFAULT true,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE delegations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view delegations in their org" ON delegations
  FOR SELECT USING (org_id = get_user_org_id() OR is_system_admin());
CREATE POLICY "Admins can manage delegations in their org" ON delegations
  FOR ALL USING (
    org_id = get_user_org_id()
    AND EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role = 'admin')
  );
CREATE POLICY "System admins can manage all delegations" ON delegations
  FOR ALL USING (is_system_admin());

-- Delegation Audit Log
CREATE TABLE IF NOT EXISTS delegation_audit_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  delegation_id UUID NOT NULL REFERENCES delegations(id) ON DELETE CASCADE,
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  actor_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  details JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE delegation_audit_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view delegation audit log in their org" ON delegation_audit_log
  FOR SELECT USING (org_id = get_user_org_id() OR is_system_admin());
CREATE POLICY "System can insert delegation audit log" ON delegation_audit_log
  FOR INSERT WITH CHECK (true);
CREATE POLICY "System admins can manage all delegation audit logs" ON delegation_audit_log
  FOR ALL USING (is_system_admin());

-- Tenant Health Metrics
CREATE TABLE IF NOT EXISTS tenant_health_metrics (
  org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  org_name TEXT,
  subscription_tier TEXT,
  org_created_at TIMESTAMPTZ,
  total_users INTEGER DEFAULT 0,
  agent_count INTEGER DEFAULT 0,
  total_farms INTEGER DEFAULT 0,
  total_batches INTEGER DEFAULT 0,
  flagged_batches INTEGER DEFAULT 0,
  total_weight_kg NUMERIC(14,2) DEFAULT 0,
  last_collection_date TIMESTAMPTZ,
  growth_trend TEXT CHECK (growth_trend IN ('growing', 'stable', 'declining')),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (org_id)
);

ALTER TABLE tenant_health_metrics ENABLE ROW LEVEL SECURITY;
CREATE POLICY "System admins can view tenant health metrics" ON tenant_health_metrics
  FOR SELECT USING (is_system_admin());
CREATE POLICY "Service role can manage tenant health metrics" ON tenant_health_metrics
  FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "System admins can manage all tenant health metrics" ON tenant_health_metrics
  FOR ALL USING (is_system_admin());

-- Batch Contributions
CREATE TABLE IF NOT EXISTS batch_contributions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  batch_id UUID NOT NULL REFERENCES collection_batches(id) ON DELETE CASCADE,
  farm_id UUID NOT NULL REFERENCES farms(id) ON DELETE CASCADE,
  farmer_name TEXT,
  weight_kg NUMERIC(12,2) DEFAULT 0,
  bag_count INTEGER DEFAULT 0,
  compliance_status TEXT DEFAULT 'pending' CHECK (compliance_status IN ('pending', 'verified', 'rejected')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE batch_contributions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view batch contributions in their org" ON batch_contributions
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM collection_batches cb WHERE cb.id = batch_contributions.batch_id AND cb.org_id = get_user_org_id())
    OR is_system_admin()
  );
CREATE POLICY "Authorized users can manage batch contributions" ON batch_contributions
  FOR ALL USING (
    EXISTS (SELECT 1 FROM collection_batches cb WHERE cb.id = batch_contributions.batch_id AND cb.org_id = get_user_org_id())
    AND EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role IN ('admin', 'aggregator'))
  );
CREATE POLICY "System admins can manage all batch contributions" ON batch_contributions
  FOR ALL USING (is_system_admin());
CREATE INDEX IF NOT EXISTS idx_batch_contributions_batch ON batch_contributions(batch_id);
CREATE INDEX IF NOT EXISTS idx_batch_contributions_farm ON batch_contributions(farm_id);

-- Farmer Performance Ledger Table
CREATE TABLE IF NOT EXISTS farmer_performance_ledger_table (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  farm_id UUID NOT NULL REFERENCES farms(id) ON DELETE CASCADE,
  season TEXT NOT NULL,
  total_collections INTEGER DEFAULT 0,
  total_weight_kg NUMERIC(12,2) DEFAULT 0,
  avg_grade TEXT,
  yield_per_hectare NUMERIC(10,2),
  compliance_score INTEGER DEFAULT 0,
  payment_reliability INTEGER DEFAULT 100,
  quality_consistency INTEGER DEFAULT 100,
  credit_score INTEGER,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(org_id, farm_id, season)
);

ALTER TABLE farmer_performance_ledger_table ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view farmer performance in their org" ON farmer_performance_ledger_table
  FOR SELECT USING (org_id = get_user_org_id() OR is_system_admin());
CREATE POLICY "Admins can manage farmer performance in their org" ON farmer_performance_ledger_table
  FOR ALL USING (
    org_id = get_user_org_id()
    AND EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role IN ('admin', 'aggregator'))
  );
CREATE POLICY "System admins can manage all farmer performance" ON farmer_performance_ledger_table
  FOR ALL USING (is_system_admin());

-- Pedigree Verification Records
CREATE TABLE IF NOT EXISTS pedigree_verification_records (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  finished_good_id UUID NOT NULL REFERENCES finished_goods(id) ON DELETE CASCADE,
  pedigree_code TEXT NOT NULL,
  product_name TEXT NOT NULL,
  product_type TEXT NOT NULL,
  finished_weight_kg NUMERIC(12,2),
  production_date DATE,
  destination_country TEXT,
  buyer_name TEXT,
  buyer_company TEXT,
  dds_submitted BOOLEAN DEFAULT false,
  dds_submitted_at TIMESTAMPTZ,
  dds_reference TEXT,
  pedigree_verified BOOLEAN DEFAULT true,
  verification_notes TEXT,
  processing_run_code TEXT,
  facility_name TEXT,
  facility_location TEXT,
  raw_input_kg NUMERIC(12,2),
  processed_output_kg NUMERIC(12,2),
  recovery_rate NUMERIC(5,2),
  standard_recovery_rate NUMERIC(5,2),
  mass_balance_valid BOOLEAN DEFAULT true,
  mass_balance_variance NUMERIC(5,2),
  processed_at TIMESTAMPTZ,
  organization_name TEXT,
  organization_logo TEXT,
  source_farms JSONB,
  total_smallholders INTEGER DEFAULT 0,
  total_farm_area_hectares NUMERIC(12,2),
  verified_by UUID REFERENCES auth.users(id),
  verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(finished_good_id)
);

ALTER TABLE pedigree_verification_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view pedigree records in their org" ON pedigree_verification_records
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM finished_goods fg WHERE fg.id = pedigree_verification_records.finished_good_id AND fg.org_id = get_user_org_id())
    OR is_system_admin()
  );
CREATE POLICY "Admins can manage pedigree records" ON pedigree_verification_records
  FOR ALL USING (
    EXISTS (SELECT 1 FROM finished_goods fg WHERE fg.id = pedigree_verification_records.finished_good_id AND fg.org_id = get_user_org_id())
    AND EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role IN ('admin', 'compliance_officer'))
  );
CREATE POLICY "System admins can manage all pedigree records" ON pedigree_verification_records
  FOR ALL USING (is_system_admin());
CREATE POLICY "Public can view verified pedigree records" ON pedigree_verification_records
  FOR SELECT USING (pedigree_verified = true);

-- Add deforestation_check column to farms if not exists
ALTER TABLE farms ADD COLUMN IF NOT EXISTS deforestation_check JSONB;
ALTER TABLE farms ADD COLUMN IF NOT EXISTS boundary_analysis JSONB;
ALTER TABLE farms ADD COLUMN IF NOT EXISTS commodity TEXT DEFAULT 'cocoa';
ALTER TABLE farms ADD COLUMN IF NOT EXISTS consent_timestamp TIMESTAMPTZ;
ALTER TABLE farms ADD COLUMN IF NOT EXISTS consent_photo_url TEXT;
ALTER TABLE farms ADD COLUMN IF NOT EXISTS consent_signature TEXT;
ALTER TABLE farms ADD COLUMN IF NOT EXISTS conflict_status VARCHAR(20) DEFAULT 'none';

-- Add preferred_locale to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS preferred_locale TEXT DEFAULT 'en';

-- Add brand_colors to organizations
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS brand_colors JSONB DEFAULT NULL;

-- ============================================
-- DONE! All missing tables created.
-- ============================================

-- ============================================
-- TASK #5 — Schema Migration Fixes (2026-03-21)
-- ============================================

-- 1. collection_batches.status — add 'resolved' and 'dispatched'
--    DROP old constraint, ADD new one with all valid values (idempotent via DO block)
DO $$
BEGIN
  -- Drop the old constraint if it exists (any name)
  EXECUTE (
    SELECT 'ALTER TABLE collection_batches DROP CONSTRAINT ' || quote_ident(conname)
    FROM pg_constraint
    WHERE conrelid = 'collection_batches'::regclass
      AND contype = 'c'
      AND conname LIKE '%status%'
    LIMIT 1
  );
EXCEPTION WHEN undefined_object THEN NULL;
END $$;

ALTER TABLE collection_batches
  ADD CONSTRAINT collection_batches_status_check
  CHECK (status IN ('collecting', 'completed', 'aggregated', 'resolved', 'dispatched', 'shipped'));

-- 2. commodity_master.org_id — add if missing (live DB has is_global/created_by_org_id schema)
ALTER TABLE commodity_master ADD COLUMN IF NOT EXISTS org_id UUID REFERENCES organizations(id) ON DELETE CASCADE;

-- Backfill: mark rows that have no created_by_org_id as global (org_id stays NULL)
-- Rows with created_by_org_id get their org_id populated
UPDATE commodity_master
  SET org_id = created_by_org_id
  WHERE org_id IS NULL AND created_by_org_id IS NOT NULL;

-- 3. bags.weight_kg — add if missing (may be named 'weight' in older installs)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'bags' AND column_name = 'weight'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'bags' AND column_name = 'weight_kg'
  ) THEN
    ALTER TABLE bags RENAME COLUMN weight TO weight_kg;
  END IF;
END $$;
ALTER TABLE bags ADD COLUMN IF NOT EXISTS weight_kg NUMERIC(12,2) DEFAULT 0;
ALTER TABLE bags ADD COLUMN IF NOT EXISTS grade TEXT;
ALTER TABLE bags ADD COLUMN IF NOT EXISTS is_compliant BOOLEAN DEFAULT true;

-- Add dispatch columns to collection_batches (used by dispatch page)
ALTER TABLE collection_batches ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;
ALTER TABLE collection_batches ADD COLUMN IF NOT EXISTS dispatched_at TIMESTAMPTZ;
ALTER TABLE collection_batches ADD COLUMN IF NOT EXISTS dispatched_by UUID REFERENCES auth.users(id);
ALTER TABLE collection_batches ADD COLUMN IF NOT EXISTS dispatch_destination TEXT;
ALTER TABLE collection_batches ADD COLUMN IF NOT EXISTS vehicle_reference TEXT;

-- ============================================
-- Missing tables: shipment_outcomes + cold_chain_logs
-- Both defined in schema.sql but never added to this migration file.
-- Safe to run: CREATE TABLE IF NOT EXISTS is idempotent.
-- ============================================

CREATE TABLE IF NOT EXISTS shipment_outcomes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  shipment_id UUID REFERENCES shipments(id),
  outcome TEXT NOT NULL CHECK (outcome IN ('accepted', 'rejected', 'conditional', 'withdrawn')),
  reason TEXT,
  destination_country TEXT,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_shipment_outcomes_org_id ON shipment_outcomes(org_id);
CREATE INDEX IF NOT EXISTS idx_shipment_outcomes_shipment_id ON shipment_outcomes(shipment_id);

ALTER TABLE shipment_outcomes ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'shipment_outcomes' AND policyname = 'org_access_shipment_outcomes'
  ) THEN
    CREATE POLICY "org_access_shipment_outcomes" ON shipment_outcomes
      FOR ALL USING (org_id = get_user_org_id());
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS cold_chain_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  shipment_id UUID NOT NULL REFERENCES shipments(id) ON DELETE CASCADE,
  temperature_celsius NUMERIC(6,2),
  humidity_percent NUMERIC(5,2),
  location TEXT,
  is_alert BOOLEAN DEFAULT false,
  alert_reason TEXT,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cold_chain_logs_shipment_id ON cold_chain_logs(shipment_id);
CREATE INDEX IF NOT EXISTS idx_cold_chain_logs_org_id ON cold_chain_logs(org_id);

ALTER TABLE cold_chain_logs ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'cold_chain_logs' AND policyname = 'org_access_cold_chain_logs'
  ) THEN
    CREATE POLICY "org_access_cold_chain_logs" ON cold_chain_logs
      FOR ALL USING (org_id = get_user_org_id());
  END IF;
END $$;

-- ============================================
-- Missing tables: farmer_performance_ledger, payment_links, yield_predictions
-- ============================================

CREATE TABLE IF NOT EXISTS farmer_performance_ledger (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  farm_id UUID REFERENCES farms(id) ON DELETE CASCADE,
  farmer_name TEXT NOT NULL,
  community TEXT,
  area_hectares NUMERIC,
  commodity TEXT,
  total_delivery_kg NUMERIC DEFAULT 0,
  total_bag_count INTEGER DEFAULT 0,
  total_batch_count INTEGER DEFAULT 0,
  avg_quality_score NUMERIC DEFAULT 0,
  avg_grade_score NUMERIC DEFAULT 0,
  grade_a_percentage NUMERIC DEFAULT 0,
  grade_b_percentage NUMERIC DEFAULT 0,
  grade_c_percentage NUMERIC DEFAULT 0,
  compliance_status TEXT DEFAULT 'pending' CHECK (compliance_status IN ('pending', 'verified', 'flagged')),
  consent_collected BOOLEAN DEFAULT false,
  has_consent BOOLEAN DEFAULT false,
  gps_recorded BOOLEAN DEFAULT false,
  deforestation_free BOOLEAN DEFAULT true,
  total_payments_ngn NUMERIC DEFAULT 0,
  payment_reliability INTEGER DEFAULT 100,
  current_season TEXT,
  last_delivery_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_farmer_ledger_org ON farmer_performance_ledger(org_id);
ALTER TABLE farmer_performance_ledger ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='farmer_performance_ledger' AND policyname='org_access_farmer_performance_ledger') THEN
    CREATE POLICY "org_access_farmer_performance_ledger" ON farmer_performance_ledger FOR ALL USING (org_id = get_user_org_id());
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS yield_predictions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  farm_id UUID REFERENCES farms(id) ON DELETE CASCADE,
  commodity TEXT,
  predicted_yield_kg NUMERIC(12,2),
  actual_yield_kg NUMERIC(12,2),
  variance_pct NUMERIC(8,2),
  season TEXT,
  alert_level TEXT CHECK (alert_level IN ('none','positive','warning','critical')),
  alert_message TEXT,
  prediction_date TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_yield_predictions_org ON yield_predictions(org_id);
ALTER TABLE yield_predictions ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='yield_predictions' AND policyname='org_yield_predictions') THEN
    CREATE POLICY "org_yield_predictions" ON yield_predictions FOR ALL USING (org_id = get_user_org_id());
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS payment_links (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  tier TEXT NOT NULL CHECK (tier IN ('starter','basic','pro','enterprise')),
  billing_period TEXT NOT NULL DEFAULT 'monthly' CHECK (billing_period IN ('monthly','annual','custom')),
  amount_ngn DECIMAL(12,2) NOT NULL,
  paystack_reference TEXT UNIQUE,
  paystack_link TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending','paid','expired','cancelled')),
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '7 days'),
  paid_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payment_links_org ON payment_links(org_id);
CREATE INDEX IF NOT EXISTS idx_payment_links_ref ON payment_links(paystack_reference);
CREATE INDEX IF NOT EXISTS idx_payment_links_status ON payment_links(status);
ALTER TABLE payment_links ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='payment_links' AND policyname='payment_links_service_only') THEN
    CREATE POLICY "payment_links_service_only" ON payment_links USING (false);
  END IF;
END $$;

-- Subscription columns on organizations (idempotent)
ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS subscription_expires_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS grace_period_ends_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS subscription_status TEXT DEFAULT 'active'
    CHECK (subscription_status IN ('active','grace_period','expired','cancelled'));

-- Expand documents.document_type CHECK to include additional types used in the app
-- Drop old constraint, add new one with full type list
DO $$
BEGIN
  ALTER TABLE documents DROP CONSTRAINT IF EXISTS documents_document_type_check;
EXCEPTION WHEN undefined_object THEN NULL;
END $$;

ALTER TABLE documents ADD CONSTRAINT documents_document_type_check
  CHECK (document_type IN (
    'export_license', 'phytosanitary', 'fumigation', 'organic_cert', 'insurance',
    'lab_result', 'customs_declaration', 'bill_of_lading', 'certificate_of_origin',
    'quality_cert', 'gacc_registration', 'haccp_cert', 'iso_cert', 'dds',
    'due_diligence_statement', 'packing_list', 'commercial_invoice', 'other'
  ));
