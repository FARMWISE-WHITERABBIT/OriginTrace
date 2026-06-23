---
name: geospatial
description: >
  Use this skill when working with farm boundary mapping, GeoJSON data,
  Leaflet maps, PostGIS spatial queries, spatial conflict detection, boundary
  authenticity analysis, or any feature that involves geographic coordinates.
  Triggers for any mention of "farm boundary", "polygon", "GeoJSON", "Leaflet",
  "PostGIS", "map", "coordinates", "spatial conflict", "deforestation overlay",
  "geo data", "draw on map", "boundary analysis", or "authenticity score".
  Always use this skill before writing any geospatial code — the PostGIS
  setup, GeoJSON conventions, and Leaflet integration have specific patterns
  this project follows.
---

# Geospatial Skill

## 1. Overview

Farm boundaries are the foundation of OriginTrace's deforestation risk scoring
and EUDR compliance. Every farm has a GeoJSON polygon stored in PostGIS; the
system detects spatial conflicts and analyzes boundary authenticity.

---

## 2. Stack

| Layer | Technology |
|-------|-----------|
| Map UI | Leaflet + React-Leaflet (dynamic import, SSR-safe) |
| GeoJSON storage | Supabase PostGIS (`GEOMETRY(Polygon, 4326)`) |
| Spatial queries | PostGIS functions via Supabase RPC |
| Deforestation overlays | GFW (Global Forest Watch) API |
| Coordinate system | WGS 84 (EPSG:4326) — always |
| Polygon utilities | `lib/geometry/polygon.ts` |
| Boundary analysis | `lib/services/boundary-analysis.ts` |

---

## 3. Database Schema

```sql
CREATE TABLE farms (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id     UUID NOT NULL REFERENCES organisations(id),
  name       TEXT NOT NULL,
  country    TEXT NOT NULL,
  area_ha    NUMERIC GENERATED ALWAYS AS (
               ST_Area(boundary::geography) / 10000
             ) STORED,
  boundary   GEOMETRY(Polygon, 4326),
  centroid   GEOMETRY(Point, 4326) GENERATED ALWAYS AS (
               ST_Centroid(boundary)
             ) STORED,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_farms_boundary ON farms USING GIST (boundary);
CREATE INDEX idx_farms_centroid  ON farms USING GIST (centroid);
```

---

## 4. GeoJSON Conventions

All GeoJSON uses **WGS84 (EPSG:4326)** with coordinates as `[longitude, latitude]`.

- Use `Polygon` or `MultiPolygon` for farm boundaries.
- First and last vertex must be identical (closed ring).
- Helpers live in `lib/geometry/polygon.ts`.

---

## 5. Boundary Authenticity Analysis

`lib/services/boundary-analysis.ts` scores polygons across five dimensions:

1. **Shape Regularity**: CV of angles — natural farms are irregular.
2. **Vertex Spacing**: CV of edge lengths — GPS-walked = variable.
3. **Area Plausibility**: Hectares vs commodity-typical ranges.
4. **Location Plausibility**: Centroid in known agricultural zone.
5. **Edge Straightness**: Cardinal alignment = suspicious.

Result: `confidence_score` (0–1) and `confidence_level` ('high'|'medium'|'low').

---

## 6. Leaflet Map Component

Leaflet must be dynamically imported — it uses `window` and breaks SSR.

```typescript
// components/farm-polygon-map.tsx
'use client'
import dynamic from 'next/dynamic'
const MapContainer = dynamic(
  () => import('react-leaflet').then(m => m.MapContainer),
  { ssr: false }
)
```

> **Important:** Leaflet uses `[lat, lng]`; GeoJSON uses `[lng, lat]`.

---

## 7. Saving a Farm Boundary

```typescript
const { error } = await supabase.rpc('update_farm_boundary', {
  p_farm_id: farmId, p_org_id: orgId,
  p_geojson: JSON.stringify(geojson),
})
```

```sql
CREATE OR REPLACE FUNCTION update_farm_boundary(
  p_farm_id UUID, p_org_id UUID, p_geojson TEXT
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE farms
  SET boundary = ST_SetSRID(ST_GeomFromGeoJSON(p_geojson), 4326)
  WHERE id = p_farm_id AND org_id = p_org_id;
END; $$;
```

---

## 8. Spatial Conflict Detection

```sql
CREATE OR REPLACE FUNCTION check_boundary_conflicts(
  p_org_id UUID, p_farm_id UUID, p_geojson TEXT
) RETURNS TABLE(conflicting_farm_id UUID, conflict_type TEXT, overlap_ha NUMERIC)
LANGUAGE plpgsql AS $$
DECLARE new_boundary GEOMETRY;
BEGIN
  new_boundary := ST_SetSRID(ST_GeomFromGeoJSON(p_geojson), 4326);
  RETURN QUERY
  SELECT f.id, 'boundary_overlap'::TEXT,
    ROUND((ST_Area(ST_Intersection(f.boundary, new_boundary)::geography) / 10000)::NUMERIC, 2)
  FROM farms f
  WHERE f.org_id = p_org_id AND f.id != p_farm_id
    AND ST_Intersects(f.boundary, new_boundary);
END; $$;
```

---

## 9. Reading Geometry

Always use `ST_AsGeoJSON` when reading geometry columns:

```sql
SELECT id, name, area_ha,
  ST_AsGeoJSON(boundary)::json AS boundary,
  ST_AsGeoJSON(centroid)::json AS centroid
FROM farms WHERE org_id = $1;
```

```typescript
const geometry = typeof farm.boundary === 'string'
  ? JSON.parse(farm.boundary) : farm.boundary
```

---

## 10. Gotchas

- **Leaflet must be dynamically imported** (`ssr: false`). Without `dynamic()`, `window is not defined`.
- **GeoJSON [lng, lat] vs Leaflet [lat, lng]** — most common bug.
- **Polygons must be closed.** First and last coordinate must match.
- **`ST_GeomFromGeoJSON` requires valid JSON** — use `JSON.stringify()`.
- **Spatial indexes are essential.** Without GIST index, `ST_Intersects` does full table scan.
- **Min 4 vertices** for authenticity scoring. Triangles return mid-range confidence.
- **After boundary edits, re-run authenticity analysis.**
