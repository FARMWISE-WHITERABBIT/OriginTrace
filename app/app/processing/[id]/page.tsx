'use client';

import { use, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { useOrg } from '@/lib/contexts/org-context';
import { useToast } from '@/hooks/use-toast';
import {
  ArrowLeft, Factory, CheckCircle2, AlertTriangle, Package,
  Loader2, MapPin, Calendar, Scale, Boxes, ArrowRight,
  QrCode, Layers, Pencil, X, Save, Ship,
} from 'lucide-react';
import { AddToShipmentDialog } from '@/components/shipments/add-to-shipment-dialog';

interface ProcessingRunDetail {
  id: string;
  run_code: string;
  facility_name: string;
  facility_location: string;
  commodity: string;
  product_type: string;
  input_weight_kg: number;
  output_weight_kg: number;
  recovery_rate: number;
  standard_recovery_rate: number;
  mass_balance_valid: boolean;
  mass_balance_variance: number | null;
  processed_at: string;
  notes: string | null;
  created_at: string;
}

interface SourceBatch {
  id: string;
  batch_code: string;
  commodity: string;
  total_weight: number;
  weight_contribution_kg: number;
  farm_name?: string;
  community?: string;
  collected_at?: string;
  status?: string;
}

interface FinishedGood {
  id: string;
  pedigree_code: string;
  product_name: string;
  product_type: string;
  weight_kg: number;
  destination_country: string;
  buyer_company: string;
  pedigree_verified: boolean;
  production_date: string;
}

interface DPP {
  id: string;
  dpp_code: string;
  status: string;
}

export default function ProcessingRunDetailPage({ params: paramsPromise }: { params: Promise<{ id: string }> }) {
  const { id } = use(paramsPromise);
  const router = useRouter();
  const { profile } = useOrg();
  const { toast } = useToast();
  const isAdmin = profile?.role === 'admin' || profile?.role === 'aggregator' || profile?.role === 'compliance_officer';

  const [run, setRun] = useState<ProcessingRunDetail | null>(null);
  const [batches, setBatches] = useState<SourceBatch[]>([]);
  const [finishedGoods, setFinishedGoods] = useState<FinishedGood[]>([]);
  const [dpps, setDpps] = useState<DPP[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editForm, setEditForm] = useState({ facility_name: '', facility_location: '', notes: '' });
  const [addToShipmentOpen, setAddToShipmentOpen] = useState(false);

  const startEdit = () => {
    if (!run) return;
    setEditForm({ facility_name: run.facility_name, facility_location: run.facility_location || '', notes: run.notes || '' });
    setEditing(true);
  };

  const cancelEdit = () => setEditing(false);

  const saveEdit = async () => {
    if (!run) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/processing-runs/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm),
      });
      if (!res.ok) throw new Error('Save failed');
      setRun(r => r ? { ...r, ...editForm } : r);
      setEditing(false);
      toast({ title: 'Saved', description: 'Processing run updated.' });
    } catch {
      toast({ title: 'Error', description: 'Failed to save changes.', variant: 'destructive' });
    } finally { setSaving(false); }
  };

  useEffect(() => {
    async function load() {
      try {
        // Fetch run detail
        const runRes = await fetch(`/api/processing-runs/${id}`);
        if (!runRes.ok) { router.push('/app/processing'); return; }
        const runData = await runRes.json();
        setRun(runData.run);
        setBatches(runData.source_batches || []);
        setFinishedGoods(runData.finished_goods || []);
        setDpps(runData.dpps || []);
      } catch {
        router.push('/app/processing');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id, router]);

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
    </div>
  );

  if (!run) return null;

  const recovery = run.recovery_rate ?? 0;
  const standard = run.standard_recovery_rate ?? 41.6;
  const variance = run.mass_balance_variance ?? Math.abs(recovery - standard);
  const recoveryPct = Math.min(100, (recovery / Math.max(standard, 1)) * 100);

  return (
    <div className="space-y-6 max-w-5xl">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <Link href="/app/processing">
            <Button variant="ghost" size="icon" className="h-8 w-8 mt-0.5" aria-label="Back to processing">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl font-bold tracking-tight font-mono">{run.run_code}</h1>
              {run.mass_balance_valid ? (
                <Badge className="bg-green-500/10 text-green-700 dark:text-green-400 border-green-200">
                  <CheckCircle2 className="h-3 w-3 mr-1" />Mass Balance Valid
                </Badge>
              ) : (
                <Badge variant="destructive">
                  <AlertTriangle className="h-3 w-3 mr-1" />Mass Balance Warning
                </Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground mt-1 flex items-center gap-1">
              <Factory className="h-3.5 w-3.5" />{run.facility_name}
              {run.facility_location && <><span className="mx-1">·</span><MapPin className="h-3.5 w-3.5" />{run.facility_location}</>}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap shrink-0">
          {finishedGoods.length === 0 && (
            <Link href={`/app/pedigree?processing_run_id=${run.id}`}>
              <Button size="sm">
                <Package className="h-3.5 w-3.5 mr-1.5" />Create Finished Good
              </Button>
            </Link>
          )}
        </div>
      </div>

      {/* Stats strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Input Weight',   value: `${run.input_weight_kg?.toLocaleString()} kg`,  icon: Boxes },
          { label: 'Output Weight',  value: `${run.output_weight_kg?.toLocaleString()} kg`, icon: Scale },
          { label: 'Recovery Rate',  value: `${recovery?.toFixed(1)}%`,                     icon: ArrowRight },
          { label: 'Source Batches', value: batches.length,                                  icon: Layers },
        ].map(({ label, value, icon: Icon }) => (
          <Card key={label} className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <Icon className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">{label}</span>
            </div>
            <p className="text-lg font-bold">{value}</p>
          </Card>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-4">

        {/* Mass Balance Card */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Scale className="h-4 w-4" />Mass Balance Analysis
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Recovery vs Standard</span>
                <span className="font-medium">{recovery?.toFixed(1)}% / {standard?.toFixed(1)}%</span>
              </div>
              <Progress value={recoveryPct} className="h-2" />
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="p-3 rounded-lg bg-muted/40">
                <p className="text-xs text-muted-foreground">Input</p>
                <p className="font-bold text-base">{run.input_weight_kg?.toLocaleString()} kg</p>
              </div>
              <div className="p-3 rounded-lg bg-muted/40">
                <p className="text-xs text-muted-foreground">Output</p>
                <p className="font-bold text-base">{run.output_weight_kg?.toLocaleString()} kg</p>
              </div>
              <div className="p-3 rounded-lg bg-muted/40">
                <p className="text-xs text-muted-foreground">Variance</p>
                <p className={`font-bold text-base ${Math.abs(variance) > 10 ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}>
                  {variance > 0 ? '+' : ''}{variance?.toFixed(1)}%
                </p>
              </div>
              <div className="p-3 rounded-lg bg-muted/40">
                <p className="text-xs text-muted-foreground">Status</p>
                <p className={`font-bold text-sm ${run.mass_balance_valid ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                  {run.mass_balance_valid ? 'Valid ✓' : 'Warning ✗'}
                </p>
              </div>
            </div>
            {!run.mass_balance_valid && (
              <div className="p-3 rounded-lg bg-red-500/5 border border-red-200 dark:border-red-900 text-sm text-red-700 dark:text-red-400">
                Recovery rate of {recovery?.toFixed(1)}% is outside the acceptable range for {run.commodity} ({standard?.toFixed(1)}% standard). This batch cannot be used for shipments until resolved.
              </div>
            )}
          </CardContent>
        </Card>

        {/* Facility & Info */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <Factory className="h-4 w-4" />Run Details
              </CardTitle>
              {isAdmin && !editing && (
                <Button size="sm" variant="ghost" className="h-7 gap-1.5 text-xs" onClick={startEdit}>
                  <Pencil className="h-3 w-3" />Edit
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {editing ? (
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label htmlFor="edit-facility">Facility Name</Label>
                  <Input id="edit-facility" value={editForm.facility_name} onChange={e => setEditForm(f => ({ ...f, facility_name: e.target.value }))} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="edit-location">Location</Label>
                  <Input id="edit-location" value={editForm.facility_location} onChange={e => setEditForm(f => ({ ...f, facility_location: e.target.value }))} placeholder="City, State" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="edit-notes">Notes</Label>
                  <Textarea id="edit-notes" value={editForm.notes} onChange={e => setEditForm(f => ({ ...f, notes: e.target.value }))} rows={3} placeholder="Optional notes about this run" />
                </div>
                <div className="flex gap-2 pt-1">
                  <Button size="sm" onClick={saveEdit} disabled={saving} className="gap-1.5">
                    {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}Save
                  </Button>
                  <Button size="sm" variant="ghost" onClick={cancelEdit} disabled={saving} className="gap-1.5">
                    <X className="h-3 w-3" />Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <>
                {[
                  { label: 'Facility',     value: run.facility_name },
                  { label: 'Location',     value: run.facility_location },
                  { label: 'Commodity',    value: run.commodity },
                  { label: 'Product Type', value: run.product_type?.replace(/_/g, ' ') },
                  { label: 'Processed',    value: run.processed_at ? new Date(run.processed_at).toLocaleDateString('en-NG', { day: 'numeric', month: 'long', year: 'numeric' }) : '—' },
                  { label: 'Created',      value: new Date(run.created_at).toLocaleDateString('en-NG', { day: 'numeric', month: 'long', year: 'numeric' }) },
                ].map(({ label, value }) => (
                  <div key={label} className="flex items-center justify-between py-2.5 border-b border-border last:border-0 text-sm">
                    <span className="text-muted-foreground">{label}</span>
                    <span className="font-medium capitalize">{value || '—'}</span>
                  </div>
                ))}
                {run.notes && (
                  <div className="mt-3 p-3 rounded-lg bg-muted/40 text-sm text-muted-foreground italic">
                    {run.notes}
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Source Batches */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Layers className="h-4 w-4" />Source Collection Batches
          </CardTitle>
          <CardDescription>Raw material batches that were processed in this run</CardDescription>
        </CardHeader>
        <CardContent>
          {batches.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">No source batches linked to this run.</p>
          ) : (
            <div className="space-y-2">
              {batches.map(b => (
                <Link key={b.id} href={`/app/inventory/${b.id}`} className="block group">
                  <div className="flex items-center justify-between p-3 rounded-lg border border-border hover:border-primary/40 hover:bg-muted/30 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-md bg-primary/10 flex items-center justify-center shrink-0">
                        <Package className="h-4 w-4 text-primary" />
                      </div>
                      <div>
                        <p className="text-sm font-mono font-medium group-hover:text-primary transition-colors">{b.batch_code || b.id.slice(0, 8)}</p>
                        <p className="text-xs text-muted-foreground">{b.community || b.commodity} · {Number(b.total_weight).toLocaleString()} kg total</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold">{Number(b.weight_contribution_kg).toLocaleString()} kg</p>
                      <p className="text-xs text-muted-foreground">contributed</p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Finished Goods Output */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <Package className="h-4 w-4" />Finished Goods Output
              </CardTitle>
              <CardDescription>Export-ready products produced from this run</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              {finishedGoods.length > 0 && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setAddToShipmentOpen(true)}
                  className="gap-1.5"
                >
                  <Ship className="h-3.5 w-3.5" />
                  Add to Shipment
                </Button>
              )}
              {finishedGoods.length === 0 && (
                <Link href={`/app/pedigree?processing_run_id=${run.id}`}>
                  <Button size="sm" variant="outline">
                    <Package className="h-3.5 w-3.5 mr-1.5" />Create
                  </Button>
                </Link>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {finishedGoods.length === 0 ? (
            <div className="text-center py-8">
              <Package className="h-10 w-10 mx-auto mb-3 text-muted-foreground opacity-30" />
              <p className="font-medium text-sm">No finished goods yet</p>
              <p className="text-xs text-muted-foreground mt-1 mb-4">Create a finished good record from this processing run to assign a pedigree code and generate a DPP.</p>
              <Link href={`/app/pedigree?processing_run_id=${run.id}`}>
                <Button size="sm"><Package className="h-3.5 w-3.5 mr-1.5" />Create Finished Good</Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-2">
              {finishedGoods.map(fg => {
                const linkedDpp = dpps.find(d => true); // first DPP is linked
                return (
                  <div key={fg.id} className="flex items-center justify-between p-3 rounded-lg border border-border bg-muted/20">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-md bg-green-500/10 flex items-center justify-center shrink-0">
                        <Package className="h-4 w-4 text-green-600 dark:text-green-400" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">{fg.product_name}</p>
                        <p className="text-xs text-muted-foreground font-mono">{fg.pedigree_code} · {Number(fg.weight_kg).toLocaleString()} kg · {fg.destination_country}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Badge variant={fg.pedigree_verified ? 'default' : 'secondary'} className="text-xs">
                        {fg.pedigree_verified ? 'Verified' : 'Unverified'}
                      </Badge>
                      {linkedDpp ? (
                        <Link href={`/app/dpp/${linkedDpp.id}`}>
                          <Button size="sm" variant="outline" className="h-7 text-xs gap-1">
                            <QrCode className="h-3 w-3" />DPP
                          </Button>
                        </Link>
                      ) : (
                        <Link href={`/app/dpp?finished_good_id=${fg.id}`}>
                          <Button size="sm" variant="outline" className="h-7 text-xs gap-1">
                            <QrCode className="h-3 w-3" />Generate DPP
                          </Button>
                        </Link>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add finished goods to shipment */}
      <AddToShipmentDialog
        open={addToShipmentOpen}
        onOpenChange={setAddToShipmentOpen}
        itemType="finished_good"
        items={finishedGoods.map((fg) => ({
          id: fg.id,
          name: fg.product_name,
          weight_kg: fg.weight_kg,
        }))}
        onLinked={(shipmentId) => {
          window.location.href = `/app/shipments/${shipmentId}`;
        }}
      />
    </div>
  );
}
