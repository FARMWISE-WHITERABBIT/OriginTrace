'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Plus, RefreshCw, Ship, Bell, GitBranch, Building2, Pencil } from 'lucide-react';

// ─── types ────────────────────────────────────────────────────────────────────

interface ShippingLane {
  id: string;
  port_of_loading: string;
  port_of_loading_code: string;
  port_of_discharge: string;
  port_of_discharge_code: string;
  standard_transit_days: number | null;
  freight_route: string | null;
  commodity: string | null;
  is_active: boolean;
}

interface NotificationTemplate {
  id: string;
  template_key: string;
  channel: string;
  shipment_stage: string;
  subject: string | null;
  body: string;
  is_active: boolean;
}

interface StageGate {
  id: string;
  framework: string;
  stage_name: string;
  is_mandatory: boolean;
  gate_action: string;
  description: string | null;
}

interface InspectionBody {
  id: string;
  name: string;
  abbreviation: string | null;
  country: string;
  region: string | null;
  body_type: string;
  commodities: string[];
  accreditation: string | null;
  is_active: boolean;
}

// ─── helpers ───────────────────────────────────────────────────────────────────

const CHANNEL_COLORS: Record<string, string> = {
  sms:    'bg-green-900/40 text-green-300 border-green-700',
  email:  'bg-blue-900/40 text-blue-300 border-blue-700',
  in_app: 'bg-purple-900/40 text-purple-300 border-purple-700',
};

const GATE_COLORS: Record<string, string> = {
  hard_block: 'bg-red-900/40 text-red-300 border-red-700',
  warn:       'bg-yellow-900/40 text-yellow-300 border-yellow-700',
  optional:   'bg-slate-700/40 text-slate-400 border-slate-600',
};

const BODY_TYPE_COLORS: Record<string, string> = {
  government:    'bg-blue-900/40 text-blue-300 border-blue-700',
  private:       'bg-purple-900/40 text-purple-300 border-purple-700',
  international: 'bg-amber-900/40 text-amber-300 border-amber-700',
};

const FRAMEWORKS = ['EUDR', 'UK', 'US', 'GACC', 'UAE', 'default'] as const;

// ─── component ────────────────────────────────────────────────────────────────

