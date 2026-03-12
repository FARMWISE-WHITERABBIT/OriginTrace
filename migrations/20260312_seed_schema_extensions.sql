-- ============================================================
-- Migration: seed_schema_extensions
-- Adds columns that are referenced in API routes but missing
-- from the deployed schema (discovered via seed script errors).
-- Safe to run multiple times (uses ADD COLUMN IF NOT EXISTS).
-- ============================================================

-- collection_batches extended columns
ALTER TABLE collection_batches
  ADD COLUMN IF NOT EXISTS batch_code          TEXT,
  ADD COLUMN IF NOT EXISTS commodity           TEXT,
  ADD COLUMN IF NOT EXISTS grade               TEXT,
  ADD COLUMN IF NOT EXISTS has_gps             BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS yield_validated     BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS yield_flag_reason   TEXT,
  ADD COLUMN IF NOT EXISTS compliance_status   TEXT NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS dispatched          BOOLEAN NOT NULL DEFAULT FALSE;

-- Unique index on batch_code per org (allows nulls)
CREATE UNIQUE INDEX IF NOT EXISTS collection_batches_batch_code_org_id_idx
  ON collection_batches (org_id, batch_code)
  WHERE batch_code IS NOT NULL;

-- processing_runs extended columns
ALTER TABLE processing_runs
  ADD COLUMN IF NOT EXISTS run_code            TEXT,
  ADD COLUMN IF NOT EXISTS facility_location   TEXT,
  ADD COLUMN IF NOT EXISTS recovery_rate       NUMERIC(5,2),
  ADD COLUMN IF NOT EXISTS mass_balance_valid  BOOLEAN NOT NULL DEFAULT TRUE;

-- finished_goods extended columns
ALTER TABLE finished_goods
  ADD COLUMN IF NOT EXISTS pedigree_code       TEXT,
  ADD COLUMN IF NOT EXISTS product_name        TEXT,
  ADD COLUMN IF NOT EXISTS product_type        TEXT,
  ADD COLUMN IF NOT EXISTS batch_number        TEXT,
  ADD COLUMN IF NOT EXISTS lot_number          TEXT,
  ADD COLUMN IF NOT EXISTS production_date     DATE,
  ADD COLUMN IF NOT EXISTS destination_country TEXT,
  ADD COLUMN IF NOT EXISTS buyer_company       TEXT,
  ADD COLUMN IF NOT EXISTS pedigree_verified   BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS mass_balance_valid  BOOLEAN NOT NULL DEFAULT TRUE;

-- digital_product_passports extended columns
ALTER TABLE digital_product_passports
  ADD COLUMN IF NOT EXISTS dpp_code                TEXT,
  ADD COLUMN IF NOT EXISTS product_category        TEXT,
  ADD COLUMN IF NOT EXISTS origin_country          TEXT,
  ADD COLUMN IF NOT EXISTS sustainability_claims   JSONB,
  ADD COLUMN IF NOT EXISTS carbon_footprint_kg     NUMERIC(8,3),
  ADD COLUMN IF NOT EXISTS certifications          TEXT[],
  ADD COLUMN IF NOT EXISTS processing_history      JSONB,
  ADD COLUMN IF NOT EXISTS chain_of_custody        JSONB,
  ADD COLUMN IF NOT EXISTS regulatory_compliance   JSONB,
  ADD COLUMN IF NOT EXISTS machine_readable_data   JSONB,
  ADD COLUMN IF NOT EXISTS passport_version        INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS status                  TEXT NOT NULL DEFAULT 'draft',
  ADD COLUMN IF NOT EXISTS issued_at               TIMESTAMPTZ;

-- farm_conflicts table (if missing entirely)
CREATE TABLE IF NOT EXISTS farm_conflicts (
  id              BIGSERIAL PRIMARY KEY,
  org_id          UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  farm_a_id       UUID NOT NULL REFERENCES farms(id),
  farm_b_id       UUID NOT NULL REFERENCES farms(id),
  overlap_ratio   NUMERIC(6,4),
  status          TEXT NOT NULL DEFAULT 'pending',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- tenders extended columns
ALTER TABLE tenders
  ADD COLUMN IF NOT EXISTS visibility              TEXT NOT NULL DEFAULT 'public',
  ADD COLUMN IF NOT EXISTS invited_orgs            UUID[],
  ADD COLUMN IF NOT EXISTS required_certifications TEXT[],
  ADD COLUMN IF NOT EXISTS closing_date            TIMESTAMPTZ;

-- tender_bids extended columns
ALTER TABLE tender_bids
  ADD COLUMN IF NOT EXISTS delivery_date           DATE,
  ADD COLUMN IF NOT EXISTS certifications          TEXT[],
  ADD COLUMN IF NOT EXISTS submitted_by            UUID REFERENCES auth.users(id);

-- contracts extended columns
ALTER TABLE contracts
  ADD COLUMN IF NOT EXISTS contract_reference      TEXT,
  ADD COLUMN IF NOT EXISTS delivery_deadline       TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS quality_requirements    JSONB;
