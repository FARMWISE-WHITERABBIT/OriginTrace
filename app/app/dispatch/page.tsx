'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
  const batchIdParam = searchParams.get('batch');

  const [batch, setBatch] = useState<Batch | null>(null);
  const [bags, setBags] = useState<BagItem[]>([]);
  const [contributions, setContributions] = useState<ContributionItem[]>([]);
  const [destination, setDestination] = useState('');
  const [vehicleRef, setVehicleRef] = useState('');
  const [driverPhone, setDriverPhone] = useState('');
  const [confirmDispatch, setConfirmDispatch] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isDispatching, setIsDispatching] = useState(false);
  const [dispatchedBatchId, setDispatchedBatchId] = useState<string | null>(null);
  const [addToShipmentOpen, setAddToShipmentOpen] = useState(false);
  const { profile } = useOrg();
  const { toast } = useToast();

  useEffect(() => {
    if (!batchIdParam) {
      setIsLoading(false);
      return;
    }

    async function fetchBatch() {
      try {
        const res = await fetch(`/api/batches/${batchIdParam}`);
        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || 'Failed to load batch');
        }
        const data = await res.json();
        const b = data.batch;

        const farmData = Array.isArray(b.farm) ? b.farm[0] : b.farm;
        setBatch({
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
          setBags(data.bags.map((bg: any) => ({
            serial: bg.serial || '-',
            weight: parseFloat(bg.weight_kg) || 0,
            grade: bg.grade || 'Standard',
          })));
        }

        if (data.contributions?.length > 0) {
          setContributions(data.contributions.map((c: any) => ({
            farmerName: c.farmer_name || 'Unknown',
            community: c.community || '-',
            bagCount: c.bag_count || 0,
            weightKg: parseFloat(c.weight_kg) || 0,
            complianceStatus: c.compliance_status || 'pending',
          })));
        }
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

    fetchBatch();
  }, [batchIdParam, toast]);

  const handleDispatch = async () => {
    if (!batch || !destination.trim() || !confirmDispatch) return;
    setIsDispatching(true);
    try {
      const res = await fetch(`/api/batches/${batch.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'dispatch',
          dispatch_destination: destination.trim(),
          vehicle_reference: vehicleRef.trim() || null,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to dispatch');

      toast({
        title: 'Batch Dispatched',
        description: `Batch ${batch.batch_code || batch.id} has been dispatched to ${destination}`,
      });

      setDispatchedBatchId(batch.id);
      setAddToShipmentOpen(true);
    } catch (err: any) {
      toast({
        title: 'Error',
        description: err.message || 'Failed to dispatch batch',
        variant: 'destructive',
      });
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

  if (!batchIdParam) {
    router.replace('/app/inventory');
    return null;
  }

  if (!batch) {
    return (
      <div className="text-center py-12">
        <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
        <h2 className="text-xl font-semibold mb-2">Batch Not Found</h2>
        <p className="text-muted-foreground mb-4">Could not load this batch. It may have been deleted or you may not have access.</p>
        <Link href="/app/inventory">
          <Button>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Inventory
          </Button>
        </Link>
      </div>
    );
  }

  if (batch.status === 'dispatched') {
    return (
      <div className="text-center py-12">
        <Truck className="h-12 w-12 mx-auto text-green-600 mb-4" />
        <h2 className="text-xl font-semibold mb-2">Already Dispatched</h2>
        <p className="text-muted-foreground mb-4">This batch has already been dispatched.</p>
        <Link href="/app/inventory">
          <Button>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Inventory
          </Button>
        </Link>
      </div>
    );
  }

  const DISPATCHABLE = ['completed', 'aggregated', 'resolved'];
  const canDispatch = DISPATCHABLE.includes(batch.status);
  if (!canDispatch) {
    return (
      <div className="text-center py-12">
        <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
        <h2 className="text-xl font-semibold mb-2">Batch Not Ready</h2>
        <p className="text-muted-foreground mb-4">
          This batch must be in <span className="font-mono">completed</span>, <span className="font-mono">aggregated</span>, or <span className="font-mono">resolved</span> status before it can be dispatched. Current status: <span className="font-mono font-semibold">{batch.status}</span>
        </p>
        <Link href={`/app/inventory/${batch.id}`}>
          <Button variant="outline">View Batch Details</Button>
        </Link>
      </div>
    );
  }

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
            Dispatch Batch
          </h1>
          <p className="text-muted-foreground">
            Batch: {batch.batch_code || `#${batch.id}`}
          </p>
        </div>
        <Badge variant="secondary" className="ml-auto">
          {batch.status}
        </Badge>
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
                placeholder="e.g., +234..."
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
                I confirm that the batch has been loaded and is ready for transport.
                After dispatch, the batch cannot be edited.
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
              Dispatch Batch
            </Button>

            <Button
              variant="outline"
              className="w-full"
              onClick={async () => {
                const { generateWaybillPDF } = await import('@/lib/export/waybill-pdf');
                const doc = generateWaybillPDF({
                  batchId: batch.batch_code || `#${batch.id}`,
                  commodity: batch.commodity || '-',
                  farmerName: batch.farm.farmer_name,
                  community: batch.farm.community,
                  bagCount: batch.bag_count,
                  totalWeight: batch.total_weight,
                  destination: destination || '-',
                  vehicleRef: vehicleRef || undefined,
                  driverPhone: driverPhone || undefined,
                  collectedBy: profile?.full_name || 'Unknown',
                  collectionDate: new Date().toLocaleDateString(),
                  bags: bags.length > 0 ? bags : undefined,
                  contributions: contributions.length > 0 ? contributions : undefined,
                });
                doc.save(`waybill-${batch.batch_code || batch.id}.pdf`);
              }}
              data-testid="button-download-waybill"
            >
              <FileText className="h-4 w-4 mr-2" />
              Download Waybill PDF
            </Button>
          </CardContent>
        </Card>

        <Card className="card-accent-emerald">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg flex items-center justify-center icon-bg-emerald shrink-0">
                <Package className="h-4 w-4" />
              </div>
              Batch Summary
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {[
              { label: 'Batch ID',  value: batch.batch_code || `#${batch.id}`, mono: true },
              { label: 'Farmer',    value: batch.farm.farmer_name },
              { label: 'Community', value: batch.farm.community },
              { label: 'Commodity', value: batch.commodity || '—' },
              { label: 'Bags',      value: String(batch.bag_count) },
            ].map(row => (
              <div key={row.label} className="flex items-center justify-between p-3 rounded-lg bg-muted/40 border border-border/50">
                <span className="text-sm text-muted-foreground">{row.label}</span>
                <span className={`font-medium text-sm ${row.mono ? 'font-mono' : ''}`}>{row.value}</span>
              </div>
            ))}
            <div className="flex items-center justify-between p-3 rounded-lg bg-primary/8 border border-primary/20">
              <span className="text-sm font-semibold text-primary">Total Weight</span>
              <span className="font-bold text-xl text-primary">{batch.total_weight.toFixed(1)} kg</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* After dispatch: prompt to add batch to a shipment */}
      {dispatchedBatchId && batch && (
        <AddToShipmentDialog
          open={addToShipmentOpen}
          onOpenChange={(v) => {
            setAddToShipmentOpen(v);
            if (!v) router.push('/app/inventory');
          }}
          itemType="batch"
          items={[{
            id: dispatchedBatchId,
            name: batch.batch_code ?? `Batch ${dispatchedBatchId.slice(0, 8)}`,
            weight_kg: batch.total_weight,
          }]}
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
