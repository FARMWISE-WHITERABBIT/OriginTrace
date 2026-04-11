'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { InventoryTableSkeleton } from '@/components/skeletons';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
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
import { Textarea } from '@/components/ui/textarea';
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
  Navigation,
  Phone,
  Car,
  CheckSquare,
  CheckCircle2,
  ArrowRight,
} from 'lucide-react';
import Link from 'next/link';
import { generateBatchManifestCSV, downloadCSV } from '@/lib/export/csv-export';
import { TierGate } from '@/components/tier-gate';
import { StatusBadge } from '@/lib/status-badge';

interface Batch {
  id: string;
  batch_code: string | null;
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
  collection_batch_code: string | null;
  batch_code: string | null;
  weight_kg: number | null;
  grade: string | null;
  farmer_name: string | null;
  community: string | null;
  created_at: string;
}

export default function InventoryPage() {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  // ── Tab control ──
  const [activeTab, setActiveTab] = useState<string>('batches');

  const toggleSelect = (id: string) => setSelected(prev => {
    const n = new Set(prev);
    n.has(id) ? n.delete(id) : n.add(id);
    return n;
  });

  const toggleAll = (ids: string[]) => setSelected(prev =>
    prev.size === ids.length && ids.every(id => prev.has(id))
      ? new Set()
      : new Set(ids)
  );

  // ── Dispatch inline state ──
  const [dispatchSelected, setDispatchSelected] = useState<Set<string>>(new Set());
  const [dispatchDest, setDispatchDest]           = useState('');
  const [dispatchVehicle, setDispatchVehicle]     = useState('');
  const [dispatchDriver, setDispatchDriver]       = useState('');
  const [dispatchDriverPhone, setDispatchDriverPhone] = useState('');
  const [dispatchAt, setDispatchAt] = useState<string>(() => {
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    return now.toISOString().slice(0, 16);
  });
  const [dispatchNotes, setDispatchNotes]         = useState('');
  const [confirmDispatch, setConfirmDispatch]     = useState(false);
  const [isDispatching, setIsDispatching]         = useState(false);
  const [dispatchComplete, setDispatchComplete]   = useState(false);

  const toggleDispatchSelect = (id: string) => setDispatchSelected(prev => {
    const n = new Set(prev);
    n.has(id) ? n.delete(id) : n.add(id);
    return n;
  });

  const openDispatchTab = (ids: string[]) => {
    setDispatchSelected(new Set(ids));
    setDispatchComplete(false);
    setActiveTab('dispatch');
  };

  const handleDispatch = async () => {
    if (dispatchSelected.size === 0 || !dispatchDest.trim() || !confirmDispatch) return;
    setIsDispatching(true);
    try {
      const ids = [...dispatchSelected];
      const results = await Promise.all(
        ids.map(id =>
          fetch(`/api/batches/${id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: 'dispatch',
              dispatch_destination: dispatchDest.trim(),
              vehicle_reference: dispatchVehicle.trim() || null,
              driver_name: dispatchDriver.trim() || null,
              driver_phone: dispatchDriverPhone.trim() || null,
              dispatched_at: dispatchAt ? new Date(dispatchAt).toISOString() : null,
            }),
          }).then(r => r.json().then(j => ({ ok: r.ok, json: j, id })))
        )
      );
      const failed = results.filter(r => !r.ok);
      if (failed.length > 0) throw new Error(failed[0].json.error || 'Failed to dispatch one or more batches');
      // Optimistically update batch statuses in the local state
      setBatches(prev => prev.map(b => ids.includes(b.id) ? { ...b, status: 'dispatched' } : b));
      toast({ title: 'Dispatched', description: `${ids.length} batch${ids.length !== 1 ? 'es' : ''} dispatched to ${dispatchDest}` });
      setDispatchComplete(true);
      setConfirmDispatch(false);
    } catch (err: any) {
      toast({ title: 'Dispatch Error', description: err.message || 'Failed to dispatch', variant: 'destructive' });
    } finally {
      setIsDispatching(false);
    }
  };

  const resetDispatch = () => {
    setDispatchSelected(new Set());
    setDispatchDest('');
    setDispatchVehicle('');
    setDispatchDriver('');
    setDispatchDriverPhone('');
    setDispatchNotes('');
    setConfirmDispatch(false);
    setDispatchComplete(false);
  };

  // ── Read URL params on mount (deep link: /app/inventory?tab=dispatch&batch=X) ──
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const tabParam   = params.get('tab');
    const batchParam = params.get('batch');
    const batchesParam = params.get('batches');
    if (tabParam === 'dispatch') {
      setActiveTab('dispatch');
      if (batchParam) setDispatchSelected(new Set([batchParam]));
      else if (batchesParam) setDispatchSelected(new Set(batchesParam.split(',').filter(Boolean)));
    }
  }, []);

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
      || (b.batch_code && b.batch_code.toLowerCase().includes(q))
      || (b.farmer_name && b.farmer_name.toLowerCase().includes(q))
      || (b.community && b.community.toLowerCase().includes(q));
  });

  interface BatchContribution {
    id: string;
    batch_code: string | null;
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
      batch.batch_code?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      batch.farm?.farmer_name?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || batch.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });


  const handleRowClick = async (batch: Batch) => {
    router.push(`/app/inventory/${batch.id}`);
  };

  const statusCounts = {
    all:        batches.length,
    collecting: batches.filter(b => b.status === 'collecting').length,
    completed:  batches.filter(b => b.status === 'completed').length,
    aggregated: batches.filter(b => b.status === 'aggregated').length,
    resolved:   batches.filter(b => b.status === 'resolved').length,
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
              batchId: b.batch_code || b.id.slice(0, 8),
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

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="h-9">
          <TabsTrigger value="batches" className="text-sm">Batches</TabsTrigger>
          <TabsTrigger value="bags" className="text-sm" onClick={fetchBags}>Bags</TabsTrigger>
          <TabsTrigger value="dispatch" className="text-sm">
            <Truck className="h-3.5 w-3.5 mr-1.5" />
            Dispatch
          </TabsTrigger>
        </TabsList>
        <TabsContent value="batches" className="mt-4 space-y-4">
      <div className="segmented-control" data-testid="status-filter-group">
        {(['all', 'collecting', 'completed', 'aggregated', 'resolved', 'dispatched'] as const).map((status) => (
          <button
            key={status}
            className="segmented-control-item flex items-center gap-1.5"
            data-active={statusFilter === status}
            onClick={() => setStatusFilter(status)}
            data-testid={`filter-${status}`}
          >
            {status.charAt(0).toUpperCase() + status.slice(1)}
            <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${statusFilter === status ? 'bg-primary/10 text-primary' : 'bg-muted-foreground/20 text-muted-foreground'}`}>
              {statusCounts[status]}
            </span>
          </button>
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
                placeholder="Search batches..." aria-label="Search batches"
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
            <div className="rounded-md border border-border overflow-hidden">
              <table className="w-full">
                <thead className="border-b border-border bg-muted/30">
                  <tr>
                    {['Batch Code', 'Farmer', 'Bags', 'Weight', 'Status', 'Date'].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">{h}</th>
                    ))}
                  </tr>
                </thead>
                <InventoryTableSkeleton rows={6} />
              </table>
            </div>
          ) : filteredBatches.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">
                <Package className="h-6 w-6 text-muted-foreground" />
              </div>
              {searchQuery || statusFilter !== 'all' ? (
                <>
                  <p className="font-medium">No batches match your filters</p>
                  <p className="text-sm mt-1">Try clearing the search or changing the status filter</p>
                </>
              ) : (
                <>
                  <p className="font-medium text-foreground">No collection batches yet</p>
                  <p className="text-sm mt-1 max-w-xs">
                    Batches are created when a field agent completes a Smart Collect run.
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
                    <TableHead className="w-10">
                      <Checkbox
                        checked={filteredBatches.length > 0 && filteredBatches.every(b => selected.has(b.id))}
                        onCheckedChange={() => toggleAll(filteredBatches.map(b => b.id))}
                        aria-label="Select all batches"
                      />
                    </TableHead>
                    <TableHead>Batch Code</TableHead>
                    <TableHead>Farmer</TableHead>
                    <TableHead className="hidden md:table-cell">Bags</TableHead>
                    <TableHead>Weight</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="hidden md:table-cell">Date</TableHead>
                    <TableHead className="w-24 text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredBatches.map((batch) => (
                    <TableRow
                      key={batch.id}
                      className={`cursor-pointer hover:bg-muted/50 ${selected.has(batch.id) ? 'bg-primary/5' : ''}`}
                      onClick={() => handleRowClick(batch)}
                      data-testid={`batch-row-${batch.id}`}
                    >
                      <TableCell onClick={e => e.stopPropagation()}>
                        <Checkbox
                          checked={selected.has(batch.id)}
                          onCheckedChange={() => toggleSelect(batch.id)}
                          aria-label={`Select batch ${batch.batch_code || batch.id.slice(0, 8)}`}
                        />
                      </TableCell>
                      <TableCell className="font-medium font-mono text-xs">{batch.batch_code || batch.id.slice(0, 8)}</TableCell>
                      <TableCell>{batch.farm?.farmer_name}</TableCell>
                      <TableCell className="hidden md:table-cell">{batch.bag_count}</TableCell>
                      <TableCell>{batch.total_weight} kg</TableCell>
                      <TableCell><StatusBadge domain="batch" status={batch.status} /></TableCell>
                      <TableCell className="hidden md:table-cell text-muted-foreground">
                        {new Date(batch.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-right" onClick={e => e.stopPropagation()}>
                        {['completed', 'aggregated', 'resolved'].includes(batch.status) && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs"
                            onClick={() => openDispatchTab([batch.id])}
                          >
                            <Truck className="h-3.5 w-3.5 mr-1" />
                            Dispatch
                          </Button>
                        )}
                        {batch.status === 'dispatched' && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 text-xs text-muted-foreground"
                            onClick={() => router.push(`/app/dispatch/${batch.id}`)}
                          >
                            <Truck className="h-3.5 w-3.5 mr-1 text-green-600" />
                            View
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Bulk action bar */}
      {selected.size > 0 && (
        <div className="fixed bottom-20 lg:bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 bg-background border border-border rounded-xl shadow-lg px-4 py-3">
          <span className="text-sm font-medium text-muted-foreground">{selected.size} batch{selected.size !== 1 ? 'es' : ''} selected</span>
          <div className="w-px h-4 bg-border" />
          {(() => {
            const dispatchable = filteredBatches.filter(b => selected.has(b.id) && ['completed', 'aggregated', 'resolved'].includes(b.status));
            return dispatchable.length > 0 ? (
              <Button
                size="sm"
                variant="default"
                onClick={() => { setSelected(new Set()); openDispatchTab(dispatchable.map(b => b.id)); }}
              >
                <Truck className="h-3.5 w-3.5 mr-1.5" />
                Dispatch {dispatchable.length > 1 ? `${dispatchable.length} Batches` : 'Batch'}
              </Button>
            ) : null;
          })()}
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              const ids = [...selected].join(',');
              router.push(`/app/processing?batch_ids=${ids}`);
            }}
          >
            Add to Processing Run
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              const selectedBatches = filteredBatches.filter(b => selected.has(b.id));
              const csv = ['Batch Code,Farmer,Weight,Status,Date',
                ...selectedBatches.map(b => [
                  b.batch_code || b.id.slice(0,8),
                  b.farm?.farmer_name || '',
                  b.total_weight,
                  b.status,
                  new Date(b.created_at).toLocaleDateString()
                ].join(','))
              ].join('\n');
              const blob = new Blob([csv], { type: 'text/csv' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a'); a.href = url; a.download = 'batches.csv'; a.click();
              URL.revokeObjectURL(url);
            }}
          >
            Export CSV
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setSelected(new Set())}>
            Clear
          </Button>
        </div>
      )}

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
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: 'Total',     value: bags.length,                                       iconClass: 'icon-bg-blue',    accent: 'card-accent-blue' },
                { label: 'Unused',    value: bags.filter(b => b.status === 'unused').length,    iconClass: 'icon-bg-neutral', accent: '' },
                { label: 'Collected', value: bags.filter(b => b.status === 'collected').length, iconClass: 'icon-bg-emerald', accent: 'card-accent-emerald' },
                { label: 'Processed', value: bags.filter(b => b.status === 'processed').length, iconClass: 'icon-bg-violet', accent: 'card-accent-violet' },
              ].map(s => (
                <Card key={s.label} className={`${s.accent} transition-shadow hover:shadow-sm`}>
                  <CardContent className="p-3 text-center">
                    <p className="text-xl font-bold tracking-tight">{s.value}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{s.label}</p>
                  </CardContent>
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
                        <TableHead>Batch Code</TableHead>
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
                          <TableCell className="text-muted-foreground text-sm">{bag.batch_code || '—'}</TableCell>
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

      {/* ── DISPATCH TAB ── */}
      <TabsContent value="dispatch" className="mt-4">
        <TierGate feature="dispatch" requiredTier="basic" featureLabel="Dispatch">
          {dispatchComplete ? (
            // ── Success State ──
            <Card>
              <CardContent className="py-12 text-center space-y-4">
                <div className="h-14 w-14 rounded-full bg-emerald-500/10 flex items-center justify-center mx-auto">
                  <CheckCircle2 className="h-7 w-7 text-emerald-600" />
                </div>
                <div>
                  <p className="text-lg font-semibold">Dispatch Complete</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {dispatchSelected.size} batch{dispatchSelected.size !== 1 ? 'es' : ''} dispatched to <span className="font-medium">{dispatchDest}</span>
                  </p>
                </div>
                <div className="flex items-center justify-center gap-3 pt-2">
                  <Button variant="outline" onClick={resetDispatch}>
                    Dispatch Another
                  </Button>
                  <Button onClick={() => setActiveTab('batches')}>
                    Back to Inventory
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className={`grid gap-4 ${dispatchSelected.size > 0 ? 'lg:grid-cols-[1fr_380px]' : ''}`}>
              {/* ── Batch selector ── */}
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between flex-wrap gap-3">
                    <div>
                      <CardTitle className="text-base font-semibold flex items-center gap-2">
                        <Truck className="h-4 w-4 text-primary" />
                        Select Batches to Dispatch
                      </CardTitle>
                      <CardDescription className="mt-0.5">
                        Choose completed or aggregated batches ready for dispatch
                      </CardDescription>
                    </div>
                    {dispatchSelected.size > 0 && (
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="font-mono">
                          {dispatchSelected.size} selected
                        </Badge>
                        <Button size="sm" variant="ghost" className="h-7 text-xs text-muted-foreground" onClick={() => setDispatchSelected(new Set())}>
                          Clear
                        </Button>
                      </div>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  {(() => {
                    const dispatchable = batches.filter(b => ['completed', 'aggregated', 'resolved'].includes(b.status));
                    if (isLoading) {
                      return <div className="flex items-center justify-center h-40"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
                    }
                    if (dispatchable.length === 0) {
                      return (
                        <div className="text-center py-12 text-muted-foreground">
                          <Truck className="h-10 w-10 mx-auto mb-3 opacity-30" />
                          <p className="font-medium">No batches ready for dispatch</p>
                          <p className="text-sm mt-1">Batches must be in <em>Completed</em> or <em>Aggregated</em> status before they can be dispatched.</p>
                        </div>
                      );
                    }
                    return (
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead className="w-10">
                                <Checkbox
                                  checked={dispatchable.length > 0 && dispatchable.every(b => dispatchSelected.has(b.id))}
                                  onCheckedChange={() => {
                                    if (dispatchable.every(b => dispatchSelected.has(b.id))) {
                                      setDispatchSelected(new Set());
                                    } else {
                                      setDispatchSelected(new Set(dispatchable.map(b => b.id)));
                                    }
                                  }}
                                  aria-label="Select all dispatchable batches"
                                />
                              </TableHead>
                              <TableHead>Batch</TableHead>
                              <TableHead>Farmer</TableHead>
                              <TableHead className="hidden sm:table-cell">Weight</TableHead>
                              <TableHead>Status</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {dispatchable.map(batch => (
                              <TableRow
                                key={batch.id}
                                className={`cursor-pointer ${dispatchSelected.has(batch.id) ? 'bg-primary/5' : 'hover:bg-muted/50'}`}
                                onClick={() => toggleDispatchSelect(batch.id)}
                              >
                                <TableCell onClick={e => e.stopPropagation()}>
                                  <Checkbox
                                    checked={dispatchSelected.has(batch.id)}
                                    onCheckedChange={() => toggleDispatchSelect(batch.id)}
                                  />
                                </TableCell>
                                <TableCell className="font-mono text-xs font-medium">{batch.batch_code || batch.id.slice(0, 8)}</TableCell>
                                <TableCell className="text-sm">{batch.farm?.farmer_name || '—'}</TableCell>
                                <TableCell className="hidden sm:table-cell text-sm text-muted-foreground">
                                  {batch.total_weight.toLocaleString()} kg
                                </TableCell>
                                <TableCell><StatusBadge domain="batch" status={batch.status} /></TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    );
                  })()}
                </CardContent>
              </Card>

              {/* ── Dispatch form (shown when selection is non-empty) ── */}
              {dispatchSelected.size > 0 && (
                <Card className="self-start">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base font-semibold flex items-center gap-2">
                      <Send className="h-4 w-4 text-primary" />
                      Dispatch Details
                    </CardTitle>
                    <CardDescription>
                      {(() => {
                        const sel = batches.filter(b => dispatchSelected.has(b.id));
                        const total = sel.reduce((s, b) => s + b.total_weight, 0);
                        return `${sel.length} batch${sel.length !== 1 ? 'es' : ''} · ${total.toLocaleString()} kg total`;
                      })()}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="dp-dest" className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        Destination <span className="text-red-500">*</span>
                      </Label>
                      <div className="relative">
                        <Navigation className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                        <Input
                          id="dp-dest"
                          className="pl-8 h-9"
                          placeholder="Warehouse, processing facility…"
                          value={dispatchDest}
                          onChange={e => setDispatchDest(e.target.value)}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1.5">
                        <Label htmlFor="dp-vehicle" className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Vehicle Ref</Label>
                        <div className="relative">
                          <Car className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                          <Input id="dp-vehicle" className="pl-8 h-9" placeholder="Plate / ref" value={dispatchVehicle} onChange={e => setDispatchVehicle(e.target.value)} />
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="dp-driver" className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Driver</Label>
                        <div className="relative">
                          <User className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                          <Input id="dp-driver" className="pl-8 h-9" placeholder="Driver name" value={dispatchDriver} onChange={e => setDispatchDriver(e.target.value)} />
                        </div>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="dp-phone" className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Driver Phone</Label>
                      <div className="relative">
                        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                        <Input id="dp-phone" type="tel" className="pl-8 h-9" placeholder="+234…" value={dispatchDriverPhone} onChange={e => setDispatchDriverPhone(e.target.value)} />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="dp-at" className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Dispatch Date &amp; Time</Label>
                      <div className="relative">
                        <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                        <Input id="dp-at" type="datetime-local" className="pl-8 h-9 text-sm" value={dispatchAt} onChange={e => setDispatchAt(e.target.value)} />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="dp-notes" className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Notes</Label>
                      <Textarea id="dp-notes" className="h-16 resize-none text-sm" placeholder="Optional notes…" value={dispatchNotes} onChange={e => setDispatchNotes(e.target.value)} />
                    </div>

                    <div className="flex items-start gap-2 pt-1">
                      <Checkbox
                        id="dp-confirm"
                        checked={confirmDispatch}
                        onCheckedChange={v => setConfirmDispatch(v === true)}
                      />
                      <Label htmlFor="dp-confirm" className="text-xs text-muted-foreground leading-relaxed cursor-pointer">
                        I confirm the selected batches are ready for dispatch and all details are correct.
                      </Label>
                    </div>

                    <Button
                      className="w-full"
                      disabled={!dispatchDest.trim() || !confirmDispatch || isDispatching}
                      onClick={handleDispatch}
                    >
                      {isDispatching
                        ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Dispatching…</>
                        : <><Truck className="h-4 w-4 mr-2" />Dispatch {dispatchSelected.size} Batch{dispatchSelected.size !== 1 ? 'es' : ''}</>
                      }
                    </Button>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </TierGate>
      </TabsContent>
      </Tabs>
    </div>
    </TierGate>
  );
}
