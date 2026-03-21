-- =============================================
-- OriginTrace — Complete Database Migration
-- Run in Supabase SQL Editor
-- ALL STATEMENTS ARE IDEMPOTENT
-- Last updated: 2026-03-21
-- =============================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- COLUMN ADDITIONS (safe to run any time)
-- ============================================

ALTER TABLE farms ADD COLUMN IF NOT EXISTS deforestation_check JSONB;
ALTER TABLE farms ADD COLUMN IF NOT EXISTS boundary_analysis JSONB;
ALTER TABLE farms ADD COLUMN IF NOT EXISTS commodity TEXT DEFAULT 'cocoa';
ALTER TABLE farms ADD COLUMN IF NOT EXISTS consent_timestamp TIMESTAMPTZ;
ALTER TABLE farms ADD COLUMN IF NOT EXISTS consent_photo_url TEXT;
ALTER TABLE farms ADD COLUMN IF NOT EXISTS consent_signature TEXT;
ALTER TABLE farms ADD COLUMN IF NOT EXISTS conflict_status VARCHAR(20) DEFAULT 'none';

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS preferred_locale TEXT DEFAULT 'en';
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS brand_colors JSONB DEFAULT NULL;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS subscription_expires_at TIMESTAMPTZ;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS grace_period_ends_at TIMESTAMPTZ;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS subscription_status TEXT DEFAULT 'active';

-- collection_batches columns
ALTER TABLE collection_batches ADD COLUMN IF NOT EXISTS batch_code TEXT;
ALTER TABLE collection_batches ADD COLUMN IF NOT EXISTS commodity TEXT;
ALTER TABLE collection_batches ADD COLUMN IF NOT EXISTS grade TEXT;
ALTER TABLE collection_batches ADD COLUMN IF NOT EXISTS yield_validated BOOLEAN DEFAULT false;
ALTER TABLE collection_batches ADD COLUMN IF NOT EXISTS yield_flag_reason TEXT;
ALTER TABLE collection_batches ADD COLUMN IF NOT EXISTS community TEXT;
ALTER TABLE collection_batches ADD COLUMN IF NOT EXISTS state TEXT;
ALTER TABLE collection_batches ADD COLUMN IF NOT EXISTS lga TEXT;
ALTER TABLE collection_batches ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;
ALTER TABLE collection_batches ADD COLUMN IF NOT EXISTS dispatched_at TIMESTAMPTZ;
ALTER TABLE collection_batches ADD COLUMN IF NOT EXISTS dispatched_by UUID;
ALTER TABLE collection_batches ADD COLUMN IF NOT EXISTS dispatch_destination TEXT;
ALTER TABLE collection_batches ADD COLUMN IF NOT EXISTS vehicle_reference TEXT;

-- collection_batches.status CHECK — drop old, add new with resolved/dispatched
ALTER TABLE collection_batches DROP CONSTRAINT IF EXISTS collection_batches_status_check;
ALTER TABLE collection_batches ADD CONSTRAINT collection_batches_status_check
  CHECK (status IN ('collecting','completed','aggregated','resolved','dispatched','shipped'));

-- bags columns
ALTER TABLE bags ADD COLUMN IF NOT EXISTS weight_kg NUMERIC(12,2) DEFAULT 0;
ALTER TABLE bags ADD COLUMN IF NOT EXISTS grade TEXT;
ALTER TABLE bags ADD COLUMN IF NOT EXISTS is_compliant BOOLEAN DEFAULT true;

-- commodity_master columns
ALTER TABLE commodity_master ADD COLUMN IF NOT EXISTS org_id UUID;

-- ============================================
-- documents.document_type CHECK expansion
-- ============================================

ALTER TABLE documents DROP CONSTRAINT IF EXISTS documents_document_type_check;
ALTER TABLE documents ADD CONSTRAINT documents_document_type_check
  CHECK (document_type IN (
    'export_license','phytosanitary','fumigation','organic_cert','insurance',
    'lab_result','customs_declaration','bill_of_lading','certificate_of_origin',
    'quality_cert','gacc_registration','haccp_cert','iso_cert','dds',
    'due_diligence_statement','packing_list','commercial_invoice','other'
  ));

