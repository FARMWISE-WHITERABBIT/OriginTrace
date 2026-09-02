-- ============================================================
-- Migration: 20260508_enforce_rls
-- Purpose: Enforce Row Level Security (RLS) on tables missing it.
-- This ensures "Secure by Default" principles are applied everywhere.
-- ============================================================

-- 1. events
ALTER TABLE events ENABLE ROW LEVEL SECURITY;

-- 2. event_registrations
ALTER TABLE event_registrations ENABLE ROW LEVEL SECURITY;

-- 3. lead_nurture_jobs
ALTER TABLE lead_nurture_jobs ENABLE ROW LEVEL SECURITY;

-- 4. farm_conflicts
ALTER TABLE farm_conflicts ENABLE ROW LEVEL SECURITY;

-- RLS Policies for farm_conflicts
CREATE POLICY "Users can view their org farm conflicts"
  ON farm_conflicts FOR SELECT 
  USING (org_id = get_user_org_id() OR is_system_admin());

CREATE POLICY "Admins can resolve farm conflicts"
  ON farm_conflicts FOR UPDATE 
  USING (
    org_id = get_user_org_id() AND 
    EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role IN ('admin', 'compliance_officer'))
  );
