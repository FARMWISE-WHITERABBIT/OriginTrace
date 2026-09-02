-- ============================================================
-- Migration: fix_compliance_profile_framework_constraint
-- Expands the regulation_framework CHECK constraint to include
-- all values the UI supports (Lacey_Act_UFLPA, China_Green_Trade,
-- UAE_Halal, GACC) and adds missing columns.
-- Safe to run multiple times.
-- ============================================================

-- 1. Drop the old narrow constraint and replace with the full set
ALTER TABLE compliance_profiles
  DROP CONSTRAINT IF EXISTS compliance_profiles_regulation_framework_check;

ALTER TABLE compliance_profiles
  ADD CONSTRAINT compliance_profiles_regulation_framework_check
  CHECK (regulation_framework IN (
    'EUDR',
    'FSMA_204',
    'UK_Environment_Act',
    'Lacey_Act_UFLPA',
    'China_Green_Trade',
    'GACC',
    'UAE_Halal',
    'custom'
  ));

-- 2. collection_batches — add community, state, lga if not present
--    (used by Smart Collect flow and GACON seed)
ALTER TABLE collection_batches
  ADD COLUMN IF NOT EXISTS community TEXT,
  ADD COLUMN IF NOT EXISTS state     TEXT,
  ADD COLUMN IF NOT EXISTS lga       TEXT;

-- 3. collection_batches — ensure agent_id accepts auth.users FK
--    (the extended migration uses auth.users but base schema uses profiles)
--    The seed inserts profiles.id as agent_id, which is fine.

-- 4. documents — add gacc_registration to the document_type CHECK
ALTER TABLE documents
  DROP CONSTRAINT IF EXISTS documents_document_type_check;

ALTER TABLE documents
  ADD CONSTRAINT documents_document_type_check
  CHECK (document_type IN (
    'export_license',
    'phytosanitary',
    'fumigation',
    'organic_cert',
    'insurance',
    'lab_result',
    'customs_declaration',
    'bill_of_lading',
    'certificate_of_origin',
    'quality_cert',
    'gacc_registration',
    'haccp_cert',
    'iso_cert',
    'health_cert',
    'other'
  ));

-- 5. shipments readiness_decision — ensure conditional is valid
--    (UI uses 'conditional', old schema used 'conditional_go')
ALTER TABLE shipments
  DROP CONSTRAINT IF EXISTS shipments_readiness_decision_check;

ALTER TABLE shipments
  ADD CONSTRAINT shipments_readiness_decision_check
  CHECK (readiness_decision IN ('go', 'conditional_go', 'conditional', 'no_go', 'pending'));

-- 6. farmer_performance_ledger — create as TABLE if it doesn't exist
--    (In some deployments this is a VIEW — we create a separate table
--     named farmer_performance_ledger_table as the seed target if the
--     VIEW exists, but the seed writes to farmer_performance_ledger
--     directly so we need it as a writable table)
--    This block is safe: if the VIEW exists it is replaced with a TABLE.
DO $$
BEGIN
  -- Drop the VIEW if it exists so we can create a writable TABLE
  DROP VIEW IF EXISTS farmer_performance_ledger CASCADE;

  -- Create the TABLE (will no-op if already a table with this name)
  CREATE TABLE IF NOT EXISTS farmer_performance_ledger (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id           UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    farm_id          UUID NOT NULL,
    farmer_name      TEXT NOT NULL,
    community        TEXT,
    state            TEXT,
    area_hectares    NUMERIC DEFAULT 0,
    commodity        TEXT,
    total_delivery_kg      NUMERIC  DEFAULT 0,
    total_bag_count        INTEGER  DEFAULT 0,
    total_batch_count      INTEGER  DEFAULT 0,
    total_batches          INTEGER  DEFAULT 0,
    avg_quality_score      NUMERIC  DEFAULT 0,
    avg_grade_score        NUMERIC  DEFAULT 0,
    grade_a_percentage     NUMERIC  DEFAULT 0,
    grade_b_percentage     NUMERIC  DEFAULT 0,
    grade_c_percentage     NUMERIC  DEFAULT 0,
    compliance_status      TEXT     DEFAULT 'pending'
                             CHECK (compliance_status IN ('pending','verified','flagged')),
    consent_collected      BOOLEAN  DEFAULT false,
    has_consent            BOOLEAN  DEFAULT false,
    gps_recorded           BOOLEAN  DEFAULT false,
    deforestation_free     BOOLEAN  DEFAULT true,
    total_payments_ngn     NUMERIC  DEFAULT 0,
    payment_reliability    INTEGER  DEFAULT 100,
    current_season         TEXT,
    last_delivery_date     TIMESTAMPTZ,
    created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at             TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );

  -- Add columns that might be missing if the table already existed
  ALTER TABLE farmer_performance_ledger
    ADD COLUMN IF NOT EXISTS area_hectares   NUMERIC  DEFAULT 0,
    ADD COLUMN IF NOT EXISTS commodity       TEXT,
    ADD COLUMN IF NOT EXISTS avg_grade_score NUMERIC  DEFAULT 0,
    ADD COLUMN IF NOT EXISTS total_batches   INTEGER  DEFAULT 0,
    ADD COLUMN IF NOT EXISTS has_consent     BOOLEAN  DEFAULT false;

  -- Unique index so the seed can upsert without duplicates
  CREATE UNIQUE INDEX IF NOT EXISTS idx_farmer_ledger_org_farm
    ON farmer_performance_ledger(org_id, farm_id);

  -- RLS
  ALTER TABLE farmer_performance_ledger ENABLE ROW LEVEL SECURITY;

  DROP POLICY IF EXISTS org_access_farmer_performance_ledger
    ON farmer_performance_ledger;

  CREATE POLICY org_access_farmer_performance_ledger
    ON farmer_performance_ledger
    FOR ALL USING (org_id = get_user_org_id());

EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'farmer_performance_ledger setup: %', SQLERRM;
END $$;
