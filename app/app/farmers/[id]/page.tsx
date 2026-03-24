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
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import {
  Loader2, ArrowLeft, User, Phone, MapPin, Leaf, Package,
  GraduationCap, Pencil, Save, X, CheckCircle2, AlertCircle,
  TrendingUp, Calendar, FlaskConical, BookOpen, FileText,
  Sprout, ShieldCheck, Clock, Activity, Plus, Trash2, IdCard,
  Upload, ExternalLink,
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
  const [editingCard, setEditingCard] = useState<'identity' | 'location' | 'compliance' | null>(null);
  const [savingCard, setSavingCard] = useState(false);
  const [identityForm, setIdentityForm] = useState<Record<string, any>>({});
  const [locationForm, setLocationForm] = useState<Record<string, any>>({});
  const [complianceForm, setComplianceForm] = useState<Record<string, any>>({});
  const [kycSheetOpen, setKycSheetOpen] = useState(false);
  const [kycFileType, setKycFileType] = useState('photo');
  const [kycFile, setKycFile] = useState<File | null>(null);
  const [savingKyc, setSavingKyc] = useState(false);
  const [activityEvents, setActivityEvents] = useState<any[]>([]);

  // Inputs management
  const [inputSheetOpen, setInputSheetOpen] = useState(false);
  const [editingInput, setEditingInput] = useState<any | null>(null);
  const [deletingInputId, setDeletingInputId] = useState<string | null>(null);
  const [savingInput, setSavingInput] = useState(false);
  const [inputForm, setInputForm] = useState({
    input_type: 'fertilizer',
    product_name: '',
    quantity: '',
    unit: 'kg',
    application_date: new Date().toISOString().split('T')[0],
    area_applied_hectares: '',
    notes: '',
  });

  // Training management
  const [trainingSheetOpen, setTrainingSheetOpen] = useState(false);
  const [editingTraining, setEditingTraining] = useState<any | null>(null);
  const [deletingTrainingId, setDeletingTrainingId] = useState<string | null>(null);
  const [savingTraining, setSavingTraining] = useState(false);
  const [trainingForm, setTrainingForm] = useState({
    module_name: '',
    module_type: 'gap',
    status: 'not_started',
    score: '',
    completed_at: '',
  });

  const canEdit = profile?.role === 'admin' || profile?.role === 'aggregator';

  useEffect(() => {
    fetch(`/api/farmers/${id}`)
      .then(r => r.json())
      .then(d => {
        if (d.error) { router.push('/app/farmers'); return; }
        setData(d);
        setActivityEvents(d.activity || []);
        setIdentityForm({ farmer_name: d.farm.farmer_name, farmer_id: d.farm.farmer_id || '', phone: d.farm.phone || '', commodity: d.farm.commodity || '' });
        setLocationForm({ community: d.farm.community || '', area_hectares: d.farm.area_hectares || '' });
        setComplianceForm({ compliance_status: d.farm.compliance_status || 'pending', compliance_notes: d.farm.compliance_notes || '' });
      })
      .catch(() => router.push('/app/farmers'))
      .finally(() => setLoading(false));
  }, [id, router]);

  async function handleSaveCard(card: 'identity' | 'location' | 'compliance') {
    setSavingCard(true);
    const formData = card === 'identity' ? identityForm : card === 'location' ? locationForm : complianceForm;
    try {
      const res = await fetch(`/api/farmers/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Save failed');
      setData(prev => prev ? { ...prev, farm: json.farm } : prev);
      if (card === 'identity') setIdentityForm({ farmer_name: json.farm.farmer_name, farmer_id: json.farm.farmer_id || '', phone: json.farm.phone || '', commodity: json.farm.commodity || '' });
      else if (card === 'location') setLocationForm({ community: json.farm.community || '', area_hectares: json.farm.area_hectares || '' });
      else setComplianceForm({ compliance_status: json.farm.compliance_status || 'pending', compliance_notes: json.farm.compliance_notes || '' });
      setEditingCard(null);
      toast({ title: 'Saved' });
    } catch (err: any) {
      toast({ title: 'Save failed', description: err.message, variant: 'destructive' });
    } finally {
      setSavingCard(false);
    }
  }

  async function handleKycUpload() {
    if (!kycFile) return;
    setSavingKyc(true);
    try {
      const fd = new FormData();
      fd.append('file', kycFile);
      fd.append('file_type', kycFileType);
      const res = await fetch(`/api/farmers/${id}/files`, { method: 'POST', body: fd });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Upload failed');
      setData(prev => prev ? { ...prev, files: [json.file, ...prev.files] } : prev);
      setKycSheetOpen(false);
      setKycFile(null);
      toast({ title: 'Document uploaded' });
    } catch (err: any) {
      toast({ title: 'Upload failed', description: err.message, variant: 'destructive' });
    } finally {
      setSavingKyc(false);
    }
  }

  function openAddInput() {
    setEditingInput(null);
    setInputForm({ input_type: 'fertilizer', product_name: '', quantity: '', unit: 'kg', application_date: new Date().toISOString().split('T')[0], area_applied_hectares: '', notes: '' });
    setInputSheetOpen(true);
  }
  function openEditInput(input: any) {
    setEditingInput(input);
    setInputForm({ input_type: input.input_type, product_name: input.product_name || '', quantity: input.quantity ?? '', unit: input.unit || 'kg', application_date: input.application_date || '', area_applied_hectares: input.area_applied_hectares ?? '', notes: input.notes || '' });
    setInputSheetOpen(true);
  }
  async function saveInput() {
    if (!data) return;
    setSavingInput(true);
    const body = { ...inputForm, quantity: inputForm.quantity ? parseFloat(String(inputForm.quantity)) : undefined, area_applied_hectares: inputForm.area_applied_hectares ? parseFloat(String(inputForm.area_applied_hectares)) : undefined };
    try {
      const url = `/api/farmers/${id}/inputs`;
      const method = editingInput ? 'PATCH' : 'POST';
      const payload = editingInput ? { ...body, id: editingInput.id } : body;
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed');
      const saved = json.input;
      setData(prev => prev ? { ...prev, inputs: editingInput ? prev.inputs.map(i => i.id === saved.id ? saved : i) : [saved, ...prev.inputs] } : prev);
      setInputSheetOpen(false);
      toast({ title: editingInput ? 'Input updated' : 'Input added' });
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally { setSavingInput(false); }
  }
  async function deleteInput(inputId: string) {
    setDeletingInputId(inputId);
    try {
      const res = await fetch(`/api/farmers/${id}/inputs?input_id=${inputId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error((await res.json()).error);
      setData(prev => prev ? { ...prev, inputs: prev.inputs.filter(i => i.id !== inputId) } : prev);
      toast({ title: 'Input removed' });
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally { setDeletingInputId(null); }
  }

  function openAddTraining() {
    setEditingTraining(null);
    setTrainingForm({ module_name: '', module_type: 'gap', status: 'not_started', score: '', completed_at: '' });
    setTrainingSheetOpen(true);
  }
  function openEditTraining(t: any) {
    setEditingTraining(t);
    setTrainingForm({ module_name: t.module_name, module_type: t.module_type, status: t.status, score: t.score ?? '', completed_at: t.completed_at ? t.completed_at.split('T')[0] : '' });
    setTrainingSheetOpen(true);
  }
  async function saveTraining() {
    if (!data) return;
    setSavingTraining(true);
    const body = { ...trainingForm, score: trainingForm.score !== '' ? parseFloat(String(trainingForm.score)) : undefined };
    try {
      const url = `/api/farmers/${id}/training`;
      const method = editingTraining ? 'PATCH' : 'POST';
      const payload = editingTraining ? { ...body, id: editingTraining.id } : body;
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed');
      const saved = json.record;
      setData(prev => prev ? { ...prev, training: editingTraining ? prev.training.map(t => t.id === saved.id ? saved : t) : [saved, ...prev.training] } : prev);
      setTrainingSheetOpen(false);
      toast({ title: editingTraining ? 'Training updated' : 'Training record added' });
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally { setSavingTraining(false); }
  }
  async function deleteTraining(trainingId: string) {
    setDeletingTrainingId(trainingId);
    try {
      const res = await fetch(`/api/farmers/${id}/training?training_id=${trainingId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error((await res.json()).error);
      setData(prev => prev ? { ...prev, training: prev.training.filter(t => t.id !== trainingId) } : prev);
      toast({ title: 'Training record removed' });
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally { setDeletingTrainingId(null); }
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
          <TabsTrigger value="activity" className="flex items-center gap-1.5">
            <Activity className="h-3.5 w-3.5" />Activity
            {activityEvents.length > 0 && <Badge variant="secondary" className="ml-1 h-4 text-[10px]">{activityEvents.length}</Badge>}
          </TabsTrigger>
        </TabsList>

        {/* ── Profile Tab ── */}
        <TabsContent value="profile" className="space-y-4 mt-4">
          <div className="grid lg:grid-cols-2 gap-4">

            {/* Identity */}
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2"><User className="h-4 w-4" />Identity</CardTitle>
                  {canEdit && editingCard !== 'identity' && (
                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setEditingCard('identity')} data-testid="button-edit-farmer">
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {editingCard === 'identity' ? (
                  <div className="space-y-3">
                    <div>
                      <Label className="text-xs">Full Name</Label>
                      <Input value={identityForm.farmer_name} onChange={e => setIdentityForm(p => ({ ...p, farmer_name: e.target.value }))} className="mt-1" />
                    </div>
                    <div>
                      <Label className="text-xs">Farmer ID</Label>
                      <Input value={identityForm.farmer_id} onChange={e => setIdentityForm(p => ({ ...p, farmer_id: e.target.value }))} placeholder="e.g. FRM-202401-A3B2C" className="mt-1 font-mono" />
                      <p className="text-xs text-muted-foreground mt-0.5">Auto-generated on registration. Edit only if correcting an import.</p>
                    </div>
                    <div>
                      <Label className="text-xs">Phone Number</Label>
                      <Input value={identityForm.phone} onChange={e => setIdentityForm(p => ({ ...p, phone: e.target.value }))} placeholder="+234..." className="mt-1" />
                    </div>
                    <div>
                      <Label className="text-xs">Commodity</Label>
                      <Input value={identityForm.commodity} onChange={e => setIdentityForm(p => ({ ...p, commodity: e.target.value }))} placeholder="e.g. ginger, cocoa" className="mt-1" />
                    </div>
                    <div className="flex gap-2 pt-1">
                      <Button size="sm" onClick={() => handleSaveCard('identity')} disabled={savingCard} data-testid="button-save-farmer">
                        {savingCard ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <Save className="h-3.5 w-3.5 mr-1.5" />}Save
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => setEditingCard(null)} disabled={savingCard}><X className="h-3.5 w-3.5 mr-1.5" />Cancel</Button>
                    </div>
                  </div>
                ) : (
                  <div>
                    {farm.photo_url && (
                      <div className="flex justify-center mb-4">
                        <img src={farm.photo_url} alt={farm.farmer_name} className="h-20 w-20 rounded-full object-cover border-2 border-border" />
                      </div>
                    )}
                    <InfoRow label="Full Name"     value={farm.farmer_name} />
                    <InfoRow label="Farmer ID"     value={<span className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">{farm.farmer_id || '—'}</span>} />
                    <InfoRow label="Phone"         value={farm.phone} />
                    <InfoRow label="Commodity"     value={farm.commodity} />
                    <InfoRow label="Consent"       value={
                      farm.consent_timestamp
                        ? <span className="flex items-center gap-1 text-green-600 dark:text-green-400"><CheckCircle2 className="h-3.5 w-3.5" />Captured {new Date(farm.consent_timestamp).toLocaleDateString()}</span>
                        : <span className="flex items-center gap-1 text-amber-600"><AlertCircle className="h-3.5 w-3.5" />Not recorded</span>
                    } />
                    {farm.consent_signature && (
                      <div className="mt-3">
                        <p className="text-xs text-muted-foreground mb-1.5">Consent Signature</p>
                        <div className="rounded-md border border-border bg-white p-2 inline-block">
                          <img src={farm.consent_signature} alt="Consent signature" className="h-16 w-auto max-w-full" />
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Location */}
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2"><MapPin className="h-4 w-4" />Location & Farm</CardTitle>
                  {canEdit && editingCard !== 'location' && (
                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setEditingCard('location')}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {editingCard === 'location' ? (
                  <div className="space-y-3">
                    <div>
                      <Label className="text-xs">Community / Village</Label>
                      <Input value={locationForm.community} onChange={e => setLocationForm(p => ({ ...p, community: e.target.value }))} className="mt-1" />
                    </div>
                    <div>
                      <Label className="text-xs">Farm Area (hectares)</Label>
                      <Input type="number" step="0.01" value={locationForm.area_hectares} onChange={e => setLocationForm(p => ({ ...p, area_hectares: e.target.value }))} className="mt-1" />
                    </div>
                    <div className="flex gap-2 pt-1">
                      <Button size="sm" onClick={() => handleSaveCard('location')} disabled={savingCard}>
                        {savingCard ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <Save className="h-3.5 w-3.5 mr-1.5" />}Save
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => setEditingCard(null)} disabled={savingCard}><X className="h-3.5 w-3.5 mr-1.5" />Cancel</Button>
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
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2"><ShieldCheck className="h-4 w-4" />Compliance Status</CardTitle>
                  {canEdit && editingCard !== 'compliance' && (
                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setEditingCard('compliance')}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {editingCard === 'compliance' ? (
                  <div className="space-y-3">
                    <div>
                      <Label className="text-xs">Status</Label>
                      <Select value={complianceForm.compliance_status} onValueChange={v => setComplianceForm(p => ({ ...p, compliance_status: v }))}>
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
                      <Textarea value={complianceForm.compliance_notes} onChange={e => setComplianceForm(p => ({ ...p, compliance_notes: e.target.value }))} className="mt-1 text-sm" rows={3} />
                    </div>
                    <div className="flex gap-2 pt-1">
                      <Button size="sm" onClick={() => handleSaveCard('compliance')} disabled={savingCard}>
                        {savingCard ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <Save className="h-3.5 w-3.5 mr-1.5" />}Save
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => setEditingCard(null)} disabled={savingCard}><X className="h-3.5 w-3.5 mr-1.5" />Cancel</Button>
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
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2"><FileText className="h-4 w-4" />KYC Documents</CardTitle>
                  {canEdit && (
                    <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => { setKycFile(null); setKycFileType('photo'); setKycSheetOpen(true); }}>
                      <Upload className="h-3 w-3 mr-1" />Upload
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {files.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-2">No documents uploaded yet.</p>
                ) : (
                  <div className="space-y-2">
                    {files.map((f: any) => {
                      const verColor = f.verification_status === 'verified' ? 'bg-green-500/10 text-green-700 dark:text-green-400' : f.verification_status === 'rejected' ? 'bg-red-500/10 text-red-700 dark:text-red-400' : 'bg-amber-500/10 text-amber-700 dark:text-amber-400';
                      return (
                        <div key={f.id} className="flex items-center justify-between gap-2 py-1.5 border-b border-border last:border-0">
                          <span className="text-sm capitalize">{f.file_type?.replace(/_/g, ' ')}</span>
                          <div className="flex items-center gap-2 shrink-0">
                            <Badge variant="outline" className={`text-xs ${verColor}`}>{f.verification_status || 'pending'}</Badge>
                            {f.file_url && (
                              <a href={f.file_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-xs text-primary hover:underline">
                                View<ExternalLink className="h-3 w-3" />
                              </a>
                            )}
                          </div>
                        </div>
                      );
                    })}
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
              <div className="flex items-start justify-between gap-2">
                <div>
                  <CardTitle className="text-base flex items-center gap-2"><Sprout className="h-4 w-4" />Agricultural Inputs</CardTitle>
                  <CardDescription className="mt-1">Fertilizers, pesticides, herbicides, seeds, and organic amendments. Required for Rainforest Alliance, EUDR, and GACC compliance records.</CardDescription>
                </div>
                {canEdit && (
                  <Button size="sm" variant="outline" onClick={openAddInput} className="shrink-0">
                    <Plus className="h-3.5 w-3.5 mr-1.5" />Add Input
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {inputs.length === 0 ? (
                <div className="text-center py-10">
                  <FlaskConical className="h-10 w-10 mx-auto mb-3 text-muted-foreground opacity-30" />
                  <p className="font-medium text-sm">No input records yet</p>
                  <p className="text-xs text-muted-foreground mt-1 max-w-xs mx-auto">Record fertilizers, pesticides, and other inputs. Required for GACC MRL compliance and Rainforest Alliance audits.</p>
                  {canEdit && <Button size="sm" variant="outline" className="mt-4" onClick={openAddInput}><Plus className="h-3.5 w-3.5 mr-1.5" />Add First Input</Button>}
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
                      <div className="flex items-center gap-2 shrink-0">
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {input.application_date ? new Date(input.application_date).toLocaleDateString() : '—'}
                        </p>
                        {canEdit && (
                          <>
                            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => openEditInput(input)}><Pencil className="h-3.5 w-3.5" /></Button>
                            <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => deleteInput(input.id)} disabled={deletingInputId === input.id}>
                              {deletingInputId === input.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                            </Button>
                          </>
                        )}
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
              <div className="flex items-start justify-between gap-2">
                <div>
                  <CardTitle className="text-base flex items-center gap-2"><GraduationCap className="h-4 w-4" />Training Records</CardTitle>
                  <CardDescription className="mt-1">Compliance and sustainability training modules. Required for Rainforest Alliance certification and EUDR due diligence records.</CardDescription>
                </div>
                {canEdit && (
                  <Button size="sm" variant="outline" onClick={openAddTraining} className="shrink-0">
                    <Plus className="h-3.5 w-3.5 mr-1.5" />Add Training
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {training.length === 0 ? (
                <div className="text-center py-10">
                  <BookOpen className="h-10 w-10 mx-auto mb-3 text-muted-foreground opacity-30" />
                  <p className="font-medium text-sm">No training records yet</p>
                  <p className="text-xs text-muted-foreground mt-1 max-w-xs mx-auto">Record GAP, child labor awareness, sustainability modules, and EUDR awareness sessions. Required for Rainforest Alliance and major buyer audits.</p>
                  {canEdit && <Button size="sm" variant="outline" className="mt-4" onClick={openAddTraining}><Plus className="h-3.5 w-3.5 mr-1.5" />Add First Training</Button>}
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
                      <div className="flex items-center gap-2 shrink-0">
                        <div className="flex flex-col items-end gap-1">
                          <Badge variant={t.status === 'completed' ? 'default' : 'secondary'} className={t.status === 'completed' ? 'bg-green-500/10 text-green-700 dark:text-green-400 border-green-200' : ''}>
                            {t.status === 'completed' ? 'Completed' : t.status === 'in_progress' ? 'In Progress' : 'Not Started'}
                          </Badge>
                          {t.completed_at && <p className="text-xs text-muted-foreground">{new Date(t.completed_at).toLocaleDateString()}</p>}
                        </div>
                        {canEdit && (
                          <>
                            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => openEditTraining(t)}><Pencil className="h-3.5 w-3.5" /></Button>
                            <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => deleteTraining(t.id)} disabled={deletingTrainingId === t.id}>
                              {deletingTrainingId === t.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                            </Button>
                          </>
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
              <div className="flex items-start justify-between gap-2">
                <div>
                  <CardTitle className="text-base flex items-center gap-2"><Package className="h-4 w-4" />Collection Batches</CardTitle>
                  <CardDescription className="mt-1">All produce collected from this farm, linked for full supply chain traceability.</CardDescription>
                </div>
                {canEdit && (
                  <Link href={`/app/collect?farm_id=${id}`}>
                    <Button size="sm" variant="outline" className="shrink-0">
                      <Plus className="h-3.5 w-3.5 mr-1.5" />New Collection
                    </Button>
                  </Link>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {batches.length === 0 ? (
                <div className="text-center py-10">
                  <Package className="h-10 w-10 mx-auto mb-3 text-muted-foreground opacity-30" />
                  <p className="font-medium text-sm">No collection batches yet</p>
                  <p className="text-xs text-muted-foreground mt-1">Record produce collected from this farmer using Smart Collect.</p>
                  {canEdit && <Link href={`/app/collect?farm_id=${id}`}><Button size="sm" variant="outline" className="mt-4"><Plus className="h-3.5 w-3.5 mr-1.5" />Start Collection</Button></Link>}
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
              {activityEvents.length === 0 ? (
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

      {/* ── Add / Edit Input Sheet ── */}
      <Sheet open={inputSheetOpen} onOpenChange={open => { if (!open) setInputSheetOpen(false); }}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>{editingInput ? 'Edit Input Record' : 'Add Agricultural Input'}</SheetTitle>
            <SheetDescription>Record fertilizers, pesticides, seeds, or other inputs applied to this farm.</SheetDescription>
          </SheetHeader>
          <div className="space-y-4 mt-6">
            <div>
              <Label className="text-xs">Input Type</Label>
              <Select value={inputForm.input_type} onValueChange={v => setInputForm(p => ({ ...p, input_type: v }))}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(INPUT_TYPE_LABELS).map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Product Name</Label>
              <Input value={inputForm.product_name} onChange={e => setInputForm(p => ({ ...p, product_name: e.target.value }))} placeholder="e.g. NPK 15-15-15" className="mt-1" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Quantity</Label>
                <Input type="number" step="0.01" value={inputForm.quantity} onChange={e => setInputForm(p => ({ ...p, quantity: e.target.value }))} placeholder="0.00" className="mt-1" />
              </div>
              <div>
                <Label className="text-xs">Unit</Label>
                <Select value={inputForm.unit} onValueChange={v => setInputForm(p => ({ ...p, unit: v }))}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="kg">kg</SelectItem>
                    <SelectItem value="liters">Liters</SelectItem>
                    <SelectItem value="bags">Bags</SelectItem>
                    <SelectItem value="units">Units</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label className="text-xs">Application Date</Label>
              <Input type="date" value={inputForm.application_date} onChange={e => setInputForm(p => ({ ...p, application_date: e.target.value }))} className="mt-1" />
            </div>
            <div>
              <Label className="text-xs">Area Applied (ha)</Label>
              <Input type="number" step="0.01" value={inputForm.area_applied_hectares} onChange={e => setInputForm(p => ({ ...p, area_applied_hectares: e.target.value }))} placeholder="Optional" className="mt-1" />
            </div>
            <div>
              <Label className="text-xs">Notes</Label>
              <Textarea value={inputForm.notes} onChange={e => setInputForm(p => ({ ...p, notes: e.target.value }))} placeholder="Optional notes" rows={2} className="mt-1 text-sm" />
            </div>
            <Button className="w-full" onClick={saveInput} disabled={savingInput}>
              {savingInput ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
              {editingInput ? 'Save Changes' : 'Add Input Record'}
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      {/* ── KYC Upload Sheet ── */}
      <Sheet open={kycSheetOpen} onOpenChange={open => { if (!open) setKycSheetOpen(false); }}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>Upload KYC Document</SheetTitle>
            <SheetDescription>Upload or replace a compliance document for this farmer. Admin/aggregator only.</SheetDescription>
          </SheetHeader>
          <div className="space-y-4 mt-6">
            <div>
              <Label className="text-xs">Document Type</Label>
              <Select value={kycFileType} onValueChange={setKycFileType}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="photo">Farmer Photo</SelectItem>
                  <SelectItem value="id_document">ID Document</SelectItem>
                  <SelectItem value="consent_form">Consent Form</SelectItem>
                  <SelectItem value="certificate">Certificate</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">File</Label>
              <input
                type="file"
                accept="image/*,application/pdf"
                className="mt-1 block w-full text-sm text-muted-foreground file:mr-3 file:py-1.5 file:px-3 file:rounded file:border-0 file:text-xs file:font-medium file:bg-primary file:text-primary-foreground hover:file:bg-primary/90 cursor-pointer"
                onChange={e => setKycFile(e.target.files?.[0] ?? null)}
              />
              <p className="text-xs text-muted-foreground mt-1">Max 5 MB. Images or PDF.</p>
            </div>
            <Button className="w-full" onClick={handleKycUpload} disabled={savingKyc || !kycFile}>
              {savingKyc ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Upload className="h-4 w-4 mr-2" />}
              Upload Document
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      {/* ── Add / Edit Training Sheet ── */}
      <Sheet open={trainingSheetOpen} onOpenChange={open => { if (!open) setTrainingSheetOpen(false); }}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>{editingTraining ? 'Edit Training Record' : 'Add Training Record'}</SheetTitle>
            <SheetDescription>Record compliance and sustainability training completed by this farmer.</SheetDescription>
          </SheetHeader>
          <div className="space-y-4 mt-6">
            <div>
              <Label className="text-xs">Module Name</Label>
              <Input value={trainingForm.module_name} onChange={e => setTrainingForm(p => ({ ...p, module_name: e.target.value }))} placeholder="e.g. GAP Training Session 1" className="mt-1" />
            </div>
            <div>
              <Label className="text-xs">Module Type</Label>
              <Select value={trainingForm.module_type} onValueChange={v => setTrainingForm(p => ({ ...p, module_type: v }))}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(MODULE_LABELS).map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Status</Label>
              <Select value={trainingForm.status} onValueChange={v => setTrainingForm(p => ({ ...p, status: v }))}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="not_started">Not Started</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Score (%)</Label>
                <Input type="number" min="0" max="100" value={trainingForm.score} onChange={e => setTrainingForm(p => ({ ...p, score: e.target.value }))} placeholder="Optional" className="mt-1" />
              </div>
              <div>
                <Label className="text-xs">Completion Date</Label>
                <Input type="date" value={trainingForm.completed_at} onChange={e => setTrainingForm(p => ({ ...p, completed_at: e.target.value }))} className="mt-1" />
              </div>
            </div>
            <Button className="w-full" onClick={saveTraining} disabled={savingTraining || !trainingForm.module_name}>
              {savingTraining ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
              {editingTraining ? 'Save Changes' : 'Add Training Record'}
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
