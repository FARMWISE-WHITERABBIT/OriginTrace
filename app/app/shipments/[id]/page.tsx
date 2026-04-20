'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useParams, useRouter, notFound } from 'next/navigation';
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
  FileDown,
  RotateCw,
  FlaskConical,
  Share2,
  Copy,
  CheckCircle,
} from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { ConfirmDialog } from '@/components/confirm-dialog';
import { DocumentUpload } from '@/components/document-upload';
import { CostTracker } from '@/components/shipments/cost-tracker';
import { ShipmentPipeline } from '@/components/shipments/shipment-pipeline';
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
  risk_flags: any[];
  score_breakdown: any[];
  notes: string | null;
  estimated_ship_date: string | null;
  created_at: string;
  // 9-stage pipeline fields
  current_stage: number;
  stage_data: Record<string, any>;
  stage_history: any[];
  // Stage 1 — Preparation
  purchase_order_number: string | null;
  purchase_order_date: string | null;
  contract_price_per_mt: number | null;
  total_shipment_value_usd: number | null;
  // Stage 2 — Quality & Certification
  inspection_body: string | null;
  inspection_date: string | null;
  inspection_certificate_number: string | null;
  inspection_result: string | null;
  inspection_fees_ngn: number | null;
  phyto_lab_costs_ngn: number | null;
  // Stage 3 — Documentation
  doc_status: Record<string, any>;
  // Stage 4 — Customs & Clearance
  clearing_agent_name: string | null;
  clearing_agent_contact: string | null;
  customs_declaration_number: string | null;
  exit_certificate_number: string | null;
  customs_fees_ngn: number | null;
  port_handling_charges_ngn: number | null;
  certification_costs_ngn: number | null;
  // Stage 5 — Freight & Vessel
  freight_forwarder_name: string | null;
  freight_forwarder_contact: string | null;
  shipping_line: string | null;
  vessel_name: string | null;
  imo_number: string | null;
  voyage_number: string | null;
  booking_reference: string | null;
  port_of_loading: string | null;
  port_of_discharge: string | null;
  etd: string | null;
  eta: string | null;
  freight_cost_usd: number | null;
  freight_insurance_usd: number | null;
  // Stage 6 — Container Stuffing
  container_number: string | null;
  container_seal_number: string | null;
  container_type: string | null;
  // Stage 7 — Departure
  actual_departure_date: string | null;
  bill_of_lading_number: string | null;
  // Stage 8 — Arrival
  actual_arrival_date: string | null;
  prenotif_eu_traces: string | null;
  prenotif_eu_traces_ref: string | null;
  prenotif_uk_ipaffs: string | null;
  prenotif_uk_ipaffs_ref: string | null;
  prenotif_us_fda: string | null;
  prenotif_us_fda_ref: string | null;
  prenotif_cn_gacc: string | null;
  prenotif_cn_gacc_ref: string | null;
  prenotif_uae_esma: string | null;
  prenotif_uae_esma_ref: string | null;
  // Stage 9 — Close
  shipment_outcome: string | null;
  rejection_reason: string | null;
  usd_ngn_rate: number | null;
}

