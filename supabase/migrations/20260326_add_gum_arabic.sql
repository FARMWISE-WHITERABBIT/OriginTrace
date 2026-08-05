-- ================================================================
-- Migration: 20260326_add_gum_arabic
--
-- Adds Gum Arabic to commodity_master as a global system commodity.
-- Adds a yield benchmark row for Nigeria (0.4 kg/tree/year).
--
-- Run this in the Supabase SQL Editor.
-- Safe to run multiple times (uses ON CONFLICT DO NOTHING).
-- ================================================================

-- 1. Global commodity record
INSERT INTO commodity_master (id, org_id, name, slug, category, hs_code, scientific_name, is_eudr_regulated, is_active)
VALUES (
  '00000000-0000-0000-0000-000000000013',
  NULL,
  'Gum Arabic',
  'gum_arabic',
  'tree_crop',
  '1301.20',
  'Acacia senegal',
  false,
  true
)
ON CONFLICT DO NOTHING;

-- 2. Yield benchmark for Nigeria
--    Benchmark: 0.4 kg/tree/year (field measurement)
--    Conversion: ~1,000 trees/ha typical planting density
--    → avg_yield_per_hectare = 0.40 t/ha (400 kg/ha)
--    Source field documents the per-tree origin of the figure.
INSERT INTO yield_benchmarks (commodity, country, region, avg_yield_per_hectare, min_yield, max_yield, source, year)
VALUES (
  'Gum Arabic',
  'Nigeria',
  'North Nigeria',
  0.40,
  0.20,
  0.65,
  'FAO/NRC (0.4 kg/tree/year)',
  2024
)
ON CONFLICT DO NOTHING;

-- Verify
SELECT id, name, slug, hs_code, category, is_eudr_regulated
FROM commodity_master
WHERE slug = 'gum_arabic';

SELECT commodity, country, region, avg_yield_per_hectare, source
FROM yield_benchmarks
WHERE commodity = 'Gum Arabic';
