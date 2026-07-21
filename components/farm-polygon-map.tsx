'use client';

import { useMemo, useState, useRef, useEffect, useCallback } from 'react';
import { Loader2, Layers, Plus, Minus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Map, { Source, Layer, Popup, MapRef } from 'react-map-gl/maplibre';
import 'maplibre-gl/dist/maplibre-gl.css';
import bbox from '@turf/bbox';
import { featureCollection, polygon } from '@turf/helpers';

export interface FarmMapFarm {
  id: string;
  farmer_name: string;
  community: string | null;
  commodity: string | null;
  compliance_status: string;
  area_hectares: number | null;
  boundary: { type: string; coordinates: number[][][] } | null;
}

interface FarmPolygonMapProps {
  farms: FarmMapFarm[];
  selectedFarmId?: string | null;
  onSelectFarm: (farm: FarmMapFarm | null) => void;
  loading?: boolean;
}

const STATUS_COLORS: Record<string, string> = {
  approved: '#16a34a',
  pending:  '#f59e0b',
  rejected: '#dc2626',
};

export default function FarmPolygonMap({ farms, selectedFarmId, onSelectFarm, loading = false }: FarmPolygonMapProps) {
  const mapRef = useRef<MapRef>(null);
  const [hoverInfo, setHoverInfo] = useState<{
    lngLat: [number, number];
    farm: FarmMapFarm;
  } | null>(null);
  const [tileLayer, setTileLayer] = useState<'satellite' | 'street'>('satellite');

  const geojson = useMemo(() => {
    const features = farms.filter(f => f.boundary?.coordinates?.[0]).map(farm => {
      const isSelected = farm.id === selectedFarmId;
      const baseColor = STATUS_COLORS[farm.compliance_status] || '#94a3b8';
      return {
        type: 'Feature',
        properties: {
          id: farm.id,
          farmer_name: farm.farmer_name,
          community: farm.community,
          compliance_status: farm.compliance_status,
          area_hectares: farm.area_hectares,
          color: baseColor,
          isSelected,
          farmData: farm, // store full object for popup
        },
        geometry: {
          type: 'Polygon',
          coordinates: farm.boundary!.coordinates
        }
      };
    });
    return { type: 'FeatureCollection', features };
  }, [farms, selectedFarmId]);

  useEffect(() => {
    if (selectedFarmId && mapRef.current) {
      const farm = farms.find(f => f.id === selectedFarmId);
      if (farm?.boundary?.coordinates?.[0]) {
        const p = polygon(farm.boundary.coordinates);
        const [minLng, minLat, maxLng, maxLat] = bbox(p);
        mapRef.current.fitBounds(
          [[minLng, minLat], [maxLng, maxLat]],
          { padding: 50, duration: 1000 }
        );
      }
    }
  }, [selectedFarmId, farms]);

  const initialBounds = useMemo(() => {
    if (geojson.features.length === 0) return undefined;
    const fc = featureCollection(geojson.features.map((f: any) => polygon(f.geometry.coordinates)));
    const [minLng, minLat, maxLng, maxLat] = bbox(fc);
    return [
      [minLng, minLat],
      [maxLng, maxLat]
    ] as [[number, number], [number, number]];
  }, [geojson.features.length]); // Only compute on length change to avoid jumping

  const onClick = useCallback((e: any) => {
    if (e.features && e.features.length > 0) {
      const feature = e.features[0];
      const clickedFarm = farms.find(f => f.id === feature.properties.id);
      if (clickedFarm) {
        onSelectFarm(clickedFarm.id === selectedFarmId ? null : clickedFarm);
      }
    } else {
      onSelectFarm(null);
    }
  }, [farms, selectedFarmId, onSelectFarm]);

  const zoomIn = () => mapRef.current?.zoomIn();
  const zoomOut = () => mapRef.current?.zoomOut();

  const mappedCount = farms.filter(f => f.boundary?.coordinates?.[0]?.length).length;

  if (loading) return (
    <div className="flex-1 flex items-center justify-center bg-muted/30">
      <div className="text-center space-y-2">
        <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
        <p className="text-sm text-muted-foreground">Loading farm polygons…</p>
      </div>
    </div>
  );

  return (
    <div className="relative flex-1 overflow-hidden bg-muted/20">
      {mappedCount > 0 ? (
        <Map
          ref={mapRef}
          initialViewState={{
            bounds: initialBounds,
            fitBoundsOptions: { padding: 50 }
          }}
          mapStyle={tileLayer === 'satellite'
            ? "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json" // Placeholder base, we will add raster source below
            : "https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json"
          }
          interactiveLayerIds={['farms-fill']}
          onClick={onClick}
          onMouseMove={(e) => {
            if (e.features && e.features.length > 0) {
              const feature = e.features[0];
              const farmData = typeof feature.properties.farmData === 'string'
                ? JSON.parse(feature.properties.farmData)
                : feature.properties.farmData;
              setHoverInfo({
                lngLat: [e.lngLat.lng, e.lngLat.lat],
                farm: farmData || farms.find(f => f.id === feature.properties.id)
              });
            } else {
              setHoverInfo(null);
            }
          }}
          onMouseLeave={() => setHoverInfo(null)}
          cursor={hoverInfo ? 'pointer' : 'grab'}
        >
          {tileLayer === 'satellite' && (
            <Source
              id="satellite-raster"
              type="raster"
              tiles={['https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}']}
              tileSize={256}
            >
              <Layer id="satellite-layer" type="raster" paint={{ 'raster-opacity': 1 }} beforeId="farms-fill" />
            </Source>
          )}

          <Source type="geojson" data={geojson as any}>
            <Layer
              id="farms-fill"
              type="fill"
              paint={{
                'fill-color': ['get', 'color'],
                'fill-opacity': ['case', ['boolean', ['get', 'isSelected'], false], 0.7, 0.35]
              }}
            />
            <Layer
              id="farms-outline"
              type="line"
              paint={{
                'line-color': ['case', ['boolean', ['get', 'isSelected'], false], '#ffffff', ['get', 'color']],
                'line-width': ['case', ['boolean', ['get', 'isSelected'], false], 3, 1.5]
              }}
            />
            <Layer
              id="farms-symbol"
              type="symbol"
              minzoom={11}
              layout={{
                'text-field': ['get', 'farmer_name'],
                'text-size': 12,
                'text-variable-anchor': ['center'],
                'text-justify': 'center'
              }}
              paint={{
                'text-color': tileLayer === 'satellite' ? '#ffffff' : '#1a1a1a',
                'text-halo-color': tileLayer === 'satellite' ? 'rgba(0,0,0,0.6)' : 'rgba(255,255,255,0.8)',
                'text-halo-width': 2
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
              offset={10}
            >
              <div className="p-1">
                <p className="font-semibold text-foreground">{hoverInfo.farm.farmer_name}</p>
                {hoverInfo.farm.community && <p className="text-muted-foreground mt-0.5">{hoverInfo.farm.community}</p>}
                <div className="flex items-center gap-1.5 mt-1.5">
                  <span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: STATUS_COLORS[hoverInfo.farm.compliance_status] || '#94a3b8' }} />
                  <span className="capitalize">{hoverInfo.farm.compliance_status}</span>
                  {hoverInfo.farm.area_hectares && <span className="text-muted-foreground">· {Number(hoverInfo.farm.area_hectares).toFixed(2)}ha</span>}
                </div>
                <button
                  type="button"
                  className="mt-1.5 text-[10px] font-medium text-primary underline underline-offset-2 hover:text-primary/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  onClick={(event) => {
                    event.stopPropagation();
                    onSelectFarm(hoverInfo.farm);
                    setHoverInfo(null);
                  }}
                >
                  Click to view details
                </button>
              </div>
            </Popup>
          )}
        </Map>
      ) : (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="bg-background/90 backdrop-blur-sm rounded-xl p-8 text-center shadow-lg">
            <div className="text-4xl mb-3">🗺️</div>
            <p className="font-semibold">No farms mapped yet</p>
            <p className="text-sm text-muted-foreground mt-1">Register farmers and draw boundaries to see them here</p>
          </div>
        </div>
      )}

      {/* Zoom controls */}
      <div className="absolute bottom-6 right-4 flex flex-col gap-1 z-10">
        <Button variant="secondary" size="icon" className="h-8 w-8 shadow" onClick={zoomIn}>
          <Plus className="h-4 w-4" />
        </Button>
        <Button variant="secondary" size="icon" className="h-8 w-8 shadow" onClick={zoomOut}>
          <Minus className="h-4 w-4" />
        </Button>
      </div>

      {/* Layer toggle */}
      <div className="absolute bottom-6 left-4 z-10">
        <Button
          variant="secondary"
          size="sm"
          className="shadow gap-1.5"
          onClick={() => setTileLayer(l => l === 'satellite' ? 'street' : 'satellite')}
        >
          <Layers className="h-3.5 w-3.5" />
          {tileLayer === 'satellite' ? 'Street' : 'Satellite'}
        </Button>
      </div>

      {/* Farm count badge */}
      <div className="absolute top-3 left-3 bg-background/90 backdrop-blur-sm border rounded-md px-2.5 py-1.5 text-xs flex items-center gap-3 shadow z-10">
        <span className="font-medium">{mappedCount} mapped</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-600 inline-block" />approved</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-500 inline-block" />pending</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-600 inline-block" />rejected</span>
      </div>
    </div>
  );
}
