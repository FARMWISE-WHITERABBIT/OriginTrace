'use client';

/**
 * /app/payments/disbursements — Farmer Disbursement Management
 *
 * Features:
 *   - Stats cards: Pending / Approved / Disbursed amounts + counts
 *   - Calculate disbursements for a batch (trigger computation)
 *   - Bulk approve pending disbursements
 *   - Bulk pay all approved disbursements
 *   - Individual pay per farmer
 *   - Grouped by batch, filterable by status / batch
 */

import { useState, useEffect, useCallback } from 'react';
import { useOrg } from '@/lib/contexts/org-context';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import {
  Loader2,
  DollarSign,
  CheckCircle2,
  Clock,
  XCircle,
  ArrowRight,
  AlertCircle,
  Banknote,
  RefreshCw,
  Play,
  Plus,
  Users,
  TrendingUp,
  Package,
  Search,
} from 'lucide-react';
import Link from 'next/link';

interface DisbursementRow {
  id: string;
  batch_id: number;
  farm_id: number;
  farmer_name: string;
  community: string | null;
  weight_kg: number;
  price_per_kg: number;
  gross_amount: number;
  deductions: number;
  net_amount: number;
  currency: string;
  status: 'pending' | 'approved' | 'disbursed' | 'failed';
  payment_id: string | null;
  approved_at: string | null;
  notes: string | null;
  created_at: string;
  farmer_bank_accounts?: { id: string; account_name: string; bank_name: string; is_verified: boolean } | null;
  collection_batches?: { batch_code: string | null; commodity: string | null } | null;
}

const STATUS_CONFIG = {
  pending: { label: 'Pending', icon: Clock, className: 'text-amber-600 bg-amber-50' },
  approved: { label: 'Approved', icon: CheckCircle2, className: 'text-blue-600 bg-blue-50' },
  disbursed: { label: 'Disbursed', icon: CheckCircle2, className: 'text-green-600 bg-green-50' },
  failed: { label: 'Failed', icon: XCircle, className: 'text-red-600 bg-red-50' },
};

const BATCH_STATUS_BADGE: Record<string, string> = {
  dispatched: 'text-blue-700 bg-blue-50',
  aggregated: 'text-violet-700 bg-violet-50',
  completed:  'text-green-700 bg-green-50',
};

interface BatchOption {
  id: number;
  batch_code: string | null;
  commodity: string | null;
  total_weight: number | null;
  status: string;
  farm: { farmer_name: string; community: string | null } | null;
}

function titleCase(str: string) {
  return str.replace(/\b\w/g, (c) => c.toUpperCase());
}

