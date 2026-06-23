'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  DollarSign,
  Pencil,
  Check,
  X,
  Loader2,
  TrendingUp,
  TrendingDown,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

// ── Types ─────────────────────────────────────────────────────────────────────

interface CostSummary {
  shipment_id: string;
  usd_ngn_rate: number;
  using_fallback_rate: boolean;
  raw: {
    total_shipment_value_usd: number | null;
    freight_cost_usd: number | null;
    port_handling_charges_ngn: number | null;
    customs_fees_ngn: number | null;
    inspection_fees_ngn: number | null;
    phyto_lab_costs_ngn: number | null;
    certification_costs_ngn: number | null;
    freight_insurance_usd: number | null;
  };
  lines: {
    shipment_value_usd: number;
    freight_cost_usd: number;
    port_handling_usd: number;
    customs_fees_usd: number;
    inspection_fees_usd: number;
    phyto_lab_costs_usd: number;
    certification_costs_usd: number;
    freight_insurance_usd: number;
  };
  total_costs_usd: number;
  net_to_exporter_usd: number;
  margin_pct: number | null;
  farmer_payments: {
    total_usd: number;
    ngn_component: number;
    usd_component: number;
    payment_count: number;
  };
  company_profit_usd: number;
}

interface EditState {
  total_shipment_value_usd: string;
  freight_cost_usd: string;
  port_handling_charges_ngn: string;
  customs_fees_ngn: string;
  inspection_fees_ngn: string;
  phyto_lab_costs_ngn: string;
  certification_costs_ngn: string;
  freight_insurance_usd: string;
  usd_ngn_rate: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmt(value: number, decimals = 0): string {
  return value.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

function fmtUsd(value: number): string {
  if (value === 0) return '—';
  return `$${fmt(Math.abs(value))}`;
}

function marginColor(pct: number | null): string {
  if (pct === null) return 'text-muted-foreground';
  if (pct >= 15) return 'text-green-600 dark:text-green-400';
  if (pct >= 8) return 'text-yellow-600 dark:text-yellow-400';
  return 'text-red-600 dark:text-red-400';
}

function parseNum(s: string): number | null {
  const v = parseFloat(s.replace(/,/g, ''));
  return isNaN(v) || v < 0 ? null : v;
}

function rawToEdit(raw: CostSummary['raw'], rate: number): EditState {
  return {
    total_shipment_value_usd: raw.total_shipment_value_usd != null ? String(raw.total_shipment_value_usd) : '',
    freight_cost_usd: raw.freight_cost_usd != null ? String(raw.freight_cost_usd) : '',
    port_handling_charges_ngn: raw.port_handling_charges_ngn != null ? String(raw.port_handling_charges_ngn) : '',
    customs_fees_ngn: raw.customs_fees_ngn != null ? String(raw.customs_fees_ngn) : '',
    inspection_fees_ngn: raw.inspection_fees_ngn != null ? String(raw.inspection_fees_ngn) : '',
    phyto_lab_costs_ngn: raw.phyto_lab_costs_ngn != null ? String(raw.phyto_lab_costs_ngn) : '',
    certification_costs_ngn: raw.certification_costs_ngn != null ? String(raw.certification_costs_ngn) : '',
    freight_insurance_usd: raw.freight_insurance_usd != null ? String(raw.freight_insurance_usd) : '',
    usd_ngn_rate: rate ? String(rate) : '1650',
  };
}

// ── Live calculation from edit state ─────────────────────────────────────────

function computeLive(edit: EditState) {
  const rate = parseNum(edit.usd_ngn_rate) || 1650;
  const value = parseNum(edit.total_shipment_value_usd) ?? 0;
  const freight = parseNum(edit.freight_cost_usd) ?? 0;
  const portHandling = (parseNum(edit.port_handling_charges_ngn) ?? 0) / rate;
  const customs = (parseNum(edit.customs_fees_ngn) ?? 0) / rate;
  const inspection = (parseNum(edit.inspection_fees_ngn) ?? 0) / rate;
  const phytoLab = (parseNum(edit.phyto_lab_costs_ngn) ?? 0) / rate;
  const certification = (parseNum(edit.certification_costs_ngn) ?? 0) / rate;
  const insurance = parseNum(edit.freight_insurance_usd) ?? 0;

  const totalCosts = freight + portHandling + customs + inspection + phytoLab + certification + insurance;
  const net = value - totalCosts;
  const margin = value > 0 ? (net / value) * 100 : null;

  return { value, freight, portHandling, customs, inspection, phytoLab, certification, insurance, totalCosts, net, margin, rate };
}

// ── Component ─────────────────────────────────────────────────────────────────

interface CostTrackerProps {
  shipmentId: string;
}

export function CostTracker({ shipmentId }: CostTrackerProps) {
  const { toast } = useToast();
  const [summary, setSummary] = useState<CostSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [edit, setEdit] = useState<EditState | null>(null);

  const fetchSummary = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/shipments/${shipmentId}/cost-summary`);
      if (!res.ok) throw new Error('Failed to load');
      const data: CostSummary = await res.json();
      setSummary(data);
    } catch {
      toast({ title: 'Could not load cost summary', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  }, [shipmentId, toast]);

  useEffect(() => { fetchSummary(); }, [fetchSummary]);

  function startEdit() {
    if (!summary) return;
    setEdit(rawToEdit(summary.raw, summary.usd_ngn_rate));
    setIsEditing(true);
  }

  function cancelEdit() {
    setEdit(null);
    setIsEditing(false);
  }

  async function saveEdit() {
    if (!edit) return;
    setIsSaving(true);
    try {
      const body: Record<string, number | undefined> = {};
      const fields: (keyof EditState)[] = [
        'total_shipment_value_usd', 'freight_cost_usd', 'port_handling_charges_ngn',
        'customs_fees_ngn', 'inspection_fees_ngn', 'phyto_lab_costs_ngn',
        'certification_costs_ngn', 'freight_insurance_usd', 'usd_ngn_rate',
      ];
      for (const f of fields) {
        const v = parseNum(edit[f]);
        if (v !== null) body[f] = v;
      }

      const res = await fetch(`/api/shipments/${shipmentId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!res.ok) throw new Error('Save failed');

      await fetchSummary();
      setIsEditing(false);
      setEdit(null);
      toast({ title: 'Cost data saved' });
    } catch {
      toast({ title: 'Failed to save', variant: 'destructive' });
    } finally {
      setIsSaving(false);
    }
  }

