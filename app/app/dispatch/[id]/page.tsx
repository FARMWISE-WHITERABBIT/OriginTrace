'use client';

import { useState, useEffect, Suspense } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import {
  Truck,
  Package,
  Loader2,
  ArrowLeft,
  MapPin,
  Calendar,
  User,
  Hash,
  Weight,
  ShoppingBag,
  Ship,
  Phone,
  Clock,
  CalendarClock,
  ClipboardCheck,
  Users,
} from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import Link from 'next/link';
import { AddToShipmentDialog } from '@/components/shipments/add-to-shipment-dialog';

interface BatchDispatchDetail {
  id: string;
  batch_code: string | null;
  status: string;
  commodity: string | null;
  total_weight: number;
  bag_count: number;
  dispatch_destination: string | null;
  vehicle_reference: string | null;
  dispatched_at: string | null;
  dispatched_by: string | null;
  driver_name: string | null;
  driver_phone: string | null;
  expected_arrival_at: string | null;
  dispatch_recorded_at: string | null;
  created_at: string;
  farm: {
    id: string;
    farmer_name: string;
    community: string;
    phone?: string;
  };
}

function DispatchDetailContent() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { toast } = useToast();
  const [batch, setBatch] = useState<BatchDispatchDetail | null>(null);
  const [contributions, setContributions] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [addToShipmentOpen, setAddToShipmentOpen] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/batches/${params.id}`);
        if (!res.ok) throw new Error('Batch not found');
        const data = await res.json();
        const b = data.batch;
        const farmData = Array.isArray(b.farm) ? b.farm[0] : b.farm;
        setBatch({
          id: b.id,
          batch_code: b.batch_code ?? null,
          status: b.status,
          commodity: b.commodity ?? null,
          total_weight: parseFloat(b.total_weight) || 0,
          bag_count: b.bag_count ?? 0,
          dispatch_destination: b.dispatch_destination ?? null,
          vehicle_reference: b.vehicle_reference ?? null,
          dispatched_at: b.dispatched_at ?? null,
          dispatched_by: b.dispatched_by ?? null,
          driver_name: b.driver_name ?? null,
          driver_phone: b.driver_phone ?? null,
          expected_arrival_at: b.expected_arrival_at ?? null,
          dispatch_recorded_at: b.dispatch_recorded_at ?? null,
          created_at: b.created_at,
          farm: farmData
            ? { id: farmData.id, farmer_name: farmData.farmer_name ?? 'Unknown', community: farmData.community ?? '—', phone: farmData.phone }
            : { id: '', farmer_name: 'Unknown', community: '—' },
        });
        setContributions(data.contributions || []);
      } catch (err: any) {
        toast({ title: 'Error', description: err.message, variant: 'destructive' });
      } finally {
        setIsLoading(false);
      }
    }
    load();
  }, [params.id, toast]);

  if (isLoading) {
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
        <p className="text-muted-foreground mb-4">This batch could not be found or you don't have access.</p>
        <Link href="/app/inventory">
          <Button><ArrowLeft className="h-4 w-4 mr-2" />Back to Inventory</Button>
        </Link>
      </div>
    );
  }

  const isDispatched = batch.status === 'dispatched';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dispatch Details</h1>
          <p className="text-muted-foreground font-mono text-sm">
            {batch.batch_code || `#${batch.id.slice(0, 8)}`}
          </p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <Badge
            variant={isDispatched ? 'default' : 'secondary'}
            className={isDispatched ? 'bg-green-600 text-white' : ''}
          >
            {isDispatched ? (
              <><Truck className="h-3 w-3 mr-1" />Dispatched</>
            ) : (
              batch.status
            )}
          </Badge>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Dispatch info */}
        <Card className="card-accent-blue">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <div className="h-7 w-7 rounded-lg icon-bg-blue flex items-center justify-center shrink-0">
                <Truck className="h-3.5 w-3.5" />
              </div>
              Dispatch Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <InfoRow
              icon={<MapPin className="h-3.5 w-3.5" />}
              label="Destination"
              value={batch.dispatch_destination || '—'}
            />
            <InfoRow
              icon={<Truck className="h-3.5 w-3.5" />}
              label="Vehicle"
              value={batch.vehicle_reference || '—'}
            />
            <InfoRow
              icon={<User className="h-3.5 w-3.5" />}
              label="Driver"
              value={batch.driver_name || '—'}
            />
            <InfoRow
              icon={<Phone className="h-3.5 w-3.5" />}
              label="Driver Phone"
              value={batch.driver_phone || '—'}
            />
            <InfoRow
              icon={<Clock className="h-3.5 w-3.5" />}
              label="Departure Time"
              value={batch.dispatched_at ? new Date(batch.dispatched_at).toLocaleString('en-GB') : '—'}
            />
            <InfoRow
              icon={<CalendarClock className="h-3.5 w-3.5" />}
              label="Expected Arrival"
              value={batch.expected_arrival_at ? new Date(batch.expected_arrival_at).toLocaleString('en-GB') : '—'}
            />
            <InfoRow
              icon={<ClipboardCheck className="h-3.5 w-3.5" />}
              label="Recorded At"
              value={batch.dispatch_recorded_at ? new Date(batch.dispatch_recorded_at).toLocaleString('en-GB') : '—'}
            />
            {!isDispatched && (
              <div className="pt-2">
                <Link href={`/app/dispatch?batch=${batch.id}`}>
                  <Button size="sm" className="w-full">
                    <Truck className="h-3.5 w-3.5 mr-1.5" />
                    Dispatch Now
                  </Button>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Batch info */}
        <Card className="card-accent-emerald">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <div className="h-7 w-7 rounded-lg icon-bg-emerald flex items-center justify-center shrink-0">
                <Package className="h-3.5 w-3.5" />
              </div>
              Batch Summary
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <InfoRow
              icon={<Hash className="h-3.5 w-3.5" />}
              label="Batch Code"
              value={batch.batch_code || `#${batch.id.slice(0, 8)}`}
              mono
            />
            <InfoRow
              icon={<User className="h-3.5 w-3.5" />}
              label="Farmer"
              value={batch.farm.farmer_name}
            />
            <InfoRow
              icon={<MapPin className="h-3.5 w-3.5" />}
              label="Community"
              value={batch.farm.community}
            />
            <InfoRow
              icon={<Package className="h-3.5 w-3.5" />}
              label="Commodity"
              value={batch.commodity || '—'}
            />
            <InfoRow
              icon={<ShoppingBag className="h-3.5 w-3.5" />}
              label="Bags"
              value={String(batch.bag_count)}
            />
            <div className="flex items-center justify-between pt-1 border-t">
              <span className="text-sm font-semibold text-primary flex items-center gap-1.5">
                <Weight className="h-3.5 w-3.5" />
                Total Weight
              </span>
              <span className="text-lg font-bold text-primary">{batch.total_weight.toFixed(1)} kg</span>
            </div>
          </CardContent>
        </Card>

        {/* Contributors */}
        {contributions.length > 0 && (
          <Card className="md:col-span-2">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <div className="h-7 w-7 rounded-lg icon-bg-violet flex items-center justify-center shrink-0">
                  <Users className="h-3.5 w-3.5" />
                </div>
                Contributors
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Farmer</TableHead>
                    <TableHead>Community</TableHead>
                    <TableHead className="text-right">Bags</TableHead>
                    <TableHead className="text-right">Weight (kg)</TableHead>
                    <TableHead>Compliance</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {contributions.map((c, i) => (
                    <TableRow key={i}>
                      <TableCell className="font-medium">{c.farmer_name}</TableCell>
                      <TableCell className="text-muted-foreground">{c.community || '—'}</TableCell>
                      <TableCell className="text-right font-mono">{c.bag_count}</TableCell>
                      <TableCell className="text-right font-mono">{Number(c.weight_kg).toFixed(1)}</TableCell>
                      <TableCell>
                        <Badge variant={c.compliance_status === 'approved' ? 'default' : 'secondary'} className="text-xs">
                          {c.compliance_status || 'pending'}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3 flex-wrap">
        <Link href={`/app/inventory/${batch.id}`}>
          <Button variant="outline" size="sm">
            <Package className="h-4 w-4 mr-1.5" />
            View Full Batch
          </Button>
        </Link>
        {isDispatched && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setAddToShipmentOpen(true)}
          >
            <Ship className="h-4 w-4 mr-1.5" />
            Add to Shipment
          </Button>
        )}
        <Link href="/app/inventory" className="ml-auto">
          <Button variant="ghost" size="sm">Back to Inventory</Button>
        </Link>
      </div>

      {/* Add to shipment */}
      {isDispatched && (
        <AddToShipmentDialog
          open={addToShipmentOpen}
          onOpenChange={setAddToShipmentOpen}
          itemType="batch"
          items={[{
            id: batch.id,
            name: batch.batch_code ?? `Batch ${batch.id.slice(0, 8)}`,
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

function InfoRow({
  icon,
  label,
  value,
  mono = false,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-xs text-muted-foreground flex items-center gap-1.5">
        {icon}
        {label}
      </span>
      <span className={`text-sm font-medium truncate max-w-[55%] text-right ${mono ? 'font-mono' : ''}`}>
        {value}
      </span>
    </div>
  );
}

export default function DispatchDetailPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    }>
      <DispatchDetailContent />
    </Suspense>
  );
}
