'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { useOrg } from '@/lib/contexts/org-context';
import { createClient } from '@/lib/supabase/client';
import { 
  Package, 
  Search, 
  Filter,
  Clock,
  Loader2,
  User,
  MapPin,
  Scale,
  Calendar,
  Plus,
  Truck,
  Lock,
  Send,
  Download,
  FileText
} from 'lucide-react';
import Link from 'next/link';
import { generateBatchManifestCSV, downloadCSV } from '@/lib/export/csv-export';
import { TierGate } from '@/components/tier-gate';
import { StatusBadge } from '@/lib/status-badge';

interface Batch {
  id: string;
  batch_id: string;
  status: string;
  total_weight: number;
  bag_count: number;
  created_at: string;
  farm: {
    farmer_name: string;
    community: string;
  };
  agent: {
    full_name: string;
  };
}

export default function InventoryPage() {
  const [batches, setBatches] = useState<Batch[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedBatch, setSelectedBatch] = useState<Batch | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const { organization } = useOrg();
  const supabase = createClient();

  useEffect(() => {
    async function fetchBatches() {
      if (!supabase || !organization) return;

      try {
        // Fetch batches first
        const { data: batchData, error: batchError } = await supabase
          .from('collection_batches')
          .select('*')
          .eq('org_id', organization.id)
          .order('created_at', { ascending: false });

        if (batchError) {
          console.error('Batch query error:', batchError.message, batchError.details, batchError.hint);
          throw batchError;
        }

        // Fetch farm data for all batches
        const farmIds = [...new Set((batchData || []).map(b => b.farm_id).filter(Boolean))];
        let farmMap: Record<number, { farmer_name: string; community: string }> = {};
        
        if (farmIds.length > 0) {
          const { data: farms, error: farmError } = await supabase
            .from('farms')
            .select('id, farmer_name, community')
            .in('id', farmIds);
          
          if (!farmError && farms) {
            farmMap = farms.reduce((acc, f) => {
              acc[f.id] = { farmer_name: f.farmer_name, community: f.community };
              return acc;
            }, {} as Record<number, { farmer_name: string; community: string }>);
          }
        }

        const data = batchData;

        // Fetch agent names separately if we have agent IDs
        const agentIds = [...new Set((data || []).map(b => b.agent_id).filter(Boolean))];
        let agentMap: Record<string, string> = {};
        
        if (agentIds.length > 0) {
          const { data: profiles } = await supabase
            .from('profiles')
            .select('user_id, full_name')
            .in('user_id', agentIds);
          
          agentMap = (profiles || []).reduce((acc, p) => {
            acc[p.user_id] = p.full_name;
            return acc;
          }, {} as Record<string, string>);
        }

        setBatches((data || []).map((b: any) => {
          return {
            ...b,
            farm: farmMap[b.farm_id] || { farmer_name: 'Unknown', community: 'Unknown' },
            agent: { full_name: agentMap[b.agent_id] || 'Unknown' }
          };
        }));
      } catch (error) {
        console.error('Failed to fetch batches:', error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchBatches();
  }, [organization, supabase]);

  const filteredBatches = batches.filter(batch => {
    const matchesSearch = 
      batch.batch_id?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      batch.farm?.farmer_name?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || batch.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });


  const handleRowClick = (batch: Batch) => {
    setSelectedBatch(batch);
    setSheetOpen(true);
  };

  const statusCounts = {
    all: batches.length,
    collecting: batches.filter(b => b.status === 'collecting').length,
    resolved: batches.filter(b => b.status === 'resolved').length,
    dispatched: batches.filter(b => b.status === 'dispatched').length,
  };

  return (
    <TierGate feature="inventory" requiredTier="basic" featureLabel="Inventory">
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Inventory</h1>
          <p className="text-muted-foreground">
            View and manage all collection batches
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            const csvData = filteredBatches.map(b => ({
              batchId: b.batch_id || b.id.slice(0, 8),
              farmerName: b.farm?.farmer_name || 'Unknown',
              community: b.farm?.community || 'Unknown',
              commodity: '',
              bagCount: b.bag_count,
              totalWeight: typeof b.total_weight === 'number' ? b.total_weight : parseFloat(String(b.total_weight)) || 0,
              status: b.status,
              collectionDate: new Date(b.created_at).toLocaleDateString(),
              collectedBy: b.agent?.full_name || 'Unknown'
            }));
            const csv = generateBatchManifestCSV(csvData);
            downloadCSV(csv, `batch-manifest-${new Date().toISOString().slice(0, 10)}.csv`);
          }}
          disabled={filteredBatches.length === 0}
          data-testid="button-export-csv"
        >
          <Download className="h-4 w-4 mr-1" />
          Export CSV
        </Button>
      </div>

      <div className="flex flex-wrap gap-2">
        {(['all', 'collecting', 'resolved', 'dispatched'] as const).map((status) => (
          <Button
            key={status}
            variant={statusFilter === status ? 'default' : 'outline'}
            size="sm"
            onClick={() => setStatusFilter(status)}
            data-testid={`filter-${status}`}
          >
            {status.charAt(0).toUpperCase() + status.slice(1)}
            <Badge variant="secondary" className="ml-2">
              {statusCounts[status]}
            </Badge>
          </Button>
        ))}
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Collection Batches
              </CardTitle>
              <CardDescription>
                {filteredBatches.length} batches found
              </CardDescription>
            </div>
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search batches..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
                data-testid="input-search-batches"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center h-32">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : filteredBatches.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No batches found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Batch ID</TableHead>
                    <TableHead>Farmer</TableHead>
                    <TableHead>Bags</TableHead>
                    <TableHead>Weight</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredBatches.map((batch) => (
                    <TableRow 
                      key={batch.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => handleRowClick(batch)}
                      data-testid={`batch-row-${batch.id}`}
                    >
                      <TableCell className="font-medium">{batch.batch_id || batch.id.slice(0, 8)}</TableCell>
                      <TableCell>{batch.farm?.farmer_name}</TableCell>
                      <TableCell>{batch.bag_count}</TableCell>
                      <TableCell>{batch.total_weight} kg</TableCell>
                      <TableCell><StatusBadge domain="batch" status={batch.status} /></TableCell>
                      <TableCell className="text-muted-foreground">
                        {new Date(batch.created_at).toLocaleDateString()}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="overflow-y-auto">
          {selectedBatch && (
            <>
              <SheetHeader>
                <SheetTitle className="flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  Batch Details
                </SheetTitle>
                <SheetDescription>
                  {selectedBatch.batch_id || selectedBatch.id.slice(0, 8)}
                </SheetDescription>
              </SheetHeader>
              
              <div className="mt-6 space-y-6">
                <div className="flex justify-center">
                  <StatusBadge domain="batch" status={selectedBatch.status} />
                </div>

                <div className="space-y-4">
                  <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                    <User className="h-5 w-5 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-sm font-medium">Farmer</p>
                      <p className="text-sm text-muted-foreground">{selectedBatch.farm?.farmer_name}</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                    <MapPin className="h-5 w-5 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-sm font-medium">Community</p>
                      <p className="text-sm text-muted-foreground">{selectedBatch.farm?.community}</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                    <Package className="h-5 w-5 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-sm font-medium">Bags in Batch</p>
                      <p className="text-sm text-muted-foreground">{selectedBatch.bag_count} bags</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                    <Scale className="h-5 w-5 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-sm font-medium">Total Weight</p>
                      <p className="text-sm text-muted-foreground">{selectedBatch.total_weight} kg</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                    <User className="h-5 w-5 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-sm font-medium">Collected By</p>
                      <p className="text-sm text-muted-foreground">{selectedBatch.agent?.full_name}</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                    <Calendar className="h-5 w-5 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-sm font-medium">Collection Date</p>
                      <p className="text-sm text-muted-foreground">
                        {new Date(selectedBatch.created_at).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t space-y-2">
                  {selectedBatch.status === 'collecting' && (
                    <Link href={`/app/bags?batch=${selectedBatch.id}`}>
                      <Button className="w-full" data-testid="button-add-bags">
                        <Plus className="h-4 w-4 mr-2" />
                        Add Bags
                      </Button>
                    </Link>
                  )}
                  {selectedBatch.status === 'collecting' && selectedBatch.bag_count > 0 && (
                    <Link href={`/app/resolve?batch=${selectedBatch.id}`}>
                      <Button variant="outline" className="w-full" data-testid="button-resolve">
                        <Lock className="h-4 w-4 mr-2" />
                        Resolve & Lock
                      </Button>
                    </Link>
                  )}
                  {selectedBatch.status === 'resolved' && (
                    <Link href={`/app/dispatch?batch=${selectedBatch.id}`}>
                      <Button className="w-full" data-testid="button-dispatch">
                        <Send className="h-4 w-4 mr-2" />
                        Dispatch
                      </Button>
                    </Link>
                  )}
                  {selectedBatch.status === 'dispatched' && (
                    <div className="flex items-center justify-center gap-2 p-3 rounded-lg bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800">
                      <Truck className="h-4 w-4 text-green-600" />
                      <span className="text-sm text-green-700 dark:text-green-400">
                        Dispatched
                      </span>
                    </div>
                  )}
                  <Button 
                    variant="ghost" 
                    className="w-full"
                    onClick={() => setSheetOpen(false)}
                  >
                    Close
                  </Button>
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
    </TierGate>
  );
}
