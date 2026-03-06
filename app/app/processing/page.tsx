'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { useOrg } from '@/lib/contexts/org-context';
import { 
  Factory, 
  Plus, 
  Scale,
  CheckCircle, 
  AlertTriangle,
  Package,
  Loader2,
  ArrowRight,
  Shield,
} from 'lucide-react';
import { TierGate } from '@/components/tier-gate';

interface ProcessingRun {
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
  processed_at: string;
  batch_count?: number;
}

interface CollectionBatch {
  id: string;
  batch_code: string;
  commodity: string;
  total_weight: number;
  created_at: string;
}

interface CommodityMaster {
  id: number;
  name: string;
  code: string;
  category: string;
  unit: string;
  is_active: boolean;
  is_global: boolean;
}

export default function ProcessingPage() {
  const [processingRuns, setProcessingRuns] = useState<ProcessingRun[]>([]);
  const [availableBatches, setAvailableBatches] = useState<CollectionBatch[]>([]);
  const [commodities, setCommodities] = useState<CommodityMaster[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [selectedBatches, setSelectedBatches] = useState<string[]>([]);
  const { toast } = useToast();
  const { organization } = useOrg();
  const [processingCompliance, setProcessingCompliance] = useState<Record<string, boolean>>({});

  const [newRun, setNewRun] = useState({
    facility_name: '',
    facility_location: '',
    commodity: '',
    product_type: '',
    input_weight_kg: '',
    output_weight_kg: '',
    processed_at: new Date().toISOString().split('T')[0]
  });

  const productTypes: Record<string, { value: string; label: string; recovery: number }[]> = {
    cocoa: [
      { value: 'cocoa_butter', label: 'Cocoa Butter', recovery: 41.6 },
      { value: 'cocoa_powder', label: 'Cocoa Powder', recovery: 22 },
      { value: 'cocoa_liquor', label: 'Cocoa Liquor', recovery: 82 },
      { value: 'cocoa_nibs', label: 'Cocoa Nibs', recovery: 87 }
    ],
    cashew: [
      { value: 'cashew_kernel', label: 'Cashew Kernel', recovery: 25 },
      { value: 'cashew_butter', label: 'Cashew Butter', recovery: 20 }
    ],
    palm_kernel: [
      { value: 'palm_kernel_oil', label: 'Palm Kernel Oil', recovery: 45 }
    ],
    ginger: [
      { value: 'ginger_powder', label: 'Ginger Powder', recovery: 15 },
      { value: 'ginger_extract', label: 'Ginger Extract', recovery: 8 }
    ],
    rubber: [
      { value: 'dry_rubber_content', label: 'Dry Rubber Content', recovery: 30 }
    ],
    shea: [
      { value: 'shea_butter', label: 'Shea Butter', recovery: 45 },
      { value: 'shea_oil', label: 'Shea Oil', recovery: 35 }
    ],
    sesame: [
      { value: 'sesame_oil', label: 'Sesame Oil', recovery: 45 },
      { value: 'sesame_paste', label: 'Sesame Paste', recovery: 85 }
    ],
    coffee: [
      { value: 'roasted_beans', label: 'Roasted Beans', recovery: 85 },
      { value: 'green_beans', label: 'Green Beans', recovery: 95 }
    ],
    hibiscus: [
      { value: 'dried_calyx', label: 'Dried Calyx', recovery: 10 },
      { value: 'hibiscus_extract', label: 'Hibiscus Extract', recovery: 5 }
    ],
    groundnut: [
      { value: 'groundnut_oil', label: 'Groundnut Oil', recovery: 45 },
      { value: 'groundnut_cake', label: 'Groundnut Cake', recovery: 50 }
    ],
    maize: [
      { value: 'maize_flour', label: 'Maize Flour', recovery: 80 },
      { value: 'corn_oil', label: 'Corn Oil', recovery: 4 }
    ],
    soybean: [
      { value: 'soybean_oil', label: 'Soybean Oil', recovery: 18 },
      { value: 'soybean_meal', label: 'Soybean Meal', recovery: 78 }
    ]
  };

  useEffect(() => {
    fetchData();
    fetchCommodities();
  }, []);

  async function fetchCommodities() {
    try {
      const res = await fetch('/api/commodities?global_only=true');
      if (res.ok) {
        const data = await res.json();
        const activeCommodities = (data.commodities || []).filter((c: CommodityMaster) => c.is_active);
        setCommodities(activeCommodities);
        if (activeCommodities.length > 0 && !newRun.commodity) {
          const firstCode = activeCommodities[0].code.toLowerCase();
          const availableProducts = productTypes[firstCode] || [{ value: 'processed', label: 'Processed', recovery: 50 }];
          setNewRun(prev => ({ 
            ...prev, 
            commodity: firstCode,
            product_type: availableProducts[0]?.value || 'processed'
          }));
        }
      }
    } catch (error) {
      console.error('Failed to fetch commodities:', error);
    }
  }

  async function fetchData() {
    try {
      const [runsRes, batchesRes] = await Promise.all([
        fetch('/api/processing-runs'),
        fetch('/api/batches')
      ]);
      
      if (runsRes.ok) {
        const data = await runsRes.json();
        setProcessingRuns(data.processingRuns || []);
      }
      
      if (batchesRes.ok) {
        const data = await batchesRes.json();
        setAvailableBatches(data.batches || []);
      }
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  }

  async function createProcessingRun() {
    if (!newRun.facility_name || !newRun.input_weight_kg || !newRun.output_weight_kg) {
      toast({
        title: 'Missing fields',
        description: 'Please fill in all required fields',
        variant: 'destructive'
      });
      return;
    }

    setCreating(true);
    try {
      const res = await fetch('/api/processing-runs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newRun,
          input_weight_kg: parseFloat(newRun.input_weight_kg),
          output_weight_kg: parseFloat(newRun.output_weight_kg),
          batch_ids: selectedBatches,
          compliance_attestations: processingCompliance
        })
      });

      if (res.ok) {
        const data = await res.json();
        setProcessingRuns([data.processingRun, ...processingRuns]);
        setSheetOpen(false);
        toast({
          title: 'Processing run created',
          description: `Run ${data.processingRun.run_code} created successfully`
        });
        resetForm();
      } else {
        const error = await res.json();
        toast({
          title: 'Error',
          description: error.error || 'Failed to create processing run',
          variant: 'destructive'
        });
      }
    } catch (error) {
      console.error('Failed to create processing run:', error);
      toast({
        title: 'Error',
        description: 'Failed to create processing run',
        variant: 'destructive'
      });
    } finally {
      setCreating(false);
    }
  }

  function resetForm() {
    const defaultCommodity = commodities.length > 0 ? commodities[0].code.toLowerCase() : '';
    const defaultProductType = productTypes[defaultCommodity]?.[0]?.value || '';
    setNewRun({
      facility_name: '',
      facility_location: '',
      commodity: defaultCommodity,
      product_type: defaultProductType,
      input_weight_kg: '',
      output_weight_kg: '',
      processed_at: new Date().toISOString().split('T')[0]
    });
    setSelectedBatches([]);
    setProcessingCompliance({});
  }

  function toggleBatchSelection(batchId: string) {
    setSelectedBatches(prev => 
      prev.includes(batchId)
        ? prev.filter(id => id !== batchId)
        : [...prev, batchId]
    );
  }

  const formatDate = (dateStr: string) => {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  const calculateRecoveryRate = () => {
    const input = parseFloat(newRun.input_weight_kg);
    const output = parseFloat(newRun.output_weight_kg);
    if (input > 0 && output > 0) {
      return ((output / input) * 100).toFixed(1);
    }
    return '0.0';
  };

  const getExpectedRecovery = () => {
    const types = productTypes[newRun.commodity] || [{ value: 'processed', label: 'Processed', recovery: 50 }];
    const selected = types.find(t => t.value === newRun.product_type);
    return selected?.recovery || 50;
  };

  const totalInputWeight = processingRuns.reduce((sum, r) => sum + (r.input_weight_kg || 0), 0);
  const totalOutputWeight = processingRuns.reduce((sum, r) => sum + (r.output_weight_kg || 0), 0);
  const validRuns = processingRuns.filter(r => r.mass_balance_valid).length;

  return (
    <TierGate feature="processing" requiredTier="enterprise" featureLabel="Processing Runs">
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Factory className="h-6 w-6 text-orange-600" />
            Processing Runs
          </h1>
          <p className="text-muted-foreground">
            Manage factory processing runs with mass balance validation
          </p>
        </div>
        <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
          <SheetTrigger asChild>
            <Button data-testid="button-create-run">
              <Plus className="h-4 w-4 mr-2" />
              New Processing Run
            </Button>
          </SheetTrigger>
          <SheetContent className="w-[400px] sm:w-[540px] overflow-y-auto">
            <SheetHeader>
              <SheetTitle>Create Processing Run</SheetTitle>
              <SheetDescription>
                Record a new factory processing session with input/output weights for mass balance tracking
              </SheetDescription>
            </SheetHeader>
            <div className="space-y-4 mt-6">
              <div>
                <Label htmlFor="facility_name">Facility Name *</Label>
                <Input
                  id="facility_name"
                  value={newRun.facility_name}
                  onChange={(e) => setNewRun({ ...newRun, facility_name: e.target.value })}
                  placeholder="e.g., Lagos Processing Plant"
                  data-testid="input-facility-name"
                />
              </div>

              <div>
                <Label htmlFor="facility_location">Facility Location</Label>
                <Input
                  id="facility_location"
                  value={newRun.facility_location}
                  onChange={(e) => setNewRun({ ...newRun, facility_location: e.target.value })}
                  placeholder="e.g., Lagos, Nigeria"
                  data-testid="input-facility-location"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="commodity">Commodity</Label>
                  <Select
                    value={newRun.commodity}
                    onValueChange={(value) => {
                      const types = productTypes[value] || [];
                      setNewRun({ 
                        ...newRun, 
                        commodity: value,
                        product_type: types[0]?.value || ''
                      });
                    }}
                  >
                    <SelectTrigger data-testid="select-commodity">
                      <SelectValue placeholder="Select commodity" />
                    </SelectTrigger>
                    <SelectContent>
                      {commodities.map((c) => (
                        <SelectItem key={c.id} value={c.code.toLowerCase()}>
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="product_type">Product Type</Label>
                  <Select
                    value={newRun.product_type}
                    onValueChange={(value) => setNewRun({ ...newRun, product_type: value })}
                  >
                    <SelectTrigger data-testid="select-product-type">
                      <SelectValue placeholder="Select product" />
                    </SelectTrigger>
                    <SelectContent>
                      {(productTypes[newRun.commodity] || [{ value: 'processed', label: 'Processed', recovery: 50 }]).map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label} ({type.recovery}%)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="input_weight">Input Weight (kg) *</Label>
                  <Input
                    id="input_weight"
                    type="number"
                    value={newRun.input_weight_kg}
                    onChange={(e) => setNewRun({ ...newRun, input_weight_kg: e.target.value })}
                    placeholder="1000"
                    data-testid="input-input-weight"
                  />
                </div>
                <div>
                  <Label htmlFor="output_weight">Output Weight (kg) *</Label>
                  <Input
                    id="output_weight"
                    type="number"
                    value={newRun.output_weight_kg}
                    onChange={(e) => setNewRun({ ...newRun, output_weight_kg: e.target.value })}
                    placeholder="416"
                    data-testid="input-output-weight"
                  />
                </div>
              </div>

              {newRun.input_weight_kg && newRun.output_weight_kg && (
                <Card className="bg-muted/50">
                  <CardContent className="pt-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">Calculated Recovery Rate</p>
                        <p className="text-2xl font-bold">{calculateRecoveryRate()}%</p>
                      </div>
                      <ArrowRight className="h-6 w-6 text-muted-foreground" />
                      <div>
                        <p className="text-sm text-muted-foreground">Expected Rate</p>
                        <p className="text-2xl font-bold text-muted-foreground">{getExpectedRecovery()}%</p>
                      </div>
                    </div>
                    {Math.abs(parseFloat(calculateRecoveryRate()) - getExpectedRecovery()) > 5 && (
                      <div className="mt-2 flex items-center gap-2 text-amber-600">
                        <AlertTriangle className="h-4 w-4" />
                        <span className="text-sm">Variance exceeds 5% tolerance</span>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              <div>
                <Label htmlFor="processed_at">Processing Date</Label>
                <Input
                  id="processed_at"
                  type="date"
                  value={newRun.processed_at}
                  onChange={(e) => setNewRun({ ...newRun, processed_at: e.target.value })}
                  data-testid="input-processed-at"
                />
              </div>

              {availableBatches.length > 0 && (
                <div>
                  <Label>Link Source Batches (Optional)</Label>
                  <div className="mt-2 max-h-40 overflow-y-auto border rounded-md p-2 space-y-1">
                    {availableBatches.map((batch) => (
                      <div
                        key={batch.id}
                        className={`flex items-center justify-between p-2 rounded cursor-pointer transition-colors ${
                          selectedBatches.includes(batch.id)
                            ? 'bg-green-100 dark:bg-green-900/30'
                            : 'hover:bg-muted'
                        }`}
                        onClick={() => toggleBatchSelection(batch.id)}
                        data-testid={`batch-option-${batch.id}`}
                      >
                        <div>
                          <p className="font-medium text-sm">{batch.batch_code}</p>
                          <p className="text-xs text-muted-foreground">
                            {batch.commodity} · {batch.total_weight}kg
                          </p>
                        </div>
                        {selectedBatches.includes(batch.id) && (
                          <CheckCircle className="h-4 w-4 text-green-600" />
                        )}
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {selectedBatches.length} batch(es) selected
                  </p>
                </div>
              )}

              {(() => {
                const cs = (organization?.settings || {}) as Record<string, boolean>;
                const hasOrganic = !!cs.organic_segregation;
                const hasLacey = !!cs.lacey_chain_of_custody;
                const hasFSMA = !!cs.fsma_lot_traceability;
                if (!hasOrganic && !hasLacey && !hasFSMA) return null;
                return (
                  <div className="space-y-3 pt-2 border-t">
                    <div className="flex items-center gap-2">
                      <Shield className="h-4 w-4 text-primary" />
                      <span className="text-sm font-medium">Compliance Checks</span>
                    </div>
                    {hasOrganic && (
                      <div className="p-3 rounded-md border bg-muted/20 space-y-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-medium">Organic Segregation</span>
                          <Badge variant="outline" className="text-xs">EU Organic</Badge>
                        </div>
                        <label className="flex items-center gap-2 text-sm">
                          <input type="checkbox" className="rounded" data-testid="check-organic-processing-segregation" checked={!!processingCompliance.organic_processing_segregation} onChange={(e) => setProcessingCompliance(prev => ({...prev, organic_processing_segregation: e.target.checked}))} />
                          Organic produce processed separately from conventional
                        </label>
                        <label className="flex items-center gap-2 text-sm">
                          <input type="checkbox" className="rounded" data-testid="check-clean-equipment" checked={!!processingCompliance.clean_equipment} onChange={(e) => setProcessingCompliance(prev => ({...prev, clean_equipment: e.target.checked}))} />
                          Equipment cleaned between organic and conventional runs
                        </label>
                      </div>
                    )}
                    {hasLacey && (
                      <div className="p-3 rounded-md border bg-muted/20 space-y-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-medium">Chain of Custody</span>
                          <Badge variant="outline" className="text-xs">Lacey Act</Badge>
                        </div>
                        <label className="flex items-center gap-2 text-sm">
                          <input type="checkbox" className="rounded" data-testid="check-coc-unbroken" checked={!!processingCompliance.coc_unbroken} onChange={(e) => setProcessingCompliance(prev => ({...prev, coc_unbroken: e.target.checked}))} />
                          Unbroken chain of custody from source batches verified
                        </label>
                      </div>
                    )}
                    {hasFSMA && (
                      <div className="p-3 rounded-md border bg-muted/20 space-y-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-medium">Lot Traceability</span>
                          <Badge variant="outline" className="text-xs">FSMA 204</Badge>
                        </div>
                        <label className="flex items-center gap-2 text-sm">
                          <input type="checkbox" className="rounded" data-testid="check-transformation-cte" checked={!!processingCompliance.transformation_cte} onChange={(e) => setProcessingCompliance(prev => ({...prev, transformation_cte: e.target.checked}))} />
                          Transformation CTE recorded (lot codes, quantities, dates)
                        </label>
                      </div>
                    )}
                  </div>
                );
              })()}

              <Button 
                className="w-full" 
                onClick={createProcessingRun}
                disabled={creating || !newRun.facility_name || !newRun.input_weight_kg || !newRun.output_weight_kg}
                data-testid="button-submit-run"
              >
                {creating ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Factory className="h-4 w-4 mr-2" />
                    Create Processing Run
                  </>
                )}
              </Button>
            </div>
          </SheetContent>
        </Sheet>
      </div>

      <div className="grid md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-orange-100 rounded-lg">
                <Factory className="h-6 w-6 text-orange-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{processingRuns.length}</p>
                <p className="text-sm text-muted-foreground">Total Runs</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-blue-100 rounded-lg">
                <Package className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{totalInputWeight.toLocaleString()}</p>
                <p className="text-sm text-muted-foreground">Input (kg)</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-purple-100 rounded-lg">
                <Scale className="h-6 w-6 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{totalOutputWeight.toLocaleString()}</p>
                <p className="text-sm text-muted-foreground">Output (kg)</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-green-100 rounded-lg">
                <CheckCircle className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{validRuns}/{processingRuns.length}</p>
                <p className="text-sm text-muted-foreground">Valid Balance</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Processing Run Registry</CardTitle>
          <CardDescription>
            All factory processing runs with mass balance validation status
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : processingRuns.length === 0 ? (
            <div className="text-center py-12">
              <Factory className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium">No processing runs yet</h3>
              <p className="text-muted-foreground mb-4">
                Create your first processing run to start tracking mass balance
              </p>
              <Button onClick={() => setSheetOpen(true)} data-testid="button-create-first-run">
                <Plus className="h-4 w-4 mr-2" />
                Create First Run
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Run Code</TableHead>
                  <TableHead>Facility</TableHead>
                  <TableHead>Product</TableHead>
                  <TableHead>Input</TableHead>
                  <TableHead>Output</TableHead>
                  <TableHead>Recovery</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {processingRuns.map((run) => (
                  <TableRow key={run.id} data-testid={`row-run-${run.id}`}>
                    <TableCell className="font-mono font-medium">
                      {run.run_code}
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{run.facility_name}</div>
                        {run.facility_location && (
                          <div className="text-sm text-muted-foreground">
                            {run.facility_location}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="capitalize">
                      {run.product_type?.replace(/_/g, ' ')}
                    </TableCell>
                    <TableCell>{run.input_weight_kg?.toLocaleString()} kg</TableCell>
                    <TableCell>{run.output_weight_kg?.toLocaleString()} kg</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <span className="font-medium">{run.recovery_rate?.toFixed(1)}%</span>
                        <span className="text-xs text-muted-foreground">
                          / {run.standard_recovery_rate?.toFixed(1)}%
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {run.mass_balance_valid ? (
                        <Badge className="bg-green-100 text-green-800">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Valid
                        </Badge>
                      ) : (
                        <Badge variant="destructive">
                          <AlertTriangle className="h-3 w-3 mr-1" />
                          Warning
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>{formatDate(run.processed_at)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
    </TierGate>
  );
}
