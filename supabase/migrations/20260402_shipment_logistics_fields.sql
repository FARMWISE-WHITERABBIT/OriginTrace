-- Migration: Shipment Logistics Fields
-- Adds all freight, vessel, container, customs, inspection, commercial, and cost
-- fields required for the 9-stage shipment pipeline (PRD §7.2).
-- Also adds pre-notification tracking fields for all 5 destination markets.
-- Also adds farm last_collection_date for completeness score calculation.
-- Date: 2026-04-02

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. FARM — last_collection_date for completeness score
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE farms ADD COLUMN IF NOT EXISTS last_collection_date TIMESTAMPTZ;
ALTER TABLE farms ADD COLUMN IF NOT EXISTS commodity TEXT;  -- may already exist; IF NOT EXISTS is safe

CREATE INDEX IF NOT EXISTS idx_farms_last_collection
  ON farms(org_id, last_collection_date);

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. SHIPMENTS — Freight & Vessel fields (required at Stage 5)
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE shipments ADD COLUMN IF NOT EXISTS freight_forwarder_name    TEXT;
ALTER TABLE shipments ADD COLUMN IF NOT EXISTS freight_forwarder_contact  TEXT;
ALTER TABLE shipments ADD COLUMN IF NOT EXISTS shipping_line              TEXT;
ALTER TABLE shipments ADD COLUMN IF NOT EXISTS vessel_name               TEXT;
ALTER TABLE shipments ADD COLUMN IF NOT EXISTS imo_number                TEXT;
ALTER TABLE shipments ADD COLUMN IF NOT EXISTS voyage_number             TEXT;
ALTER TABLE shipments ADD COLUMN IF NOT EXISTS booking_reference         TEXT;
ALTER TABLE shipments ADD COLUMN IF NOT EXISTS port_of_loading           TEXT;
ALTER TABLE shipments ADD COLUMN IF NOT EXISTS port_of_discharge         TEXT;
ALTER TABLE shipments ADD COLUMN IF NOT EXISTS etd                       DATE;
ALTER TABLE shipments ADD COLUMN IF NOT EXISTS eta                       DATE;
ALTER TABLE shipments ADD COLUMN IF NOT EXISTS actual_departure_date     DATE;
ALTER TABLE shipments ADD COLUMN IF NOT EXISTS actual_arrival_date       DATE;
ALTER TABLE shipments ADD COLUMN IF NOT EXISTS bill_of_lading_number     TEXT;

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. SHIPMENTS — Container fields (required at Stage 6)
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE shipments ADD COLUMN IF NOT EXISTS container_number          TEXT;
ALTER TABLE shipments ADD COLUMN IF NOT EXISTS container_seal_number     TEXT;
ALTER TABLE shipments ADD COLUMN IF NOT EXISTS container_type            TEXT
  CHECK (container_type IN ('20FT', '40FT', '40HC', 'Reefer'));

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. SHIPMENTS — Customs & Clearance fields (required at Stage 4)
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE shipments ADD COLUMN IF NOT EXISTS clearing_agent_name       TEXT;
ALTER TABLE shipments ADD COLUMN IF NOT EXISTS clearing_agent_contact    TEXT;
ALTER TABLE shipments ADD COLUMN IF NOT EXISTS customs_declaration_number TEXT;
ALTER TABLE shipments ADD COLUMN IF NOT EXISTS exit_certificate_number   TEXT;

-- ─────────────────────────────────────────────────────────────────────────────
-- 5. SHIPMENTS — Pre-shipment Inspection fields (required at Stage 2)
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE shipments ADD COLUMN IF NOT EXISTS inspection_body           TEXT;
ALTER TABLE shipments ADD COLUMN IF NOT EXISTS inspection_date           DATE;
ALTER TABLE shipments ADD COLUMN IF NOT EXISTS inspection_certificate_number TEXT;
ALTER TABLE shipments ADD COLUMN IF NOT EXISTS inspection_result         TEXT
  CHECK (inspection_result IN ('pass', 'fail', 'conditional'));

-- ─────────────────────────────────────────────────────────────────────────────
-- 6. SHIPMENTS — Commercial fields (required at Stage 1)
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE shipments ADD COLUMN IF NOT EXISTS purchase_order_number     TEXT;
ALTER TABLE shipments ADD COLUMN IF NOT EXISTS purchase_order_date       DATE;
ALTER TABLE shipments ADD COLUMN IF NOT EXISTS contract_price_per_mt     DECIMAL(14,2);
ALTER TABLE shipments ADD COLUMN IF NOT EXISTS total_shipment_value_usd  DECIMAL(14,2);

