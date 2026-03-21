'use client';

import { useState, useEffect } from 'react';
import { ShipmentCardSkeleton } from '@/components/skeletons';
import { useRouter } from 'next/navigation';
import { useOrg } from '@/lib/contexts/org-context';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { TierGate } from '@/components/tier-gate';
import {
  Loader2,
  Plus,
  Search,
  Ship,
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Clock,
  Package,
  FileText,
} from 'lucide-react';

interface Shipment {
  id: string;
  shipment_code: string;
  status: string;
  destination_country: string | null;
  destination_port: string | null;
  buyer_company: string | null;
  commodity: string | null;
  total_weight_kg: number;
  total_items: number;
  readiness_score: number | null;
  readiness_decision: string | null;
  score_breakdown: Array<{ name: string; score: number; weight: number }> | null;
  estimated_ship_date: string | null;
  created_at: string;
  item_count?: number;
  linked_contracts?: Array<{ id: number; contract_reference: string }>;
}

const DECISION_CONFIG: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline'; icon: typeof CheckCircle2 }> = {
  go: { label: 'Ready to Ship', variant: 'default', icon: CheckCircle2 },
  conditional: { label: 'Conditional', variant: 'secondary', icon: AlertTriangle },
  no_go: { label: 'Do Not Ship', variant: 'destructive', icon: XCircle },
  pending: { label: 'Pending', variant: 'outline', icon: Clock },
};

const STATUS_LABELS: Record<string, string> = {
  draft: 'Draft',
  ready: 'Ready',
  shipped: 'Shipped',
  cancelled: 'Cancelled',
};


// Short names for the 5 dimensions used in sparkline bars
const DIM_SHORT: Record<string, string> = {
  'Traceability Integrity':        'Trace',
  'Chemical & Contamination Risk': 'Chem',
  'Documentation Completeness':    'Docs',
  'Storage & Handling Controls':   'Store',
  'Regulatory Alignment':          'Reg',
};

function ScoreSparkline({ breakdown }: { breakdown: Array<{ name: string; score: number }> | null }) {
  if (!breakdown || breakdown.length === 0) return null;
  return (
    <div className="flex items-end gap-0.5 h-8" title={breakdown.map(d => `${DIM_SHORT[d.name] || d.name}: ${Math.round(d.score)}`).join(' | ')}>
      {breakdown.map(dim => {
        const pct = Math.round(dim.score);
        const color = pct >= 75 ? '#16a34a' : pct >= 50 ? '#f59e0b' : '#dc2626';
        return (
          <div key={dim.name} className="flex flex-col items-center gap-0.5" style={{ width: 10 }}>
            <div
              style={{ height: `${Math.max(4, (pct / 100) * 28)}px`, backgroundColor: color, borderRadius: 2, width: 8, opacity: 0.85 }}
              title={`${DIM_SHORT[dim.name] || dim.name}: ${pct}`}
            />
          </div>
        );
      })}
    </div>
  );
}

