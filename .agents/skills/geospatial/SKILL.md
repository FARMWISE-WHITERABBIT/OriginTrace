---
name: geospatial
description: >
  Use this skill when working with farm boundary mapping, GeoJSON data,
  Leaflet maps, PostGIS spatial queries, spatial conflict detection, or any
  feature that involves geographic coordinates. Triggers for any mention of
  "farm boundary", "polygon", "GeoJSON", "Leaflet", "PostGIS", "map",
  "coordinates", "spatial conflict", "deforestation overlay", "geo data",
  or "draw on map". Always use this skill before writing any geospatial code —
  the PostGIS setup, GeoJSON conventions, and Leaflet integration have specific
  patterns this project follows.
---

# Geospatial Skill

## 1. Overview

**Mission:** Farm boundaries are the foundation of OriginTrace's deforestation
risk scoring. Every farm has a GeoJSON polygon stored in PostGIS; the system
detects spatial conflicts with protected areas, deforestation alerts, and
overlapping farm boundaries.

---

## 2. Stack

| Layer | Technology |
|-------|-----------|
| Map UI | Leaflet + React-Leaflet |
| GeoJSON storage | Supabase PostGIS (`GEOMETRY(Polygon, 4326)`) |
| Spatial queries | PostGIS functions via Supabase RPC |
| Deforestation overlays | GFW (Global Forest Watch) API |
| Coordinate system | WGS 84 (EPSG:4326) — always |

---

## 3. Database Schema

```sql
-- Farm boundary stored as PostGIS geometry
CREATE TABLE farms (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id     UUID NOT NULL REFERENCES organisations(id),
  name       TEXT NOT NULL,
  country    TEXT NOT NULL,                       -- ISO 3166-1 alpha-2
  area_ha    NUMERIC GENERATED ALWAYS AS (        -- computed from geometry
               ST_Area(boundary::geography) / 10000
             ) STORED,
  boundary   GEOMETRY(Polygon, 4326),             -- the polygon in WGS84
  centroid   GEOMETRY(Point, 4326) GENERATED ALWAYS AS (
               ST_Centroid(boundary)
             ) STORED,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Spatial index (essential for performance)
CREATE INDEX idx_farms_boundary ON farms USING GIST (boundary);
CREATE INDEX idx_farms_centroid  ON farms USING GIST (centroid);
```

---

## 4. GeoJSON Conventions

All GeoJSON in this project uses **WGS84 (EPSG:4326)** with coordinates as
`[longitude, latitude]` (GeoJSON standard — note: not lat/lng).

```typescript
// lib/geo/types.ts
export interface FarmPolygon {
  type: 'Polygon'
  coordinates: number[][][]   // [[[lng, lat], [lng, lat], ...]]  — must close (first = last point)
}

export interface FarmFeature {
  type: 'Feature'
  geometry: FarmPolygon
  properties: {
    farmId:   string
    farmName: string
    areaHa:   number
    orgId:    string
  }
}

// Helper: close a polygon if the user forgot to repeat the first point
export function closedPolygon(coords: number[][]): number[][] {
  const first = coords[0]
  const last  = coords[coords.length - 1]
  if (first[0] === last[0] && first[1] === last[1]) return coords
  return [...coords, first]
}
```

---

## 5. Leaflet Map Component

