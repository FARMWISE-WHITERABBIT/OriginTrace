'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useOrg } from '@/lib/contexts/org-context';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import {
  Loader2,
  ArrowLeft,
  Ship,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Clock,
  FileText,
  ShieldCheck,
  Thermometer,
  Search as SearchIcon,
  Globe,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  Info,
  Package,
  Trash2,
  History,
  ThermometerSnowflake,
  Layers,
  Plus,
  DollarSign,
  Calendar,
  ClipboardList,
  PackageCheck,
  Truck,
  MapPin,
  CircleCheckBig,
} from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import type { ShipmentReadinessResult, ScoreDimension, RiskFlag, RemediationItem } from '@/lib/services/shipment-scoring';

interface ShipmentDetail {
  id: string;
  shipment_code: string;
  status: string;
  destination_country: string | null;
  destination_port: string | null;
  buyer_company: string | null;
  buyer_contact: string | null;
  commodity: string | null;
  target_regulations: string[];
  total_weight_kg: number;
  total_items: number;
  readiness_score: number | null;
  readiness_decision: string | null;
  doc_status: Record<string, boolean>;
  storage_controls: Record<string, boolean>;
  notes: string | null;
  estimated_ship_date: string | null;
  created_at: string;
}

interface ShipmentItem {
  id: string;
  item_type: string;
  batch_id: number | null;
  finished_good_id: string | null;
  weight_kg: number;
  farm_count: number;
  traceability_complete: boolean;
  compliance_status: string;
}

interface ShipmentOutcome {
  id: string;
  outcome: string;
  rejection_reason: string | null;
  rejection_category: string | null;
  port_of_entry: string | null;
  customs_reference: string | null;
  inspector_notes: string | null;
  financial_impact_usd: number;
  outcome_date: string;
  created_at: string;
}

interface ColdChainLog {
  id: string;
  log_type: string;
  value: number;
  unit: string;
  location: string | null;
  is_alert: boolean;
  alert_message: string | null;
  threshold_min: number | null;
  threshold_max: number | null;
  recorded_at: string;
}

interface ColdChainSummary {
  avg_temp: number | null;
  min_temp: number | null;
  max_temp: number | null;
  alert_count: number;
  total_entries: number;
}

interface ShipmentLot {
  id: string;
  lot_code: string;
  commodity: string | null;
  total_weight_kg: number;
  total_bags: number;
  farm_count: number;
  mass_balance_valid: boolean;
  notes: string | null;
  items: Array<{ id: string; batch_id: number | null; weight_kg: number; bag_count: number }>;
  created_at: string;
}

const DECISION_CONFIG: Record<string, { label: string; color: string; bgColor: string; icon: typeof CheckCircle2 }> = {
  go: { label: 'Ready to Ship', color: 'text-green-700', bgColor: 'bg-green-50 dark:bg-green-950/30', icon: CheckCircle2 },
  conditional: { label: 'Ship with Conditions', color: 'text-yellow-700', bgColor: 'bg-yellow-50 dark:bg-yellow-950/30', icon: AlertTriangle },
  no_go: { label: 'Do Not Ship', color: 'text-red-700', bgColor: 'bg-red-50 dark:bg-red-950/30', icon: XCircle },
  pending: { label: 'Not Ready - Add Items', color: 'text-muted-foreground', bgColor: 'bg-muted/50', icon: Clock },
};

const DIMENSION_ICONS: Record<string, typeof FileText> = {
  'Traceability Integrity': SearchIcon,
  'Chemical & Contamination Risk': ShieldCheck,
  'Documentation Completeness': FileText,
  'Storage & Handling Controls': Thermometer,
  'Regulatory Alignment': Globe,
};

const DOC_LABELS: Record<string, string> = {
  certificate_of_origin: 'Certificate of Origin',
  phytosanitary_certificate: 'Phytosanitary Certificate',
  bill_of_lading: 'Bill of Lading',
  packing_list: 'Packing List',
  commercial_invoice: 'Commercial Invoice',
  export_permit: 'Export Permit',
  lab_test_certificate: 'Lab Test Certificate',
  pesticide_declaration: 'Pesticide Declaration',
  aflatoxin_test: 'Aflatoxin Test Results',
};

const STORAGE_LABELS: Record<string, string> = {
  warehouse_certified: 'Warehouse Certified',
  temperature_logged: 'Temperature Logging',
  pest_control_active: 'Pest Control Active',
  humidity_monitored: 'Humidity Monitored',
  fifo_enforced: 'FIFO Enforced',
};

const REGULATION_OPTIONS = [
  { value: 'eudr', label: 'EU EUDR' },
  { value: 'eu_general_food_law', label: 'EU General Food Law' },
  { value: 'eu_organic', label: 'EU Organic Regulation' },
  { value: 'cs3d', label: 'EU CS3D' },
  { value: 'uk_environment_act', label: 'UK Environment Act' },
  { value: 'fsma_204', label: 'US FSMA 204' },
  { value: 'lacey_act', label: 'US Lacey Act' },
  { value: 'buyer_standards', label: 'Buyer Standards' },
];

