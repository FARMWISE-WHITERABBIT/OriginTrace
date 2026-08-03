'use client';

/**
 * ConflictMap — MapLibre map for boundary conflict visualisation.
 *
 * Renders two overlapping farm polygons and their intersection zone:
 *   Farm A  → blue (#3B82F6)
 *   Farm B  → red  (#EF4444)
 *   Overlap → amber (#F59E0B)
 *
 * Imported with `next/dynamic + ssr:false` from the conflicts page so
 * MapLibre's window-dependent code never runs during SSR.
 */

import { useMemo, useState } from 'react';
import { intersectPolygons } from '@/lib/geometry/polygon';
import Map, { Source, Layer, Popup } from 'react-map-gl/maplibre';
import 'maplibre-gl/dist/maplibre-gl.css';
import bbox from '@turf/bbox';
import { featureCollection, polygon } from '@turf/helpers';

type Coord = [number, number]; // [lng, lat]

interface Farm {
  id: number;
  farmer_name: string;
  boundary: { type?: string; coordinates: number[][][] } | null;
}

interface ConflictMapProps {
  farmA: Farm;
  farmB: Farm;
  className?: string;
}

export default function ConflictMap({ farmA, farmB, className = '' }: ConflictMapProps) {
  const [hoverInfo, setHoverInfo] = useState<{
    lngLat: [number, number];
    label: string;
    subLabel: string;
  } | null>(null);

  const geojson = useMemo(() => {
    const ringA: Coord[] = (farmA.boundary?.coordinates?.[0] ?? []) as Coord[];
    const ringB: Coord[] = (farmB.boundary?.coordinates?.[0] ?? []) as Coord[];

    const features: any[] = [];

    if (ringA.length >= 3) {
      features.push({
        type: 'Feature',
        properties: { id: 'farmA', label: farmA.farmer_name, subLabel: 'Farm A', color: '#3B82F6', outline: '#2563EB' },
        geometry: { type: 'Polygon', coordinates: [ringA] }
      });
    }

    if (ringB.length >= 3) {
      features.push({
        type: 'Feature',
        properties: { id: 'farmB', label: farmB.farmer_name, subLabel: 'Farm B', color: '#EF4444', outline: '#DC2626' },
        geometry: { type: 'Polygon', coordinates: [ringB] }
      });
    }

    if (ringA.length >= 3 && ringB.length >= 3) {
      const intersection = intersectPolygons(ringA, ringB);
      if (intersection.length >= 3) {
        features.push({
          type: 'Feature',
          properties: { id: 'overlap', label: 'Overlap Zone', subLabel: 'Conflict Area', color: '#F59E0B', outline: '#D97706', isOverlap: true },
          geometry: { type: 'Polygon', coordinates: [intersection] }
        });
      }
    }

    return { type: 'FeatureCollection', features };
  }, [farmA, farmB]);

  const initialBounds = useMemo(() => {
    if (geojson.features.length === 0) return undefined;
    const fc = featureCollection(geojson.features.map(f => polygon(f.geometry.coordinates)));
    const [minLng, minLat, maxLng, maxLat] = bbox(fc);
    return [
      [minLng, minLat],
      [maxLng, maxLat]
    ] as [[number, number], [number, number]];
  }, [geojson]);

  if (geojson.features.length === 0) {
    return <div className={`bg-slate-100 rounded-lg flex items-center justify-center text-slate-400 ${className}`}>No boundaries available</div>;
  }

  return (
    <div className={`relative ${className}`}>
      <div className="h-full w-full rounded-lg overflow-hidden border border-border shadow-sm">
        <Map
          initialViewState={{
            bounds: initialBounds,
            fitBoundsOptions: { padding: 40 }
          }}
          mapStyle="https://basemaps.cartocdn.com/gl/positron-gl-style/style.json"
          interactiveLayerIds={['farms-fill', 'overlap-fill']}
          onMouseMove={(e) => {
            if (e.features && e.features.length > 0) {
              const feature = e.features[0];
              setHoverInfo({
                lngLat: [e.lngLat.lng, e.lngLat.lat],
                label: feature.properties.label,
                subLabel: feature.properties.subLabel
              });
            } else {
              setHoverInfo(null);
            }
          }}
          onMouseLeave={() => setHoverInfo(null)}
        >
          <Source type="geojson" data={geojson as any}>
            <Layer
              id="farms-fill"
              type="fill"
              filter={['!=', 'isOverlap', true]}
              paint={{
                'fill-color': ['get', 'color'],
                'fill-opacity': 0.25
              }}
            />
            <Layer
              id="farms-outline"
              type="line"
              filter={['!=', 'isOverlap', true]}
              paint={{
                'line-color': ['get', 'outline'],
                'line-width': 2.5
              }}
            />
            <Layer
              id="overlap-fill"
              type="fill"
              filter={['==', 'isOverlap', true]}
              paint={{
                'fill-color': ['get', 'color'],
                'fill-opacity': 0.55
              }}
            />
            <Layer
              id="overlap-outline"
              type="line"
              filter={['==', 'isOverlap', true]}
              paint={{
                'line-color': ['get', 'outline'],
                'line-width': 2,
                'line-dasharray': [2, 1]
              }}
            />
          </Source>

          {hoverInfo && (
            <Popup
              longitude={hoverInfo.lngLat[0]}
              latitude={hoverInfo.lngLat[1]}
              closeButton={false}
              closeOnClick={false}
              anchor="bottom"
              className="z-50"
            >
              <div className="text-sm p-1">
                <strong className="block text-foreground">{hoverInfo.label}</strong>
                <span className="text-muted-foreground">{hoverInfo.subLabel}</span>
              </div>
            </Popup>
          )}
        </Map>
      </div>

      {/* Legend */}
      <div className="absolute bottom-3 left-3 z-[400] flex flex-col gap-1 bg-white/90 backdrop-blur-sm rounded-md px-3 py-2 text-xs shadow border border-border/50">
        <div className="flex items-center gap-2">
          <span className="h-2.5 w-5 rounded-sm bg-blue-500/50 border border-blue-600 shrink-0" />
          <span className="font-medium">{farmA.farmer_name}</span>
          <span className="text-muted-foreground">(Farm A)</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="h-2.5 w-5 rounded-sm bg-red-500/50 border border-red-600 shrink-0" />
          <span className="font-medium">{farmB.farmer_name}</span>
          <span className="text-muted-foreground">(Farm B)</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="h-2.5 w-5 rounded-sm bg-amber-400/60 border border-amber-600 border-dashed shrink-0" />
          <span className="text-muted-foreground">Overlap zone</span>
        </div>
      </div>
    </div>
  );
}
