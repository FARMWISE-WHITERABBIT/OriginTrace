-- OriginTrace Row Level Security Policies
-- IMPORTANT: Run this in the Supabase SQL Editor (Dashboard > SQL Editor)
-- The auth.uid() function is only available through Supabase's auth context.
--
-- These policies enforce multi-tenant isolation so that users can only
-- access data belonging to their own organization.

-- =============================================
-- ENABLE RLS ON ALL TENANT TABLES
-- =============================================

ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE farms ENABLE ROW LEVEL SECURITY;
ALTER TABLE collection_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE bags ENABLE ROW LEVEL SECURITY;
ALTER TABLE batch_contributions ENABLE ROW LEVEL SECURITY;
ALTER TABLE delegations ENABLE ROW LEVEL SECURITY;
ALTER TABLE delegation_audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE farm_conflicts ENABLE ROW LEVEL SECURITY;
ALTER TABLE finished_goods ENABLE ROW LEVEL SECURITY;
ALTER TABLE processing_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_sync_status ENABLE ROW LEVEL SECURITY;

-- =============================================
-- HELPER: Get user's org_id from their profile
-- =============================================

CREATE OR REPLACE FUNCTION public.get_user_org_id()
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT org_id FROM public.profiles WHERE user_id = auth.uid() LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.profiles WHERE user_id = auth.uid() LIMIT 1;
$$;

-- =============================================
-- ORGANIZATIONS
-- =============================================

CREATE POLICY "Users can view own organization"
  ON organizations FOR SELECT
  USING (id = public.get_user_org_id());

-- =============================================
-- PROFILES
-- =============================================

CREATE POLICY "Users can view profiles in their org"
  ON profiles FOR SELECT
  USING (org_id = public.get_user_org_id());

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (user_id = auth.uid());

-- =============================================
-- FARMS
-- =============================================

CREATE POLICY "Users can view farms in their org"
  ON farms FOR SELECT
  USING (org_id = public.get_user_org_id());

CREATE POLICY "Users can insert farms in their org"
  ON farms FOR INSERT
  WITH CHECK (org_id = public.get_user_org_id());

CREATE POLICY "Admins can update farms in their org"
  ON farms FOR UPDATE
  USING (org_id = public.get_user_org_id());

-- =============================================
-- COLLECTION BATCHES
-- =============================================

CREATE POLICY "Users can view batches in their org"
  ON collection_batches FOR SELECT
  USING (org_id = public.get_user_org_id());

CREATE POLICY "Users can insert batches in their org"
  ON collection_batches FOR INSERT
  WITH CHECK (org_id = public.get_user_org_id());

CREATE POLICY "Users can update batches in their org"
  ON collection_batches FOR UPDATE
  USING (org_id = public.get_user_org_id());

-- =============================================
-- BAGS
-- =============================================

CREATE POLICY "Users can view bags in their org"
  ON bags FOR SELECT
  USING (org_id = public.get_user_org_id());

CREATE POLICY "Users can insert bags in their org"
  ON bags FOR INSERT
  WITH CHECK (org_id = public.get_user_org_id());

CREATE POLICY "Users can update bags in their org"
  ON bags FOR UPDATE
  USING (org_id = public.get_user_org_id());

-- =============================================
-- BATCH CONTRIBUTIONS
-- =============================================

CREATE POLICY "Users can view contributions in their org"
  ON batch_contributions FOR SELECT
  USING (org_id = public.get_user_org_id());

CREATE POLICY "Users can insert contributions in their org"
  ON batch_contributions FOR INSERT
  WITH CHECK (org_id = public.get_user_org_id());

-- =============================================
-- DELEGATIONS
-- =============================================

CREATE POLICY "Users can view delegations in their org"
  ON delegations FOR SELECT
  USING (org_id = public.get_user_org_id());

CREATE POLICY "Admins can manage delegations in their org"
  ON delegations FOR INSERT
  WITH CHECK (org_id = public.get_user_org_id() AND public.get_user_role() = 'admin');

CREATE POLICY "Admins can update delegations in their org"
  ON delegations FOR UPDATE
  USING (org_id = public.get_user_org_id() AND public.get_user_role() = 'admin');

-- =============================================
-- DELEGATION AUDIT LOG
-- =============================================

CREATE POLICY "Users can view delegation logs in their org"
  ON delegation_audit_log FOR SELECT
  USING (org_id = public.get_user_org_id());

CREATE POLICY "Users can insert delegation logs"
  ON delegation_audit_log FOR INSERT
  WITH CHECK (org_id = public.get_user_org_id());

-- =============================================
-- FARM CONFLICTS
-- =============================================

CREATE POLICY "Users can view conflicts in their org"
  ON farm_conflicts FOR SELECT
  USING (org_id = public.get_user_org_id());

CREATE POLICY "Admins can update conflicts in their org"
  ON farm_conflicts FOR UPDATE
  USING (org_id = public.get_user_org_id());

-- =============================================
-- FINISHED GOODS
-- =============================================

CREATE POLICY "Users can view finished goods in their org"
  ON finished_goods FOR SELECT
  USING (org_id = public.get_user_org_id());

CREATE POLICY "Admins can manage finished goods"
  ON finished_goods FOR INSERT
  WITH CHECK (org_id = public.get_user_org_id());

CREATE POLICY "Admins can update finished goods"
  ON finished_goods FOR UPDATE
  USING (org_id = public.get_user_org_id());

-- =============================================
-- PROCESSING RUNS
-- =============================================

CREATE POLICY "Users can view processing runs in their org"
  ON processing_runs FOR SELECT
  USING (org_id = public.get_user_org_id());

CREATE POLICY "Admins can manage processing runs"
  ON processing_runs FOR INSERT
  WITH CHECK (org_id = public.get_user_org_id());

CREATE POLICY "Admins can update processing runs"
  ON processing_runs FOR UPDATE
  USING (org_id = public.get_user_org_id());

-- =============================================
-- AGENT SYNC STATUS
-- =============================================

CREATE POLICY "Users can view sync status in their org"
  ON agent_sync_status FOR SELECT
  USING (org_id = public.get_user_org_id());

CREATE POLICY "Agents can upsert own sync status"
  ON agent_sync_status FOR INSERT
  WITH CHECK (org_id = public.get_user_org_id());

CREATE POLICY "Agents can update own sync status"
  ON agent_sync_status FOR UPDATE
  USING (org_id = public.get_user_org_id());

-- =============================================
-- NOTE: Service role key (used by API routes) bypasses ALL RLS.
-- These policies only apply to client-side Supabase access
-- using the anon key or user JWT tokens.
-- =============================================