function OutcomeDialog({ open, onOpenChange, onSubmit, isSubmitting }: { open: boolean; onOpenChange: (v: boolean) => void; onSubmit: (d: any) => void; isSubmitting: boolean }) {
  const [form, setForm] = useState({ outcome: 'approved', outcome_date: new Date().toISOString().split('T')[0], rejection_reason: '', rejection_category: '', port_of_entry: '', financial_impact_usd: 0, inspector_notes: '' });
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" data-testid="button-record-outcome"><Plus className="h-4 w-4 mr-1" />Record Outcome</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Record Shipment Outcome</DialogTitle>
          <DialogDescription>Log the result of a border inspection or customs clearance.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>Outcome</Label>
            <Select value={form.outcome} onValueChange={v => setForm(f => ({ ...f, outcome: v }))}>
              <SelectTrigger data-testid="select-outcome"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
                <SelectItem value="delayed">Delayed</SelectItem>
                <SelectItem value="conditional_release">Conditional Release</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Date</Label>
            <Input type="date" value={form.outcome_date} onChange={e => setForm(f => ({ ...f, outcome_date: e.target.value }))} data-testid="input-outcome-date" />
          </div>
          {(form.outcome === 'rejected' || form.outcome === 'delayed') && (
            <>
              <div className="space-y-2">
                <Label>Rejection Category</Label>
                <Select value={form.rejection_category} onValueChange={v => setForm(f => ({ ...f, rejection_category: v }))}>
                  <SelectTrigger data-testid="select-rejection-category"><SelectValue placeholder="Select category" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="documentation">Documentation</SelectItem>
                    <SelectItem value="contamination">Contamination</SelectItem>
                    <SelectItem value="traceability">Traceability</SelectItem>
                    <SelectItem value="regulatory">Regulatory</SelectItem>
                    <SelectItem value="quality">Quality</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Rejection Reason</Label>
                <Textarea placeholder="Describe why the shipment was rejected..." value={form.rejection_reason} onChange={e => setForm(f => ({ ...f, rejection_reason: e.target.value }))} data-testid="input-rejection-reason" />
              </div>
            </>
          )}
          <div className="space-y-2">
            <Label>Port of Entry (optional)</Label>
            <Input placeholder="e.g. Rotterdam, Hamburg" value={form.port_of_entry} onChange={e => setForm(f => ({ ...f, port_of_entry: e.target.value }))} data-testid="input-port-of-entry" />
          </div>
          <div className="space-y-2">
            <Label>Financial Impact USD (optional)</Label>
            <Input type="number" min="0" value={form.financial_impact_usd || ''} onChange={e => setForm(f => ({ ...f, financial_impact_usd: parseFloat(e.target.value) || 0 }))} data-testid="input-financial-impact" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={() => onSubmit(form)} disabled={isSubmitting} data-testid="button-submit-outcome">
            {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}Record
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ColdChainDialog({ open, onOpenChange, onSubmit, isSubmitting }: { open: boolean; onOpenChange: (v: boolean) => void; onSubmit: (d: any) => void; isSubmitting: boolean }) {
  const [form, setForm] = useState({ log_type: 'temperature', value: 0, location: '', threshold_min: 15, threshold_max: 25 });
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" data-testid="button-add-cold-chain"><Plus className="h-4 w-4 mr-1" />Add Reading</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Cold Chain Reading</DialogTitle>
          <DialogDescription>Record a temperature, humidity, or inspection entry.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>Type</Label>
            <Select value={form.log_type} onValueChange={v => {
              const defaults = v === 'temperature' ? { threshold_min: 15, threshold_max: 25 } : v === 'humidity' ? { threshold_min: 40, threshold_max: 70 } : { threshold_min: 0, threshold_max: 100 };
              setForm(f => ({ ...f, log_type: v, ...defaults }));
            }}>
              <SelectTrigger data-testid="select-log-type"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="temperature">Temperature</SelectItem>
                <SelectItem value="humidity">Humidity</SelectItem>
                <SelectItem value="inspection">Inspection</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Value ({form.log_type === 'temperature' ? '\u00B0C' : form.log_type === 'humidity' ? '%' : 'score'})</Label>
            <Input type="number" step="0.1" value={form.value || ''} onChange={e => setForm(f => ({ ...f, value: parseFloat(e.target.value) || 0 }))} data-testid="input-cold-chain-value" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Min Threshold</Label>
              <Input type="number" step="0.1" value={form.threshold_min} onChange={e => setForm(f => ({ ...f, threshold_min: parseFloat(e.target.value) || 0 }))} data-testid="input-threshold-min" />
            </div>
            <div className="space-y-2">
              <Label>Max Threshold</Label>
              <Input type="number" step="0.1" value={form.threshold_max} onChange={e => setForm(f => ({ ...f, threshold_max: parseFloat(e.target.value) || 0 }))} data-testid="input-threshold-max" />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Location (optional)</Label>
            <Input placeholder="e.g. Warehouse A, Container 42" value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))} data-testid="input-cold-chain-location" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={() => onSubmit(form)} disabled={isSubmitting} data-testid="button-submit-cold-chain">
            {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}Record
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function LotDialog({ open, onOpenChange, onSubmit, isSubmitting, shipmentCode }: { open: boolean; onOpenChange: (v: boolean) => void; onSubmit: (d: any) => void; isSubmitting: boolean; shipmentCode: string }) {
  const [form, setForm] = useState({ lot_code: '', commodity: '', notes: '' });
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" data-testid="button-create-lot"><Plus className="h-4 w-4 mr-1" />Create Lot</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create Lot</DialogTitle>
          <DialogDescription>Group batches into a lot for chain-of-custody tracking and mass balance validation.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>Lot Code</Label>
            <Input placeholder={`e.g. LOT-${shipmentCode}-001`} value={form.lot_code} onChange={e => setForm(f => ({ ...f, lot_code: e.target.value }))} data-testid="input-lot-code" />
            <p className="text-xs text-muted-foreground">Leave blank to auto-generate</p>
          </div>
          <div className="space-y-2">
            <Label>Commodity (optional)</Label>
            <Input placeholder="e.g. Cocoa Beans Grade A" value={form.commodity} onChange={e => setForm(f => ({ ...f, commodity: e.target.value }))} data-testid="input-lot-commodity" />
          </div>
          <div className="space-y-2">
            <Label>Notes (optional)</Label>
            <Textarea placeholder="Additional notes about this lot..." value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} data-testid="input-lot-notes" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={() => onSubmit(form)} disabled={isSubmitting} data-testid="button-submit-lot">
            {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}Create Lot
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

