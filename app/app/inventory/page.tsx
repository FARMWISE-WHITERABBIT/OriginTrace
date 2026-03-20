'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
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
import { useToast } from '@/hooks/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
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
  FileText,
  QrCode,
  Users,
  ChevronDown,
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

interface Bag {
  id: string;
  serial: string;
  status: string;
  collection_batch_id: string | null;
  batch_id: string | null;
  weight_kg: number | null;
  grade: string | null;
  farmer_name: string | null;
  community: string | null;
  created_at: string;
}

export default function InventoryPage() {
  const router = useRouter();
  // ── Bags sub-tab state ──
  const [bags, setBags] = useState<Bag[]>([]);
  const [bagsLoading, setBagsLoading] = useState(false);
  const [bagsFetched, setBagsFetched] = useState(false);
  const [bagSearch, setBagSearch] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [batchCount, setBatchCount] = useState(10);
  const [bagDialogOpen, setBagDialogOpen] = useState(false);
  const { toast } = useToast();

  const fetchBags = async () => {
    if (bagsFetched) return;
    setBagsLoading(true);
    try {
      const res = await fetch('/api/bags');
      if (!res.ok) throw new Error((await res.json()).error || 'Failed');
      const data = await res.json();
      setBags(data.bags || []);
      setBagsFetched(true);
    } catch (e) { console.error(e); } finally { setBagsLoading(false); }
  };

  const generateBagBatch = async () => {
    setIsGenerating(true);
    try {
      const res = await fetch('/api/bags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ count: Math.min(batchCount, 100) }),
      });
      if (!res.ok) throw new Error((await res.json()).error || 'Failed');
      const data = await res.json();
      toast({ title: 'Batch Generated', description: `Created ${data.count} bags — batch ${data.batchId}` });
      setBagDialogOpen(false);
      setBagsFetched(false);
      setBagsLoading(true);
      const res2 = await fetch('/api/bags');
      const data2 = await res2.json();
      setBags(data2.bags || []);
      setBagsFetched(true);
      setBagsLoading(false);
    } catch {
      toast({ title: 'Error', description: 'Failed to generate bag batch', variant: 'destructive' });
    } finally { setIsGenerating(false); }
  };
  // ── end bags state ──
  const filteredBags = bags.filter(b => {
    const q = bagSearch.toLowerCase();
    return b.serial.toLowerCase().includes(q)
      || (b.batch_id && b.batch_id.toLowerCase().includes(q))
      || (b.farmer_name && b.farmer_name.toLowerCase().includes(q))
      || (b.community && b.community.toLowerCase().includes(q));
  });

  interface BatchContribution {
    id: string;
    batch_id: string;
    farm_id: string;
    farmer_name: string | null;
    weight_kg: number;
    bag_count: number;
    compliance_status: string;
    notes: string | null;
    farm?: {
      farmer_name: string | null;
      community: string | null;
      compliance_status: string | null;
      area_hectares: number | null;
    } | null;
  }

  const [batches, setBatches] = useState<Batch[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const { organization, profile } = useOrg();
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


  const handleRowClick = async (batch: Batch) => {
    router.push(`/app/inventory/${batch.id}`);
  };

  const statusCounts = {
    all: batches.length,
    collecting: batches.filter(b => b.status === 'collecting').length,
    resolved: batches.filter(b => b.status === 'resolved').length,
    dispatched: batches.filter(b => b.status === 'dispatched').length,
  };

  return (
    <TierGate feature="inventory" requiredTier="starter" featureLabel="Inventory">
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold tracking-tight" data-testid="text-page-title">Inventory</h1>
          <p className="text-muted-foreground">
            Collection batches and bag management
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

      <Tabs defaultValue="batches">
        <TabsList>
          <TabsTrigger value="batches">Batches</TabsTrigger>
          <TabsTrigger value="bags" onClick={fetchBags}>Bags</TabsTrigger>
        </TabsList>
        <TabsContent value="batches" className="mt-4 space-y-4">
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
            <div className="text-center py-12">
              <Package className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-40" />
              {searchQuery || statusFilter !== 'all' ? (
                <>
                  <p className="font-medium text-muted-foreground">No batches match your filters</p>
                  <p className="text-sm text-muted-foreground mt-1">Try clearing the search or changing the status filter</p>
                </>
              ) : (
                <>
                  <p className="font-medium">No collection batches yet</p>
                  <p className="text-sm text-muted-foreground mt-1 max-w-xs mx-auto">
                    Batches are created when a field agent completes a Smart Collect run. Each batch tracks weight, grade, and which farmers contributed.
                  </p>
                  <Link href="/app/collect" className="inline-flex items-center gap-2 mt-4 text-sm font-medium text-primary hover:underline">
                    Start your first collection →
                  </Link>
                </>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Batch ID</TableHead>
                    <TableHead>Farmer</TableHead>
                    <TableHead className="hidden md:table-cell">Bags</TableHead>
                    <TableHead>Weight</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="hidden md:table-cell">Date</TableHead>
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
                      <TableCell className="hidden md:table-cell">{batch.bag_count}</TableCell>
                      <TableCell>{batch.total_weight} kg</TableCell>
                      <TableCell><StatusBadge domain="batch" status={batch.status} /></TableCell>
                      <TableCell className="hidden md:table-cell text-muted-foreground">
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

      </TabsContent>

      {/* ── BAGS TAB ── */}
      <TabsContent value="bags" className="mt-4 space-y-4" onFocus={fetchBags}>
        <TierGate feature="bags" requiredTier="starter" featureLabel="Bags">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="relative flex-1 min-w-[12rem]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search by serial or batch ID…" value={bagSearch} onChange={e => setBagSearch(e.target.value)} className="pl-9" />
            </div>
            {(profile?.role === 'admin') && (
              <Dialog open={bagDialogOpen} onOpenChange={setBagDialogOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" data-testid="button-generate-batch">
                    <Plus className="h-4 w-4 mr-2" />Generate Batch
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-sm">
                  <DialogHeader>
                    <DialogTitle>Generate Bag Batch</DialogTitle>
                    <DialogDescription>Create a new batch of traceable bag serials.</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-3 py-2">
                    <Label htmlFor="bag-count">Number of bags (max 100)</Label>
                    <Input id="bag-count" type="number" min={1} max={100} value={batchCount} onChange={e => setBatchCount(Number(e.target.value))} />
                  </div>
                  <DialogFooter>
                    <Button onClick={generateBagBatch} disabled={isGenerating}>
                      {isGenerating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Plus className="h-4 w-4 mr-2" />}Generate
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            )}
          </div>

          {/* Stats strip */}
          {bags.length > 0 && (
            <div className="grid grid-cols-4 gap-3">
              {[
                { label: 'Total', value: bags.length, color: '' },
                { label: 'Unused', value: bags.filter(b => b.status === 'unused').length, color: 'text-blue-600' },
                { label: 'Collected', value: bags.filter(b => b.status === 'collected').length, color: 'text-green-600' },
                { label: 'Processed', value: bags.filter(b => b.status === 'processed').length, color: 'text-purple-600' },
              ].map(s => (
                <Card key={s.label} className="text-center p-3">
                  <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
                  <p className="text-xs text-muted-foreground">{s.label}</p>
                </Card>
              ))}
            </div>
          )}

          <Card>
            <CardContent className="p-0">
              {bagsLoading ? (
                <div className="flex items-center justify-center h-40">
                  <Loader2 className="h-7 w-7 animate-spin text-muted-foreground" />
                </div>
              ) : !bagsFetched ? (
                <div className="text-center py-10 text-muted-foreground">
                  <QrCode className="h-10 w-10 mx-auto mb-3 opacity-40" />
                  <p className="text-sm">Click this tab to load bag inventory</p>
                </div>
              ) : filteredBags.length === 0 ? (
                <div className="text-center py-10 text-muted-foreground">
                  <Package className="h-10 w-10 mx-auto mb-3 opacity-40" />
                  <p className="font-medium">{bagSearch ? 'No bags match your search' : 'No bags generated yet'}</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Serial</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Grade</TableHead>
                        <TableHead>Weight</TableHead>
                        <TableHead>Farmer</TableHead>
                        <TableHead>Batch ID</TableHead>
                        <TableHead>Created</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredBags.slice(0, 200).map(bag => (
                        <TableRow key={bag.id} data-testid={`bag-row-${bag.id}`}>
                          <TableCell className="font-mono text-sm">{bag.serial}</TableCell>
                          <TableCell><StatusBadge domain="bag" status={bag.status} /></TableCell>
                          <TableCell className="text-sm text-muted-foreground">{bag.grade || '—'}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">{bag.weight_kg != null ? `${Number(bag.weight_kg).toLocaleString()} kg` : '—'}</TableCell>
                          <TableCell className="text-sm">{bag.farmer_name || <span className="text-muted-foreground">—</span>}</TableCell>
                          <TableCell className="text-muted-foreground text-sm">{bag.batch_id || '—'}</TableCell>
                          <TableCell className="text-muted-foreground text-sm">{new Date(bag.created_at).toLocaleDateString()}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  {filteredBags.length > 200 && (
                    <p className="text-xs text-center text-muted-foreground py-3">Showing first 200 of {filteredBags.length} bags</p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TierGate>
      </TabsContent>
      </Tabs>
    </div>
    </TierGate>
  );
}
