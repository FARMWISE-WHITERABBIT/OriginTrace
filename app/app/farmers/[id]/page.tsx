'use client';

import { use, useEffect, useState } from 'react';
import { notFound } from 'next/navigation';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useOrg } from '@/lib/contexts/org-context';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import {
  Loader2, ArrowLeft, User, Phone, MapPin, Leaf, Package,
  GraduationCap, Pencil, Save, X, CheckCircle2, AlertCircle,
  TrendingUp, Calendar, FlaskConical, BookOpen, FileText,
  Sprout, ShieldCheck, Clock, Activity,
} from 'lucide-react';

interface FarmerData {
  farm: any;
  ledger: any;
  batches: any[];
  inputs: any[];
  training: any[];
  files: any[];
}

const COMPLIANCE_STATUS_CONFIG: Record<string, { label: string; color: string; icon: any }> = {
  approved: { label: 'Approved',  color: 'bg-green-500/10 text-green-700 dark:text-green-400',  icon: CheckCircle2 },
  pending:  { label: 'Pending',   color: 'bg-amber-500/10 text-amber-700 dark:text-amber-400',   icon: Clock },
  rejected: { label: 'Rejected',  color: 'bg-red-500/10 text-red-700 dark:text-red-400',         icon: AlertCircle },
};

const MODULE_LABELS: Record<string, string> = {
  gap:           'Good Agricultural Practices (GAP)',
  safety:        'Health & Safety',
  sustainability:'Sustainability & Environment',
  organic:       'Organic Farming Methods',
  child_labor:   'Child Labor Awareness',
  eudr_awareness:'EUDR Compliance Awareness',
};

const INPUT_TYPE_LABELS: Record<string, string> = {
  fertilizer:        'Fertilizer',
  pesticide:         'Pesticide',
  herbicide:         'Herbicide',
  seed:              'Seed / Planting Material',
  organic_amendment: 'Organic Amendment',
};

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4 py-3 border-b border-border last:border-0">
      <span className="text-sm text-muted-foreground sm:w-44 shrink-0">{label}</span>
      <span className="text-sm font-medium">{value || <span className="text-muted-foreground/50">—</span>}</span>
    </div>
  );
}

