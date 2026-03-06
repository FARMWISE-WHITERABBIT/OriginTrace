'use client';

import { useState, useEffect } from 'react';
import { useOrg } from '@/lib/contexts/org-context';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Download, FileText, MapPin, Check } from 'lucide-react';
import { TierGate } from '@/components/tier-gate';

export default function DDSExportPage() {
  const [isExporting, setIsExporting] = useState(false);
  const [exportStats, setExportStats] = useState<{
    farms: number;
    withBoundaries: number;
  } | null>(null);
  const { organization, profile, isLoading: orgLoading } = useOrg();
  const { toast } = useToast();

  const fetchExportStats = async () => {
    if (orgLoading) return;
    if (!organization) return;

    try {
      const response = await fetch('/api/farms?status=approved');
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to fetch stats');
      }
      const data = await response.json();

      const farms = data.farms || [];
      const withBoundaries = farms.filter((f: any) => f.boundary && Object.keys(f.boundary).length > 0).length;

      setExportStats({
        farms: farms.length,
        withBoundaries,
      });
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    }
  };

  useEffect(() => {
    fetchExportStats();
  }, [organization, orgLoading]);

  const handleExport = async () => {
    if (!organization || !profile) return;

    setIsExporting(true);

    try {
      const response = await fetch('/api/farms?forExport=true');
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to fetch farms');
      }
      const data = await response.json();
      const farms = data.farms || [];

      if (farms.length === 0) {
        toast({
          title: 'No Data',
          description: 'No approved farms with boundaries to export',
          variant: 'destructive',
        });
        setIsExporting(false);
        return;
      }

      const geojson = {
        type: 'FeatureCollection',
        name: `${organization.name} - Due Diligence Statement`,
        generated_at: new Date().toISOString(),
        organization: {
          name: organization.name,
          id: organization.id,
        },
        features: farms.map((farm: any) => ({
          type: 'Feature',
          properties: {
            farmer_name: farm.farmer_name,
            farmer_id: farm.farmer_id,
            community: farm.community,
            area_hectares: farm.area_hectares,
            compliance_status: farm.compliance_status,
            farm_id: farm.id,
          },
          geometry: farm.boundary,
        })),
      };

      const blob = new Blob([JSON.stringify(geojson, null, 2)], {
        type: 'application/geo+json',
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `DDS-${organization.slug || 'export'}-${new Date().toISOString().split('T')[0]}.geojson`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast({
        title: 'Export Complete',
        description: `Downloaded GeoJSON with ${farms.length} farm boundaries`,
      });
    } catch (error) {
      console.error('Export failed:', error);
      toast({
        title: 'Export Failed',
        description: 'Failed to generate DDS export',
        variant: 'destructive',
      });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <TierGate feature="dds_export" requiredTier="enterprise" featureLabel="DDS Export">
    <div className="space-y-6 max-w-2xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">DDS Export</h1>
        <p className="text-muted-foreground">
          Generate Due Diligence Statement for EU TRACES compliance
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            GeoJSON Export
          </CardTitle>
          <CardDescription>
            Export approved farm boundaries as GeoJSON for EU TRACES submission
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="p-4 bg-muted rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Check className="h-4 w-4 text-green-500" />
                <Label>Approved Farms</Label>
              </div>
              <p className="text-2xl font-bold">{exportStats?.farms ?? '-'}</p>
            </div>
            <div className="p-4 bg-muted rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <MapPin className="h-4 w-4 text-blue-500" />
                <Label>With GPS Boundaries</Label>
              </div>
              <p className="text-2xl font-bold">{exportStats?.withBoundaries ?? '-'}</p>
            </div>
          </div>

          <div className="p-4 bg-blue-50 dark:bg-blue-950/30 rounded-lg text-sm space-y-2">
            <p className="font-medium">What's Included:</p>
            <ul className="list-disc list-inside space-y-1 text-muted-foreground">
              <li>Farm boundaries as GeoJSON polygons</li>
              <li>Farmer identification details</li>
              <li>Community/location information</li>
              <li>Farm area calculations</li>
              <li>Compliance verification status</li>
            </ul>
          </div>

          <Button
            onClick={handleExport}
            disabled={isExporting || !exportStats?.withBoundaries}
            className="w-full touch-target"
            size="lg"
            data-testid="button-export-dds"
          >
            {isExporting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Generating Export...
              </>
            ) : (
              <>
                <Download className="h-4 w-4 mr-2" />
                Download GeoJSON
              </>
            )}
          </Button>

          {(!exportStats?.withBoundaries || exportStats.withBoundaries === 0) && (
            <p className="text-sm text-amber-600 text-center">
              No approved farms with GPS boundaries available for export.
              Ensure farms are mapped with boundaries and approved through compliance review.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
    </TierGate>
  );
}