  function setField(key: keyof EditState, value: string) {
    setEdit(prev => prev ? { ...prev, [key]: value } : prev);
  }

  // ── Render helpers ────────────────────────────────────────────────────────

  const live = edit ? computeLive(edit) : null;

  // Display values (edit mode uses live calcs; view mode uses API data)
  const D = live ?? (summary ? {
    value: summary.lines.shipment_value_usd,
    freight: summary.lines.freight_cost_usd,
    portHandling: summary.lines.port_handling_usd,
    customs: summary.lines.customs_fees_usd,
    inspection: summary.lines.inspection_fees_usd,
    phytoLab: summary.lines.phyto_lab_costs_usd,
    certification: summary.lines.certification_costs_usd,
    insurance: summary.lines.freight_insurance_usd,
    totalCosts: summary.total_costs_usd,
    net: summary.net_to_exporter_usd,
    margin: summary.margin_pct,
    rate: summary.usd_ngn_rate,
  } : null);

  const hasAnyData = summary && (
    summary.lines.shipment_value_usd > 0 ||
    summary.total_costs_usd > 0
  );

  function CostInput({ fieldKey, placeholder }: { fieldKey: keyof EditState; placeholder: string }) {
    return (
      <Input
        type="number"
        min="0"
        step="any"
        value={edit?.[fieldKey] ?? ''}
        onChange={e => setField(fieldKey, e.target.value)}
        placeholder={placeholder}
        className="h-7 w-36 text-right tabular-nums text-sm"
      />
    );
  }