export default function LogisticsPage() {
  const { toast } = useToast();

  const [lanes, setLanes] = useState<ShippingLane[]>([]);
  const [templates, setTemplates] = useState<NotificationTemplate[]>([]);
  const [gates, setGates] = useState<StageGate[]>([]);
  const [bodies, setBodies] = useState<InspectionBody[]>([]);
  const [loading, setLoading] = useState(true);

  // Lane dialog
  const [showLaneDialog, setShowLaneDialog] = useState(false);
  const [editingLane, setEditingLane] = useState<ShippingLane | null>(null);
  const [laneForm, setLaneForm] = useState({ port_of_loading: '', port_of_loading_code: '', port_of_discharge: '', port_of_discharge_code: '', standard_transit_days: '', freight_route: '', commodity: '' });
  const [savingLane, setSavingLane] = useState(false);

  // Template dialog
  const [showTemplateDialog, setShowTemplateDialog] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<NotificationTemplate | null>(null);
  const [templateForm, setTemplateForm] = useState({ template_key: '', channel: 'email', shipment_stage: '', subject: '', body: '' });
  const [savingTemplate, setSavingTemplate] = useState(false);

  useEffect(() => { loadAll(); }, []);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [l, t, g, b] = await Promise.all([
        fetch('/api/superadmin/logistics?resource=shipping_lanes').then(r => r.json()),
        fetch('/api/superadmin/logistics?resource=notification_templates').then(r => r.json()),
        fetch('/api/superadmin/logistics?resource=stage_gates').then(r => r.json()),
        fetch('/api/superadmin/logistics?resource=inspection_bodies').then(r => r.json()),
      ]);
      setLanes(l.lanes ?? []);
      setTemplates(t.templates ?? []);
      setGates(g.gates ?? []);
      setBodies(b.bodies ?? []);
    } catch {
      toast({ title: 'Failed to load logistics data', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const saveLane = async () => {
    setSavingLane(true);
    try {
      const res = await fetch('/api/superadmin/logistics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'upsert_shipping_lane',
          id: editingLane?.id,
          ...laneForm,
          standard_transit_days: laneForm.standard_transit_days ? parseInt(laneForm.standard_transit_days) : null,
        }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      toast({ title: 'Shipping lane saved' });
      setShowLaneDialog(false);
      loadAll();
    } catch (err: any) {
      toast({ title: err.message ?? 'Save failed', variant: 'destructive' });
    } finally {
      setSavingLane(false);
    }
  };

  const saveTemplate = async () => {
    setSavingTemplate(true);
    try {
      const res = await fetch('/api/superadmin/logistics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'upsert_notification_template', id: editingTemplate?.id, ...templateForm }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      toast({ title: 'Template saved' });
      setShowTemplateDialog(false);
      loadAll();
    } catch (err: any) {
      toast({ title: err.message ?? 'Save failed', variant: 'destructive' });
    } finally {
      setSavingTemplate(false);
    }
  };

  const toggleGate = async (gate: StageGate) => {
    const newAction = gate.gate_action === 'hard_block' ? 'warn' : gate.gate_action === 'warn' ? 'optional' : 'hard_block';
    try {
      const res = await fetch('/api/superadmin/logistics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'upsert_stage_gate',
          framework: gate.framework,
          stage_name: gate.stage_name,
          is_mandatory: newAction === 'hard_block',
          gate_action: newAction,
          description: gate.description,
        }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      loadAll();
    } catch (err: any) {
      toast({ title: err.message ?? 'Update failed', variant: 'destructive' });
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin text-cyan-400" /></div>;
  }

  const gatesByFramework = FRAMEWORKS.map(fw => ({
    framework: fw,
    gates: gates.filter(g => g.framework === fw),
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Logistics Reference Data</h1>
          <p className="text-slate-400 text-sm mt-1">Manage shipping lanes, notification templates, stage gates, and inspection bodies — no code deploy needed.</p>
        </div>
        <Button size="sm" variant="outline" className="border-slate-700 text-slate-300 hover:bg-slate-800" onClick={loadAll}>
          <RefreshCw className="h-4 w-4 mr-2" /> Refresh
        </Button>
      </div>

      <Tabs defaultValue="lanes">
        <TabsList className="bg-slate-900 border border-slate-800">
          <TabsTrigger value="lanes" className="data-[state=active]:bg-slate-800 data-[state=active]:text-white text-slate-400">
            <Ship className="h-4 w-4 mr-2" /> Shipping Lanes
          </TabsTrigger>
          <TabsTrigger value="templates" className="data-[state=active]:bg-slate-800 data-[state=active]:text-white text-slate-400">
            <Bell className="h-4 w-4 mr-2" /> Notification Templates
          </TabsTrigger>
          <TabsTrigger value="gates" className="data-[state=active]:bg-slate-800 data-[state=active]:text-white text-slate-400">
            <GitBranch className="h-4 w-4 mr-2" /> Stage Gates
          </TabsTrigger>
          <TabsTrigger value="bodies" className="data-[state=active]:bg-slate-800 data-[state=active]:text-white text-slate-400">
            <Building2 className="h-4 w-4 mr-2" /> Inspection Bodies
          </TabsTrigger>
        </TabsList>

        {/* Shipping Lanes */}
        <TabsContent value="lanes">
          <Card className="bg-slate-900 border-slate-800">
            <CardHeader className="flex flex-row items-center justify-between gap-4 pb-3">
              <div>
                <CardTitle className="text-white text-base">Shipping Lanes</CardTitle>
                <CardDescription>{lanes.filter(l => l.is_active).length} active lanes — pre-populate ETD/ETA calculations</CardDescription>
              </div>
              <Button
                size="sm"
                className="bg-cyan-600 hover:bg-cyan-500 text-white"
                onClick={() => {
                  setEditingLane(null);
                  setLaneForm({ port_of_loading: '', port_of_loading_code: '', port_of_discharge: '', port_of_discharge_code: '', standard_transit_days: '', freight_route: '', commodity: '' });
                  setShowLaneDialog(true);
                }}
              >
                <Plus className="h-4 w-4 mr-2" /> Add Lane
              </Button>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow className="border-slate-800">
                    <TableHead className="text-slate-400">Port of Loading</TableHead>
                    <TableHead className="text-slate-400">Port of Discharge</TableHead>
                    <TableHead className="text-slate-400 text-center">Transit (days)</TableHead>
                    <TableHead className="text-slate-400">Commodity</TableHead>
                    <TableHead className="text-slate-400">Route</TableHead>
                    <TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {lanes.length === 0 ? (
                    <TableRow><TableCell colSpan={6} className="text-center text-slate-500 py-8">No shipping lanes added yet</TableCell></TableRow>
                  ) : (
                    lanes.map(l => (
                      <TableRow key={l.id} className="border-slate-800 hover:bg-slate-800/30">
                        <TableCell>
                          <div>
                            <p className="text-slate-200 font-medium">{l.port_of_loading}</p>
                            <p className="text-slate-500 text-xs font-mono">{l.port_of_loading_code}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="text-slate-200">{l.port_of_discharge}</p>
                            <p className="text-slate-500 text-xs font-mono">{l.port_of_discharge_code}</p>
                          </div>
                        </TableCell>
                        <TableCell className="text-center text-slate-300">{l.standard_transit_days ?? '—'}</TableCell>
                        <TableCell className="text-slate-400 text-sm capitalize">{l.commodity ?? 'All'}</TableCell>
                        <TableCell className="text-slate-500 text-sm">{l.freight_route ?? '—'}</TableCell>
                        <TableCell>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 text-xs text-slate-400 hover:text-white"
                            onClick={() => {
                              setEditingLane(l);
                              setLaneForm({
                                port_of_loading: l.port_of_loading,
                                port_of_loading_code: l.port_of_loading_code,
                                port_of_discharge: l.port_of_discharge,
                                port_of_discharge_code: l.port_of_discharge_code,
                                standard_transit_days: l.standard_transit_days?.toString() ?? '',
                                freight_route: l.freight_route ?? '',
                                commodity: l.commodity ?? '',
                              });
                              setShowLaneDialog(true);
                            }}
                          >
                            <Pencil className="h-3 w-3 mr-1" /> Edit
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notification Templates */}
        <TabsContent value="templates">
          <Card className="bg-slate-900 border-slate-800">
            <CardHeader className="flex flex-row items-center justify-between gap-4 pb-3">
              <div>
                <CardTitle className="text-white text-base">Notification Templates</CardTitle>
                <CardDescription>SMS, email, and in-app messages triggered at each shipment stage</CardDescription>
              </div>
              <Button
                size="sm"
                className="bg-cyan-600 hover:bg-cyan-500 text-white"
                onClick={() => {
                  setEditingTemplate(null);
                  setTemplateForm({ template_key: '', channel: 'email', shipment_stage: '', subject: '', body: '' });
                  setShowTemplateDialog(true);
                }}
              >
                <Plus className="h-4 w-4 mr-2" /> Add Template
              </Button>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {templates.length === 0 ? (
                  <p className="text-slate-500 text-sm text-center py-8">No notification templates defined yet</p>
                ) : (
                  templates.map(t => (
                    <div key={t.id} className="flex items-start gap-3 p-3 rounded-lg bg-slate-800/40 border border-slate-800 hover:border-slate-700">
                      <Badge className={`text-xs border shrink-0 mt-0.5 ${CHANNEL_COLORS[t.channel] ?? 'bg-slate-800 text-slate-300 border-slate-700'}`}>{t.channel}</Badge>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-200">{t.subject || t.template_key}</p>
                        <p className="text-xs text-slate-500 mt-0.5">Stage: {t.shipment_stage}</p>
                        <p className="text-xs text-slate-400 mt-1 line-clamp-2">{t.body}</p>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 text-xs text-slate-400 hover:text-white shrink-0"
                        onClick={() => {
                          setEditingTemplate(t);
                          setTemplateForm({ template_key: t.template_key, channel: t.channel, shipment_stage: t.shipment_stage, subject: t.subject ?? '', body: t.body });
                          setShowTemplateDialog(true);
                        }}
                      >
                        <Pencil className="h-3 w-3" />
                      </Button>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Stage Gates */}
        <TabsContent value="gates">
          <div className="space-y-4">
            {gatesByFramework.filter(fw => fw.gates.length > 0).map(fw => (
              <Card key={fw.framework} className="bg-slate-900 border-slate-800">
                <CardHeader className="pb-3">
                  <CardTitle className="text-white text-base flex items-center gap-2">
                    <Badge className="text-xs border bg-slate-800 text-slate-300 border-slate-700">{fw.framework}</Badge>
                    Stage Gates
                  </CardTitle>
                  <CardDescription>Click to cycle: optional → warn → hard block</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {fw.gates.map(g => (
                      <button
                        key={g.id}
                        type="button"
                        onClick={() => toggleGate(g)}
                        title={g.description ?? `${g.stage_name} — click to change gate action`}
                        className={`px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors flex items-center gap-1.5 ${GATE_COLORS[g.gate_action] ?? 'bg-slate-800 text-slate-300 border-slate-700'}`}
                      >
                        <span>{g.stage_name}</span>
                        <span className="opacity-70 text-[10px]">· {g.gate_action.replace('_', ' ')}</span>
                      </button>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
            {gatesByFramework.every(fw => fw.gates.length === 0) && (
              <Card className="bg-slate-900 border-slate-800">
                <CardContent className="py-8 text-center text-slate-500 text-sm">No stage gate configuration found. Gates will appear here once created.</CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        {/* Inspection Bodies */}
        <TabsContent value="bodies">
          <Card className="bg-slate-900 border-slate-800">
            <CardHeader>
              <CardTitle className="text-white text-base">Inspection Body Registry</CardTitle>
              <CardDescription>Recognised inspection bodies that appear in pre-shipment inspection dropdowns</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow className="border-slate-800">
                    <TableHead className="text-slate-400">Name</TableHead>
                    <TableHead className="text-slate-400">Country</TableHead>
                    <TableHead className="text-slate-400">Type</TableHead>
                    <TableHead className="text-slate-400">Commodities</TableHead>
                    <TableHead className="text-slate-400">Accreditation</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {bodies.map(b => (
                    <TableRow key={b.id} className="border-slate-800 hover:bg-slate-800/30">
                      <TableCell>
                        <div>
                          <p className="text-slate-200 font-medium">{b.name}</p>
                          {b.abbreviation && <p className="text-slate-500 text-xs">{b.abbreviation}</p>}
                        </div>
                      </TableCell>
                      <TableCell className="text-slate-300 text-sm">{b.country}{b.region ? ` · ${b.region}` : ''}</TableCell>
                      <TableCell>
                        <Badge className={`text-xs border ${BODY_TYPE_COLORS[b.body_type] ?? 'bg-slate-800 text-slate-300'}`}>{b.body_type}</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {b.commodities.slice(0, 3).map(c => (
                            <span key={c} className="text-xs bg-slate-800 text-slate-400 border border-slate-700 rounded px-1.5 py-0.5 capitalize">{c}</span>
                          ))}
                          {b.commodities.length > 3 && <span className="text-xs text-slate-500">+{b.commodities.length - 3}</span>}
                        </div>
                      </TableCell>
                      <TableCell className="text-slate-500 text-sm">{b.accreditation ?? '—'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Lane Dialog */}
      <Dialog open={showLaneDialog} onOpenChange={setShowLaneDialog}>
        <DialogContent className="bg-slate-900 border-slate-700 text-white max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingLane ? 'Edit Shipping Lane' : 'Add Shipping Lane'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-slate-300">Port of Loading</Label>
                <Input className="bg-slate-800 border-slate-700 text-white" placeholder="Apapa Port, Lagos" value={laneForm.port_of_loading} onChange={e => setLaneForm(f => ({ ...f, port_of_loading: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-slate-300">UNLOCODE</Label>
                <Input className="bg-slate-800 border-slate-700 text-white font-mono" placeholder="NGLAG" value={laneForm.port_of_loading_code} onChange={e => setLaneForm(f => ({ ...f, port_of_loading_code: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-slate-300">Port of Discharge</Label>
                <Input className="bg-slate-800 border-slate-700 text-white" placeholder="Port of Rotterdam" value={laneForm.port_of_discharge} onChange={e => setLaneForm(f => ({ ...f, port_of_discharge: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-slate-300">UNLOCODE</Label>
                <Input className="bg-slate-800 border-slate-700 text-white font-mono" placeholder="NLRTM" value={laneForm.port_of_discharge_code} onChange={e => setLaneForm(f => ({ ...f, port_of_discharge_code: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-slate-300">Transit Days</Label>
                <Input type="number" className="bg-slate-800 border-slate-700 text-white" placeholder="21" value={laneForm.standard_transit_days} onChange={e => setLaneForm(f => ({ ...f, standard_transit_days: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-slate-300">Commodity (optional)</Label>
                <Input className="bg-slate-800 border-slate-700 text-white" placeholder="cocoa" value={laneForm.commodity} onChange={e => setLaneForm(f => ({ ...f, commodity: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-slate-300">Freight Route</Label>
              <Input className="bg-slate-800 border-slate-700 text-white" placeholder="Via Dakar, Tenerife" value={laneForm.freight_route} onChange={e => setLaneForm(f => ({ ...f, freight_route: e.target.value }))} />
            </div>
            <div className="flex gap-3 pt-2">
              <Button variant="outline" className="flex-1 border-slate-700 text-slate-300 hover:bg-slate-800" onClick={() => setShowLaneDialog(false)}>Cancel</Button>
              <Button className="flex-1 bg-cyan-600 hover:bg-cyan-500 text-white" onClick={saveLane} disabled={savingLane}>
                {savingLane ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null} Save Lane
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Template Dialog */}
      <Dialog open={showTemplateDialog} onOpenChange={setShowTemplateDialog}>
        <DialogContent className="bg-slate-900 border-slate-700 text-white max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingTemplate ? 'Edit Notification Template' : 'New Notification Template'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-slate-300">Template Key</Label>
                <Input className="bg-slate-800 border-slate-700 text-white font-mono text-sm" placeholder="shipment.departed" value={templateForm.template_key} onChange={e => setTemplateForm(f => ({ ...f, template_key: e.target.value }))} disabled={!!editingTemplate} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-slate-300">Channel</Label>
                <Select value={templateForm.channel} onValueChange={v => setTemplateForm(f => ({ ...f, channel: v }))}>
                  <SelectTrigger className="bg-slate-800 border-slate-700 text-white"><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-700">
                    <SelectItem value="email">Email</SelectItem>
                    <SelectItem value="sms">SMS</SelectItem>
                    <SelectItem value="in_app">In-App</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-slate-300">Shipment Stage</Label>
              <Input className="bg-slate-800 border-slate-700 text-white" placeholder="e.g. vessel_departed, customs_cleared" value={templateForm.shipment_stage} onChange={e => setTemplateForm(f => ({ ...f, shipment_stage: e.target.value }))} />
            </div>
            {templateForm.channel !== 'sms' && (
              <div className="space-y-1.5">
                <Label className="text-slate-300">Subject</Label>
                <Input className="bg-slate-800 border-slate-700 text-white" placeholder="Your shipment has departed" value={templateForm.subject} onChange={e => setTemplateForm(f => ({ ...f, subject: e.target.value }))} />
              </div>
            )}
            <div className="space-y-1.5">
              <Label className="text-slate-300">Body <span className="text-slate-500 font-normal">— use {'{{variable}}'} for dynamic values</span></Label>
              <Textarea className="bg-slate-800 border-slate-700 text-white min-h-[120px] font-mono text-sm" placeholder="Hi {{exporter_name}}, your shipment {{shipment_ref}} has departed {{port_of_loading}}..." value={templateForm.body} onChange={e => setTemplateForm(f => ({ ...f, body: e.target.value }))} />
            </div>
            <div className="flex gap-3 pt-2">
              <Button variant="outline" className="flex-1 border-slate-700 text-slate-300 hover:bg-slate-800" onClick={() => setShowTemplateDialog(false)}>Cancel</Button>
              <Button className="flex-1 bg-cyan-600 hover:bg-cyan-500 text-white" onClick={saveTemplate} disabled={savingTemplate}>
                {savingTemplate ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null} Save Template
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
