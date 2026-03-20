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

-- 6. farmer_performance_ledger — add missing columns the UI needs
ALTER TABLE farmer_performance_ledger
  ADD COLUMN IF NOT EXISTS area_hectares    NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS commodity        TEXT,
  ADD COLUMN IF NOT EXISTS avg_grade_score  NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_batches    INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS has_consent      BOOLEAN DEFAULT false;
