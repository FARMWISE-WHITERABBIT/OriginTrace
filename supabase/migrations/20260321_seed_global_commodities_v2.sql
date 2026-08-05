-- ================================================================
-- Migration: 20260321_seed_global_commodities_v2
--
-- Seeds Hibiscus and Turmeric into commodity_master.
-- Works with BOTH schema versions:
--   OLD: (id, name, code, is_global, created_by_org_id, ...)
--   NEW: (id, org_id, name, slug, ...)
--
-- Run this in the Supabase SQL Editor.
-- Safe to run multiple times (uses ON CONFLICT DO NOTHING).
-- ================================================================

DO $$
DECLARE
  has_org_id     BOOLEAN;
  has_slug       BOOLEAN;
  has_is_global  BOOLEAN;
  has_code       BOOLEAN;
BEGIN
  -- Detect which schema version is live
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'commodity_master' AND column_name = 'org_id'
  ) INTO has_org_id;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'commodity_master' AND column_name = 'slug'
  ) INTO has_slug;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'commodity_master' AND column_name = 'is_global'
  ) INTO has_is_global;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'commodity_master' AND column_name = 'code'
  ) INTO has_code;

  RAISE NOTICE 'commodity_master columns — org_id: %, slug: %, is_global: %, code: %',
    has_org_id, has_slug, has_is_global, has_code;

  -- ── NEW SCHEMA (org_id + slug) ─────────────────────────────────
  IF has_org_id AND has_slug THEN
    INSERT INTO commodity_master (id, org_id, name, slug, category, hs_code, scientific_name, is_eudr_regulated, is_active)
    VALUES
      ('00000000-0000-0000-0000-000000000011', NULL, 'Hibiscus', 'hibiscus', 'flower_crop', '0604.20', 'Hibiscus sabdariffa', false, true),
      ('00000000-0000-0000-0000-000000000012', NULL, 'Turmeric', 'turmeric', 'root_crop',   '0910.30', 'Curcuma longa',       false, true)
    ON CONFLICT DO NOTHING;
    RAISE NOTICE 'Inserted using NEW schema (org_id + slug)';

  -- ── OLD SCHEMA (is_global + created_by_org_id + code) ──────────
  ELSIF has_is_global AND has_code THEN
    -- Old schema uses: code, name, is_global, created_by_org_id, unit, category
    -- is_global=true means global commodity (no org owner)
    -- created_by_org_id can be NULL for global commodities
    INSERT INTO commodity_master (name, code, is_global, is_active, category)
    VALUES
      ('Hibiscus', 'HIBISCUS', true, true, 'flower_crop'),
      ('Turmeric', 'TURMERIC', true, true, 'root_crop')
    ON CONFLICT DO NOTHING;
    RAISE NOTICE 'Inserted using OLD schema (is_global + code)';

  -- ── UNKNOWN SCHEMA ──────────────────────────────────────────────
  ELSE
    RAISE WARNING 'commodity_master schema not recognised — no rows inserted. Check table columns manually.';
  END IF;

END $$;

-- Verify what was inserted
SELECT id, name,
  CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='commodity_master' AND column_name='slug')
    THEN (SELECT slug FROM commodity_master cm2 WHERE cm2.id = cm.id LIMIT 1)
    ELSE (SELECT code FROM commodity_master cm2 WHERE cm2.id = cm.id LIMIT 1)
  END AS slug_or_code,
  is_active
FROM commodity_master cm
ORDER BY name;