// ── Calculate Disbursements Dialog ────────────────────────────────────────────
function CalculateDialog({
  open,
  onOpenChange,
  onDone,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onDone: () => void;
}) {
  const { toast } = useToast();
  const [batches, setBatches] = useState<BatchOption[]>([]);
  const [isFetchingBatches, setIsFetchingBatches] = useState(false);
  const [selectedBatch, setSelectedBatch] = useState<BatchOption | null>(null);
  const [batchSearch, setBatchSearch] = useState('');
  const [isCalculating, setIsCalculating] = useState(false);
  const [result, setResult] = useState<{ created: number; updated: number; farmers: number; total: number } | null>(null);

  useEffect(() => {
    if (!open) return;
    setIsFetchingBatches(true);
    fetch('/api/batches?limit=200')
      .then((r) => r.json())
      .then((d) => {
        const eligible = (d.batches || []).filter((b: BatchOption) =>
          ['dispatched', 'aggregated', 'completed'].includes(b.status)
        );
        setBatches(eligible);
      })
      .catch(() => {})
      .finally(() => setIsFetchingBatches(false));
  }, [open]);

  const filteredBatches = batches.filter((b) => {
    if (!batchSearch.trim()) return true;
    const q = batchSearch.toLowerCase();
    return (
      b.batch_code?.toLowerCase().includes(q) ||
      b.commodity?.toLowerCase().includes(q) ||
      b.farm?.farmer_name?.toLowerCase().includes(q) ||
      b.farm?.community?.toLowerCase().includes(q) ||
      String(b.id).includes(q)
    );
  });

  const handleCalculate = async () => {
    if (!selectedBatch) return;
    setIsCalculating(true);
    setResult(null);
    try {
      const res = await fetch('/api/disbursements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ batch_id: selectedBatch.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Calculation failed');

      setResult({
        created: data.created ?? 0,
        updated: data.updated ?? 0,
        farmers: data.farmers ?? (data.created ?? 0) + (data.updated ?? 0),
        total: data.total_amount ?? 0,
      });

      toast({
        title: 'Disbursements calculated',
        description: `${data.created ?? 0} new, ${data.updated ?? 0} updated for ${selectedBatch.batch_code ?? `Batch #${selectedBatch.id}`}`,
      });
      onDone();
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setIsCalculating(false);
    }
  };

  const handleClose = () => {
    onOpenChange(false);
    setSelectedBatch(null);
    setBatchSearch('');
    setResult(null);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-1">
            <div className="h-10 w-10 rounded-lg icon-bg-blue flex items-center justify-center shrink-0">
              <Play className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-base">Calculate Disbursements</DialogTitle>
              <DialogDescription className="text-sm mt-0.5">
                Select a dispatched batch to compute farmer payments using configured pricing.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {result ? (
          <div className="space-y-3 py-2">
            <div className="rounded-lg border border-green-100 bg-green-50/50 p-4 space-y-2">
              <p className="text-sm font-semibold text-green-900 flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4" />Calculation complete
              </p>
              <div className="grid grid-cols-2 gap-2 text-xs text-green-800">
                <div><span className="font-medium">{result.created}</span> new records</div>
                <div><span className="font-medium">{result.updated}</span> updated</div>
                <div className="col-span-2">
                  Total: <span className="font-semibold">NGN {Number(result.total).toLocaleString()}</span>
                </div>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              All farmers are now in <span className="font-medium">Pending</span> status. Review and approve them below.
            </p>
          </div>
        ) : (
          <div className="space-y-3 py-2">
            {/* Selected batch confirmation chip */}
            {selectedBatch ? (
              <div className="rounded-lg border border-blue-100 bg-blue-50/50 px-4 py-3 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="h-8 w-8 rounded-lg bg-blue-100 flex items-center justify-center shrink-0">
                    <Package className="h-4 w-4 text-blue-600" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-mono font-semibold text-blue-900 leading-tight">
                      {selectedBatch.batch_code ?? `#${selectedBatch.id}`}
                    </p>
                    <p className="text-xs text-blue-700 truncate mt-0.5">
                      {selectedBatch.commodity ? titleCase(selectedBatch.commodity) : '—'}
                      {selectedBatch.total_weight
                        ? ` · ${Number(selectedBatch.total_weight).toLocaleString()} kg`
                        : ''}
                      {selectedBatch.farm?.farmer_name
                        ? ` · ${selectedBatch.farm.farmer_name}`
                        : ''}
                      {selectedBatch.farm?.community
                        ? `, ${selectedBatch.farm.community}`
                        : ''}
                    </p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs text-blue-600 hover:text-blue-900 shrink-0"
                  onClick={() => setSelectedBatch(null)}
                >
                  Change
                </Button>
              </div>
            ) : (
              <>
                {/* Search input */}
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
                  <Input
                    placeholder="Search by batch code, commodity, or farmer…"
                    value={batchSearch}
                    onChange={(e) => setBatchSearch(e.target.value)}
                    className="h-9 pl-8 text-sm"
                    autoFocus
                  />
                </div>

                {/* Batch list */}
                <div className="border rounded-lg overflow-hidden">
                  {isFetchingBatches ? (
                    <div className="flex items-center justify-center py-10">
                      <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                    </div>
                  ) : filteredBatches.length === 0 ? (
                    <div className="text-center py-10 text-sm text-muted-foreground">
                      {batches.length === 0
                        ? 'No dispatched or aggregated batches found'
                        : 'No batches match your search'}
                    </div>
                  ) : (
                    <div className="divide-y max-h-60 overflow-y-auto">
                      {filteredBatches.map((b) => (
                        <button
                          key={b.id}
                          type="button"
                          className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-muted/40 transition-colors"
                          onClick={() => setSelectedBatch(b)}
                        >
                          <div className="h-8 w-8 rounded-lg bg-muted flex items-center justify-center shrink-0">
                            <Package className="h-4 w-4 text-muted-foreground" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-mono font-medium leading-tight">
                              {b.batch_code ?? `#${b.id}`}
                            </p>
                            <p className="text-xs text-muted-foreground truncate mt-0.5">
                              {b.commodity ? titleCase(b.commodity) : '—'}
                              {b.total_weight
                                ? ` · ${Number(b.total_weight).toLocaleString()} kg`
                                : ''}
                              {b.farm?.farmer_name ? ` · ${b.farm.farmer_name}` : ''}
                              {b.farm?.community ? `, ${b.farm.community}` : ''}
                            </p>
                          </div>
                          <Badge
                            variant="secondary"
                            className={`text-xs shrink-0 ${BATCH_STATUS_BADGE[b.status] ?? 'text-muted-foreground bg-muted'}`}
                          >
                            {b.status}
                          </Badge>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {batches.length > 0 && (
                  <p className="text-xs text-muted-foreground">
                    Showing {filteredBatches.length} of {batches.length} eligible batch{batches.length !== 1 ? 'es' : ''}
                  </p>
                )}
              </>
            )}
          </div>
        )}

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={handleClose}>
            {result ? 'Close' : 'Cancel'}
          </Button>
          {!result && (
            <Button onClick={handleCalculate} disabled={isCalculating || !selectedBatch}>
              {isCalculating ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Calculating…</>
              ) : (
                <><Play className="h-4 w-4 mr-2" />Calculate</>
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Pay Single Farmer Dialog ──────────────────────────────────────────────────
function PayDialog({
  open,
  onOpenChange,
  disbursement,
  onPaid,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  disbursement: DisbursementRow | null;
  onPaid: () => void;
}) {
  const { toast } = useToast();
  const [provider, setProvider] = useState('bank_transfer');
  const [phone, setPhone] = useState('');
  const [isPaying, setIsPaying] = useState(false);

  if (!disbursement) return null;

  const hasBankAccount = !!disbursement.farmer_bank_accounts?.id;
  const isMoMo = ['mtn_momo', 'opay', 'palmpay'].includes(provider);

  const handlePay = async () => {
    setIsPaying(true);
    try {
      const res = await fetch(`/api/disbursements/${disbursement.id}/pay`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider,
          phone: isMoMo ? phone : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Payment failed');

      toast({
        title: 'Payment initiated',
        description: `${disbursement.currency} ${Number(disbursement.net_amount).toLocaleString()} sent to ${disbursement.farmer_name}`,
      });
      onOpenChange(false);
      onPaid();
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setIsPaying(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-1">
            <div className="h-10 w-10 rounded-lg icon-bg-emerald flex items-center justify-center shrink-0">
              <Banknote className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-base">Pay {disbursement.farmer_name}</DialogTitle>
              <DialogDescription className="text-sm mt-0.5">
                {disbursement.currency} {Number(disbursement.net_amount).toLocaleString()} &mdash; {Number(disbursement.weight_kg).toFixed(1)} kg
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {hasBankAccount && provider === 'bank_transfer' && (
            <div className="rounded-lg border border-emerald-100 bg-emerald-50/50 px-4 py-3 flex items-center gap-3">
              <div className="h-8 w-8 rounded-full bg-emerald-100 flex items-center justify-center shrink-0 text-sm font-bold text-emerald-700">
                {disbursement.farmer_name.charAt(0).toUpperCase()}
              </div>
              <div>
                <p className="text-sm font-medium text-emerald-900">{disbursement.farmer_bank_accounts?.account_name}</p>
                <p className="text-xs text-emerald-700">{disbursement.farmer_bank_accounts?.bank_name}</p>
              </div>
            </div>
          )}

          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Payment Method</Label>
            <Select value={provider} onValueChange={setProvider}>
              <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="bank_transfer" disabled={!hasBankAccount}>
                  Bank Transfer{!hasBankAccount && ' — no bank account on file'}
                </SelectItem>
                <SelectItem value="mtn_momo">MTN MoMo</SelectItem>
                <SelectItem value="opay">OPay</SelectItem>
                <SelectItem value="palmpay">PalmPay</SelectItem>
                <SelectItem value="cash">Cash (log only)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {isMoMo && (
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Phone Number</Label>
              <Input placeholder="+234…" value={phone} onChange={(e) => setPhone(e.target.value)} className="h-9" />
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handlePay} disabled={isPaying || (isMoMo && !phone)} className="min-w-[120px]">
            {isPaying ? (
              <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Sending…</>
            ) : (
              <><Banknote className="h-4 w-4 mr-2" />Send Payment</>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Bulk Pay Dialog ───────────────────────────────────────────────────────────
function BulkPayDialog({
  open,
  onOpenChange,
  approvedRows,
  onDone,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  approvedRows: DisbursementRow[];
  onDone: () => void;
}) {
  const { toast } = useToast();
  const [provider, setProvider] = useState('bank_transfer');
  const [isPaying, setIsPaying] = useState(false);
  const [progress, setProgress] = useState(0);

  const total = approvedRows.reduce((s, r) => s + Number(r.net_amount), 0);

  const handleBulkPay = async () => {
    setIsPaying(true);
    setProgress(0);
    let succeeded = 0;
    let failed = 0;

    for (let i = 0; i < approvedRows.length; i++) {
      const row = approvedRows[i];
      try {
        const res = await fetch(`/api/disbursements/${row.id}/pay`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ provider }),
        });
        if (res.ok) succeeded++;
        else failed++;
      } catch {
        failed++;
      }
      setProgress(i + 1);
    }

    setIsPaying(false);
    toast({
      title: 'Bulk payment complete',
      description: `${succeeded} succeeded, ${failed} failed out of ${approvedRows.length} disbursements`,
      variant: failed > 0 ? 'destructive' : 'default',
    });
    onOpenChange(false);
    onDone();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-1">
            <div className="h-10 w-10 rounded-lg icon-bg-blue flex items-center justify-center shrink-0">
              <Users className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-base">Bulk Pay Approved Disbursements</DialogTitle>
              <DialogDescription className="text-sm mt-0.5">
                {approvedRows.length} farmer{approvedRows.length !== 1 ? 's' : ''} &mdash; NGN {total.toLocaleString()} total
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="rounded-lg border border-blue-100 bg-blue-50/50 p-3 text-xs text-blue-900 space-y-1">
            <p className="font-medium">Payments will be processed sequentially.</p>
            <p>Farmers with no bank account on file will be skipped for bank transfer payments.</p>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Payment Method</Label>
            <Select value={provider} onValueChange={setProvider}>
              <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="bank_transfer">Bank Transfer (uses farmer bank account)</SelectItem>
                <SelectItem value="cash">Cash (log only)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {isPaying && (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Processing…</span>
                <span>{progress} / {approvedRows.length}</span>
              </div>
              <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full bg-primary transition-all duration-300"
                  style={{ width: `${(progress / approvedRows.length) * 100}%` }}
                />
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isPaying}>Cancel</Button>
          <Button onClick={handleBulkPay} disabled={isPaying || approvedRows.length === 0} className="min-w-[140px]">
            {isPaying ? (
              <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Processing…</>
            ) : (
              <><Users className="h-4 w-4 mr-2" />Pay {approvedRows.length} Farmers</>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export function DisbursementsContent() {
  const { organization } = useOrg();
  const { toast } = useToast();
  const [disbursements, setDisbursements] = useState<DisbursementRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [statusFilter, setStatusFilter] = useState('all');
  const [isApproving, setIsApproving] = useState(false);
  const [payTarget, setPayTarget] = useState<DisbursementRow | null>(null);
  const [payDialogOpen, setPayDialogOpen] = useState(false);
  const [batchIdFilter, setBatchIdFilter] = useState('');
  const [calcOpen, setCalcOpen] = useState(false);
  const [bulkPayOpen, setBulkPayOpen] = useState(false);

  const fetchDisbursements = useCallback(async () => {
    if (!organization) return;
    setIsLoading(true);
    try {
      const qs = new URLSearchParams({ limit: '200' });
      if (statusFilter !== 'all') qs.set('status', statusFilter);
      if (batchIdFilter) qs.set('batch_id', batchIdFilter);

      const res = await fetch(`/api/disbursements?${qs}`);
      if (res.ok) {
        const d = await res.json();
        setDisbursements(d.disbursements ?? []);
      }
    } catch {}
    setIsLoading(false);
  }, [organization, statusFilter, batchIdFilter]);

  useEffect(() => { fetchDisbursements(); }, [fetchDisbursements]);

  const pendingRows = disbursements.filter((d) => d.status === 'pending');
  const approvedRows = disbursements.filter((d) => d.status === 'approved');
  const disbursedRows = disbursements.filter((d) => d.status === 'disbursed');
  const totalPending = pendingRows.reduce((s, d) => s + Number(d.net_amount), 0);
  const totalApproved = approvedRows.reduce((s, d) => s + Number(d.net_amount), 0);
  const totalDisbursed = disbursedRows.reduce((s, d) => s + Number(d.net_amount), 0);

  const selectedPendingIds = [...selectedIds].filter(
    (id) => disbursements.find((d) => d.id === id)?.status === 'pending'
  );

  const handleSelectAll = (checked: boolean) => {
    setSelectedIds(checked ? new Set(pendingRows.map((d) => d.id)) : new Set());
  };

  const handleToggle = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const handleApproveSelected = async () => {
    if (selectedPendingIds.length === 0) return;
    setIsApproving(true);
    try {
      const res = await fetch('/api/disbursements/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: selectedPendingIds }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Approval failed');

      toast({
        title: 'Approved',
        description: `${data.approved} disbursement(s) approved (NGN ${Number(data.total_amount).toLocaleString()})`,
      });
      setSelectedIds(new Set());
      fetchDisbursements();
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setIsApproving(false);
    }
  };

  // Unique batches derived from loaded disbursements — used for the filter dropdown
  const uniqueBatches = Array.from(
    new Map(
      disbursements.map((d) => [
        d.batch_id,
        {
          id: d.batch_id,
          code: d.collection_batches?.batch_code ?? `#${d.batch_id}`,
          commodity: d.collection_batches?.commodity ?? '',
        },
      ])
    ).values()
  ).sort((a, b) => a.id - b.id);

  const visibleRows = disbursements.filter((d) =>
    statusFilter === 'all' || d.status === statusFilter
  );

  // Group by batch
  const byBatch = new Map<number, DisbursementRow[]>();
  for (const row of visibleRows) {
    if (!byBatch.has(row.batch_id)) byBatch.set(row.batch_id, []);
    byBatch.get(row.batch_id)!.push(row);
  }

  return (
    <div className="flex-1 space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg icon-bg-emerald flex items-center justify-center shrink-0">
            <Banknote className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-lg font-semibold leading-tight">Disbursements</h2>
            <p className="text-sm text-muted-foreground">Compute, approve, and pay farmer disbursements</p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button variant="outline" size="sm" onClick={fetchDisbursements}>
            <RefreshCw className="h-4 w-4 mr-1.5" />Refresh
          </Button>
          <Button variant="outline" size="sm" onClick={() => setCalcOpen(true)}>
            <Play className="h-4 w-4 mr-1.5" />Calculate for Batch
          </Button>
          {approvedRows.length > 0 && (
            <Button
              size="sm"
              variant="outline"
              className="border-blue-200 text-blue-700 hover:bg-blue-50"
              onClick={() => setBulkPayOpen(true)}
            >
              <Users className="h-4 w-4 mr-1.5" />
              Bulk Pay ({approvedRows.length})
            </Button>
          )}
          <Button
            size="sm"
            onClick={handleApproveSelected}
            disabled={isApproving || selectedPendingIds.length === 0}
          >
            {isApproving && <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />}
            Approve Selected
            {selectedPendingIds.length > 0 && (
              <span className="ml-1.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-white/20 px-1 text-xs font-bold">
                {selectedPendingIds.length}
              </span>
            )}
          </Button>
        </div>
      </div>

      {/* Stats strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="card-accent-amber transition-all hover:shadow-md hover:-translate-y-0.5">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Pending Approval</p>
                <p className="text-xl font-bold mt-0.5 leading-tight">NGN {totalPending.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{pendingRows.length} farmer{pendingRows.length !== 1 ? 's' : ''}</p>
              </div>
              <div className="h-9 w-9 rounded-lg icon-bg-amber flex items-center justify-center shrink-0">
                <Clock className="h-5 w-5" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="card-accent-blue transition-all hover:shadow-md hover:-translate-y-0.5">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Ready to Pay</p>
                <p className="text-xl font-bold mt-0.5 leading-tight">NGN {totalApproved.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{approvedRows.length} farmer{approvedRows.length !== 1 ? 's' : ''}</p>
              </div>
              <div className="h-9 w-9 rounded-lg icon-bg-blue flex items-center justify-center shrink-0">
                <CheckCircle2 className="h-5 w-5" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="card-accent-emerald transition-all hover:shadow-md hover:-translate-y-0.5">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Total Disbursed</p>
                <p className="text-xl font-bold mt-0.5 leading-tight">NGN {totalDisbursed.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{disbursedRows.length} farmer{disbursedRows.length !== 1 ? 's' : ''}</p>
              </div>
              <div className="h-9 w-9 rounded-lg icon-bg-emerald flex items-center justify-center shrink-0">
                <TrendingUp className="h-5 w-5" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters row */}
      <div className="flex items-center gap-3 flex-wrap">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="h-8 w-36 text-sm"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="disbursed">Disbursed</SelectItem>
            <SelectItem value="failed">Failed</SelectItem>
          </SelectContent>
        </Select>

        <Select value={batchIdFilter || 'all'} onValueChange={(v) => setBatchIdFilter(v === 'all' ? '' : v)}>
          <SelectTrigger className="h-8 w-44 text-sm"><SelectValue placeholder="All batches" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All batches</SelectItem>
            {uniqueBatches.map((b) => (
              <SelectItem key={b.id} value={String(b.id)}>
                <span className="font-mono">{b.code}</span>
                {b.commodity && (
                  <span className="ml-1.5 text-muted-foreground">· {titleCase(b.commodity)}</span>
                )}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {pendingRows.length > 0 && (
          <div className="flex items-center gap-2 ml-auto">
            <Checkbox
              id="select-all"
              checked={selectedIds.size > 0 && selectedIds.size === pendingRows.length}
              onCheckedChange={handleSelectAll}
            />
            <label htmlFor="select-all" className="text-sm cursor-pointer text-muted-foreground">
              Select all pending
            </label>
          </div>
        )}
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : visibleRows.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">
            <DollarSign className="h-6 w-6" />
          </div>
          <p className="font-semibold mt-3">No disbursements found</p>
          <p className="text-sm text-muted-foreground mt-1 max-w-xs">
            Use <span className="font-medium">Calculate for Batch</span> to compute farmer payments from a dispatched collection batch.
          </p>
          <Button size="sm" className="mt-4" onClick={() => setCalcOpen(true)}>
            <Play className="h-3.5 w-3.5 mr-1.5" />Calculate for Batch
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          {[...byBatch.entries()].map(([batchId, rows]) => {
            const batchCode = rows[0]?.collection_batches?.batch_code ?? `Batch #${batchId}`;
            const commodity = rows[0]?.collection_batches?.commodity ?? '-';
            const batchTotal = rows.reduce((s, r) => s + Number(r.net_amount), 0);
            const currency = rows[0]?.currency ?? 'NGN';
            const batchApproved = rows.filter((r) => r.status === 'approved');

            return (
              <Card key={batchId} className="card-accent-blue">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-lg icon-bg-blue flex items-center justify-center shrink-0">
                        <Banknote className="h-4 w-4" />
                      </div>
                      <div>
                        <CardTitle className="text-sm font-mono">{batchCode}</CardTitle>
                        <CardDescription className="text-xs mt-0.5">
                          {commodity} &nbsp;&middot;&nbsp; {rows.length} farmer{rows.length !== 1 ? 's' : ''} &nbsp;&middot;&nbsp; {currency} {batchTotal.toLocaleString()} total
                        </CardDescription>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {batchApproved.length > 0 && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs gap-1 border-blue-200 text-blue-700 hover:bg-blue-50"
                          onClick={() => {
                            // Open bulk pay with just this batch's approved rows
                            setBulkPayOpen(true);
                          }}
                        >
                          <Users className="h-3 w-3" />
                          Pay {batchApproved.length}
                        </Button>
                      )}
                      <Link href={`/app/inventory/${batchId}`}>
                        <Button size="sm" variant="ghost" className="h-7 text-xs gap-1">
                          View Batch <ArrowRight className="h-3 w-3" />
                        </Button>
                      </Link>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="divide-y">
                    {rows.map((row) => {
                      const statusCfg = STATUS_CONFIG[row.status];
                      const StatusIcon = statusCfg.icon;
                      const isSelectable = row.status === 'pending';
                      const isSelected = selectedIds.has(row.id);
                      const hasBankAccount = !!row.farmer_bank_accounts?.id;

                      return (
                        <div
                          key={row.id}
                          className={`flex items-center gap-3 px-5 py-3 ${isSelectable ? 'hover:bg-muted/30 transition-colors' : ''}`}
                        >
                          {isSelectable ? (
                            <Checkbox checked={isSelected} onCheckedChange={() => handleToggle(row.id)} />
                          ) : (
                            <div className="w-4 shrink-0" />
                          )}

                          <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center shrink-0 text-xs font-bold text-muted-foreground">
                            {row.farmer_name.charAt(0).toUpperCase()}
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-medium text-sm truncate">{row.farmer_name}</span>
                              {row.community && (
                                <span className="text-xs text-muted-foreground">{row.community}</span>
                              )}
                              {!hasBankAccount && row.status !== 'disbursed' && (
                                <span className="text-xs text-amber-600 flex items-center gap-0.5">
                                  <AlertCircle className="h-3 w-3" />No bank
                                </span>
                              )}
                            </div>
                            <div className="text-xs text-muted-foreground mt-0.5">
                              {Number(row.weight_kg).toFixed(1)} kg &nbsp;&middot;&nbsp; {row.currency} {Number(row.price_per_kg).toFixed(2)}/kg
                            </div>
                            {row.notes && (
                              <div className="text-xs text-amber-600 mt-0.5">{row.notes}</div>
                            )}
                          </div>

                          <div className="text-right shrink-0">
                            <div className="font-semibold text-sm">
                              {row.currency} {Number(row.net_amount).toLocaleString()}
                            </div>
                            {row.deductions > 0 && (
                              <div className="text-xs text-muted-foreground">
                                &minus;{Number(row.deductions).toLocaleString()} deducted
                              </div>
                            )}
                          </div>

                          <Badge className={`text-xs shrink-0 ${statusCfg.className}`} variant="secondary">
                            <StatusIcon className="h-3 w-3 mr-1" />
                            {statusCfg.label}
                          </Badge>

                          {row.status === 'approved' && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 text-xs shrink-0 border-blue-200 text-blue-700 hover:bg-blue-50"
                              onClick={() => { setPayTarget(row); setPayDialogOpen(true); }}
                            >
                              <Banknote className="h-3.5 w-3.5 mr-1" />Pay
                            </Button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <CalculateDialog open={calcOpen} onOpenChange={setCalcOpen} onDone={fetchDisbursements} />

      <PayDialog
        open={payDialogOpen}
        onOpenChange={setPayDialogOpen}
        disbursement={payTarget}
        onPaid={fetchDisbursements}
      />

      <BulkPayDialog
        open={bulkPayOpen}
        onOpenChange={setBulkPayOpen}
        approvedRows={approvedRows}
        onDone={fetchDisbursements}
      />
    </div>
  );
}

export default DisbursementsContent;