  function NgnRow({
    label,
    fieldKey,
    usdValue,
    stage,
  }: {
    label: string;
    fieldKey: keyof EditState;
    usdValue: number;
    stage: string;
  }) {
    const rawNgn = edit ? parseNum(edit[fieldKey]) : null;
    const displayNgn = edit
      ? (rawNgn != null ? `₦${fmt(rawNgn)}` : '—')
      : (summary?.raw[fieldKey as keyof typeof summary.raw] != null
          ? `₦${fmt(Number(summary!.raw[fieldKey as keyof typeof summary.raw]))}`
          : '—');

    return (
      <div className="flex items-center justify-between gap-2 py-1 text-sm">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-muted-foreground truncate">{label}</span>
          <Badge variant="outline" className="text-[10px] px-1 py-0 shrink-0">{stage}</Badge>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {isEditing ? (
            <CostInput fieldKey={fieldKey} placeholder="0" />
          ) : (
            <span className="text-muted-foreground text-xs tabular-nums w-20 text-right">{displayNgn}</span>
          )}
          <span className={`tabular-nums w-28 text-right font-mono ${usdValue > 0 ? 'text-foreground' : 'text-muted-foreground/50'}`}>
            {usdValue > 0 ? `-${fmtUsd(usdValue)}` : '—'}
          </span>
        </div>
      </div>
    );
  }

  function UsdRow({
    label,
    fieldKey,
    usdValue,
    stage,
  }: {
    label: string;
    fieldKey: keyof EditState;
    usdValue: number;
    stage: string;
  }) {
    return (
      <div className="flex items-center justify-between gap-2 py-1 text-sm">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-muted-foreground truncate">{label}</span>
          <Badge variant="outline" className="text-[10px] px-1 py-0 shrink-0">{stage}</Badge>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {isEditing ? (
            <CostInput fieldKey={fieldKey} placeholder="0" />
          ) : (
            <span className="text-muted-foreground text-xs tabular-nums w-20 text-right">USD</span>
          )}
          <span className={`tabular-nums w-28 text-right font-mono ${usdValue > 0 ? 'text-foreground' : 'text-muted-foreground/50'}`}>
            {usdValue > 0 ? `-${fmtUsd(usdValue)}` : '—'}
          </span>
        </div>
      </div>
    );
  }

