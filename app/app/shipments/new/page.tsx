'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useOrg } from '@/lib/contexts/org-context';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import {
  Loader2,
  ArrowLeft,
  ArrowRight,
  Ship,
  Package,
  CheckCircle2,
  ClipboardCheck,
  Globe,
} from 'lucide-react';

interface CollectionBatch {
  id: string;
  farm_id: string;
  status: string;
  total_weight: number;
  bag_count: number;
  collected_at: string;
  farm_name?: string;
}

const STEPS = [
  { label: 'Shipment Details', icon: Ship },
  { label: 'Select Batches', icon: Package },
  { label: 'Review Compliance', icon: ClipboardCheck },
  { label: 'Confirm & Create', icon: CheckCircle2 },
];

export default function NewShipmentPage() {
  const router = useRouter();
  const { organization, isLoading: orgLoading } = useOrg();
  const { toast } = useToast();

  const [currentStep, setCurrentStep] = useState(0);
  const [isCreating, setIsCreating] = useState(false);
  const [batches, setBatches] = useState<CollectionBatch[]>([]);
  const [batchesLoading, setBatchesLoading] = useState(false);

  const [details, setDetails] = useState({
    destination_country: '',
    destination_port: '',
    commodity: '',
    buyer_company: '',
    estimated_ship_date: '',
  });

  const [selectedBatchIds, setSelectedBatchIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (currentStep === 1 && batches.length === 0) {
      fetchBatches();
    }
  }, [currentStep]);

  const fetchBatches = async () => {
    setBatchesLoading(true);
    try {
      const res = await fetch('/api/batches?status=completed');
      if (res.ok) {
        const data = await res.json();
        setBatches(data.batches || []);
      }
    } catch {
      toast({ title: 'Error', description: 'Failed to load batches', variant: 'destructive' });
    } finally {
      setBatchesLoading(false);
    }
  };

  const toggleBatch = (id: string) => {
    setSelectedBatchIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const selectedBatches = batches.filter(b => selectedBatchIds.has(b.id));
  const totalWeight = selectedBatches.reduce((sum, b) => sum + (Number(b.total_weight) || 0), 0);
  const totalBags = selectedBatches.reduce((sum, b) => sum + (b.bag_count || 0), 0);

  const complianceScore = selectedBatches.length > 0
    ? Math.min(100, Math.round(60 + (selectedBatches.length * 5) + (totalWeight > 0 ? 10 : 0) + (details.destination_country ? 10 : 0) + (details.commodity ? 5 : 0)))
    : 0;

  const complianceDecision = complianceScore >= 80 ? 'go' : complianceScore >= 50 ? 'conditional' : 'no_go';

  const canProceed = () => {
    if (currentStep === 0) {
      return details.destination_country.trim() !== '' && details.commodity.trim() !== '';
    }
    if (currentStep === 1) {
      return selectedBatchIds.size > 0;
    }
    return true;
  };

  const handleCreate = async () => {
    setIsCreating(true);
    try {
      const res = await fetch('/api/shipments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...details,
          batch_ids: Array.from(selectedBatchIds),
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to create shipment');
      }
      const data = await res.json();
      toast({ title: 'Shipment created', description: `Shipment ${data.shipment?.shipment_code || ''} has been created.` });
      router.push(`/app/shipments/${data.shipment?.id || ''}`);
    } catch (error: unknown) {
      toast({ title: 'Error', description: error instanceof Error ? error.message : 'Failed to create shipment', variant: 'destructive' });
    } finally {
      setIsCreating(false);
    }
  };

  if (orgLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex-1 space-y-6 p-6 max-w-3xl mx-auto">
      <div className="flex items-center gap-3 flex-wrap">
        <Button variant="ghost" size="icon" onClick={() => router.push('/app/shipments')} data-testid="button-back">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight" data-testid="text-page-title">
            New Shipment
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Create a shipment in 4 steps
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 flex-wrap" data-testid="wizard-steps">
        {STEPS.map((step, idx) => {
          const StepIcon = step.icon;
          const isActive = idx === currentStep;
          const isCompleted = idx < currentStep;
          return (
            <div key={step.label} className="flex items-center gap-2">
              {idx > 0 && <div className={`h-px w-6 ${isCompleted ? 'bg-foreground' : 'bg-muted-foreground/30'}`} />}
              <div
                className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm ${
                  isActive
                    ? 'bg-muted font-medium'
                    : isCompleted
                    ? 'text-foreground'
                    : 'text-muted-foreground'
                }`}
                data-testid={`step-${idx}`}
              >
                <StepIcon className="h-4 w-4" />
                <span className="hidden sm:inline">{step.label}</span>
                <span className="sm:hidden">{idx + 1}</span>
              </div>
            </div>
          );
        })}
      </div>

      {currentStep === 0 && (
        <Card data-testid="step-details">
          <CardHeader>
            <CardTitle>Shipment Details</CardTitle>
            <CardDescription>Enter the basic shipment information</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="destination_country">Destination Country *</Label>
              <Input
                id="destination_country"
                placeholder="e.g. Netherlands, Germany, USA"
                value={details.destination_country}
                onChange={e => setDetails(d => ({ ...d, destination_country: e.target.value }))}
                data-testid="input-destination-country"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="destination_port">Destination Port</Label>
              <Input
                id="destination_port"
                placeholder="e.g. Rotterdam, Hamburg"
                value={details.destination_port}
                onChange={e => setDetails(d => ({ ...d, destination_port: e.target.value }))}
                data-testid="input-destination-port"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="commodity">Commodity *</Label>
              <Input
                id="commodity"
                placeholder="e.g. Cocoa, Coffee, Cashew"
                value={details.commodity}
                onChange={e => setDetails(d => ({ ...d, commodity: e.target.value }))}
                data-testid="input-commodity"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="buyer_company">Buyer Company</Label>
              <Input
                id="buyer_company"
                placeholder="e.g. Barry Callebaut"
                value={details.buyer_company}
                onChange={e => setDetails(d => ({ ...d, buyer_company: e.target.value }))}
                data-testid="input-buyer-company"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="estimated_ship_date">Estimated Ship Date</Label>
              <Input
                id="estimated_ship_date"
                type="date"
                value={details.estimated_ship_date}
                onChange={e => setDetails(d => ({ ...d, estimated_ship_date: e.target.value }))}
                data-testid="input-ship-date"
              />
            </div>
          </CardContent>
        </Card>
      )}

      {currentStep === 1 && (
        <Card data-testid="step-batches">
          <CardHeader>
            <CardTitle>Select Batches</CardTitle>
            <CardDescription>
              Choose the collection batches to include in this shipment ({selectedBatchIds.size} selected)
            </CardDescription>
          </CardHeader>
          <CardContent>
            {batchesLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : batches.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Package className="h-10 w-10 mx-auto mb-3 text-muted-foreground/50" />
                <p>No completed batches available</p>
                <p className="text-xs mt-1">Complete some collection batches first</p>
              </div>
            ) : (
              <div className="space-y-2">
                {batches.map(batch => (
                  <div
                    key={batch.id}
                    className={`flex items-center gap-3 p-3 rounded-md border cursor-pointer ${
                      selectedBatchIds.has(batch.id) ? 'border-foreground/30 bg-muted/50' : 'border-transparent bg-muted/20'
                    }`}
                    onClick={() => toggleBatch(batch.id)}
                    data-testid={`batch-item-${batch.id}`}
                  >
                    <Checkbox
                      checked={selectedBatchIds.has(batch.id)}
                      onCheckedChange={() => toggleBatch(batch.id)}
                      data-testid={`checkbox-batch-${batch.id}`}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-medium font-mono">{batch.id.slice(0, 8)}</span>
                        <Badge variant="outline">{batch.status}</Badge>
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground flex-wrap">
                        <span>{Number(batch.total_weight || 0).toLocaleString()} kg</span>
                        <span>{batch.bag_count || 0} bags</span>
                        <span>{new Date(batch.collected_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {currentStep === 2 && (
        <Card data-testid="step-compliance">
          <CardHeader>
            <CardTitle>Compliance Review</CardTitle>
            <CardDescription>Review the estimated compliance score for this shipment</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center gap-6 flex-wrap">
              <div className="text-center">
                <p className="text-5xl font-bold" data-testid="text-compliance-score">{complianceScore}</p>
                <p className="text-sm text-muted-foreground mt-1">Compliance Score</p>
              </div>
              <div>
                <Badge
                  variant={complianceDecision === 'go' ? 'default' : complianceDecision === 'conditional' ? 'secondary' : 'destructive'}
                  data-testid="badge-compliance-decision"
                >
                  {complianceDecision === 'go' ? 'Ready to Ship' : complianceDecision === 'conditional' ? 'Conditional' : 'Not Ready'}
                </Badge>
              </div>
            </div>

            <div className="space-y-3">
              <h3 className="text-sm font-medium">Shipment Summary</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 bg-muted/30 rounded-md">
                  <p className="text-xs text-muted-foreground">Destination</p>
                  <p className="text-sm font-medium" data-testid="text-review-destination">
                    {details.destination_country}{details.destination_port ? ` (${details.destination_port})` : ''}
                  </p>
                </div>
                <div className="p-3 bg-muted/30 rounded-md">
                  <p className="text-xs text-muted-foreground">Commodity</p>
                  <p className="text-sm font-medium" data-testid="text-review-commodity">{details.commodity}</p>
                </div>
                <div className="p-3 bg-muted/30 rounded-md">
                  <p className="text-xs text-muted-foreground">Total Weight</p>
                  <p className="text-sm font-medium" data-testid="text-review-weight">{totalWeight.toLocaleString()} kg</p>
                </div>
                <div className="p-3 bg-muted/30 rounded-md">
                  <p className="text-xs text-muted-foreground">Batches / Bags</p>
                  <p className="text-sm font-medium" data-testid="text-review-counts">
                    {selectedBatchIds.size} batches / {totalBags} bags
                  </p>
                </div>
              </div>
            </div>

            {details.buyer_company && (
              <div className="p-3 bg-muted/30 rounded-md">
                <p className="text-xs text-muted-foreground">Buyer</p>
                <p className="text-sm font-medium" data-testid="text-review-buyer">{details.buyer_company}</p>
              </div>
            )}

            <div className="space-y-2">
              <h3 className="text-sm font-medium">Compliance Factors</h3>
              <div className="space-y-1 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />
                  <span>Batch traceability data available</span>
                </div>
                {details.destination_country && (
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />
                    <span>Destination country specified</span>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <Globe className="h-3.5 w-3.5 text-muted-foreground" />
                  <span>Full compliance score will be calculated after creation</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {currentStep === 3 && (
        <Card data-testid="step-confirm">
          <CardHeader>
            <CardTitle>Confirm & Create</CardTitle>
            <CardDescription>Review all details before creating the shipment</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-4 py-2 border-b flex-wrap">
                <span className="text-sm text-muted-foreground">Destination</span>
                <span className="text-sm font-medium" data-testid="text-confirm-destination">
                  {details.destination_country}{details.destination_port ? `, ${details.destination_port}` : ''}
                </span>
              </div>
              <div className="flex items-center justify-between gap-4 py-2 border-b flex-wrap">
                <span className="text-sm text-muted-foreground">Commodity</span>
                <span className="text-sm font-medium" data-testid="text-confirm-commodity">{details.commodity}</span>
              </div>
              {details.buyer_company && (
                <div className="flex items-center justify-between gap-4 py-2 border-b flex-wrap">
                  <span className="text-sm text-muted-foreground">Buyer</span>
                  <span className="text-sm font-medium" data-testid="text-confirm-buyer">{details.buyer_company}</span>
                </div>
              )}
              {details.estimated_ship_date && (
                <div className="flex items-center justify-between gap-4 py-2 border-b flex-wrap">
                  <span className="text-sm text-muted-foreground">Ship Date</span>
                  <span className="text-sm font-medium" data-testid="text-confirm-date">{details.estimated_ship_date}</span>
                </div>
              )}
              <div className="flex items-center justify-between gap-4 py-2 border-b flex-wrap">
                <span className="text-sm text-muted-foreground">Batches</span>
                <span className="text-sm font-medium" data-testid="text-confirm-batches">{selectedBatchIds.size}</span>
              </div>
              <div className="flex items-center justify-between gap-4 py-2 border-b flex-wrap">
                <span className="text-sm text-muted-foreground">Total Weight</span>
                <span className="text-sm font-medium" data-testid="text-confirm-weight">{totalWeight.toLocaleString()} kg</span>
              </div>
              <div className="flex items-center justify-between gap-4 py-2 flex-wrap">
                <span className="text-sm text-muted-foreground">Compliance Score</span>
                <Badge
                  variant={complianceDecision === 'go' ? 'default' : complianceDecision === 'conditional' ? 'secondary' : 'destructive'}
                  data-testid="badge-confirm-decision"
                >
                  {complianceScore} - {complianceDecision === 'go' ? 'Ready' : complianceDecision === 'conditional' ? 'Conditional' : 'Not Ready'}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex items-center justify-between gap-4 flex-wrap">
        <Button
          variant="outline"
          onClick={() => setCurrentStep(s => Math.max(0, s - 1))}
          disabled={currentStep === 0}
          data-testid="button-prev-step"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>

        {currentStep < 3 ? (
          <Button
            onClick={() => setCurrentStep(s => s + 1)}
            disabled={!canProceed()}
            data-testid="button-next-step"
          >
            Next
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        ) : (
          <Button
            onClick={handleCreate}
            disabled={isCreating}
            data-testid="button-create-shipment"
          >
            {isCreating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Create Shipment
          </Button>
        )}
      </div>
    </div>
  );
}
