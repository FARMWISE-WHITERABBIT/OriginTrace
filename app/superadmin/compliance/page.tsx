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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import {
  Loader2, Plus, RefreshCw, Megaphone, FileText, FlaskConical,
  Package, Building2, BookOpen, AlertTriangle, CheckCircle2, Clock,
} from 'lucide-react';

// ─── types ────────────────────────────────────────────────────────────────────

interface Ruleset {
  id: string;
  market: string;
  version: number;
  status: string;
  document_checklist: string[];
  required_fields: string[];
  notes: string | null;
  reviewed_at: string | null;
  updated_at: string;
}

interface UpdateLogEntry {
  id: string;
  market: string;
  change_type: string;
  description: string;
  created_at: string;
}

interface MrlEntry {
  id: string;
  active_ingredient: string;
  commodity: string;
  market: string;
  mrl_ppm: number;
  mrl_notes: string | null;
  source_regulation: string | null;
}

interface HsCode {
  id: string;
  commodity: string;
  hs_code: string;
  tariff_schedule: string;
  description: string | null;
}

interface SyncLog {
  id: string;
  list_type: string;
  status: string;
  records_fetched: number | null;
  started_at: string;
  completed_at: string | null;
  error_message: string | null;
}

interface BroadcastAlert {
  id: string;
  title: string;
  body: string;
  affected_markets: string[];
  status: string;
  recipient_count: number | null;
  sent_at: string | null;
  created_at: string;
}

// ─── constants ─────────────────────────────────────────────────────────────────

const MARKETS = ['EUDR', 'UK', 'US', 'GACC', 'UAE'] as const;

const MARKET_COLORS: Record<string, string> = {
  EUDR: 'bg-blue-900/40 text-blue-300 border-blue-700',
  UK:   'bg-red-900/40 text-red-300 border-red-700',
  US:   'bg-indigo-900/40 text-indigo-300 border-indigo-700',
  GACC: 'bg-amber-900/40 text-amber-300 border-amber-700',
  UAE:  'bg-emerald-900/40 text-emerald-300 border-emerald-700',
};

const STATUS_COLORS: Record<string, string> = {
  active:   'bg-green-900/40 text-green-300 border-green-700',
  draft:    'bg-yellow-900/40 text-yellow-300 border-yellow-700',
  archived: 'bg-slate-700/40 text-slate-400 border-slate-600',
};

// ─── helpers ───────────────────────────────────────────────────────────────────