  // ── Main render ───────────────────────────────────────────────────────────

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Cost of Export &amp; Net Margin
            </CardTitle>
            <CardDescription>Per-shipment P&amp;L — enter costs as they are confirmed at each stage</CardDescription>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {isEditing ? (
              <>
                <Button size="sm" variant="ghost" onClick={cancelEdit} disabled={isSaving}>
                  <X className="h-3.5 w-3.5 mr-1" />Cancel
                </Button>
                <Button size="sm" onClick={saveEdit} disabled={isSaving}>
                  {isSaving ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <Check className="h-3.5 w-3.5 mr-1" />}
                  Save
                </Button>
              </>
            ) : (
              <>
                <Button size="sm" variant="ghost" onClick={fetchSummary} disabled={isLoading}>
                  <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} />
                </Button>
                <Button size="sm" variant="outline" onClick={startEdit} disabled={isLoading}>
                  <Pencil className="h-3.5 w-3.5 mr-1" />Edit Costs
                </Button>
              </>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {isLoading && !summary ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
            <Loader2 className="h-4 w-4 animate-spin" />Loading cost summary…
          </div>
        ) : !D ? null : (
          <div className="space-y-0 font-mono text-sm">

            {/* Exchange rate */}
            <div className="flex items-center justify-between gap-2 py-1.5 mb-1 text-xs text-muted-foreground border-b pb-2">
              <span>Exchange rate (NGN/USD)</span>
              <div className="flex items-center gap-2">
                {isEditing ? (
                  <Input
                    type="number"
                    min="1"
                    step="any"
                    value={edit?.usd_ngn_rate ?? ''}
                    onChange={e => setField('usd_ngn_rate', e.target.value)}
                    placeholder="1650"
                    className="h-6 w-24 text-right text-xs"
                  />
                ) : (
                  <span>₦{fmt(D.rate, 0)} = $1</span>
                )}
                {summary?.using_fallback_rate && !isEditing && (
                  <Badge variant="secondary" className="text-[10px] px-1 py-0 gap-1">
                    <AlertCircle className="h-2.5 w-2.5" />default
                  </Badge>
                )}
              </div>
            </div>

            {/* Shipment value */}
            <div className="flex items-center justify-between gap-2 py-1.5 font-semibold text-base">
              <span>SHIPMENT VALUE</span>
              <div className="flex items-center gap-2 shrink-0">
                {isEditing ? (
                  <CostInput fieldKey="total_shipment_value_usd" placeholder="0" />
                ) : null}
                <span className={`w-28 text-right ${D.value > 0 ? '' : 'text-muted-foreground/40'}`}>
                  {D.value > 0 ? `$${fmt(D.value)}` : '—'}
                </span>
              </div>
            </div>

            {/* Divider */}
            <div className="border-t my-1" />

            {/* Cost lines */}
            <UsdRow label="Freight cost" fieldKey="freight_cost_usd" usdValue={D.freight} stage="Stage 5" />
            <NgnRow label="Port handling / THC" fieldKey="port_handling_charges_ngn" usdValue={D.portHandling} stage="Stage 6" />
            <NgnRow label="Customs fees (NESS/NCS)" fieldKey="customs_fees_ngn" usdValue={D.customs} stage="Stage 4" />
            <NgnRow label="Inspection fees" fieldKey="inspection_fees_ngn" usdValue={D.inspection} stage="Stage 2" />
            <NgnRow label="Phyto / lab costs" fieldKey="phyto_lab_costs_ngn" usdValue={D.phytoLab} stage="Stage 3" />
            <NgnRow label="Certification costs" fieldKey="certification_costs_ngn" usdValue={D.certification} stage="Stage 3" />
            <UsdRow label="Freight insurance" fieldKey="freight_insurance_usd" usdValue={D.insurance} stage="Stage 5" />

            {/* NGN equiv note */}
            {!isEditing && D.totalCosts > 0 && (
              <p className="text-[10px] text-muted-foreground pt-1">NGN costs converted at ₦{fmt(D.rate)}/$ (stored per shipment)</p>
            )}
            {isEditing && (
              <p className="text-[10px] text-muted-foreground pt-1">Enter NGN costs in their original currency — USD equivalent updates live</p>
            )}

            {/* Net to exporter */}
            <div className="border-t mt-2 pt-2" />
            <div className="flex items-center justify-between gap-2 py-1.5 font-semibold text-base">
              <span>NET TO EXPORTER</span>
              <span className={`w-28 text-right ${D.value > 0 ? (D.net >= 0 ? '' : 'text-red-600') : 'text-muted-foreground/40'}`}>
                {D.value > 0 ? `$${fmt(D.net)}` : '—'}
              </span>
            </div>
            <div className="flex items-center justify-between gap-2 py-1 text-sm">
              <div className="flex items-center gap-1.5">
                {D.margin !== null && (
                  D.margin >= 0
                    ? <TrendingUp className={`h-3.5 w-3.5 ${marginColor(D.margin)}`} />
                    : <TrendingDown className="h-3.5 w-3.5 text-red-500" />
                )}
                <span className="text-muted-foreground">Margin</span>
              </div>
              <span className={`font-semibold tabular-nums w-28 text-right ${marginColor(D.margin)}`}>
                {D.margin !== null ? `${D.margin.toFixed(1)}%` : '—'}
              </span>
            </div>

            {/* Farmer payments */}
            <div className="border-t mt-2 pt-2" />
            <div className="flex items-center justify-between gap-2 py-1 text-sm">
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">Farmer payments (logged)</span>
                {(summary?.farmer_payments.payment_count ?? 0) > 0 && (
                  <Badge variant="secondary" className="text-[10px] px-1 py-0">
                    {summary!.farmer_payments.payment_count} payments
                  </Badge>
                )}
              </div>
              <span className="tabular-nums w-28 text-right font-mono text-muted-foreground">
                {(summary?.farmer_payments.total_usd ?? 0) > 0
                  ? `-$${fmt(summary!.farmer_payments.total_usd)}`
                  : '—'}
              </span>
            </div>

            {/* Company profit */}
            <div className="border-t mt-2 pt-2" />
            <div className="flex items-center justify-between gap-2 py-2 font-bold text-base">
              <span>COMPANY PROFIT</span>
              <span className={`w-28 text-right ${
                D.value <= 0
                  ? 'text-muted-foreground/40'
                  : (summary?.company_profit_usd ?? 0) >= 0
                    ? 'text-green-700 dark:text-green-400'
                    : 'text-red-600 dark:text-red-400'
              }`}>
                {D.value > 0 && summary
                  ? `$${fmt(summary.company_profit_usd)}`
                  : '—'}
              </span>
            </div>

            {/* Empty state prompt */}
            {!hasAnyData && !isEditing && (
              <div className="text-center pt-3 pb-1">
                <p className="text-xs text-muted-foreground">
                  No cost data entered yet. Click <strong>Edit Costs</strong> to start tracking margin for this shipment.
                </p>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
