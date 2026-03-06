'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Database, Download, Shield, FileJson, FileText, Map, Users, Package, Calendar, AlertTriangle } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import Link from 'next/link';
import { TierGate } from '@/components/tier-gate';

interface FlaggedBatch {
  id: number;
  farm_id: number;
  total_weight: number;
  status: string;
  yield_flag_reason: string | null;
  created_at: string;
  farms: {
    farmer_name: string;
    area_hectares: number;
    commodity: string;
  } | null;
}

interface VaultStats {
  organization: string;
  created_at: string;
  stats: {
    farms: number;
    batches: number;
    bags: number;
    users: number;
    flaggedBatches: number;
  };
  flaggedBatches?: FlaggedBatch[];
}

const EXPORT_TABLES = [
  { id: 'farms', label: 'Farms & Polygons', icon: Map, description: 'Farmer data, GPS boundaries, consent records' },
  { id: 'collection_batches', label: 'Collection Batches', icon: Package, description: 'Batch records with weight, status, timestamps' },
  { id: 'bags', label: 'Bags', icon: Package, description: 'Individual bag records with traceability' },
  { id: 'profiles', label: 'Team Members', icon: Users, description: 'User profiles (names, roles, emails only)' },
];

export default function DataVaultPage() {
  const [vaultStats, setVaultStats] = useState<VaultStats | null>(null);
  const [selectedTables, setSelectedTables] = useState<string[]>(['farms', 'collection_batches', 'bags']);
  const [exportFormat, setExportFormat] = useState<'json' | 'csv' | 'geojson'>('json');
  const [isLoading, setIsLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchVaultStats();
  }, []);

  const fetchVaultStats = async () => {
    try {
      const response = await fetch('/api/data-vault');
      if (response.ok) {
        const data = await response.json();
        setVaultStats(data);
      }
    } catch (error) {
      console.error('Failed to fetch vault stats:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleTable = (tableId: string) => {
    setSelectedTables(prev => 
      prev.includes(tableId) 
        ? prev.filter(t => t !== tableId)
        : [...prev, tableId]
    );
  };

  const handleExport = async () => {
    if (selectedTables.length === 0) {
      toast({ title: 'Select Tables', description: 'Please select at least one table to export.', variant: 'destructive' });
      return;
    }

    setIsExporting(true);
    try {
      const response = await fetch('/api/data-vault', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          format: exportFormat,
          tables: selectedTables
        })
      });

      if (response.ok) {
        const blob = await response.blob();
        const contentDisposition = response.headers.get('Content-Disposition');
        const filename = contentDisposition?.split('filename=')[1]?.replace(/"/g, '') || `export.${exportFormat}`;
        
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);

        toast({ title: 'Export Complete', description: `Your data has been exported as ${exportFormat.toUpperCase()}.` });
      } else {
        throw new Error('Export failed');
      }
    } catch (error) {
      toast({ title: 'Export Failed', description: 'Failed to export data. Please try again.', variant: 'destructive' });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <TierGate feature="data_vault" requiredTier="enterprise" featureLabel="Data Vault">
    {isLoading ? (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    ) : (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Database className="h-6 w-6" />
          Data Vault
        </h1>
        <p className="text-muted-foreground">Export your organization's data in standard formats</p>
      </div>

      <Card className="border-primary bg-primary/5">
        <CardHeader className="flex flex-row items-start gap-4 pb-2">
          <Shield className="h-8 w-8 text-primary mt-1" />
          <div>
            <CardTitle>Data Ownership Policy</CardTitle>
            <CardDescription className="mt-1">
              Your organization retains full ownership of all data stored in OriginTrace. This includes:
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground ml-12">
            <li>Personally Identifiable Information (PII) of farmers and team members</li>
            <li>Farm polygon boundaries and GPS coordinates</li>
            <li>Collection records, batch data, and traceability information</li>
            <li>Consent records and compliance documentation</li>
          </ul>
          <p className="text-sm text-muted-foreground mt-4 ml-12">
            You can export your complete dataset at any time using this Data Vault.
          </p>
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 gap-2">
            <CardTitle className="text-sm font-medium">Farms</CardTitle>
            <Map className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{vaultStats?.stats.farms || 0}</div>
            <p className="text-xs text-muted-foreground">Registered farms</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 gap-2">
            <CardTitle className="text-sm font-medium">Batches</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{vaultStats?.stats.batches || 0}</div>
            <p className="text-xs text-muted-foreground">Collection batches</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 gap-2">
            <CardTitle className="text-sm font-medium">Bags</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{vaultStats?.stats.bags || 0}</div>
            <p className="text-xs text-muted-foreground">Individual bags</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 gap-2">
            <CardTitle className="text-sm font-medium">Team</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{vaultStats?.stats.users || 0}</div>
            <p className="text-xs text-muted-foreground">Team members</p>
          </CardContent>
        </Card>
      </div>

      {(vaultStats?.stats.flaggedBatches || 0) > 0 && (
        <Card className="border-amber-500 bg-amber-50 dark:bg-amber-950/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-amber-700 dark:text-amber-400">
              <AlertTriangle className="h-5 w-5" />
              Flagged Batches Requiring Review
            </CardTitle>
            <CardDescription>
              {vaultStats?.stats.flaggedBatches} batch(es) have been flagged for yield anomalies
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table data-testid="table-flagged-batches">
              <TableHeader>
                <TableRow>
                  <TableHead data-testid="header-batch-id">Batch ID</TableHead>
                  <TableHead data-testid="header-farmer">Farmer</TableHead>
                  <TableHead data-testid="header-commodity">Commodity</TableHead>
                  <TableHead className="text-right" data-testid="header-weight">Weight (kg)</TableHead>
                  <TableHead data-testid="header-reason">Reason</TableHead>
                  <TableHead data-testid="header-date">Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(vaultStats?.flaggedBatches || []).slice(0, 5).map((batch) => (
                  <TableRow key={batch.id} data-testid={`flagged-batch-${batch.id}`}>
                    <TableCell className="font-mono">#{batch.id}</TableCell>
                    <TableCell className="font-medium">{batch.farms?.farmer_name || 'Unknown'}</TableCell>
                    <TableCell className="capitalize">{batch.farms?.commodity || '-'}</TableCell>
                    <TableCell className="text-right text-amber-600 font-medium">
                      {Number(batch.total_weight).toLocaleString()}
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate text-sm text-muted-foreground">
                      {batch.yield_flag_reason || 'Yield exceeds threshold'}
                    </TableCell>
                    <TableCell>{new Date(batch.created_at).toLocaleDateString()}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <div className="mt-4 pt-4 border-t flex justify-between items-center flex-wrap gap-2">
              <p className="text-sm text-muted-foreground">
                Review flagged batches in the Yield Alerts dashboard
              </p>
              <Link href="/app/yield-alerts">
                <Button variant="outline" data-testid="button-view-yield-alerts">
                  View All Alerts
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Select Data to Export</CardTitle>
            <CardDescription>Choose which tables to include in your export</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {EXPORT_TABLES.map((table) => {
              const Icon = table.icon;
              return (
                <div 
                  key={table.id} 
                  className="flex items-start gap-3 p-3 rounded-lg border hover:bg-muted/50 cursor-pointer"
                  onClick={() => toggleTable(table.id)}
                >
                  <Checkbox
                    id={table.id}
                    checked={selectedTables.includes(table.id)}
                    onCheckedChange={() => toggleTable(table.id)}
                    data-testid={`checkbox-${table.id}`}
                  />
                  <Icon className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div className="flex-1">
                    <Label htmlFor={table.id} className="font-medium cursor-pointer">
                      {table.label}
                    </Label>
                    <p className="text-xs text-muted-foreground">{table.description}</p>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Export Format</CardTitle>
            <CardDescription>Choose the format for your data export</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <RadioGroup value={exportFormat} onValueChange={(v) => setExportFormat(v as 'json' | 'csv' | 'geojson')}>
              <div className="flex items-start gap-3 p-3 rounded-lg border hover:bg-muted/50">
                <RadioGroupItem value="json" id="format-json" data-testid="radio-json" />
                <FileJson className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div className="flex-1">
                  <Label htmlFor="format-json" className="font-medium cursor-pointer">JSON</Label>
                  <p className="text-xs text-muted-foreground">Standard JSON format, easy to import into other systems</p>
                </div>
              </div>
              
              <div className="flex items-start gap-3 p-3 rounded-lg border hover:bg-muted/50">
                <RadioGroupItem value="csv" id="format-csv" data-testid="radio-csv" />
                <FileText className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div className="flex-1">
                  <Label htmlFor="format-csv" className="font-medium cursor-pointer">CSV</Label>
                  <p className="text-xs text-muted-foreground">Spreadsheet compatible, opens in Excel/Google Sheets</p>
                </div>
              </div>
              
              <div className="flex items-start gap-3 p-3 rounded-lg border hover:bg-muted/50">
                <RadioGroupItem value="geojson" id="format-geojson" data-testid="radio-geojson" />
                <Map className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div className="flex-1">
                  <Label htmlFor="format-geojson" className="font-medium cursor-pointer">GeoJSON</Label>
                  <p className="text-xs text-muted-foreground">Farms only - compatible with GIS tools and EU TRACES</p>
                </div>
              </div>
            </RadioGroup>

            <div className="pt-4 border-t">
              <Button 
                onClick={handleExport} 
                disabled={isExporting || selectedTables.length === 0}
                className="w-full"
                data-testid="button-export"
              >
                {isExporting ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Download className="h-4 w-4 mr-2" />
                )}
                Export Selected Data
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-muted/50">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Organization Info
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid sm:grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Organization Name</span>
              <p className="font-medium">{vaultStats?.organization || 'Unknown'}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Account Created</span>
              <p className="font-medium">
                {vaultStats?.created_at ? new Date(vaultStats.created_at).toLocaleDateString() : 'Unknown'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
    )}
    </TierGate>
  );
}
