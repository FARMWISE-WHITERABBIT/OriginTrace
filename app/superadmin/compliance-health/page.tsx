'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { Loader2, RefreshCw, CheckCircle2, XCircle, AlertTriangle, TrendingUp } from 'lucide-react';
import { Progress } from '@/components/ui/progress';

// ─── types ────────────────────────────────────────────────────────────────────

interface TenantComplianceHealth {
  org_id: string;
  org_name: string;
  subscription_tier: string;
  active_markets: string[];
  audit_readiness_score: number | null;
  failed_deforestation_farms: number;
  last_dds_submission_date: string | null;
  last_dds_status: string | null;
  clean_shipment_rate: number | null;
  total_shipments: number;
  traces_credentials_configured: boolean;
  kyc_status: string;
}

// ─── constants ─────────────────────────────────────────────────────────────────

const TIER_COLORS: Record<string, string> = {
  starter:    'bg-slate-700/50 text-slate-300 border-slate-600',
  basic:      'bg-blue-900/50 text-blue-300 border-blue-700',
  pro:        'bg-purple-900/50 text-purple-300 border-purple-700',
  enterprise: 'bg-amber-900/50 text-amber-300 border-amber-700',
};

const MARKET_COLORS: Record<string, string> = {
  EUDR: 'bg-blue-900/40 text-blue-300 border-blue-700',
  UK:   'bg-red-900/40 text-red-300 border-red-700',
  US:   'bg-indigo-900/40 text-indigo-300 border-indigo-700',
  GACC: 'bg-amber-900/40 text-amber-300 border-amber-700',
  UAE:  'bg-emerald-900/40 text-emerald-300 border-emerald-700',
};

const KYC_COLORS: Record<string, string> = {
  approved:       'bg-green-900/40 text-green-300 border-green-700',
  pending_review: 'bg-yellow-900/40 text-yellow-300 border-yellow-700',
  rejected:       'bg-red-900/40 text-red-300 border-red-700',
  not_submitted:  'bg-slate-700/40 text-slate-400 border-slate-600',
};

function fmtDate(s: string | null) {
  if (!s) return '—';
  return new Date(s).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' });
}

function ScoreBadge({ score }: { score: number | null }) {
  if (score === null) return <span className="text-slate-500 text-sm">—</span>;
  const color = score >= 80 ? 'text-green-400' : score >= 60 ? 'text-yellow-400' : 'text-red-400';
  return <span className={`font-bold text-sm ${color}`}>{score}%</span>;
}

// ─── component ────────────────────────────────────────────────────────────────

