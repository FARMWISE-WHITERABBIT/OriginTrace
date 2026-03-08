'use client';

import { useState, useEffect, useCallback } from 'react';
import { useOrg } from '@/lib/contexts/org-context';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { TierGate } from '@/components/tier-gate';
import { downloadCSV } from '@/lib/export/csv-export';
import {
  Loader2,
  Plus,
  Search,
  DollarSign,
  Hash,
  TrendingUp,
  Download,
  ChevronLeft,
  ChevronRight,
  Smartphone,
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
  linked_entity_id: string | null;
  payment_date: string;
  status: string;
  notes: string | null;
  created_at: string;
}

interface LinkedEntity {
  id: string;
  label: string;
}

interface PaymentSummary {
  totalAmount: number;
  totalCount: number;
  averageAmount: number;
  byCurrency: Record<string, number>;
  byPayeeType: Record<string, { total: number; count: number }>;
  byMethod: Record<string, number>;
  byMonth: Record<string, number>;
}

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

const STATUS_VARIANTS: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  completed: 'default',
  pending: 'outline',
  failed: 'destructive',
  reversed: 'secondary',
};

function formatCurrency(amount: number, currency: string): string {
  const symbols: Record<string, string> = {
    NGN: '\u20A6',
    USD: '$',
    EUR: '\u20AC',
    GBP: '\u00A3',
    XOF: 'CFA ',
  };
  const symbol = symbols[currency] || currency + ' ';
  return `${symbol}${Number(amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function escapeCSVField(value: string | number | undefined | null): string {
  const str = String(value ?? '');
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export default function PaymentsPage() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [summary, setSummary] = useState<PaymentSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSummaryLoading, setIsSummaryLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [disburseOpen, setDisburseOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [isDisbursing, setIsDisbursing] = useState(false);
  const [disburseForm, setDisburseForm] = useState({
    phone: '', amount: '', currency: 'NGN', provider: 'mtn_momo', payee_name: '', notes: '',
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [payeeTypeFilter, setPayeeTypeFilter] = useState('all');
  const [methodFilter, setMethodFilter] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

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
  const [linkedEntities, setLinkedEntities] = useState<LinkedEntity[]>([]);
  const [isLoadingEntities, setIsLoadingEntities] = useState(false);

  const { organization, isLoading: orgLoading } = useOrg();
  const { toast } = useToast();

  const fetchPayments = useCallback(async () => {
    if (orgLoading) return;
    if (!organization) {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('page', String(page));
      params.set('limit', '25');
      if (payeeTypeFilter !== 'all') params.set('payee_type', payeeTypeFilter);
      if (methodFilter !== 'all') params.set('payment_method', methodFilter);
      if (dateFrom) params.set('date_from', dateFrom);
      if (dateTo) params.set('date_to', dateTo);
      if (searchQuery) params.set('search', searchQuery);

      const response = await fetch(`/api/payments?${params.toString()}`);
      if (!response.ok) throw new Error('Failed to fetch payments');
      const data = await response.json();
      setPayments(data.payments || []);
      setTotalPages(data.totalPages || 1);
      setTotalCount(data.total || 0);
    } catch (error) {
      console.error('Failed to fetch payments:', error);
    } finally {
      setIsLoading(false);
    }
  }, [organization, orgLoading, page, payeeTypeFilter, methodFilter, dateFrom, dateTo, searchQuery]);

  const fetchSummary = useCallback(async () => {
    if (orgLoading || !organization) {
      setIsSummaryLoading(false);
      return;
    }
    try {
      const response = await fetch('/api/payments/summary');
      if (!response.ok) throw new Error('Failed to fetch summary');
      const data = await response.json();
      setSummary(data);
    } catch (error) {
      console.error('Failed to fetch payment summary:', error);
    } finally {
      setIsSummaryLoading(false);
    }
  }, [organization, orgLoading]);

  useEffect(() => {
    fetchPayments();
  }, [fetchPayments]);

  useEffect(() => {
    fetchSummary();
  }, [fetchSummary]);

  useEffect(() => {
    setPage(1);
  }, [payeeTypeFilter, methodFilter, dateFrom, dateTo, searchQuery]);

  const fetchLinkedEntities = useCallback(async (entityType: string) => {
    if (!entityType || !organization) {
      setLinkedEntities([]);
      return;
    }
    setIsLoadingEntities(true);
    try {
      if (entityType === 'collection_batch') {
        const response = await fetch('/api/batches');
        if (response.ok) {
          const data = await response.json();
          const batches = data.batches || data || [];
          setLinkedEntities(
            batches.map((b: { id: string; batch_code?: string; commodity?: string; total_weight?: number }) => ({
              id: b.id,
              label: `${b.batch_code || b.id.slice(0, 8)} — ${b.commodity || 'Unknown'} (${b.total_weight ?? 0} kg)`,
            }))
          );
        }
      } else if (entityType === 'contract') {
        const response = await fetch('/api/contracts');
        if (response.ok) {
          const data = await response.json();
          const contracts = data.contracts || data || [];
          setLinkedEntities(
            contracts.map((c: { id: string; contract_number?: string; buyer_name?: string; commodity?: string }) => ({
              id: c.id,
              label: `${c.contract_number || c.id.slice(0, 8)} — ${c.buyer_name || ''} ${c.commodity || ''}`.trim(),
            }))
          );
        }
      }
    } catch (error) {
      console.error('Failed to fetch linked entities:', error);
      setLinkedEntities([]);
    } finally {
      setIsLoadingEntities(false);
    }
  }, [organization]);

  useEffect(() => {
    fetchLinkedEntities(form.linked_entity_type);
  }, [form.linked_entity_type, fetchLinkedEntities]);

  const handleCreate = async () => {
    if (!form.payee_name || !form.amount || !form.payment_method) {
      toast({ title: 'Missing fields', description: 'Payee name, amount, and payment method are required.', variant: 'destructive' });
      return;
    }
    const amount = parseFloat(form.amount);
    if (isNaN(amount) || amount <= 0) {
      toast({ title: 'Invalid amount', description: 'Amount must be a positive number.', variant: 'destructive' });
      return;
    }

    setIsCreating(true);
    try {
      const response = await fetch('/api/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          payee_name: form.payee_name,
          payee_type: form.payee_type,
          amount,
          currency: form.currency,
          payment_method: form.payment_method,
          reference_number: form.reference_number || undefined,
          linked_entity_type: form.linked_entity_type || undefined,
          linked_entity_id: form.linked_entity_id || undefined,
          payment_date: form.payment_date || undefined,
          notes: form.notes || undefined,
        }),
      });
      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Failed to record payment');
      }
      toast({ title: 'Payment recorded', description: `Payment to ${form.payee_name} has been recorded.` });
      setDialogOpen(false);
      setForm({
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
      setLinkedEntities([]);
      fetchPayments();
      fetchSummary();
    } catch (error: unknown) {
      toast({ title: 'Error', description: error instanceof Error ? error.message : 'Failed to record payment', variant: 'destructive' });
    } finally {
      setIsCreating(false);
    }
  };

  const handleDisburse = async () => {
    setIsDisbursing(true);
    try {
      const response = await fetch('/api/payments/disburse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: disburseForm.phone,
          amount: parseFloat(disburseForm.amount),
          currency: disburseForm.currency,
          provider: disburseForm.provider,
          payee_name: disburseForm.payee_name,
          notes: disburseForm.notes || undefined,
        }),
      });
      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Disbursement failed');
      }
      const data = await response.json();
      toast({
        title: 'Disbursement Initiated',
        description: `${data.disbursement.status === 'completed' ? 'Completed' : 'Pending'} — ${data.disbursement.provider} TxID: ${data.disbursement.transactionId}`,
      });
      setDisburseOpen(false);
      setDisburseForm({ phone: '', amount: '', currency: 'NGN', provider: 'mtn_momo', payee_name: '', notes: '' });
      fetchPayments();
      fetchSummary();
    } catch (error: unknown) {
      toast({ title: 'Error', description: error instanceof Error ? error.message : 'Disbursement failed', variant: 'destructive' });
    } finally {
      setIsDisbursing(false);
    }
  };

  const handleExportCSV = () => {
    if (payments.length === 0) return;
    const headers = ['Date', 'Payee', 'Type', 'Amount', 'Currency', 'Method', 'Reference', 'Linked Entity Type', 'Linked Entity ID', 'Status'];
    const rows = payments.map(p => [
      p.payment_date,
      p.payee_name,
      PAYEE_TYPE_LABELS[p.payee_type] || p.payee_type,
      String(p.amount),
      p.currency,
      METHOD_LABELS[p.payment_method] || p.payment_method,
      p.reference_number || '',
      p.linked_entity_type || '',
      p.linked_entity_id || '',
      p.status,
    ].map(escapeCSVField).join(','));
    const csv = [headers.map(escapeCSVField).join(','), ...rows].join('\n');
    downloadCSV(csv, `payments-export-${new Date().toISOString().split('T')[0]}.csv`);
  };

  const currencyEntries = summary ? Object.entries(summary.byCurrency) : [];

  return (
    <TierGate feature="payments" requiredTier="basic" featureLabel="Payment Tracking">
      <div className="flex-1 space-y-6 p-6">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight" data-testid="text-page-title">
              Payment Tracking
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Record and track payments to farmers, aggregators, and suppliers
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Button variant="outline" onClick={handleExportCSV} disabled={payments.length === 0} data-testid="button-export-csv">
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
            <Dialog open={disburseOpen} onOpenChange={setDisburseOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" data-testid="button-disburse">
                  <Smartphone className="h-4 w-4 mr-2" />
                  Disburse
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Mobile Money Disbursement</DialogTitle>
                  <DialogDescription>Send payment directly to a farmer's mobile money wallet.</DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label>Payee Name</Label>
                    <Input placeholder="Farmer name" value={disburseForm.payee_name} onChange={e => setDisburseForm(f => ({ ...f, payee_name: e.target.value }))} data-testid="input-disburse-name" />
                  </div>
                  <div className="space-y-2">
                    <Label>Phone Number</Label>
                    <Input placeholder="+2348012345678" value={disburseForm.phone} onChange={e => setDisburseForm(f => ({ ...f, phone: e.target.value }))} data-testid="input-disburse-phone" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label>Amount</Label>
                      <Input type="number" placeholder="0" value={disburseForm.amount} onChange={e => setDisburseForm(f => ({ ...f, amount: e.target.value }))} data-testid="input-disburse-amount" />
                    </div>
                    <div className="space-y-2">
                      <Label>Currency</Label>
                      <Select value={disburseForm.currency} onValueChange={v => setDisburseForm(f => ({ ...f, currency: v }))}>
                        <SelectTrigger data-testid="select-disburse-currency"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="NGN">NGN</SelectItem>
                          <SelectItem value="GHS">GHS</SelectItem>
                          <SelectItem value="XOF">XOF</SelectItem>
                          <SelectItem value="USD">USD</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Provider</Label>
                    <Select value={disburseForm.provider} onValueChange={v => setDisburseForm(f => ({ ...f, provider: v }))}>
                      <SelectTrigger data-testid="select-disburse-provider"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="mtn_momo">MTN MoMo</SelectItem>
                        <SelectItem value="opay">OPay</SelectItem>
                        <SelectItem value="palmpay">PalmPay</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Notes (optional)</Label>
                    <Input placeholder="Payment for cocoa delivery" value={disburseForm.notes} onChange={e => setDisburseForm(f => ({ ...f, notes: e.target.value }))} data-testid="input-disburse-notes" />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setDisburseOpen(false)}>Cancel</Button>
                  <Button onClick={handleDisburse} disabled={isDisbursing || !disburseForm.phone || !disburseForm.amount || !disburseForm.payee_name} data-testid="button-send-disbursement">
                    {isDisbursing ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Sending...</> : 'Send Payment'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button data-testid="button-record-payment">
                  <Plus className="h-4 w-4 mr-2" />
                  Record Payment
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg">
                <DialogHeader>
                  <DialogTitle>Record Payment</DialogTitle>
                  <DialogDescription>
                    Record a new payment to a farmer, aggregator, or supplier.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="payee_name">Payee Name</Label>
                    <Input
                      id="payee_name"
                      placeholder="Enter payee name"
                      value={form.payee_name}
                      onChange={e => setForm(f => ({ ...f, payee_name: e.target.value }))}
                      data-testid="input-payee-name"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="payee_type">Payee Type</Label>
                      <Select value={form.payee_type} onValueChange={v => setForm(f => ({ ...f, payee_type: v }))}>
                        <SelectTrigger data-testid="select-payee-type-form">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="farmer">Farmer</SelectItem>
                          <SelectItem value="aggregator">Aggregator</SelectItem>
                          <SelectItem value="supplier">Supplier</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="currency">Currency</Label>
                      <Select value={form.currency} onValueChange={v => setForm(f => ({ ...f, currency: v }))}>
                        <SelectTrigger data-testid="select-currency-form">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="NGN">NGN (Naira)</SelectItem>
                          <SelectItem value="USD">USD (Dollar)</SelectItem>
                          <SelectItem value="EUR">EUR (Euro)</SelectItem>
                          <SelectItem value="GBP">GBP (Pound)</SelectItem>
                          <SelectItem value="XOF">XOF (CFA Franc)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="amount">Amount</Label>
                      <Input
                        id="amount"
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="0.00"
                        value={form.amount}
                        onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
                        data-testid="input-amount"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="payment_method">Payment Method</Label>
                      <Select value={form.payment_method} onValueChange={v => setForm(f => ({ ...f, payment_method: v }))}>
                        <SelectTrigger data-testid="select-payment-method-form">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="cash">Cash</SelectItem>
                          <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                          <SelectItem value="mobile_money">Mobile Money</SelectItem>
                          <SelectItem value="cheque">Cheque</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="reference_number">Reference Number</Label>
                      <Input
                        id="reference_number"
                        placeholder="Optional"
                        value={form.reference_number}
                        onChange={e => setForm(f => ({ ...f, reference_number: e.target.value }))}
                        data-testid="input-reference-number"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="payment_date">Payment Date</Label>
                      <Input
                        id="payment_date"
                        type="date"
                        value={form.payment_date}
                        onChange={e => setForm(f => ({ ...f, payment_date: e.target.value }))}
                        data-testid="input-payment-date"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="linked_entity_type">Link to Entity</Label>
                      <Select
                        value={form.linked_entity_type || 'none'}
                        onValueChange={v => setForm(f => ({ ...f, linked_entity_type: v === 'none' ? '' : v, linked_entity_id: '' }))}
                      >
                        <SelectTrigger data-testid="select-linked-entity-type">
                          <SelectValue placeholder="None" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">None</SelectItem>
                          <SelectItem value="collection_batch">Collection Batch</SelectItem>
                          <SelectItem value="contract">Contract</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="linked_entity_id">
                        {form.linked_entity_type === 'collection_batch' ? 'Select Batch' : form.linked_entity_type === 'contract' ? 'Select Contract' : 'Select Entity'}
                      </Label>
                      <Select
                        value={form.linked_entity_id || 'none'}
                        onValueChange={v => setForm(f => ({ ...f, linked_entity_id: v === 'none' ? '' : v }))}
                        disabled={!form.linked_entity_type || isLoadingEntities}
                      >
                        <SelectTrigger data-testid="select-linked-entity-id">
                          <SelectValue placeholder={isLoadingEntities ? 'Loading...' : !form.linked_entity_type ? 'Select type first' : 'Select entity'} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">None</SelectItem>
                          {linkedEntities.map(entity => (
                            <SelectItem key={entity.id} value={entity.id}>
                              {entity.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="notes">Notes</Label>
                    <Textarea
                      id="notes"
                      placeholder="Optional notes"
                      value={form.notes}
                      onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                      data-testid="input-notes"
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setDialogOpen(false)} data-testid="button-cancel-payment">
                    Cancel
                  </Button>
                  <Button onClick={handleCreate} disabled={isCreating} data-testid="button-confirm-payment">
                    {isCreating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    Record Payment
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {isSummaryLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[1, 2, 3].map(i => (
              <Card key={i}>
                <CardContent className="pt-4 pb-4">
                  <div className="h-16 flex items-center justify-center">
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : summary ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="pt-4 pb-4">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-md bg-green-500/10 flex items-center justify-center">
                    <DollarSign className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    {currencyEntries.length > 0 ? (
                      <div data-testid="text-total-paid">
                        {currencyEntries.map(([cur, amt]) => (
                          <p key={cur} className="text-lg font-bold">
                            {formatCurrency(amt, cur)}
                          </p>
                        ))}
                      </div>
                    ) : (
                      <p className="text-lg font-bold" data-testid="text-total-paid">
                        {formatCurrency(0, 'NGN')}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground">Total Paid</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 pb-4">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-md bg-muted flex items-center justify-center">
                    <Hash className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold" data-testid="text-payment-count">{summary.totalCount}</p>
                    <p className="text-xs text-muted-foreground">Payment Count</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 pb-4">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-md bg-blue-500/10 flex items-center justify-center">
                    <TrendingUp className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-lg font-bold" data-testid="text-average-amount">
                      {formatCurrency(summary.averageAmount, currencyEntries.length === 1 ? currencyEntries[0][0] : 'NGN')}
                    </p>
                    <p className="text-xs text-muted-foreground">Average Payment</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        ) : null}

        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by payee name..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="pl-9"
              data-testid="input-search-payments"
            />
          </div>
          <Select value={payeeTypeFilter} onValueChange={setPayeeTypeFilter}>
            <SelectTrigger className="w-[150px]" data-testid="select-payee-type-filter">
              <SelectValue placeholder="All Types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="farmer">Farmer</SelectItem>
              <SelectItem value="aggregator">Aggregator</SelectItem>
              <SelectItem value="supplier">Supplier</SelectItem>
            </SelectContent>
          </Select>
          <Select value={methodFilter} onValueChange={setMethodFilter}>
            <SelectTrigger className="w-[160px]" data-testid="select-method-filter">
              <SelectValue placeholder="All Methods" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Methods</SelectItem>
              <SelectItem value="cash">Cash</SelectItem>
              <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
              <SelectItem value="mobile_money">Mobile Money</SelectItem>
              <SelectItem value="cheque">Cheque</SelectItem>
            </SelectContent>
          </Select>
          <Input
            type="date"
            value={dateFrom}
            onChange={e => setDateFrom(e.target.value)}
            className="w-[150px]"
            data-testid="input-date-from"
          />
          <Input
            type="date"
            value={dateTo}
            onChange={e => setDateTo(e.target.value)}
            className="w-[150px]"
            data-testid="input-date-to"
          />
        </div>

        {isLoading || orgLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : payments.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16 text-center">
              <DollarSign className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-1">No payments recorded</h3>
              <p className="text-sm text-muted-foreground mb-4 max-w-md">
                Record your first payment to start tracking transactions with farmers, aggregators, and suppliers.
              </p>
              <Button onClick={() => setDialogOpen(true)} data-testid="button-record-first-payment">
                <Plus className="h-4 w-4 mr-2" />
                Record First Payment
              </Button>
            </CardContent>
          </Card>
        ) : (
          <>
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Payee</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead>Currency</TableHead>
                      <TableHead>Method</TableHead>
                      <TableHead>Reference</TableHead>
                      <TableHead>Linked To</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {payments.map(payment => (
                      <TableRow key={payment.id} data-testid={`row-payment-${payment.id}`}>
                        <TableCell className="whitespace-nowrap" data-testid={`text-date-${payment.id}`}>
                          {payment.payment_date}
                        </TableCell>
                        <TableCell data-testid={`text-payee-${payment.id}`}>
                          {payment.payee_name}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" data-testid={`badge-type-${payment.id}`}>
                            {PAYEE_TYPE_LABELS[payment.payee_type] || payment.payee_type}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right font-mono" data-testid={`text-amount-${payment.id}`}>
                          {formatCurrency(payment.amount, payment.currency)}
                        </TableCell>
                        <TableCell data-testid={`text-currency-${payment.id}`}>
                          {payment.currency}
                        </TableCell>
                        <TableCell data-testid={`text-method-${payment.id}`}>
                          {METHOD_LABELS[payment.payment_method] || payment.payment_method}
                        </TableCell>
                        <TableCell className="font-mono text-sm" data-testid={`text-reference-${payment.id}`}>
                          {payment.reference_number || '-'}
                        </TableCell>
                        <TableCell data-testid={`text-linked-entity-${payment.id}`}>
                          {payment.linked_entity_type ? (
                            <Badge variant="outline">
                              {payment.linked_entity_type === 'collection_batch' ? 'Batch' : 'Contract'}
                            </Badge>
                          ) : '-'}
                        </TableCell>
                        <TableCell>
                          <Badge variant={STATUS_VARIANTS[payment.status] || 'outline'} data-testid={`badge-status-${payment.id}`}>
                            {payment.status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            <div className="flex items-center justify-between gap-4 flex-wrap">
              <p className="text-sm text-muted-foreground" data-testid="text-pagination-info">
                Showing {((page - 1) * 25) + 1}-{Math.min(page * 25, totalCount)} of {totalCount} payments
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  data-testid="button-prev-page"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-sm text-muted-foreground" data-testid="text-current-page">
                  Page {page} of {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                  data-testid="button-next-page"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </>
        )}
      </div>
    </TierGate>
  );
}