interface ShipmentItem {
  id: string;
  item_type: string;
  batch_id: string | null;
  finished_good_id: string | null;
  weight_kg: number;
  farm_count: number;
  traceability_complete: boolean;
  compliance_status: string;
  batch_data?: { batch_code?: string | null; [key: string]: any };
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
  items: Array<{ id: string; batch_id: string | null; weight_kg: number; bag_count: number }>;
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
  { value: 'uflpa', label: 'US UFLPA (Forced Labor)' },
  { value: 'china_green_trade', label: 'China Green Trade' },
  { value: 'china_gacc', label: 'China GACC Registration' },
  { value: 'uae_halal', label: 'UAE Halal Certification' },
  { value: 'uae_esma', label: 'UAE ESMA Standards' },
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

function getStageIndex(status: string, outcomes: ShipmentOutcome[], estimatedShipDate?: string | null, createdAt?: string | null): number {
  const hasApproval = outcomes.some(o => o.outcome === 'approved' || o.outcome === 'conditional_release');
  const hasAnyOutcome = outcomes.length > 0;

  if (status === 'cancelled') return -1;
  if (hasApproval) return 5;
  if (hasAnyOutcome) return 4;
  if (status === 'shipped') {
    const now = new Date();
    const GRACE_PERIOD_MS = 24 * 60 * 60 * 1000;
    const referenceDate = createdAt ? new Date(createdAt) : now;
    const timeSinceCreation = now.getTime() - referenceDate.getTime();

    if (timeSinceCreation < GRACE_PERIOD_MS) {
      return 2;
    }

    if (estimatedShipDate) {
      const shipDate = new Date(estimatedShipDate);
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
  dates.in_transit = shipment.status === 'shipped' ? shipment.estimated_ship_date || shipment.created_at : null;
  const firstOutcome = outcomes.length > 0 ? outcomes[outcomes.length - 1] : null;
  dates.arrived = firstOutcome ? firstOutcome.outcome_date : null;
  const approval = outcomes.find(o => o.outcome === 'approved' || o.outcome === 'conditional_release');
  dates.cleared = approval ? approval.outcome_date : null;
  return dates;
}

function ShipmentTimeline({ shipment, outcomes }: { shipment: ShipmentDetail; outcomes: ShipmentOutcome[] }) {
  const currentStageIndex = getStageIndex(shipment.status, outcomes, shipment.estimated_ship_date, shipment.created_at);
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
  const [confirmRemoveItem, setConfirmRemoveItem] = useState<string | null>(null);
  const [isRemovingItem, setIsRemovingItem] = useState(false);
  const [readiness, setReadiness] = useState<ShipmentReadinessResult | null>(null);
  const [recalculating, setRecalculating] = useState(false);
  const [uploadDocOpen, setUploadDocOpen] = useState(false);
  const [uploadDocType, setUploadDocType] = useState<string>('');

  const handleRecalculate = async () => {
    if (!shipment) return;
    setRecalculating(true);
    try {
      const res = await fetch(`/api/shipments/${shipment.id}/recalculate`, { method: 'POST' });
      const data = await res.json();
      if (res.ok && data.readiness) setReadiness(data.readiness);
      else toast({ title: 'Recalculation failed', variant: 'destructive' });
    } catch {
      toast({ title: 'Recalculation failed', variant: 'destructive' });
    } finally {
      setRecalculating(false);
    }
  };
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [expandedDimension, setExpandedDimension] = useState<string | null>(null);
  const [showRemediation, setShowRemediation] = useState(true);
  const [outcomes, setOutcomes] = useState<ShipmentOutcome[]>([]);
  const [coldChainLogs, setColdChainLogs] = useState<ColdChainLog[]>([]);
  const [coldChainSummary, setColdChainSummary] = useState<ColdChainSummary | null>(null);
  const [lots, setLots] = useState<ShipmentLot[]>([]);
  const [activityEvents, setActivityEvents] = useState<any[]>([]);
  const [activityLoading, setActivityLoading] = useState(false);
  const [activityFetched, setActivityFetched] = useState(false);
  // Lab results + evidence packages
  const [labResults, setLabResults] = useState<any[]>([]);
  const [evidencePackages, setEvidencePackages] = useState<any[]>([]);
  const [isGeneratingEvidence, setIsGeneratingEvidence] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null);

  const fetchActivity = async () => {
    if (activityFetched || !shipmentId) return;
    setActivityLoading(true);
    try {
      const res = await fetch(`/api/audit?resource_type=shipment&resource_id=${shipmentId}&limit=20`);
      if (res.ok) { const d = await res.json(); setActivityEvents(d.logs || d.events || []); }
      setActivityFetched(true);
    } catch { /* ignore */ }
    finally { setActivityLoading(false); }
  };
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

  const fetchLabResultsAndEvidence = useCallback(async () => {
    if (!shipmentId) return;
    try {
      const [labRes, evRes] = await Promise.all([
        fetch(`/api/lab-results?shipment_id=${shipmentId}&page_size=20`),
        fetch(`/api/shipments/${shipmentId}/evidence-package`),
      ]);
      if (labRes.ok) { const d = await labRes.json(); setLabResults(d.results ?? []); }
      if (evRes.ok) { const d = await evRes.json(); setEvidencePackages(d.packages ?? []); }
    } catch (e) { console.error('Failed to fetch lab/evidence:', e); }
  }, [shipmentId]);

  const generateEvidencePackage = async () => {
    if (!shipmentId) return;
    setIsGeneratingEvidence(true);
    try {
      const res = await fetch(`/api/shipments/${shipmentId}/evidence-package`, { method: 'POST' });
      const d = await res.json();
      if (!res.ok) { toast({ title: 'Error', description: d.error, variant: 'destructive' }); return; }
      // Download PDF
      const link = document.createElement('a');
      link.href = `data:application/pdf;base64,${d.pdf}`;
      link.download = d.fileName;
      link.click();
      toast({ title: 'Evidence package generated', description: `Shareable link: ${d.shareableUrl}` });
      fetchLabResultsAndEvidence();
    } finally { setIsGeneratingEvidence(false); }
  };

  const copyUrl = (url: string) => {
    navigator.clipboard.writeText(url);
    setCopiedUrl(url);
    setTimeout(() => setCopiedUrl(null), 2000);
  };

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
    fetchLabResultsAndEvidence();
  }, [fetchShipment, fetchOutcomes, fetchColdChain, fetchLots, fetchLabResultsAndEvidence]);

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