const LIFECYCLE_STAGES = [
  { key: 'planning', label: 'Planning', icon: ClipboardList },
  { key: 'packed', label: 'Packed', icon: PackageCheck },
  { key: 'dispatched', label: 'Dispatched', icon: Truck },
  { key: 'in_transit', label: 'In Transit', icon: Ship },
  { key: 'arrived', label: 'Arrived', icon: MapPin },
  { key: 'cleared', label: 'Cleared', icon: CircleCheckBig },
] as const;

function getStageIndex(status: string, outcomes: ShipmentOutcome[], estimatedShipDate?: string | null): number {
  const hasApproval = outcomes.some(o => o.outcome === 'approved' || o.outcome === 'conditional_release');
  const hasAnyOutcome = outcomes.length > 0;

  if (status === 'cancelled') return -1;
  if (hasApproval) return 5;
  if (hasAnyOutcome) return 4;
  if (status === 'shipped') {
    if (estimatedShipDate) {
      const shipDate = new Date(estimatedShipDate);
      const now = new Date();
      if (now > shipDate) return 3;
    }
    return 2;
  }
  if (status === 'ready') return 1;
  return 0;
}

function getStageDates(shipment: ShipmentDetail, outcomes: ShipmentOutcome[]): Record<string, string | null> {
  const dates: Record<string, string | null> = {};
  dates.planning = shipment.created_at;
  dates.packed = shipment.status === 'ready' || shipment.status === 'shipped' ? shipment.estimated_ship_date || shipment.created_at : null;
  dates.dispatched = shipment.status === 'shipped' ? shipment.estimated_ship_date || shipment.created_at : null;
  dates.in_transit = shipment.status === 'shipped' ? shipment.estimated_ship_date || null : null;
  const firstOutcome = outcomes.length > 0 ? outcomes[outcomes.length - 1] : null;
  dates.arrived = firstOutcome ? firstOutcome.outcome_date : null;
  const approval = outcomes.find(o => o.outcome === 'approved' || o.outcome === 'conditional_release');
  dates.cleared = approval ? approval.outcome_date : null;
  return dates;
}