-- ─────────────────────────────────────────────────────────────────────────────
-- 7. SHIPMENTS — Cost fields (entered at respective stages)
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE shipments ADD COLUMN IF NOT EXISTS freight_cost_usd          DECIMAL(14,2);
ALTER TABLE shipments ADD COLUMN IF NOT EXISTS customs_fees_ngn           DECIMAL(14,2);
ALTER TABLE shipments ADD COLUMN IF NOT EXISTS inspection_fees_ngn        DECIMAL(14,2);
ALTER TABLE shipments ADD COLUMN IF NOT EXISTS certification_costs_ngn    DECIMAL(14,2);
ALTER TABLE shipments ADD COLUMN IF NOT EXISTS port_handling_charges_ngn  DECIMAL(14,2);
ALTER TABLE shipments ADD COLUMN IF NOT EXISTS freight_insurance_usd      DECIMAL(14,2);

-- ─────────────────────────────────────────────────────────────────────────────
-- 8. SHIPMENTS — Outcome fields (Stage 9 close)
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE shipments ADD COLUMN IF NOT EXISTS shipment_outcome          TEXT
  CHECK (shipment_outcome IN ('accepted', 'rejected', 'conditional'));
ALTER TABLE shipments ADD COLUMN IF NOT EXISTS rejection_reason          TEXT;
ALTER TABLE shipments ADD COLUMN IF NOT EXISTS outcome_recorded_at       TIMESTAMPTZ;

-- ─────────────────────────────────────────────────────────────────────────────
-- 9. SHIPMENTS — Pre-notification tracking (all 5 destination markets)
-- Status: not_filed → filed → confirmed
-- ─────────────────────────────────────────────────────────────────────────────

-- EU TRACES (EUDR DDS submission)
ALTER TABLE shipments ADD COLUMN IF NOT EXISTS prenotif_eu_traces        TEXT DEFAULT 'not_filed'
  CHECK (prenotif_eu_traces IN ('not_filed', 'filed', 'confirmed'));
ALTER TABLE shipments ADD COLUMN IF NOT EXISTS prenotif_eu_traces_ref    TEXT;
ALTER TABLE shipments ADD COLUMN IF NOT EXISTS prenotif_eu_traces_filed_at TIMESTAMPTZ;

-- UK IPAFFS (Import of Products, Animals, Food and Feed System)
ALTER TABLE shipments ADD COLUMN IF NOT EXISTS prenotif_uk_ipaffs        TEXT DEFAULT 'not_filed'
  CHECK (prenotif_uk_ipaffs IN ('not_filed', 'filed', 'confirmed'));
ALTER TABLE shipments ADD COLUMN IF NOT EXISTS prenotif_uk_ipaffs_ref    TEXT;
ALTER TABLE shipments ADD COLUMN IF NOT EXISTS prenotif_uk_ipaffs_filed_at TIMESTAMPTZ;

-- US FDA Prior Notice
ALTER TABLE shipments ADD COLUMN IF NOT EXISTS prenotif_us_fda           TEXT DEFAULT 'not_filed'
  CHECK (prenotif_us_fda IN ('not_filed', 'filed', 'confirmed'));
ALTER TABLE shipments ADD COLUMN IF NOT EXISTS prenotif_us_fda_ref       TEXT;
ALTER TABLE shipments ADD COLUMN IF NOT EXISTS prenotif_us_fda_filed_at  TIMESTAMPTZ;

-- China GACC customs declaration (no API — manual via CEEDS)
ALTER TABLE shipments ADD COLUMN IF NOT EXISTS prenotif_cn_gacc          TEXT DEFAULT 'not_filed'
  CHECK (prenotif_cn_gacc IN ('not_filed', 'filed', 'confirmed'));
ALTER TABLE shipments ADD COLUMN IF NOT EXISTS prenotif_cn_gacc_ref      TEXT;
ALTER TABLE shipments ADD COLUMN IF NOT EXISTS prenotif_cn_gacc_filed_at TIMESTAMPTZ;

-- UAE ESMA Certificate of Conformity + Dubai Municipality permit
ALTER TABLE shipments ADD COLUMN IF NOT EXISTS prenotif_uae_esma         TEXT DEFAULT 'not_filed'
  CHECK (prenotif_uae_esma IN ('not_filed', 'filed', 'confirmed'));
ALTER TABLE shipments ADD COLUMN IF NOT EXISTS prenotif_uae_esma_ref     TEXT;
ALTER TABLE shipments ADD COLUMN IF NOT EXISTS prenotif_uae_esma_filed_at TIMESTAMPTZ;

-- ─────────────────────────────────────────────────────────────────────────────
-- 10. SHIPMENTS — Indexes
-- ─────────────────────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_shipments_vessel
  ON shipments(vessel_name)
  WHERE vessel_name IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_shipments_container
  ON shipments(container_number)
  WHERE container_number IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_shipments_etd
  ON shipments(org_id, etd)
  WHERE etd IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_shipments_outcome
  ON shipments(org_id, shipment_outcome)
  WHERE shipment_outcome IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_shipments_bl
  ON shipments(bill_of_lading_number)
  WHERE bill_of_lading_number IS NOT NULL;
