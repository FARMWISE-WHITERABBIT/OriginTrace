'use client';

/**
 * ConflictMap — Leaflet map for boundary conflict visualisation.
 *
 * Renders two overlapping farm polygons and their intersection zone:
 *   Farm A  → blue (#3B82F6)
 *   Farm B  → red  (#EF4444)
 *   Overlap → amber (#F59E0B)
 *
 * Imported with `next/dynamic + ssr:false` from the conflicts page so
 * Leaflet's window-dependent code never runs during SSR.
 */

import { useEffect, useRef } from 'react';
import { intersectPolygons } from '@/lib/geometry/polygon';

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
  const mapRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    let map: any;

    async function initMap() {
      // Dynamic import keeps Leaflet off the SSR bundle
      const L = (await import('leaflet')).default;
      // Leaflet CSS is loaded via live-supply-map.tsx at the app level;
      // no need to duplicate the import here.

      if (mapRef.current) return; // already initialised (StrictMode double-invoke)

      const ringA: Coord[] = (farmA.boundary?.coordinates?.[0] ?? []) as Coord[];
      const ringB: Coord[] = (farmB.boundary?.coordinates?.[0] ?? []) as Coord[];

      // Combine all coords to find a centre + bounds
      const allCoords = [...ringA, ...ringB];
      if (allCoords.length === 0) return;

      const lngs = allCoords.map((c) => c[0]);
      const lats = allCoords.map((c) => c[1]);
      const midLat = (Math.min(...lats) + Math.max(...lats)) / 2;
      const midLng = (Math.min(...lngs) + Math.max(...lngs)) / 2;

      map = L.map(containerRef.current!, {
        center: [midLat, midLng],
        zoom: 15,
        zoomControl: true,
        scrollWheelZoom: true,
      });
      mapRef.current = map;

      // CartoDB Positron — clean basemap with no Leaflet attribution issues
      L.tileLayer(
        'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
        {
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/">CARTO</a>',
          subdomains: 'abcd',
          maxZoom: 20,
        }
      ).addTo(map);

      // Leaflet wants [lat, lng] — swap from GeoJSON [lng, lat]
      const toLatLng = (c: Coord): [number, number] => [c[1], c[0]];

      if (ringA.length >= 3) {
        L.polygon(ringA.map(toLatLng), {
          color: '#2563EB',
          fillColor: '#3B82F6',
          fillOpacity: 0.25,
          weight: 2.5,
        }).addTo(map).bindPopup(`<b>${farmA.farmer_name}</b><br>Farm A`);
      }

      if (ringB.length >= 3) {
        L.polygon(ringB.map(toLatLng), {
          color: '#DC2626',
          fillColor: '#EF4444',
          fillOpacity: 0.25,
          weight: 2.5,
        }).addTo(map).bindPopup(`<b>${farmB.farmer_name}</b><br>Farm B`);
      }

      // Compute and render intersection polygon
      if (ringA.length >= 3 && ringB.length >= 3) {
        const intersection = intersectPolygons(ringA, ringB);
        if (intersection.length >= 3) {
          L.polygon(intersection.map(toLatLng), {
            color: '#D97706',
            fillColor: '#F59E0B',
            fillOpacity: 0.55,
            weight: 2,
            dashArray: '4 3',
          }).addTo(map).bindPopup('Overlap zone');
        }
      }

      // Fit map to show all polygons
      if (allCoords.length > 0) {
        const bounds = L.latLngBounds(allCoords.map(toLatLng));
        map.fitBounds(bounds, { padding: [30, 30] });
      }
    }

    initMap();

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [farmA.id, farmB.id]);

  return (
    <div className={`relative ${className}`}>
      <div ref={containerRef} className="h-full w-full rounded-lg overflow-hidden" />
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
