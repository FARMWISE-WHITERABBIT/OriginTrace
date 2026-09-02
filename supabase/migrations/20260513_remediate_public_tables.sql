-- ============================================================
-- Migration: 20260513_remediate_public_tables
-- Purpose: Remediate "rls_disabled_in_public" critical security alert.
-- ============================================================

-- 1. Enable RLS on core application tables (idempotent)
ALTER TABLE IF EXISTS events ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS event_registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS lead_nurture_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS sync_conflicts ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS tenant_health_metrics ENABLE ROW LEVEL SECURITY;

-- 2. Define Policies for Events (Public Read, Admin Write)
DROP POLICY IF EXISTS "Public can view events" ON events;
CREATE POLICY "Public can view events" ON events FOR SELECT USING (true);

DROP POLICY IF EXISTS "System admins manage events" ON events;
CREATE POLICY "System admins manage events" ON events FOR ALL TO authenticated 
USING (is_system_admin()) WITH CHECK (is_system_admin());

-- 3. Define Policies for Event Registrations (Public Insert, Admin Read)
DROP POLICY IF EXISTS "Public can register for events" ON event_registrations;
CREATE POLICY "Public can register for events" ON event_registrations FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "System admins view registrations" ON event_registrations;
CREATE POLICY "System admins view registrations" ON event_registrations FOR SELECT TO authenticated 
USING (is_system_admin());

-- 4. Define Policies for Lead Nurture Jobs (Public Insert, Admin Read)
DROP POLICY IF EXISTS "Public can submit leads" ON lead_nurture_jobs;
CREATE POLICY "Public can submit leads" ON lead_nurture_jobs FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "System admins view leads" ON lead_nurture_jobs;
CREATE POLICY "System admins view leads" ON lead_nurture_jobs FOR SELECT TO authenticated 
USING (is_system_admin());

-- 5. Force RLS on any remaining tables (except PostGIS system tables)
DO $$
DECLARE
    t text;
BEGIN
    FOR t IN 
        SELECT tablename 
        FROM pg_tables 
        WHERE schemaname = 'public' 
        AND tablename NOT IN ('spatial_ref_sys', 'geography_columns', 'geometry_columns', 'raster_columns', 'raster_overviews')
        AND rowsecurity = false
    LOOP
        EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
        RAISE NOTICE 'Enabled RLS on table: %', t;
    END LOOP;
END $$;
