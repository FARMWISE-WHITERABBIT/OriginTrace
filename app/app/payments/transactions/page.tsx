'use client';

/**
 * /app/payments/transactions — Outbound Payments (Record & Review)
 *
 * Lets admins/coordinators record manual payments to farmers, aggregators,
 * and suppliers, and browse/filter the full outbound payment history.
 */

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useOrg } from '@/lib/contexts/org-context';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { TierGate } from '@/components/tier-gate';
import { useToast } from '@/hooks/use-toast';
import {
  Loader2,
  Plus,
  Search,
  RefreshCw,
  CheckCircle2,
  Clock,
  XCircle,
  AlertCircle,
  Banknote,
  DollarSign,
  ArrowUpFromLine,
} from 'lucide-react';

interface Payment {
  id: string;
  payee_name: string;
  payee_type: string;
  amount: number;
  currency: string;
  payment_method: string;
  reference_number: string | null;
  linked_entity_type: string | null;
  linked_entity_id: string | number | null;
  payment_date: string;
  status: string;
  notes: string | null;
  created_at: string;
}

interface Summary {
  total_paid: number;
  total_pending: number;
  count_paid: number;
  count_pending: number;
}

const STATUS_CONFIG: Record<string, { label: string; icon: React.ElementType; className: string }> = {
  completed: { label: 'Completed', icon: CheckCircle2, className: 'text-green-600 bg-green-50' },
  pending: { label: 'Pending', icon: Clock, className: 'text-amber-600 bg-amber-50' },
  failed: { label: 'Failed', icon: XCircle, className: 'text-red-600 bg-red-50' },
  cancelled: { label: 'Cancelled', icon: XCircle, className: 'text-gray-500 bg-gray-50' },
};

const PAYEE_TYPE_LABELS: Record<string, string> = {
  farmer: 'Farmer',
  aggregator: 'Aggregator',
  supplier: 'Supplier',
};

const METHOD_LABELS: Record<string, string> = {
  cash: 'Cash',
  bank_transfer: 'Bank Transfer',
  mobile_money: 'Mobile Money',
  cheque: 'Cheque',
};

