'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetFooter } from '@/components/ui/sheet';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, AlertTriangle, CheckCircle2, XCircle, Eye, Scale, TrendingUp, TrendingDown, Minus, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { useOrg } from '@/lib/contexts/org-context';
import { TierGate } from '@/components/tier-gate';

interface FlaggedBatch {
  id: number;
  farm_id: number;
  total_weight: number;
  status: string;
  yield_flag_reason: string | null;
  created_at: string;
  farms: {
    id: number;
    farmer_name: string;
    area_hectares: number;
    commodity: string;
  } | null;
}

interface CropStandard {
  id: number;
  commodity: string;
  region: string;
  avg_yield_per_hectare: number;
  unit: string;
}

export default function YieldAlertsPage() {
  const [flaggedBatches, setFlaggedBatches] = useState<FlaggedBatch[]>([]);
  const [cropStandards, setCropStandards] = useState<CropStandard[]>([]);
  const [selectedBatch, setSelectedBatch] = useState<FlaggedBatch | null>(null);
  const [reviewNotes, setReviewNotes] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const { profile } = useOrg();
  const { toast } = useToast();

  const [predictions, setPredictions] = useState<any[]>([]);
  const [commoditySummary, setCommoditySummary] = useState<Record<string, any>>({});
  const [isPredictionsLoading, setIsPredictionsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('alerts');

  const canReview = profile?.role === 'admin';

  useEffect(() => {
    fetchFlaggedBatches();
  }, []);

  const fetchFlaggedBatches = async () => {
    try {
      const response = await fetch('/api/yield-validation');
      if (response.ok) {
        const data = await response.json();
        setFlaggedBatches(data.flaggedBatches || []);
        setCropStandards(data.cropStandards || []);
      }
    } catch (error) {
      console.error('Failed to fetch flagged batches:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleReview = async (action: 'approve' | 'reject') => {
    if (!selectedBatch) return;

    setIsProcessing(true);
    try {
      const response = await fetch('/api/yield-validation', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          batch_id: selectedBatch.id,
          action,
          notes: reviewNotes
        })
      });

      if (response.ok) {
        toast({
          title: action === 'approve' ? 'Batch Approved' : 'Batch Rejected',
          description: `Batch #${selectedBatch.id} has been ${action}d.`
        });
        fetchFlaggedBatches();
        setSelectedBatch(null);
        setReviewNotes('');
      } else {
        throw new Error('Failed to update');
      }
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to process batch.', variant: 'destructive' });
    } finally {
      setIsProcessing(false);
    }
  };

  const fetchPredictions = async () => {
    setIsPredictionsLoading(true);
    try {
      const response = await fetch('/api/yield-predictions');
      if (response.ok) {
        const data = await response.json();
        setPredictions(data.predictions || []);
        setCommoditySummary(data.commoditySummary || {});
      }
    } catch (error) {
      console.error('Failed to fetch predictions:', error);
    } finally {
      setIsPredictionsLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'predictions' && predictions.length === 0) {
      fetchPredictions();
    }
  }, [activeTab]);

  const calculateExpectedYield = (batch: FlaggedBatch) => {
    if (!batch.farms?.area_hectares || !batch.farms?.commodity) return null;
    
    const standard = cropStandards.find(
      s => s.commodity.toLowerCase() === batch.farms?.commodity?.toLowerCase()
    );
    
    if (!standard) return null;
    
    const expected = batch.farms.area_hectares * standard.avg_yield_per_hectare;
    const threshold = expected * 1.2;
    const percentOver = ((batch.total_weight - threshold) / threshold) * 100;
    
    return { expected, threshold, percentOver };
  };

  return (
    <TierGate feature="yield_alerts" requiredTier="basic" featureLabel="Yield Alerts">
    {isLoading ? (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    ) : (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <AlertTriangle className="h-6 w-6 text-amber-500" />
          Yield Alerts & Predictions
        </h1>
        <p className="text-muted-foreground">Review flagged batches and view yield forecasts</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="alerts" data-testid="tab-alerts">
            <AlertTriangle className="h-4 w-4 mr-1" />
            Alerts {flaggedBatches.length > 0 && <Badge variant="destructive" className="ml-1 text-xs">{flaggedBatches.length}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="predictions" data-testid="tab-predictions">
            <TrendingUp className="h-4 w-4 mr-1" />
            Predictions
          </TabsTrigger>
        </TabsList>

        <TabsContent value="alerts" className="space-y-6 mt-4">
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 gap-2">
            <CardTitle className="text-sm font-medium">Pending Review</CardTitle>
            <AlertTriangle className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{flaggedBatches.length}</div>
            <p className="text-xs text-muted-foreground">Batches requiring attention</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Yield Standards</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              {cropStandards.slice(0, 3).map((standard) => (
                <div key={standard.id} className="flex justify-between text-sm">
                  <span className="capitalize">{standard.commodity}</span>
                  <span className="text-muted-foreground">{standard.avg_yield_per_hectare} kg/ha</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Flagging Rule</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Batches are flagged when weight exceeds <strong>120%</strong> of expected yield based on farm area and crop standards.
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Flagged Batches</CardTitle>
          <CardDescription>Review and approve or reject batches with yield anomalies</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Batch ID</TableHead>
                <TableHead>Farmer</TableHead>
                <TableHead>Commodity</TableHead>
                <TableHead className="text-right">Farm Area</TableHead>
                <TableHead className="text-right">Expected Max</TableHead>
                <TableHead className="text-right">Actual Weight</TableHead>
                <TableHead className="text-right">% Over</TableHead>
                <TableHead>Date</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {flaggedBatches.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-8">
                    <div className="flex flex-col items-center gap-2 text-muted-foreground">
                      <CheckCircle2 className="h-8 w-8 text-green-500" />
                      <span>No flagged batches - all yields within expected range</span>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                flaggedBatches.map((batch) => {
                  const calc = calculateExpectedYield(batch);
                  return (
                    <TableRow key={batch.id} data-testid={`yield-batch-${batch.id}`}>
                      <TableCell className="font-mono">#{batch.id}</TableCell>
                      <TableCell className="font-medium">{batch.farms?.farmer_name || 'Unknown'}</TableCell>
                      <TableCell className="capitalize">{batch.farms?.commodity || '-'}</TableCell>
                      <TableCell className="text-right">{batch.farms?.area_hectares?.toFixed(2) || '-'} ha</TableCell>
                      <TableCell className="text-right">
                        {calc ? `${Math.round(calc.threshold).toLocaleString()} kg` : '-'}
                      </TableCell>
                      <TableCell className="text-right font-medium text-amber-600">
                        {Number(batch.total_weight).toLocaleString()} kg
                      </TableCell>
                      <TableCell className="text-right">
                        {calc ? (
                          <Badge variant="destructive">+{Math.round(calc.percentOver)}%</Badge>
                        ) : '-'}
                      </TableCell>
                      <TableCell>{new Date(batch.created_at).toLocaleDateString()}</TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setSelectedBatch(batch);
                            setReviewNotes('');
                          }}
                          data-testid={`button-review-${batch.id}`}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
        </TabsContent>

        <TabsContent value="predictions" className="space-y-6 mt-4">
          {isPredictionsLoading ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <>
              {Object.keys(commoditySummary).length > 0 && (
                <div className="grid gap-4 sm:grid-cols-3">
                  {Object.entries(commoditySummary).map(([commodity, summary]: [string, any]) => (
                    <Card key={commodity}>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium capitalize">{commodity}</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold" data-testid={`text-predicted-total-${commodity}`}>
                          {(summary.totalPredictedKg / 1000).toFixed(1)} t
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {summary.farmCount} farm(s) · {summary.avgYieldPerHa} kg/ha avg
                        </p>
                        {summary.atRiskCount > 0 && (
                          <Badge variant="destructive" className="mt-2" data-testid={`badge-at-risk-${commodity}`}>
                            {summary.atRiskCount} at risk
                          </Badge>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}

              <Card>
                <CardHeader>
                  <CardTitle>Farm Yield Forecasts</CardTitle>
                  <CardDescription>Predicted yields by farm with trend and risk indicators</CardDescription>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Farmer</TableHead>
                        <TableHead>Commodity</TableHead>
                        <TableHead className="text-right">Area (ha)</TableHead>
                        <TableHead className="text-right">Predicted Yield</TableHead>
                        <TableHead className="text-right">Confidence Range</TableHead>
                        <TableHead>Trend</TableHead>
                        <TableHead>Risk</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {predictions.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center py-8">
                            <div className="flex flex-col items-center gap-2 text-muted-foreground">
                              <TrendingUp className="h-8 w-8" />
                              <span>No prediction data available. Add farms with collection history to see forecasts.</span>
                            </div>
                          </TableCell>
                        </TableRow>
                      ) : (
                        predictions.map((pred) => (
                          <TableRow key={pred.farmId} data-testid={`prediction-farm-${pred.farmId}`}>
                            <TableCell className="font-medium">{pred.farmerName}</TableCell>
                            <TableCell className="capitalize">{pred.commodity}</TableCell>
                            <TableCell className="text-right">{pred.areaHa.toFixed(2)}</TableCell>
                            <TableCell className="text-right font-medium">
                              {(pred.predictedYieldKg / 1000).toFixed(1)} t
                            </TableCell>
                            <TableCell className="text-right text-muted-foreground text-xs">
                              {(pred.confidenceRange.low / 1000).toFixed(1)} – {(pred.confidenceRange.high / 1000).toFixed(1)} t
                            </TableCell>
                            <TableCell>
                              {pred.trend === 'improving' && (
                                <span className="flex items-center gap-1 text-green-600 text-sm">
                                  <ArrowUpRight className="h-3 w-3" /> Up
                                </span>
                              )}
                              {pred.trend === 'declining' && (
                                <span className="flex items-center gap-1 text-red-600 text-sm">
                                  <ArrowDownRight className="h-3 w-3" /> Down
                                </span>
                              )}
                              {pred.trend === 'stable' && (
                                <span className="flex items-center gap-1 text-muted-foreground text-sm">
                                  <Minus className="h-3 w-3" /> Stable
                                </span>
                              )}
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant={pred.risk === 'high' ? 'destructive' : pred.risk === 'medium' ? 'secondary' : 'outline'}
                                data-testid={`badge-risk-${pred.farmId}`}
                              >
                                {pred.risk}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>
      </Tabs>

      <Sheet open={!!selectedBatch} onOpenChange={(open) => !open && setSelectedBatch(null)}>
        <SheetContent className="sm:max-w-lg">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <Scale className="h-5 w-5" />
              Review Batch #{selectedBatch?.id}
            </SheetTitle>
            <SheetDescription>Review yield anomaly and approve or reject</SheetDescription>
          </SheetHeader>

          {selectedBatch && (
            <div className="space-y-6 py-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground">Farmer</Label>
                  <p className="font-medium">{selectedBatch.farms?.farmer_name || 'Unknown'}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Commodity</Label>
                  <p className="font-medium capitalize">{selectedBatch.farms?.commodity || '-'}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Farm Area</Label>
                  <p className="font-medium">{selectedBatch.farms?.area_hectares?.toFixed(2) || '-'} hectares</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Reported Weight</Label>
                  <p className="font-medium text-amber-600">{Number(selectedBatch.total_weight).toLocaleString()} kg</p>
                </div>
              </div>

              {(() => {
                const calc = calculateExpectedYield(selectedBatch);
                return calc ? (
                  <Card className="border-amber-500 bg-amber-50 dark:bg-amber-950/20">
                    <CardContent className="pt-4">
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span>Expected yield (avg)</span>
                          <span>{Math.round(calc.expected).toLocaleString()} kg</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Maximum threshold (120%)</span>
                          <span>{Math.round(calc.threshold).toLocaleString()} kg</span>
                        </div>
                        <div className="flex justify-between font-medium text-amber-700 dark:text-amber-400">
                          <span>Amount over threshold</span>
                          <span>+{Math.round(calc.percentOver)}%</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ) : null;
              })()}

              <div className="space-y-2">
                <Label htmlFor="review-notes">Review Notes</Label>
                <Textarea
                  id="review-notes"
                  value={reviewNotes}
                  onChange={(e) => setReviewNotes(e.target.value)}
                  placeholder="Add notes about your decision..."
                  rows={3}
                  data-testid="textarea-review-notes"
                />
              </div>
            </div>
          )}

          <SheetFooter className="flex gap-2">
            {canReview ? (
              <>
                <Button
                  variant="destructive"
                  onClick={() => handleReview('reject')}
                  disabled={isProcessing}
                  className="flex-1"
                  data-testid="button-reject-batch"
                >
                  {isProcessing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <XCircle className="h-4 w-4 mr-2" />}
                  Reject
                </Button>
                <Button
                  onClick={() => handleReview('approve')}
                  disabled={isProcessing}
                  className="flex-1"
                  data-testid="button-approve-batch"
                >
                  {isProcessing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <CheckCircle2 className="h-4 w-4 mr-2" />}
                  Approve
                </Button>
              </>
            ) : (
              <p className="text-sm text-muted-foreground w-full text-center py-2">
                Read-only view. Contact your admin to approve or reject batches.
              </p>
            )}
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
    )}
    </TierGate>
  );
}
