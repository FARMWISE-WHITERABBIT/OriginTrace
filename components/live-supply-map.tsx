'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useOrg } from '@/lib/contexts/org-context';
import { createClient } from '@/lib/supabase/client';
import { MapPin, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';

interface Farm {
  id: string;
  farmer_name: string;
  community: string;
  compliance_status: string | null;
  boundary: {
    type: string;
    coordinates: number[][][];
  } | null;
  area_hectares?: number | null;
}

import Map, { Source, Layer, Popup } from 'react-map-gl/maplibre';
import 'maplibre-gl/dist/maplibre-gl.css';
import { useMemo } from 'react';

function MapContent({ farms }: { farms: Farm[] }) {
  const [hoverInfo, setHoverInfo] = useState<{
    lngLat: [number, number];
    farm: Farm;
  } | null>(null);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return '#2D5A27';
      case 'flagged':  return '#ef4444';
      default:         return '#eab308';
    }
  };

  const geojsonData = useMemo(() => {
    return {
      type: 'FeatureCollection',
      features: farms.filter(f => f.boundary?.coordinates?.[0]).map(farm => ({
        type: 'Feature',
        properties: {
          id: farm.id,
          farmer_name: farm.farmer_name,
          community: farm.community,
          area_hectares: farm.area_hectares,
          compliance_status: farm.compliance_status || 'pending',
          color: getStatusColor(farm.compliance_status || 'pending')
        },
        geometry: {
          type: 'Polygon',
          coordinates: farm.boundary!.coordinates
        }
      }))
    };
  }, [farms]);

  return (
    <div className="rounded-xl overflow-hidden border border-border shadow-sm h-[300px] relative">
      <Map
        initialViewState={{
          longitude: 3.9470,
          latitude: 7.3775,
          zoom: 6
        }}
        mapStyle="https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json"
        interactiveLayerIds={['farms-fill']}
        onMouseMove={(e) => {
          if (e.features && e.features.length > 0) {
            const feature = e.features[0];
            setHoverInfo({
              lngLat: [e.lngLat.lng, e.lngLat.lat],
              farm: feature.properties as Farm
            });
          } else {
            setHoverInfo(null);
          }
        }}
        onMouseLeave={() => setHoverInfo(null)}
      >
        <Source type="geojson" data={geojsonData as any}>
          <Layer
            id="farms-fill"
            type="fill"
            paint={{
              'fill-color': ['get', 'color'],
              'fill-opacity': 0.4
            }}
          />
          <Layer
            id="farms-outline"
            type="line"
            paint={{
              'line-color': ['get', 'color'],
              'line-width': 2
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
              <strong className="block text-foreground">{hoverInfo.farm.farmer_name}</strong>
              <span className="text-muted-foreground">{hoverInfo.farm.community}</span>
              {hoverInfo.farm.area_hectares && (
                <span className="block text-muted-foreground">{Number(hoverInfo.farm.area_hectares).toFixed(2)} ha</span>
              )}
              <span
                className="inline-block mt-1 px-2 py-0.5 rounded text-xs font-medium"
                style={{
                  backgroundColor: getStatusColor(hoverInfo.farm.compliance_status || 'pending') + '20',
                  color: getStatusColor(hoverInfo.farm.compliance_status || 'pending'),
                }}
              >
                {hoverInfo.farm.compliance_status}
              </span>
            </div>
          </Popup>
        )}
      </Map>
    </div>
  );
}

export function LiveSupplyMap() {
  const [farms, setFarms] = useState<Farm[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { organization } = useOrg();
  const supabase = createClient();

  useEffect(() => {
    async function fetchFarms() {
      if (!supabase || !organization) return;

      try {
        const { data, error } = await supabase
          .from('farms')
          .select('id, farmer_name, community, compliance_status, boundary, area_hectares')
          .eq('org_id', String(organization.id))
          .not('boundary', 'is', null);

        if (!error && data) {
          setFarms(data as unknown as Farm[]);
        }
      } catch (error) {
        console.error('Failed to fetch farms:', error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchFarms();
  }, [organization]);

  const statusCounts = {
    approved: farms.filter(f => f.compliance_status === 'approved').length,
    pending: farms.filter(f => f.compliance_status === 'pending').length,
    flagged: farms.filter(f => f.compliance_status === 'flagged').length,
  };

  return (
    <Card className="col-span-2" data-testid="card-supply-map">
      <CardHeader className="pb-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              Live Supply Map
            </CardTitle>
            <CardDescription>
              Farm polygons colored by compliance status
            </CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-300">
              <CheckCircle2 className="h-3 w-3 mr-1" />
              {statusCounts.approved} Verified
            </Badge>
            <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-300">
              {statusCounts.pending} Pending
            </Badge>
            <Badge variant="outline" className="bg-red-50 text-red-700 border-red-300">
              <AlertCircle className="h-3 w-3 mr-1" />
              {statusCounts.flagged} Risk
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center h-[300px]">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : farms.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground h-[300px] flex items-center justify-center">
            No farms with boundaries mapped yet.
          </div>
        ) : (
          <MapContent farms={farms} />
        )}
      </CardContent>
    </Card>
  );
}
