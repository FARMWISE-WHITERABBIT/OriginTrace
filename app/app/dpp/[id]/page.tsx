'use client';

import { use, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useOrg } from '@/lib/contexts/org-context';
import {
  ArrowLeft, Fingerprint, CheckCircle2, Clock, XCircle,
  Loader2, Copy, ExternalLink, Globe, Package, Factory,
  Ship, Leaf, Award, QrCode, Shield, ArrowRight,
} from 'lucide-react';

interface DPPDetail {
  id: string;
  dpp_code: string;
  product_category: string;
  origin_country: string;
  status: string;
  passport_version: number;
  carbon_footprint_kg: number | null;
  sustainability_claims: Record<string, any>;
  certifications: string[];
  processing_history: Array<{
    run_code: string;
    input_kg: number;
    output_kg: number;
    recovery_rate: number;
    process?: string;
    facility?: string;
  }>;
  chain_of_custody: Array<{
    stage: string;
    actor: string;
    date?: string;
    location?: string;
    weight_kg?: number;
  }>;
  regulatory_compliance: Record<string, any>;
  machine_readable_data: Record<string, any>;
  issued_at: string | null;
  created_at: string;
  finished_goods?: {
    id: string;
    product_name: string;
    product_type: string;
    pedigree_code: string;
    weight_kg: number;
    production_date: string;
    destination_country?: string;
    buyer_company?: string;
    processing_run_id?: string;
  };
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: typeof CheckCircle2 }> = {
  active:  { label: 'Active',   color: 'bg-green-500/10 text-green-700 dark:text-green-400 border-green-200',  icon: CheckCircle2 },
  draft:   { label: 'Draft',    color: 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-200',   icon: Clock },
  revoked: { label: 'Revoked',  color: 'bg-red-500/10 text-red-700 dark:text-red-400 border-red-200',           icon: XCircle },
};

const STAGE_ICONS: Record<string, typeof Package> = {
  'farm collection': Leaf,
  'collection':      Leaf,
  'processing':      Factory,
  'export':          Ship,
  'shipment':        Ship,
};

function ChainStep({ step, isLast }: { step: DPPDetail['chain_of_custody'][0]; isLast: boolean }) {
  const Icon = STAGE_ICONS[step.stage?.toLowerCase()] || ArrowRight;
  return (
    <div className="flex gap-3">
      <div className="flex flex-col items-center">
        <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
          <Icon className="h-4 w-4 text-primary" />
        </div>
        {!isLast && <div className="w-0.5 flex-1 bg-border mt-1 min-h-[24px]" />}
      </div>
      <div className={`pb-4 ${isLast ? '' : ''}`}>
        <p className="text-sm font-semibold capitalize">{step.stage}</p>
        <p className="text-sm text-muted-foreground">{step.actor}</p>
        <div className="flex items-center gap-3 mt-0.5 text-xs text-muted-foreground">
          {step.date && <span>{new Date(step.date).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })}</span>}
          {step.location && <span>· {step.location}</span>}
          {step.weight_kg && <span>· {Number(step.weight_kg).toLocaleString()} kg</span>}
        </div>
      </div>
    </div>
  );
}

