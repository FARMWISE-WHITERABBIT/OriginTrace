'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { useOrg } from '@/lib/contexts/org-context';
import { createClient } from '@/lib/supabase/client';
import { useToast } from '@/hooks/use-toast';
import {
  Package,
  CheckCircle,
  Lock,
  Loader2,
  Scale,
  AlertTriangle,
  ArrowLeft,
  QrCode
} from 'lucide-react';
import Link from 'next/link';
import { TierGate } from '@/components/tier-gate';

interface Bag {
  id: string;
  bag_id: string;
  weight: number;
  grade: string;
  status: string;
  selected: boolean;
}

interface Batch {
  id: number;
  batch_id: string;
  status: string;
  commodity: string;
  estimated_bags: number;
  estimated_weight: number;
  total_weight: number;
  bag_count: number;
  farm: {
    farmer_name: string;
    community: string;
    compliance_status: string;
  };
}

export default function ResolveBatchPage() {
  return (
    <TierGate feature="resolve" requiredTier="pro" featureLabel="Resolve">
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="space-y-3">{Array.from({length:3}).map((_,i)=><div key={i} className="h-16 bg-muted animate-pulse rounded-xl"/>)}</div>
      </div>
    }>
      <ResolveBatchContent />
    </Suspense>
    </TierGate>
  );
}

function ResolveBatchContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const batchIdParam = searchParams.get('batch');

  const [batch, setBatch] = useState<Batch | null>(null);
  const [bags, setBags] = useState<Bag[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isResolving, setIsResolving] = useState(false);
  const [confirmLock, setConfirmLock] = useState(false);
  const { organization, profile } = useOrg();
  const { toast } = useToast();
  const supabase = createClient();

  useEffect(() => {
    async function fetchBatchAndBags() {
      if (!supabase || !organization || !batchIdParam) {
        setIsLoading(false);
        return;
      }

      try {
        const { data: batchData, error: batchError } = await supabase
          .from('collection_batches')
          .select(`
            id,
            batch_id,
            status,
            commodity,
            estimated_bags,
            estimated_weight,
            total_weight,
            bag_count,
            farm:farms!farm_id (
              farmer_name,
              community,
              compliance_status
            )
          `)
          .eq('org_id', organization.id)
          .eq('id', batchIdParam)
          .single();

        if (batchError) throw batchError;

        const farmData = Array.isArray(batchData.farm) ? batchData.farm[0] : batchData.farm;
        setBatch({
          ...batchData,
          estimated_weight: parseFloat(batchData.estimated_weight) || 0,
          total_weight: parseFloat(batchData.total_weight) || 0,
          farm: farmData || { farmer_name: 'Unknown', community: 'Unknown', compliance_status: 'pending' }
        } as Batch);

        const { data: bagsData, error: bagsError } = await supabase
          .from('bags')
          .select('id, bag_id, weight_kg, grade, status')
          .eq('org_id', organization.id)
          .eq('collection_batch_id', batchIdParam);

        if (bagsError) throw bagsError;

        setBags((bagsData || []).map(b => ({
          id: b.id,
          bag_id: b.bag_id || b.id,
          weight: parseFloat(b.weight_kg) || 0,
          grade: b.grade || 'B',
          status: b.status,
          selected: true
        })));
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

    fetchBatchAndBags();
  }, [organization, supabase, batchIdParam, toast]);

  const selectedBags = bags.filter(b => b.selected);
  const totalWeight = selectedBags.reduce((sum, b) => sum + b.weight, 0);

  const toggleBag = (bagId: string) => {
    setBags(prev => prev.map(b => 
      b.id === bagId ? { ...b, selected: !b.selected } : b
    ));
  };

  const selectAll = () => {
    setBags(prev => prev.map(b => ({ ...b, selected: true })));
  };

  const handleResolve = async () => {
    if (!supabase || !batch || !confirmLock) return;

    setIsResolving(true);

    try {
      const { error } = await supabase
        .from('collection_batches')
        .update({
          status: 'resolved',
          bag_count: selectedBags.length,
          total_weight: totalWeight.toString(),
          completed_at: new Date().toISOString()
        })
        .eq('id', batch.id);

      if (error) throw error;

      toast({
        title: 'Batch Resolved',
        description: `Batch ${batch.batch_id || batch.id} has been locked and is ready for dispatch`
      });

      router.push('/app/inventory');
    } catch (error) {
      console.error('Failed to resolve batch:', error);
      toast({
        title: 'Error',
        description: 'Failed to resolve batch',
        variant: 'destructive'
      });
    } finally {
      setIsResolving(false);
    }
  };

  const hasComplianceIssues = batch?.farm?.compliance_status !== 'verified';
  const weightMismatch = batch?.estimated_weight && Math.abs(totalWeight - batch.estimated_weight) > (batch.estimated_weight * 0.1);
  const bagCountMismatch = batch?.estimated_bags && selectedBags.length !== batch.estimated_bags;

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
        <Link href="/app/inventory">
          <Button>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Inventory
          </Button>
        </Link>
      </div>
    );
  }

  if (batch.status === 'resolved' || batch.status === 'dispatched') {
    return (
      <div className="text-center py-12">
        <Lock className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
        <h2 className="text-xl font-semibold mb-2">Batch Already Resolved</h2>
        <p className="text-muted-foreground mb-4">
          This batch has been locked and cannot be modified.
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

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href={`/app/bags?batch=${batch.id}`}>
          <Button variant="ghost" size="icon" aria-label="Back">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight" data-testid="text-page-title">
            Resolve & Lock Batch
          </h1>
          <p className="text-muted-foreground">
            Batch: {batch.batch_id || `#${batch.id}`}
          </p>
        </div>
      </div>

      {(hasComplianceIssues || weightMismatch || bagCountMismatch) && (
        <Card className="border-orange-500/50 bg-orange-50 dark:bg-orange-950/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-orange-600">
              <AlertTriangle className="h-5 w-5" />
              Warnings
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {hasComplianceIssues && (
              <p className="text-sm text-orange-700 dark:text-orange-400">
                Farm compliance status is not verified. This may affect export eligibility.
              </p>
            )}
            {bagCountMismatch && (
              <p className="text-sm text-orange-700 dark:text-orange-400">
                Bag count ({selectedBags.length}) differs from estimate ({batch.estimated_bags}).
              </p>
            )}
            {weightMismatch && (
              <p className="text-sm text-orange-700 dark:text-orange-400">
                Weight ({totalWeight.toFixed(1)} kg) differs significantly from estimate ({batch.estimated_weight} kg).
              </p>
            )}
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Package className="h-5 w-5" />
                    Select Bags for Resolution
                  </CardTitle>
                  <CardDescription>
                    {selectedBags.length} of {bags.length} bags selected
                  </CardDescription>
                </div>
                <Button variant="outline" size="sm" onClick={selectAll}>
                  Select All
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {bags.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <AlertTriangle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No bags to resolve. Add bags first.</p>
                  <Link href={`/app/bags?batch=${batch.id}`} className="mt-4 inline-block">
                    <Button variant="outline">Add Bags</Button>
                  </Link>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[50px]">Include</TableHead>
                        <TableHead>Bag ID</TableHead>
                        <TableHead>Weight</TableHead>
                        <TableHead>Grade</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {bags.map((bag) => (
                        <TableRow 
                          key={bag.id} 
                          className={!bag.selected ? 'opacity-50' : ''}
                          data-testid={`bag-row-${bag.id}`}
                        >
                          <TableCell>
                            <Checkbox
                              checked={bag.selected}
                              onCheckedChange={() => toggleBag(bag.id)}
                              data-testid={`checkbox-bag-${bag.id}`}
                            />
                          </TableCell>
                          <TableCell className="font-mono text-sm">
                            <div className="flex items-center gap-2">
                              <QrCode className="h-4 w-4 text-muted-foreground" />
                              {bag.bag_id}
                            </div>
                          </TableCell>
                          <TableCell>{bag.weight} kg</TableCell>
                          <TableCell>
                            <Badge variant="outline">Grade {bag.grade}</Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Scale className="h-5 w-5" />
                Resolution Summary
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                <span className="text-sm text-muted-foreground">Farmer</span>
                <span className="font-medium">{batch.farm.farmer_name}</span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                <span className="text-sm text-muted-foreground">Commodity</span>
                <span className="font-medium">{batch.commodity || '-'}</span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                <span className="text-sm text-muted-foreground">Total Bags</span>
                <span className="font-medium text-lg">{selectedBags.length}</span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-primary/10 border border-primary/20">
                <span className="text-sm font-medium">Final Weight</span>
                <span className="font-bold text-lg">{totalWeight.toFixed(1)} kg</span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                <span className="text-sm text-muted-foreground">Farm Status</span>
                <Badge variant={hasComplianceIssues ? 'secondary' : 'default'}>
                  {batch.farm.compliance_status}
                </Badge>
              </div>
            </CardContent>
          </Card>

          <Card className="border-primary/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lock className="h-5 w-5" />
                Lock Batch
              </CardTitle>
              <CardDescription>
                Once resolved, this batch cannot be modified
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                <Checkbox
                  id="confirm"
                  checked={confirmLock}
                  onCheckedChange={(checked) => setConfirmLock(checked === true)}
                  data-testid="checkbox-confirm-lock"
                />
                <label htmlFor="confirm" className="text-sm cursor-pointer">
                  I confirm that all bag weights are correct and this batch is ready for dispatch.
                </label>
              </div>

              <Button
                className="w-full min-h-[48px]"
                onClick={handleResolve}
                disabled={isResolving || !confirmLock || selectedBags.length === 0}
                data-testid="button-resolve-batch"
              >
                {isResolving ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <CheckCircle className="h-4 w-4 mr-2" />
                )}
                Resolve & Lock Batch
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
