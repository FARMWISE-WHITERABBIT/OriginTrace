'use client';

import { use, useEffect, useState } from 'react';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useOrg } from '@/lib/contexts/org-context';
import { useToast } from '@/hooks/use-toast';
import {
  ArrowLeft, Package, Loader2, MapPin, User, Scale,
  CheckCircle2, AlertTriangle, Clock, Factory, Truck,
  FileText, Layers, Leaf, Activity, Pencil, Save, X,
  FlaskConical, Plus,
} from 'lucide-react';

interface BatchDetail {
  id: string;
  batch_code?: string;
  status: string;
  total_weight: number;
  bag_count: number;
  commodity: string;
  grade?: string;
  yield_validated: boolean;
  yield_flag_reason?: string;
  collected_at?: string;
  community?: string;
  state?: string;
  notes?: string;
  created_at: string;
  farm?: {
    id: string;
    farmer_name: string;
    phone?: string;
    community?: string;
    area_hectares?: number;
    commodity?: string;
    compliance_status?: string;
  };
}

interface Bag {
  id: string;
  serial: string;
  status: string;
  weight_kg?: number;
  grade?: string;
}

interface Contribution {
  farm_id: string;
  farmer_name: string;
  weight_kg: number;
  bag_count: number;
  grade?: string;
  community?: string;
  compliance_status?: string;
}

interface ProcessingRun {
  id: string;
  run_code: string;
  facility_name: string;
  mass_balance_valid: boolean;
  recovery_rate: number;
  processed_at: string;
  weight_contribution_kg: number;
}