```typescript
// components/maps/FarmMap.tsx
'use client'
import dynamic from 'next/dynamic'

// Leaflet must be dynamically imported — it uses `window` and breaks SSR
const MapContainer = dynamic(
  () => import('react-leaflet').then(m => m.MapContainer),
  { ssr: false }
)

import { MapContainer, TileLayer, GeoJSON, FeatureGroup } from 'react-leaflet'
import { EditControl } from 'react-leaflet-draw'
import type { FarmFeature } from '@/lib/geo/types'

interface FarmMapProps {
  farms:       FarmFeature[]
  center?:     [number, number]    // [lat, lng] — Leaflet uses lat/lng order
  zoom?:       number
  editable?:   boolean
  onBoundaryChange?: (geojson: FarmPolygon) => void
}

export function FarmMap({ farms, center = [5.5, -0.2], zoom = 10, editable, onBoundaryChange }: FarmMapProps) {
  return (
    <MapContainer center={center} zoom={zoom} style={{ height: '500px', width: '100%' }}>
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='© OpenStreetMap contributors'
      />

      {/* Render existing farm boundaries */}
      {farms.map(farm => (
        <GeoJSON
          key={farm.properties.farmId}
          data={farm}
          style={{ color: '#16a34a', weight: 2, fillOpacity: 0.15 }}
        />
      ))}

      {/* Editable draw control */}
      {editable && (
        <FeatureGroup>
          <EditControl
            position="topright"
            onCreated={e => {
              const geojson = e.layer.toGeoJSON().geometry as FarmPolygon
              onBoundaryChange?.(geojson)
            }}
            draw={{ polygon: true, rectangle: false, circle: false,
                    circlemarker: false, marker: false, polyline: false }}
          />
        </FeatureGroup>
      )}
    </MapContainer>
  )
}
```

> **Important:** Leaflet uses `[lat, lng]` for its `center` prop, but GeoJSON uses `[lng, lat]` for coordinates. Don't mix them up.

---

## 6. Saving a Farm Boundary

```typescript
// In your API route (app/api/farms/route.ts)
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'

async function saveFarmBoundary(farmId: string, geojson: FarmPolygon, orgId: string) {
  const supabase = createRouteHandlerClient({ cookies })

  // Convert GeoJSON to WKT for PostGIS — or use ST_GeomFromGeoJSON
  const { error } = await supabase.rpc('update_farm_boundary', {
    p_farm_id:  farmId,
    p_org_id:   orgId,
    p_geojson:  JSON.stringify(geojson),
  })
  if (error) throw error
}
```

```sql
-- supabase/migrations/YYYYMMDD_update_farm_boundary_fn.sql
CREATE OR REPLACE FUNCTION update_farm_boundary(
  p_farm_id UUID,
  p_org_id  UUID,
  p_geojson TEXT
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER    -- runs as owner, not caller — needed for RLS bypass in RPC
AS $$
BEGIN
  UPDATE farms
  SET boundary = ST_SetSRID(ST_GeomFromGeoJSON(p_geojson), 4326)
  WHERE id = p_farm_id AND org_id = p_org_id;
END;
$$;
```

---

## 7. Spatial Conflict Detection

Detects if a new farm boundary overlaps with existing farms in the same org,
or intersects with known deforestation risk zones.

```sql
-- Check for boundary overlaps with other farms in the same org
CREATE OR REPLACE FUNCTION check_boundary_conflicts(
  p_org_id    UUID,
  p_farm_id   UUID,          -- the farm being checked (exclude from results)
  p_geojson   TEXT
) RETURNS TABLE(conflicting_farm_id UUID, conflict_type TEXT, overlap_ha NUMERIC)
LANGUAGE plpgsql AS $$
DECLARE
  new_boundary GEOMETRY;
BEGIN
  new_boundary := ST_SetSRID(ST_GeomFromGeoJSON(p_geojson), 4326);

  -- Overlap with existing farms
  RETURN QUERY
  SELECT
    f.id,
    'boundary_overlap'::TEXT,
    ROUND((ST_Area(ST_Intersection(f.boundary, new_boundary)::geography) / 10000)::NUMERIC, 2)
  FROM farms f
  WHERE f.org_id = p_org_id
    AND f.id != p_farm_id
    AND ST_Intersects(f.boundary, new_boundary);
END;
$$;
```