// ── Record Payment Dialog ──────────────────────────────────────────────────────
function RecordPaymentDialog({
  open,
  onOpenChange,
  onRecorded,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onRecorded: () => void;
}) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [form, setForm] = useState({
    payee_name: '',
    payee_type: 'farmer',
    amount: '',
    currency: 'NGN',
    payment_method: 'cash',
    reference_number: '',
    linked_entity_type: '',
    linked_entity_id: '',
    payment_date: new Date().toISOString().split('T')[0],
    notes: '',
  });

  const setField = (key: string, value: string) => setForm((f) => ({ ...f, [key]: value }));

  const handleSubmit = async () => {
    if (!form.payee_name || !form.amount || !form.payment_method) {
      toast({ title: 'Missing fields', description: 'Fill in payee name, amount, and payment method.', variant: 'destructive' });
      return;
    }
    setIsSubmitting(true);
    try {
      const body: Record<string, unknown> = {
        payee_name: form.payee_name.trim(),
        payee_type: form.payee_type,
        amount: parseFloat(form.amount),
        currency: form.currency,
        payment_method: form.payment_method,
        payment_date: form.payment_date || new Date().toISOString().split('T')[0],
      };
      if (form.reference_number.trim()) body.reference_number = form.reference_number.trim();
      if (form.linked_entity_type) body.linked_entity_type = form.linked_entity_type;
      if (form.linked_entity_id.trim()) body.linked_entity_id = form.linked_entity_id.trim();
      if (form.notes.trim()) body.notes = form.notes.trim();

      const res = await fetch('/api/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to record payment');

      toast({ title: 'Payment recorded', description: `${form.currency} ${parseFloat(form.amount).toLocaleString()} to ${form.payee_name}` });
      onOpenChange(false);
      onRecorded();
      setForm({
        payee_name: '', payee_type: 'farmer', amount: '', currency: 'NGN',
        payment_method: 'cash', reference_number: '', linked_entity_type: '',
        linked_entity_id: '', payment_date: new Date().toISOString().split('T')[0], notes: '',
      });
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-1">
            <div className="h-10 w-10 rounded-lg icon-bg-emerald flex items-center justify-center shrink-0">
              <Banknote className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-base">Record Payment</DialogTitle>
              <DialogDescription className="text-sm mt-0.5">
                Log a manual payment to a farmer, aggregator, or supplier.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2 space-y-1.5">
              <Label className="text-xs font-medium">Payee Name *</Label>
              <Input
                placeholder="e.g. Aminu Bello"
                value={form.payee_name}
                onChange={(e) => setField('payee_name', e.target.value)}
                className="h-9"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Payee Type</Label>
              <Select value={form.payee_type} onValueChange={(v) => setField('payee_type', v)}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="farmer">Farmer</SelectItem>
                  <SelectItem value="aggregator">Aggregator</SelectItem>
                  <SelectItem value="supplier">Supplier</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Payment Method</Label>
              <Select value={form.payment_method} onValueChange={(v) => setField('payment_method', v)}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                  <SelectItem value="mobile_money">Mobile Money</SelectItem>
                  <SelectItem value="cheque">Cheque</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Amount *</Label>
              <Input
                type="number"
                placeholder="0.00"
                value={form.amount}
                onChange={(e) => setField('amount', e.target.value)}
                className="h-9"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Currency</Label>
              <Select value={form.currency} onValueChange={(v) => setField('currency', v)}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="NGN">NGN</SelectItem>
                  <SelectItem value="USD">USD</SelectItem>
                  <SelectItem value="GBP">GBP</SelectItem>
                  <SelectItem value="EUR">EUR</SelectItem>
                  <SelectItem value="XOF">XOF</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Payment Date</Label>
              <Input
                type="date"
                value={form.payment_date}
                onChange={(e) => setField('payment_date', e.target.value)}
                className="h-9"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Reference Number</Label>
              <Input
                placeholder="Optional"
                value={form.reference_number}
                onChange={(e) => setField('reference_number', e.target.value)}
                className="h-9"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Linked To</Label>
              <Select value={form.linked_entity_type} onValueChange={(v) => setField('linked_entity_type', v)}>
                <SelectTrigger className="h-9"><SelectValue placeholder="None" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="">None</SelectItem>
                  <SelectItem value="collection_batch">Batch</SelectItem>
                  <SelectItem value="contract">Contract</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {form.linked_entity_type && (
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">
                  {form.linked_entity_type === 'collection_batch' ? 'Batch ID' : 'Contract ID'}
                </Label>
                <Input
                  placeholder="ID"
                  value={form.linked_entity_id}
                  onChange={(e) => setField('linked_entity_id', e.target.value)}
                  className="h-9"
                />
              </div>
            )}

            <div className="col-span-2 space-y-1.5">
              <Label className="text-xs font-medium">Notes</Label>
              <Textarea
                placeholder="Optional notes"
                value={form.notes}
                onChange={(e) => setField('notes', e.target.value)}
                className="text-sm min-h-[60px] resize-none"
              />
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={isSubmitting} className="min-w-[140px]">
            {isSubmitting ? (
              <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Recording…</>
            ) : (
              <><Banknote className="h-4 w-4 mr-2" />Record Payment</>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Main Page Content ──────────────────────────────────────────────────────────
function TransactionsContent() {
  const { organization } = useOrg();
  const { toast } = useToast();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [recordOpen, setRecordOpen] = useState(false);

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [payeeTypeFilter, setPayeeTypeFilter] = useState('all');
  const [methodFilter, setMethodFilter] = useState('all');

  const fetchPayments = useCallback(async () => {
    if (!organization) return;
    setIsLoading(true);
    try {
      const qs = new URLSearchParams({ limit: '100' });
      if (statusFilter !== 'all') qs.set('status', statusFilter);
      if (payeeTypeFilter !== 'all') qs.set('payee_type', payeeTypeFilter);
      if (methodFilter !== 'all') qs.set('payment_method', methodFilter);
      if (search) qs.set('search', search);

      const res = await fetch(`/api/payments?${qs}`);
      if (res.ok) {
        const data = await res.json();
        const list: Payment[] = data.payments ?? [];
        setPayments(list);

        const paid = list.filter((p) => p.status === 'completed');
        const pending = list.filter((p) => p.status === 'pending');
        setSummary({
          total_paid: paid.reduce((s, p) => s + Number(p.amount), 0),
          total_pending: pending.reduce((s, p) => s + Number(p.amount), 0),
          count_paid: paid.length,
          count_pending: pending.length,
        });
      }
    } catch (err) {
      toast({ title: 'Error', description: 'Failed to load payments', variant: 'destructive' });
    }
    setIsLoading(false);
  }, [organization, statusFilter, payeeTypeFilter, methodFilter, search, toast]);

  useEffect(() => { fetchPayments(); }, [fetchPayments]);

  return (
    <div className="flex-1 space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg icon-bg-emerald flex items-center justify-center shrink-0">
            <ArrowUpFromLine className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-lg font-semibold leading-tight">Transactions</h2>
            <p className="text-sm text-muted-foreground">Record and review outbound payments</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={fetchPayments}>
            <RefreshCw className="h-4 w-4 mr-1.5" />Refresh
          </Button>
          <Button size="sm" onClick={() => setRecordOpen(true)}>
            <Plus className="h-4 w-4 mr-1.5" />Record Payment
          </Button>
        </div>
      </div>

      {/* Stats strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="card-accent-emerald">
          <CardContent className="pt-4 pb-4">
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Total Paid</p>
            <p className="text-xl font-bold mt-0.5 leading-tight">
              NGN {(summary?.total_paid ?? 0).toLocaleString()}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">{summary?.count_paid ?? 0} payments</p>
          </CardContent>
        </Card>

        <Card className="card-accent-amber">
          <CardContent className="pt-4 pb-4">
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Pending</p>
            <p className="text-xl font-bold mt-0.5 leading-tight">
              NGN {(summary?.total_pending ?? 0).toLocaleString()}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">{summary?.count_pending ?? 0} payments</p>
          </CardContent>
        </Card>

        <Card className="col-span-2">
          <CardContent className="pt-4 pb-4 flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg icon-bg-blue flex items-center justify-center shrink-0">
              <DollarSign className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">All Time Volume</p>
              <p className="text-xl font-bold mt-0.5 leading-tight">
                NGN {payments.reduce((s, p) => s + Number(p.amount), 0).toLocaleString()}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">{payments.length} total records</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Search payee or reference…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-8 pl-8 text-sm"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="h-8 w-32 text-sm"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All status</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="failed">Failed</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>
        <Select value={payeeTypeFilter} onValueChange={setPayeeTypeFilter}>
          <SelectTrigger className="h-8 w-32 text-sm"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All payees</SelectItem>
            <SelectItem value="farmer">Farmers</SelectItem>
            <SelectItem value="aggregator">Aggregators</SelectItem>
            <SelectItem value="supplier">Suppliers</SelectItem>
          </SelectContent>
        </Select>
        <Select value={methodFilter} onValueChange={setMethodFilter}>
          <SelectTrigger className="h-8 w-36 text-sm"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All methods</SelectItem>
            <SelectItem value="cash">Cash</SelectItem>
            <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
            <SelectItem value="mobile_money">Mobile Money</SelectItem>
            <SelectItem value="cheque">Cheque</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table / List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : payments.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">
            <Banknote className="h-6 w-6" />
          </div>
          <p className="font-semibold mt-3">No payments found</p>
          <p className="text-sm text-muted-foreground mt-1 max-w-xs">
            Record your first payment to farmers, aggregators, or suppliers.
          </p>
          <Button size="sm" className="mt-4" onClick={() => setRecordOpen(true)}>
            <Plus className="h-3.5 w-3.5 mr-1.5" />Record Payment
          </Button>
        </div>
      ) : (
        <Card>
          <div className="divide-y">
            {payments.map((payment) => {
              const statusCfg = STATUS_CONFIG[payment.status] ?? STATUS_CONFIG.pending;
              const StatusIcon = statusCfg.icon;
              return (
                <div key={payment.id} className="flex items-center gap-4 px-5 py-3.5 hover:bg-muted/30 transition-colors">
                  {/* Avatar */}
                  <div className="h-9 w-9 rounded-full bg-muted flex items-center justify-center shrink-0 text-xs font-bold text-muted-foreground">
                    {payment.payee_name.charAt(0).toUpperCase()}
                  </div>

                  {/* Name + meta */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-sm truncate">{payment.payee_name}</span>
                      <Badge variant="secondary" className="text-xs px-1.5 py-0">
                        {PAYEE_TYPE_LABELS[payment.payee_type] ?? payment.payee_type}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                      <span className="text-xs text-muted-foreground">
                        {METHOD_LABELS[payment.payment_method] ?? payment.payment_method}
                      </span>
                      {payment.reference_number && (
                        <span className="text-xs text-muted-foreground font-mono">
                          {payment.reference_number}
                        </span>
                      )}
                      {payment.linked_entity_type && payment.linked_entity_id && (
                        <span className="text-xs text-muted-foreground">
                          {payment.linked_entity_type === 'collection_batch' ? 'Batch' : 'Contract'} #{payment.linked_entity_id}
                        </span>
                      )}
                      <span className="text-xs text-muted-foreground">
                        {new Date(payment.payment_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </span>
                    </div>
                    {payment.notes && (
                      <p className="text-xs text-muted-foreground mt-0.5 italic truncate">{payment.notes}</p>
                    )}
                  </div>

                  {/* Amount */}
                  <div className="text-right shrink-0">
                    <div className="font-semibold text-sm">
                      {payment.currency} {Number(payment.amount).toLocaleString()}
                    </div>
                  </div>

                  {/* Status */}
                  <Badge className={`text-xs shrink-0 ${statusCfg.className}`} variant="secondary">
                    <StatusIcon className="h-3 w-3 mr-1" />
                    {statusCfg.label}
                  </Badge>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      <RecordPaymentDialog
        open={recordOpen}
        onOpenChange={setRecordOpen}
        onRecorded={fetchPayments}
      />
    </div>
  );
}

export default function TransactionsPage() {
  return (
    <TierGate feature="payments" requiredTier="basic">
      <Suspense fallback={<div className="flex items-center justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>}>
        <TransactionsContent />
      </Suspense>
    </TierGate>
  );
}