interface Document {
  id: string;
  title: string;
  document_type: string;
  status: string;
  expiry_date?: string;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: typeof CheckCircle2 }> = {
  completed:  { label: 'Completed',   color: 'bg-green-500/10 text-green-700 dark:text-green-400 border-green-200',  icon: CheckCircle2 },
  aggregated: { label: 'Aggregated',  color: 'bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-200',      icon: CheckCircle2 },
  collecting: { label: 'Collecting',  color: 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-200',  icon: Clock },
  resolved:   { label: 'Resolved',    color: 'bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-200', icon: CheckCircle2 },
  shipped:    { label: 'Shipped',     color: 'bg-gray-500/10 text-gray-700 dark:text-gray-400 border-gray-200',      icon: CheckCircle2 },
  flagged:    { label: 'Flagged',     color: 'bg-red-500/10 text-red-700 dark:text-red-400 border-red-200',          icon: AlertTriangle },
};

export default function BatchDetailPage({ params: paramsPromise }: { params: Promise<{ id: string }> }) {
  const { id } = use(paramsPromise);
  const router = useRouter();
  const { profile } = useOrg();
  const { toast } = useToast();
  const isAdmin = profile?.role === 'admin' || profile?.role === 'aggregator';
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editForm, setEditForm] = useState({ grade: '', notes: '' });

  const startEdit = () => { if (!batch) return; setEditForm({ grade: batch.grade || '', notes: batch.notes || '' }); setEditing(true); };
  const cancelEdit = () => setEditing(false);
  const saveEdit = async () => {
    if (!batch) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/batches/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(editForm) });
      if (!res.ok) throw new Error();
      setBatch(b => b ? { ...b, ...editForm } : b);
      setEditing(false);
      toast({ title: 'Saved', description: 'Batch updated.' });
    } catch { toast({ title: 'Error', description: 'Failed to save.', variant: 'destructive' }); }
    finally { setSaving(false); }
  };

  const [batch, setBatch] = useState<BatchDetail | null>(null);
  const [bags, setBags] = useState<Bag[]>([]);
  const [contributions, setContributions] = useState<Contribution[]>([]);
  const [processingRun, setProcessingRun] = useState<ProcessingRun | null>(null);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [labResults, setLabResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activityEvents, setActivityEvents] = useState<any[]>([]);
  const [activityLoading, setActivityLoading] = useState(false);
  const [activityFetched, setActivityFetched] = useState(false);

  const fetchActivity = async (batchId: string) => {
    if (activityFetched) return;
    setActivityLoading(true);
    try {
      const res = await fetch(`/api/audit?resource_type=collection_batch&resource_id=${batchId}&limit=20`);
      if (res.ok) { const d = await res.json(); setActivityEvents(d.logs || d.events || []); }
      setActivityFetched(true);
    } catch { /* ignore */ }
    finally { setActivityLoading(false); }
  };

  useEffect(() => {
    Promise.all([
      fetch(`/api/batches/${id}`).then(r => r.json()),
      fetch(`/api/lab-results?batch_id=${id}&page_size=20`).then(r => r.ok ? r.json() : { results: [] }).catch(() => ({ results: [] })),
    ])
      .then(([data, labData]) => {
        if (data.error) { router.push('/app/inventory'); return; }
        setBatch(data.batch);
        setBags(data.bags || []);
        setContributions(data.contributions || []);
        setProcessingRun(data.processing_run || null);
        setDocuments(data.documents || []);
        setLabResults(labData.results || []);
      })
      .catch(() => router.push('/app/inventory'))
      .finally(() => setLoading(false));
  }, [id, router]);

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
    </div>
  );
  if (!batch) { notFound(); return null; }

  const batchCode = batch.batch_code || batch.batch_code || batch.id.slice(0, 8);
  const statusCfg = STATUS_CONFIG[batch.status] || STATUS_CONFIG.collecting;
  const StatusIcon = statusCfg.icon;
  const canDispatch = batch.status === 'completed' || batch.status === 'resolved';
  const location = batch.community || batch.state || batch.farm?.community;

  return (
    <div className="space-y-6 max-w-5xl">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <Link href="/app/inventory">
            <Button variant="ghost" size="icon" className="h-8 w-8 mt-0.5" aria-label="Back to inventory">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl font-bold tracking-tight font-mono">{batchCode}</h1>
              <Badge variant="outline" className={statusCfg.color}>
                <StatusIcon className="h-3 w-3 mr-1" />{statusCfg.label}
              </Badge>
              {batch.yield_flag_reason && (
                <Badge variant="destructive" className="text-xs">
                  <AlertTriangle className="h-3 w-3 mr-1" />Flagged
                </Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground mt-1 flex items-center gap-1">
              {batch.commodity && <><Leaf className="h-3.5 w-3.5" />{batch.commodity}</>}
              {location && <><span className="mx-1">·</span><MapPin className="h-3.5 w-3.5" />{location}</>}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap shrink-0">
          {!processingRun && canDispatch && (
            <Link href={`/app/dispatch?batch=${batch.id}`}>
              <Button size="sm" variant="outline">
                <Truck className="h-3.5 w-3.5 mr-1.5" />Dispatch
              </Button>
            </Link>
          )}
          {!processingRun && canDispatch && (
            <Link href={`/app/processing?batch_id=${batch.id}`}>
              <Button size="sm">
                <Factory className="h-3.5 w-3.5 mr-1.5" />Add to Processing Run
              </Button>
            </Link>
          )}
        </div>
      </div>

      {/* Flag warning */}
      {batch.yield_flag_reason && (
        <div className="flex items-start gap-3 p-3.5 rounded-lg bg-red-500/5 border border-red-200 dark:border-red-900">
          <AlertTriangle className="h-4 w-4 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="font-medium text-red-700 dark:text-red-400">Yield Flag</p>
            <p className="text-red-600/80 dark:text-red-400/80 mt-0.5">{batch.yield_flag_reason}</p>
          </div>
        </div>
      )}

      {/* Stats strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total Weight', value: `${Number(batch.total_weight).toLocaleString()} kg`, icon: Scale },
          { label: 'Bag Count',    value: bags.length > 0 ? bags.length : batch.bag_count,    icon: Package },
          { label: 'Grade',        value: batch.grade || '—',                                  icon: CheckCircle2 },
          { label: 'Contributors', value: contributions.length > 0 ? contributions.length : (batch.farm ? 1 : '—'), icon: User },
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

        {/* Batch Details */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <Package className="h-4 w-4" />Batch Details
              </CardTitle>
              {isAdmin && !editing && (
                <Button size="sm" variant="ghost" className="h-7 gap-1.5 text-xs" onClick={startEdit}>
                  <Pencil className="h-3 w-3" />Edit
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {editing ? (
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label htmlFor="edit-grade">Grade</Label>
                  <Input id="edit-grade" value={editForm.grade} onChange={e => setEditForm(f => ({ ...f, grade: e.target.value }))} placeholder="e.g. A, B, C" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="edit-notes">Notes</Label>
                  <Textarea id="edit-notes" value={editForm.notes} onChange={e => setEditForm(f => ({ ...f, notes: e.target.value }))} rows={3} placeholder="Optional notes about this batch" />
                </div>
                <div className="flex gap-2 pt-1">
                  <Button size="sm" onClick={saveEdit} disabled={saving} className="gap-1.5">
                    {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}Save
                  </Button>
                  <Button size="sm" variant="ghost" onClick={cancelEdit} disabled={saving} className="gap-1.5">
                    <X className="h-3 w-3" />Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <>
                {[
                  { label: 'Batch Code',    value: batchCode },
                  { label: 'Commodity',     value: batch.commodity },
                  { label: 'Grade',         value: batch.grade },
                  { label: 'Yield Validated', value: batch.yield_validated
                      ? <span className="text-green-600 dark:text-green-400 font-medium flex items-center gap-1"><CheckCircle2 className="h-3.5 w-3.5" />Validated</span>
                      : <span className="text-amber-600 flex items-center gap-1"><Clock className="h-3.5 w-3.5" />Pending</span> },
                  { label: 'Collected',     value: batch.collected_at ? new Date(batch.collected_at).toLocaleDateString('en-NG', { day: 'numeric', month: 'long', year: 'numeric' }) : '—' },
                  { label: 'Created',       value: new Date(batch.created_at).toLocaleDateString('en-NG', { day: 'numeric', month: 'long', year: 'numeric' }) },
                ].map(({ label, value }) => (
                  <div key={label} className="flex items-center justify-between py-2.5 border-b border-border last:border-0 text-sm">
                    <span className="text-muted-foreground">{label}</span>
                    <span className="font-medium">{value || '—'}</span>
                  </div>
                ))}
                {batch.notes && (
                  <p className="mt-3 text-xs text-muted-foreground italic p-3 bg-muted/40 rounded-lg">{batch.notes}</p>
                )}
              </>
            )}
          </CardContent>
        </Card>

        {/* Primary Farm */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <User className="h-4 w-4" />
              {contributions.length > 1 ? 'Lead Farm' : 'Farm'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {batch.farm ? (
              <>
                {[
                  { label: 'Farmer',    value: batch.farm.farmer_name },
                  { label: 'Phone',     value: batch.farm.phone },
                  { label: 'Community', value: batch.farm.community },
                  { label: 'Area',      value: batch.farm.area_hectares ? `${Number(batch.farm.area_hectares).toFixed(2)} ha` : null },
                  { label: 'Status',    value: <Badge variant="outline" className="text-xs capitalize">{batch.farm.compliance_status || 'pending'}</Badge> },
                ].map(({ label, value }) => (
                  <div key={label} className="flex items-center justify-between py-2.5 border-b border-border last:border-0 text-sm">
                    <span className="text-muted-foreground">{label}</span>
                    <span className="font-medium">{value || '—'}</span>
                  </div>
                ))}
                <div className="pt-3">
                  <Link href={`/app/farmers/${batch.farm.id}`}>
                    <Button variant="outline" size="sm" className="w-full text-xs">
                      <User className="h-3 w-3 mr-1.5" />View Farmer Profile
                    </Button>
                  </Link>
                </div>
              </>
            ) : (
              <p className="text-sm text-muted-foreground py-2">No farm linked to this batch.</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Multi-farm Contributions */}
      {contributions.length > 1 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Layers className="h-4 w-4" />Cooperative Contributions
            </CardTitle>
            <CardDescription>{contributions.length} farms contributed to this batch</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {contributions.map((c, i) => (
                <div key={i} className="flex items-center justify-between p-3 rounded-lg border border-border bg-muted/20">
                  <div className="flex items-center gap-3">
                    <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                      {(c.farmer_name || '?').charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-medium">{c.farmer_name}</p>
                      <p className="text-xs text-muted-foreground">
                        {c.community || '—'} · {c.bag_count} bags
                        {c.grade ? ` · Grade ${c.grade}` : ''}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold">{Number(c.weight_kg).toLocaleString()} kg</p>
                    {c.compliance_status && (
                      <Badge variant="outline" className="text-[10px] mt-0.5 capitalize">{c.compliance_status}</Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Processing Run */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Factory className="h-4 w-4" />Processing
          </CardTitle>
        </CardHeader>
        <CardContent>
          {processingRun ? (
            <Link href={`/app/processing/${processingRun.id}`} className="block group">
              <div className="flex items-center justify-between p-3 rounded-lg border border-border hover:border-primary/40 hover:bg-muted/30 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-md bg-primary/10 flex items-center justify-center shrink-0">
                    <Factory className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-mono font-medium group-hover:text-primary">{processingRun.run_code}</p>
                    <p className="text-xs text-muted-foreground">{processingRun.facility_name} · {processingRun.recovery_rate?.toFixed(1)}% recovery</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Badge variant={processingRun.mass_balance_valid ? 'default' : 'destructive'} className={`text-xs ${processingRun.mass_balance_valid ? 'bg-green-500/10 text-green-700 dark:text-green-400' : ''}`}>
                    {processingRun.mass_balance_valid ? '✓ Valid' : '✗ Warning'}
                  </Badge>
                  <span className="text-xs text-muted-foreground">{Number(processingRun.weight_contribution_kg).toLocaleString()} kg used</span>
                </div>
              </div>
            </Link>
          ) : (
            <div className="text-center py-8">
              <Factory className="h-10 w-10 mx-auto mb-3 text-muted-foreground opacity-30" />
              <p className="font-medium text-sm">Not yet processed</p>
              <p className="text-xs text-muted-foreground mt-1 mb-4">
                {canDispatch
                  ? 'Add this batch to a processing run when ready.'
                  : 'Complete collection before adding to a processing run.'}
              </p>
              {canDispatch && (
                <Link href={`/app/processing?batch_id=${batch.id}`}>
                  <Button size="sm" variant="outline">
                    <Factory className="h-3.5 w-3.5 mr-1.5" />Add to Processing Run
                  </Button>
                </Link>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Bags */}
      {bags.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Package className="h-4 w-4" />Bags
              <Badge variant="secondary" className="ml-1">{bags.length}</Badge>
            </CardTitle>
            <CardDescription>Individual traceable bags in this batch</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 max-h-64 overflow-y-auto">
              {bags.map(bag => (
                <div key={bag.id} className="flex items-center gap-1.5 p-2 rounded border border-border bg-muted/20 text-xs">
                  <Package className="h-3 w-3 text-muted-foreground shrink-0" />
                  <span className="font-mono truncate">{bag.serial}</span>
                  {bag.weight_kg != null && (
                    <span className="text-muted-foreground shrink-0">{Number(bag.weight_kg).toFixed(1)} kg</span>
                  )}
                  {bag.grade && <Badge variant="outline" className="text-[10px] ml-auto shrink-0">{bag.grade}</Badge>}
                </div>
              ))}
            </div>
            {bags.length >= 200 && (
              <p className="text-xs text-muted-foreground text-center mt-2">Showing first 200 bags</p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Documents */}
      {documents.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="h-4 w-4" />Documents
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {documents.map(doc => (
                <div key={doc.id} className="flex items-center justify-between p-2.5 rounded-lg border border-border text-sm">
                  <div className="flex items-center gap-2">
                    <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="font-medium">{doc.title}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {doc.expiry_date && (
                      <span className="text-xs text-muted-foreground">{new Date(doc.expiry_date).toLocaleDateString()}</span>
                    )}
                    <Badge variant="outline" className="text-xs capitalize">{doc.status}</Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Lab Results */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <FlaskConical className="h-4 w-4" />
                Lab Results ({labResults.length})
              </CardTitle>
              <CardDescription>Pesticide residue and quality tests for this batch</CardDescription>
            </div>
            <Button variant="outline" size="sm" asChild>
              <Link href={`/app/lab-results?prefillBatchId=${id}`}>
                <Plus className="h-4 w-4 mr-1" /> Upload
              </Link>
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {labResults.length === 0 ? (
            <div className="text-center py-6">
              <FlaskConical className="h-8 w-8 text-muted-foreground mx-auto mb-2 opacity-40" />
              <p className="text-sm text-muted-foreground">No lab results for this batch yet.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {labResults.map((lr: any) => (
                <div key={lr.id} className="flex items-center justify-between gap-3 p-3 rounded-md bg-muted/50">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium">{lr.test_type?.replace(/_/g, ' ')}</span>
                      <Badge
                        variant={lr.overall_result === 'pass' ? 'default' : lr.overall_result === 'fail' ? 'destructive' : 'secondary'}
                        className="text-xs"
                      >
                        {lr.overall_result?.toUpperCase()}
                      </Badge>
                      {lr.mrl_flags && Array.isArray(lr.mrl_flags) && lr.mrl_flags.length > 0 && (
                        <Badge variant="destructive" className="text-xs">
                          {lr.mrl_flags.length} MRL exceedance{lr.mrl_flags.length > 1 ? 's' : ''}
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {lr.lab_provider} · {lr.test_date ? new Date(lr.test_date).toLocaleDateString() : '—'}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Activity Timeline */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Activity className="h-4 w-4" />Activity
          </CardTitle>
          <CardDescription>Audit trail for this batch</CardDescription>
        </CardHeader>
        <CardContent>
          {!activityFetched ? (
            <div className="text-center py-6">
              <Button variant="outline" size="sm" onClick={() => fetchActivity(batch.id)}>
                Load Activity
              </Button>
            </div>
          ) : activityLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : activityEvents.length === 0 ? (
            <div className="flex flex-col items-center py-8 text-center">
              <Clock className="h-8 w-8 text-muted-foreground opacity-30 mb-2" />
              <p className="text-sm font-medium">No activity recorded</p>
              <p className="text-xs text-muted-foreground mt-0.5">Changes to this batch will appear here</p>
            </div>
          ) : (
            <div className="space-y-0">
              {activityEvents.map((ev: any, i: number) => {
                const isLast = i === activityEvents.length - 1;
                const label = (ev.action || ev.event_type || 'updated').replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase());
                return (
                  <div key={ev.id || i} className="flex gap-3">
                    <div className="flex flex-col items-center">
                      <div className="h-6 w-6 rounded-full bg-muted flex items-center justify-center shrink-0">
                        <Clock className="h-3 w-3 text-muted-foreground" />
                      </div>
                      {!isLast && <div className="w-0.5 flex-1 bg-border mt-1 min-h-[16px]" />}
                    </div>
                    <div className="pb-3">
                      <p className="text-sm font-medium">{label}</p>
                      <p className="text-xs text-muted-foreground">
                        {ev.actor_email || 'System'}{ev.created_at && ` · ${new Date(ev.created_at).toLocaleString('en-NG', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}`}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

    </div>
  );
}