function fmtDate(s: string | null) {
  if (!s) return '—';
  return new Date(s).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

function fmtDateTime(s: string | null) {
  if (!s) return '—';
  return new Date(s).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
}

// ─── component ────────────────────────────────────────────────────────────────

export default function CompliancePage() {
  const { toast } = useToast();

  const [rulesets, setRulesets] = useState<Ruleset[]>([]);
  const [updateLog, setUpdateLog] = useState<UpdateLogEntry[]>([]);
  const [mrlEntries, setMrlEntries] = useState<MrlEntry[]>([]);
  const [hsCodes, setHsCodes] = useState<HsCode[]>([]);
  const [syncLog, setSyncLog] = useState<SyncLog[]>([]);
  const [broadcastAlerts, setBroadcastAlerts] = useState<BroadcastAlert[]>([]);
  const [loading, setLoading] = useState(true);

  // Ruleset editor
  const [showRulesetDialog, setShowRulesetDialog] = useState(false);
  const [editingRuleset, setEditingRuleset] = useState<Ruleset | null>(null);
  const [rulesetForm, setRulesetForm] = useState({
    market: '',
    document_checklist: '',
    required_fields: '',
    notes: '',
  });
  const [savingRuleset, setSavingRuleset] = useState(false);

  // MRL editor
  const [showMrlDialog, setShowMrlDialog] = useState(false);
  const [editingMrl, setEditingMrl] = useState<MrlEntry | null>(null);
  // MRL markets use EU/UK/US/China/Codex (not the ruleset markets EUDR/GACC/UAE)
  const [mrlForm, setMrlForm] = useState({ active_ingredient: '', commodity: '', market: '', mrl_ppm: '', mrl_notes: '', source_regulation: '' });
  const [savingMrl, setSavingMrl] = useState(false);

  // Broadcast alert
  const [showBroadcastDialog, setShowBroadcastDialog] = useState(false);
  const [broadcastForm, setBroadcastForm] = useState({ title: '', body: '', affected_markets: [] as string[] });
  const [sendingBroadcast, setSendingBroadcast] = useState(false);

  useEffect(() => { loadAll(); }, []);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [rulesetsRes, logRes, mrlRes, hsRes, syncRes, alertsRes] = await Promise.all([
        fetch('/api/superadmin/compliance?resource=rulesets'),
        fetch('/api/superadmin/compliance?resource=update_log'),
        fetch('/api/superadmin/compliance?resource=mrl_database'),
        fetch('/api/superadmin/compliance?resource=hs_codes'),
        fetch('/api/superadmin/compliance?resource=facility_sync_log'),
        fetch('/api/superadmin/compliance?resource=broadcast_alerts'),
      ]);

      const [rd, ld, md, hd, sd, ad] = await Promise.all([
        rulesetsRes.json(), logRes.json(), mrlRes.json(), hsRes.json(), syncRes.json(), alertsRes.json(),
      ]);

      setRulesets(rd.rulesets ?? []);
      setUpdateLog(ld.log ?? []);
      setMrlEntries(md.mrl_entries ?? []);
      setHsCodes(hd.hs_codes ?? []);
      setSyncLog(sd.sync_log ?? []);
      setBroadcastAlerts(ad.alerts ?? []);
    } catch {
      toast({ title: 'Failed to load compliance data', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const openRulesetEditor = (rs?: Ruleset) => {
    if (rs) {
      setEditingRuleset(rs);
      setRulesetForm({
        market: rs.market,
        document_checklist: rs.document_checklist.join('\n'),
        required_fields: rs.required_fields.join('\n'),
        notes: rs.notes ?? '',
      });
    } else {
      setEditingRuleset(null);
      setRulesetForm({ market: '', document_checklist: '', required_fields: '', notes: '' });
    }
    setShowRulesetDialog(true);
  };

  const saveRuleset = async () => {
    if (!rulesetForm.market) return;
    setSavingRuleset(true);
    try {
      const res = await fetch('/api/superadmin/compliance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'upsert_ruleset',
          market: rulesetForm.market,
          document_checklist: rulesetForm.document_checklist.split('\n').map(s => s.trim()).filter(Boolean),
          required_fields: rulesetForm.required_fields.split('\n').map(s => s.trim()).filter(Boolean),
          notes: rulesetForm.notes || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast({ title: 'Ruleset saved successfully' });
      setShowRulesetDialog(false);
      loadAll();
    } catch (err: any) {
      toast({ title: err.message ?? 'Save failed', variant: 'destructive' });
    } finally {
      setSavingRuleset(false);
    }
  };

  const saveMrl = async () => {
    setSavingMrl(true);
    try {
      const res = await fetch('/api/superadmin/compliance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'upsert_mrl',
          id: editingMrl?.id,
          active_ingredient: mrlForm.active_ingredient,
          commodity: mrlForm.commodity,
          market: mrlForm.market,
          mrl_ppm: parseFloat(mrlForm.mrl_ppm),
          mrl_notes: mrlForm.mrl_notes || null,
          source_regulation: mrlForm.source_regulation || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast({ title: 'MRL entry saved' });
      setShowMrlDialog(false);
      loadAll();
    } catch (err: any) {
      toast({ title: err.message ?? 'Save failed', variant: 'destructive' });
    } finally {
      setSavingMrl(false);
    }
  };

  const triggerFacilitySync = async (list_type: string) => {
    try {
      const res = await fetch('/api/superadmin/compliance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'trigger_facility_sync', list_type }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      toast({ title: `${list_type} sync triggered` });
      loadAll();
    } catch (err: any) {
      toast({ title: err.message ?? 'Failed to trigger sync', variant: 'destructive' });
    }
  };

  const sendBroadcast = async () => {
    if (!broadcastForm.title || !broadcastForm.body || !broadcastForm.affected_markets.length) return;
    setSendingBroadcast(true);
    try {
      const res = await fetch('/api/superadmin/compliance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'send_broadcast_alert', ...broadcastForm }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast({ title: `Alert sent to ${data.alert?.recipient_count ?? 0} tenants` });
      setShowBroadcastDialog(false);
      loadAll();
    } catch (err: any) {
      toast({ title: err.message ?? 'Send failed', variant: 'destructive' });
    } finally {
      setSendingBroadcast(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-cyan-400" />
      </div>
    );
  }

  // Active rulesets per market
  const activeRulesets = MARKETS.map(m => rulesets.find(r => r.market === m && r.status === 'active'));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Compliance Framework Management</h1>
          <p className="text-slate-400 text-sm mt-1">Edit rulesets, MRL entries, HS codes, and push regulatory alerts — no code deploy needed.</p>
        </div>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            className="border-slate-700 text-slate-300 hover:bg-slate-800"
            onClick={loadAll}
          >
            <RefreshCw className="h-4 w-4 mr-2" /> Refresh
          </Button>
          <Button
            size="sm"
            className="bg-amber-600 hover:bg-amber-500 text-white"
            onClick={() => setShowBroadcastDialog(true)}
          >
            <Megaphone className="h-4 w-4 mr-2" /> Broadcast Alert
          </Button>
        </div>
      </div>

      {/* Market Ruleset Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        {MARKETS.map((market, i) => {
          const rs = activeRulesets[i];
          return (
            <Card
              key={market}
              className="bg-slate-900 border-slate-800 hover:border-slate-700 cursor-pointer transition-colors"
              onClick={() => openRulesetEditor(rs)}
            >
              <CardHeader className="pb-2 pt-4 px-4">
                <div className="flex items-center justify-between gap-2">
                  <Badge className={`text-xs border ${MARKET_COLORS[market]}`}>{market}</Badge>
                  {rs ? (
                    <Badge className="text-[10px] border bg-green-900/40 text-green-300 border-green-700">v{rs.version}</Badge>
                  ) : (
                    <Badge className="text-[10px] border bg-slate-800 text-slate-500 border-slate-700">—</Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="px-4 pb-4 space-y-1">
                {rs ? (
                  <>
                    <p className="text-xs text-slate-400">{rs.document_checklist.length} doc checks</p>
                    <p className="text-xs text-slate-400">{rs.required_fields.length} required fields</p>
                    <p className="text-xs text-slate-500">Updated {fmtDate(rs.updated_at)}</p>
                  </>
                ) : (
                  <div className="flex items-center gap-1 text-xs text-slate-500">
                    <Plus className="h-3 w-3" /> Add ruleset
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Tabs defaultValue="mrl" className="space-y-4">
        <TabsList className="bg-slate-900 border border-slate-800">
          <TabsTrigger value="mrl" className="data-[state=active]:bg-slate-800 data-[state=active]:text-white text-slate-400">
            <FlaskConical className="h-4 w-4 mr-2" /> MRL Database
          </TabsTrigger>
          <TabsTrigger value="hs" className="data-[state=active]:bg-slate-800 data-[state=active]:text-white text-slate-400">
            <Package className="h-4 w-4 mr-2" /> HS Codes
          </TabsTrigger>
          <TabsTrigger value="facilities" className="data-[state=active]:bg-slate-800 data-[state=active]:text-white text-slate-400">
            <Building2 className="h-4 w-4 mr-2" /> Facility Sync
          </TabsTrigger>
          <TabsTrigger value="alerts" className="data-[state=active]:bg-slate-800 data-[state=active]:text-white text-slate-400">
            <Megaphone className="h-4 w-4 mr-2" /> Alerts
          </TabsTrigger>
          <TabsTrigger value="log" className="data-[state=active]:bg-slate-800 data-[state=active]:text-white text-slate-400">
            <BookOpen className="h-4 w-4 mr-2" /> Change Log
          </TabsTrigger>
        </TabsList>

        {/* MRL Database */}
        <TabsContent value="mrl">
          <Card className="bg-slate-900 border-slate-800">
            <CardHeader className="flex flex-row items-center justify-between gap-4 pb-3">
              <div>
                <CardTitle className="text-white text-base">MRL Database</CardTitle>
                <CardDescription>{mrlEntries.length} entries across {new Set(mrlEntries.map(m => m.market)).size} markets</CardDescription>
              </div>
              <Button
                size="sm"
                className="bg-cyan-600 hover:bg-cyan-500 text-white"
                onClick={() => {
                  setEditingMrl(null);
                  setMrlForm({ active_ingredient: '', commodity: '', market: '', mrl_ppm: '', mrl_notes: '', source_regulation: '' });
                  setShowMrlDialog(true);
                }}
              >
                <Plus className="h-4 w-4 mr-2" /> Add Entry
              </Button>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow className="border-slate-800">
                    <TableHead className="text-slate-400">Ingredient</TableHead>
                    <TableHead className="text-slate-400">Commodity</TableHead>
                    <TableHead className="text-slate-400">Market</TableHead>
                    <TableHead className="text-slate-400 text-right">Limit</TableHead>
                    <TableHead className="text-slate-400">Regulation</TableHead>
                    <TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {mrlEntries.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-slate-500 py-8">No MRL entries</TableCell>
                    </TableRow>
                  ) : (
                    mrlEntries.map(e => (
                      <TableRow key={e.id} className="border-slate-800 hover:bg-slate-800/30">
                        <TableCell className="text-slate-200 font-medium">{e.active_ingredient}</TableCell>
                        <TableCell className="text-slate-300 capitalize">{e.commodity}</TableCell>
                        <TableCell>
                          <Badge className={`text-xs border ${MARKET_COLORS[e.market] ?? 'bg-slate-800 text-slate-300 border-slate-700'}`}>{e.market}</Badge>
                        </TableCell>
                        <TableCell className="text-slate-300 text-right">{e.mrl_ppm} mg/kg</TableCell>
                        <TableCell className="text-slate-500 text-xs">{e.source_regulation ?? '—'}</TableCell>
                        <TableCell>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 text-xs text-slate-400 hover:text-white"
                            onClick={() => {
                              setEditingMrl(e);
                              setMrlForm({
                                active_ingredient: e.active_ingredient,
                                commodity: e.commodity,
                                market: e.market,
                                mrl_ppm: String(e.mrl_ppm),
                                mrl_notes: e.mrl_notes ?? '',
                                source_regulation: e.source_regulation ?? '',
                              });
                              setShowMrlDialog(true);
                            }}
                          >
                            Edit
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

        {/* HS Codes */}
        <TabsContent value="hs">
          <Card className="bg-slate-900 border-slate-800">
            <CardHeader>
              <CardTitle className="text-white text-base">HS Code Library</CardTitle>
              <CardDescription>{hsCodes.length} mappings across {new Set(hsCodes.map(h => h.tariff_schedule)).size} tariff schedules</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow className="border-slate-800">
                    <TableHead className="text-slate-400">Commodity</TableHead>
                    <TableHead className="text-slate-400">HS Code</TableHead>
                    <TableHead className="text-slate-400">Schedule</TableHead>
                    <TableHead className="text-slate-400">Description</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {hsCodes.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-slate-500 py-8">No HS codes added yet</TableCell>
                    </TableRow>
                  ) : (
                    hsCodes.map(h => (
                      <TableRow key={h.id} className="border-slate-800 hover:bg-slate-800/30">
                        <TableCell className="text-slate-200 capitalize">{h.commodity}</TableCell>
                        <TableCell className="text-slate-300 font-mono">{h.hs_code}</TableCell>
                        <TableCell>
                          <Badge className={`text-xs border ${MARKET_COLORS[h.tariff_schedule] ?? 'bg-slate-800 text-slate-300 border-slate-700'}`}>{h.tariff_schedule}</Badge>
                        </TableCell>
                        <TableCell className="text-slate-400 text-sm">{h.description ?? '—'}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Facility Sync */}
        <TabsContent value="facilities">
          <Card className="bg-slate-900 border-slate-800">
            <CardHeader>
              <CardTitle className="text-white text-base">Approved Facility List Sync</CardTitle>
              <CardDescription>Trigger a manual refresh of government-maintained facility lists</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {(['EU_TRACES', 'USDA_FSIS', 'GACC'] as const).map(lt => {
                  const lastSync = syncLog.find(s => s.list_type === lt);
                  return (
                    <div key={lt} className="bg-slate-800/50 rounded-lg p-4 space-y-3 border border-slate-700">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-white">{lt}</span>
                        {lastSync ? (
                          <Badge className={`text-xs border ${lastSync.status === 'success' ? 'bg-green-900/40 text-green-300 border-green-700' : lastSync.status === 'failed' ? 'bg-red-900/40 text-red-300 border-red-700' : 'bg-yellow-900/40 text-yellow-300 border-yellow-700'}`}>
                            {lastSync.status}
                          </Badge>
                        ) : (
                          <Badge className="text-xs border bg-slate-700 text-slate-400 border-slate-600">never</Badge>
                        )}
                      </div>
                      {lastSync && (
                        <div className="text-xs text-slate-500">
                          Last: {fmtDateTime(lastSync.started_at)}
                          {lastSync.records_fetched != null && ` · ${lastSync.records_fetched} records`}
                          {lastSync.error_message && <p className="text-red-400 mt-1">{lastSync.error_message}</p>}
                        </div>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        className="w-full border-slate-600 text-slate-300 hover:bg-slate-700"
                        onClick={() => triggerFacilitySync(lt)}
                      >
                        <RefreshCw className="h-3 w-3 mr-2" /> Sync Now
                      </Button>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Broadcast Alerts */}
        <TabsContent value="alerts">
          <Card className="bg-slate-900 border-slate-800">
            <CardHeader className="flex flex-row items-center justify-between gap-4 pb-3">
              <div>
                <CardTitle className="text-white text-base">Regulatory Broadcast Alerts</CardTitle>
                <CardDescription>Push regulatory change notifications to affected tenants</CardDescription>
              </div>
              <Button
                size="sm"
                className="bg-amber-600 hover:bg-amber-500 text-white"
                onClick={() => setShowBroadcastDialog(true)}
              >
                <Megaphone className="h-4 w-4 mr-2" /> New Alert
              </Button>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow className="border-slate-800">
                    <TableHead className="text-slate-400">Title</TableHead>
                    <TableHead className="text-slate-400">Markets</TableHead>
                    <TableHead className="text-slate-400">Recipients</TableHead>
                    <TableHead className="text-slate-400">Status</TableHead>
                    <TableHead className="text-slate-400">Sent</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {broadcastAlerts.length === 0 ? (
                    <TableRow><TableCell colSpan={5} className="text-center text-slate-500 py-8">No alerts sent yet</TableCell></TableRow>
                  ) : (
                    broadcastAlerts.map(a => (
                      <TableRow key={a.id} className="border-slate-800 hover:bg-slate-800/30">
                        <TableCell className="text-slate-200 font-medium">{a.title}</TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {a.affected_markets.map(m => (
                              <Badge key={m} className={`text-[10px] border ${MARKET_COLORS[m] ?? 'bg-slate-800 text-slate-300'}`}>{m}</Badge>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell className="text-slate-300">{a.recipient_count ?? '—'}</TableCell>
                        <TableCell>
                          <Badge className={`text-xs border ${a.status === 'sent' ? 'bg-green-900/40 text-green-300 border-green-700' : 'bg-yellow-900/40 text-yellow-300 border-yellow-700'}`}>{a.status}</Badge>
                        </TableCell>
                        <TableCell className="text-slate-400 text-sm">{fmtDateTime(a.sent_at)}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Change Log */}
        <TabsContent value="log">
          <Card className="bg-slate-900 border-slate-800">
            <CardHeader>
              <CardTitle className="text-white text-base">Regulatory Change Log</CardTitle>
              <CardDescription>Immutable record of all framework and MRL changes</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {updateLog.length === 0 ? (
                  <p className="text-slate-500 text-sm text-center py-8">No changes recorded yet</p>
                ) : (
                  updateLog.map(entry => (
                    <div key={entry.id} className="flex items-start gap-3 p-3 rounded-lg bg-slate-800/40 border border-slate-800">
                      <Badge className={`text-[10px] border shrink-0 mt-0.5 ${MARKET_COLORS[entry.market] ?? 'bg-slate-800 text-slate-400 border-slate-700'}`}>{entry.market}</Badge>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-slate-200">{entry.description}</p>
                        <p className="text-xs text-slate-500 mt-0.5">{entry.change_type} · {fmtDateTime(entry.created_at)}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Ruleset Editor Dialog */}
      <Dialog open={showRulesetDialog} onOpenChange={setShowRulesetDialog}>
        <DialogContent className="bg-slate-900 border-slate-700 text-white max-w-xl">
          <DialogHeader>
            <DialogTitle>{editingRuleset ? `Edit ${editingRuleset.market} Ruleset` : 'New Compliance Ruleset'}</DialogTitle>
            <DialogDescription className="text-slate-400">
              Changes create a new version and archive the previous one.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            {!editingRuleset && (
              <div className="space-y-1.5">
                <Label className="text-slate-300">Market</Label>
                <Select value={rulesetForm.market} onValueChange={v => setRulesetForm(f => ({ ...f, market: v }))}>
                  <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
                    <SelectValue placeholder="Select market" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-700">
                    {MARKETS.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="space-y-1.5">
              <Label className="text-slate-300">Document Checklist <span className="text-slate-500 font-normal">(one per line)</span></Label>
              <Textarea
                className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-500 min-h-[120px] font-mono text-sm"
                placeholder="Phytosanitary Certificate&#10;Certificate of Origin&#10;Packing List&#10;Bill of Lading"
                value={rulesetForm.document_checklist}
                onChange={e => setRulesetForm(f => ({ ...f, document_checklist: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-slate-300">Required Fields <span className="text-slate-500 font-normal">(one per line)</span></Label>
              <Textarea
                className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-500 min-h-[80px] font-mono text-sm"
                placeholder="operator_id&#10;commodity_hs_code&#10;country_of_origin"
                value={rulesetForm.required_fields}
                onChange={e => setRulesetForm(f => ({ ...f, required_fields: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-slate-300">Notes</Label>
              <Textarea
                className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-500"
                placeholder="Last reviewed — EU Reg 2023/1115 updated Article 3 definition..."
                value={rulesetForm.notes}
                onChange={e => setRulesetForm(f => ({ ...f, notes: e.target.value }))}
              />
            </div>
            <div className="flex gap-3 pt-2">
              <Button variant="outline" className="flex-1 border-slate-700 text-slate-300 hover:bg-slate-800" onClick={() => setShowRulesetDialog(false)}>
                Cancel
              </Button>
              <Button className="flex-1 bg-cyan-600 hover:bg-cyan-500 text-white" onClick={saveRuleset} disabled={savingRuleset}>
                {savingRuleset ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Save Ruleset
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* MRL Editor Dialog */}
      {/* Note: MRL database uses EU/UK/US/China/Codex markets — separate from compliance ruleset markets */}
      <Dialog open={showMrlDialog} onOpenChange={setShowMrlDialog}>
        <DialogContent className="bg-slate-900 border-slate-700 text-white max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingMrl ? 'Edit MRL Entry' : 'New MRL Entry'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-slate-300">Active Ingredient</Label>
                <Input
                  className="bg-slate-800 border-slate-700 text-white"
                  placeholder="e.g. chlorpyrifos"
                  value={mrlForm.active_ingredient}
                  onChange={e => setMrlForm(f => ({ ...f, active_ingredient: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-slate-300">Commodity</Label>
                <Input
                  className="bg-slate-800 border-slate-700 text-white"
                  placeholder="e.g. cocoa"
                  value={mrlForm.commodity}
                  onChange={e => setMrlForm(f => ({ ...f, commodity: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-slate-300">Market</Label>
                <Select value={mrlForm.market} onValueChange={v => setMrlForm(f => ({ ...f, market: v }))}>
                  <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
                    <SelectValue placeholder="Market" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-700">
                    {['EU', 'UK', 'US', 'China', 'Codex'].map(m => (
                      <SelectItem key={m} value={m}>{m}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-slate-300">Limit (mg/kg)</Label>
                <Input
                  type="number"
                  step="0.001"
                  className="bg-slate-800 border-slate-700 text-white"
                  placeholder="0.050"
                  value={mrlForm.mrl_ppm}
                  onChange={e => setMrlForm(f => ({ ...f, mrl_ppm: e.target.value }))}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-slate-300">Source Regulation</Label>
              <Input
                className="bg-slate-800 border-slate-700 text-white"
                placeholder="e.g. Regulation (EC) No 396/2005"
                value={mrlForm.source_regulation}
                onChange={e => setMrlForm(f => ({ ...f, source_regulation: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-slate-300">Notes <span className="text-slate-500 font-normal">(optional)</span></Label>
              <Input
                className="bg-slate-800 border-slate-700 text-white"
                placeholder="e.g. provisional MRL, not authorised = LOD"
                value={mrlForm.mrl_notes}
                onChange={e => setMrlForm(f => ({ ...f, mrl_notes: e.target.value }))}
              />
            </div>
            <div className="flex gap-3 pt-2">
              <Button
                variant="outline"
                className="flex-1 border-slate-700 text-slate-300 hover:bg-slate-800"
                onClick={() => setShowMrlDialog(false)}
              >
                Cancel
              </Button>
              <Button
                className="flex-1 bg-cyan-600 hover:bg-cyan-500 text-white"
                onClick={saveMrl}
                disabled={savingMrl}
              >
                {savingMrl ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null} Save
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Broadcast Alert Dialog */}
      <Dialog open={showBroadcastDialog} onOpenChange={setShowBroadcastDialog}>
        <DialogContent className="bg-slate-900 border-slate-700 text-white max-w-lg">
          <DialogHeader>
            <DialogTitle>Send Regulatory Broadcast Alert</DialogTitle>
            <DialogDescription className="text-slate-400">This will notify all tenants on the selected markets.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label className="text-slate-300">Title</Label>
              <Input className="bg-slate-800 border-slate-700 text-white" placeholder="EUDR guidance updated — action required" value={broadcastForm.title} onChange={e => setBroadcastForm(f => ({ ...f, title: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-slate-300">Message Body</Label>
              <Textarea className="bg-slate-800 border-slate-700 text-white min-h-[100px]" placeholder="The EU Commission has issued updated guidance on..." value={broadcastForm.body} onChange={e => setBroadcastForm(f => ({ ...f, body: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-slate-300">Affected Markets</Label>
              <div className="flex flex-wrap gap-2">
                {MARKETS.map(m => {
                  const selected = broadcastForm.affected_markets.includes(m);
                  return (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setBroadcastForm(f => ({
                        ...f,
                        affected_markets: selected
                          ? f.affected_markets.filter(x => x !== m)
                          : [...f.affected_markets, m],
                      }))}
                      className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${selected ? MARKET_COLORS[m] : 'bg-slate-800 text-slate-400 border-slate-700 hover:border-slate-500'}`}
                    >
                      {m}
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <Button variant="outline" className="flex-1 border-slate-700 text-slate-300 hover:bg-slate-800" onClick={() => setShowBroadcastDialog(false)}>Cancel</Button>
              <Button
                className="flex-1 bg-amber-600 hover:bg-amber-500 text-white"
                onClick={sendBroadcast}
                disabled={sendingBroadcast || !broadcastForm.affected_markets.length}
              >
                {sendingBroadcast ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Megaphone className="h-4 w-4 mr-2" />}
                Send Alert
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
