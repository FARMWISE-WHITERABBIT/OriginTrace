'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { Loader2, RefreshCw, Clock, Shield, FileText, Package, XCircle } from 'lucide-react';

// ─── types ────────────────────────────────────────────────────────────────────

interface AuditorSession {
  id: string;
  org_id: string;
  auditor_name: string;
  auditor_email: string;
  expires_at: string;
  created_at: string;
  last_accessed_at: string | null;
  organizations?: { name: string; subscription_tier: string };
}

interface ReportVolumeEntry {
  org_id: string;
  org_name: string;
  monthly: Record<string, number>;
}

interface ComplianceBadge {
  id: string;
  org_id: string;
  framework: string;
  badge_type: string;
  data_health_score: number | null;
  issued_at: string;
  expires_at: string | null;
  organizations?: { name: string; subscription_tier: string };
}

interface EvidencePackage {
  id: string;
  org_id: string;
  package_type: string;
  generated_at: string;
  accessed_at: string | null;
  accessed_by: string | null;
  organizations?: { name: string };
}

// ─── helpers ───────────────────────────────────────────────────────────────────

const TIER_COLORS: Record<string, string> = {
  starter:    'bg-slate-700/50 text-slate-300 border-slate-600',
  basic:      'bg-blue-900/50 text-blue-300 border-blue-700',
  pro:        'bg-purple-900/50 text-purple-300 border-purple-700',
  enterprise: 'bg-amber-900/50 text-amber-300 border-amber-700',
};

function fmtDateTime(s: string | null) {
  if (!s) return '—';
  return new Date(s).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
}

function timeUntil(s: string) {
  const diff = new Date(s).getTime() - Date.now();
  if (diff <= 0) return 'Expired';
  const h = Math.floor(diff / 3600000);
  const d = Math.floor(h / 24);
  return d > 0 ? `${d}d ${h % 24}h` : `${h}h`;
}

// ─── component ────────────────────────────────────────────────────────────────

