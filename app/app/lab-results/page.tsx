'use client';

import { useEffect, useState, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
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
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  FlaskConical,
  Plus,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  Search,
  Filter,
} from 'lucide-react';

type TestType = 'aflatoxin' | 'pesticide_residue' | 'heavy_metal' | 'microbiological' | 'moisture' | 'other';
type ResultType = 'pass' | 'fail' | 'conditional';

interface LabResult {
  id: string;
  lab_provider: string;
  test_method?: string;
  test_date: string;
  test_type: TestType;
  commodity?: string;
  result: ResultType;
  result_value?: number;
  result_unit?: string;
  result_notes?: string;
  certificate_number?: string;
  certificate_expiry_date?: string;
  certificate_validity_days: number;
  mrl_flags: MrlFlag[];
  target_markets: string[];
  batch_id?: string;
  finished_good_id?: string;
  shipment_id?: string;
  created_at: string;
}

interface MrlFlag {
  market: string;
  active_ingredient: string;
  mrl_ppm: number;
  result_ppm: number | null;
  exceeded: boolean;
}

const TEST_TYPES: { value: TestType; label: string }[] = [
  { value: 'aflatoxin', label: 'Aflatoxin' },
  { value: 'pesticide_residue', label: 'Pesticide Residue' },
  { value: 'heavy_metal', label: 'Heavy Metal' },
  { value: 'microbiological', label: 'Microbiological' },
  { value: 'moisture', label: 'Moisture' },
  { value: 'other', label: 'Other' },
];

const MARKETS = ['EU', 'UK', 'US', 'China'];

function ResultBadge({ result }: { result: ResultType }) {
  if (result === 'pass') return (
    <Badge className="bg-green-100 text-green-800 border-green-200 gap-1">
      <CheckCircle className="h-3 w-3" /> Pass
    </Badge>
  );
  if (result === 'fail') return (
    <Badge className="bg-red-100 text-red-800 border-red-200 gap-1">
      <XCircle className="h-3 w-3" /> Fail
    </Badge>
  );
  return (
    <Badge className="bg-amber-100 text-amber-800 border-amber-200 gap-1">
      <AlertTriangle className="h-3 w-3" /> Conditional
    </Badge>
  );
}

function ExpiryBadge({ expiryDate }: { expiryDate?: string }) {
  if (!expiryDate) return <span className="text-muted-foreground text-xs">—</span>;
  const daysLeft = Math.ceil((new Date(expiryDate).getTime() - Date.now()) / 86400000);
  if (daysLeft < 0) return <Badge variant="destructive" className="text-xs">Expired</Badge>;
  if (daysLeft <= 30) return (
    <Badge className="bg-amber-100 text-amber-800 border-amber-200 text-xs">
      <Clock className="h-3 w-3 mr-1" />{daysLeft}d left
    </Badge>
  );
  return <span className="text-xs text-muted-foreground">{expiryDate}</span>;
}

