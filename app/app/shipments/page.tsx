'use client';

import { useState, useEffect } from 'react';
import { ShipmentCardSkeleton } from '@/components/skeletons';
import { useRouter } from 'next/navigation';
import { useOrg } from '@/lib/contexts/org-context';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { TierGate } from '@/components/tier-gate';
import { Textarea } from '@/components/ui/textarea';
import {
  Loader2,
  Plus,
  Search,
  Ship,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Clock,
  MapPin,
  FileText,
  Package,
  Calendar,
  Globe,
  Users,
  ShieldCheck,
  ChevronRight,
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
  payment_status?: string;
}

const PAYMENT_STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  pending_setup:     { label: 'Payment Pending Setup', className: 'bg-amber-50 text-amber-700 border-amber-200' },
  awaiting_payment:  { label: 'Awaiting Payment',      className: 'bg-blue-50 text-blue-700 border-blue-200' },
  partially_funded:  { label: 'Partially Funded',      className: 'bg-violet-50 text-violet-700 border-violet-200' },
  funded:            { label: 'Funded',                 className: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  released:          { label: 'Released',               className: 'bg-slate-100 text-slate-600 border-slate-200' },
};

const DECISION_CONFIG: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline'; icon: typeof CheckCircle2; colorClass: string }> = {
  go:          { label: 'GO',          variant: 'default',     icon: CheckCircle2,  colorClass: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  conditional: { label: 'CONDITIONAL', variant: 'secondary',   icon: AlertTriangle, colorClass: 'bg-amber-50 text-amber-700 border-amber-200' },
  no_go:       { label: 'NO-GO',       variant: 'destructive', icon: XCircle,       colorClass: 'bg-red-50 text-red-700 border-red-200' },
  pending:     { label: 'PENDING',     variant: 'outline',     icon: Clock,         colorClass: 'bg-muted text-muted-foreground border-border' },
};

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  draft:     { label: 'Draft',     className: 'bg-slate-100 text-slate-600 border-slate-200' },
  ready:     { label: 'Ready',     className: 'bg-blue-50 text-blue-700 border-blue-200' },
  conditional: { label: 'Conditional', className: 'bg-amber-50 text-amber-700 border-amber-200' },
  shipped:   { label: 'Shipped',   className: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  cancelled: { label: 'Cancelled', className: 'bg-red-50 text-red-600 border-red-200' },
};

// Short names for the 5 dimensions used in score bars
const DIM_SHORT: Record<string, string> = {
  'Traceability Integrity':        'Trace',
  'Chemical & Contamination Risk': 'Chem',
  'Documentation Completeness':    'Docs',
  'Storage & Handling Controls':   'Store',
  'Regulatory Alignment':          'Reg',
};

const DIM_COLORS = ['#3B82F6', '#8B5CF6', '#10B981', '#F59E0B', '#EF4444'];