export default function AuditInfraPage() {
  const { toast } = useToast();
  const [sessions, setSessions] = useState<AuditorSession[]>([]);
  const [reportVolume, setReportVolume] = useState<ReportVolumeEntry[]>([]);
  const [badges, setBadges] = useState<ComplianceBadge[]>([]);
  const [evidencePackages, setEvidencePackages] = useState<EvidencePackage[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadAll(); }, []);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [s, r, b, e] = await Promise.all([
        fetch('/api/superadmin/audit-infra?resource=auditor_sessions').then(res => res.json()),
        fetch('/api/superadmin/audit-infra?resource=audit_report_volume').then(res => res.json()),
        fetch('/api/superadmin/audit-infra?resource=badges').then(res => res.json()),
        fetch('/api/superadmin/audit-infra?resource=evidence_packages').then(res => res.json()),
      ]);
      setSessions(s.sessions ?? []);
      setReportVolume(r.report_volume ?? []);
      setBadges(b.badges ?? []);
      setEvidencePackages(e.packages ?? []);
    } catch {
      toast({ title: 'Failed to load audit infrastructure data', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const revokeSession = async (sessionId: string) => {
    try {
      const res = await fetch('/api/superadmin/audit-infra', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'revoke_auditor_session', session_id: sessionId }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      toast({ title: 'Auditor session revoked' });
      loadAll();
    } catch (err: any) {
      toast({ title: err.message ?? 'Failed to revoke', variant: 'destructive' });
    }
  };

  const invalidateBadge = async (badgeId: string) => {
    try {
      const res = await fetch('/api/superadmin/audit-infra', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'invalidate_badge', badge_id: badgeId }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      toast({ title: 'Badge invalidated' });
      loadAll();
    } catch (err: any) {
      toast({ title: err.message ?? 'Failed to invalidate', variant: 'destructive' });
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin text-cyan-400" /></div>;
  }

  // Sum total reports
  const totalReports = reportVolume.reduce((sum, r) => sum + Object.values(r.monthly).reduce((s, v) => s + v, 0), 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Audit Infrastructure Management</h1>
          <p className="text-slate-400 text-sm mt-1">Active auditor sessions, compliance badges, report volume, and evidence packages.</p>
        </div>
        <Button size="sm" variant="outline" className="border-slate-700 text-slate-300 hover:bg-slate-800" onClick={loadAll}>
          <RefreshCw className="h-4 w-4 mr-2" /> Refresh
        </Button>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'Active Auditor Sessions', value: sessions.length, icon: Clock, color: sessions.length > 0 ? 'text-cyan-400' : 'text-slate-400' },
          { label: 'Active Compliance Badges', value: badges.length, icon: Shield, color: 'text-green-400' },
          { label: 'Audit Reports Generated', value: totalReports, icon: FileText, color: 'text-purple-400' },
          { label: 'Evidence Packages', value: evidencePackages.length, icon: Package, color: 'text-amber-400' },
        ].map(kpi => (
          <Card key={kpi.label} className="bg-slate-900 border-slate-800">
            <CardHeader className="flex flex-row items-center justify-between pb-2 pt-4 px-4 gap-2">
              <CardTitle className="text-xs text-slate-400 font-medium">{kpi.label}</CardTitle>
              <kpi.icon className={`h-4 w-4 ${kpi.color}`} />
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <p className={`text-2xl font-bold ${kpi.color}`}>{kpi.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="sessions">
        <TabsList className="bg-slate-900 border border-slate-800">
          <TabsTrigger value="sessions" className="data-[state=active]:bg-slate-800 data-[state=active]:text-white text-slate-400">
            <Clock className="h-4 w-4 mr-2" /> Auditor Sessions
            {sessions.length > 0 && <Badge className="ml-2 bg-cyan-900/60 text-cyan-300 border-0">{sessions.length}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="badges" className="data-[state=active]:bg-slate-800 data-[state=active]:text-white text-slate-400">
            <Shield className="h-4 w-4 mr-2" /> Badges
          </TabsTrigger>
          <TabsTrigger value="reports" className="data-[state=active]:bg-slate-800 data-[state=active]:text-white text-slate-400">
            <FileText className="h-4 w-4 mr-2" /> Report Volume
          </TabsTrigger>
          <TabsTrigger value="evidence" className="data-[state=active]:bg-slate-800 data-[state=active]:text-white text-slate-400">
            <Package className="h-4 w-4 mr-2" /> Evidence Packages
          </TabsTrigger>
        </TabsList>

        {/* Auditor Sessions */}
        <TabsContent value="sessions">
          <Card className="bg-slate-900 border-slate-800">
            <CardHeader>
              <CardTitle className="text-white text-base">Active Auditor Access Sessions</CardTitle>
              <CardDescription>Time-limited portal links issued to third-party auditors</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow className="border-slate-800">
                    <TableHead className="text-slate-400">Auditor</TableHead>
                    <TableHead className="text-slate-400">Organisation</TableHead>
                    <TableHead className="text-slate-400">Expires In</TableHead>
                    <TableHead className="text-slate-400">Last Accessed</TableHead>
                    <TableHead className="text-slate-400">Created</TableHead>
                    <TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sessions.length === 0 ? (
                    <TableRow><TableCell colSpan={6} className="text-center text-slate-500 py-8">No active auditor sessions</TableCell></TableRow>
                  ) : (
                    sessions.map(s => (
                      <TableRow key={s.id} className="border-slate-800 hover:bg-slate-800/30">
                        <TableCell>
                          <div>
                            <p className="text-slate-200 font-medium">{s.auditor_name}</p>
                            <p className="text-slate-500 text-xs">{s.auditor_email}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <p className="text-slate-200 text-sm">{s.organizations?.name ?? '—'}</p>
                            <Badge className={`text-[10px] border ${TIER_COLORS[s.organizations?.subscription_tier ?? ''] ?? 'bg-slate-800 text-slate-400'}`}>{s.organizations?.subscription_tier ?? '—'}</Badge>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className={`text-sm font-medium ${timeUntil(s.expires_at) === 'Expired' ? 'text-red-400' : 'text-yellow-400'}`}>
                            {timeUntil(s.expires_at)}
                          </span>
                        </TableCell>
                        <TableCell className="text-slate-400 text-sm">{fmtDateTime(s.last_accessed_at)}</TableCell>
                        <TableCell className="text-slate-500 text-sm">{fmtDateTime(s.created_at)}</TableCell>
                        <TableCell>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 text-xs text-red-400 hover:text-red-300 hover:bg-red-950/40"
                            onClick={() => revokeSession(s.id)}
                          >
                            <XCircle className="h-3 w-3 mr-1" /> Revoke
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

        {/* Compliance Badges */}
        <TabsContent value="badges">
          <Card className="bg-slate-900 border-slate-800">
            <CardHeader>
              <CardTitle className="text-white text-base">Compliance Badge Registry</CardTitle>
              <CardDescription>Active public compliance badges and their data health</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow className="border-slate-800">
                    <TableHead className="text-slate-400">Organisation</TableHead>
                    <TableHead className="text-slate-400">Framework</TableHead>
                    <TableHead className="text-slate-400">Type</TableHead>
                    <TableHead className="text-slate-400 text-center">Data Health</TableHead>
                    <TableHead className="text-slate-400">Issued</TableHead>
                    <TableHead className="text-slate-400">Expires</TableHead>
                    <TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {badges.length === 0 ? (
                    <TableRow><TableCell colSpan={7} className="text-center text-slate-500 py-8">No active compliance badges</TableCell></TableRow>
                  ) : (
                    badges.map(b => (
                      <TableRow key={b.id} className="border-slate-800 hover:bg-slate-800/30">
                        <TableCell className="font-medium text-slate-200">{b.organizations?.name ?? '—'}</TableCell>
                        <TableCell>
                          <Badge className="text-xs border bg-blue-900/40 text-blue-300 border-blue-700">{b.framework}</Badge>
                        </TableCell>
                        <TableCell className="text-slate-300 text-sm capitalize">{b.badge_type.replace('_', ' ')}</TableCell>
                        <TableCell className="text-center">
                          {b.data_health_score !== null ? (
                            <span className={`font-bold text-sm ${b.data_health_score >= 80 ? 'text-green-400' : b.data_health_score >= 60 ? 'text-yellow-400' : 'text-red-400'}`}>
                              {b.data_health_score}%
                            </span>
                          ) : <span className="text-slate-500">—</span>}
                        </TableCell>
                        <TableCell className="text-slate-400 text-sm">{fmtDateTime(b.issued_at)}</TableCell>
                        <TableCell className="text-slate-400 text-sm">{b.expires_at ? fmtDateTime(b.expires_at) : '—'}</TableCell>
                        <TableCell>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 text-xs text-red-400 hover:text-red-300 hover:bg-red-950/40"
                            onClick={() => invalidateBadge(b.id)}
                          >
                            Invalidate
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

        {/* Report Volume */}
        <TabsContent value="reports">
          <Card className="bg-slate-900 border-slate-800">
            <CardHeader>
              <CardTitle className="text-white text-base">Audit Report Volume</CardTitle>
              <CardDescription>Reports generated per tenant — billing metric for the audit module</CardDescription>
            </CardHeader>
            <CardContent>
              {reportVolume.length === 0 ? (
                <p className="text-slate-500 text-sm text-center py-8">No audit reports generated yet</p>
              ) : (
                <div className="space-y-3">
                  {reportVolume
                    .sort((a, b) => Object.values(b.monthly).reduce((s, v) => s + v, 0) - Object.values(a.monthly).reduce((s, v) => s + v, 0))
                    .map(r => {
                      const total = Object.values(r.monthly).reduce((s, v) => s + v, 0);
                      const months = Object.entries(r.monthly).sort((a, b) => b[0].localeCompare(a[0])).slice(0, 3);
                      return (
                        <div key={r.org_id} className="flex items-center gap-4 p-3 rounded-lg bg-slate-800/40 border border-slate-800">
                          <div className="flex-1 min-w-0">
                            <p className="text-slate-200 font-medium text-sm">{r.org_name}</p>
                            <div className="flex gap-2 mt-1 flex-wrap">
                              {months.map(([m, c]) => (
                                <span key={m} className="text-xs text-slate-500">{m}: <span className="text-slate-300">{c}</span></span>
                              ))}
                            </div>
                          </div>
                          <div className="text-right shrink-0">
                            <p className="text-2xl font-bold text-purple-400">{total}</p>
                            <p className="text-xs text-slate-500">total</p>
                          </div>
                        </div>
                      );
                    })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Evidence Packages */}
        <TabsContent value="evidence">
          <Card className="bg-slate-900 border-slate-800">
            <CardHeader>
              <CardTitle className="text-white text-base">Evidence Package Log</CardTitle>
              <CardDescription>Border detention and dispute evidence packages generated across all tenants</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow className="border-slate-800">
                    <TableHead className="text-slate-400">Organisation</TableHead>
                    <TableHead className="text-slate-400">Package Type</TableHead>
                    <TableHead className="text-slate-400">Generated</TableHead>
                    <TableHead className="text-slate-400">Last Accessed By</TableHead>
                    <TableHead className="text-slate-400">Last Accessed</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {evidencePackages.length === 0 ? (
                    <TableRow><TableCell colSpan={5} className="text-center text-slate-500 py-8">No evidence packages generated</TableCell></TableRow>
                  ) : (
                    evidencePackages.map(p => (
                      <TableRow key={p.id} className="border-slate-800 hover:bg-slate-800/30">
                        <TableCell className="font-medium text-slate-200">{p.organizations?.name ?? '—'}</TableCell>
                        <TableCell>
                          <Badge className="text-xs border bg-amber-900/40 text-amber-300 border-amber-700 capitalize">
                            {p.package_type.replace('_', ' ')}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-slate-400 text-sm">{fmtDateTime(p.generated_at)}</TableCell>
                        <TableCell className="text-slate-400 text-sm">{p.accessed_by ?? '—'}</TableCell>
                        <TableCell className="text-slate-500 text-sm">{fmtDateTime(p.accessed_at)}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