-- ============================================
-- CORE TABLES
-- ============================================

CREATE TABLE IF NOT EXISTS document_alerts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  alert_type TEXT NOT NULL CHECK (alert_type IN ('expiry_30d','expiry_7d','expired')),
  triggered_at TIMESTAMPTZ DEFAULT NOW(),
  acknowledged_by UUID REFERENCES auth.users(id),
  acknowledged_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_document_alerts_org_id ON document_alerts(org_id);

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
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  buyer_org_id UUID NOT NULL REFERENCES buyer_organizations(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  role TEXT DEFAULT 'buyer_admin' CHECK (role IN ('buyer_admin','buyer_viewer')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS supply_chain_links (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  buyer_org_id UUID NOT NULL REFERENCES buyer_organizations(id) ON DELETE CASCADE,
  exporter_org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending','active','suspended','terminated')),
  invited_at TIMESTAMPTZ DEFAULT NOW(),
  accepted_at TIMESTAMPTZ,
  invited_by UUID REFERENCES auth.users(id),
  UNIQUE(buyer_org_id, exporter_org_id)
);
CREATE INDEX IF NOT EXISTS idx_supply_chain_links_buyer ON supply_chain_links(buyer_org_id);
CREATE INDEX IF NOT EXISTS idx_supply_chain_links_exporter ON supply_chain_links(exporter_org_id);

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
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft','active','fulfilled','cancelled')),
  price_per_unit DECIMAL(12,2),
  currency TEXT DEFAULT 'USD',
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_contracts_buyer ON contracts(buyer_org_id);
CREATE INDEX IF NOT EXISTS idx_contracts_exporter ON contracts(exporter_org_id);

CREATE TABLE IF NOT EXISTS contract_shipments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  contract_id UUID NOT NULL REFERENCES contracts(id) ON DELETE CASCADE,
  shipment_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(contract_id, shipment_id)
);

CREATE TABLE IF NOT EXISTS compliance_profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  destination_market TEXT NOT NULL,
  regulation_framework TEXT NOT NULL,
  required_documents JSONB DEFAULT '[]',
  required_certifications JSONB DEFAULT '[]',
  geo_verification_level TEXT DEFAULT 'polygon',
  min_traceability_depth INTEGER DEFAULT 1,
  custom_rules JSONB DEFAULT '{}',
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_compliance_profiles_org ON compliance_profiles(org_id);

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
  pedigree_verified BOOLEAN DEFAULT true,
  verification_notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(org_id, pedigree_code)
);

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
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft','active','revoked')),
  issued_at TIMESTAMPTZ,
  valid_until DATE,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_dpp_org ON digital_product_passports(org_id);
CREATE INDEX IF NOT EXISTS idx_dpp_code ON digital_product_passports(dpp_code);
CREATE INDEX IF NOT EXISTS idx_dpp_finished_good ON digital_product_passports(finished_good_id);

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
  status TEXT DEFAULT 'active' CHECK (status IN ('active','revoked')),
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_api_keys_org ON api_keys(org_id);
CREATE INDEX IF NOT EXISTS idx_api_keys_prefix ON api_keys(key_prefix);

CREATE TABLE IF NOT EXISTS api_rate_limits (
  key_prefix TEXT NOT NULL PRIMARY KEY,
  request_count INTEGER NOT NULL DEFAULT 1,
  window_start TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  window_end TIMESTAMPTZ NOT NULL
);

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
CREATE INDEX IF NOT EXISTS idx_audit_events_org ON audit_events(org_id);
CREATE INDEX IF NOT EXISTS idx_audit_events_action ON audit_events(action);
CREATE INDEX IF NOT EXISTS idx_audit_events_created ON audit_events(created_at DESC);

CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  resource_type TEXT,
  resource_id TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS webhook_endpoints (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  secret TEXT NOT NULL,
  events TEXT[] NOT NULL DEFAULT '{}',
  status TEXT DEFAULT 'active' CHECK (status IN ('active','paused','disabled')),
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS webhook_deliveries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  webhook_id UUID NOT NULL REFERENCES webhook_endpoints(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}',
  response_status INTEGER,
  response_body TEXT,
  attempts INTEGER DEFAULT 0,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending','delivered','failed')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_webhook ON webhook_deliveries(webhook_id);

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
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_org ON notifications(org_id);

CREATE TABLE IF NOT EXISTS farmer_accounts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  farm_id UUID REFERENCES farms(id) ON DELETE SET NULL,
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  phone TEXT NOT NULL,
  farmer_code TEXT,
  status TEXT DEFAULT 'invited' CHECK (status IN ('invited','active','suspended')),
  pin_hash TEXT,
  invite_token TEXT UNIQUE,
  preferred_locale TEXT DEFAULT 'en',
  verified_at TIMESTAMPTZ,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_farmer_accounts_phone ON farmer_accounts(phone);
CREATE INDEX IF NOT EXISTS idx_farmer_accounts_farm ON farmer_accounts(farm_id);
CREATE INDEX IF NOT EXISTS idx_farmer_accounts_org ON farmer_accounts(org_id);

CREATE TABLE IF NOT EXISTS farmer_training (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  farmer_account_id UUID REFERENCES farmer_accounts(id) ON DELETE CASCADE,
  farm_id UUID REFERENCES farms(id) ON DELETE SET NULL,
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  module_name TEXT NOT NULL,
  module_type TEXT NOT NULL CHECK (module_type IN ('gap','safety','sustainability','organic','child_labor','eudr_awareness')),
  status TEXT DEFAULT 'not_started' CHECK (status IN ('not_started','in_progress','completed')),
  completed_at TIMESTAMPTZ,
  score DECIMAL,
  certificate_url TEXT,
  assigned_by UUID,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_farmer_training_farmer ON farmer_training(farmer_account_id);
CREATE INDEX IF NOT EXISTS idx_farmer_training_org ON farmer_training(org_id);

CREATE TABLE IF NOT EXISTS farmer_inputs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  farm_id UUID NOT NULL REFERENCES farms(id) ON DELETE CASCADE,
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  input_type TEXT NOT NULL CHECK (input_type IN ('fertilizer','pesticide','herbicide','seed','organic_amendment')),
  product_name TEXT,
  quantity DECIMAL,
  unit TEXT CHECK (unit IN ('kg','liters','bags','units')),
  application_date DATE,
  area_applied_hectares DECIMAL,
  notes TEXT,
  recorded_by UUID,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_farmer_inputs_farm ON farmer_inputs(farm_id);

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
  compliance_status TEXT DEFAULT 'pending' CHECK (compliance_status IN ('pending','verified','flagged')),
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
  status TEXT DEFAULT 'open' CHECK (status IN ('open','closed','awarded','cancelled')),
  visibility TEXT DEFAULT 'public' CHECK (visibility IN ('public','invited')),
  invited_orgs UUID[] DEFAULT '{}',
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  closes_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_tenders_buyer_org ON tenders(buyer_org_id);
CREATE INDEX IF NOT EXISTS idx_tenders_status ON tenders(status);

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
  status TEXT DEFAULT 'submitted' CHECK (status IN ('submitted','shortlisted','awarded','rejected','withdrawn')),
  submitted_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_tender_bids_tender ON tender_bids(tender_id);
CREATE INDEX IF NOT EXISTS idx_tender_bids_exporter ON tender_bids(exporter_org_id);

CREATE TABLE IF NOT EXISTS batch_contributions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  batch_id UUID NOT NULL REFERENCES collection_batches(id) ON DELETE CASCADE,
  farm_id UUID NOT NULL REFERENCES farms(id) ON DELETE CASCADE,
  farmer_name TEXT,
  weight_kg NUMERIC(12,2) DEFAULT 0,
  bag_count INTEGER DEFAULT 0,
  compliance_status TEXT DEFAULT 'pending' CHECK (compliance_status IN ('pending','verified','rejected')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_batch_contributions_batch ON batch_contributions(batch_id);
CREATE INDEX IF NOT EXISTS idx_batch_contributions_farm ON batch_contributions(farm_id);

CREATE TABLE IF NOT EXISTS farm_certifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  farm_id UUID NOT NULL REFERENCES farms(id) ON DELETE CASCADE,
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  certification_body TEXT NOT NULL,
  certificate_number TEXT,
  issued_date DATE,
  expiry_date DATE,
  status TEXT DEFAULT 'active' CHECK (status IN ('active','expired','revoked','pending')),
  verification_url TEXT,
  verified_by UUID,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_farm_certifications_farm ON farm_certifications(farm_id);

CREATE TABLE IF NOT EXISTS shipment_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  shipment_id UUID NOT NULL REFERENCES shipments(id) ON DELETE CASCADE,
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  item_type TEXT NOT NULL CHECK (item_type IN ('batch','finished_good','lot')),
  batch_id UUID,
  finished_good_id UUID,
  weight_kg NUMERIC(12,2) DEFAULT 0,
  farm_count INTEGER DEFAULT 0,
  traceability_complete BOOLEAN DEFAULT false,
  compliance_status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_shipment_items_shipment ON shipment_items(shipment_id);

CREATE TABLE IF NOT EXISTS shipment_lots (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  shipment_id UUID NOT NULL REFERENCES shipments(id) ON DELETE CASCADE,
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  lot_number TEXT NOT NULL,
  weight_kg NUMERIC(12,2),
  mass_balance_valid BOOLEAN DEFAULT false,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_shipment_lots_shipment ON shipment_lots(shipment_id);

CREATE TABLE IF NOT EXISTS shipment_lot_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lot_id UUID NOT NULL REFERENCES shipment_lots(id) ON DELETE CASCADE,
  shipment_item_id UUID REFERENCES shipment_items(id) ON DELETE SET NULL,
  batch_id UUID REFERENCES collection_batches(id) ON DELETE SET NULL,
  weight_kg NUMERIC(12,2) DEFAULT 0,
  bag_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS shipment_outcomes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  shipment_id UUID REFERENCES shipments(id),
  outcome TEXT NOT NULL CHECK (outcome IN ('accepted','rejected','conditional','withdrawn')),
  reason TEXT,
  destination_country TEXT,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_shipment_outcomes_org ON shipment_outcomes(org_id);
CREATE INDEX IF NOT EXISTS idx_shipment_outcomes_shipment ON shipment_outcomes(shipment_id);

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
CREATE INDEX IF NOT EXISTS idx_cold_chain_logs_shipment ON cold_chain_logs(shipment_id);
CREATE INDEX IF NOT EXISTS idx_cold_chain_logs_org ON cold_chain_logs(org_id);

CREATE TABLE IF NOT EXISTS delegations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  delegated_to UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  delegated_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  permission TEXT NOT NULL CHECK (permission IN ('conflict_resolution','compliance_review')),
  region_scope JSONB,
  is_active BOOLEAN DEFAULT true,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS delegation_audit_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  delegation_id UUID NOT NULL REFERENCES delegations(id) ON DELETE CASCADE,
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  actor_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  details JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS system_config (
  key VARCHAR(100) PRIMARY KEY,
  value JSONB NOT NULL DEFAULT '{}',
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  updated_by UUID
);

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

CREATE TABLE IF NOT EXISTS tenant_health_metrics (
  org_id UUID PRIMARY KEY REFERENCES organizations(id) ON DELETE CASCADE,
  org_name TEXT,
  subscription_tier TEXT,
  total_users INTEGER DEFAULT 0,
  total_farms INTEGER DEFAULT 0,
  total_batches INTEGER DEFAULT 0,
  total_weight_kg NUMERIC(14,2) DEFAULT 0,
  last_collection_date TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

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

INSERT INTO recovery_standards (commodity, product_type, standard_recovery_rate, tolerance_percent, notes) VALUES
  ('cocoa','cocoa_butter',41.6,5.0,'Standard butter extraction from dried beans'),
  ('cocoa','cocoa_powder',22.0,5.0,'Standard powder yield after butter extraction'),
  ('cocoa','cocoa_liquor',82.0,5.0,'Liquor from roasted nibs'),
  ('cocoa','cocoa_nibs',87.0,5.0,'Nibs from shelled beans'),
  ('cashew','cashew_kernel',25.0,5.0,'Raw kernel extraction rate'),
  ('ginger','ginger_powder',15.0,5.0,'Dried powder from fresh ginger'),
  ('palm_kernel','palm_kernel_oil',45.0,5.0,'Oil extraction from palm kernels')
ON CONFLICT (commodity, product_type) DO NOTHING;

-- Seed Hibiscus and Turmeric commodity master entries (old schema)
INSERT INTO commodity_master (name, code, is_global, is_active, category, unit)
VALUES
  ('Hibiscus','HIBISCUS',true,true,'flower_crop','kg'),
  ('Turmeric','TURMERIC',true,true,'root_crop','kg')
ON CONFLICT DO NOTHING;

-- ============================================
-- ROW LEVEL SECURITY (enable on new tables)
-- ============================================

ALTER TABLE document_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE buyer_organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE buyer_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE supply_chain_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE contract_shipments ENABLE ROW LEVEL SECURITY;
ALTER TABLE compliance_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE processing_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE processing_run_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE finished_goods ENABLE ROW LEVEL SECURITY;
ALTER TABLE digital_product_passports ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhook_endpoints ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhook_deliveries ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE farmer_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE farmer_training ENABLE ROW LEVEL SECURITY;
ALTER TABLE farmer_inputs ENABLE ROW LEVEL SECURITY;
ALTER TABLE farmer_performance_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE yield_predictions ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenders ENABLE ROW LEVEL SECURITY;
ALTER TABLE tender_bids ENABLE ROW LEVEL SECURITY;
ALTER TABLE batch_contributions ENABLE ROW LEVEL SECURITY;
ALTER TABLE farm_certifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE shipment_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE shipment_lots ENABLE ROW LEVEL SECURITY;
ALTER TABLE shipment_lot_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE shipment_outcomes ENABLE ROW LEVEL SECURITY;
ALTER TABLE cold_chain_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE delegations ENABLE ROW LEVEL SECURITY;
ALTER TABLE delegation_audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_health_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE recovery_standards ENABLE ROW LEVEL SECURITY;

-- ============================================
-- RLS POLICIES (CREATE OR REPLACE not supported on policies;
-- use DROP IF EXISTS + CREATE)
-- ============================================

-- documents
DROP POLICY IF EXISTS "Users can view documents in their org" ON documents;
CREATE POLICY "Users can view documents in their org" ON documents FOR SELECT USING (org_id = get_user_org_id() OR is_system_admin());
DROP POLICY IF EXISTS "Users can create documents in their org" ON documents;
CREATE POLICY "Users can create documents in their org" ON documents FOR INSERT WITH CHECK (org_id = get_user_org_id());
DROP POLICY IF EXISTS "Users can update documents in their org" ON documents;
CREATE POLICY "Users can update documents in their org" ON documents FOR UPDATE USING (org_id = get_user_org_id());

-- payments
DROP POLICY IF EXISTS "Users can view payments in their org" ON payments;
CREATE POLICY "Users can view payments in their org" ON payments FOR SELECT USING (org_id = get_user_org_id() OR is_system_admin());
DROP POLICY IF EXISTS "Users can create payments in their org" ON payments;
CREATE POLICY "Users can create payments in their org" ON payments FOR INSERT WITH CHECK (org_id = get_user_org_id());

-- notifications
DROP POLICY IF EXISTS "Users can view their own notifications" ON notifications;
CREATE POLICY "Users can view their own notifications" ON notifications FOR SELECT USING (user_id = auth.uid() OR is_system_admin());
DROP POLICY IF EXISTS "Users can update their own notifications" ON notifications;
CREATE POLICY "Users can update their own notifications" ON notifications FOR UPDATE USING (user_id = auth.uid());
DROP POLICY IF EXISTS "System can insert notifications" ON notifications;
CREATE POLICY "System can insert notifications" ON notifications FOR INSERT WITH CHECK (true);

-- farmer_performance_ledger
DROP POLICY IF EXISTS "org_access_farmer_performance_ledger" ON farmer_performance_ledger;
CREATE POLICY "org_access_farmer_performance_ledger" ON farmer_performance_ledger FOR ALL USING (org_id = get_user_org_id());

-- yield_predictions
DROP POLICY IF EXISTS "org_yield_predictions" ON yield_predictions;
CREATE POLICY "org_yield_predictions" ON yield_predictions FOR ALL USING (org_id = get_user_org_id());

-- shipment_outcomes
DROP POLICY IF EXISTS "org_access_shipment_outcomes" ON shipment_outcomes;
CREATE POLICY "org_access_shipment_outcomes" ON shipment_outcomes FOR ALL USING (org_id = get_user_org_id());

-- cold_chain_logs
DROP POLICY IF EXISTS "org_access_cold_chain_logs" ON cold_chain_logs;
CREATE POLICY "org_access_cold_chain_logs" ON cold_chain_logs FOR ALL USING (org_id = get_user_org_id());

-- compliance_profiles
DROP POLICY IF EXISTS "Users can view compliance profiles in their org" ON compliance_profiles;
CREATE POLICY "Users can view compliance profiles in their org" ON compliance_profiles FOR SELECT USING (org_id = get_user_org_id() OR is_system_admin());
DROP POLICY IF EXISTS "Admins can manage compliance profiles" ON compliance_profiles;
CREATE POLICY "Admins can manage compliance profiles" ON compliance_profiles FOR ALL USING (org_id = get_user_org_id());

-- processing_runs
DROP POLICY IF EXISTS "Users can view processing runs in their org" ON processing_runs;
CREATE POLICY "Users can view processing runs in their org" ON processing_runs FOR SELECT USING (org_id = get_user_org_id() OR is_system_admin());
DROP POLICY IF EXISTS "Admins can manage processing runs" ON processing_runs;
CREATE POLICY "Admins can manage processing runs" ON processing_runs FOR ALL USING (org_id = get_user_org_id());

-- processing_run_batches
DROP POLICY IF EXISTS "Users can view processing run batches" ON processing_run_batches;
CREATE POLICY "Users can view processing run batches" ON processing_run_batches FOR SELECT USING (EXISTS (SELECT 1 FROM processing_runs pr WHERE pr.id = processing_run_id AND pr.org_id = get_user_org_id()) OR is_system_admin());

-- finished_goods
DROP POLICY IF EXISTS "Users can view finished goods in their org" ON finished_goods;
CREATE POLICY "Users can view finished goods in their org" ON finished_goods FOR SELECT USING (org_id = get_user_org_id() OR is_system_admin());
DROP POLICY IF EXISTS "Admins can manage finished goods" ON finished_goods;
CREATE POLICY "Admins can manage finished goods" ON finished_goods FOR ALL USING (org_id = get_user_org_id());

-- digital_product_passports
DROP POLICY IF EXISTS "Users can view DPPs in their org" ON digital_product_passports;
CREATE POLICY "Users can view DPPs in their org" ON digital_product_passports FOR SELECT USING (org_id = get_user_org_id() OR is_system_admin());
DROP POLICY IF EXISTS "Admins can manage DPPs" ON digital_product_passports;
CREATE POLICY "Admins can manage DPPs" ON digital_product_passports FOR ALL USING (org_id = get_user_org_id());
DROP POLICY IF EXISTS "Public can view active DPPs" ON digital_product_passports;
CREATE POLICY "Public can view active DPPs" ON digital_product_passports FOR SELECT USING (status = 'active');

-- api_keys
DROP POLICY IF EXISTS "Admins can manage API keys" ON api_keys;
CREATE POLICY "Admins can manage API keys" ON api_keys FOR ALL USING (org_id = get_user_org_id());

-- audit_events
DROP POLICY IF EXISTS "Org members can view audit events" ON audit_events;
CREATE POLICY "Org members can view audit events" ON audit_events FOR SELECT USING (org_id IN (SELECT org_id FROM profiles WHERE user_id = auth.uid()));

-- audit_logs
DROP POLICY IF EXISTS "System can insert audit logs" ON audit_logs;
CREATE POLICY "System can insert audit logs" ON audit_logs FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "System admins can view audit logs" ON audit_logs;
CREATE POLICY "System admins can view audit logs" ON audit_logs FOR SELECT USING (is_system_admin());

-- webhook_endpoints
DROP POLICY IF EXISTS "Org admins can manage webhooks" ON webhook_endpoints;
CREATE POLICY "Org admins can manage webhooks" ON webhook_endpoints FOR ALL USING (org_id IN (SELECT org_id FROM profiles WHERE user_id = auth.uid()));

-- farmer_accounts
DROP POLICY IF EXISTS "Farmers can view own account" ON farmer_accounts;
CREATE POLICY "Farmers can view own account" ON farmer_accounts FOR SELECT USING (user_id = auth.uid());
DROP POLICY IF EXISTS "Org members can view farmer accounts" ON farmer_accounts;
CREATE POLICY "Org members can view farmer accounts" ON farmer_accounts FOR SELECT USING (org_id IN (SELECT org_id FROM profiles WHERE user_id = auth.uid()));

-- farmer_training
DROP POLICY IF EXISTS "Org members can manage training" ON farmer_training;
CREATE POLICY "Org members can manage training" ON farmer_training FOR ALL USING (org_id IN (SELECT org_id FROM profiles WHERE user_id = auth.uid()));

-- farmer_inputs
DROP POLICY IF EXISTS "Org members can manage inputs" ON farmer_inputs;
CREATE POLICY "Org members can manage inputs" ON farmer_inputs FOR ALL USING (org_id IN (SELECT org_id FROM profiles WHERE user_id = auth.uid()));

-- buyer_organizations
DROP POLICY IF EXISTS "Buyer users can view their own org" ON buyer_organizations;
CREATE POLICY "Buyer users can view their own org" ON buyer_organizations FOR SELECT USING (EXISTS (SELECT 1 FROM buyer_profiles WHERE user_id = auth.uid() AND buyer_org_id = buyer_organizations.id) OR is_system_admin());

-- buyer_profiles
DROP POLICY IF EXISTS "Buyer users can view their own profile" ON buyer_profiles;
CREATE POLICY "Buyer users can view their own profile" ON buyer_profiles FOR SELECT USING (user_id = auth.uid() OR is_system_admin());

-- supply_chain_links
DROP POLICY IF EXISTS "Linked parties can view supply chain links" ON supply_chain_links;
CREATE POLICY "Linked parties can view supply chain links" ON supply_chain_links FOR SELECT USING (exporter_org_id = get_user_org_id() OR EXISTS (SELECT 1 FROM buyer_profiles WHERE user_id = auth.uid() AND buyer_org_id = supply_chain_links.buyer_org_id) OR is_system_admin());

-- contracts
DROP POLICY IF EXISTS "Linked parties can view contracts" ON contracts;
CREATE POLICY "Linked parties can view contracts" ON contracts FOR SELECT USING (exporter_org_id = get_user_org_id() OR EXISTS (SELECT 1 FROM buyer_profiles WHERE user_id = auth.uid() AND buyer_org_id = contracts.buyer_org_id) OR is_system_admin());

-- tenders
DROP POLICY IF EXISTS "Exporters can view public tenders" ON tenders;
CREATE POLICY "Exporters can view public tenders" ON tenders FOR SELECT USING ((visibility = 'public' AND status = 'open') OR (visibility = 'invited' AND get_user_org_id() = ANY(invited_orgs)) OR EXISTS (SELECT 1 FROM buyer_profiles WHERE user_id = auth.uid() AND buyer_org_id = tenders.buyer_org_id) OR is_system_admin());

-- tender_bids
DROP POLICY IF EXISTS "Exporters can manage their own bids" ON tender_bids;
CREATE POLICY "Exporters can manage their own bids" ON tender_bids FOR ALL USING (exporter_org_id = get_user_org_id() OR is_system_admin());

-- batch_contributions
DROP POLICY IF EXISTS "Users can view batch contributions in their org" ON batch_contributions;
CREATE POLICY "Users can view batch contributions in their org" ON batch_contributions FOR SELECT USING (EXISTS (SELECT 1 FROM collection_batches cb WHERE cb.id = batch_contributions.batch_id AND cb.org_id = get_user_org_id()) OR is_system_admin());
DROP POLICY IF EXISTS "Authorized users can manage batch contributions" ON batch_contributions;
CREATE POLICY "Authorized users can manage batch contributions" ON batch_contributions FOR ALL USING (EXISTS (SELECT 1 FROM collection_batches cb WHERE cb.id = batch_contributions.batch_id AND cb.org_id = get_user_org_id()));

-- farm_certifications
DROP POLICY IF EXISTS "Org members can manage certifications" ON farm_certifications;
CREATE POLICY "Org members can manage certifications" ON farm_certifications FOR ALL USING (org_id IN (SELECT org_id FROM profiles WHERE user_id = auth.uid()));

-- shipment_items
DROP POLICY IF EXISTS "Users can view shipment items" ON shipment_items;
CREATE POLICY "Users can view shipment items" ON shipment_items FOR SELECT USING (EXISTS (SELECT 1 FROM shipments s WHERE s.id = shipment_items.shipment_id AND s.org_id = get_user_org_id()) OR is_system_admin());

-- shipment_lots
DROP POLICY IF EXISTS "Users can view shipment lots" ON shipment_lots;
CREATE POLICY "Users can view shipment lots" ON shipment_lots FOR SELECT USING (org_id = get_user_org_id() OR is_system_admin());

-- shipment_lot_items
DROP POLICY IF EXISTS "Users can view shipment lot items" ON shipment_lot_items;
CREATE POLICY "Users can view shipment lot items" ON shipment_lot_items FOR SELECT USING (EXISTS (SELECT 1 FROM shipment_lots sl WHERE sl.id = shipment_lot_items.lot_id AND sl.org_id = get_user_org_id()) OR is_system_admin());

-- delegations
DROP POLICY IF EXISTS "Users can view delegations in their org" ON delegations;
CREATE POLICY "Users can view delegations in their org" ON delegations FOR SELECT USING (org_id = get_user_org_id() OR is_system_admin());
DROP POLICY IF EXISTS "Admins can manage delegations" ON delegations;
CREATE POLICY "Admins can manage delegations" ON delegations FOR ALL USING (org_id = get_user_org_id());

-- delegation_audit_log
DROP POLICY IF EXISTS "Users can view delegation audit log" ON delegation_audit_log;
CREATE POLICY "Users can view delegation audit log" ON delegation_audit_log FOR SELECT USING (org_id = get_user_org_id() OR is_system_admin());
DROP POLICY IF EXISTS "System can insert delegation audit log" ON delegation_audit_log;
CREATE POLICY "System can insert delegation audit log" ON delegation_audit_log FOR INSERT WITH CHECK (true);

-- system_config
DROP POLICY IF EXISTS "system_config_service_role_only" ON system_config;
CREATE POLICY "system_config_service_role_only" ON system_config FOR ALL USING (auth.role() = 'service_role');

-- payment_links
DROP POLICY IF EXISTS "payment_links_service_only" ON payment_links;
CREATE POLICY "payment_links_service_only" ON payment_links USING (false);

-- tenant_health_metrics
DROP POLICY IF EXISTS "System admins can view tenant health metrics" ON tenant_health_metrics;
CREATE POLICY "System admins can view tenant health metrics" ON tenant_health_metrics FOR SELECT USING (is_system_admin());

-- recovery_standards
DROP POLICY IF EXISTS "Anyone can view recovery standards" ON recovery_standards;
CREATE POLICY "Anyone can view recovery standards" ON recovery_standards FOR SELECT USING (true);

-- ============================================
-- DONE
-- ============================================
