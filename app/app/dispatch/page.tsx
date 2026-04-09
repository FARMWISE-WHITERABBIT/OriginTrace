'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { useOrg } from '@/lib/contexts/org-context';
import { useToast } from '@/hooks/use-toast';
import {
  Truck,
  Package,
  Loader2,
  ArrowLeft,
  Send,
  FileText,
  Ship,
  Factory,
} from 'lucide-react';
import Link from 'next/link';
import { TierGate } from '@/components/tier-gate';
import { AddToShipmentDialog } from '@/components/shipments/add-to-shipment-dialog';

interface Batch {
  id: string;
  batch_code: string | null;
  status: string;
  commodity: string;
  total_weight: number;
  bag_count: number;
  farm: {
    farmer_name: string;
    community: string;
  };
}

interface BagItem {
  serial: string;
  weight: number;
  grade: string;
}

interface ContributionItem {
  farmerName: string;
  community: string;
  bagCount: number;
  weightKg: number;
  complianceStatus: string;
}

const DISPATCHABLE = ['completed', 'aggregated', 'resolved'];

function DispatchPageInner() {
  return (
    <TierGate feature="dispatch" requiredTier="basic" featureLabel="Dispatch">
      <Suspense fallback={
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      }>
        <DispatchContent />
      </Suspense>
    </TierGate>
  );
}

function DispatchContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  // Support single: ?batch=id  OR  multi: ?batches=id1,id2,id3
  // Also supports: ?processing_run_id=id  (dispatch processed output to warehouse)
  const batchIdParam        = searchParams.get('batch');
  const batchesParam        = searchParams.get('batches');
  const processingRunIdParam = searchParams.get('processing_run_id');
  const batchIds: string[] = batchesParam
    ? batchesParam.split(',').map(s => s.trim()).filter(Boolean)
    : batchIdParam
    ? [batchIdParam]
    : [];

  const [batches, setBatches] = useState<Batch[]>([]);
  const [bags, setBags] = useState<BagItem[]>([]);
  const [contributions, setContributions] = useState<ContributionItem[]>([]);
  const [destination, setDestination] = useState('');
  const [vehicleRef, setVehicleRef] = useState('');
  const [driverPhone, setDriverPhone] = useState('');
  const [dispatchNotes, setDispatchNotes] = useState('');
  const [confirmDispatch, setConfirmDispatch] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isDispatching, setIsDispatching] = useState(false);
  const [dispatchedIds, setDispatchedIds] = useState<string[]>([]);
  const [addToShipmentOpen, setAddToShipmentOpen] = useState(false);
  // Processing run dispatch mode
  const [processingRun, setProcessingRun] = useState<any>(null);
  const [processingRunDispatched, setProcessingRunDispatched] = useState(false);
  const { profile, organization } = useOrg();
  const { toast } = useToast();

  useEffect(() => {
    if (batchIds.length === 0) {
      // Let the processingRun useEffect manage loading state in PR mode
      if (!processingRunIdParam) setIsLoading(false);
      return;
    }

    async function fetchAllBatches() {
      try {
        const results = await Promise.all(
          batchIds.map(id =>
            fetch(`/api/batches/${id}`)
              .then(r => r.ok ? r.json() : null)
              .catch(() => null)
          )
        );

        const loaded: Batch[] = [];
        const allBags: BagItem[] = [];
        const allContributions: ContributionItem[] = [];

        for (const data of results) {
          if (!data?.batch) continue;
          const b = data.batch;
          const farmData = Array.isArray(b.farm) ? b.farm[0] : b.farm;
          loaded.push({
            id: b.id,
            batch_code: b.batch_code ?? null,
            status: b.status,
            commodity: b.commodity ?? '',
            total_weight: parseFloat(b.total_weight) || 0,
            bag_count: b.bag_count ?? 0,
            farm: farmData
              ? { farmer_name: farmData.farmer_name ?? 'Unknown', community: farmData.community ?? 'Unknown' }
              : { farmer_name: 'Unknown', community: 'Unknown' },
          });
          if (data.bags?.length > 0) {
            allBags.push(...data.bags.map((bg: any) => ({
              serial: bg.serial || '-',
              weight: parseFloat(bg.weight_kg) || 0,
              grade: bg.grade || 'Standard',
            })));
          }
          if (data.contributions?.length > 0) {
            allContributions.push(...data.contributions.map((c: any) => ({
              farmerName: c.farmer_name || 'Unknown',
              community: c.community || '-',
              bagCount: c.bag_count || 0,
              weightKg: parseFloat(c.weight_kg) || 0,
              complianceStatus: c.compliance_status || 'pending',
            })));
          }
        }

        setBatches(loaded);
        setBags(allBags);
        setContributions(allContributions);
      } catch (err: any) {
        toast({
          title: 'Error',
          description: err.message || 'Failed to load batch details',
          variant: 'destructive',
        });
      } finally {
        setIsLoading(false);
      }
    }

    fetchAllBatches();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [batchesParam, batchIdParam]);

  useEffect(() => {
    if (!processingRunIdParam) return;

    async function fetchProcessingRun() {
      setIsLoading(true);
      try {
        const res = await fetch(`/api/processing-runs/${processingRunIdParam}`);
        if (!res.ok) throw new Error('Failed to load processing run');
        const data = await res.json();
        setProcessingRun(data.run);
      } catch (err: any) {
        toast({ title: 'Error', description: err.message || 'Failed to load processing run', variant: 'destructive' });
      } finally {
        setIsLoading(false);
      }
    }
    fetchProcessingRun();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [processingRunIdParam]);

  const handleDispatch = async () => {
    if (batches.length === 0 || !destination.trim() || !confirmDispatch) return;
    setIsDispatching(true);
    try {
      const results = await Promise.all(
        batches.map(batch =>
          fetch(`/api/batches/${batch.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: 'dispatch',
              dispatch_destination: destination.trim(),
              vehicle_reference: vehicleRef.trim() || null,
            }),
          }).then(r => r.json().then(j => ({ ok: r.ok, json: j, id: batch.id })))
        )
      );

      const failed = results.filter(r => !r.ok);
      if (failed.length > 0) {
        throw new Error(failed[0].json.error || 'Failed to dispatch one or more batches');
      }

      const label = batches.length === 1
        ? `Batch ${batches[0].batch_code || batches[0].id.slice(0, 8)}`
        : `${batches.length} batches`;
      toast({
        title: 'Dispatched',
        description: `${label} dispatched to ${destination}`,
      });

      setDispatchedIds(batches.map(b => b.id));
      setAddToShipmentOpen(true);
    } catch (err: any) {
      toast({
        title: 'Error',
        description: err.message || 'Failed to dispatch',
        variant: 'destructive',
      });
    } finally {
      setIsDispatching(false);
    }
  };

  const handleProcessingRunDispatch = async () => {
    if (!processingRun || !destination.trim() || !confirmDispatch) return;
    setIsDispatching(true);
    try {
      const res = await fetch(`/api/processing-runs/${processingRunIdParam}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dispatch_destination: destination.trim(),
          dispatch_vehicle_ref: vehicleRef.trim() || null,
          dispatch_driver_phone: driverPhone.trim() || null,
          dispatched_output_at: new Date().toISOString(),
          dispatch_notes: dispatchNotes.trim() || null,
        }),
      });
      if (!res.ok) {
        const j = await res.json();
        throw new Error(j.error || 'Failed to dispatch');
      }
      toast({ title: 'Dispatched', description: `Processing output dispatched to ${destination}` });
      setProcessingRunDispatched(true);
    } catch (err: any) {
      toast({ title: 'Error', description: err.message || 'Failed to dispatch', variant: 'destructive' });
    } finally {
      setIsDispatching(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (batchIds.length === 0 && !processingRunIdParam) {
    router.replace('/app/inventory');
    return null;
  }

  // ── Processing Run Dispatch Mode ──────────────────────────────────────────
  if (processingRunIdParam && batchIds.length === 0) {
    if (!processingRun) {
      return (
        <div className="text-center py-12">
          <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h2 className="text-xl font-semibold mb-2">Processing Run Not Found</h2>
          <p className="text-muted-foreground mb-4">Could not load the processing run.</p>
          <Link href="/app/processing">
            <Button><ArrowLeft className="h-4 w-4 mr-2" />Back to Processing</Button>
          </Link>
        </div>
      );
    }

    const alreadyDispatched = !!processingRun.dispatched_output_at;

    if (processingRunDispatched || alreadyDispatched) {
      return (
        <div className="text-center py-12">
          <Truck className="h-12 w-12 mx-auto text-green-600 mb-4" />
          <h2 className="text-xl font-semibold mb-2">
            {processingRunDispatched ? 'Output Dispatched' : 'Already Dispatched'}
          </h2>
          <p className="text-muted-foreground mb-4">
            {processingRunDispatched
              ? `Processing output dispatched to ${destination}.`
              : `This run's output was already dispatched${processingRun.dispatch_destination ? ` to ${processingRun.dispatch_destination}` : ''}.`}
          </p>
          <Link href={`/app/processing/${processingRunIdParam}`}>
            <Button><ArrowLeft className="h-4 w-4 mr-2" />Back to Processing Run</Button>
          </Link>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Link href={`/app/processing/${processingRunIdParam}`}>
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Dispatch Processing Output</h1>
            <p className="text-muted-foreground">
              {processingRun.run_code || `Run #${(processingRunIdParam as string).slice(0, 8)}`}
              {processingRun.commodity ? ` · ${processingRun.commodity}` : ''}
            </p>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card className="card-accent-blue">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg flex items-center justify-center icon-bg-blue shrink-0">
                  <Truck className="h-4 w-4" />
                </div>
                Dispatch Details
              </CardTitle>
              <CardDescription>Record handover for the processing-to-warehouse leg</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="pr-destination">Destination *</Label>
                <Input
                  id="pr-destination"
                  placeholder="e.g., Lagos Warehouse, Export Terminal"
                  value={destination}
                  onChange={(e) => setDestination(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="pr-vehicle">Vehicle Reference</Label>
                <Input
                  id="pr-vehicle"
                  placeholder="e.g., Plate number, truck ID"
                  value={vehicleRef}
                  onChange={(e) => setVehicleRef(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="pr-driver">Driver Phone</Label>
                <Input
                  id="pr-driver"
                  placeholder="e.g., +234…"
                  value={driverPhone}
                  onChange={(e) => setDriverPhone(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="pr-notes">Dispatch Notes</Label>
                <Textarea
                  id="pr-notes"
                  placeholder="Any additional handover notes…"
                  value={dispatchNotes}
                  onChange={(e) => setDispatchNotes(e.target.value)}
                  rows={3}
                />
              </div>
              <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50 mt-2">
                <Checkbox
                  id="pr-confirm"
                  checked={confirmDispatch}
                  onCheckedChange={(checked) => setConfirmDispatch(checked === true)}
                />
                <label htmlFor="pr-confirm" className="text-sm cursor-pointer">
                  I confirm the processed output has been loaded and is ready for transport.
                </label>
              </div>
              <Button
                className="w-full min-h-[48px]"
                onClick={handleProcessingRunDispatch}
                disabled={isDispatching || !destination.trim() || !confirmDispatch}
              >
                {isDispatching ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Send className="h-4 w-4 mr-2" />
                )}
                Dispatch Output
              </Button>
            </CardContent>
          </Card>

          <Card className="card-accent-emerald">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg flex items-center justify-center icon-bg-emerald shrink-0">
                  <Factory className="h-4 w-4" />
                </div>
                Run Summary
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="rounded-lg border bg-muted/20 p-3 space-y-2">
                {[
                  { label: 'Run Code',      value: processingRun.run_code || '—' },
                  { label: 'Commodity',     value: processingRun.commodity || '—' },
                  { label: 'Facility',      value: processingRun.facility_name || '—' },
                  { label: 'Location',      value: processingRun.facility_location || '—' },
                  { label: 'Status',        value: processingRun.status || '—' },
                ].map(row => (
                  <div key={row.label} className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">{row.label}</span>
                    <span className="text-xs font-medium">{row.value}</span>
                  </div>
                ))}
              </div>
              {processingRun.output_weight_kg > 0 && (
                <div className="flex items-center justify-between p-3 rounded-lg bg-primary/8 border border-primary/20">
                  <span className="text-sm font-semibold text-primary">Output Weight</span>
                  <span className="font-bold text-xl text-primary">
                    {Number(processingRun.output_weight_kg).toFixed(1)} kg
                  </span>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (batches.length === 0) {
    return (
      <div className="text-center py-12">
        <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
        <h2 className="text-xl font-semibold mb-2">Batches Not Found</h2>
        <p className="text-muted-foreground mb-4">
          Could not load the selected batch(es). They may have been deleted or you may not have access.
        </p>
        <Link href="/app/inventory">
          <Button>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Inventory
          </Button>
        </Link>
      </div>
    );
  }

  const alreadyDispatched = batches.filter(b => b.status === 'dispatched');
  const notReady = batches.filter(b => !DISPATCHABLE.includes(b.status) && b.status !== 'dispatched');
  const dispatchable = batches.filter(b => DISPATCHABLE.includes(b.status));

  if (alreadyDispatched.length === batches.length) {
    return (
      <div className="text-center py-12">
        <Truck className="h-12 w-12 mx-auto text-green-600 mb-4" />
        <h2 className="text-xl font-semibold mb-2">Already Dispatched</h2>
        <p className="text-muted-foreground mb-4">
          {batches.length === 1 ? 'This batch has' : 'These batches have'} already been dispatched.
        </p>
        <Link href="/app/inventory">
          <Button>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Inventory
          </Button>
        </Link>
      </div>
    );
  }

  if (notReady.length === batches.length) {
    return (
      <div className="text-center py-12">
        <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
        <h2 className="text-xl font-semibold mb-2">Batches Not Ready</h2>
        <p className="text-muted-foreground mb-4">
          Selected batches must be in <span className="font-mono">completed</span>,{' '}
          <span className="font-mono">aggregated</span>, or <span className="font-mono">resolved</span> status before dispatch.
        </p>
        <Link href="/app/inventory">
          <Button variant="outline">Back to Inventory</Button>
        </Link>
      </div>
    );
  }

  const totalWeight = dispatchable.reduce((s, b) => s + b.total_weight, 0);
  const totalBags   = dispatchable.reduce((s, b) => s + b.bag_count, 0);
  const isMulti     = dispatchable.length > 1;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/app/inventory">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight" data-testid="text-page-title">
            Dispatch {isMulti ? `${dispatchable.length} Batches` : 'Batch'}
          </h1>
          <p className="text-muted-foreground">
            {isMulti
              ? `${totalBags} bags · ${totalWeight.toFixed(1)} kg total`
              : `Batch: ${dispatchable[0]?.batch_code || `#${dispatchable[0]?.id}`}`}
          </p>
        </div>
        {notReady.length > 0 && (
          <Badge variant="outline" className="ml-auto text-amber-600 border-amber-300">
            {notReady.length} batch{notReady.length > 1 ? 'es' : ''} skipped (not ready)
          </Badge>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Dispatch form */}
        <Card className="card-accent-blue">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg flex items-center justify-center icon-bg-blue shrink-0">
                <Truck className="h-4 w-4" />
              </div>
              Dispatch Details
            </CardTitle>
            <CardDescription>Record handover information for chain-of-custody</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="destination">Destination *</Label>
              <Input
                id="destination"
                placeholder="e.g., Lagos Warehouse, Abidjan Factory"
                value={destination}
                onChange={(e) => setDestination(e.target.value)}
                data-testid="input-destination"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="vehicleRef">Vehicle Reference</Label>
              <Input
                id="vehicleRef"
                placeholder="e.g., Plate number, truck ID"
                value={vehicleRef}
                onChange={(e) => setVehicleRef(e.target.value)}
                data-testid="input-vehicle-ref"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="driverPhone">Driver Phone (optional)</Label>
              <Input
                id="driverPhone"
                placeholder="e.g., +234…"
                value={driverPhone}
                onChange={(e) => setDriverPhone(e.target.value)}
                data-testid="input-driver-phone"
              />
            </div>

            <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50 mt-4">
              <Checkbox
                id="confirmDispatch"
                checked={confirmDispatch}
                onCheckedChange={(checked) => setConfirmDispatch(checked === true)}
                data-testid="checkbox-confirm-dispatch"
              />
              <label htmlFor="confirmDispatch" className="text-sm cursor-pointer">
                I confirm {isMulti ? 'these batches have' : 'this batch has'} been loaded and {isMulti ? 'are' : 'is'} ready
                for transport. After dispatch, {isMulti ? 'they' : 'it'} cannot be edited.
              </label>
            </div>

            <Button
              className="w-full min-h-[48px]"
              onClick={handleDispatch}
              disabled={isDispatching || !destination.trim() || !confirmDispatch}
              data-testid="button-dispatch"
            >
              {isDispatching ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Send className="h-4 w-4 mr-2" />
              )}
              Dispatch {isMulti ? `${dispatchable.length} Batches` : 'Batch'}
            </Button>

            {!isMulti && dispatchable[0] && (
              <Button
                variant="outline"
                className="w-full"
                onClick={async () => {
                  const { generateWaybillPDF } = await import('@/lib/export/waybill-pdf');
                  const b = dispatchable[0];
                  const doc = generateWaybillPDF({
                    orgName: organization?.name || 'OriginTrace',
                    batchId: b.batch_code || `#${b.id}`,
                    commodity: b.commodity || '-',
                    farmerName: b.farm.farmer_name,
                    community: b.farm.community,
                    bagCount: b.bag_count,
                    totalWeight: b.total_weight,
                    destination: destination || '-',
                    vehicleRef: vehicleRef || undefined,
                    driverPhone: driverPhone || undefined,
                    collectedBy: profile?.full_name || 'Unknown',
                    collectionDate: new Date().toLocaleDateString(),
                    bags: bags.length > 0 ? bags : undefined,
                    contributions: contributions.length > 0 ? contributions : undefined,
                  });
                  doc.save(`waybill-${b.batch_code || b.id}.pdf`);
                }}
                data-testid="button-download-waybill"
              >
                <FileText className="h-4 w-4 mr-2" />
                Download Waybill PDF
              </Button>
            )}
          </CardContent>
        </Card>

        {/* Batch summary */}
        <Card className="card-accent-emerald">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg flex items-center justify-center icon-bg-emerald shrink-0">
                <Package className="h-4 w-4" />
              </div>
              {isMulti ? 'Selected Batches' : 'Batch Summary'}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {dispatchable.map((b) => (
              <div key={b.id} className="rounded-lg border bg-muted/20 p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-semibold">{b.batch_code || `#${b.id.slice(0, 8)}`}</span>
                  <Badge variant="secondary" className="text-xs">{b.status}</Badge>
                </div>
                {isMulti && (
                  <div className="grid grid-cols-2 gap-1 text-xs">
                    <span className="text-muted-foreground">Farmer</span>
                    <span className="font-medium truncate">{b.farm.farmer_name}</span>
                    <span className="text-muted-foreground">Community</span>
                    <span className="font-medium">{b.farm.community}</span>
                    <span className="text-muted-foreground">Commodity</span>
                    <span className="font-medium">{b.commodity || '—'}</span>
                    <span className="text-muted-foreground">Weight</span>
                    <span className="font-medium">{b.total_weight.toFixed(1)} kg</span>
                  </div>
                )}
                {!isMulti && (
                  <div className="space-y-1.5">
                    {[
                      { label: 'Farmer',    value: b.farm.farmer_name },
                      { label: 'Community', value: b.farm.community },
                      { label: 'Commodity', value: b.commodity || '—' },
                      { label: 'Bags',      value: String(b.bag_count) },
                    ].map(row => (
                      <div key={row.label} className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">{row.label}</span>
                        <span className="text-xs font-medium">{row.value}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}

            {isMulti && (
              <div className="flex items-center justify-between p-3 rounded-lg bg-primary/8 border border-primary/20">
                <span className="text-sm font-semibold text-primary">Total</span>
                <div className="text-right">
                  <p className="font-bold text-lg text-primary">{totalWeight.toFixed(1)} kg</p>
                  <p className="text-xs text-muted-foreground">{totalBags} bags · {dispatchable.length} batches</p>
                </div>
              </div>
            )}
            {!isMulti && (
              <div className="flex items-center justify-between p-3 rounded-lg bg-primary/8 border border-primary/20">
                <span className="text-sm font-semibold text-primary">Total Weight</span>
                <span className="font-bold text-xl text-primary">{totalWeight.toFixed(1)} kg</span>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* After dispatch: prompt to add to shipment */}
      {dispatchedIds.length > 0 && (
        <AddToShipmentDialog
          open={addToShipmentOpen}
          onOpenChange={(v) => {
            setAddToShipmentOpen(v);
            if (!v) router.push('/app/inventory');
          }}
          itemType="batch"
          items={dispatchedIds.map(id => {
            const b = batches.find(x => x.id === id)!;
            return {
              id,
              name: b.batch_code ?? `Batch ${id.slice(0, 8)}`,
              weight_kg: b.total_weight,
            };
          })}
          onLinked={(shipmentId) => {
            router.push(`/app/shipments/${shipmentId}`);
          }}
        />
      )}
    </div>
  );
}

export default function DispatchPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    }>
      <DispatchPageInner />
    </Suspense>
  );
}