function ScoreBar({ breakdown }: { breakdown: Array<{ name: string; score: number }> | null }) {
  if (!breakdown || breakdown.length === 0) return null;
  const total = breakdown.reduce((sum, d) => sum + d.score, 0);
  return (
    <div className="space-y-1.5">
      <div className="flex h-2 w-full rounded-full overflow-hidden gap-px bg-muted">
        {breakdown.map((dim, i) => {
          const pct = total > 0 ? (dim.score / total) * 100 : 100 / breakdown.length;
          const color = DIM_COLORS[i % DIM_COLORS.length];
          return (
            <div
              key={dim.name}
              style={{ width: `${pct}%`, backgroundColor: color }}
              title={`${DIM_SHORT[dim.name] || dim.name}: ${Math.round(dim.score)}`}
              className="transition-all"
            />
          );
        })}
      </div>
      <div className="flex items-center gap-2 flex-wrap">
        {breakdown.map((dim, i) => (
          <div key={dim.name} className="flex items-center gap-1">
            <div className="h-1.5 w-1.5 rounded-full shrink-0" style={{ backgroundColor: DIM_COLORS[i % DIM_COLORS.length] }} />
            <span className="text-[10px] text-muted-foreground">{DIM_SHORT[dim.name] || dim.name}</span>
            <span className="text-[10px] font-medium tabular-nums">{Math.round(dim.score)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

interface ShipmentTemplate {
  id: string;
  name: string;
  description: string | null;
  destination_country: string | null;
  destination_port: string | null;
  buyer_company: string | null;
  buyer_contact: string | null;
  commodity: string | null;
  target_regulations: string[];
  freight_forwarder_name: string | null;
  clearing_agent_name: string | null;
  contract_price_per_mt: number | null;
}

const STATUS_FILTER_OPTIONS = [
  { value: 'all',        label: 'All' },
  { value: 'draft',      label: 'Draft' },
  { value: 'ready',      label: 'Ready' },
  { value: 'conditional',label: 'Conditional' },
  { value: 'shipped',    label: 'Shipped' },
  { value: 'cancelled',  label: 'Cancelled' },
];

export default function ShipmentsPage() {
  const [shipments, setShipments]           = useState<Shipment[]>([]);
  const [isLoading, setIsLoading]           = useState(true);
  const [searchQuery, setSearchQuery]       = useState('');
  const [statusFilter, setStatusFilter]     = useState('all');
  const [sortBy, setSortBy]                 = useState<'date' | 'score'>('date');
  const [dialogOpen, setDialogOpen]         = useState(false);
  const [createStep, setCreateStep]         = useState<1|2>(1);
  const [isCreating, setIsCreating]         = useState(false);
  const [templates, setTemplates]           = useState<ShipmentTemplate[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const [newShipment, setNewShipment]       = useState({
    destination_country: '',
    destination_port: '',
    commodity: '',
    estimated_ship_date: '',
    buyer_company: '',
    buyer_contact: '',
    target_regulations: [] as string[],
    notes: '',
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
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to fetch shipments');
      setShipments(data.shipments || []);
    } catch (error: any) {
      console.error('Failed to fetch shipments:', error);
      toast({ title: 'Failed to load shipments', description: error.message, variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchShipments();
  }, [organization, orgLoading, statusFilter]);

  const fetchTemplates = async () => {
    try {
      const res = await fetch('/api/shipment-templates');
      if (res.ok) {
        const d = await res.json();
        setTemplates(d.templates ?? []);
      }
    } catch { /* silent */ }
  };

  const applyTemplate = (templateId: string) => {
    const tpl = templates.find((t) => t.id === templateId);
    if (!tpl) return;
    setNewShipment((s) => ({
      ...s,
      destination_country:   tpl.destination_country   ?? s.destination_country,
      destination_port:      tpl.destination_port       ?? s.destination_port,
      commodity:             tpl.commodity              ?? s.commodity,
      buyer_company:         tpl.buyer_company          ?? s.buyer_company,
      buyer_contact:         tpl.buyer_contact          ?? s.buyer_contact,
      target_regulations:    tpl.target_regulations?.length ? tpl.target_regulations : s.target_regulations,
    }));
  };

  const handleCreate = async () => {
    if (!newShipment.destination_country || !newShipment.commodity) {
      toast({ title: 'Missing fields', description: 'Destination country and commodity are required.', variant: 'destructive' });
      return;
    }
    setIsCreating(true);
    try {
      const body = {
        destination_country:  newShipment.destination_country,
        destination_port:     newShipment.destination_port     || undefined,
        commodity:            newShipment.commodity,
        estimated_ship_date:  newShipment.estimated_ship_date  || undefined,
        buyer_company:        newShipment.buyer_company        || undefined,
        buyer_contact:        newShipment.buyer_contact        || undefined,
        target_regulations:   newShipment.target_regulations.length ? newShipment.target_regulations : undefined,
        notes:                newShipment.notes                || undefined,
      };
      const response = await fetch('/api/shipments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Failed to create shipment');
      }
      const data = await response.json();
      toast({ title: 'Shipment created', description: `Shipment ${data.shipment?.shipment_code || ''} has been created.` });
      setDialogOpen(false);
      setNewShipment({ destination_country: '', destination_port: '', commodity: '', estimated_ship_date: '', buyer_company: '', buyer_contact: '', target_regulations: [], notes: '' });
      setSelectedTemplateId('');
      setCreateStep(1);
      fetchShipments();
    } catch (error: unknown) {
      toast({ title: 'Error', description: error instanceof Error ? error.message : 'Failed to create shipment', variant: 'destructive' });
    } finally {
      setIsCreating(false);
    }
  };

  const filteredShipments = shipments
    .filter(s => {
      if (!searchQuery) return true;
      const q = searchQuery.toLowerCase();
      return (
        s.shipment_code.toLowerCase().includes(q) ||
        (s.destination_country?.toLowerCase().includes(q)) ||
        (s.buyer_company?.toLowerCase().includes(q)) ||
        (s.commodity?.toLowerCase().includes(q))
      );
    })
    .sort((a, b) => {
      if (sortBy === 'score') {
        return (b.readiness_score ?? -1) - (a.readiness_score ?? -1);
      }
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

  const stats = {
    total:       shipments.length,
    ready:       shipments.filter(s => s.readiness_decision === 'go').length,
    conditional: shipments.filter(s => s.readiness_decision === 'conditional').length,
    blocked:     shipments.filter(s => s.readiness_decision === 'no_go').length,
  };

  return (
    <TierGate feature="shipment_readiness" requiredTier="pro" featureLabel="Shipment Readiness">
      <div className="flex-1 space-y-6 p-6">

        {/* ── Header ── */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg flex items-center justify-center icon-bg-blue shrink-0">
              <Ship className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-2xl font-semibold tracking-tight" data-testid="text-page-title">
                Shipment Operations
              </h1>
              <p className="text-sm text-muted-foreground mt-0.5">
                Manage export shipments and compliance readiness checks
              </p>
            </div>
          </div>

          <Dialog open={dialogOpen} onOpenChange={(v) => { setDialogOpen(v); if (v) { fetchTemplates(); setCreateStep(1); } }}>
            <DialogTrigger asChild>
              <Button data-testid="button-create-shipment">
                <Plus className="h-4 w-4 mr-2" />
                New Shipment
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>New Shipment</DialogTitle>
                <DialogDescription>
                  {createStep === 1 ? 'Set the destination, commodity and departure details.' : 'Add buyer, compliance targets and any notes.'}
                </DialogDescription>
              </DialogHeader>

              {/* Step indicator */}
              <div className="flex items-center gap-2 px-0.5 pb-1">
                {[{ n: 1, label: 'Shipment Details' }, { n: 2, label: 'Commercial & Compliance' }].map(({ n, label }, i, arr) => (
                  <div key={n} className="flex items-center gap-2 flex-1">
                    <div className={`flex items-center gap-1.5 text-xs font-medium ${createStep === n ? 'text-primary' : createStep > n ? 'text-emerald-600' : 'text-muted-foreground'}`}>
                      <div className={`h-5 w-5 rounded-full flex items-center justify-center text-[10px] font-semibold ${createStep === n ? 'bg-primary text-primary-foreground' : createStep > n ? 'bg-emerald-600 text-white' : 'bg-muted text-muted-foreground'}`}>
                        {createStep > n ? <CheckCircle2 className="h-3 w-3" /> : n}
                      </div>
                      <span className="hidden sm:inline">{label}</span>
                    </div>
                    {i < arr.length - 1 && <div className="flex-1 h-px bg-border" />}
                  </div>
                ))}
              </div>

              {/* ── Step 1: Shipment Basics ── */}
              {createStep === 1 && (
                <div className="space-y-4 py-2">
                  {templates.length > 0 && (
                    <div className="space-y-1.5">
                      <Label htmlFor="template" className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Start from Template</Label>
                      <Select value={selectedTemplateId} onValueChange={(v) => { setSelectedTemplateId(v); if (v) applyTemplate(v); }}>
                        <SelectTrigger id="template" className="h-9">
                          <SelectValue placeholder="Select a template (optional)…" />
                        </SelectTrigger>
                        <SelectContent>
                          {templates.map((t) => (
                            <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-3">
                    <div className="col-span-2 space-y-1.5">
                      <Label htmlFor="destination" className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Destination Country <span className="text-red-500">*</span></Label>
                      <div className="relative">
                        <Globe className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                        <Input
                          id="destination"
                          className="pl-8 h-9"
                          placeholder="e.g. Netherlands, Germany, USA"
                          value={newShipment.destination_country}
                          onChange={e => setNewShipment(s => ({ ...s, destination_country: e.target.value }))}
                          data-testid="input-destination-country"
                        />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="destPort" className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Destination Port</Label>
                      <Input
                        id="destPort"
                        className="h-9"
                        placeholder="e.g. Rotterdam, Hamburg"
                        value={newShipment.destination_port}
                        onChange={e => setNewShipment(s => ({ ...s, destination_port: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="commodity" className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Commodity <span className="text-red-500">*</span></Label>
                      <div className="relative">
                        <Package className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                        <Input
                          id="commodity"
                          className="pl-8 h-9"
                          placeholder="e.g. Cocoa, Cashew"
                          value={newShipment.commodity}
                          onChange={e => setNewShipment(s => ({ ...s, commodity: e.target.value }))}
                          data-testid="input-commodity"
                        />
                      </div>
                    </div>
                    <div className="col-span-2 space-y-1.5">
                      <Label htmlFor="shipDate" className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Estimated Ship Date</Label>
                      <div className="relative">
                        <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                        <Input
                          id="shipDate"
                          type="date"
                          className="pl-8 h-9"
                          value={newShipment.estimated_ship_date}
                          onChange={e => setNewShipment(s => ({ ...s, estimated_ship_date: e.target.value }))}
                          data-testid="input-ship-date"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ── Step 2: Commercial & Compliance ── */}
              {createStep === 2 && (
                <div className="space-y-4 py-2">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="buyer" className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Buyer Company</Label>
                      <div className="relative">
                        <Users className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                        <Input
                          id="buyer"
                          className="pl-8 h-9"
                          placeholder="e.g. Barry Callebaut"
                          value={newShipment.buyer_company}
                          onChange={e => setNewShipment(s => ({ ...s, buyer_company: e.target.value }))}
                          data-testid="input-buyer-company"
                        />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="buyerContact" className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Buyer Contact</Label>
                      <Input
                        id="buyerContact"
                        className="h-9"
                        placeholder="Name or email"
                        value={newShipment.buyer_contact}
                        onChange={e => setNewShipment(s => ({ ...s, buyer_contact: e.target.value }))}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
                      <ShieldCheck className="h-3.5 w-3.5" />
                      Target Compliance Regulations
                    </Label>
                    <div className="grid grid-cols-2 gap-1.5">
                      {[
                        'EUDR',
                        'UK Timber Regulation',
                        'ISO 34101 (Cocoa)',
                        'Rainforest Alliance',
                        'FairTrade Certified',
                        'UTZ / RA Merged',
                        'RSPO (Palm)',
                        'FDA FSMA',
                      ].map((reg) => {
                        const active = newShipment.target_regulations.includes(reg);
                        return (
                          <button
                            key={reg}
                            type="button"
                            onClick={() =>
                              setNewShipment(s => ({
                                ...s,
                                target_regulations: active
                                  ? s.target_regulations.filter(r => r !== reg)
                                  : [...s.target_regulations, reg],
                              }))
                            }
                            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border text-xs font-medium transition-colors text-left ${
                              active
                                ? 'border-primary bg-primary/10 text-primary'
                                : 'border-border bg-background text-muted-foreground hover:border-primary/40 hover:text-foreground'
                            }`}
                          >
                            <div className={`h-3.5 w-3.5 rounded-sm border flex items-center justify-center shrink-0 ${active ? 'border-primary bg-primary' : 'border-muted-foreground/40'}`}>
                              {active && <CheckCircle2 className="h-2.5 w-2.5 text-primary-foreground" />}
                            </div>
                            {reg}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="notes" className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Notes (optional)</Label>
                    <Textarea
                      id="notes"
                      className="h-20 resize-none text-sm"
                      placeholder="Special handling instructions, consolidation notes, etc."
                      value={newShipment.notes}
                      onChange={e => setNewShipment(s => ({ ...s, notes: e.target.value }))}
                    />
                  </div>
                </div>
              )}

              <DialogFooter className="gap-2">
                <Button
                  variant="outline"
                  onClick={() => createStep === 1 ? setDialogOpen(false) : setCreateStep(1)}
                  data-testid="button-cancel-create"
                >
                  {createStep === 1 ? 'Cancel' : <><ArrowLeft className="h-3.5 w-3.5 mr-1.5" />Back</>}
                </Button>
                {createStep === 1 ? (
                  <Button
                    onClick={() => {
                      if (!newShipment.destination_country || !newShipment.commodity) {
                        toast({ title: 'Missing fields', description: 'Destination country and commodity are required.', variant: 'destructive' });
                        return;
                      }
                      setCreateStep(2);
                    }}
                  >
                    Next <ChevronRight className="h-3.5 w-3.5 ml-1" />
                  </Button>
                ) : (
                  <Button onClick={handleCreate} disabled={isCreating} data-testid="button-confirm-create">
                    {isCreating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    Create Shipment
                  </Button>
                )}
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* ── Stats Strip ── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Total Shipments', value: stats.total,       icon: Ship,         iconClass: 'icon-bg-blue',    accent: 'card-accent-blue',    testId: 'text-stat-total' },
            { label: 'Ready to Ship',   value: stats.ready,       icon: CheckCircle2, iconClass: 'icon-bg-emerald', accent: 'card-accent-emerald', testId: 'text-stat-ready' },
            { label: 'Conditional',     value: stats.conditional, icon: AlertTriangle,iconClass: 'icon-bg-amber',   accent: 'card-accent-amber',   testId: 'text-stat-conditional' },
            { label: 'Blocked (NO-GO)', value: stats.blocked,     icon: XCircle,      iconClass: 'icon-bg-red',     accent: 'card-accent-red',     testId: 'text-stat-blocked' },
          ].map(s => (
            <Card key={s.label} className={`transition-all hover:shadow-md hover:-translate-y-0.5 ${s.accent}`}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 gap-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">{s.label}</CardTitle>
                <div className={`h-9 w-9 rounded-lg flex items-center justify-center shrink-0 ${s.iconClass}`}>
                  <s.icon className="h-4 w-4" />
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold tracking-tight" data-testid={s.testId}>{s.value}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* ── Filter Controls ── */}
        <div className="space-y-3">
          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by code, destination, buyer, commodity..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="pl-9 w-full"
              data-testid="input-search-shipments"
            />
          </div>

          <div className="flex items-center justify-between gap-3 flex-wrap">
            {/* Segmented control for status */}
            <div className="segmented-control" data-testid="select-status-filter">
              {STATUS_FILTER_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  className={`segmented-control-item${statusFilter === opt.value ? ' active' : ''}`}
                  onClick={() => setStatusFilter(opt.value)}
                  data-testid={`filter-status-${opt.value}`}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            {/* Sort dropdown */}
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-xs text-muted-foreground whitespace-nowrap">Sort by</span>
              <Select value={sortBy} onValueChange={(v) => setSortBy(v as 'date' | 'score')}>
                <SelectTrigger className="w-[130px] h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="date">Latest First</SelectItem>
                  <SelectItem value="score">Highest Score</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* ── Content ── */}
        {isLoading || orgLoading ? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => <ShipmentCardSkeleton key={i} />)}
          </div>
        ) : filteredShipments.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">
              <Ship className="h-7 w-7" />
            </div>
            <h3 className="text-lg font-semibold mt-4 mb-1">No shipments found</h3>
            <p className="text-sm text-muted-foreground max-w-sm text-center mb-5">
              {searchQuery || statusFilter !== 'all'
                ? 'No shipments match your current filters. Try adjusting your search or status selection.'
                : 'Create your first shipment to start assessing export readiness. Add batches and finished goods, then get a Go/No-Go decision.'}
            </p>
            {!searchQuery && statusFilter === 'all' && (
              <Button onClick={() => setDialogOpen(true)} data-testid="button-create-first-shipment">
                <Plus className="h-4 w-4 mr-2" />
                Create First Shipment
              </Button>
            )}
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {filteredShipments.map(shipment => {
              const decisionKey = shipment.readiness_decision || 'pending';
              const decision = DECISION_CONFIG[decisionKey] || DECISION_CONFIG.pending;
              const DecisionIcon = decision.icon;
              const statusCfg = STATUS_CONFIG[shipment.status] || { label: shipment.status, className: 'bg-muted text-muted-foreground border-border' };
              const score = shipment.readiness_score;
              const scoreColor = score === null ? '' : score >= 80 ? 'text-emerald-600' : score >= 60 ? 'text-amber-600' : 'text-red-600';

              return (
                <Card
                  key={shipment.id}
                  className="card-accent-blue transition-all hover:shadow-md hover:-translate-y-0.5 cursor-pointer flex flex-col"
                  onClick={() => router.push(`/app/shipments/${shipment.id}`)}
                  data-testid={`card-shipment-${shipment.id}`}
                >
                  <CardContent className="p-4 flex flex-col gap-3 flex-1">

                    {/* Top row: code + badges */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0 flex-wrap">
                        <span
                          className="font-mono text-sm font-bold tracking-tight truncate"
                          data-testid={`text-shipment-code-${shipment.id}`}
                        >
                          {shipment.shipment_code}
                        </span>
                        <Badge
                          variant="outline"
                          className={`text-[10px] h-5 px-1.5 font-medium border ${statusCfg.className}`}
                          data-testid={`badge-status-${shipment.id}`}
                        >
                          {statusCfg.label}
                        </Badge>
                      </div>
                      <Badge
                        variant="outline"
                        className={`text-[10px] h-5 px-1.5 font-semibold border shrink-0 flex items-center gap-1 ${decision.colorClass}`}
                        data-testid={`badge-decision-${shipment.id}`}
                      >
                        <DecisionIcon className="h-2.5 w-2.5" />
                        {decision.label}
                      </Badge>
                    </div>

                    {/* Payment status badge */}
                    {shipment.payment_status && shipment.payment_status !== 'none' && PAYMENT_STATUS_CONFIG[shipment.payment_status] && (
                      <div>
                        <Badge
                          variant="outline"
                          className={`text-[10px] h-5 px-1.5 font-medium border ${PAYMENT_STATUS_CONFIG[shipment.payment_status].className}`}
                        >
                          {PAYMENT_STATUS_CONFIG[shipment.payment_status].label}
                        </Badge>
                      </div>
                    )}

                    {/* Destination */}
                    {(shipment.destination_country || shipment.destination_port) && (
                      <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                        <MapPin className="h-3.5 w-3.5 shrink-0 text-muted-foreground/60" />
                        <span className="truncate">
                          {[shipment.destination_country, shipment.destination_port].filter(Boolean).join(' — ')}
                        </span>
                      </div>
                    )}

                    {/* Buyer + Commodity */}
                    {(shipment.buyer_company || shipment.commodity) && (
                      <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
                        {shipment.buyer_company && (
                          <span className="truncate font-medium text-foreground/80">{shipment.buyer_company}</span>
                        )}
                        {shipment.buyer_company && shipment.commodity && (
                          <span className="text-muted-foreground/40">·</span>
                        )}
                        {shipment.commodity && (
                          <span className="truncate">{shipment.commodity}</span>
                        )}
                      </div>
                    )}

                    {/* Item count + weight */}
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Package className="h-3 w-3 shrink-0" />
                        <span>{shipment.total_items || 0} items</span>
                      </div>
                      {shipment.total_weight_kg > 0 && (
                        <span>{Number(shipment.total_weight_kg).toLocaleString()} kg</span>
                      )}
                      {shipment.linked_contracts && shipment.linked_contracts.length > 0 && (
                        <span
                          className="flex items-center gap-1 font-medium text-primary ml-auto"
                          data-testid={`text-contract-link-${shipment.id}`}
                        >
                          <FileText className="h-3 w-3" />
                          {shipment.linked_contracts.map(c => c.contract_reference).join(', ')}
                        </span>
                      )}
                    </div>

                    {/* 5-dimension score bar */}
                    {shipment.score_breakdown && shipment.score_breakdown.length > 0 && (
                      <div className="space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide">Readiness Score</span>
                          {score !== null && (
                            <span
                              className={`text-xl font-bold tabular-nums leading-none ${scoreColor}`}
                              data-testid={`text-score-${shipment.id}`}
                            >
                              {score}
                              <span className="text-xs font-normal text-muted-foreground ml-0.5">%</span>
                            </span>
                          )}
                        </div>
                        <ScoreBar breakdown={shipment.score_breakdown} />
                      </div>
                    )}

                    {/* Footer: ship date + view link */}
                    <div className="flex items-center justify-between mt-auto pt-2 border-t border-border/50">
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Calendar className="h-3 w-3 shrink-0" />
                        {shipment.estimated_ship_date ? (
                          <span>{new Date(shipment.estimated_ship_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                        ) : (
                          <span className="italic">No ship date</span>
                        )}
                      </div>
                      <button
                        className="flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                        onClick={e => { e.stopPropagation(); router.push(`/app/shipments/${shipment.id}`); }}
                      >
                        View Details
                        <ArrowRight className="h-3 w-3" />
                      </button>
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
