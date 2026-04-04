-- ─── Superadmin Extended Features Migration ───────────────────────────────
-- Adds tables required for the expanded superadmin command tower:
--   1. Compliance Framework Management
--   2. Payment & Escrow Operations Dashboard
--   3. Compliance Submission Monitoring
--   4. Audit Infrastructure Management
--   5. Logistics Reference Data
--   6. Platform Intelligence
--   7. Security & Governance Upgrades

-- ─── 1. Compliance Framework Management ──────────────────────────────────

-- Compliance rulesets: editable per-market configuration
CREATE TABLE IF NOT EXISTS compliance_rulesets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  market TEXT NOT NULL CHECK (market IN ('EUDR', 'UK', 'US', 'GACC', 'UAE')),
  version INTEGER NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'draft', 'archived')),
  document_checklist JSONB NOT NULL DEFAULT '[]',
  required_fields JSONB NOT NULL DEFAULT '[]',
  submission_workflow JSONB NOT NULL DEFAULT '{}',
  notes TEXT,
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(market, version)
);

-- Regulatory update changelog
CREATE TABLE IF NOT EXISTS regulatory_update_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  market TEXT NOT NULL,
  change_type TEXT NOT NULL CHECK (change_type IN ('document_checklist', 'required_fields', 'submission_workflow', 'mrl_entry', 'hs_code', 'facility_sync', 'notes')),
  description TEXT NOT NULL,
  before_state JSONB,
  after_state JSONB,
  affected_orgs_notified BOOLEAN DEFAULT FALSE,
  notification_sent_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- HS code library
CREATE TABLE IF NOT EXISTS hs_code_library (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  commodity TEXT NOT NULL,
  hs_code TEXT NOT NULL,
  tariff_schedule TEXT NOT NULL CHECK (tariff_schedule IN ('EU', 'UK', 'US_HTS', 'CHINA_CCC', 'UAE')),
  description TEXT,
  notes TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(commodity, hs_code, tariff_schedule)
);

-- Approved facility list sync log
CREATE TABLE IF NOT EXISTS facility_list_sync_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  list_type TEXT NOT NULL CHECK (list_type IN ('EU_TRACES', 'USDA_FSIS', 'GACC')),
  status TEXT NOT NULL CHECK (status IN ('pending', 'running', 'success', 'failed')),
  records_fetched INTEGER,
  records_updated INTEGER,
  error_message TEXT,
  triggered_by UUID REFERENCES auth.users(id),
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- Broadcast alerts to tenants
CREATE TABLE IF NOT EXISTS regulatory_broadcast_alerts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  affected_markets TEXT[] NOT NULL,
  target_tier TEXT[] DEFAULT ARRAY['starter', 'basic', 'pro', 'enterprise'],
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'sent')),
  recipient_count INTEGER,
  sent_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── 2. Payment & Escrow Operations ──────────────────────────────────────

-- Payment provider status tracking
CREATE TABLE IF NOT EXISTS payment_provider_status (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  provider TEXT NOT NULL CHECK (provider IN ('paystack', 'blockradar', 'circle', 'mtn_momo', 'opay', 'palmpay')),
  status TEXT NOT NULL CHECK (status IN ('operational', 'degraded', 'down', 'unknown')),
  last_checked_at TIMESTAMPTZ DEFAULT NOW(),
  last_success_at TIMESTAMPTZ,
  error_message TEXT,
  UNIQUE(provider)
);

-- Escrow fee configuration per tier
CREATE TABLE IF NOT EXISTS escrow_fee_config (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tier TEXT NOT NULL CHECK (tier IN ('starter', 'basic', 'pro', 'enterprise')),
  escrow_fee_pct DECIMAL(5,4) NOT NULL DEFAULT 0.015,
  stablecoin_fee_pct DECIMAL(5,4) NOT NULL DEFAULT 0.010,
  audit_report_fee_ngn DECIMAL(10,2) NOT NULL DEFAULT 5000,
  updated_by UUID REFERENCES auth.users(id),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tier)
);

-- Tenant payout pause controls
CREATE TABLE IF NOT EXISTS payout_controls (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  is_paused BOOLEAN NOT NULL DEFAULT FALSE,
  pause_reason TEXT,
  paused_by UUID REFERENCES auth.users(id),
  paused_at TIMESTAMPTZ,
  resumed_by UUID REFERENCES auth.users(id),
  resumed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(org_id)
);