export default function ComplianceHealthPage() {
  const { toast } = useToast();
  const [tenants, setTenants] = useState<TenantComplianceHealth[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState<'name' | 'score' | 'risk'>('risk');

  useEffect(() => { load(); }, []);

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/superadmin/compliance-health');
      const data = await res.json();
      setTenants(data.tenants ?? []);
    } catch {
      toast({ title: 'Failed to load compliance health data', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const sorted = [...tenants].sort((a, b) => {
    if (sortBy === 'score') return (b.audit_readiness_score ?? -1) - (a.audit_readiness_score ?? -1);
    if (sortBy === 'risk') {
      // Risk score: failed farms + low readiness + unconfigured creds
      const riskA = a.failed_deforestation_farms + (a.audit_readiness_score !== null && a.audit_readiness_score < 60 ? 1 : 0) + (!a.traces_credentials_configured ? 1 : 0);
      const riskB = b.failed_deforestation_farms + (b.audit_readiness_score !== null && b.audit_readiness_score < 60 ? 1 : 0) + (!b.traces_credentials_configured ? 1 : 0);
      return riskB - riskA;
    }
    return a.org_name.localeCompare(b.org_name);
  });

  const atRisk = tenants.filter(t =>
    t.failed_deforestation_farms > 0 ||
    (t.audit_readiness_score !== null && t.audit_readiness_score < 60) ||
    (t.last_dds_status === 'failed')
  );

  if (loading) {
    return <div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin text-cyan-400" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Tenant Compliance Health</h1>
          <p className="text-slate-400 text-sm mt-1">Proactive view of compliance posture across all tenants — identify struggling exporters before a rejection.</p>
        </div>
        <Button size="sm" variant="outline" className="border-slate-700 text-slate-300 hover:bg-slate-800" onClick={load}>
          <RefreshCw className="h-4 w-4 mr-2" /> Refresh
        </Button>
      </div>

      {/* Summary KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card className="bg-slate-900 border-slate-800">
          <CardContent className="px-4 py-4">
            <p className="text-xs text-slate-400 uppercase tracking-wider">Active Tenants</p>
            <p className="text-2xl font-bold text-white mt-1">{tenants.length}</p>
          </CardContent>
        </Card>
        <Card className={`bg-slate-900 border-slate-800 ${atRisk.length > 0 ? 'border-amber-800/60' : ''}`}>
          <CardContent className="px-4 py-4">
            <p className="text-xs text-slate-400 uppercase tracking-wider">At Risk</p>
            <p className={`text-2xl font-bold mt-1 ${atRisk.length > 0 ? 'text-amber-400' : 'text-green-400'}`}>{atRisk.length}</p>
          </CardContent>
        </Card>
        <Card className="bg-slate-900 border-slate-800">
          <CardContent className="px-4 py-4">
            <p className="text-xs text-slate-400 uppercase tracking-wider">Avg Readiness</p>
            <p className="text-2xl font-bold text-white mt-1">
              {tenants.filter(t => t.audit_readiness_score !== null).length > 0
                ? Math.round(tenants.reduce((s, t) => s + (t.audit_readiness_score ?? 0), 0) / tenants.filter(t => t.audit_readiness_score !== null).length)
                : '—'}%
            </p>
          </CardContent>
        </Card>
        <Card className="bg-slate-900 border-slate-800">
          <CardContent className="px-4 py-4">
            <p className="text-xs text-slate-400 uppercase tracking-wider">TRACES Configured</p>
            <p className="text-2xl font-bold text-white mt-1">
              {tenants.filter(t => t.traces_credentials_configured).length}/{tenants.length}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* At-Risk Banner */}
      {atRisk.length > 0 && (
        <div className="bg-amber-950/30 border border-amber-800/60 rounded-lg px-4 py-3">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="h-4 w-4 text-amber-400" />
            <p className="text-sm font-medium text-amber-300">{atRisk.length} tenant{atRisk.length !== 1 ? 's' : ''} flagged for proactive support</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {atRisk.slice(0, 6).map(t => (
              <span key={t.org_id} className="text-xs bg-amber-900/30 text-amber-300 border border-amber-700/50 rounded px-2 py-0.5">{t.org_name}</span>
            ))}
            {atRisk.length > 6 && <span className="text-xs text-amber-500">+{atRisk.length - 6} more</span>}
          </div>
        </div>
      )}

      {/* Sort Controls */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-slate-500">Sort by:</span>
        {(['risk', 'score', 'name'] as const).map(s => (
          <button
            key={s}
            type="button"
            onClick={() => setSortBy(s)}
            className={`text-xs px-3 py-1 rounded-full border transition-colors capitalize ${sortBy === s ? 'bg-cyan-900/50 text-cyan-300 border-cyan-700' : 'bg-slate-800 text-slate-400 border-slate-700 hover:border-slate-500'}`}
          >
            {s === 'risk' ? 'Risk (high → low)' : s === 'score' ? 'Readiness Score' : 'Name'}
          </button>
        ))}
      </div>

      {/* Main Table */}
      <Card className="bg-slate-900 border-slate-800">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="border-slate-800">
                <TableHead className="text-slate-400 pl-4">Tenant</TableHead>
                <TableHead className="text-slate-400">Tier</TableHead>
                <TableHead className="text-slate-400">Markets</TableHead>
                <TableHead className="text-slate-400 text-center">Readiness</TableHead>
                <TableHead className="text-slate-400 text-center">Deforestation</TableHead>
                <TableHead className="text-slate-400">Last DDS</TableHead>
                <TableHead className="text-slate-400 text-center">Clean Rate</TableHead>
                <TableHead className="text-slate-400 text-center">TRACES</TableHead>
                <TableHead className="text-slate-400">KYC</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sorted.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center text-slate-500 py-8">No active tenants found</TableCell>
                </TableRow>
              ) : (
                sorted.map(t => {
                  const isAtRisk = t.failed_deforestation_farms > 0 || (t.audit_readiness_score !== null && t.audit_readiness_score < 60) || t.last_dds_status === 'failed';
                  return (
                    <TableRow key={t.org_id} className={`border-slate-800 hover:bg-slate-800/30 ${isAtRisk ? 'bg-amber-950/10' : ''}`}>
                      <TableCell className="pl-4">
                        <div className="flex items-center gap-2">
                          {isAtRisk && <AlertTriangle className="h-3.5 w-3.5 text-amber-400 shrink-0" />}
                          <span className="font-medium text-slate-200">{t.org_name}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={`text-xs border ${TIER_COLORS[t.subscription_tier] ?? 'bg-slate-800 text-slate-300'}`}>{t.subscription_tier}</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-0.5">
                          {t.active_markets.length === 0 ? (
                            <span className="text-slate-500 text-xs">—</span>
                          ) : (
                            t.active_markets.map(m => (
                              <Badge key={m} className={`text-[9px] border px-1.5 py-0 ${MARKET_COLORS[m] ?? 'bg-slate-800 text-slate-300 border-slate-700'}`}>{m}</Badge>
                            ))
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <ScoreBadge score={t.audit_readiness_score} />
                      </TableCell>
                      <TableCell className="text-center">
                        {t.failed_deforestation_farms > 0 ? (
                          <span className="text-red-400 font-semibold text-sm">{t.failed_deforestation_farms}</span>
                        ) : (
                          <span className="text-green-400 text-sm">0</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="space-y-0.5">
                          <p className="text-slate-300 text-xs">{t.last_dds_submission_date ? new Date(t.last_dds_submission_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }) : '—'}</p>
                          {t.last_dds_status && (
                            <Badge className={`text-[9px] border px-1.5 py-0 ${t.last_dds_status === 'confirmed' ? 'bg-green-900/40 text-green-300 border-green-700' : t.last_dds_status === 'failed' ? 'bg-red-900/40 text-red-300 border-red-700' : 'bg-yellow-900/40 text-yellow-300 border-yellow-700'}`}>
                              {t.last_dds_status}
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        {t.clean_shipment_rate !== null ? (
                          <div className="flex items-center gap-1.5 justify-center">
                            <div className="w-12 h-1.5 bg-slate-700 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full ${t.clean_shipment_rate >= 90 ? 'bg-green-500' : t.clean_shipment_rate >= 70 ? 'bg-yellow-500' : 'bg-red-500'}`}
                                style={{ width: `${t.clean_shipment_rate}%` }}
                              />
                            </div>
                            <span className="text-xs text-slate-300">{t.clean_shipment_rate}%</span>
                          </div>
                        ) : <span className="text-slate-500 text-sm">—</span>}
                      </TableCell>
                      <TableCell className="text-center">
                        {t.traces_credentials_configured ? (
                          <CheckCircle2 className="h-4 w-4 text-green-400 mx-auto" />
                        ) : (
                          <XCircle className="h-4 w-4 text-red-400 mx-auto" />
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge className={`text-[10px] border capitalize ${KYC_COLORS[t.kyc_status] ?? 'bg-slate-800 text-slate-400'}`}>
                          {t.kyc_status.replace('_', ' ')}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
