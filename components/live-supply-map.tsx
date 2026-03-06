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
  compliance_status: 'pending' | 'approved' | 'flagged';
  boundary: {
    type: string;
    coordinates: number[][][];
  } | null;
  area_hectares?: number;
}

function MapContent({ farms }: { farms: Farm[] }) {
  const [leafletLoaded, setLeafletLoaded] = useState(false);
  const [LeafletComponents, setLeafletComponents] = useState<any>(null);

  useEffect(() => {
    import('react-leaflet').then((mod) => {
      // @ts-ignore - CSS import for leaflet
      import('leaflet/dist/leaflet.css');
      setLeafletComponents({
        MapContainer: mod.MapContainer,
        TileLayer: mod.TileLayer,
        Polygon: mod.Polygon,
        Popup: mod.Popup,
      });
      setLeafletLoaded(true);
    });
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved':
        return '#2D5A27';
      case 'flagged':
        return '#ef4444';
      default:
        return '#eab308';
    }
  };

  if (!leafletLoaded || !LeafletComponents) {
    return (
      <div className="flex items-center justify-center h-[300px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const { MapContainer, TileLayer, Polygon, Popup } = LeafletComponents;

  return (
    <div className="rounded-xl overflow-hidden border border-border shadow-sm h-[300px]">
      <MapContainer 
        center={[7.3775, 3.9470] as [number, number]} 
        zoom={6} 
        style={{ height: '100%', width: '100%' }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
        />
        {farms.map((farm) => {
          if (!farm.boundary?.coordinates?.[0]) return null;
          const positions = farm.boundary.coordinates[0].map((coord: number[]) => 
            [coord[1], coord[0]] as [number, number]
          );
          
          return (
            <Polygon 
              key={farm.id} 
              positions={positions}
              pathOptions={{ 
                color: getStatusColor(farm.compliance_status),
                fillOpacity: 0.4,
                weight: 2
              }}
            >
              <Popup>
                <div className="text-sm p-1">
                  <strong className="block text-slate-900">{farm.farmer_name}</strong>
                  <span className="text-slate-600">{farm.community}</span>
                  {farm.area_hectares && (
                    <span className="block text-slate-500">{farm.area_hectares.toFixed(2)} ha</span>
                  )}
                  <span 
                    className="inline-block mt-1 px-2 py-0.5 rounded text-xs font-medium"
                    style={{ 
                      backgroundColor: getStatusColor(farm.compliance_status) + '20',
                      color: getStatusColor(farm.compliance_status),
                    }}
                  >
                    {farm.compliance_status}
                  </span>
                </div>
              </Popup>
            </Polygon>
          );
        })}
      </MapContainer>
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
          .eq('org_id', organization.id)
          .not('boundary', 'is', null);

        if (!error && data) {
          setFarms(data);
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