-- Seed default fee config
INSERT INTO escrow_fee_config (tier, escrow_fee_pct, stablecoin_fee_pct, audit_report_fee_ngn)
VALUES
  ('starter',    0.0150, 0.0120, 10000),
  ('basic',      0.0125, 0.0100, 7500),
  ('pro',        0.0100, 0.0080, 5000),
  ('enterprise', 0.0050, 0.0050, 2500)
ON CONFLICT (tier) DO NOTHING;

-- Seed default provider statuses
INSERT INTO payment_provider_status (provider, status)
VALUES
  ('paystack', 'unknown'),
  ('blockradar', 'unknown'),
  ('circle', 'unknown'),
  ('mtn_momo', 'unknown'),
  ('opay', 'unknown'),
  ('palmpay', 'unknown')
ON CONFLICT (provider) DO NOTHING;

-- ─── 3. Compliance Submission Monitoring ─────────────────────────────────

-- EU TRACES / FDA / IPAFFS submission health log
CREATE TABLE IF NOT EXISTS submission_health_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  framework TEXT NOT NULL CHECK (framework IN ('EU_TRACES', 'FDA_PRIOR_NOTICE', 'IPAFFS')),
  shipment_id UUID,
  status TEXT NOT NULL CHECK (status IN ('submitted', 'confirmed', 'failed', 'pending')),
  error_code TEXT,
  error_message TEXT,
  submitted_at TIMESTAMPTZ DEFAULT NOW()
);

-- API credential status per tenant per integration
CREATE TABLE IF NOT EXISTS api_credential_status (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  integration TEXT NOT NULL CHECK (integration IN ('EU_TRACES', 'FDA_PRIOR_NOTICE', 'IPAFFS', 'GACC')),
  is_configured BOOLEAN NOT NULL DEFAULT FALSE,
  last_validated_at TIMESTAMPTZ,
  validation_status TEXT CHECK (validation_status IN ('valid', 'invalid', 'unchecked')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(org_id, integration)
);

-- ─── 4. Audit Infrastructure Management ──────────────────────────────────

-- Auditor access sessions (time-limited portal links)
CREATE TABLE IF NOT EXISTS auditor_access_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  auditor_name TEXT NOT NULL,
  auditor_email TEXT NOT NULL,
  access_token TEXT NOT NULL UNIQUE,
  scope JSONB DEFAULT '{}',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  expires_at TIMESTAMPTZ NOT NULL,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_accessed_at TIMESTAMPTZ
);