export default function DPPDetailPage({ params: paramsPromise }: { params: Promise<{ id: string }> }) {
  const { id } = use(paramsPromise);
  const router = useRouter();
  const { toast } = useToast();
  const { profile } = useOrg();
  const isAdmin = profile?.role === 'admin' || profile?.role === 'compliance_officer';

  const [dpp, setDpp] = useState<DPPDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [updatingStatus, setUpdatingStatus] = useState(false);

  const updateStatus = async (newStatus: string) => {
    if (!dpp) return;
    setUpdatingStatus(true);
    try {
      const res = await fetch(`/api/dpp/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) throw new Error();
      setDpp(d => d ? { ...d, status: newStatus } : d);
      toast({ title: 'Status updated', description: `Passport is now ${newStatus}.` });
    } catch {
      toast({ title: 'Error', description: 'Failed to update status.', variant: 'destructive' });
    } finally { setUpdatingStatus(false); }
  };

  useEffect(() => {
    fetch(`/api/dpp/${id}`)
      .then(r => r.json())
      .then(data => {
        if (data.error) { router.push('/app/dpp'); return; }
        setDpp(data.dpp);
      })
      .catch(() => router.push('/app/dpp'))
      .finally(() => setLoading(false));
  }, [id, router]);

  const copyCode = () => {
    navigator.clipboard.writeText(dpp?.dpp_code || '');
    toast({ title: 'Copied', description: 'DPP code copied to clipboard.' });
  };

  const openPublic = () => {
    window.open(`/api/dpp/${id}?format=html`, '_blank');
  };

  const copyPublicLink = () => {
    const url = `${window.location.origin}/api/dpp/${id}?format=html`;
    navigator.clipboard.writeText(url);
    toast({ title: 'Link copied', description: 'Public passport link copied to clipboard.' });
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
    </div>
  );
  if (!dpp) return null;

  const status = STATUS_CONFIG[dpp.status] || STATUS_CONFIG.draft;
  const StatusIcon = status.icon;
  const fg = dpp.finished_goods;
  const claims = dpp.sustainability_claims || {};
  const certifications = dpp.certifications || [];
  const chain = dpp.chain_of_custody || [];
  const processing = dpp.processing_history || [];
  const compliance = dpp.regulatory_compliance || {};
  const claimEntries = Object.entries(claims).filter(([, v]) => v !== null && v !== undefined && v !== false);

  return (
    <div className="space-y-6 max-w-5xl">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <Link href="/app/dpp">
            <Button variant="ghost" size="icon" className="h-8 w-8 mt-0.5" aria-label="Back to passports">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl font-bold tracking-tight font-mono">{dpp.dpp_code}</h1>
              <Badge variant="outline" className={status.color}>
                <StatusIcon className="h-3 w-3 mr-1" />{status.label}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              {fg?.product_name || dpp.product_category} · Version {dpp.passport_version}
              {dpp.issued_at && ` · Issued ${new Date(dpp.issued_at).toLocaleDateString()}`}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap shrink-0">
          {isAdmin && dpp.status === 'draft' && (
            <Button size="sm" variant="outline" onClick={() => updateStatus('active')} disabled={updatingStatus} className="gap-1.5 text-green-700 border-green-300 hover:bg-green-50 dark:text-green-400 dark:border-green-800 dark:hover:bg-green-900/20">
              {updatingStatus ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCircle2 className="h-3 w-3" />}Activate
            </Button>
          )}
          {isAdmin && dpp.status === 'active' && (
            <Button size="sm" variant="outline" onClick={() => updateStatus('revoked')} disabled={updatingStatus} className="gap-1.5 text-red-700 border-red-300 hover:bg-red-50 dark:text-red-400 dark:border-red-800">
              {updatingStatus ? <Loader2 className="h-3 w-3 animate-spin" /> : <XCircle className="h-3 w-3" />}Revoke
            </Button>
          )}
          {isAdmin && dpp.status === 'revoked' && (
            <Button size="sm" variant="outline" onClick={() => updateStatus('draft')} disabled={updatingStatus} className="gap-1.5">
              {updatingStatus ? <Loader2 className="h-3 w-3 animate-spin" /> : <Clock className="h-3 w-3" />}Revert to Draft
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={copyCode}>
            <Copy className="h-3.5 w-3.5 mr-1.5" />Copy Code
          </Button>
          <Button variant="outline" size="sm" onClick={copyPublicLink}>
            <Globe className="h-3.5 w-3.5 mr-1.5" />Share Link
          </Button>
          <Button size="sm" onClick={openPublic}>
            <ExternalLink className="h-3.5 w-3.5 mr-1.5" />Public View
          </Button>
        </div>
      </div>

      {/* Share banner for active passports */}
      {dpp.status === 'active' && (
        <div className="flex items-center gap-3 p-3.5 rounded-lg bg-primary/5 border border-primary/20 text-sm">
          <Globe className="h-4 w-4 text-primary shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="font-medium text-primary">This passport is publicly verifiable</p>
            <p className="text-muted-foreground text-xs truncate">{typeof window !== 'undefined' ? `${window.location.origin}/api/dpp/${id}?format=html` : `[origin]/api/dpp/${id}?format=html`}</p>
          </div>
          <Button variant="outline" size="sm" className="shrink-0 h-7 text-xs" onClick={copyPublicLink}>Copy</Button>
        </div>
      )}

      <div className="grid lg:grid-cols-2 gap-4">

        {/* Product Info */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Package className="h-4 w-4" />Product Information
            </CardTitle>
          </CardHeader>
          <CardContent>
            {[
              { label: 'Product Name',     value: fg?.product_name || '—' },
              { label: 'Product Type',     value: fg?.product_type?.replace(/_/g, ' ') || dpp.product_category },
              { label: 'Pedigree Code',    value: <span className="font-mono text-sm">{fg?.pedigree_code || '—'}</span> },
              { label: 'Origin Country',   value: dpp.origin_country },
              { label: 'Weight',           value: fg?.weight_kg ? `${Number(fg.weight_kg).toLocaleString()} kg` : '—' },
              { label: 'Production Date',  value: fg?.production_date ? new Date(fg.production_date).toLocaleDateString('en-NG', { day: 'numeric', month: 'long', year: 'numeric' }) : '—' },
              { label: 'Carbon Footprint', value: dpp.carbon_footprint_kg ? `${dpp.carbon_footprint_kg} kg CO₂e` : '—' },
            ].map(({ label, value }) => (
              <div key={label} className="flex items-center justify-between py-2.5 border-b border-border last:border-0 text-sm">
                <span className="text-muted-foreground">{label}</span>
                <span className="font-medium text-right">{value}</span>
              </div>
            ))}
            {fg?.id && (
              <div className="pt-3 flex gap-2">
                <Link href={`/app/pedigree`} className="flex-1">
                  <Button variant="outline" size="sm" className="w-full text-xs">
                    <Package className="h-3 w-3 mr-1" />View Pedigree
                  </Button>
                </Link>
                {fg.processing_run_id && (
                  <Link href={`/app/processing/${fg.processing_run_id}`} className="flex-1">
                    <Button variant="outline" size="sm" className="w-full text-xs">
                      <Factory className="h-3 w-3 mr-1" />Processing Run
                    </Button>
                  </Link>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Regulatory Compliance */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Shield className="h-4 w-4" />Regulatory Compliance
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {Object.entries(compliance).length === 0 ? (
              <p className="text-sm text-muted-foreground">No compliance data recorded.</p>
            ) : (
              Object.entries(compliance).map(([key, value]) => {
                const label = key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
                const isBool = typeof value === 'boolean';
                return (
                  <div key={key} className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground capitalize">{label}</span>
                    {isBool ? (
                      <Badge variant={value ? 'default' : 'secondary'} className={`text-xs ${value ? 'bg-green-500/10 text-green-700 dark:text-green-400' : ''}`}>
                        {value ? '✓ Yes' : '✗ No'}
                      </Badge>
                    ) : (
                      <span className="font-medium">{String(value)}</span>
                    )}
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>
      </div>

      {/* Certifications */}
      {certifications.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Award className="h-4 w-4" />Certifications
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {certifications.map((cert, i) => (
                <Badge key={i} variant="outline" className="bg-green-500/5 text-green-700 dark:text-green-400 border-green-200">
                  <Award className="h-3 w-3 mr-1" />{cert}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Sustainability Claims */}
      {claimEntries.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Leaf className="h-4 w-4" />Sustainability Claims
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid sm:grid-cols-2 gap-2">
              {claimEntries.map(([key, value]) => {
                const label = key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
                const isBool = typeof value === 'boolean';
                const isNum = typeof value === 'number';
                return (
                  <div key={key} className="flex items-center gap-2 p-2.5 rounded-lg bg-muted/30 text-sm">
                    <CheckCircle2 className="h-3.5 w-3.5 text-green-500 shrink-0" />
                    <span className="text-muted-foreground flex-1">{label}</span>
                    <span className="font-medium">{isBool ? '✓' : isNum ? String(value) : String(value)}</span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Processing History */}
      {processing.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Factory className="h-4 w-4" />Processing History
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {processing.map((ph, i) => (
                <div key={i} className="p-3 rounded-lg border border-border bg-muted/20 text-sm">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-mono font-medium">{ph.run_code}</span>
                    <Badge variant="outline" className="text-xs">
                      {ph.recovery_rate?.toFixed(1)}% recovery
                    </Badge>
                  </div>
                  <div className="flex gap-4 text-xs text-muted-foreground">
                    <span>Input: <span className="font-medium text-foreground">{Number(ph.input_kg).toLocaleString()} kg</span></span>
                    <span>Output: <span className="font-medium text-foreground">{Number(ph.output_kg).toLocaleString()} kg</span></span>
                    {ph.process && <span>Process: <span className="font-medium text-foreground">{ph.process}</span></span>}
                  </div>
                  {ph.facility && <p className="text-xs text-muted-foreground mt-1">{ph.facility}</p>}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Chain of Custody */}
      {chain.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <ArrowRight className="h-4 w-4" />Chain of Custody
            </CardTitle>
            <CardDescription>Full traceability trail from farm to export</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-0">
              {chain.map((step, i) => (
                <ChainStep key={i} step={step} isLast={i === chain.length - 1} />
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Machine-readable footer */}
      <Card>
        <CardContent className="pt-4 pb-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-sm">
            <div className="flex items-center gap-2 text-muted-foreground">
              <QrCode className="h-4 w-4" />
              <span>Passport Version {dpp.passport_version}</span>
              {dpp.issued_at && <><span>·</span><span>Issued {new Date(dpp.issued_at).toLocaleDateString()}</span></>}
            </div>
            <Button variant="outline" size="sm" className="text-xs gap-1.5" onClick={() => window.open(`/api/dpp/${id}?format=jsonld`, '_blank')}>
              <ExternalLink className="h-3 w-3" />JSON-LD Export
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