export default function FarmerDetailPage({ params: paramsPromise }: { params: Promise<{ id: string }> }) {
  const { id } = use(paramsPromise);
  const { profile } = useOrg();
  const router = useRouter();
  const { toast } = useToast();

  const [data, setData] = useState<FarmerData | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editForm, setEditForm] = useState<Record<string, any>>({});
  const [activityEvents, setActivityEvents] = useState<any[]>([]);
  const [activityLoading, setActivityLoading] = useState(false);
  const [activityFetched, setActivityFetched] = useState(false);

  const canEdit = profile?.role === 'admin' || profile?.role === 'aggregator';

  const fetchActivity = async (farmId: string) => {
    if (activityFetched) return;
    setActivityLoading(true);
    try {
      const res = await fetch(`/api/audit?resource_type=farm&resource_id=${farmId}&limit=30`);
      if (!res.ok) return;
      const d = await res.json();
      setActivityEvents(d.logs || d.events || []);
      setActivityFetched(true);
    } catch { /* ignore */ }
    finally { setActivityLoading(false); }
  };

  useEffect(() => {
    fetch(`/api/farmers/${id}`)
      .then(r => r.json())
      .then(d => {
        if (d.error) { router.push('/app/farmers'); return; }
        setData(d);
        setEditForm({
          farmer_name:       d.farm.farmer_name,
          phone:             d.farm.phone || '',
          community:         d.farm.community || '',
          area_hectares:     d.farm.area_hectares || '',
          commodity:         d.farm.commodity || '',
          compliance_status: d.farm.compliance_status || 'pending',
          compliance_notes:  d.farm.compliance_notes || '',
        });
      })
      .catch(() => router.push('/app/farmers'))
      .finally(() => setLoading(false));
  }, [id, router]);

  async function handleSave() {
    setSaving(true);
    try {
      const res = await fetch(`/api/farmers/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Save failed');
      setData(prev => prev ? { ...prev, farm: json.farm } : prev);
      setEditing(false);
      toast({ title: 'Farmer profile updated' });
    } catch (err: any) {
      toast({ title: 'Save failed', description: err.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!data) { notFound(); return null; }

  const { farm, ledger, batches, inputs, training, files } = data;
  const statusCfg = COMPLIANCE_STATUS_CONFIG[farm.compliance_status] || COMPLIANCE_STATUS_CONFIG.pending;
  const StatusIcon = statusCfg.icon;
  const completedTraining = training.filter((t: any) => t.status === 'completed').length;

  return (
    <div className="space-y-6 max-w-5xl">

      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link href="/app/farmers">
            <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="Back to farmers">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-xl font-bold" data-testid="text-farmer-name">{farm.farmer_name}</h1>
            <p className="text-sm text-muted-foreground flex items-center gap-1 mt-0.5">
              <MapPin className="h-3.5 w-3.5" />
              {farm.community || 'Location not recorded'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge className={statusCfg.color} variant="outline">
            <StatusIcon className="h-3 w-3 mr-1" />
            {statusCfg.label}
          </Badge>
          {canEdit && !editing && (
            <Button size="sm" variant="outline" onClick={() => setEditing(true)} data-testid="button-edit-farmer">
              <Pencil className="h-3.5 w-3.5 mr-1.5" />
              Edit
            </Button>
          )}
          {editing && (
            <>
              <Button size="sm" variant="outline" onClick={() => setEditing(false)} disabled={saving}>
                <X className="h-3.5 w-3.5 mr-1.5" />
                Cancel
              </Button>
              <Button size="sm" onClick={handleSave} disabled={saving} data-testid="button-save-farmer">
                {saving ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <Save className="h-3.5 w-3.5 mr-1.5" />}
                Save
              </Button>
            </>
          )}
        </div>
      </div>

      {/* ── Stats strip ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { icon: Package,    label: 'Total Volume',    value: ledger ? `${Number(ledger.total_delivery_kg).toLocaleString()} kg` : '0 kg' },
          { icon: TrendingUp, label: 'Total Batches',   value: ledger?.total_batches ?? batches.length },
          { icon: Leaf,       label: 'Farm Area',       value: farm.area_hectares ? `${Number(farm.area_hectares).toFixed(2)} ha` : '—' },
          { icon: GraduationCap, label: 'Training',     value: `${completedTraining} / ${training.length} completed` },
        ].map(({ icon: Icon, label, value }) => (
          <Card key={label} className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <Icon className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">{label}</span>
            </div>
            <p className="text-lg font-bold">{value}</p>
          </Card>
        ))}
      </div>

      {/* ── Tabs ── */}
      <Tabs defaultValue="profile">
        <TabsList className="w-full sm:w-auto">
          <TabsTrigger value="profile" className="flex items-center gap-1.5">
            <User className="h-3.5 w-3.5" /> Profile
          </TabsTrigger>
          <TabsTrigger value="inputs" className="flex items-center gap-1.5">
            <FlaskConical className="h-3.5 w-3.5" />
            Inputs
            {inputs.length > 0 && <Badge variant="secondary" className="ml-1 h-4 text-[10px]">{inputs.length}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="training" className="flex items-center gap-1.5">
            <BookOpen className="h-3.5 w-3.5" />
            Training
            {training.length > 0 && <Badge variant="secondary" className="ml-1 h-4 text-[10px]">{training.length}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="batches" className="flex items-center gap-1.5">
            <Package className="h-3.5 w-3.5" />
            Batches
            {batches.length > 0 && <Badge variant="secondary" className="ml-1 h-4 text-[10px]">{batches.length}</Badge>}
          </TabsTrigger>
          <TabsTrigger
            value="activity"
            className="flex items-center gap-1.5"
            onClick={() => fetchActivity(farm.id)}
          >
            <Activity className="h-3.5 w-3.5" />Activity
          </TabsTrigger>
        </TabsList>

        {/* ── Profile Tab ── */}
        <TabsContent value="profile" className="space-y-4 mt-4">
          <div className="grid lg:grid-cols-2 gap-4">

            {/* Identity */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2"><User className="h-4 w-4" />Identity</CardTitle>
              </CardHeader>
              <CardContent>
                {editing ? (
                  <div className="space-y-3">
                    <div>
                      <Label className="text-xs">Full Name</Label>
                      <Input value={editForm.farmer_name} onChange={e => setEditForm(p => ({ ...p, farmer_name: e.target.value }))} className="mt-1" />
                    </div>
                    <div>
                      <Label className="text-xs">Phone Number</Label>
                      <Input value={editForm.phone} onChange={e => setEditForm(p => ({ ...p, phone: e.target.value }))} placeholder="+234..." className="mt-1" />
                    </div>
                    <div>
                      <Label className="text-xs">Commodity</Label>
                      <Input value={editForm.commodity} onChange={e => setEditForm(p => ({ ...p, commodity: e.target.value }))} placeholder="e.g. ginger, cocoa" className="mt-1" />
                    </div>
                  </div>
                ) : (
                  <div>
                    <InfoRow label="Full Name"     value={farm.farmer_name} />
                    <InfoRow label="Phone"         value={farm.phone} />
                    <InfoRow label="Farmer ID"     value={farm.farmer_id} />
                    <InfoRow label="Commodity"     value={farm.commodity} />
                    <InfoRow label="Consent"       value={
                      farm.consent_timestamp
                        ? <span className="flex items-center gap-1 text-green-600 dark:text-green-400"><CheckCircle2 className="h-3.5 w-3.5" />Captured {new Date(farm.consent_timestamp).toLocaleDateString()}</span>
                        : <span className="flex items-center gap-1 text-amber-600"><AlertCircle className="h-3.5 w-3.5" />Not recorded</span>
                    } />
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Location */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2"><MapPin className="h-4 w-4" />Location & Farm</CardTitle>
              </CardHeader>
              <CardContent>
                {editing ? (
                  <div className="space-y-3">
                    <div>
                      <Label className="text-xs">Community / Village</Label>
                      <Input value={editForm.community} onChange={e => setEditForm(p => ({ ...p, community: e.target.value }))} className="mt-1" />
                    </div>
                    <div>
                      <Label className="text-xs">Farm Area (hectares)</Label>
                      <Input type="number" step="0.01" value={editForm.area_hectares} onChange={e => setEditForm(p => ({ ...p, area_hectares: e.target.value }))} className="mt-1" />
                    </div>
                  </div>
                ) : (
                  <div>
                    <InfoRow label="Community"     value={farm.community} />
                    <InfoRow label="Farm Area"     value={farm.area_hectares ? `${Number(farm.area_hectares).toFixed(2)} ha` : null} />
                    <InfoRow label="GPS Boundary"  value={farm.boundary ? <span className="flex items-center gap-1 text-green-600 dark:text-green-400"><CheckCircle2 className="h-3.5 w-3.5" />Mapped</span> : <span className="text-amber-600">Not mapped</span>} />
                    <InfoRow label="Registered"    value={new Date(farm.created_at).toLocaleDateString()} />
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Compliance status */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2"><ShieldCheck className="h-4 w-4" />Compliance Status</CardTitle>
              </CardHeader>
              <CardContent>
                {editing ? (
                  <div className="space-y-3">
                    <div>
                      <Label className="text-xs">Status</Label>
                      <Select value={editForm.compliance_status} onValueChange={v => setEditForm(p => ({ ...p, compliance_status: v }))}>
                        <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="approved">Approved</SelectItem>
                          <SelectItem value="pending">Pending</SelectItem>
                          <SelectItem value="rejected">Rejected</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-xs">Notes</Label>
                      <Textarea value={editForm.compliance_notes} onChange={e => setEditForm(p => ({ ...p, compliance_notes: e.target.value }))} className="mt-1 text-sm" rows={3} />
                    </div>
                  </div>
                ) : (
                  <div>
                    <InfoRow label="Status"        value={<Badge className={statusCfg.color} variant="outline">{statusCfg.label}</Badge>} />
                    <InfoRow label="Notes"         value={farm.compliance_notes} />
                  </div>
                )}
              </CardContent>
            </Card>

            {/* KYC documents */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2"><FileText className="h-4 w-4" />KYC Documents</CardTitle>
              </CardHeader>
              <CardContent>
                {files.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-2">No documents uploaded yet.</p>
                ) : (
                  <div className="space-y-2">
                    {files.map((f: any) => (
                      <div key={f.id} className="flex items-center justify-between text-sm">
                        <span className="capitalize text-muted-foreground">{f.file_type?.replace('_', ' ')}</span>
                        <span className="text-xs text-muted-foreground">{f.file_name}</span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ── Inputs Tab ── */}
        <TabsContent value="inputs" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2"><Sprout className="h-4 w-4" />Agricultural Inputs</CardTitle>
              <CardDescription>Fertilizers, pesticides, herbicides, seeds, and organic amendments applied to this farm. Required for Rainforest Alliance, EUDR, and GACC compliance records.</CardDescription>
            </CardHeader>
            <CardContent>
              {inputs.length === 0 ? (
                <div className="text-center py-10">
                  <FlaskConical className="h-10 w-10 mx-auto mb-3 text-muted-foreground opacity-30" />
                  <p className="font-medium text-sm">No input records yet</p>
                  <p className="text-xs text-muted-foreground mt-1 max-w-xs mx-auto">
                    Record fertilizers, pesticides, and other inputs used on this farm. These records are required for GACC MRL compliance and Rainforest Alliance audits.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {inputs.map((input: any) => (
                    <div key={input.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 rounded-lg border border-border bg-muted/30">
                      <div className="flex items-start gap-3">
                        <div className="h-8 w-8 rounded-md bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                          <FlaskConical className="h-4 w-4 text-primary" />
                        </div>
                        <div>
                          <p className="text-sm font-medium">{input.product_name || INPUT_TYPE_LABELS[input.input_type] || input.input_type}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {INPUT_TYPE_LABELS[input.input_type]} · {input.quantity} {input.unit}
                            {input.area_applied_hectares ? ` · ${input.area_applied_hectares} ha` : ''}
                          </p>
                          {input.notes && <p className="text-xs text-muted-foreground mt-0.5 italic">{input.notes}</p>}
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-xs text-muted-foreground flex items-center gap-1 justify-end">
                          <Calendar className="h-3 w-3" />
                          {input.application_date ? new Date(input.application_date).toLocaleDateString() : '—'}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Training Tab ── */}
        <TabsContent value="training" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2"><GraduationCap className="h-4 w-4" />Training Records</CardTitle>
              <CardDescription>Compliance and sustainability training modules. Required for Rainforest Alliance certification and EUDR due diligence records.</CardDescription>
            </CardHeader>
            <CardContent>
              {training.length === 0 ? (
                <div className="text-center py-10">
                  <BookOpen className="h-10 w-10 mx-auto mb-3 text-muted-foreground opacity-30" />
                  <p className="font-medium text-sm">No training records yet</p>
                  <p className="text-xs text-muted-foreground mt-1 max-w-xs mx-auto">
                    Record GAP training, child labor awareness, sustainability modules, and EUDR awareness sessions. These are required for Rainforest Alliance and major buyer audits.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {training.map((t: any) => (
                    <div key={t.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 rounded-lg border border-border bg-muted/30">
                      <div className="flex items-start gap-3">
                        <div className={`h-8 w-8 rounded-md flex items-center justify-center shrink-0 mt-0.5 ${t.status === 'completed' ? 'bg-green-500/10' : 'bg-amber-500/10'}`}>
                          <GraduationCap className={`h-4 w-4 ${t.status === 'completed' ? 'text-green-600 dark:text-green-400' : 'text-amber-600'}`} />
                        </div>
                        <div>
                          <p className="text-sm font-medium">{t.module_name}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">{MODULE_LABELS[t.module_type] || t.module_type}</p>
                          {t.score != null && <p className="text-xs text-muted-foreground">Score: {t.score}%</p>}
                        </div>
                      </div>
                      <div className="text-right shrink-0 flex flex-col items-end gap-1">
                        <Badge variant={t.status === 'completed' ? 'default' : 'secondary'} className={t.status === 'completed' ? 'bg-green-500/10 text-green-700 dark:text-green-400 border-green-200' : ''}>
                          {t.status === 'completed' ? 'Completed' : t.status === 'in_progress' ? 'In Progress' : 'Not Started'}
                        </Badge>
                        {t.completed_at && (
                          <p className="text-xs text-muted-foreground">{new Date(t.completed_at).toLocaleDateString()}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Batches Tab ── */}
        <TabsContent value="batches" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2"><Package className="h-4 w-4" />Collection Batches</CardTitle>
              <CardDescription>All produce collected from this farm, linked for full supply chain traceability.</CardDescription>
            </CardHeader>
            <CardContent>
              {batches.length === 0 ? (
                <div className="text-center py-10">
                  <Package className="h-10 w-10 mx-auto mb-3 text-muted-foreground opacity-30" />
                  <p className="font-medium text-sm">No collection batches yet</p>
                  <p className="text-xs text-muted-foreground mt-1">Batches will appear here once produce is collected from this farm.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {batches.map((b: any) => (
                    <Link key={b.id} href={`/app/inventory?batch=${b.id}`} className="block group">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 rounded-lg border border-border hover:border-primary/40 hover:bg-muted/30 transition-colors">
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-md bg-primary/10 flex items-center justify-center shrink-0">
                            <Package className="h-4 w-4 text-primary" />
                          </div>
                          <div>
                            <p className="text-sm font-mono font-medium group-hover:text-primary transition-colors">{b.batch_code || b.id.slice(0, 8)}</p>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {Number(b.total_weight).toLocaleString()} kg · {b.bag_count} bags
                              {b.grade ? ` · ${b.grade}` : ''}
                              {b.commodity ? ` · ${b.commodity}` : ''}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <Badge variant={b.status === 'completed' ? 'default' : 'secondary'} className="text-xs capitalize">
                            {b.status}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {b.collected_at ? new Date(b.collected_at).toLocaleDateString() : '—'}
                          </span>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Activity Tab ── */}
        <TabsContent value="activity" className="mt-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Activity className="h-4 w-4" />Activity Timeline
              </CardTitle>
              <CardDescription>Audit trail of changes to this farmer record</CardDescription>
            </CardHeader>
            <CardContent>
              {activityLoading ? (
                <div className="flex items-center justify-center py-10">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              ) : activityEvents.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 text-center">
                  <Clock className="h-8 w-8 text-muted-foreground opacity-30 mb-3" />
                  <p className="text-sm font-medium">No activity recorded yet</p>
                  <p className="text-xs text-muted-foreground mt-1">Changes to this farmer profile will appear here</p>
                </div>
              ) : (
                <div className="space-y-0">
                  {activityEvents.map((event: any, i: number) => {
                    const isLast = i === activityEvents.length - 1;
                    const action = event.action || event.event_type || 'updated';
                    const actor = event.actor_email || event.actor_name || 'System';
                    const ts = event.created_at;
                    const label = action
                      .replace(/_/g, ' ')
                      .replace(/\b\w/g, (c: string) => c.toUpperCase());
                    return (
                      <div key={event.id || i} className="flex gap-3">
                        <div className="flex flex-col items-center">
                          <div className="h-7 w-7 rounded-full bg-muted flex items-center justify-center shrink-0 z-10">
                            <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                          </div>
                          {!isLast && <div className="w-0.5 flex-1 bg-border mt-1 min-h-[20px]" />}
                        </div>
                        <div className={`pb-4 ${isLast ? '' : ''}`}>
                          <p className="text-sm font-medium">{label}</p>
                          <div className="flex items-center gap-2 mt-0.5 text-xs text-muted-foreground">
                            <span>{actor}</span>
                            {ts && (
                              <>
                                <span>·</span>
                                <span>{new Date(ts).toLocaleString('en-NG', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                              </>
                            )}
                          </div>
                          {event.metadata && Object.keys(event.metadata).length > 0 && (
                            <div className="mt-1.5 text-xs text-muted-foreground bg-muted/40 rounded px-2 py-1 font-mono">
                              {Object.entries(event.metadata).slice(0, 3).map(([k, v]) => (
                                <span key={k} className="mr-2">{k}: {String(v)}</span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
