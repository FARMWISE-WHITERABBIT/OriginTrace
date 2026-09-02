BEGIN;

-- Applies the parts of supabase/migrations/20260720_120000_fix_boundary_conflicts.sql
-- that were never actually run against the live database (see CLAUDE.md's
-- migration-drift notes and app/api/conflicts/scan/route.ts, which has been
-- falling back to a JS-only detector because scan_farm_boundary_conflicts()
-- didn't exist).
--
-- This is NOT a verbatim re-run of that file. Two things it assumed no
-- longer hold on the live DB, verified before writing this migration:
--   1. farm_conflicts.org_id / updated_at already exist (added by an earlier
--      migration) — the ALTER TABLE / backfill for those is skipped here.
--   2. sync_farm_boundary_geo() / the sync_farm_boundary trigger already
--      exist, with an equivalent (ST_GeogFromGeoJSON-based) implementation —
--      left untouched rather than replaced, to avoid changing working
--      behaviour.
-- What was genuinely missing, and is applied below:
--   - A unique index on farm_conflicts(farm_a_id, farm_b_id). Without it,
--     check_farm_overlap()'s `ON CONFLICT (farm_a_id, farm_b_id) DO UPDATE`
--     would fail at runtime with "no unique or exclusion constraint
--     matching the ON CONFLICT specification" the first time two farm
--     boundaries actually overlapped — confirmed no duplicate pairs exist
--     in farm_conflicts today, so this is safe to add.
--   - check_farm_overlap() + its AFTER trigger on farms.
--   - scan_farm_boundary_conflicts(), the PostGIS RPC that
--     app/api/conflicts/scan/route.ts calls.
--   - The boundary_geo backfill for farms that predate the sync trigger
--     (27 farms currently have boundary set but boundary_geo NULL).

CREATE UNIQUE INDEX IF NOT EXISTS idx_farm_conflicts_farm_pair
  ON farm_conflicts (farm_a_id, farm_b_id);

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

-- Backfill boundary_geo for farms that predate the sync trigger. The
-- existing sync_farm_boundary_geo() validates/converts the GeoJSON and
-- safely nulls malformed boundaries; the no-op-looking SET fires that
-- trigger, and now also trigger_check_farm_overlap for any real conflicts
-- this surfaces among previously-unchecked farms.
UPDATE farms
SET boundary = boundary
WHERE boundary IS NOT NULL
  AND boundary_geo IS NULL;

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
