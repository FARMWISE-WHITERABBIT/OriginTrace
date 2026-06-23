-- Migration: Compliance Frameworks Extended
-- Fixes the regulation_framework CHECK constraint to include all 7 scoring frameworks,
-- adds GACC facility registration tracking, MRL lookup database, and extends farmer_inputs.
-- Date: 2026-04-02

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. COMPLIANCE PROFILES — extend regulation_framework CHECK constraint
-- ─────────────────────────────────────────────────────────────────────────────
-- The scoring engine already handles 7 frameworks but the schema only allowed 4.
-- Drop the old constraint by name, then re-add with all 7 values.

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
    'UAE_Halal',
    'custom'
  ));

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. GACC FACILITY REGISTRATION TRACKING
-- China GACC requires all overseas food enterprises to be registered before
-- exporting to China. This table tracks facility registration status and alerts
-- on upcoming renewals.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS gacc_facilities (
  id                        UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id                    UUID        NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  facility_name             TEXT        NOT NULL,
  facility_type             TEXT        CHECK (facility_type IN ('processing', 'storage', 'production', 'packaging')),
  address                   TEXT,
  country                   TEXT        NOT NULL DEFAULT 'NG',
  gacc_registration_number  TEXT,
  registration_date         DATE,
  renewal_date              DATE,
  status                    TEXT        NOT NULL DEFAULT 'pending'
                            CHECK (status IN ('pending', 'registered', 'renewal_required', 'expired', 'rejected')),
  commodities               TEXT[]      DEFAULT ARRAY[]::TEXT[],
  notes                     TEXT,
  created_by                UUID        REFERENCES auth.users(id),
  created_at                TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_gacc_facilities_org     ON gacc_facilities(org_id);
CREATE INDEX IF NOT EXISTS idx_gacc_facilities_status  ON gacc_facilities(org_id, status);
CREATE INDEX IF NOT EXISTS idx_gacc_facilities_renewal ON gacc_facilities(renewal_date)
  WHERE renewal_date IS NOT NULL;

-- RLS
ALTER TABLE gacc_facilities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org_members_manage_gacc_facilities"
  ON gacc_facilities
  FOR ALL
  TO authenticated
  USING (
    org_id IN (
      SELECT org_id FROM profiles WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    org_id IN (
      SELECT org_id FROM profiles WHERE user_id = auth.uid()
    )
  );

-- Updated_at trigger
CREATE OR REPLACE FUNCTION update_gacc_facility_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER gacc_facility_updated_at
  BEFORE UPDATE ON gacc_facilities
  FOR EACH ROW EXECUTE FUNCTION update_gacc_facility_timestamp();

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. MRL LOOKUP DATABASE
-- Maximum Residue Levels for the top pesticide active ingredients across the
-- four key destination markets. Manually curated MVP — live API integration is V3.
-- Source: EU Pesticide MRL Database, UK HSE MRL database, Codex Alimentarius.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS mrl_database (
  id                  UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  active_ingredient   TEXT        NOT NULL,
  commodity           TEXT        NOT NULL,  -- e.g. 'cocoa', 'ginger', 'cashew', 'hibiscus'
  market              TEXT        NOT NULL   CHECK (market IN ('EU', 'UK', 'US', 'China', 'Codex')),
  mrl_ppm             DECIMAL(10,4) NOT NULL, -- mg/kg = ppm
  mrl_notes           TEXT,                  -- e.g. "provisional MRL", "not authorised = LOD"
  source_regulation   TEXT,                  -- e.g. "Regulation (EC) No 396/2005"
  codex_mrl_ppm       DECIMAL(10,4),         -- Codex reference for comparison
  effective_date      DATE,
  review_date         DATE,                  -- When to re-check this value
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_mrl_unique
  ON mrl_database(active_ingredient, commodity, market);

CREATE INDEX IF NOT EXISTS idx_mrl_ingredient ON mrl_database(active_ingredient);
CREATE INDEX IF NOT EXISTS idx_mrl_commodity  ON mrl_database(commodity, market);

-- RLS — read-only for all authenticated users, managed by superadmin
ALTER TABLE mrl_database ENABLE ROW LEVEL SECURITY;

CREATE POLICY "authenticated_read_mrl"
  ON mrl_database
  FOR SELECT
  TO authenticated
  USING (true);

-- Seed top 20 pesticide MRL values for Nigerian cocoa, ginger, cashew, hibiscus
-- Sources: EU MRL regulation (EC) 396/2005 as amended; UK statutory instrument SI 2008/2081;
--          US EPA tolerances; China GB 2763-2021; Codex Stan 193-1995

INSERT INTO mrl_database (active_ingredient, commodity, market, mrl_ppm, source_regulation, effective_date) VALUES

-- ── COCOA ──────────────────────────────────────────────────────────────────
('lambda-cyhalothrin',  'cocoa', 'EU',    0.02,  'Reg (EC) 396/2005',   '2008-09-01'),
('lambda-cyhalothrin',  'cocoa', 'UK',    0.02,  'SI 2008/2081',        '2021-01-01'),
('lambda-cyhalothrin',  'cocoa', 'US',    0.05,  'US EPA 40 CFR 180',   '2010-01-01'),
('lambda-cyhalothrin',  'cocoa', 'China', 0.05,  'GB 2763-2021',        '2021-09-03'),

('chlorpyrifos',        'cocoa', 'EU',    0.01,  'Reg (EU) 2020/18',    '2020-04-16'),
('chlorpyrifos',        'cocoa', 'UK',    0.01,  'SI 2020/1245',        '2021-01-01'),
('chlorpyrifos',        'cocoa', 'US',    0.10,  'US EPA 40 CFR 180',   '2022-01-01'),
('chlorpyrifos',        'cocoa', 'China', 0.20,  'GB 2763-2021',        '2021-09-03'),

('deltamethrin',        'cocoa', 'EU',    0.05,  'Reg (EC) 396/2005',   '2008-09-01'),
('deltamethrin',        'cocoa', 'UK',    0.05,  'SI 2008/2081',        '2021-01-01'),
('deltamethrin',        'cocoa', 'US',    0.05,  'US EPA 40 CFR 180',   '2010-01-01'),
('deltamethrin',        'cocoa', 'China', 0.05,  'GB 2763-2021',        '2021-09-03'),

('glyphosate',          'cocoa', 'EU',    0.10,  'Reg (EC) 396/2005',   '2018-06-01'),
('glyphosate',          'cocoa', 'UK',    0.10,  'SI 2008/2081',        '2021-01-01'),
('glyphosate',          'cocoa', 'US',    5.00,  'US EPA 40 CFR 180',   '2013-06-01'),
('glyphosate',          'cocoa', 'China', 0.10,  'GB 2763-2021',        '2021-09-03'),

('imidacloprid',        'cocoa', 'EU',    0.05,  'Reg (EC) 396/2005',   '2008-09-01'),
('imidacloprid',        'cocoa', 'UK',    0.05,  'SI 2008/2081',        '2021-01-01'),
('imidacloprid',        'cocoa', 'US',    0.20,  'US EPA 40 CFR 180',   '2010-01-01'),
('imidacloprid',        'cocoa', 'China', 0.10,  'GB 2763-2021',        '2021-09-03'),

('cypermethrin',        'cocoa', 'EU',    0.05,  'Reg (EC) 396/2005',   '2008-09-01'),
('cypermethrin',        'cocoa', 'UK',    0.05,  'SI 2008/2081',        '2021-01-01'),
('cypermethrin',        'cocoa', 'US',    0.05,  'US EPA 40 CFR 180',   '2010-01-01'),
('cypermethrin',        'cocoa', 'China', 0.05,  'GB 2763-2021',        '2021-09-03'),

-- ── GINGER ─────────────────────────────────────────────────────────────────
('lambda-cyhalothrin',  'ginger', 'EU',    0.02,  'Reg (EC) 396/2005',   '2008-09-01'),
('lambda-cyhalothrin',  'ginger', 'UK',    0.02,  'SI 2008/2081',        '2021-01-01'),
('lambda-cyhalothrin',  'ginger', 'US',    0.20,  'US EPA 40 CFR 180',   '2010-01-01'),
('lambda-cyhalothrin',  'ginger', 'China', 0.10,  'GB 2763-2021',        '2021-09-03'),

('chlorpyrifos',        'ginger', 'EU',    0.01,  'Reg (EU) 2020/18',    '2020-04-16'),
('chlorpyrifos',        'ginger', 'UK',    0.01,  'SI 2020/1245',        '2021-01-01'),
('chlorpyrifos',        'ginger', 'US',    0.20,  'US EPA 40 CFR 180',   '2010-01-01'),
('chlorpyrifos',        'ginger', 'China', 0.50,  'GB 2763-2021',        '2021-09-03'),

('dimethoate',          'ginger', 'EU',    0.02,  'Reg (EC) 396/2005',   '2008-09-01'),
('dimethoate',          'ginger', 'UK',    0.02,  'SI 2008/2081',        '2021-01-01'),
('dimethoate',          'ginger', 'US',    2.00,  'US EPA 40 CFR 180',   '2010-01-01'),
('dimethoate',          'ginger', 'China', 0.50,  'GB 2763-2021',        '2021-09-03'),

('permethrin',          'ginger', 'EU',    0.05,  'Reg (EC) 396/2005',   '2008-09-01'),
('permethrin',          'ginger', 'UK',    0.05,  'SI 2008/2081',        '2021-01-01'),
('permethrin',          'ginger', 'US',    0.05,  'US EPA 40 CFR 180',   '2010-01-01'),
('permethrin',          'ginger', 'China', 0.05,  'GB 2763-2021',        '2021-09-03'),

-- ── CASHEW ─────────────────────────────────────────────────────────────────
('lambda-cyhalothrin',  'cashew', 'EU',    0.05,  'Reg (EC) 396/2005',   '2008-09-01'),
('lambda-cyhalothrin',  'cashew', 'UK',    0.05,  'SI 2008/2081',        '2021-01-01'),
('lambda-cyhalothrin',  'cashew', 'US',    0.05,  'US EPA 40 CFR 180',   '2010-01-01'),
('lambda-cyhalothrin',  'cashew', 'China', 0.05,  'GB 2763-2021',        '2021-09-03'),

('chlorpyrifos',        'cashew', 'EU',    0.01,  'Reg (EU) 2020/18',    '2020-04-16'),
('chlorpyrifos',        'cashew', 'UK',    0.01,  'SI 2020/1245',        '2021-01-01'),
('chlorpyrifos',        'cashew', 'US',    0.10,  'US EPA 40 CFR 180',   '2010-01-01'),
('chlorpyrifos',        'cashew', 'China', 0.20,  'GB 2763-2021',        '2021-09-03'),

('imidacloprid',        'cashew', 'EU',    0.05,  'Reg (EC) 396/2005',   '2008-09-01'),
('imidacloprid',        'cashew', 'UK',    0.05,  'SI 2008/2081',        '2021-01-01'),
('imidacloprid',        'cashew', 'US',    0.20,  'US EPA 40 CFR 180',   '2010-01-01'),
('imidacloprid',        'cashew', 'China', 0.10,  'GB 2763-2021',        '2021-09-03'),

-- ── HIBISCUS (sorrel/zobo) ─────────────────────────────────────────────────
('lambda-cyhalothrin',  'hibiscus', 'EU',    0.02,  'Reg (EC) 396/2005',  '2008-09-01'),
('lambda-cyhalothrin',  'hibiscus', 'UK',    0.02,  'SI 2008/2081',       '2021-01-01'),
('lambda-cyhalothrin',  'hibiscus', 'US',    0.10,  'US EPA 40 CFR 180',  '2010-01-01'),
('lambda-cyhalothrin',  'hibiscus', 'China', 0.05,  'GB 2763-2021',       '2021-09-03'),

('chlorpyrifos',        'hibiscus', 'EU',    0.01,  'Reg (EU) 2020/18',   '2020-04-16'),
('chlorpyrifos',        'hibiscus', 'UK',    0.01,  'SI 2020/1245',       '2021-01-01'),
('chlorpyrifos',        'hibiscus', 'US',    0.10,  'US EPA 40 CFR 180',  '2010-01-01'),
('chlorpyrifos',        'hibiscus', 'China', 0.10,  'GB 2763-2021',       '2021-09-03')

ON CONFLICT (active_ingredient, commodity, market) DO UPDATE
  SET mrl_ppm = EXCLUDED.mrl_ppm,
      source_regulation = EXCLUDED.source_regulation,
      effective_date = EXCLUDED.effective_date,
      updated_at = NOW();

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. FARMER INPUTS — extend with MRL-relevant fields
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE farmer_inputs ADD COLUMN IF NOT EXISTS active_ingredient      TEXT;
ALTER TABLE farmer_inputs ADD COLUMN IF NOT EXISTS pre_harvest_interval_days INTEGER;
ALTER TABLE farmer_inputs ADD COLUMN IF NOT EXISTS application_rate_per_ha DECIMAL(10,4);
-- mrl_flag: set by the cross-reference check, e.g.
-- {"market":"EU","mrl_ppm":0.02,"estimated_ppm":0.05,"exceeded":true,"checked_at":"2026-04-02T..."}
ALTER TABLE farmer_inputs ADD COLUMN IF NOT EXISTS mrl_flag               JSONB DEFAULT NULL;

CREATE INDEX IF NOT EXISTS idx_farmer_inputs_active_ingredient
  ON farmer_inputs(active_ingredient)
  WHERE active_ingredient IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_farmer_inputs_mrl_flag
  ON farmer_inputs(farm_id)
  WHERE mrl_flag IS NOT NULL;
