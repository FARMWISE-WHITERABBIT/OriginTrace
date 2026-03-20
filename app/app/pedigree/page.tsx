'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { 
  Package, 
  Plus, 
  QrCode, 
  Download, 
  ExternalLink, 
  CheckCircle, 
  AlertTriangle,
  Factory,
  Scale,
  Loader2,
  Fingerprint,
} from 'lucide-react';
import { TierGate } from '@/components/tier-gate';

interface FinishedGood {
  id: string;
  pedigree_code: string;
  product_name: string;
  product_type: string;
  weight_kg: number;
  batch_number: string;
  lot_number: string;
  production_date: string;
  destination_country: string;
  buyer_company: string;
  dds_submitted: boolean;
  pedigree_verified: boolean;
  processing_runs?: {
    run_code: string;
    facility_name: string;
    mass_balance_valid: boolean;
    recovery_rate: number;
  };
  created_at: string;
}

interface ProcessingRun {
  id: string;
  run_code: string;
  facility_name: string;
  commodity: string;
  input_weight_kg: number;
  output_weight_kg: number;
  recovery_rate: number;
  mass_balance_valid: boolean;
  processed_at: string;
}

export default function PedigreePage() {
  const router = useRouter();
  const [finishedGoods, setFinishedGoods] = useState<FinishedGood[]>([]);
  const [processingRuns, setProcessingRuns] = useState<ProcessingRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const { toast } = useToast();

  const [newGood, setNewGood] = useState({
    product_name: '',
    product_type: 'cocoa_butter',
    processing_run_id: '',
    weight_kg: '',
    batch_number: '',
    lot_number: '',
    production_date: new Date().toISOString().split('T')[0],
    destination_country: 'EU',
    buyer_company: ''
  });

  const productTypes = [
    { value: 'cocoa_butter', label: 'Cocoa Butter' },
    { value: 'cocoa_powder', label: 'Cocoa Powder' },
    { value: 'cocoa_liquor', label: 'Cocoa Liquor' },
    { value: 'cocoa_nibs', label: 'Cocoa Nibs' },
    { value: 'cashew_kernel', label: 'Cashew Kernel' },
    { value: 'palm_kernel_oil', label: 'Palm Kernel Oil' },
    { value: 'ginger_powder', label: 'Ginger Powder' }
  ];

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    try {
      const [goodsRes, runsRes] = await Promise.all([
        fetch('/api/finished-goods'),
        fetch('/api/processing-runs')
      ]);
      
      if (goodsRes.ok) {
        const data = await goodsRes.json();
        setFinishedGoods(data.finishedGoods || []);
      }
      
      if (runsRes.ok) {
        const data = await runsRes.json();
        setProcessingRuns(data.processingRuns || []);
      }
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  }

  async function createFinishedGood() {
    if (!newGood.product_name || !newGood.processing_run_id || !newGood.weight_kg) {
      toast({
        title: 'Missing fields',
        description: 'Please fill in all required fields',
        variant: 'destructive'
      });
      return;
    }

    setCreating(true);
    try {
      const res = await fetch('/api/finished-goods', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newGood,
          weight_kg: parseFloat(newGood.weight_kg)
        })
      });

      if (res.ok) {
        const data = await res.json();
        setFinishedGoods([data.finishedGood, ...finishedGoods]);
        setSheetOpen(false);
        toast({
          title: 'Pedigree created',
          description: `Pedigree ${data.finishedGood.pedigree_code} created successfully`
        });
        setNewGood({
          product_name: '',
          product_type: 'cocoa_butter',
          processing_run_id: '',
          weight_kg: '',
          batch_number: '',
          lot_number: '',
          production_date: new Date().toISOString().split('T')[0],
          destination_country: 'EU',
          buyer_company: ''
        });
      }
    } catch (error) {
      console.error('Failed to create finished good:', error);
      toast({
        title: 'Error',
        description: 'Failed to create pedigree',
        variant: 'destructive'
      });
    } finally {
      setCreating(false);
    }
  }

  function generateQRUrl(pedigreeCode: string) {
    const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
    return `${baseUrl}/verify/${pedigreeCode}`;
  }

  function copyQRLink(pedigreeCode: string) {
    const url = generateQRUrl(pedigreeCode);
    navigator.clipboard.writeText(url);
    toast({
      title: 'Link copied',
      description: 'QR verification link copied to clipboard'
    });
  }

  const formatDate = (dateStr: string) => {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  return (
    <TierGate feature="pedigree" requiredTier="pro" featureLabel="Pedigree">
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Package className="h-6 w-6 text-green-600" />
            Finished Goods Pedigree
          </h1>
          <p className="text-muted-foreground">
            Generate EU TRACES-compatible pedigree certificates for processed goods
          </p>
        </div>
        <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
          <SheetTrigger asChild>
            <Button data-testid="button-create-pedigree">
              <Plus className="h-4 w-4 mr-2" />
              Create Pedigree
            </Button>
          </SheetTrigger>
          <SheetContent className="w-[400px] sm:w-[540px] overflow-y-auto">
            <SheetHeader>
              <SheetTitle>Create Finished Good Pedigree</SheetTitle>
              <SheetDescription>
                Link a finished product to its processing run for EU TRACES compliance
              </SheetDescription>
            </SheetHeader>
            <div className="space-y-4 mt-6">
              <div>
                <Label htmlFor="product_name">Product Name *</Label>
                <Input
                  id="product_name"
                  value={newGood.product_name}
                  onChange={(e) => setNewGood({ ...newGood, product_name: e.target.value })}
                  placeholder="e.g., Premium Cocoa Butter Grade A"
                  data-testid="input-product-name"
                />
              </div>

              <div>
                <Label htmlFor="product_type">Product Type</Label>
                <Select
                  value={newGood.product_type}
                  onValueChange={(value) => setNewGood({ ...newGood, product_type: value })}
                >
                  <SelectTrigger data-testid="select-product-type">
                    <SelectValue placeholder="Select product type" />
                  </SelectTrigger>
                  <SelectContent>
                    {productTypes.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="processing_run">Processing Run *</Label>
                <Select
                  value={newGood.processing_run_id}
                  onValueChange={(value) => setNewGood({ ...newGood, processing_run_id: value })}
                >
                  <SelectTrigger data-testid="select-processing-run">
                    <SelectValue placeholder="Select processing run" />
                  </SelectTrigger>
                  <SelectContent>
                    {processingRuns.length === 0 ? (
                      <SelectItem value="none" disabled>
                        No processing runs available
                      </SelectItem>
                    ) : (
                      processingRuns.map((run) => (
                        <SelectItem key={run.id} value={run.id}>
                          {run.run_code} - {run.facility_name} ({run.output_weight_kg}kg)
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
                {processingRuns.length === 0 && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Create processing runs first in the Processing page
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="weight_kg">Weight (kg) *</Label>
                  <Input
                    id="weight_kg"
                    type="number"
                    value={newGood.weight_kg}
                    onChange={(e) => setNewGood({ ...newGood, weight_kg: e.target.value })}
                    placeholder="500"
                    data-testid="input-weight"
                  />
                </div>
                <div>
                  <Label htmlFor="production_date">Production Date</Label>
                  <Input
                    id="production_date"
                    type="date"
                    value={newGood.production_date}
                    onChange={(e) => setNewGood({ ...newGood, production_date: e.target.value })}
                    data-testid="input-production-date"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="batch_number">Batch Number</Label>
                  <Input
                    id="batch_number"
                    value={newGood.batch_number}
                    onChange={(e) => setNewGood({ ...newGood, batch_number: e.target.value })}
                    placeholder="BATCH-2026-001"
                    data-testid="input-batch-number"
                  />
                </div>
                <div>
                  <Label htmlFor="lot_number">Lot Number</Label>
                  <Input
                    id="lot_number"
                    value={newGood.lot_number}
                    onChange={(e) => setNewGood({ ...newGood, lot_number: e.target.value })}
                    placeholder="LOT-A1"
                    data-testid="input-lot-number"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="buyer_company">Buyer Company</Label>
                <Input
                  id="buyer_company"
                  value={newGood.buyer_company}
                  onChange={(e) => setNewGood({ ...newGood, buyer_company: e.target.value })}
                  placeholder="Amsterdam Chocolate Co."
                  data-testid="input-buyer-company"
                />
              </div>

              <Button 
                className="w-full" 
                onClick={createFinishedGood}
                disabled={creating || !newGood.product_name || !newGood.processing_run_id || !newGood.weight_kg}
                data-testid="button-submit-pedigree"
              >
                {creating ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <QrCode className="h-4 w-4 mr-2" />
                    Generate Pedigree
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
              <div className="p-3 bg-green-100 rounded-lg">
                <Package className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{finishedGoods.length}</p>
                <p className="text-sm text-muted-foreground">Total Pedigrees</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-blue-100 rounded-lg">
                <CheckCircle className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {finishedGoods.filter(g => g.pedigree_verified).length}
                </p>
                <p className="text-sm text-muted-foreground">Verified</p>
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
                <p className="text-2xl font-bold">
                  {finishedGoods.reduce((sum, g) => sum + (g.weight_kg || 0), 0).toLocaleString()}
                </p>
                <p className="text-sm text-muted-foreground">Total kg</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-orange-100 rounded-lg">
                <Factory className="h-6 w-6 text-orange-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{processingRuns.length}</p>
                <p className="text-sm text-muted-foreground">Processing Runs</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Finished Goods Registry</CardTitle>
          <CardDescription>
            All finished goods with pedigree certificates for EU TRACES compliance
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : finishedGoods.length === 0 ? (
            <div className="text-center py-12">
              <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium">No finished goods yet</h3>
              <p className="text-muted-foreground mb-4">
                Create your first pedigree to start tracking finished goods
              </p>
              <Button onClick={() => setSheetOpen(true)} data-testid="button-create-first-pedigree">
                <Plus className="h-4 w-4 mr-2" />
                Create First Pedigree
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Pedigree Code</TableHead>
                  <TableHead>Product</TableHead>
                  <TableHead>Weight</TableHead>
                  <TableHead>Production Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {finishedGoods.map((good) => (
                  <TableRow
                    key={good.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => router.push(`/app/pedigree/${good.id}`)}
                    data-testid={`row-pedigree-${good.id}`}
                  >
                    <TableCell className="font-mono font-medium">
                      {good.pedigree_code}
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{good.product_name}</div>
                        <div className="text-sm text-muted-foreground capitalize">
                          {good.product_type?.replace('_', ' ')}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>{good.weight_kg?.toLocaleString()} kg</TableCell>
                    <TableCell>{formatDate(good.production_date)}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {good.pedigree_verified ? (
                          <Badge className="bg-green-100 text-green-800">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Verified
                          </Badge>
                        ) : (
                          <Badge variant="secondary">
                            <AlertTriangle className="h-3 w-3 mr-1" />
                            Pending
                          </Badge>
                        )}
                        {good.dds_submitted && (
                          <Badge variant="outline">DDS</Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => copyQRLink(good.pedigree_code)}
                          title="Copy QR Link"
                          data-testid={`button-copy-qr-${good.id}`}
                        >
                          <QrCode className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => window.open(`/verify/${good.pedigree_code}`, '_blank')}
                          title="View Pedigree"
                          data-testid={`button-view-pedigree-${good.id}`}
                        >
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => window.open(`/api/pedigree/certificate?id=${good.id}`, '_blank')}
                          title="Download Certificate"
                          data-testid={`button-download-cert-${good.id}`}
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                        <Link href={`/app/dpp?finished_good_id=${good.id}`}>
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-xs h-7 gap-1"
                            title="Generate Digital Product Passport"
                            data-testid={`button-generate-dpp-${good.id}`}
                          >
                            <Fingerprint className="h-3 w-3" />DPP
                          </Button>
                        </Link>
                      </div>
                    </TableCell>
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
