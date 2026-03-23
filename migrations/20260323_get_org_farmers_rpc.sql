-- ============================================================
-- Migration: get_org_farmers_rpc
-- Creates the get_org_farmers(p_org_id) RPC function used by
-- /api/farmers. The farmer_performance_ledger VIEW was replaced
-- with a static TABLE in 20260320_expand_constraints, so newly
-- registered farms (written to the farms table) never appeared
-- in the farmers page. This RPC queries farms directly so every
-- farm shows up as soon as it is created.
-- Safe to run multiple times.
-- ============================================================

CREATE OR REPLACE FUNCTION get_org_farmers(p_org_id UUID)
RETURNS TABLE (
  farm_id             UUID,
  farmer_name         TEXT,
  org_id              UUID,
  community           TEXT,
  area_hectares       NUMERIC,
  commodity           TEXT,
  total_delivery_kg   NUMERIC,
  total_batches       BIGINT,
  total_bags          BIGINT,
  avg_grade_score     NUMERIC,
  last_delivery_date  TIMESTAMPTZ,
  delivery_frequency  TEXT,
  has_consent         BOOLEAN
)
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT
    f.id                                          AS farm_id,
    f.farmer_name,
    f.org_id,
    f.community,
    f.area_hectares,
    f.commodity,
    COALESCE(SUM(b.weight), 0)                    AS total_delivery_kg,
    COUNT(DISTINCT cb.id)                         AS total_batches,
    COUNT(b.id)                                   AS total_bags,
    ROUND(AVG(CASE
      WHEN b.grade = 'A' THEN 4
      WHEN b.grade = 'B' THEN 3
      WHEN b.grade = 'C' THEN 2
      WHEN b.grade = 'D' THEN 1
      ELSE NULL
    END), 2)                                      AS avg_grade_score,
    MAX(cb.created_at)                            AS last_delivery_date,
    CASE
      WHEN COUNT(DISTINCT DATE_TRUNC('month', cb.created_at)) >= 6 THEN 'high'
      WHEN COUNT(DISTINCT DATE_TRUNC('month', cb.created_at)) >= 3 THEN 'medium'
      ELSE 'low'
    END                                           AS delivery_frequency,
    (f.consent_timestamp IS NOT NULL)             AS has_consent
  FROM farms f
  LEFT JOIN collection_batches cb ON cb.farm_id = f.id
  LEFT JOIN bags b ON b.collection_batch_id = cb.id
  WHERE f.org_id = p_org_id
  GROUP BY f.id, f.farmer_name, f.org_id, f.community,
           f.area_hectares, f.commodity, f.consent_timestamp
  ORDER BY f.farmer_name ASC;
$$;