export default function ShipmentsPage() {
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [newShipment, setNewShipment] = useState({
    destination_country: '',
    commodity: '',
    buyer_company: '',
    estimated_ship_date: '',
  });
  const { organization, profile, isLoading: orgLoading } = useOrg();
  const { toast } = useToast();
  const router = useRouter();

  const fetchShipments = async () => {
    if (orgLoading) return;
    if (!organization) {
      setIsLoading(false);
      return;
    }
    try {
      const url = statusFilter !== 'all'
        ? `/api/shipments?status=${statusFilter}`
        : '/api/shipments';
      const response = await fetch(url);
      if (!response.ok) throw new Error('Failed to fetch shipments');
      const data = await response.json();
      setShipments(data.shipments || []);
    } catch (error) {
      console.error('Failed to fetch shipments:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchShipments();
  }, [organization, orgLoading, statusFilter]);

  const handleCreate = async () => {
    if (!newShipment.destination_country || !newShipment.commodity) {
      toast({ title: 'Missing fields', description: 'Destination country and commodity are required.', variant: 'destructive' });
      return;
    }
    setIsCreating(true);
    try {
      const response = await fetch('/api/shipments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newShipment),
      });
      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Failed to create shipment');
      }
      const data = await response.json();
      toast({ title: 'Shipment created', description: `Shipment ${data.shipment?.shipment_code || ''} has been created.` });
      setDialogOpen(false);
      setNewShipment({ destination_country: '', commodity: '', buyer_company: '', estimated_ship_date: '' });
      fetchShipments();
    } catch (error: unknown) {
      toast({ title: 'Error', description: error instanceof Error ? error.message : 'Failed to create shipment', variant: 'destructive' });
    } finally {
      setIsCreating(false);
    }
  };

  const filteredShipments = shipments.filter(s => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      s.shipment_code.toLowerCase().includes(q) ||
      (s.destination_country?.toLowerCase().includes(q)) ||
      (s.buyer_company?.toLowerCase().includes(q)) ||
      (s.commodity?.toLowerCase().includes(q))
    );
  });

  const stats = {
    total: shipments.length,
    ready: shipments.filter(s => s.readiness_decision === 'go').length,
    conditional: shipments.filter(s => s.readiness_decision === 'conditional').length,
    blocked: shipments.filter(s => s.readiness_decision === 'no_go').length,
  };

  return (
    <TierGate feature="shipment_readiness" requiredTier="pro" featureLabel="Shipment Readiness">
      <div className="flex-1 space-y-6 p-6">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight" data-testid="text-page-title">
              Shipment Readiness
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Pre-shipment compliance scoring and Go/No-Go export decisions
            </p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button data-testid="button-create-shipment">
                <Plus className="h-4 w-4 mr-2" />
                New Shipment
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create Shipment</DialogTitle>
                <DialogDescription>
                  Set up a new shipment to assess export readiness.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="destination">Destination Country</Label>
                  <Input
                    id="destination"
                    placeholder="e.g. Netherlands, Germany, USA"
                    value={newShipment.destination_country}
                    onChange={e => setNewShipment(s => ({ ...s, destination_country: e.target.value }))}
                    data-testid="input-destination-country"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="commodity">Commodity</Label>
                  <Input
                    id="commodity"
                    placeholder="e.g. Cocoa, Coffee, Cashew"
                    value={newShipment.commodity}
                    onChange={e => setNewShipment(s => ({ ...s, commodity: e.target.value }))}
                    data-testid="input-commodity"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="buyer">Buyer Company (optional)</Label>
                  <Input
                    id="buyer"
                    placeholder="e.g. Barry Callebaut"
                    value={newShipment.buyer_company}
                    onChange={e => setNewShipment(s => ({ ...s, buyer_company: e.target.value }))}
                    data-testid="input-buyer-company"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="shipDate">Estimated Ship Date (optional)</Label>
                  <Input
                    id="shipDate"
                    type="date"
                    value={newShipment.estimated_ship_date}
                    onChange={e => setNewShipment(s => ({ ...s, estimated_ship_date: e.target.value }))}
                    data-testid="input-ship-date"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setDialogOpen(false)} data-testid="button-cancel-create">
                  Cancel
                </Button>
                <Button onClick={handleCreate} disabled={isCreating} data-testid="button-confirm-create">
                  {isCreating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Create Shipment
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-md bg-muted flex items-center justify-center">
                  <Package className="h-5 w-5 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-2xl font-bold" data-testid="text-stat-total">{stats.total}</p>
                  <p className="text-xs text-muted-foreground">Total Shipments</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-md bg-green-500/10 flex items-center justify-center">
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold" data-testid="text-stat-ready">{stats.ready}</p>
                  <p className="text-xs text-muted-foreground">Ready to Ship</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-md bg-yellow-500/10 flex items-center justify-center">
                  <AlertTriangle className="h-5 w-5 text-yellow-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold" data-testid="text-stat-conditional">{stats.conditional}</p>
                  <p className="text-xs text-muted-foreground">Conditional</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-md bg-red-500/10 flex items-center justify-center">
                  <XCircle className="h-5 w-5 text-red-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold" data-testid="text-stat-blocked">{stats.blocked}</p>
                  <p className="text-xs text-muted-foreground">Blocked</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by code, destination, buyer, commodity..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="pl-9"
              data-testid="input-search-shipments"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[150px]" data-testid="select-status-filter">
              <SelectValue placeholder="All Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="ready">Ready</SelectItem>
              <SelectItem value="shipped">Shipped</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {isLoading || orgLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => <ShipmentCardSkeleton key={i} />)}
          </div>
        ) : filteredShipments.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16 text-center">
              <Ship className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-1">No shipments yet</h3>
              <p className="text-sm text-muted-foreground mb-4 max-w-md">
                Create your first shipment to start assessing export readiness. Add batches and finished goods, then get a Go/No-Go decision.
              </p>
              <Button onClick={() => setDialogOpen(true)} data-testid="button-create-first-shipment">
                <Plus className="h-4 w-4 mr-2" />
                Create First Shipment
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {filteredShipments.map(shipment => {
              const decision = DECISION_CONFIG[shipment.readiness_decision || 'pending'] || DECISION_CONFIG.pending;
              const DecisionIcon = decision.icon;

              return (
                <Card
                  key={shipment.id}
                  className="hover-elevate cursor-pointer"
                  onClick={() => router.push(`/app/shipments/${shipment.id}`)}
                  data-testid={`card-shipment-${shipment.id}`}
                >
                  <CardContent className="py-4">
                    <div className="flex items-center justify-between gap-4 flex-wrap">
                      <div className="flex items-center gap-4 min-w-0">
                        <div className="h-10 w-10 rounded-md bg-muted flex items-center justify-center shrink-0">
                          <Ship className="h-5 w-5 text-muted-foreground" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-mono text-sm font-medium" data-testid={`text-shipment-code-${shipment.id}`}>
                              {shipment.shipment_code}
                            </span>
                            <Badge variant="outline" data-testid={`badge-status-${shipment.id}`}>
                              {STATUS_LABELS[shipment.status] || shipment.status}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground flex-wrap">
                            {shipment.destination_country && (
                              <span>{shipment.destination_country}</span>
                            )}
                            {shipment.commodity && (
                              <span>{shipment.commodity}</span>
                            )}
                            {shipment.buyer_company && (
                              <span>{shipment.buyer_company}</span>
                            )}
                            <span>{shipment.total_items || 0} items</span>
                            {shipment.total_weight_kg > 0 && (
                              <span>{Number(shipment.total_weight_kg).toLocaleString()} kg</span>
                            )}
                            {shipment.linked_contracts && shipment.linked_contracts.length > 0 && (
                              <span className="flex items-center gap-1 text-xs font-medium text-primary" data-testid={`text-contract-link-${shipment.id}`}>
                                <FileText className="h-3 w-3" />
                                {shipment.linked_contracts.map(c => c.contract_reference).join(', ')}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-3">
                          {shipment.score_breakdown && shipment.score_breakdown.length > 0 ? (
                            <div className="flex flex-col items-end gap-0.5">
                              <ScoreSparkline breakdown={shipment.score_breakdown} />
                              <p className="text-[10px] text-muted-foreground">5 dimensions</p>
                            </div>
                          ) : null}
                          {shipment.readiness_score !== null && (
                            <div className="text-right">
                              <p className="text-2xl font-bold" data-testid={`text-score-${shipment.id}`}>
                                {shipment.readiness_score}
                              </p>
                              <p className="text-xs text-muted-foreground">Score</p>
                            </div>
                          )}
                        </div>
                        <Badge variant={decision.variant} data-testid={`badge-decision-${shipment.id}`}>
                          <DecisionIcon className="h-3 w-3 mr-1" />
                          {decision.label}
                        </Badge>
                        <ArrowRight className="h-4 w-4 text-muted-foreground" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </TierGate>
  );
}
