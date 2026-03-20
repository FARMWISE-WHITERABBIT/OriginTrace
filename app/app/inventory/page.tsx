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
  const [selectedBatch, setSelectedBatch] = useState<Batch | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [contributions, setContributions] = useState<BatchContribution[]>([]);
  const [contributionsLoading, setContributionsLoading] = useState(false);
  const [isResolving, setIsResolving] = useState(false);
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


  const handleResolveBatch = async () => {
    if (!selectedBatch || !supabase) return;
    setIsResolving(true);
    try {
      const { error } = await supabase
        .from('collection_batches')
        .update({ status: 'resolved' })
        .eq('id', selectedBatch.id);
      if (error) throw error;
      toast({ title: 'Batch Resolved', description: `Batch ${selectedBatch.batch_id || selectedBatch.id.slice(0, 8)} locked for dispatch.` });
      setSelectedBatch({ ...selectedBatch, status: 'resolved' });
      setBatches(prev => prev.map(b => b.id === selectedBatch.id ? { ...b, status: 'resolved' } : b));
    } catch {
      toast({ title: 'Error', description: 'Failed to resolve batch', variant: 'destructive' });
    } finally {
      setIsResolving(false);
    }
  };

  const handleRowClick = async (batch: Batch) => {
    setSelectedBatch(batch);
    setSheetOpen(true);
    setContributions([]);
    setContributionsLoading(true);
    try {
      const res = await fetch(`/api/batch-contributions?batch_id=${batch.id}`);
      if (res.ok) {
        const data = await res.json();
        setContributions(data.contributions || []);
      }
    } catch { } finally {
      setContributionsLoading(false);
    }
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
          <h1 className="text-2xl font-semibold tracking-tight" data-testid="text-page-title">Inventory</h1>
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

                {/* Contributing farmers panel */}
                <div className="border rounded-lg overflow-hidden">
                  <div className="flex items-center gap-2 px-3 py-2 bg-muted/50 border-b">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <p className="text-sm font-medium">Contributing Farmers</p>
                    {contributions.length > 0 && (
                      <span className="ml-auto text-xs text-muted-foreground">{contributions.length} farmer{contributions.length !== 1 ? 's' : ''}</span>
                    )}
                  </div>
                  {contributionsLoading ? (
                    <div className="flex items-center justify-center py-4">
                      <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                    </div>
                  ) : contributions.length === 0 ? (
                    <p className="text-sm text-muted-foreground px-3 py-3">No contribution records found.</p>
                  ) : (
                    <div className="divide-y">
                      {contributions.map(c => {
                        const displayName = c.farm?.farmer_name ?? c.farmer_name ?? 'Unknown Farmer';
                        const community = c.farm?.community ?? null;
                        const complianceStatus = c.farm?.compliance_status ?? c.compliance_status;
                        return (
                          <div key={c.id} className="px-3 py-2.5 flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <p className="text-sm font-medium truncate" data-testid={`text-contributor-name-${c.id}`}>
                                {displayName}
                              </p>
                              {community && (
                                <p className="text-xs text-muted-foreground flex items-center gap-1" data-testid={`text-contributor-community-${c.id}`}>
                                  <MapPin className="h-3 w-3 shrink-0" />{community}
                                </p>
                              )}
                              <p className="text-xs text-muted-foreground">
                                {c.bag_count} bags · {Number(c.weight_kg).toLocaleString()} kg
                              </p>
                              <p className="text-[10px] text-muted-foreground/60 font-mono" data-testid={`text-contributor-farmid-${c.id}`}>
                                {c.farm_id.slice(0, 8)}…
                              </p>
                            </div>
                            <Badge
                              variant={complianceStatus === 'verified' || complianceStatus === 'approved' ? 'default' : complianceStatus === 'rejected' ? 'destructive' : 'secondary'}
                              className="text-[10px] shrink-0"
                            >
                              {complianceStatus}
                            </Badge>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                <div className="pt-2 border-t space-y-2">
                  {selectedBatch.status === 'collecting' && (
                    <Link href={`/app/collect?batch=${selectedBatch.id}`}>
                      <Button className="w-full" data-testid="button-add-bags">
                        <Plus className="h-4 w-4 mr-2" />
                        Add More Produce
                      </Button>
                    </Link>
                  )}
                  {selectedBatch.status === 'collecting' && selectedBatch.bag_count > 0 && (
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button variant="outline" className="w-full" data-testid="button-resolve">
                          <Lock className="h-4 w-4 mr-2" />
                          Resolve & Lock
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Resolve Batch</DialogTitle>
                          <DialogDescription>
                            Lock batch {selectedBatch.batch_id || selectedBatch.id.slice(0, 8)} for dispatch. This cannot be undone — no more bags can be added after resolving.
                          </DialogDescription>
                        </DialogHeader>
                        <DialogFooter>
                          <DialogClose asChild>
                            <Button variant="outline" data-testid="button-cancel-resolve">Cancel</Button>
                          </DialogClose>
                          <Button onClick={handleResolveBatch} disabled={isResolving} data-testid="button-confirm-resolve">
                            {isResolving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Lock className="h-4 w-4 mr-2" />}
                            Confirm Resolve
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
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
