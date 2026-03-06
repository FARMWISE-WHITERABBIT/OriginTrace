'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { useOrg } from '@/lib/contexts/org-context';
import { useToast } from '@/hooks/use-toast';
import { FileDown, Calendar as CalendarIcon, Loader2, CheckCircle2 } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface DDSExportModalProps {
  trigger?: React.ReactNode;
}

export function DDSExportModal({ trigger }: DDSExportModalProps) {
  const [open, setOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [commodity, setCommodity] = useState<string>('all');
  const [dateFrom, setDateFrom] = useState<Date | undefined>(undefined);
  const [dateTo, setDateTo] = useState<Date | undefined>(undefined);
  const [commodities, setCommodities] = useState<string[]>([]);
  const [exportStats, setExportStats] = useState<{ farms: number; withBoundaries: number } | null>(null);
  
  const { organization, profile } = useOrg();
  const { toast } = useToast();

  useEffect(() => {
    if (open && organization) {
      fetchCommodities();
      fetchExportStats();
    }
  }, [open, organization]);

  const fetchCommodities = async () => {
    try {
      const orgId = organization?.id;
      const url = orgId ? `/api/commodities?org_id=${orgId}` : '/api/commodities?global_only=true';
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        const commodityList = data.commodities || data;
        if (Array.isArray(commodityList) && commodityList.length > 0) {
          setCommodities(commodityList.map((c: any) => c.name));
          return;
        }
      }
      const settingsRes = await fetch('/api/settings');
      if (settingsRes.ok) {
        const settingsData = await settingsRes.json();
        if (settingsData.organization?.commodity_types?.length > 0) {
          setCommodities(settingsData.organization.commodity_types);
          return;
        }
      }
    } catch (error) {
      console.error('Failed to fetch commodities:', error);
    }
  };

  const fetchExportStats = async () => {
    try {
      const response = await fetch('/api/farms?status=approved');
      if (response.ok) {
        const data = await response.json();
        const farms = data.farms || [];
        setExportStats({
          farms: farms.length,
          withBoundaries: farms.filter((f: any) => f.boundary && Object.keys(f.boundary).length > 0).length
        });
      }
    } catch (error) {
      console.error('Failed to fetch export stats:', error);
    }
  };

  const handleExport = async () => {
    if (!organization || !profile) return;

    setIsExporting(true);

    try {
      let url = '/api/farms?forExport=true';
      
      const response = await fetch(url);
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to fetch farms');
      }
      
      const data = await response.json();
      let farms = data.farms || [];

      if (commodity !== 'all') {
        farms = farms.filter((f: any) => f.commodity === commodity);
      }

      if (dateFrom) {
        farms = farms.filter((f: any) => new Date(f.created_at) >= dateFrom);
      }
      if (dateTo) {
        farms = farms.filter((f: any) => new Date(f.created_at) <= dateTo);
      }

      if (farms.length === 0) {
        toast({
          title: 'No Data',
          description: 'No approved farms with boundaries match your criteria.',
          variant: 'destructive',
        });
        setIsExporting(false);
        return;
      }

      const geojson = {
        type: 'FeatureCollection',
        name: `${organization.name} - Due Diligence Statement`,
        generated_at: new Date().toISOString(),
        commodity_filter: commodity === 'all' ? 'All Commodities' : commodity,
        date_range: {
          from: dateFrom?.toISOString() || null,
          to: dateTo?.toISOString() || null,
        },
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
            commodity: farm.commodity,
            area_hectares: farm.area_hectares,
            compliance_status: farm.compliance_status,
            farm_id: farm.id,
            created_at: farm.created_at,
          },
          geometry: farm.boundary,
        })),
      };

      const blob = new Blob([JSON.stringify(geojson, null, 2)], { type: 'application/json' });
      const downloadUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = downloadUrl;
      const dateStr = format(new Date(), 'yyyy-MM-dd');
      a.download = `DDS_${organization.name.replace(/\s+/g, '_')}_${dateStr}.geojson`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(downloadUrl);
      document.body.removeChild(a);

      toast({
        title: 'Export Complete',
        description: `Exported ${farms.length} farm boundaries for EU TRACES compliance.`,
      });

      setOpen(false);
    } catch (error) {
      console.error('Export error:', error);
      toast({
        title: 'Export Failed',
        description: error instanceof Error ? error.message : 'An error occurred during export.',
        variant: 'destructive',
      });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" data-testid="button-dds-export">
            <FileDown className="h-4 w-4 mr-2" />
            DDS Export
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileDown className="h-5 w-5" />
            Export Due Diligence Statement
          </DialogTitle>
          <DialogDescription>
            Generate a GeoJSON file formatted for EU TRACES portal compliance.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {exportStats && (
            <div className="flex gap-2 justify-center">
              <Badge variant="outline" className="bg-green-50 text-green-700">
                <CheckCircle2 className="h-3 w-3 mr-1" />
                {exportStats.withBoundaries} farms ready
              </Badge>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="commodity">Commodity Type</Label>
            <Select value={commodity} onValueChange={setCommodity}>
              <SelectTrigger id="commodity" data-testid="select-commodity">
                <SelectValue placeholder="Select commodity" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Commodities</SelectItem>
                {commodities.map((c) => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Date From</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !dateFrom && "text-muted-foreground"
                    )}
                    data-testid="button-date-from"
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dateFrom ? format(dateFrom, "PP") : "Start date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={dateFrom}
                    onSelect={setDateFrom}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label>Date To</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !dateTo && "text-muted-foreground"
                    )}
                    data-testid="button-date-to"
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dateTo ? format(dateTo, "PP") : "End date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={dateTo}
                    onSelect={setDateTo}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleExport} 
            disabled={isExporting}
            data-testid="button-export-geojson"
          >
            {isExporting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Exporting...
              </>
            ) : (
              <>
                <FileDown className="h-4 w-4 mr-2" />
                Export GeoJSON
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
