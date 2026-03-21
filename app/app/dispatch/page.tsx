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
import { createClient } from '@/lib/supabase/client';
import { useToast } from '@/hooks/use-toast';
import {
  Truck,
  Package,
  Loader2,
  Scale,
  ArrowLeft,
  MapPin,
  Clock,
  Send,
  FileText
} from 'lucide-react';
import Link from 'next/link';
import { TierGate } from '@/components/tier-gate';

interface Batch {
  id: number;
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

export default function DispatchPage() {
  return (
    <TierGate feature="dispatch" requiredTier="basic" featureLabel="Dispatch">
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="space-y-3">{Array.from({length:3}).map((_,i)=><div key={i} className="h-20 bg-muted animate-pulse rounded-xl"/>)}</div>
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
  const { organization, profile } = useOrg();
  const { toast } = useToast();
  const supabase = createClient();

  useEffect(() => {
    async function fetchBatch() {
      if (!supabase || !organization || !batchIdParam) {
        setIsLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('collection_batches')
          .select(`
            id,
            batch_code,
            status,
            commodity,
            total_weight,
            bag_count,
            farm:farms!farm_id (
              farmer_name,
              community
            )
          `)
          .eq('org_id', organization.id)
          .eq('id', batchIdParam)
          .single();

        if (error) throw error;

        const farmData = Array.isArray(data.farm) ? data.farm[0] : data.farm;
        setBatch({
          ...data,
          total_weight: parseFloat(data.total_weight) || 0,
          farm: farmData || { farmer_name: 'Unknown', community: 'Unknown' }
        } as Batch);

        const { data: bagsData } = await supabase
          .from('bags')
          .select('serial, weight_kg, grade')
          .eq('collection_batch_id', batchIdParam);

        if (bagsData && bagsData.length > 0) {
          setBags(bagsData.map(b => ({
            serial: b.serial || '-',
            weight: parseFloat(b.weight_kg) || 0,
            grade: b.grade || 'Standard'
          })));
        }

        try {
          const contribRes = await fetch(`/api/batch-contributions?batch_id=${batchIdParam}`);
          if (contribRes.ok) {
            const contribData = await contribRes.json();
            if (contribData.contributions && contribData.contributions.length > 0) {
              setContributions(contribData.contributions.map((c: any) => ({
                farmerName: c.farmer_name || 'Unknown',
                community: c.community || '-',
                bagCount: c.bag_count || 0,
                weightKg: parseFloat(c.weight_kg) || 0,
                complianceStatus: c.compliance_status || 'pending'
              })));
            }
          }
        } catch {}

      } catch (error) {
        console.error('Failed to fetch batch:', error);
        toast({
          title: 'Error',
          description: 'Failed to load batch details',
          variant: 'destructive'
        });
      } finally {
        setIsLoading(false);
      }
    }

    fetchBatch();
  }, [organization, supabase, batchIdParam, toast]);

  const handleDispatch = async () => {
    if (!supabase || !batch || !profile || !destination.trim() || !confirmDispatch) return;

    setIsDispatching(true);

    try {
      const { error } = await supabase
        .from('collection_batches')
        .update({
          status: 'dispatched',
          dispatched_at: new Date().toISOString(),
          dispatched_by: profile.user_id,
          dispatch_destination: destination.trim(),
          vehicle_reference: vehicleRef.trim() || null
        })
        .eq('id', batch.id);

      if (error) throw error;

      toast({
        title: 'Batch Dispatched',
        description: `Batch ${batch.batch_code || batch.id} has been dispatched to ${destination}`
      });

      router.push('/app/inventory');
    } catch (error) {
      console.error('Failed to dispatch batch:', error);
      toast({
        title: 'Error',
        description: 'Failed to dispatch batch',
        variant: 'destructive'
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
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!batch) {
    return (
      <div className="text-center py-12">
        <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
        <h2 className="text-xl font-semibold mb-2">Batch Not Found</h2>
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
        <p className="text-muted-foreground mb-4">
          This batch has already been dispatched.
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

  if (batch.status !== 'resolved') {
    return (
      <div className="text-center py-12">
        <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
        <h2 className="text-xl font-semibold mb-2">Batch Not Ready</h2>
        <p className="text-muted-foreground mb-4">
          This batch must be resolved before it can be dispatched.
        </p>
        <Link href={`/app/resolve?batch=${batch.id}`}>
          <Button>
            Resolve Batch First
          </Button>
        </Link>
        <Link href={`/app/inventory/${batch.id}`} className="ml-2">
          <Button variant="outline">
            View Batch Details
          </Button>
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
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Truck className="h-5 w-5" />
              Dispatch Details
            </CardTitle>
            <CardDescription>
              Record handover information for chain-of-custody
            </CardDescription>
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
                  orgName: organization?.name || 'OriginTrace',
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

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Batch Summary
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
              <span className="text-sm text-muted-foreground">Batch ID</span>
              <span className="font-mono font-medium">{batch.batch_code || `#${batch.id}`}</span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
              <span className="text-sm text-muted-foreground">Farmer</span>
              <span className="font-medium">{batch.farm.farmer_name}</span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
              <span className="text-sm text-muted-foreground">Community</span>
              <span className="font-medium">{batch.farm.community}</span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
              <span className="text-sm text-muted-foreground">Commodity</span>
              <span className="font-medium">{batch.commodity || '-'}</span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
              <span className="text-sm text-muted-foreground">Bags</span>
              <span className="font-medium text-lg">{batch.bag_count}</span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg bg-primary/10 border border-primary/20">
              <span className="text-sm font-medium">Total Weight</span>
              <span className="font-bold text-lg">{batch.total_weight.toFixed(1)} kg</span>
            </div>

            <div className="pt-4 border-t">
              <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                <Clock className="h-4 w-4" />
                After Dispatch
              </h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Batch status changes to "Dispatched"</li>
                <li>• Weights and quantities are locked</li>
                <li>• Destination warehouse scans to confirm receipt</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
