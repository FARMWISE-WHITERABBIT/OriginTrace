'use client';

/**
 * ContainerStuffingRecord — load tally panel for Stage 6.
 *
 * Shows a table of all items stuffed into the container with bag counts,
 * weights and lot references. Supports adding/removing line items.
 * Intended for use inside the ShipmentPipeline Stage 6 expanded section.
 */

import { useState, useEffect, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Loader2, Plus, Trash2, Package, FileDown } from 'lucide-react';

interface StuffingRecord {
  id: string;
  item_description: string;
  lot_number: string | null;
  bag_count: number;
  gross_weight_kg: string;
  net_weight_kg: string | null;
  tare_weight_kg: string | null;
  remarks: string | null;
  created_at: string;
}

interface StuffingSummary {
  total_bags: number;
  total_gross_weight_kg: number;
  total_net_weight_kg: number;
  record_count: number;
}

interface ShipmentMeta {
  shipment_code: string;
  declared_weight_kg: number;
  container_number: string | null;
  container_seal_number: string | null;
}

const EMPTY_FORM = {
  item_description: '',
  lot_number: '',
  bag_count: '',
  gross_weight_kg: '',
  net_weight_kg: '',
  tare_weight_kg: '',
  remarks: '',
};

export function ContainerStuffingRecord({ shipmentId }: { shipmentId: string }) {
  const { toast } = useToast();
  const [records, setRecords] = useState<StuffingRecord[]>([]);
  const [summary, setSummary] = useState<StuffingSummary | null>(null);
  const [shipmentMeta, setShipmentMeta] = useState<ShipmentMeta | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);

  const fetchRecords = useCallback(async () => {
    try {
      const res = await fetch(`/api/shipments/${shipmentId}/stuffing`);
      if (!res.ok) return;
      const data = await res.json();
      setRecords(data.records ?? []);
      setSummary(data.summary ?? null);
      setShipmentMeta(data.shipment ?? null);
    } catch {
      // silent
    } finally {
      setIsLoading(false);
    }
  }, [shipmentId]);

  useEffect(() => {
    fetchRecords();
  }, [fetchRecords]);

  const addRecord = async () => {
    if (!form.item_description || !form.bag_count || !form.gross_weight_kg) {
      toast({
        title: 'Missing fields',
        description: 'Item description, bag count and gross weight are required.',
        variant: 'destructive',
      });
      return;
    }
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/shipments/${shipmentId}/stuffing`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          item_description: form.item_description,
          lot_number: form.lot_number || undefined,
          bag_count: parseInt(form.bag_count, 10),
          gross_weight_kg: parseFloat(form.gross_weight_kg),
          net_weight_kg: form.net_weight_kg ? parseFloat(form.net_weight_kg) : undefined,
          tare_weight_kg: form.tare_weight_kg ? parseFloat(form.tare_weight_kg) : undefined,
          remarks: form.remarks || undefined,
        }),
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || 'Failed to add record');
      }
      toast({ title: 'Line item added' });
      setForm(EMPTY_FORM);
      setDialogOpen(false);
      fetchRecords();
    } catch (err: any) {
      toast({
        title: 'Error',
        description: err.message || 'Failed to add record',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const deleteRecord = async (recordId: string) => {
    setDeletingId(recordId);
    try {
      const res = await fetch(`/api/shipments/${shipmentId}/stuffing/${recordId}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Failed to delete');
      toast({ title: 'Record removed' });
      fetchRecords();
    } catch {
      toast({ title: 'Error', description: 'Failed to remove record', variant: 'destructive' });
    } finally {
      setDeletingId(null);
    }
  };

  const exportTally = () => {
    if (!records.length || !shipmentMeta) return;

    const rows = [
      ['Container Stuffing Tally'],
      [`Shipment: ${shipmentMeta.shipment_code}`],
      [`Container: ${shipmentMeta.container_number ?? 'Not set'}`],
      [`Seal: ${shipmentMeta.container_seal_number ?? 'Not set'}`],
      [''],
      ['#', 'Item Description', 'Lot Number', 'Bags', 'Gross Weight (kg)', 'Net Weight (kg)', 'Tare (kg)', 'Remarks'],
      ...records.map((r, i) => [
        i + 1,
        r.item_description,
        r.lot_number ?? '',
        r.bag_count,
        r.gross_weight_kg,
        r.net_weight_kg ?? '',
        r.tare_weight_kg ?? '',
        r.remarks ?? '',
      ]),
      [''],
      ['TOTALS', '', '', summary?.total_bags ?? 0, summary?.total_gross_weight_kg.toFixed(3) ?? 0, summary?.total_net_weight_kg.toFixed(3) ?? 0],
    ];

    const csv = rows.map((row) => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `stuffing-tally-${shipmentMeta.shipment_code}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 py-4 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading stuffing records…
      </div>
    );
  }

  const weightVariance =
    summary && shipmentMeta
      ? summary.total_gross_weight_kg - shipmentMeta.declared_weight_kg
      : null;

  return (
    <div className="space-y-3 pt-2">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Package className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">Load Tally</span>
          {summary && summary.record_count > 0 && (
            <Badge variant="secondary" className="text-xs">
              {summary.record_count} items · {summary.total_bags} bags ·{' '}
              {summary.total_gross_weight_kg.toLocaleString()} kg
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          {records.length > 0 && (
            <Button
              size="sm"
              variant="outline"
              onClick={exportTally}
              className="gap-1.5 h-7 text-xs"
            >
              <FileDown className="h-3.5 w-3.5" />
              Export CSV
            </Button>
          )}
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" variant="outline" className="gap-1.5 h-7 text-xs">
                <Plus className="h-3.5 w-3.5" />
                Add Item
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Stuffing Line Item</DialogTitle>
                <DialogDescription>
                  Record one item type loaded into the container.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-3 py-2">
                <div className="space-y-1.5">
                  <Label className="text-xs">Item Description *</Label>
                  <Input
                    placeholder="e.g. Cocoa Beans Grade A"
                    value={form.item_description}
                    onChange={(e) => setForm((f) => ({ ...f, item_description: e.target.value }))}
                    className="h-8 text-sm"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Lot / Mark</Label>
                    <Input
                      placeholder="e.g. LOT-001"
                      value={form.lot_number}
                      onChange={(e) => setForm((f) => ({ ...f, lot_number: e.target.value }))}
                      className="h-8 text-sm"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Number of Bags *</Label>
                    <Input
                      type="number"
                      min="0"
                      placeholder="0"
                      value={form.bag_count}
                      onChange={(e) => setForm((f) => ({ ...f, bag_count: e.target.value }))}
                      className="h-8 text-sm"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Gross Weight (kg) *</Label>
                    <Input
                      type="number"
                      min="0"
                      step="0.001"
                      placeholder="0.000"
                      value={form.gross_weight_kg}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, gross_weight_kg: e.target.value }))
                      }
                      className="h-8 text-sm"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Net Weight (kg)</Label>
                    <Input
                      type="number"
                      min="0"
                      step="0.001"
                      placeholder="0.000"
                      value={form.net_weight_kg}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, net_weight_kg: e.target.value }))
                      }
                      className="h-8 text-sm"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Tare (kg)</Label>
                    <Input
                      type="number"
                      min="0"
                      step="0.001"
                      placeholder="0.000"
                      value={form.tare_weight_kg}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, tare_weight_kg: e.target.value }))
                      }
                      className="h-8 text-sm"
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Remarks</Label>
                  <Input
                    placeholder="Optional notes"
                    value={form.remarks}
                    onChange={(e) => setForm((f) => ({ ...f, remarks: e.target.value }))}
                    className="h-8 text-sm"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={addRecord} disabled={isSubmitting}>
                  {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Add to Tally
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {records.length === 0 ? (
        <p className="text-xs text-muted-foreground py-2">
          No items recorded yet. Add items as they are loaded into the container.
        </p>
      ) : (
        <div className="rounded-md border overflow-hidden">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-muted/50">
                <th className="text-left p-2 font-medium text-muted-foreground">#</th>
                <th className="text-left p-2 font-medium text-muted-foreground">Item</th>
                <th className="text-left p-2 font-medium text-muted-foreground hidden sm:table-cell">Lot</th>
                <th className="text-right p-2 font-medium text-muted-foreground">Bags</th>
                <th className="text-right p-2 font-medium text-muted-foreground">Gross (kg)</th>
                <th className="text-right p-2 font-medium text-muted-foreground hidden sm:table-cell">Net (kg)</th>
                <th className="p-2"></th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {records.map((r, i) => (
                <tr key={r.id} className="hover:bg-muted/30">
                  <td className="p-2 text-muted-foreground">{i + 1}</td>
                  <td className="p-2 font-medium">{r.item_description}</td>
                  <td className="p-2 text-muted-foreground hidden sm:table-cell">
                    {r.lot_number ?? '—'}
                  </td>
                  <td className="p-2 text-right tabular-nums">{r.bag_count.toLocaleString()}</td>
                  <td className="p-2 text-right tabular-nums">
                    {parseFloat(r.gross_weight_kg).toLocaleString(undefined, {
                      minimumFractionDigits: 3,
                      maximumFractionDigits: 3,
                    })}
                  </td>
                  <td className="p-2 text-right tabular-nums hidden sm:table-cell">
                    {r.net_weight_kg
                      ? parseFloat(r.net_weight_kg).toLocaleString(undefined, {
                          minimumFractionDigits: 3,
                          maximumFractionDigits: 3,
                        })
                      : '—'}
                  </td>
                  <td className="p-2">
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-6 w-6 text-muted-foreground hover:text-destructive"
                      onClick={() => deleteRecord(r.id)}
                      disabled={deletingId === r.id}
                      aria-label={`Remove item ${r.item_description}`}
                    >
                      {deletingId === r.id ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Trash2 className="h-3.5 w-3.5" />
                      )}
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
            {summary && (
              <tfoot>
                <tr className="bg-muted/50 font-medium">
                  <td colSpan={3} className="p-2 hidden sm:table-cell">Totals</td>
                  <td colSpan={3} className="p-2 sm:hidden">Totals</td>
                  <td className="p-2 text-right tabular-nums">
                    {summary.total_bags.toLocaleString()}
                  </td>
                  <td className="p-2 text-right tabular-nums">
                    {summary.total_gross_weight_kg.toLocaleString(undefined, {
                      minimumFractionDigits: 3,
                      maximumFractionDigits: 3,
                    })}
                  </td>
                  <td className="p-2 text-right tabular-nums hidden sm:table-cell">
                    {summary.total_net_weight_kg > 0
                      ? summary.total_net_weight_kg.toLocaleString(undefined, {
                          minimumFractionDigits: 3,
                          maximumFractionDigits: 3,
                        })
                      : '—'}
                  </td>
                  <td className="p-2"></td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      )}

      {/* Weight variance warning */}
      {weightVariance !== null && Math.abs(weightVariance) > 50 && (
        <div className="rounded-md bg-amber-50 dark:bg-amber-950/20 p-2 text-xs text-amber-700 dark:text-amber-300">
          Tally gross weight ({summary!.total_gross_weight_kg.toLocaleString()} kg) differs from
          declared shipment weight ({shipmentMeta!.declared_weight_kg.toLocaleString()} kg) by{' '}
          {Math.abs(weightVariance).toLocaleString()} kg.
        </div>
      )}
    </div>
  );
}