```typescript
// lib/geo/conflicts.ts
export async function detectBoundaryConflicts(
  farmId: string,
  orgId:  string,
  geojson: FarmPolygon
): Promise<ConflictResult[]> {
  const { data, error } = await supabase.rpc('check_boundary_conflicts', {
    p_org_id:  orgId,
    p_farm_id: farmId,
# Geospatial Skill

## 1. Overview

**Mission:** Compliance with EUDR and other regulations requires precise farm boundary polygons. OriginTrace doesn't just store GeoJSON; it analyzes it for authenticity to ensure polygons were GPS-walked rather than simply drawn on a map.

---

## 2. Boundary Authenticity Analysis (`lib/services/boundary-analysis.ts`)

The `analyzeBoundaryAuthenticity` function scores polygons across five dimensions:

1. **Shape Regularity**: Uses Coefficient of Variation (CV) of angles. Natural farms have irregular angles; near-perfect rectangles are flagged as suspicious.
2. **Vertex Spacing**: CV of edge lengths. GPS-walked boundaries have variable spacing; uniform spacing suggests manual drawing.
3. **Area Plausibility**: Compares calculated area (hectares) against typical ranges for the specific commodity (e.g., Cocoa: 0.2 - 30 ha).
4. **Location Plausibility**: Verifies the centroid falls within a known tropical/subtropical agricultural zone.
5. **Edge Straightness**: Checks alignment to cardinal directions (grid-like patterns are penalized).

---

## 3. GeoJSON Conventions

Always use `Polygon` or `MultiPolygon` for farm boundaries.
- **CRS**: All data is stored in `EPSG:4326` (WGS 84).
- **Validation**: Every farm boundary must be a valid GeoJSON object. Triggers in `supabase/schema.sql` handle the conversion to PostGIS `geography` types.

---

## 4. UI Mapping (Leaflet)

Farms are visualized using standard Leaflet components.
- **Overlay**: Deforestation data (from Global Forest Watch) is overlaid on farm polygons to visualy verify compliance.
- **Editing**: Use `Leaflet.draw` for manual boundary correction, but always trigger a re-analysis of authenticity after changes.

---

## 5. Gotchas

- **Closed Rings**: GeoJSON requires the first and last vertex of a polygon to be identical. The analysis logic automatically handles the removal of the duplicate point for calculations.
- **Minimum Vertices**: Authenticity scoring requires at least 4 vertices. Triangles are hard to score accurately and return mid-range confidence.
- **PostGIS Efficiency**: Use `ST_Intersects` or `ST_DWithin` for spatial joins (e.g., checking if a batch collection point is inside the farm's boundary).

-- Always use ST_AsGeoJSON when reading geometry columns
SELECT
  id,
  name,
  area_ha,
  ST_AsGeoJSON(boundary)::json AS boundary,
  ST_AsGeoJSON(centroid)::json  AS centroid
FROM farms
WHERE org_id = $1;
```

In TypeScript, parse the returned `boundary` field as JSON:
```typescript
const farm = rawFarm as { boundary: string | FarmPolygon }
const geometry: FarmPolygon = typeof farm.boundary === 'string'
  ? JSON.parse(farm.boundary)
  : farm.boundary
```

---

## 9. Gotchas

- **Leaflet must be dynamically imported** (`ssr: false`). Any import of `react-leaflet` in a server component or without `dynamic()` will throw `window is not defined`.
- **GeoJSON uses [lng, lat]; Leaflet uses [lat, lng].** This is the most common bug. Be explicit: `const center: [lat, lng] = [geojson.coordinates[0][1], geojson.coordinates[0][0]]`.
- **Polygons must be closed.** The first and last coordinate pair must be identical. Use `closedPolygon()` helper before saving.
- **ST_GeomFromGeoJSON requires valid JSON** — run `JSON.stringify()` on the object before passing to PostGIS RPC.
- **Spatial indexes are essential.** Without the GIST index on `boundary`, any `ST_Intersects` query will do a full table scan. Always add `USING GIST` indexes on geometry columns.
