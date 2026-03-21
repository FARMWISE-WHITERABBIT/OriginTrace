-- ============================================================
-- Migration: 20260321_seed_global_commodities
-- Adds Hibiscus and Turmeric to the global commodity master.
-- Idempotent — safe to run multiple times.
-- ============================================================

INSERT INTO commodity_master (id, org_id, name, slug, category, hs_code, scientific_name, is_eudr_regulated, is_active)
VALUES
  ('00000000-0000-0000-0000-000000000011', NULL, 'Hibiscus', 'hibiscus', 'flower_crop', '0604.20', 'Hibiscus sabdariffa', false, true),
  ('00000000-0000-0000-0000-000000000012', NULL, 'Turmeric', 'turmeric', 'root_crop',   '0910.30', 'Curcuma longa',       false, true)
ON CONFLICT (org_id, slug) DO UPDATE
  SET name = EXCLUDED.name,
      category = EXCLUDED.category,
      hs_code = EXCLUDED.hs_code,
      scientific_name = EXCLUDED.scientific_name,
      is_eudr_regulated = EXCLUDED.is_eudr_regulated,
      is_active = EXCLUDED.is_active,
      updated_at = NOW();