  const toggleDoc = (_key: string) => { /* doc_status not in schema */ };
  const toggleStorage = (_key: string) => { /* storage_controls not in schema */ };

  const toggleRegulation = (reg: string) => {
    const current = shipment?.target_regulations || [];
    const updated = current.includes(reg)
      ? current.filter(r => r !== reg)
      : [...current, reg];
    updateField('target_regulations', updated);
  };

  const removeItem = (itemId: string) => {
    setConfirmRemoveItem(itemId);
  };

  const doRemoveItem = async () => {
    if (!confirmRemoveItem) return;
    setIsRemovingItem(true);
    try {
      const response = await fetch(`/api/shipments/${shipmentId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ remove_items: [confirmRemoveItem] }),
      });
      if (!response.ok) throw new Error('Failed to remove item');
      toast({ title: 'Item removed' });
      setConfirmRemoveItem(null);
      fetchShipment();
    } catch {
      toast({ title: 'Error', description: 'Failed to remove item', variant: 'destructive' });
    } finally { setIsRemovingItem(false); }
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

  if (!shipment && !isLoading) {
    notFound();
    return null;
  }

  // TypeScript narrowing — notFound() throws but TS doesn't know that
  if (!shipment) {
    return null;
  }

  const exportPdf = () => {
    window.open(`/api/shipments/${shipmentId}/export-pdf`, '_blank');
  };

  const decision = DECISION_CONFIG[readiness?.decision || 'pending'] || DECISION_CONFIG.pending;
  const DecisionIcon = decision.icon;
  const score = readiness?.overall_score ?? 0;

  return (
    <div className="flex-1 space-y-6">
      <div className="flex items-center gap-3 flex-wrap">
        <Button variant="ghost" size="icon" onClick={() => router.push('/app/shipments')} aria-label="Back to shipments" data-testid="button-back">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex items-center justify-center h-9 w-9 rounded-lg icon-bg-blue shrink-0">
          <Ship className="h-4 w-4" />
        </div>
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
            {[shipment.destination_country, shipment.commodity, shipment.buyer_company].filter(Boolean).join(' · ')}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={exportPdf} className="gap-1.5 shrink-0">
          <FileDown className="h-3.5 w-3.5" />Export PDF
        </Button>
      </div>

      <Card className={`${decision.bgColor} border-l-4 ${
        readiness?.decision === 'go' ? 'border-l-green-500' :
        readiness?.decision === 'conditional' ? 'border-l-yellow-500' :
        readiness?.decision === 'no_go' ? 'border-l-red-500' :
        'border-l-muted-foreground/30'
      }`}>
        <CardContent className="py-5">
          <div className="flex items-center justify-between gap-6 flex-wrap">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-xl bg-background flex items-center justify-center shadow-sm border border-border/50">
                <DecisionIcon className={`h-6 w-6 ${decision.color}`} />
              </div>
              <div>
                <p className={`text-lg font-bold ${decision.color}`} data-testid="text-decision-label">
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
              <Button
                size="sm"
                variant="ghost"
                className="mt-2 text-xs text-muted-foreground h-7 px-2"
                onClick={handleRecalculate}
                disabled={recalculating}
                aria-label="Recalculate readiness score"
              >
                <RotateCw className={`h-3 w-3 mr-1 ${recalculating ? 'animate-spin' : ''}`} />
                {recalculating ? 'Recalculating…' : 'Recalculate'}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <ShipmentPipeline shipment={shipment} onRefresh={fetchShipment} />

      {/* Linear Supply Chain Traceability Timeline */}
      <Card className="card-accent-emerald" data-testid="card-supply-chain-graph">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <div className="h-7 w-7 rounded-md flex items-center justify-center icon-bg-emerald shrink-0">
              <Layers className="h-3.5 w-3.5" />
            </div>
            Supply Chain Traceability
          </CardTitle>
          <CardDescription>
            End-to-end provenance — Farm → Batch → Processing → Finished Good → Shipment
          </CardDescription>
        </CardHeader>
        <CardContent>
          {items.length === 0 ? (
            <div className="empty-state py-8">
              <div className="empty-state-icon"><Layers className="h-5 w-5" /></div>
              <p className="text-sm text-muted-foreground">Add shipment items to see the traceability chain.</p>
            </div>
          ) : (() => {
            const batchItems = items.filter(i => i.item_type === 'batch');
            const fgItems = items.filter(i => i.item_type === 'finished_good');
            const totalFarms = items.reduce((s, i) => s + (i.farm_count || 0), 0);
            const steps = [
              { label: 'Farms', value: totalFarms || '—', sub: 'source farms', icon: MapPin, color: 'text-green-600', bg: 'bg-green-50 dark:bg-green-950/20', link: '/app/farms' },
              { label: 'Batches', value: batchItems.length || '—', sub: 'collection batches', icon: Package, color: 'text-blue-600', bg: 'bg-blue-50 dark:bg-blue-950/20', link: '/app/inventory' },
              { label: 'Processing', value: fgItems.length > 0 ? <CheckCircle2 className="h-4 w-4 inline" /> : '—', sub: 'processing runs', icon: PackageCheck, color: 'text-amber-600', bg: 'bg-amber-50 dark:bg-amber-950/20', link: '/app/processing' },
              { label: 'Finished Good', value: fgItems.length || '—', sub: 'finished goods', icon: CircleCheckBig, color: 'text-purple-600', bg: 'bg-purple-50 dark:bg-purple-950/20', link: '/app/pedigree' },
              { label: 'Shipment', value: '1', sub: shipment.status, icon: Ship, color: 'text-primary', bg: 'bg-primary/5', link: null },
            ];
            return (
              <div className="flex items-start gap-0 overflow-x-auto pb-2">
                {steps.map((step, i) => {
                  const Icon = step.icon;
                  const content = (
                    <div className={`flex flex-col items-center text-center min-w-[90px] px-2 py-3 rounded-lg ${step.bg} ${step.link ? 'hover:opacity-80 cursor-pointer transition-opacity' : ''}`}>
                      <div className={`h-9 w-9 rounded-full bg-background flex items-center justify-center mb-2 border`}>
                        <Icon className={`h-4 w-4 ${step.color}`} />
                      </div>
                      <p className={`text-lg font-bold ${step.color}`}>{step.value}</p>
                      <p className="text-xs font-medium mt-0.5">{step.label}</p>
                      <p className="text-xs text-muted-foreground capitalize">{step.sub}</p>
                    </div>
                  );
                  return (
                    <div key={step.label} className="flex items-center shrink-0">
                      {step.link ? <Link href={step.link}>{content}</Link> : content}
                      {i < steps.length - 1 && (
                        <div className="flex items-center px-1 shrink-0">
                          <div className="h-px w-6 bg-border" />
                          <ChevronDown className="h-3 w-3 text-muted-foreground -rotate-90 -mx-1" />
                          <div className="h-px w-6 bg-border" />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            );
          })()}
        </CardContent>
      </Card>

      {/* Readiness Action Center — unified prioritised action list */}
      {readiness && (readiness.risk_flags.length > 0 || readiness.remediation_items.length > 0 || readiness.dimensions.length > 0) && (
        <Card className="card-accent-amber" data-testid="card-action-center">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div>
                <CardTitle className="text-base flex items-center gap-2">
                  <div className="h-7 w-7 rounded-md flex items-center justify-center icon-bg-amber shrink-0">
                    <ClipboardList className="h-3.5 w-3.5" />
                  </div>
                  Readiness Action Center
                </CardTitle>
                <CardDescription>What needs to happen before this shipment can go</CardDescription>
              </div>
              <div className="flex items-center gap-2">
                {readiness.dimensions.map((dim: ScoreDimension) => {
                  const DimIcon = DIMENSION_ICONS[dim.name] || FileText;
                  return (
                    <div key={dim.name} title={`${dim.name}: ${Math.round(dim.score)}/100`} className="flex flex-col items-center gap-0.5">
                      <div className={`h-7 w-7 rounded-md flex items-center justify-center ${
                        dim.score >= 75 ? 'bg-green-100 dark:bg-green-950/30' :
                        dim.score >= 50 ? 'bg-yellow-100 dark:bg-yellow-950/30' :
                        'bg-red-100 dark:bg-red-950/30'
                      }`}>
                        <DimIcon className={`h-3.5 w-3.5 ${
                          dim.score >= 75 ? 'text-green-600' :
                          dim.score >= 50 ? 'text-yellow-600' :
                          'text-red-600'
                        }`} />
                      </div>
                      <span className={`text-[10px] font-bold ${
                        dim.score >= 75 ? 'text-green-600' :
                        dim.score >= 50 ? 'text-yellow-600' :
                        'text-red-600'
                      }`}>{Math.round(dim.score)}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {/* Hard fails and critical flags first */}
              {readiness.risk_flags
                .filter((f: RiskFlag) => f.severity === 'critical' || f.is_hard_fail)
                .map((flag: RiskFlag, i: number) => (
                  <div key={`crit-${i}`} className="flex items-start gap-3 p-3 rounded-md bg-red-50 dark:bg-red-950/20" data-testid={`action-critical-${i}`}>
                    <XCircle className="h-4 w-4 text-red-600 mt-0.5 shrink-0" />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-medium text-red-800 dark:text-red-300">{flag.message}</p>
                        {flag.is_hard_fail && <Badge variant="destructive" className="text-xs">Hard Fail</Badge>}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5 capitalize">{flag.category}</p>
                    </div>
                  </div>
                ))}
              {/* Urgent remediation items */}
              {readiness.remediation_items
                .filter((item: RemediationItem) => item.priority === 'urgent')
                .map((item: RemediationItem, i: number) => (
                  <div key={`urgent-${i}`} className="flex items-start gap-3 p-3 rounded-md bg-red-50 dark:bg-red-950/20" data-testid={`action-urgent-${i}`}>
                    <AlertTriangle className="h-4 w-4 text-red-600 mt-0.5 shrink-0" />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-medium">{item.title}</p>
                        <Badge variant="destructive" className="text-xs">Critical</Badge>
                        {/* Inline upload button for missing document items */}
                        {item.title.toLowerCase().includes('document') || item.title.toLowerCase().includes('certificate') ? (
                          <Button size="sm" variant="outline" className="h-6 text-xs px-2 ml-auto shrink-0"
                            onClick={() => {
                              const docKey = Object.keys(DOC_LABELS).find(k =>
                                item.title.toLowerCase().includes(k.replace(/_/g, ' ')) ||
                                DOC_LABELS[k].toLowerCase().includes(item.title.toLowerCase().split(' ')[0])
                              );
                              setUploadDocType(docKey || '');
                              setUploadDocOpen(true);
                            }}
                          >
                            <Plus className="h-3 w-3 mr-1" />Upload
                          </Button>
                        ) : null}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">{item.description}</p>
                    </div>
                  </div>
                ))}
              {/* Warning flags */}
              {readiness.risk_flags
                .filter((f: RiskFlag) => f.severity === 'warning' && !f.is_hard_fail)
                .map((flag: RiskFlag, i: number) => (
                  <div key={`warn-${i}`} className="flex items-start gap-3 p-3 rounded-md bg-yellow-50 dark:bg-yellow-950/20" data-testid={`action-warning-${i}`}>
                    <AlertTriangle className="h-4 w-4 text-yellow-600 mt-0.5 shrink-0" />
                    <div className="min-w-0">
                      <p className="text-sm font-medium">{flag.message}</p>
                      <p className="text-xs text-muted-foreground mt-0.5 capitalize">{flag.category}</p>
                    </div>
                  </div>
                ))}
              {/* Important remediation items */}
              {readiness.remediation_items
                .filter((item: RemediationItem) => item.priority === 'important')
                .map((item: RemediationItem, i: number) => (
                  <div key={`imp-${i}`} className="flex items-start gap-3 p-3 rounded-md bg-yellow-50 dark:bg-yellow-950/20" data-testid={`action-important-${i}`}>
                    <AlertCircle className="h-4 w-4 text-yellow-600 mt-0.5 shrink-0" />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-medium">{item.title}</p>
                        <Badge variant="outline" className="text-xs">Important</Badge>
                        {item.title.toLowerCase().includes('document') || item.title.toLowerCase().includes('certificate') ? (
                          <Button size="sm" variant="outline" className="h-6 text-xs px-2 ml-auto shrink-0"
                            onClick={() => {
                              const docKey = Object.keys(DOC_LABELS).find(k =>
                                item.title.toLowerCase().includes(k.replace(/_/g, ' ')) ||
                                DOC_LABELS[k].toLowerCase().includes(item.title.toLowerCase().split(' ')[0])
                              );
                              setUploadDocType(docKey || '');
                              setUploadDocOpen(true);
                            }}
                          >
                            <Plus className="h-3 w-3 mr-1" />Upload
                          </Button>
                        ) : null}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">{item.description}</p>
                    </div>
                  </div>
                ))}
              {/* Advisory items */}
              {readiness.remediation_items
                .filter((item: RemediationItem) => item.priority !== 'urgent' && item.priority !== 'important')
                .map((item: RemediationItem, i: number) => (
                  <div key={`adv-${i}`} className="flex items-start gap-3 p-3 rounded-md bg-muted/50" data-testid={`action-advisory-${i}`}>
                    <Info className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                    <div className="min-w-0">
                      <p className="text-sm font-medium">{item.title}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{item.description}</p>
                    </div>
                  </div>
                ))}
              {/* All clear */}
              {readiness.risk_flags.length === 0 && readiness.remediation_items.length === 0 && (
                <div className="flex items-center gap-3 p-3 rounded-md bg-green-50 dark:bg-green-950/20">
                  <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0" />
                  <p className="text-sm font-medium text-green-800 dark:text-green-300">All checks passed — shipment is ready to go</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="card-accent-violet">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <div className="h-7 w-7 rounded-md flex items-center justify-center icon-bg-violet shrink-0">
                <Globe className="h-3.5 w-3.5" />
              </div>
              Target Regulations
            </CardTitle>
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

        <Card className="card-accent-blue">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between gap-2">
              <div>
                <CardTitle className="text-base flex items-center gap-2">
                  <div className="h-7 w-7 rounded-md flex items-center justify-center icon-bg-blue shrink-0">
                    <FileText className="h-3.5 w-3.5" />
                  </div>
                  Export Documentation
                </CardTitle>
                <CardDescription>Mark documents that are ready for this shipment</CardDescription>
              </div>
              <Dialog open={uploadDocOpen} onOpenChange={(open) => { setUploadDocOpen(open); if (!open) setUploadDocType(''); }}>
                <DialogTrigger asChild>
                  <Button size="sm" variant="outline" className="shrink-0">
                    <Plus className="h-3.5 w-3.5 mr-1.5" />Upload Document
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-md">
                  <DialogHeader>
                    <DialogTitle>Upload Document</DialogTitle>
                    <DialogDescription>
                      Attach a compliance document to shipment {shipment?.shipment_code}
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="upload-doc-type">Document Type <span className="text-destructive">*</span></Label>
                      <Select value={uploadDocType} onValueChange={setUploadDocType}>
                        <SelectTrigger id="upload-doc-type" data-testid="select-upload-doc-type">
                          <SelectValue placeholder="Select document type…" />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(DOC_LABELS).map(([key, label]) => (
                            <SelectItem key={key} value={key}>{label}</SelectItem>
                          ))}
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    {uploadDocType && (
                      <DocumentUpload
                        onUploadComplete={async (result) => {
                          if (shipment) {
                            await fetch('/api/documents', {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({
                                title: result.file_name,
                                file_url: result.url,
                                document_type: uploadDocType,
                                linked_entity_type: 'shipment',
                                linked_entity_id: shipment.id,
                              }),
                            });
                            setUploadDocOpen(false);
                            setUploadDocType('');
                            fetchShipment();
                            // Trigger score recompute — new document may improve readiness
                            handleRecalculate();
                          }
                        }}
                      />
                    )}
                  </div>
                </DialogContent>
              </Dialog>
            </div>
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
                    checked={!!({} as any)?.[key]}
                    onCheckedChange={() => toggleDoc(key)}
                    data-testid={`switch-doc-${key}`}
                  />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="card-accent-emerald">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <div className="h-7 w-7 rounded-md flex items-center justify-center icon-bg-emerald shrink-0">
              <ShieldCheck className="h-3.5 w-3.5" />
            </div>
            Storage & Handling Controls
          </CardTitle>
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
                  checked={!!({} as any)?.[key]}
                  onCheckedChange={() => toggleStorage(key)}
                  data-testid={`switch-storage-${key}`}
                />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className="card-accent-blue">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <div className="h-7 w-7 rounded-md flex items-center justify-center icon-bg-blue shrink-0">
                  <Package className="h-3.5 w-3.5" />
                </div>
                Shipment Items ({items.length})
              </CardTitle>
              <CardDescription>Batches and finished goods included in this shipment</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {items.length === 0 ? (
            <div className="empty-state py-8">
              <div className="empty-state-icon"><Package className="h-5 w-5" /></div>
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
                        {item.item_type === 'batch'
                          ? (item.batch_data?.batch_code || item.batch_id?.toString().slice(0, 8) || '—')
                          : item.finished_good_id?.slice(0, 8)}
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

      <Card className="card-accent-red">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <div className="h-7 w-7 rounded-md flex items-center justify-center icon-bg-red shrink-0">
                  <History className="h-3.5 w-3.5" />
                </div>
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

      <Card className="card-accent-blue">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <div className="h-7 w-7 rounded-md flex items-center justify-center icon-bg-blue shrink-0">
                  <ThermometerSnowflake className="h-3.5 w-3.5" />
                </div>
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
              {[
                { label: 'Avg Temp', value: coldChainSummary.avg_temp !== null ? `${coldChainSummary.avg_temp.toFixed(1)}°C` : '—', color: '' },
                { label: 'Min Temp', value: coldChainSummary.min_temp !== null ? `${coldChainSummary.min_temp.toFixed(1)}°C` : '—', color: '' },
                { label: 'Max Temp', value: coldChainSummary.max_temp !== null ? `${coldChainSummary.max_temp.toFixed(1)}°C` : '—', color: '' },
                { label: 'Alerts', value: String(coldChainSummary.alert_count), color: coldChainSummary.alert_count > 0 ? 'text-red-600' : 'text-green-600' },
              ].map(s => (
                <div key={s.label} className="flex items-center justify-between p-3 rounded-lg bg-muted/40 border border-border/50">
                  <span className="text-xs text-muted-foreground">{s.label}</span>
                  <span className={`font-bold text-sm ${s.color}`}>{s.value}</span>
                </div>
              ))}
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

      <Card className="card-accent-violet">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <div className="h-7 w-7 rounded-md flex items-center justify-center icon-bg-violet shrink-0">
                  <Layers className="h-3.5 w-3.5" />
                </div>
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
                        <Badge key={li.id} variant="outline" className="text-xs">Batch {li.batch_code || li.batch_id?.toString().slice(0, 8) || li.id?.slice(0, 8)}</Badge>
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

      <Card className="card-accent-blue">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <div className="h-7 w-7 rounded-md flex items-center justify-center icon-bg-blue shrink-0">
              <Ship className="h-3.5 w-3.5" />
            </div>
            Shipment Details
          </CardTitle>
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

      {/* Lab Results */}
      <Card className="card-accent-emerald">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <div className="h-7 w-7 rounded-md flex items-center justify-center icon-bg-emerald shrink-0">
                  <FlaskConical className="h-3.5 w-3.5" />
                </div>
                Lab Results ({labResults.length})
              </CardTitle>
              <CardDescription>Pesticide residue and quality test results for this shipment</CardDescription>
            </div>
            <Button variant="outline" size="sm" asChild>
              <Link href={`/app/lab-results?prefillShipmentId=${shipmentId}`}>
                <Plus className="h-4 w-4 mr-1" /> Upload Lab Result
              </Link>
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {labResults.length === 0 ? (
            <div className="text-center py-6">
              <FlaskConical className="h-8 w-8 text-muted-foreground mx-auto mb-2 opacity-40" />
              <p className="text-sm text-muted-foreground">No lab results linked to this shipment.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {labResults.map((lr: any) => (
                <div key={lr.id} className="flex items-center justify-between gap-3 p-3 rounded-md bg-muted/50">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium">{lr.test_type?.replace(/_/g, ' ')}</span>
                      <Badge
                        variant={lr.overall_result === 'pass' ? 'default' : lr.overall_result === 'fail' ? 'destructive' : 'secondary'}
                        className="text-xs"
                      >
                        {lr.overall_result?.toUpperCase()}
                      </Badge>
                      {lr.mrl_flags && Array.isArray(lr.mrl_flags) && lr.mrl_flags.length > 0 && (
                        <Badge variant="destructive" className="text-xs">
                          {lr.mrl_flags.length} MRL exceedance{lr.mrl_flags.length > 1 ? 's' : ''}
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {lr.lab_provider} · {lr.test_date ? new Date(lr.test_date).toLocaleDateString() : '—'}
                      {lr.result_value != null && ` · ${lr.result_value} ${lr.result_unit || ''}`}
                    </p>
                  </div>
                  {lr.certificate_number && (
                    <Badge variant="outline" className="text-xs shrink-0">Cert #{lr.certificate_number}</Badge>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Cost of Export & Net Margin */}
      <CostTracker shipmentId={shipment.id} />

      {/* Evidence Package */}
      <Card className="card-accent-violet">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <div className="h-7 w-7 rounded-md flex items-center justify-center icon-bg-violet shrink-0">
                  <Share2 className="h-3.5 w-3.5" />
                </div>
                Evidence Packages
              </CardTitle>
              <CardDescription>Shareable border-detention evidence bundles (valid 7 days)</CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={generateEvidencePackage}
              disabled={isGeneratingEvidence}
            >
              {isGeneratingEvidence ? (
                <><Loader2 className="h-4 w-4 mr-1 animate-spin" />Generating…</>
              ) : (
                <><FileDown className="h-4 w-4 mr-1" />Generate Package</>
              )}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {evidencePackages.length === 0 ? (
            <div className="text-center py-6">
              <Share2 className="h-8 w-8 text-muted-foreground mx-auto mb-2 opacity-40" />
              <p className="text-sm text-muted-foreground">No evidence packages generated yet.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {evidencePackages.map((pkg: any) => {
                const shareUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/app/evidence/${pkg.token}`;
                const expired = new Date(pkg.expires_at) < new Date();
                return (
                  <div key={pkg.id} className="flex items-center justify-between gap-3 p-3 rounded-md bg-muted/50">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-xs text-muted-foreground truncate max-w-[200px]">{pkg.token}</span>
                        {expired ? (
                          <Badge variant="destructive" className="text-xs">Expired</Badge>
                        ) : (
                          <Badge variant="secondary" className="text-xs">
                            <CheckCircle className="h-3 w-3 mr-1" />Active
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Expires {new Date(pkg.expires_at).toLocaleDateString()} · {pkg.view_count ?? 0} views
                      </p>
                    </div>
                    {!expired && (
                      <Button variant="ghost" size="sm" onClick={() => copyUrl(shareUrl)} className="shrink-0">
                        {copiedUrl === shareUrl ? (
                          <><CheckCircle className="h-4 w-4 mr-1 text-green-600" />Copied</>
                        ) : (
                          <><Copy className="h-4 w-4 mr-1" />Copy Link</>
                        )}
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <div className="h-7 w-7 rounded-md flex items-center justify-center bg-muted shrink-0">
                <History className="h-3.5 w-3.5 text-muted-foreground" />
              </div>
              Activity
            </CardTitle>
            {!activityFetched && (
              <Button variant="outline" size="sm" onClick={fetchActivity}>Load Activity</Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {activityLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : !activityFetched ? (
            <p className="text-sm text-muted-foreground text-center py-4">Click Load Activity to view the audit trail.</p>
          ) : activityEvents.length === 0 ? (
            <div className="flex flex-col items-center py-8 text-center">
              <Clock className="h-8 w-8 text-muted-foreground opacity-30 mb-2" />
              <p className="text-sm font-medium">No activity recorded</p>
              <p className="text-xs text-muted-foreground mt-0.5">Changes to this shipment will appear here</p>
            </div>
          ) : (
            <div className="space-y-0">
              {activityEvents.map((ev: any, i: number) => {
                const isLast = i === activityEvents.length - 1;
                const label = (ev.action || ev.event_type || 'updated').replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase());
                return (
                  <div key={ev.id || i} className="flex gap-3">
                    <div className="flex flex-col items-center">
                      <div className="h-6 w-6 rounded-full bg-muted flex items-center justify-center shrink-0">
                        <Clock className="h-3 w-3 text-muted-foreground" />
                      </div>
                      {!isLast && <div className="w-0.5 flex-1 bg-border mt-1 min-h-[16px]" />}
                    </div>
                    <div className="pb-3">
                      <p className="text-sm font-medium">{label}</p>
                      <p className="text-xs text-muted-foreground">
                        {ev.actor_email || 'System'}{ev.created_at && ` · ${new Date(ev.created_at).toLocaleString('en-NG', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}`}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <ConfirmDialog
        open={!!confirmRemoveItem}
        onOpenChange={open => { if (!open) setConfirmRemoveItem(null); }}
        title="Remove item from shipment"
        description="Remove this item from the shipment? The finished good record will remain, but it will no longer be linked to this shipment."
        confirmLabel="Remove Item"
        loading={isRemovingItem}
        onConfirm={doRemoveItem}
      />
    </div>
  );
}