-- Compliance badges registry
CREATE TABLE IF NOT EXISTS compliance_badges (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  framework TEXT NOT NULL,
  badge_type TEXT NOT NULL,
  public_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  data_health_score INTEGER CHECK (data_health_score BETWEEN 0 AND 100),
  last_validated_at TIMESTAMPTZ,
  issued_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Evidence package access log
CREATE TABLE IF NOT EXISTS evidence_package_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  shipment_id UUID,
  package_type TEXT NOT NULL CHECK (package_type IN ('border_detention', 'customs_hold', 'quality_dispute', 'audit_request')),
  generated_by UUID REFERENCES auth.users(id),
  accessed_by TEXT,
  accessed_at TIMESTAMPTZ,
  generated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── 5. Logistics Reference Data ─────────────────────────────────────────

-- Shipping lane reference data (port pairs)
CREATE TABLE IF NOT EXISTS shipping_lanes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  port_of_loading TEXT NOT NULL,
  port_of_loading_code TEXT NOT NULL,
  port_of_discharge TEXT NOT NULL,
  port_of_discharge_code TEXT NOT NULL,
  standard_transit_days INTEGER,
  freight_route TEXT,
  commodity TEXT,
  notes TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Notification templates
CREATE TABLE IF NOT EXISTS notification_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  template_key TEXT NOT NULL UNIQUE,
  channel TEXT NOT NULL CHECK (channel IN ('sms', 'email', 'in_app')),
  shipment_stage TEXT NOT NULL,
  subject TEXT,
  body TEXT NOT NULL,
  variables JSONB DEFAULT '[]',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  updated_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Stage gate configuration per compliance framework
CREATE TABLE IF NOT EXISTS stage_gate_config (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  framework TEXT NOT NULL CHECK (framework IN ('EUDR', 'UK', 'US', 'GACC', 'UAE', 'default')),
  stage_name TEXT NOT NULL,
  is_mandatory BOOLEAN NOT NULL DEFAULT FALSE,
  gate_action TEXT NOT NULL DEFAULT 'warn' CHECK (gate_action IN ('hard_block', 'warn', 'optional')),
  description TEXT,
  updated_by UUID REFERENCES auth.users(id),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(framework, stage_name)
);

-- Inspection bodies registry
CREATE TABLE IF NOT EXISTS inspection_bodies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  abbreviation TEXT,
  country TEXT NOT NULL,
  region TEXT,
  body_type TEXT NOT NULL CHECK (body_type IN ('government', 'private', 'international')),
  commodities TEXT[] DEFAULT ARRAY[]::TEXT[],
  accreditation TEXT,
  contact_info JSONB DEFAULT '{}',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed some common inspection bodies
INSERT INTO inspection_bodies (name, abbreviation, country, region, body_type, commodities)
VALUES
  ('Standards Organisation of Nigeria', 'SON', 'Nigeria', 'West Africa', 'government', ARRAY['all']),
  ('National Agency for Food & Drug Administration', 'NAFDAC', 'Nigeria', 'West Africa', 'government', ARRAY['food', 'agrochem']),
  ('National Agricultural Quarantine Service', 'NAQS', 'Nigeria', 'West Africa', 'government', ARRAY['cocoa', 'ginger', 'cashew', 'hibiscus']),
  ('Intertek Testing Services', 'Intertek', 'United Kingdom', 'Global', 'private', ARRAY['all']),
  ('Bureau Veritas', 'BV', 'France', 'Global', 'private', ARRAY['all']),
  ('SGS Nigeria', 'SGS', 'Switzerland', 'Global', 'private', ARRAY['all'])
ON CONFLICT DO NOTHING;

-- ─── 6. Security & Governance ─────────────────────────────────────────────

-- Superadmin sub-roles for access separation
CREATE TABLE IF NOT EXISTS superadmin_roles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'support_agent' CHECK (
    role IN ('platform_admin', 'compliance_manager', 'finance_manager', 'support_agent')
  ),
  granted_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Enhanced impersonation session log (records actions taken during session)
CREATE TABLE IF NOT EXISTS impersonation_session_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID NOT NULL,
  superadmin_id UUID NOT NULL REFERENCES auth.users(id),
  impersonated_org_id UUID REFERENCES organizations(id),
  impersonated_user_id UUID REFERENCES auth.users(id),
  event_type TEXT NOT NULL CHECK (event_type IN ('session_start', 'session_end', 'action_taken')),
  action_description TEXT,
  resource_type TEXT,
  resource_id TEXT,
  metadata JSONB DEFAULT '{}',
  ip_address INET,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Data export audit trail
CREATE TABLE IF NOT EXISTS data_export_audit (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  exported_by UUID NOT NULL REFERENCES auth.users(id),
  export_type TEXT NOT NULL,
  scope_description TEXT NOT NULL,
  record_count INTEGER,
  org_id UUID REFERENCES organizations(id),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tenant data deletion workflow
CREATE TABLE IF NOT EXISTS tenant_deletion_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID NOT NULL REFERENCES organizations(id),
  requested_by UUID REFERENCES auth.users(id),
  deletion_reason TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (
    status IN ('pending', 'in_review', 'approved', 'executing', 'completed', 'rejected')
  ),
  retention_obligations JSONB DEFAULT '{}',
  scheduled_deletion_date DATE,
  approved_by UUID REFERENCES auth.users(id),
  approved_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Indexes ──────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_submission_health_log_org ON submission_health_log(org_id);
CREATE INDEX IF NOT EXISTS idx_submission_health_log_framework ON submission_health_log(framework);
CREATE INDEX IF NOT EXISTS idx_submission_health_log_submitted_at ON submission_health_log(submitted_at DESC);
CREATE INDEX IF NOT EXISTS idx_auditor_access_sessions_org ON auditor_access_sessions(org_id);
CREATE INDEX IF NOT EXISTS idx_auditor_access_sessions_active ON auditor_access_sessions(is_active, expires_at);
CREATE INDEX IF NOT EXISTS idx_compliance_badges_org ON compliance_badges(org_id);
CREATE INDEX IF NOT EXISTS idx_shipping_lanes_ports ON shipping_lanes(port_of_loading_code, port_of_discharge_code);
CREATE INDEX IF NOT EXISTS idx_regulatory_update_log_market ON regulatory_update_log(market, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_impersonation_events_session ON impersonation_session_events(session_id);
CREATE INDEX IF NOT EXISTS idx_impersonation_events_superadmin ON impersonation_session_events(superadmin_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_evidence_package_log_org ON evidence_package_log(org_id);
CREATE INDEX IF NOT EXISTS idx_api_credential_status_org ON api_credential_status(org_id);
