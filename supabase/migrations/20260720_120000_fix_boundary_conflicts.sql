BEGIN;

-- farm_conflicts is tenant data. Older snapshots created this table without
-- org_id, which made the service-role scan unable to isolate conflicts.
ALTER TABLE farm_conflicts
  ADD COLUMN IF NOT EXISTS org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

UPDATE farm_conflicts fc
SET org_id = fa.org_id
FROM farms fa
WHERE fc.org_id IS NULL
  AND fa.id = fc.farm_a_id;

CREATE INDEX IF NOT EXISTS idx_farm_conflicts_org_status
  ON farm_conflicts (org_id, status);

-- Install the GeoJSON -> PostGIS synchronization trigger here as well as in
-- schema.sql. Older databases were created from migrations that never added
-- this trigger, leaving boundary_geo NULL even when boundary JSON was valid.
CREATE OR REPLACE FUNCTION sync_farm_boundary_geo()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.boundary IS NOT NULL AND NEW.boundary->>'type' = 'Polygon' THEN
    BEGIN
      NEW.boundary_geo = ST_SetSRID(ST_GeomFromGeoJSON(NEW.boundary::text), 4326)::geography;
      NEW.area_hectares = ROUND((ST_Area(NEW.boundary_geo) / 10000)::NUMERIC, 2);
    EXCEPTION WHEN OTHERS THEN
      NEW.boundary_geo = NULL;
      NEW.area_hectares = NULL;
    END;
  ELSE
    NEW.boundary_geo = NULL;
    NEW.area_hectares = NULL;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public, extensions;

DROP TRIGGER IF EXISTS sync_farm_boundary ON farms;
CREATE TRIGGER sync_farm_boundary
  BEFORE INSERT OR UPDATE OF boundary ON farms
  FOR EACH ROW EXECUTE FUNCTION sync_farm_boundary_geo();

-- Use the PostGIS geography column for the exact intersection and area
-- calculation. The previous AFTER trigger assigned NEW.conflict_status (which
-- is ignored by PostgreSQL in an AFTER trigger) and used a legacy 'detected'
-- status. Both farms now receive the canonical conflict_status = 'conflict'.
CREATE OR REPLACE FUNCTION check_farm_overlap()
RETURNS TRIGGER AS $$
DECLARE
  conflict_farm RECORD;
  intersection_area DOUBLE PRECISION;
  overlap_ratio DOUBLE PRECISION;
BEGIN
  IF NEW.boundary_geo IS NULL THEN
    RETURN NEW;
  END IF;

  FOR conflict_farm IN
    SELECT id, org_id, boundary_geo
    FROM farms
    WHERE id <> NEW.id
      AND org_id = NEW.org_id
      AND boundary_geo IS NOT NULL
      AND ST_Intersects(NEW.boundary_geo, boundary_geo)
  LOOP
    intersection_area := ST_Area(ST_Intersection(NEW.boundary_geo, conflict_farm.boundary_geo));
    IF intersection_area <= 0 THEN
      CONTINUE;
    END IF;

    overlap_ratio := intersection_area / NULLIF(
      LEAST(ST_Area(NEW.boundary_geo), ST_Area(conflict_farm.boundary_geo)), 0
    );

    IF overlap_ratio >= 0.10 THEN
      INSERT INTO farm_conflicts (
        org_id, farm_a_id, farm_b_id, overlap_ratio, status, updated_at
      )
      VALUES (
        NEW.org_id,
        LEAST(NEW.id, conflict_farm.id),
        GREATEST(NEW.id, conflict_farm.id),
        overlap_ratio,
        'pending',
        NOW()
      )
      ON CONFLICT (farm_a_id, farm_b_id) DO UPDATE
        SET org_id = EXCLUDED.org_id,
            overlap_ratio = EXCLUDED.overlap_ratio,
            status = 'pending',
            updated_at = NOW();

      UPDATE farms
      SET conflict_status = 'conflict'
      WHERE org_id = NEW.org_id
        AND id IN (NEW.id, conflict_farm.id);
    END IF;
  END LOOP;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions;

DROP TRIGGER IF EXISTS trigger_check_farm_overlap ON farms;
CREATE TRIGGER trigger_check_farm_overlap
  AFTER INSERT OR UPDATE OF boundary, boundary_geo ON farms
  FOR EACH ROW EXECUTE FUNCTION check_farm_overlap();

-- Backfill the PostGIS geography column for farms created before the sync
-- trigger was installed. The existing sync trigger validates/converts the
-- GeoJSON and safely nulls malformed boundaries.
UPDATE farms
SET boundary = boundary
WHERE boundary IS NOT NULL
  AND boundary_geo IS NULL;

-- Canonical scan path for concave polygons. The JavaScript detector remains a
-- compatibility fallback for installations that have not applied this
-- migration yet, but production scans use this PostGIS function.
CREATE OR REPLACE FUNCTION scan_farm_boundary_conflicts(
  p_org_id UUID,
  p_min_overlap_ratio DOUBLE PRECISION DEFAULT 0.10
)
RETURNS TABLE (
  farm_a_id UUID,
  farm_b_id UUID,
  overlap_ratio NUMERIC
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
  WITH pairs AS (
    SELECT
      a.id AS farm_a_id,
      b.id AS farm_b_id,
      a.boundary_geo AS boundary_a,
      b.boundary_geo AS boundary_b
    FROM farms a
    JOIN farms b
      ON a.org_id = b.org_id
     AND a.id < b.id
    WHERE a.org_id = p_org_id
      AND a.boundary_geo IS NOT NULL
      AND b.boundary_geo IS NOT NULL
      AND ST_Intersects(a.boundary_geo, b.boundary_geo)
  ), measured AS (
    SELECT
      farm_a_id,
      farm_b_id,
      ST_Area(ST_Intersection(boundary_a, boundary_b)) AS intersection_area,
      LEAST(ST_Area(boundary_a), ST_Area(boundary_b)) AS minimum_area
    FROM pairs
  )
  SELECT
    farm_a_id,
    farm_b_id,
    (intersection_area / NULLIF(minimum_area, 0))::NUMERIC AS overlap_ratio
  FROM measured
  WHERE intersection_area > 0
    AND intersection_area / NULLIF(minimum_area, 0) >= p_min_overlap_ratio;
$$;

COMMIT;
