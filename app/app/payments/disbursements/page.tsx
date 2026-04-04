'use client';

/**
 * Bulk Disbursement Approval Page
 *
 * Lists disbursement_calculations grouped by batch.
 * Admin can select rows, approve in bulk, then pay one-by-one or all at once.
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
  Users,
  Scale,
  ArrowRight,
  AlertCircle,
  CreditCard,
  Banknote,
  RefreshCw,
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
  const [provider, setProvider] = useState('paystack_transfer');
  const [phone, setPhone] = useState('');
  const [isPaying, setIsPaying] = useState(false);

  if (!disbursement) return null;

  const hasBankAccount = !!disbursement.farmer_bank_accounts?.id;

  const handlePay = async () => {
    setIsPaying(true);
    try {
      const res = await fetch(`/api/disbursements/${disbursement.id}/pay`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider,
          phone: ['mtn_momo', 'opay', 'palmpay'].includes(provider) ? phone : undefined,
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

  const isMoMo = ['mtn_momo', 'opay', 'palmpay'].includes(provider);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Pay {disbursement.farmer_name}</DialogTitle>
          <DialogDescription>
            {disbursement.currency} {Number(disbursement.net_amount).toLocaleString()} for {Number(disbursement.weight_kg).toFixed(1)} kg
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label className="text-xs">Payment Method</Label>
            <Select value={provider} onValueChange={setProvider}>
              <SelectTrigger className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="paystack_transfer" disabled={!hasBankAccount}>
                  Bank Transfer (Paystack){!hasBankAccount && ' — no bank account on file'}
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
              <Label className="text-xs">Phone Number</Label>
              <Input
                placeholder="+234..."
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="h-9"
              />
            </div>
          )}

          {hasBankAccount && provider === 'paystack_transfer' && (
            <div className="rounded-md bg-muted/50 p-3 text-xs space-y-0.5">
              <div className="font-medium">{disbursement.farmer_bank_accounts?.account_name}</div>
              <div className="text-muted-foreground">{disbursement.farmer_bank_accounts?.bank_name}</div>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button
            onClick={handlePay}
            disabled={isPaying || (isMoMo && !phone)}
          >
            {isPaying && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Send Payment
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

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

  const fetchDisbursements = useCallback(async () => {
    if (!organization) return;
    setIsLoading(true);
    try {
      const qs = new URLSearchParams({ limit: '100' });
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
    if (checked) {
      setSelectedIds(new Set(pendingRows.map((d) => d.id)));
    } else {
      setSelectedIds(new Set());
    }
  };

  const handleToggle = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
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
        <div>
          <p className="text-sm text-muted-foreground">
            Review, approve, and execute payments to farmers and aggregators
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={fetchDisbursements}>
            <RefreshCw className="h-4 w-4 mr-1.5" />
            Refresh
          </Button>
          {selectedPendingIds.length > 0 && (
            <Button
              size="sm"
              onClick={handleApproveSelected}
              disabled={isApproving}
            >
              {isApproving && <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />}
              Approve {selectedPendingIds.length} Selected
            </Button>
          )}
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Pending</p>
                <p className="text-xl font-bold mt-0.5">NGN {totalPending.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">{pendingRows.length} farmers</p>
              </div>
              <Clock className="h-8 w-8 text-amber-500 opacity-60" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Approved</p>
                <p className="text-xl font-bold mt-0.5">NGN {totalApproved.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">{approvedRows.length} farmers</p>
              </div>
              <CheckCircle2 className="h-8 w-8 text-blue-500 opacity-60" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Disbursed</p>
                <p className="text-xl font-bold mt-0.5">NGN {totalDisbursed.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">{disbursedRows.length} farmers</p>
              </div>
              <DollarSign className="h-8 w-8 text-green-500 opacity-60" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="h-8 w-36 text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="disbursed">Disbursed</SelectItem>
            <SelectItem value="failed">Failed</SelectItem>
          </SelectContent>
        </Select>

        <Input
          placeholder="Filter by batch ID"
          value={batchIdFilter}
          onChange={(e) => setBatchIdFilter(e.target.value)}
          className="h-8 w-40 text-sm"
        />

        {pendingRows.length > 0 && (
          <div className="flex items-center gap-2 ml-auto">
            <Checkbox
              id="select-all"
              checked={selectedIds.size > 0 && selectedIds.size === pendingRows.length}
              onCheckedChange={handleSelectAll}
            />
            <label htmlFor="select-all" className="text-sm cursor-pointer">
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
        <Card>
          <CardContent className="py-12 text-center">
            <DollarSign className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
            <p className="font-medium">No disbursements found</p>
            <p className="text-sm text-muted-foreground mt-1">
              Dispatch a batch to automatically compute farmer disbursements, or use the API to trigger computation.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {[...byBatch.entries()].map(([batchId, rows]) => {
            const batchCode = rows[0]?.collection_batches?.batch_code ?? `Batch #${batchId}`;
            const commodity = rows[0]?.collection_batches?.commodity ?? '-';
            const batchTotal = rows.reduce((s, r) => s + Number(r.net_amount), 0);
            const currency = rows[0]?.currency ?? 'NGN';

            return (
              <Card key={batchId}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <CardTitle className="text-sm font-mono">{batchCode}</CardTitle>
                      <CardDescription className="text-xs">
                        {commodity} · {rows.length} farmers · {currency} {batchTotal.toLocaleString()} total
                      </CardDescription>
                    </div>
                    <Link href={`/app/inventory/${batchId}`}>
                      <Button size="sm" variant="ghost" className="h-7 text-xs">
                        View Batch <ArrowRight className="h-3 w-3 ml-1" />
                      </Button>
                    </Link>
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
                          className={`flex items-center gap-3 px-6 py-3 ${isSelectable ? 'hover:bg-muted/30' : ''}`}
                        >
                          {isSelectable ? (
                            <Checkbox
                              checked={isSelected}
                              onCheckedChange={() => handleToggle(row.id)}
                            />
                          ) : (
                            <div className="w-4" />
                          )}

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-sm truncate">{row.farmer_name}</span>
                              {row.community && (
                                <span className="text-xs text-muted-foreground">· {row.community}</span>
                              )}
                              {!hasBankAccount && row.status !== 'disbursed' && (
                                <span className="text-xs text-amber-600 flex items-center gap-0.5">
                                  <AlertCircle className="h-3 w-3" />
                                  No bank
                                </span>
                              )}
                            </div>
                            <div className="text-xs text-muted-foreground mt-0.5">
                              {Number(row.weight_kg).toFixed(1)} kg · {row.currency} {Number(row.price_per_kg).toFixed(2)}/kg
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
                                −{Number(row.deductions).toLocaleString()} deducted
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
                              className="h-7 text-xs shrink-0"
                              onClick={() => {
                                setPayTarget(row);
                                setPayDialogOpen(true);
                              }}
                            >
                              <Banknote className="h-3.5 w-3.5 mr-1" />
                              Pay
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

      <PayDialog
        open={payDialogOpen}
        onOpenChange={setPayDialogOpen}
        disbursement={payTarget}
        onPaid={fetchDisbursements}
      />
    </div>
  );
}

export default DisbursementsContent;
