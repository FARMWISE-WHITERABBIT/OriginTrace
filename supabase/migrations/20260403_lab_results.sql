-- Migration: Lab Test Results Repository (lot-level)
-- Creates a dedicated lab_results table with structured metadata and lot-level linking.
-- The existing documents table stores the file; this table stores the structured result.
-- Also creates evidence_packages for Border Detention Evidence Package (Item 10).
-- Date: 2026-04-03

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. LAB RESULTS — structured, lot-level linked results
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS lab_results (
  id                        UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id                    UUID        NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  -- Lot-level links (at least one must be set — enforced at application layer)
  batch_id                  UUID        REFERENCES collection_batches(id) ON DELETE SET NULL,
  finished_good_id          UUID        REFERENCES finished_goods(id)     ON DELETE SET NULL,
  shipment_id               UUID        REFERENCES shipments(id)           ON DELETE SET NULL,

  -- Lab metadata
  lab_provider              TEXT        NOT NULL,
  test_method               TEXT,        -- e.g. 'HPLC', 'GC-MS', 'ELISA'
  test_date                 DATE        NOT NULL,
  test_type                 TEXT        NOT NULL
                            CHECK (test_type IN (
                              'aflatoxin',
                              'pesticide_residue',
                              'heavy_metal',
                              'microbiological',
                              'moisture',
                              'other'
                            )),
  commodity                 TEXT,        -- e.g. 'cocoa', 'ginger'
  result                    TEXT        NOT NULL
                            CHECK (result IN ('pass', 'fail', 'conditional')),
  result_value              DECIMAL(10,4),  -- numeric result where applicable (e.g. ppb value)
  result_unit               TEXT,           -- e.g. 'ppb', 'ppm', 'CFU/g', '%'
  result_notes              TEXT,

  -- Certificate details
  certificate_number        TEXT,
  -- Validity: how long this certificate is valid for (for transit-aware expiry check)
  certificate_validity_days INTEGER     DEFAULT 90,
  -- Computed from test_date + validity_days; stored for efficient expiry queries
  certificate_expiry_date   DATE,

  -- MRL cross-reference flags — populated by handler when test_type = 'pesticide_residue'
  -- Shape: [{ market, active_ingredient, mrl_ppm, result_ppm, exceeded: bool }]
  mrl_flags                 JSONB       DEFAULT '[]',

  -- Target destination markets for this result's MRL check
  target_markets            TEXT[]      DEFAULT ARRAY[]::TEXT[],

  -- File attachment (one of these should be set)
  file_url                  TEXT,
  file_name                 TEXT,
  -- Link to the documents table if the file was uploaded there first
  document_id               UUID        REFERENCES documents(id) ON DELETE SET NULL,

  uploaded_by               UUID        REFERENCES auth.users(id),
  created_at                TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Ensure at least one lot-level link is present
ALTER TABLE lab_results
  ADD CONSTRAINT lab_results_requires_link
  CHECK (
    batch_id IS NOT NULL OR
    finished_good_id IS NOT NULL OR
    shipment_id IS NOT NULL
  );

CREATE INDEX IF NOT EXISTS idx_lab_results_org
  ON lab_results(org_id, test_date DESC);

CREATE INDEX IF NOT EXISTS idx_lab_results_batch
  ON lab_results(batch_id)
  WHERE batch_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_lab_results_finished_good
  ON lab_results(finished_good_id)
  WHERE finished_good_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_lab_results_shipment
  ON lab_results(shipment_id)
  WHERE shipment_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_lab_results_expiry
  ON lab_results(certificate_expiry_date)
  WHERE certificate_expiry_date IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_lab_results_result
  ON lab_results(org_id, result, test_type);

ALTER TABLE lab_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org_members_manage_lab_results"
  ON lab_results
  FOR ALL
  TO authenticated
  USING (
    org_id IN (SELECT org_id FROM profiles WHERE user_id = auth.uid())
  )
  WITH CHECK (
    org_id IN (SELECT org_id FROM profiles WHERE user_id = auth.uid())
  );

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_lab_result_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER lab_result_updated_at
  BEFORE UPDATE ON lab_results
  FOR EACH ROW EXECUTE FUNCTION update_lab_result_timestamp();

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. EVIDENCE PACKAGES — time-limited shareable border detention evidence links
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS evidence_packages (
  id            UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id        UUID        NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  shipment_id   UUID        NOT NULL REFERENCES shipments(id)     ON DELETE CASCADE,
  -- Time-limited access token — shared with customs/buyer without requiring login
  token         TEXT        NOT NULL UNIQUE,
  expires_at    TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '7 days'),
  views         INTEGER     NOT NULL DEFAULT 0,
  created_by    UUID        REFERENCES auth.users(id),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_evidence_packages_token
  ON evidence_packages(token);

CREATE INDEX IF NOT EXISTS idx_evidence_packages_shipment
  ON evidence_packages(shipment_id);

CREATE INDEX IF NOT EXISTS idx_evidence_packages_expiry
  ON evidence_packages(expires_at);

ALTER TABLE evidence_packages ENABLE ROW LEVEL SECURITY;

-- Org members can manage (create/list/delete) their own packages
CREATE POLICY "org_members_manage_evidence_packages"
  ON evidence_packages
  FOR ALL
  TO authenticated
  USING (
    org_id IN (SELECT org_id FROM profiles WHERE user_id = auth.uid())
  )
  WITH CHECK (
    org_id IN (SELECT org_id FROM profiles WHERE user_id = auth.uid())
  );

-- Public token-based read is handled at the API layer (no RLS needed for anonymous access)