function LabResultsPageInner() {
  const searchParams = useSearchParams();
  const prefillBatchId    = searchParams.get('batch_id') ?? '';
  const prefillShipmentId = searchParams.get('shipment_id') ?? '';

  const [results, setResults]     = useState<LabResult[]>([]);
  const [total, setTotal]         = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [filterType, setFilterType] = useState('all');
  const [filterResult, setFilterResult] = useState('all');
  const [searchText, setSearchText] = useState('');

  // Form state
  const [form, setForm] = useState({
    lab_provider:    '',
    test_method:     '',
    test_date:       new Date().toISOString().split('T')[0],
    test_type:       'aflatoxin' as TestType,
    commodity:       '',
    result:          'pass' as ResultType,
    result_value:    '',
    result_unit:     '',
    result_notes:    '',
    certificate_number:        '',
    certificate_validity_days: '90',
    batch_id:        prefillBatchId,
    shipment_id:     prefillShipmentId,
    finished_good_id: '',
    target_markets:  [] as string[],
    file_url:        '',
  });
  const [formError, setFormError] = useState('');

  const fetchResults = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({ page: '1', page_size: '50' });
      if (filterType !== 'all')   params.set('test_type', filterType);
      if (filterResult !== 'all') params.set('result', filterResult);
      if (prefillBatchId)         params.set('batch_id', prefillBatchId);
      if (prefillShipmentId)      params.set('shipment_id', prefillShipmentId);

      const res = await fetch(`/api/lab-results?${params}`);
      if (res.ok) {
        const data = await res.json();
        setResults(data.results ?? []);
        setTotal(data.total ?? 0);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  }, [filterType, filterResult, prefillBatchId, prefillShipmentId]);

  useEffect(() => { fetchResults(); }, [fetchResults]);

  const toggleMarket = (m: string) => {
    setForm((f) => ({
      ...f,
      target_markets: f.target_markets.includes(m)
        ? f.target_markets.filter((x) => x !== m)
        : [...f.target_markets, m],
    }));
  };

  const handleSubmit = async () => {
    setFormError('');
    if (!form.lab_provider) return setFormError('Lab provider is required.');
    if (!form.batch_id && !form.shipment_id && !form.finished_good_id) {
      return setFormError('At least one of Batch ID, Shipment ID, or Finished Good ID is required.');
    }
    setIsSubmitting(true);
    try {
      const body: Record<string, any> = {
        lab_provider:              form.lab_provider,
        test_method:               form.test_method || undefined,
        test_date:                 form.test_date,
        test_type:                 form.test_type,
        commodity:                 form.commodity || undefined,
        result:                    form.result,
        result_value:              form.result_value ? parseFloat(form.result_value) : undefined,
        result_unit:               form.result_unit || undefined,
        result_notes:              form.result_notes || undefined,
        certificate_number:        form.certificate_number || undefined,
        certificate_validity_days: parseInt(form.certificate_validity_days) || 90,
        batch_id:                  form.batch_id || undefined,
        shipment_id:               form.shipment_id || undefined,
        finished_good_id:          form.finished_good_id || undefined,
        target_markets:            form.target_markets,
        file_url:                  form.file_url || undefined,
      };

      const res = await fetch('/api/lab-results', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(body),
      });

      if (!res.ok) {
        const err = await res.json();
        setFormError(err.error ?? 'Upload failed.');
        return;
      }

      setDialogOpen(false);
      fetchResults();
      // Reset form
      setForm((f) => ({ ...f, lab_provider: '', certificate_number: '', result_value: '', file_url: '', result_notes: '' }));
    } finally {
      setIsSubmitting(false);
    }
  };

  const filtered = results.filter((r) => {
    if (!searchText) return true;
    const q = searchText.toLowerCase();
    return (
      r.lab_provider.toLowerCase().includes(q) ||
      (r.commodity ?? '').toLowerCase().includes(q) ||
      (r.certificate_number ?? '').toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <FlaskConical className="h-6 w-6 text-green-700" />
            Lab Results
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Lot-level laboratory test results with MRL cross-referencing
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-green-700 hover:bg-green-800">
              <Plus className="h-4 w-4 mr-2" /> Upload Lab Result
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Upload Lab Result</DialogTitle>
              <DialogDescription>
                Attach a test result to a batch, shipment, or finished good. At least one lot link is required.
              </DialogDescription>
            </DialogHeader>

            <div className="grid grid-cols-2 gap-4 py-2">
              {/* Lab info */}
              <div className="col-span-2">
                <Label>Lab Provider *</Label>
                <Input
                  placeholder="e.g. SGS, Intertek, NAFDAC Lab"
                  value={form.lab_provider}
                  onChange={(e) => setForm((f) => ({ ...f, lab_provider: e.target.value }))}
                />
              </div>
              <div>
                <Label>Test Method</Label>
                <Input
                  placeholder="e.g. HPLC, GC-MS, ELISA"
                  value={form.test_method}
                  onChange={(e) => setForm((f) => ({ ...f, test_method: e.target.value }))}
                />
              </div>
              <div>
                <Label>Test Date *</Label>
                <Input
                  type="date"
                  value={form.test_date}
                  onChange={(e) => setForm((f) => ({ ...f, test_date: e.target.value }))}
                />
              </div>
              <div>
                <Label>Test Type *</Label>
                <Select
                  value={form.test_type}
                  onValueChange={(v) => setForm((f) => ({ ...f, test_type: v as TestType }))}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {TEST_TYPES.map((t) => (
                      <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Commodity</Label>
                <Input
                  placeholder="e.g. cocoa, ginger, cashew"
                  value={form.commodity}
                  onChange={(e) => setForm((f) => ({ ...f, commodity: e.target.value }))}
                />
              </div>

              {/* Result */}
              <div>
                <Label>Result *</Label>
                <Select
                  value={form.result}
                  onValueChange={(v) => setForm((f) => ({ ...f, result: v as ResultType }))}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pass">Pass</SelectItem>
                    <SelectItem value="fail">Fail</SelectItem>
                    <SelectItem value="conditional">Conditional</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Result Value</Label>
                <div className="flex gap-2">
                  <Input
                    type="number"
                    placeholder="e.g. 0.02"
                    value={form.result_value}
                    onChange={(e) => setForm((f) => ({ ...f, result_value: e.target.value }))}
                  />
                  <Input
                    placeholder="unit (ppm, ppb)"
                    className="w-28"
                    value={form.result_unit}
                    onChange={(e) => setForm((f) => ({ ...f, result_unit: e.target.value }))}
                  />
                </div>
              </div>

              {/* Certificate */}
              <div>
                <Label>Certificate Number</Label>
                <Input
                  value={form.certificate_number}
                  onChange={(e) => setForm((f) => ({ ...f, certificate_number: e.target.value }))}
                />
              </div>
              <div>
                <Label>Certificate Validity (days)</Label>
                <Input
                  type="number"
                  value={form.certificate_validity_days}
                  onChange={(e) => setForm((f) => ({ ...f, certificate_validity_days: e.target.value }))}
                />
              </div>

              {/* Lot links */}
              <div className="col-span-2 border rounded-lg p-3 bg-muted/30">
                <p className="text-xs font-medium text-muted-foreground mb-2">LOT LINK (at least one required)</p>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <Label className="text-xs">Batch ID</Label>
                    <Input
                      className="text-xs"
                      placeholder="UUID"
                      value={form.batch_id}
                      onChange={(e) => setForm((f) => ({ ...f, batch_id: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Shipment ID</Label>
                    <Input
                      className="text-xs"
                      placeholder="UUID"
                      value={form.shipment_id}
                      onChange={(e) => setForm((f) => ({ ...f, shipment_id: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Finished Good ID</Label>
                    <Input
                      className="text-xs"
                      placeholder="UUID"
                      value={form.finished_good_id}
                      onChange={(e) => setForm((f) => ({ ...f, finished_good_id: e.target.value }))}
                    />
                  </div>
                </div>
              </div>

              {/* Target markets for MRL check */}
              <div className="col-span-2">
                <Label>Target Markets (for MRL cross-check)</Label>
                <div className="flex gap-2 mt-1">
                  {MARKETS.map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => toggleMarket(m)}
                      className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                        form.target_markets.includes(m)
                          ? 'bg-green-700 text-white border-green-700'
                          : 'bg-background text-muted-foreground border-border hover:border-green-700'
                      }`}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </div>

              {/* File */}
              <div className="col-span-2">
                <Label>File URL (optional)</Label>
                <Input
                  type="url"
                  placeholder="https://storage.example.com/lab-cert.pdf"
                  value={form.file_url}
                  onChange={(e) => setForm((f) => ({ ...f, file_url: e.target.value }))}
                />
              </div>

              {/* Notes */}
              <div className="col-span-2">
                <Label>Notes</Label>
                <textarea
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm min-h-[60px] resize-y"
                  value={form.result_notes}
                  onChange={(e) => setForm((f) => ({ ...f, result_notes: e.target.value }))}
                />
              </div>

              {formError && (
                <div className="col-span-2 text-sm text-destructive bg-destructive/10 rounded-md px-3 py-2">
                  {formError}
                </div>
              )}
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button
                className="bg-green-700 hover:bg-green-800"
                onClick={handleSubmit}
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Uploading…' : 'Upload Result'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Search lab, commodity, certificate…"
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
          />
        </div>
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-44">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Test type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All types</SelectItem>
            {TEST_TYPES.map((t) => (
              <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterResult} onValueChange={setFilterResult}>
          <SelectTrigger className="w-36">
            <SelectValue placeholder="Result" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All results</SelectItem>
            <SelectItem value="pass">Pass</SelectItem>
            <SelectItem value="fail">Fail</SelectItem>
            <SelectItem value="conditional">Conditional</SelectItem>
          </SelectContent>
        </Select>
        <span className="text-sm text-muted-foreground ml-auto">{total} result{total !== 1 ? 's' : ''}</span>
      </div>

      {/* Results table */}
      <Card className="card-accent-emerald">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-8 text-center text-muted-foreground text-sm">Loading…</div>
          ) : filtered.length === 0 ? (
            <div className="p-10 text-center">
              <FlaskConical className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
              <p className="text-muted-foreground text-sm">No lab results found.</p>
              <p className="text-xs text-muted-foreground mt-1">Upload your first lab result using the button above.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Lab Provider</TableHead>
                    <TableHead>Test Type</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Commodity</TableHead>
                    <TableHead>Result</TableHead>
                    <TableHead>Value</TableHead>
                    <TableHead>Certificate</TableHead>
                    <TableHead>Expiry</TableHead>
                    <TableHead>MRL Flags</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((r) => {
                    const exceededFlags = r.mrl_flags?.filter((f) => f.exceeded) ?? [];
                    return (
                      <TableRow key={r.id}>
                        <TableCell className="font-medium">{r.lab_provider}</TableCell>
                        <TableCell className="capitalize text-sm">{r.test_type.replace('_', ' ')}</TableCell>
                        <TableCell className="text-sm">{r.test_date}</TableCell>
                        <TableCell className="text-sm">{r.commodity ?? '—'}</TableCell>
                        <TableCell><ResultBadge result={r.result} /></TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {r.result_value != null ? `${r.result_value} ${r.result_unit ?? ''}` : '—'}
                        </TableCell>
                        <TableCell className="text-sm">{r.certificate_number ?? '—'}</TableCell>
                        <TableCell><ExpiryBadge expiryDate={r.certificate_expiry_date} /></TableCell>
                        <TableCell>
                          {exceededFlags.length > 0 ? (
                            <Badge className="bg-red-100 text-red-800 border-red-200 text-xs gap-1">
                              <AlertTriangle className="h-3 w-3" />
                              {exceededFlags.length} exceeded
                            </Badge>
                          ) : r.mrl_flags?.length > 0 ? (
                            <Badge className="bg-green-100 text-green-800 border-green-200 text-xs">
                              <CheckCircle className="h-3 w-3 mr-1" /> Within limits
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground text-xs">—</span>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}


export default function LabResultsPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-64"><div className="h-8 w-8 animate-spin rounded-full border-4 border-muted border-t-[#2E7D6B]" /></div>}>
      <LabResultsPageInner />
    </Suspense>
  );
}