function ShipmentTimeline({ shipment, outcomes }: { shipment: ShipmentDetail; outcomes: ShipmentOutcome[] }) {
  const currentStageIndex = getStageIndex(shipment.status, outcomes, shipment.estimated_ship_date);
  const stageDates = getStageDates(shipment, outcomes);
  const isCancelled = shipment.status === 'cancelled';

  return (
    <Card data-testid="card-shipment-timeline">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Ship className="h-4 w-4" />
          Shipment Lifecycle
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-start justify-between gap-1 relative">
          <div className="absolute top-5 left-[calc(8.33%)] right-[calc(8.33%)] h-0.5 bg-muted" />
          <div
            className="absolute top-5 left-[calc(8.33%)] h-0.5 bg-primary transition-all duration-500"
            style={{
              width: isCancelled
                ? '0%'
                : `${Math.max(0, (currentStageIndex / (LIFECYCLE_STAGES.length - 1)) * 83.34)}%`,
            }}
          />

          {LIFECYCLE_STAGES.map((stage, index) => {
            const isCompleted = !isCancelled && index <= currentStageIndex;
            const isCurrent = !isCancelled && index === currentStageIndex;
            const StageIcon = stage.icon;
            const dateStr = stageDates[stage.key];

            return (
              <div
                key={stage.key}
                className="flex flex-col items-center relative z-10"
                style={{ width: `${100 / LIFECYCLE_STAGES.length}%` }}
                data-testid={`timeline-stage-${stage.key}`}
              >
                <div
                  className={`h-10 w-10 rounded-full flex items-center justify-center border-2 transition-colors ${
                    isCancelled
                      ? 'border-muted bg-muted'
                      : isCurrent
                        ? 'border-primary bg-primary text-primary-foreground'
                        : isCompleted
                          ? 'border-primary bg-primary/10 text-primary'
                          : 'border-muted bg-background text-muted-foreground'
                  }`}
                >
                  {isCompleted && !isCurrent ? (
                    <CheckCircle2 className="h-4 w-4" />
                  ) : (
                    <StageIcon className="h-4 w-4" />
                  )}
                </div>
                <p
                  className={`text-xs font-medium mt-2 text-center ${
                    isCancelled
                      ? 'text-muted-foreground'
                      : isCurrent
                        ? 'text-foreground'
                        : isCompleted
                          ? 'text-foreground/80'
                          : 'text-muted-foreground'
                  }`}
                >
                  {stage.label}
                </p>
                {dateStr && isCompleted && (
                  <p className="text-[10px] text-muted-foreground mt-0.5 text-center">
                    {new Date(dateStr).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                  </p>
                )}
              </div>
            );
          })}
        </div>
        {isCancelled && (
          <div className="flex items-center gap-2 mt-4 p-2 rounded-md bg-destructive/10">
            <XCircle className="h-4 w-4 text-destructive shrink-0" />
            <p className="text-sm text-destructive font-medium">Shipment Cancelled</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function ShipmentDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { organization, isLoading: orgLoading } = useOrg();
  const { toast } = useToast();
  const shipmentId = params.id as string;

  const [shipment, setShipment] = useState<ShipmentDetail | null>(null);
  const [items, setItems] = useState<ShipmentItem[]>([]);
  const [readiness, setReadiness] = useState<ShipmentReadinessResult | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [expandedDimension, setExpandedDimension] = useState<string | null>(null);
  const [showRemediation, setShowRemediation] = useState(true);
  const [outcomes, setOutcomes] = useState<ShipmentOutcome[]>([]);
  const [coldChainLogs, setColdChainLogs] = useState<ColdChainLog[]>([]);
  const [coldChainSummary, setColdChainSummary] = useState<ColdChainSummary | null>(null);
  const [lots, setLots] = useState<ShipmentLot[]>([]);
  const [outcomeDialogOpen, setOutcomeDialogOpen] = useState(false);
  const [coldChainDialogOpen, setColdChainDialogOpen] = useState(false);
  const [lotDialogOpen, setLotDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchShipment = useCallback(async () => {
    if (orgLoading || !organization) return;
    try {
      const response = await fetch(`/api/shipments/${shipmentId}`);
      if (!response.ok) throw new Error('Failed to fetch shipment');
      const data = await response.json();
      setShipment(data.shipment);
      setItems(data.items || []);
      setReadiness(data.readiness || null);
    } catch (error) {
      console.error('Failed to fetch shipment:', error);
      toast({ title: 'Error', description: 'Failed to load shipment details', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  }, [shipmentId, organization, orgLoading, toast]);

  const fetchOutcomes = useCallback(async () => {
    if (!organization) return;
    try {
      const res = await fetch(`/api/shipments/${shipmentId}/outcomes`);
      if (res.ok) {
        const data = await res.json();
        setOutcomes(data.outcomes || []);
      }
    } catch { /* silent */ }
  }, [shipmentId, organization]);

  const fetchColdChain = useCallback(async () => {
    if (!organization) return;
    try {
      const res = await fetch(`/api/shipments/${shipmentId}/cold-chain`);
      if (res.ok) {
        const data = await res.json();
        setColdChainLogs(data.logs || []);
        setColdChainSummary(data.summary || null);
      }
    } catch { /* silent */ }
  }, [shipmentId, organization]);

  const fetchLots = useCallback(async () => {
    if (!organization) return;
    try {
      const res = await fetch(`/api/shipments/${shipmentId}/lots`);
      if (res.ok) {
        const data = await res.json();
        setLots(data.lots || []);
      }
    } catch { /* silent */ }
  }, [shipmentId, organization]);

  useEffect(() => {
    fetchShipment();
    fetchOutcomes();
    fetchColdChain();
    fetchLots();
  }, [fetchShipment, fetchOutcomes, fetchColdChain, fetchLots]);

  const updateField = async (field: string, value: unknown) => {
    setIsSaving(true);
    try {
      const response = await fetch(`/api/shipments/${shipmentId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [field]: value }),
      });
      if (!response.ok) throw new Error('Failed to update');
      await fetchShipment();
    } catch {
      toast({ title: 'Error', description: 'Failed to save changes', variant: 'destructive' });
    } finally {
      setIsSaving(false);
    }
  };

  const toggleDoc = (key: string) => {
    const current = shipment?.doc_status || {};
    updateField('doc_status', { ...current, [key]: !current[key] });
  };

  const toggleStorage = (key: string) => {
    const current = shipment?.storage_controls || {};
    updateField('storage_controls', { ...current, [key]: !current[key] });
  };

  const toggleRegulation = (reg: string) => {
    const current = shipment?.target_regulations || [];
    const updated = current.includes(reg)
      ? current.filter(r => r !== reg)
      : [...current, reg];
    updateField('target_regulations', updated);
  };

  const removeItem = async (itemId: string) => {
    try {
      const response = await fetch(`/api/shipments/${shipmentId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ remove_items: [itemId] }),
      });
      if (!response.ok) throw new Error('Failed to remove item');
      toast({ title: 'Item removed' });
      fetchShipment();
    } catch {
      toast({ title: 'Error', description: 'Failed to remove item', variant: 'destructive' });
    }
  };

  const recordOutcome = async (formData: { outcome: string; outcome_date: string; rejection_reason?: string; rejection_category?: string; port_of_entry?: string; financial_impact_usd?: number; inspector_notes?: string }) => {
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/shipments/${shipmentId}/outcomes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      if (!res.ok) throw new Error('Failed to record outcome');
      toast({ title: 'Outcome recorded' });
      setOutcomeDialogOpen(false);
      fetchOutcomes();
      fetchShipment();
    } catch {
      toast({ title: 'Error', description: 'Failed to record outcome', variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const addColdChainLog = async (formData: { log_type: string; value: number; location?: string; threshold_min?: number; threshold_max?: number }) => {
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/shipments/${shipmentId}/cold-chain`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      if (!res.ok) throw new Error('Failed to add log');
      toast({ title: 'Cold chain entry recorded' });
      setColdChainDialogOpen(false);
      fetchColdChain();
      fetchShipment();
    } catch {
      toast({ title: 'Error', description: 'Failed to add cold chain entry', variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const createLot = async (formData: { lot_code: string; commodity?: string; notes?: string }) => {
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/shipments/${shipmentId}/lots`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      if (!res.ok) throw new Error('Failed to create lot');
      toast({ title: 'Lot created' });
      setLotDialogOpen(false);
      fetchLots();
    } catch {
      toast({ title: 'Error', description: 'Failed to create lot', variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading || orgLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!shipment) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <p className="text-muted-foreground">Shipment not found</p>
        <Button variant="outline" onClick={() => router.push('/app/shipments')} data-testid="button-back-to-list">
          <ArrowLeft className="h-4 w-4 mr-2" /> Back to Shipments
        </Button>
      </div>
    );
  }

  const decision = DECISION_CONFIG[readiness?.decision || 'pending'] || DECISION_CONFIG.pending;
  const DecisionIcon = decision.icon;
  const score = readiness?.overall_score ?? 0;

  return (
    <div className="flex-1 space-y-6 p-6">
      <div className="flex items-center gap-3 flex-wrap">
        <Button variant="ghost" size="icon" onClick={() => router.push('/app/shipments')} data-testid="button-back">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-xl font-semibold font-mono" data-testid="text-shipment-code">
              {shipment.shipment_code}
            </h1>
            <Badge variant="outline" data-testid="badge-shipment-status">
              {shipment.status}
            </Badge>
            {isSaving && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">
            {shipment.destination_country && `${shipment.destination_country}`}
            {shipment.commodity && ` - ${shipment.commodity}`}
            {shipment.buyer_company && ` - ${shipment.buyer_company}`}
          </p>
        </div>
      </div>

      <Card className={`${decision.bgColor} border-0`}>
        <CardContent className="py-6">
          <div className="flex items-center justify-between gap-6 flex-wrap">
            <div className="flex items-center gap-4">
              <div className="h-14 w-14 rounded-full bg-background flex items-center justify-center">
                <DecisionIcon className={`h-7 w-7 ${decision.color}`} />
              </div>
              <div>
                <p className={`text-xl font-bold ${decision.color}`} data-testid="text-decision-label">
                  {decision.label}
                </p>
                <p className="text-sm text-muted-foreground mt-0.5">
                  {readiness?.summary || 'Add items to compute readiness score'}
                </p>
              </div>
            </div>
            <div className="text-center">
              <p className="text-4xl font-bold" data-testid="text-overall-score">{score}</p>
              <p className="text-xs text-muted-foreground">Overall Score</p>
              <Progress value={score} className="w-32 mt-2 h-2" />
            </div>
          </div>
        </CardContent>
      </Card>

      <ShipmentTimeline shipment={shipment} outcomes={outcomes} />

      {readiness && readiness.risk_flags.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-destructive" />
              Risk Flags ({readiness.risk_flags.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {readiness.risk_flags.map((flag: RiskFlag, i: number) => (
                <div
                  key={i}
                  className={`flex items-start gap-3 p-3 rounded-md ${
                    flag.severity === 'critical' ? 'bg-red-50 dark:bg-red-950/20' :
                    flag.severity === 'warning' ? 'bg-yellow-50 dark:bg-yellow-950/20' :
                    'bg-muted/50'
                  }`}
                  data-testid={`risk-flag-${i}`}
                >
                  {flag.severity === 'critical' ? (
                    <XCircle className="h-4 w-4 text-red-600 mt-0.5 shrink-0" />
                  ) : flag.severity === 'warning' ? (
                    <AlertTriangle className="h-4 w-4 text-yellow-600 mt-0.5 shrink-0" />
                  ) : (
                    <Info className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                  )}
                  <div className="min-w-0">
                    <p className="text-sm font-medium">{flag.message}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="outline" className="text-xs">{flag.category}</Badge>
                      {flag.is_hard_fail && (
                        <Badge variant="destructive" className="text-xs">Hard Fail</Badge>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {readiness && readiness.dimensions.length > 0 && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {readiness.dimensions.map((dim: ScoreDimension) => {
            const DimIcon = DIMENSION_ICONS[dim.name] || FileText;
            const isExpanded = expandedDimension === dim.name;
            return (
              <Card key={dim.name} data-testid={`card-dimension-${dim.name}`}>
                <CardContent className="pt-4 pb-4">
                  <div
                    className="flex items-center justify-between gap-2 cursor-pointer"
                    onClick={() => setExpandedDimension(isExpanded ? null : dim.name)}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="h-9 w-9 rounded-md bg-muted flex items-center justify-center shrink-0">
                        <DimIcon className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{dim.name}</p>
                        <p className="text-xs text-muted-foreground">{Math.round(dim.weight * 100)}% weight</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className={`text-lg font-bold ${
                        dim.score >= 75 ? 'text-green-600' :
                        dim.score >= 50 ? 'text-yellow-600' :
                        'text-red-600'
                      }`}>
                        {Math.round(dim.score)}
                      </span>
                      {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </div>
                  </div>
                  <Progress
                    value={dim.score}
                    className="h-1.5 mt-3"
                  />
                  {isExpanded && dim.details.length > 0 && (
                    <div className="mt-3 space-y-1 border-t pt-3">
                      {dim.details.map((detail: string, i: number) => (
                        <p key={i} className="text-xs text-muted-foreground">{detail}</p>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {readiness && readiness.remediation_items.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between gap-2">
              <CardTitle className="text-base">
                Remediation Checklist ({readiness.remediation_items.length})
              </CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowRemediation(!showRemediation)}
                data-testid="button-toggle-remediation"
              >
                {showRemediation ? 'Hide' : 'Show'}
              </Button>
            </div>
            <CardDescription>Actions to improve your shipment readiness score</CardDescription>
          </CardHeader>
          {showRemediation && (
            <CardContent>
              <div className="space-y-3">
                {readiness.remediation_items.map((item: RemediationItem, i: number) => (
                  <div key={i} className="flex items-start gap-3" data-testid={`remediation-item-${i}`}>
                    <div className={`h-6 w-6 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
                      item.priority === 'urgent' ? 'bg-red-100 dark:bg-red-950/30' :
                      item.priority === 'important' ? 'bg-yellow-100 dark:bg-yellow-950/30' :
                      'bg-muted'
                    }`}>
                      <span className="text-xs font-bold">{i + 1}</span>
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-medium">{item.title}</p>
                        <Badge variant={item.priority === 'urgent' ? 'destructive' : 'outline'} className="text-xs">
                          {item.priority}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">{item.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          )}
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Target Regulations</CardTitle>
            <CardDescription>Select regulations applicable to this shipment</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {REGULATION_OPTIONS.map(reg => (
                <div key={reg.value} className="flex items-center justify-between gap-2">
                  <Label htmlFor={`reg-${reg.value}`} className="text-sm cursor-pointer">
                    {reg.label}
                  </Label>
                  <Switch
                    id={`reg-${reg.value}`}
                    checked={(shipment.target_regulations || []).includes(reg.value)}
                    onCheckedChange={() => toggleRegulation(reg.value)}
                    data-testid={`switch-reg-${reg.value}`}
                  />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Export Documentation</CardTitle>
            <CardDescription>Mark documents that are ready for this shipment</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Object.entries(DOC_LABELS).map(([key, label]) => (
                <div key={key} className="flex items-center justify-between gap-2">
                  <Label htmlFor={`doc-${key}`} className="text-sm cursor-pointer">
                    {label}
                  </Label>
                  <Switch
                    id={`doc-${key}`}
                    checked={!!shipment.doc_status?.[key]}
                    onCheckedChange={() => toggleDoc(key)}
                    data-testid={`switch-doc-${key}`}
                  />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Storage & Handling Controls</CardTitle>
          <CardDescription>Confirm warehouse and handling compliance</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {Object.entries(STORAGE_LABELS).map(([key, label]) => (
              <div key={key} className="flex items-center justify-between gap-2">
                <Label htmlFor={`storage-${key}`} className="text-sm cursor-pointer">
                  {label}
                </Label>
                <Switch
                  id={`storage-${key}`}
                  checked={!!shipment.storage_controls?.[key]}
                  onCheckedChange={() => toggleStorage(key)}
                  data-testid={`switch-storage-${key}`}
                />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div>
              <CardTitle className="text-base">Shipment Items ({items.length})</CardTitle>
              <CardDescription>Batches and finished goods included in this shipment</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {items.length === 0 ? (
            <div className="text-center py-8">
              <Package className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">
                No items added yet. Use the API to add batches or finished goods to this shipment.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {items.map((item: ShipmentItem) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between gap-3 p-3 rounded-md bg-muted/50"
                  data-testid={`shipment-item-${item.id}`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <Badge variant="outline" className="shrink-0">
                      {item.item_type === 'batch' ? 'Batch' : 'Finished Good'}
                    </Badge>
                    <div className="min-w-0 text-sm">
                      <span className="font-mono">
                        {item.item_type === 'batch' ? `#${item.batch_id}` : item.finished_good_id?.slice(0, 8)}
                      </span>
                      <span className="text-muted-foreground ml-2">
                        {Number(item.weight_kg).toLocaleString()} kg
                      </span>
                      <span className="text-muted-foreground ml-2">
                        {item.farm_count} farms
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {item.traceability_complete ? (
                      <Badge variant="secondary" className="text-xs">
                        <CheckCircle2 className="h-3 w-3 mr-1" /> Traced
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-xs">
                        <AlertTriangle className="h-3 w-3 mr-1" /> Incomplete
                      </Badge>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeItem(item.id)}
                      data-testid={`button-remove-item-${item.id}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <History className="h-4 w-4" />
                Shipment Outcomes ({outcomes.length})
              </CardTitle>
              <CardDescription>Record border inspection results and rejection history</CardDescription>
            </div>
            <OutcomeDialog
              open={outcomeDialogOpen}
              onOpenChange={setOutcomeDialogOpen}
              onSubmit={recordOutcome}
              isSubmitting={isSubmitting}
            />
          </div>
        </CardHeader>
        <CardContent>
          {outcomes.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">No outcomes recorded yet. Record inspection results after shipment.</p>
          ) : (
            <div className="space-y-2">
              {outcomes.map((o) => (
                <div key={o.id} className={`flex items-start justify-between gap-3 p-3 rounded-md ${
                  o.outcome === 'approved' ? 'bg-green-50 dark:bg-green-950/20' :
                  o.outcome === 'rejected' ? 'bg-red-50 dark:bg-red-950/20' :
                  'bg-yellow-50 dark:bg-yellow-950/20'
                }`} data-testid={`outcome-${o.id}`}>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant={o.outcome === 'approved' ? 'default' : o.outcome === 'rejected' ? 'destructive' : 'secondary'}>
                        {o.outcome.replace('_', ' ')}
                      </Badge>
                      <span className="text-xs text-muted-foreground">{new Date(o.outcome_date).toLocaleDateString()}</span>
                      {o.rejection_category && <Badge variant="outline" className="text-xs">{o.rejection_category}</Badge>}
                    </div>
                    {o.rejection_reason && <p className="text-sm mt-1">{o.rejection_reason}</p>}
                    {o.port_of_entry && <p className="text-xs text-muted-foreground mt-0.5">Port: {o.port_of_entry}</p>}
                    {o.financial_impact_usd > 0 && (
                      <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                        <DollarSign className="h-3 w-3" /> Financial impact: ${Number(o.financial_impact_usd).toLocaleString()}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <ThermometerSnowflake className="h-4 w-4" />
                Cold Chain Monitoring
              </CardTitle>
              <CardDescription>Temperature and humidity tracking for this shipment</CardDescription>
            </div>
            <ColdChainDialog
              open={coldChainDialogOpen}
              onOpenChange={setColdChainDialogOpen}
              onSubmit={addColdChainLog}
              isSubmitting={isSubmitting}
            />
          </div>
        </CardHeader>
        <CardContent>
          {coldChainSummary && coldChainSummary.total_entries > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
              <div className="text-center p-2 rounded-md bg-muted/50">
                <p className="text-lg font-bold">{coldChainSummary.avg_temp !== null ? `${coldChainSummary.avg_temp.toFixed(1)}` : '-'}</p>
                <p className="text-xs text-muted-foreground">Avg Temp</p>
              </div>
              <div className="text-center p-2 rounded-md bg-muted/50">
                <p className="text-lg font-bold">{coldChainSummary.min_temp !== null ? `${coldChainSummary.min_temp.toFixed(1)}` : '-'}</p>
                <p className="text-xs text-muted-foreground">Min Temp</p>
              </div>
              <div className="text-center p-2 rounded-md bg-muted/50">
                <p className="text-lg font-bold">{coldChainSummary.max_temp !== null ? `${coldChainSummary.max_temp.toFixed(1)}` : '-'}</p>
                <p className="text-xs text-muted-foreground">Max Temp</p>
              </div>
              <div className="text-center p-2 rounded-md bg-muted/50">
                <p className={`text-lg font-bold ${coldChainSummary.alert_count > 0 ? 'text-red-600' : 'text-green-600'}`}>{coldChainSummary.alert_count}</p>
                <p className="text-xs text-muted-foreground">Alerts</p>
              </div>
            </div>
          )}
          {coldChainLogs.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">No cold chain data recorded yet.</p>
          ) : (
            <div className="space-y-1.5 max-h-[300px] overflow-y-auto">
              {coldChainLogs.slice(0, 20).map((log) => (
                <div key={log.id} className={`flex items-center justify-between gap-2 p-2 rounded-md text-sm ${log.is_alert ? 'bg-red-50 dark:bg-red-950/20' : 'bg-muted/30'}`} data-testid={`cold-chain-log-${log.id}`}>
                  <div className="flex items-center gap-2 min-w-0">
                    <Badge variant="outline" className="text-xs shrink-0">{log.log_type}</Badge>
                    <span className="font-mono font-medium">{log.value}{log.unit === 'celsius' ? '\u00B0C' : log.unit === 'percent' ? '%' : ` ${log.unit}`}</span>
                    {log.location && <span className="text-muted-foreground truncate">{log.location}</span>}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {log.is_alert && <Badge variant="destructive" className="text-xs">Alert</Badge>}
                    <span className="text-xs text-muted-foreground">{new Date(log.recorded_at).toLocaleString()}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <Layers className="h-4 w-4" />
                Lot Management ({lots.length})
              </CardTitle>
              <CardDescription>Group batches into lots with mass balance validation</CardDescription>
            </div>
            <LotDialog
              open={lotDialogOpen}
              onOpenChange={setLotDialogOpen}
              onSubmit={createLot}
              isSubmitting={isSubmitting}
              shipmentCode={shipment.shipment_code}
            />
          </div>
        </CardHeader>
        <CardContent>
          {lots.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">No lots created yet. Create lots to group batches for chain-of-custody tracking.</p>
          ) : (
            <div className="space-y-3">
              {lots.map((lot) => (
                <div key={lot.id} className="p-3 rounded-md bg-muted/50" data-testid={`lot-${lot.id}`}>
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm font-medium">{lot.lot_code}</span>
                      {lot.mass_balance_valid ? (
                        <Badge variant="secondary" className="text-xs"><CheckCircle2 className="h-3 w-3 mr-1" />Mass Balance Valid</Badge>
                      ) : (
                        <Badge variant="outline" className="text-xs"><AlertTriangle className="h-3 w-3 mr-1" />Unvalidated</Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span>{Number(lot.total_weight_kg).toLocaleString()} kg</span>
                      <span>{lot.total_bags} bags</span>
                      <span>{lot.farm_count} farms</span>
                    </div>
                  </div>
                  {lot.commodity && <p className="text-xs text-muted-foreground mt-1">{lot.commodity}</p>}
                  {lot.items && lot.items.length > 0 && (
                    <div className="mt-2 flex items-center gap-1 flex-wrap">
                      {lot.items.map((li: any) => (
                        <Badge key={li.id} variant="outline" className="text-xs">Batch #{li.batch_id}</Badge>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="h-px w-full bg-border" />

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Shipment Details</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Destination Country</Label>
              <Input
                value={shipment.destination_country || ''}
                onBlur={e => {
                  if (e.target.value !== shipment.destination_country) {
                    updateField('destination_country', e.target.value);
                  }
                }}
                onChange={e => setShipment(s => s ? { ...s, destination_country: e.target.value } : null)}
                data-testid="input-edit-destination"
              />
            </div>
            <div className="space-y-2">
              <Label>Destination Port</Label>
              <Input
                value={shipment.destination_port || ''}
                onBlur={e => {
                  if (e.target.value !== shipment.destination_port) {
                    updateField('destination_port', e.target.value);
                  }
                }}
                onChange={e => setShipment(s => s ? { ...s, destination_port: e.target.value } : null)}
                data-testid="input-edit-port"
              />
            </div>
            <div className="space-y-2">
              <Label>Buyer Company</Label>
              <Input
                value={shipment.buyer_company || ''}
                onBlur={e => {
                  if (e.target.value !== shipment.buyer_company) {
                    updateField('buyer_company', e.target.value);
                  }
                }}
                onChange={e => setShipment(s => s ? { ...s, buyer_company: e.target.value } : null)}
                data-testid="input-edit-buyer"
              />
            </div>
            <div className="space-y-2">
              <Label>Estimated Ship Date</Label>
              <Input
                type="date"
                value={shipment.estimated_ship_date || ''}
                onChange={e => updateField('estimated_ship_date', e.target.value)}
                data-testid="input-edit-ship-date"
              />
            </div>
          </div>
          <div className="mt-4 space-y-2">
            <Label>Notes</Label>
            <Input
              value={shipment.notes || ''}
              placeholder="Add notes about this shipment..."
              onBlur={e => {
                if (e.target.value !== shipment.notes) {
                  updateField('notes', e.target.value);
                }
              }}
              onChange={e => setShipment(s => s ? { ...s, notes: e.target.value } : null)}
              data-testid="input-edit-notes"
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
