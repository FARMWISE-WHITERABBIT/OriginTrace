-- ============================================================
-- Missing FK Indexes
-- Adds indexes on foreign key columns that were not indexed,
-- to avoid sequential scans on FK lookups.
-- ============================================================

-- org_kyc_records.reviewed_by → auth.users
CREATE INDEX IF NOT EXISTS idx_org_kyc_records_reviewed_by
  ON public.org_kyc_records(reviewed_by);

-- farmer_bank_accounts.created_by → auth.users
CREATE INDEX IF NOT EXISTS idx_farmer_bank_accounts_created_by
  ON public.farmer_bank_accounts(created_by);

-- shipment_outcomes.recorded_by → auth.users
CREATE INDEX IF NOT EXISTS idx_shipment_outcomes_recorded_by
  ON public.shipment_outcomes(recorded_by);

-- system_admins.created_by → auth.users
CREATE INDEX IF NOT EXISTS idx_system_admins_created_by
  ON public.system_admins(created_by);

-- escrow_accounts: buyer_org_id index already created in 20260403_escrow_foundations.sql
-- (idx_escrow_accounts_buyer). No duplicate needed.
-- escrow_accounts has no separate exporter_org_id column; the exporter is identified
-- via the base org_id column which is already indexed (idx_escrow_accounts_org).

-- ============================================================
-- Superadmin Session / Impersonation User-Facing RLS Policies
-- (DB-7) Complements the service_role policies added in
-- 20260414_system_admins_roles.sql
-- ============================================================

-- Allow superadmins to read their own sessions
DROP POLICY IF EXISTS "superadmins_read_own_sessions" ON public.superadmin_sessions;
CREATE POLICY "superadmins_read_own_sessions"
  ON public.superadmin_sessions
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Allow superadmins to read the impersonation audit log for actions they performed
DROP POLICY IF EXISTS "superadmins_read_own_impersonation_actions" ON public.superadmin_impersonation_actions;
CREATE POLICY "superadmins_read_own_impersonation_actions"
  ON public.superadmin_impersonation_actions
  FOR SELECT
  TO authenticated
  USING (superadmin_user_id = auth.uid());
