'use client';

import { use, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import {
  ArrowLeft, Package, Loader2, Factory, Ship, Fingerprint,
  CheckCircle2, AlertTriangle, Clock, Copy, QrCode,
  Calendar, Layers, User, MapPin, ExternalLink, Download,
} from 'lucide-react';

interface FinishedGood {
  id: string;
  pedigree_code: string;
  product_name: string;
  product_type: string;
  weight_kg: number;
  batch_number?: string;
  lot_number?: string;
  production_date: string;
  expiry_date?: string;
  destination_country: string;
  buyer_name?: string;
  buyer_company?: string;
  dds_submitted: boolean;
  dds_submitted_at?: string;
  dds_reference?: string;
  pedigree_verified: boolean;
  verification_notes?: string;
  processing_run_id: string;
  certificate_url?: string;
  created_at: string;
}

interface ProcessingRun {
  id: string;
  run_code: string;
  facility_name: string;
  facility_location?: string;
  commodity: string;
  input_weight_kg: number;
  output_weight_kg: number;
  recovery_rate: number;
  mass_balance_valid: boolean;
  processed_at: string;
}

interface DPP {
  id: string;
  dpp_code: string;
  status: string;
  issued_at?: string;
  certifications?: string[];
  sustainability_claims?: Record<string, any>;
}

interface Shipment {
  id: string;
  shipment_code: string;
  status: string;
  destination_country: string;
  destination_port?: string;
  readiness_score?: number;
  readiness_decision?: string;
  estimated_ship_date?: string;
}

interface SourceBatch {
  id: string;
  batch_code?: string;
  commodity?: string;
  total_weight: number;
  collected_at?: string;
  community?: string;
  farmer_name?: string;
  farm_id?: string;
  compliance_status?: string;
  weight_contribution_kg: number;
}

export default function PedigreeDetailPage({ params: paramsPromise }: { params: Promise<{ id: string }> }) {
  const { id } = use(paramsPromise);
  const router = useRouter();
  const { toast } = useToast();

  const [fg, setFg] = useState<FinishedGood | null>(null);
  const [run, setRun] = useState<ProcessingRun | null>(null);
  const [dpp, setDpp] = useState<DPP | null>(null);
  const [shipment, setShipment] = useState<Shipment | null>(null);
  const [sourceBatches, setSourceBatches] = useState<SourceBatch[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/pedigree/${id}`)
      .then(r => r.json())
      .then(data => {
        if (data.error) { router.push('/app/pedigree'); return; }
        setFg(data.finished_good);
        setRun(data.processing_run);
        setDpp(data.dpp);
        setShipment(data.shipment);
        setSourceBatches(data.source_batches || []);
      })
      .catch(() => router.push('/app/pedigree'))
      .finally(() => setLoading(false));
  }, [id, router]);

  const copyCode = () => {
    navigator.clipboard.writeText(fg?.pedigree_code || '');
    toast({ title: 'Copied', description: 'Pedigree code copied to clipboard.' });
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
    </div>
  );
  if (!fg) return null;

  const decisionColor: Record<string, string> = {
    go:             'bg-green-500/10 text-green-700 dark:text-green-400 border-green-200',
    conditional_go: 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-200',
    conditional:    'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-200',
    no_go:          'bg-red-500/10 text-red-700 dark:text-red-400 border-red-200',
    pending:        'bg-muted text-muted-foreground',
  };

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <Link href="/app/pedigree">
            <Button variant="ghost" size="icon" className="h-8 w-8 mt-0.5" aria-label="Back to pedigree">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl font-bold tracking-tight">{fg.product_name}</h1>
              <Badge
                variant="outline"
                className={fg.pedigree_verified
                  ? 'bg-green-500/10 text-green-700 dark:text-green-400 border-green-200'
                  : 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-200'}
              >
                {fg.pedigree_verified
                  ? <><CheckCircle2 className="h-3 w-3 mr-1" />Verified</>
                  : <><AlertTriangle className="h-3 w-3 mr-1" />Unverified</>}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground mt-1 flex items-center gap-2">
              <span className="font-mono">{fg.pedigree_code}</span>
              <button onClick={copyCode} className="hover:text-foreground transition-colors">
                <Copy className="h-3.5 w-3.5" />
              </button>
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap shrink-0">
          {!dpp ? (
            <Link href={`/app/dpp?finished_good_id=${fg.id}`}>
              <Button size="sm">
                <Fingerprint className="h-3.5 w-3.5 mr-1.5" />Generate DPP
              </Button>
            </Link>
          ) : (
            <Link href={`/app/dpp/${dpp.id}`}>
              <Button size="sm" variant="outline">
                <Fingerprint className="h-3.5 w-3.5 mr-1.5" />View DPP
              </Button>
            </Link>
          )}
          <Button variant="outline" size="sm" onClick={() => window.open(`/verify/${fg.pedigree_code}`, '_blank')}>
            <ExternalLink className="h-3.5 w-3.5 mr-1.5" />Public Record
          </Button>
          {fg.certificate_url && (
            <Button variant="outline" size="sm" onClick={() => window.open(`/api/pedigree/certificate?id=${fg.id}`, '_blank')}>
              <Download className="h-3.5 w-3.5 mr-1.5" />Certificate
            </Button>
          )}
        </div>
      </div>

      {/* Stats strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Weight',           value: `${Number(fg.weight_kg).toLocaleString()} kg`, icon: Package },
          { label: 'Production Date',  value: fg.production_date ? new Date(fg.production_date).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' }) : '—', icon: Calendar },
          { label: 'DDS Submitted',    value: fg.dds_submitted ? 'Yes' : 'No', icon: CheckCircle2 },
          { label: 'Source Batches',   value: sourceBatches.length || '—', icon: Layers },
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

        {/* Product Record */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Package className="h-4 w-4" />Product Record
            </CardTitle>
          </CardHeader>
          <CardContent>
            {[
              { label: 'Product Name',       value: fg.product_name },
              { label: 'Product Type',       value: fg.product_type?.replace(/_/g, ' ') },
              { label: 'Pedigree Code',      value: <span className="font-mono text-sm">{fg.pedigree_code}</span> },
              { label: 'Batch Number',       value: fg.batch_number },
              { label: 'Lot Number',         value: fg.lot_number },
              { label: 'Production Date',    value: fg.production_date ? new Date(fg.production_date).toLocaleDateString('en-NG', { day: 'numeric', month: 'long', year: 'numeric' }) : '—' },
              { label: 'Expiry Date',        value: fg.expiry_date ? new Date(fg.expiry_date).toLocaleDateString('en-NG', { day: 'numeric', month: 'long', year: 'numeric' }) : '—' },
              { label: 'Destination',        value: fg.destination_country },
              { label: 'Buyer',              value: fg.buyer_company || fg.buyer_name },
            ].map(({ label, value }) => (
              <div key={label} className="flex items-center justify-between py-2.5 border-b border-border last:border-0 text-sm">
                <span className="text-muted-foreground">{label}</span>
                <span className="font-medium capitalize">{value || '—'}</span>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* DDS & Verification */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4" />Compliance Status
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between py-2.5 border-b border-border text-sm">
              <span className="text-muted-foreground">Pedigree Verified</span>
              <Badge variant="outline" className={fg.pedigree_verified ? 'bg-green-500/10 text-green-700 dark:text-green-400' : 'bg-amber-500/10 text-amber-700'}>
                {fg.pedigree_verified ? '✓ Verified' : '⚠ Pending'}
              </Badge>
            </div>
            <div className="flex items-center justify-between py-2.5 border-b border-border text-sm">
              <span className="text-muted-foreground">DDS Submitted</span>
              <Badge variant="outline" className={fg.dds_submitted ? 'bg-green-500/10 text-green-700 dark:text-green-400' : ''}>
                {fg.dds_submitted ? `✓ Submitted${fg.dds_submitted_at ? ' ' + new Date(fg.dds_submitted_at).toLocaleDateString() : ''}` : 'Not submitted'}
              </Badge>
            </div>
            {fg.dds_reference && (
              <div className="flex items-center justify-between py-2.5 border-b border-border text-sm">
                <span className="text-muted-foreground">DDS Reference</span>
                <span className="font-mono text-sm">{fg.dds_reference}</span>
              </div>
            )}
            {fg.verification_notes && (
              <div className="p-3 rounded-lg bg-amber-500/5 border border-amber-200 text-sm text-amber-700 dark:text-amber-400 mt-2">
                <p className="font-medium mb-1">Verification Notes</p>
                <p>{fg.verification_notes}</p>
              </div>
            )}

            {/* DPP status */}
            <div className="pt-2 border-t border-border">
              <p className="text-xs text-muted-foreground mb-2 font-medium uppercase tracking-wide">Digital Product Passport</p>
              {dpp ? (
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-mono text-sm">{dpp.dpp_code}</span>
                    <Badge variant="outline" className={`ml-2 text-xs ${dpp.status === 'active' ? 'bg-green-500/10 text-green-700 dark:text-green-400' : ''}`}>
                      {dpp.status}
                    </Badge>
                  </div>
                  <Link href={`/app/dpp/${dpp.id}`}>
                    <Button size="sm" variant="outline" className="h-7 text-xs gap-1">
                      <Fingerprint className="h-3 w-3" />View
                    </Button>
                  </Link>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">No passport generated yet</span>
                  <Link href={`/app/dpp?finished_good_id=${fg.id}`}>
                    <Button size="sm" className="h-7 text-xs gap-1">
                      <Fingerprint className="h-3 w-3" />Generate DPP
                    </Button>
                  </Link>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Processing Run */}
      {run && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Factory className="h-4 w-4" />Processing Run
            </CardTitle>
            <CardDescription>The factory run that produced this finished good</CardDescription>
          </CardHeader>
          <CardContent>
            <Link href={`/app/processing/${run.id}`} className="block group">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-lg border border-border hover:border-primary/40 hover:bg-muted/30 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-md bg-primary/10 flex items-center justify-center shrink-0">
                    <Factory className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-mono font-medium group-hover:text-primary">{run.run_code}</p>
                    <p className="text-xs text-muted-foreground">{run.facility_name}{run.facility_location ? ` · ${run.facility_location}` : ''}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {Number(run.input_weight_kg).toLocaleString()} kg in → {Number(run.output_weight_kg).toLocaleString()} kg out · {run.recovery_rate?.toFixed(1)}% recovery
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Badge variant="outline" className={run.mass_balance_valid ? 'bg-green-500/10 text-green-700 dark:text-green-400 text-xs' : 'bg-red-500/10 text-red-700 dark:text-red-400 text-xs'}>
                    {run.mass_balance_valid ? '✓ Valid Balance' : '✗ Balance Warning'}
                  </Badge>
                  <span className="text-xs text-muted-foreground">{new Date(run.processed_at).toLocaleDateString()}</span>
                </div>
              </div>
            </Link>
          </CardContent>
        </Card>
      )}

      {/* Source Batches */}
      {sourceBatches.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Layers className="h-4 w-4" />Source Collection Batches
            </CardTitle>
            <CardDescription>Raw material batches that went into this product via the processing run</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {sourceBatches.map(b => (
                <Link key={b.id} href={`/app/inventory/${b.id}`} className="block group">
                  <div className="flex items-center justify-between p-3 rounded-lg border border-border hover:border-primary/40 hover:bg-muted/30 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="h-7 w-7 rounded-md bg-muted flex items-center justify-center shrink-0">
                        <Package className="h-3.5 w-3.5 text-muted-foreground" />
                      </div>
                      <div>
                        <p className="text-sm font-mono font-medium group-hover:text-primary">{b.batch_code || b.id?.slice(0, 8)}</p>
                        <p className="text-xs text-muted-foreground">
                          {b.farmer_name && <><User className="h-3 w-3 inline mr-0.5" />{b.farmer_name} · </>}
                          {b.community && <><MapPin className="h-3 w-3 inline mr-0.5" />{b.community} · </>}
                          {Number(b.total_weight).toLocaleString()} kg total
                        </p>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-bold">{Number(b.weight_contribution_kg).toLocaleString()} kg</p>
                      <p className="text-xs text-muted-foreground">contributed</p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Linked Shipment */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Ship className="h-4 w-4" />Shipment
          </CardTitle>
        </CardHeader>
        <CardContent>
          {shipment ? (
            <Link href={`/app/shipments/${shipment.id}`} className="block group">
              <div className="flex items-center justify-between p-3 rounded-lg border border-border hover:border-primary/40 hover:bg-muted/30 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-md bg-blue-500/10 flex items-center justify-center shrink-0">
                    <Ship className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <p className="text-sm font-mono font-medium group-hover:text-primary">{shipment.shipment_code}</p>
                    <p className="text-xs text-muted-foreground">
                      → {shipment.destination_country}{shipment.destination_port ? `, ${shipment.destination_port}` : ''}
                      {shipment.estimated_ship_date ? ` · ETA ${new Date(shipment.estimated_ship_date).toLocaleDateString()}` : ''}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {shipment.readiness_score != null && (
                    <span className="text-sm font-bold">{shipment.readiness_score}/100</span>
                  )}
                  {shipment.readiness_decision && (
                    <Badge variant="outline" className={`text-xs ${decisionColor[shipment.readiness_decision] || ''}`}>
                      {shipment.readiness_decision.replace('_', ' ').toUpperCase()}
                    </Badge>
                  )}
                </div>
              </div>
            </Link>
          ) : (
            <div className="text-center py-8">
              <Ship className="h-10 w-10 mx-auto mb-3 text-muted-foreground opacity-30" />
              <p className="font-medium text-sm">Not yet attached to a shipment</p>
              <p className="text-xs text-muted-foreground mt-1 mb-4">Add this finished good to a shipment when ready to export.</p>
              <Link href="/app/shipments">
                <Button size="sm" variant="outline">
                  <Ship className="h-3.5 w-3.5 mr-1.5" />Go to Shipments
                </Button>
              </Link>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
