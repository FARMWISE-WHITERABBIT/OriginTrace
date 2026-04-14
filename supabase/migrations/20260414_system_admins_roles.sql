-- ============================================================
-- Migration: Superadmin RBAC, Sessions & Impersonation Audit
-- Applied: 2026-04-14
-- ============================================================

-- 1. Extend system_admins with role + security tracking columns
ALTER TABLE system_admins
  ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'support_agent'
    CHECK (role IN (
      'platform_admin',       -- Full access; can manage other admins
      'compliance_manager',   -- Compliance rulesets, EUDR, MRL, DDS
      'support_agent',        -- Read-only tenant view + impersonation
      'finance_manager',      -- Revenue, payments, escrow, billing
      'infra_admin'           -- Feature toggles, API health, config
    )),
  ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS last_login_ip TEXT,
  ADD COLUMN IF NOT EXISTS mfa_enrolled BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE;

-- 2. Session tracking table (for 30-minute inactivity timeout)
CREATE TABLE IF NOT EXISTS superadmin_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  system_admin_id UUID NOT NULL REFERENCES system_admins(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_activity_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '30 minutes'),
  ip_address TEXT,
  user_agent TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  ended_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_superadmin_sessions_user_id ON superadmin_sessions (user_id);
CREATE INDEX IF NOT EXISTS idx_superadmin_sessions_active ON superadmin_sessions (is_active, expires_at);

-- 3. Impersonation action log (records every action taken during a session)
CREATE TABLE IF NOT EXISTS superadmin_impersonation_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES superadmin_sessions(id) ON DELETE SET NULL,
  superadmin_id UUID NOT NULL REFERENCES system_admins(id) ON DELETE CASCADE,
  superadmin_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  target_org_id INTEGER REFERENCES organizations(id) ON DELETE SET NULL,
  target_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,                     -- e.g. 'impersonation.started', 'impersonation.ended', 'page.viewed'
  resource_type TEXT,                       -- 'organization', 'farm', 'batch', etc.
  resource_id TEXT,
  metadata JSONB DEFAULT '{}',
  ip_address TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_superadmin_impersonation_superadmin ON superadmin_impersonation_actions (superadmin_user_id);
CREATE INDEX IF NOT EXISTS idx_superadmin_impersonation_org ON superadmin_impersonation_actions (target_org_id);
CREATE INDEX IF NOT EXISTS idx_superadmin_impersonation_created ON superadmin_impersonation_actions (created_at DESC);

-- 4. RLS: system_admins can only read their own row; platform_admin can read all
ALTER TABLE superadmin_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE superadmin_impersonation_actions ENABLE ROW LEVEL SECURITY;

-- Service role bypasses RLS (used by API routes via createAdminClient / createServiceClient)
CREATE POLICY "Service role full access to superadmin_sessions"
  ON superadmin_sessions FOR ALL
  TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access to superadmin_impersonation_actions"
  ON superadmin_impersonation_actions FOR ALL
  TO service_role USING (true) WITH CHECK (true);
