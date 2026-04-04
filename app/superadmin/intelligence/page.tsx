'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Loader2, RefreshCw, TrendingUp, BarChart3, DollarSign, FlaskConical, Globe, Layers } from 'lucide-react';

// ─── types ────────────────────────────────────────────────────────────────────

interface RevenueData {
  mrr_by_tier: Record<string, number>;
  mrr_by_month: Record<string, number>;
  total_gmv_ngn: number;
  escrow_fee_revenue_ngn: number;
  audit_report_revenue_ngn: number;
  active_tenants_by_tier: Record<string, number>;
}

interface MrlFlag {
  ingredient: string;
  count: number;
  markets: string[];
  commodities: string[];
}

interface AdoptionEntry {
  framework: string;
  total_orgs: number;
  configured_count: number;
  configured_pct: number;
  dds_submitted_count: number;
  dds_submitted_pct: number;
}

interface EscrowAdoption {
  total_shipments: number;
  escrow_enabled: number;
  adoption_pct: number;
}

interface RejectionPattern {
  reason: string;
  count: number;
  markets: string[];
}

// ─── helpers ───────────────────────────────────────────────────────────────────

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

function fmtNgn(n: number) {
  if (n >= 1_000_000) return `₦${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `₦${(n / 1_000).toFixed(0)}K`;
  return `₦${n.toFixed(0)}`;
}

function AdoptionBar({ pct, label }: { pct: number; label: string }) {
  const color = pct >= 70 ? 'bg-green-500' : pct >= 40 ? 'bg-yellow-500' : 'bg-red-500';
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span className="text-slate-400">{label}</span>
        <span className="text-slate-300 font-medium">{pct}%</span>
      </div>
      <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

// ─── component ────────────────────────────────────────────────────────────────

export default function IntelligencePage() {
  const { toast } = useToast();

  const [revenue, setRevenue] = useState<RevenueData | null>(null);
  const [mrlFlags, setMrlFlags] = useState<MrlFlag[]>([]);
  const [adoption, setAdoption] = useState<AdoptionEntry[]>([]);
  const [escrowAdoption, setEscrowAdoption] = useState<EscrowAdoption | null>(null);
  const [rejections, setRejections] = useState<RejectionPattern[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadAll(); }, []);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [r, m, a, e, rj] = await Promise.all([
        fetch('/api/superadmin/intelligence?resource=revenue_dashboard').then(res => res.json()),
        fetch('/api/superadmin/intelligence?resource=mrl_flag_frequency').then(res => res.json()),
        fetch('/api/superadmin/intelligence?resource=compliance_adoption').then(res => res.json()),
        fetch('/api/superadmin/intelligence?resource=escrow_adoption').then(res => res.json()),
        fetch('/api/superadmin/intelligence?resource=rejection_patterns').then(res => res.json()),
      ]);
      setRevenue(r.revenue ?? null);
      setMrlFlags(m.mrl_flags ?? []);
      setAdoption(a.adoption ?? []);
      setEscrowAdoption(e.escrow_adoption ?? null);
      setRejections(rj.rejection_patterns ?? []);
    } catch {
      toast({ title: 'Failed to load intelligence data', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin text-cyan-400" /></div>;
  }

  const totalMrr = Object.values(revenue?.mrr_by_tier ?? {}).reduce((s, v) => s + v, 0);
  const totalRevenue = totalMrr + (revenue?.escrow_fee_revenue_ngn ?? 0) + (revenue?.audit_report_revenue_ngn ?? 0);
  const recentMonths = Object.entries(revenue?.mrr_by_month ?? {}).sort((a, b) => b[0].localeCompare(a[0])).slice(0, 6);
  const maxMonthly = Math.max(...recentMonths.map(([, v]) => v), 1);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Platform Intelligence</h1>
          <p className="text-slate-400 text-sm mt-1">Cross-tenant insights on revenue, compliance adoption, rejection patterns, and feature uptake.</p>
        </div>
        <Button size="sm" variant="outline" className="border-slate-700 text-slate-300 hover:bg-slate-800" onClick={loadAll}>
          <RefreshCw className="h-4 w-4 mr-2" /> Refresh
        </Button>
      </div>

      {/* Revenue Dashboard */}
      <div>
        <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
          <DollarSign className="h-4 w-4" /> Revenue Dashboard
        </h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <Card className="bg-slate-900 border-slate-800">
            <CardContent className="px-4 py-4">
              <p className="text-xs text-slate-500 uppercase tracking-wider">Total Platform MRR</p>
              <p className="text-2xl font-bold text-cyan-400 mt-1">{fmtNgn(totalMrr)}</p>
              <p className="text-xs text-slate-500 mt-1">12-month average</p>
            </CardContent>
          </Card>
          <Card className="bg-slate-900 border-slate-800">
            <CardContent className="px-4 py-4">
              <p className="text-xs text-slate-500 uppercase tracking-wider">Total Platform GMV</p>
              <p className="text-2xl font-bold text-green-400 mt-1">{fmtNgn(revenue?.total_gmv_ngn ?? 0)}</p>
              <p className="text-xs text-slate-500 mt-1">Shipments managed</p>
            </CardContent>
          </Card>
          <Card className="bg-slate-900 border-slate-800">
            <CardContent className="px-4 py-4">
              <p className="text-xs text-slate-500 uppercase tracking-wider">Escrow Fee Revenue</p>
              <p className="text-2xl font-bold text-purple-400 mt-1">{fmtNgn(revenue?.escrow_fee_revenue_ngn ?? 0)}</p>
              <p className="text-xs text-slate-500 mt-1">~1.25% avg rate</p>
            </CardContent>
          </Card>
          <Card className="bg-slate-900 border-slate-800">
            <CardContent className="px-4 py-4">
              <p className="text-xs text-slate-500 uppercase tracking-wider">Audit Module Revenue</p>
              <p className="text-2xl font-bold text-amber-400 mt-1">{fmtNgn(revenue?.audit_report_revenue_ngn ?? 0)}</p>
              <p className="text-xs text-slate-500 mt-1">Per-report fees</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-4">
          {/* MRR by Tier */}
          <Card className="bg-slate-900 border-slate-800">
            <CardHeader className="pb-3">
              <CardTitle className="text-white text-sm">MRR by Tier</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {Object.entries(revenue?.mrr_by_tier ?? {}).sort((a, b) => b[1] - a[1]).map(([tier, mrr]) => (
                <div key={tier} className="flex items-center gap-3">
                  <Badge className={`text-xs border w-20 justify-center capitalize ${TIER_COLORS[tier] ?? 'bg-slate-800 text-slate-300'}`}>{tier}</Badge>
                  <div className="flex-1 h-2 bg-slate-700 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-cyan-500 rounded-full"
                      style={{ width: `${Math.min((mrr / (totalMrr || 1)) * 100, 100)}%` }}
                    />
                  </div>
                  <span className="text-slate-300 text-sm font-medium w-20 text-right">{fmtNgn(mrr)}</span>
                  <span className="text-slate-500 text-xs w-12 text-right">{revenue?.active_tenants_by_tier?.[tier] ?? 0} tenants</span>
                </div>
              ))}
              {Object.keys(revenue?.mrr_by_tier ?? {}).length === 0 && (
                <p className="text-slate-500 text-sm text-center py-4">No payment data in last 12 months</p>
              )}
            </CardContent>
          </Card>

          {/* MRR trend */}
          <Card className="bg-slate-900 border-slate-800">
            <CardHeader className="pb-3">
              <CardTitle className="text-white text-sm">Monthly Revenue Trend</CardTitle>
            </CardHeader>
            <CardContent>
              {recentMonths.length === 0 ? (
                <p className="text-slate-500 text-sm text-center py-4">No monthly data yet</p>
              ) : (
                <div className="space-y-2">
                  {recentMonths.map(([month, amount]) => (
                    <div key={month} className="flex items-center gap-3">
                      <span className="text-slate-500 text-xs w-16">{month}</span>
                      <div className="flex-1 h-2 bg-slate-700 rounded-full overflow-hidden">
                        <div className="h-full bg-cyan-500 rounded-full" style={{ width: `${(amount / maxMonthly) * 100}%` }} />
                      </div>
                      <span className="text-slate-300 text-sm font-medium w-20 text-right">{fmtNgn(amount)}</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Compliance Adoption */}
      <div>
        <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
          <Layers className="h-4 w-4" /> Compliance Framework Adoption
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {adoption.map(a => (
            <Card key={a.framework} className="bg-slate-900 border-slate-800">
              <CardHeader className="pb-3 pt-4 px-4">
                <Badge className={`text-xs border w-fit ${MARKET_COLORS[a.framework] ?? 'bg-slate-800 text-slate-300'}`}>{a.framework}</Badge>
              </CardHeader>
              <CardContent className="px-4 pb-4 space-y-3">
                <AdoptionBar pct={a.configured_pct} label={`Profile configured (${a.configured_count}/${a.total_orgs})`} />
                <AdoptionBar pct={a.dds_submitted_pct} label={`DDS submitted (${a.dds_submitted_count}/${a.configured_count})`} />
              </CardContent>
            </Card>
          ))}
          {adoption.length === 0 && (
            <Card className="bg-slate-900 border-slate-800 col-span-3">
              <CardContent className="py-8 text-center text-slate-500">No adoption data yet</CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Escrow Adoption + MRL Flags + Rejection Patterns */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Escrow adoption */}
        <Card className="bg-slate-900 border-slate-800">
          <CardHeader className="pb-3">
            <CardTitle className="text-white text-sm flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-green-400" /> Escrow Adoption
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {escrowAdoption ? (
              <>
                <div className="text-center py-3">
                  <p className={`text-4xl font-bold ${escrowAdoption.adoption_pct >= 50 ? 'text-green-400' : escrowAdoption.adoption_pct >= 25 ? 'text-yellow-400' : 'text-red-400'}`}>
                    {escrowAdoption.adoption_pct}%
                  </p>
                  <p className="text-slate-500 text-xs mt-1">of shipments have escrow enabled</p>
                </div>
                <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${escrowAdoption.adoption_pct >= 50 ? 'bg-green-500' : escrowAdoption.adoption_pct >= 25 ? 'bg-yellow-500' : 'bg-red-500'}`}
                    style={{ width: `${escrowAdoption.adoption_pct}%` }}
                  />
                </div>
                <div className="flex justify-between text-xs text-slate-500">
                  <span>{escrowAdoption.escrow_enabled} with escrow</span>
                  <span>{escrowAdoption.total_shipments} total</span>
                </div>
                {escrowAdoption.adoption_pct < 30 && (
                  <p className="text-xs text-yellow-400 bg-yellow-950/30 border border-yellow-800/50 rounded p-2">
                    Low adoption — may need friction reduction or education.
                  </p>
                )}
              </>
            ) : (
              <p className="text-slate-500 text-sm text-center py-4">No shipment data</p>
            )}
          </CardContent>
        </Card>

        {/* MRL Flag Frequency */}
        <Card className="bg-slate-900 border-slate-800">
          <CardHeader className="pb-3">
            <CardTitle className="text-white text-sm flex items-center gap-2">
              <FlaskConical className="h-4 w-4 text-red-400" /> Top MRL Flags
            </CardTitle>
            <CardDescription>Most frequently flagged pesticide inputs</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {mrlFlags.length === 0 ? (
              <p className="text-slate-500 text-sm text-center py-4">No MRL flags recorded</p>
            ) : (
              mrlFlags.slice(0, 8).map((f, i) => (
                <div key={f.ingredient} className="flex items-center gap-2">
                  <span className="text-slate-600 text-xs w-5">{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-slate-200 text-sm font-medium truncate">{f.ingredient}</p>
                    <div className="flex gap-1 flex-wrap mt-0.5">
                      {f.markets.slice(0, 3).map(m => (
                        <span key={m} className={`text-[9px] border rounded px-1 ${MARKET_COLORS[m] ?? 'bg-slate-800 text-slate-300 border-slate-700'}`}>{m}</span>
                      ))}
                    </div>
                  </div>
                  <span className="text-red-400 font-bold text-sm">{f.count}</span>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Rejection Patterns */}
        <Card className="bg-slate-900 border-slate-800">
          <CardHeader className="pb-3">
            <CardTitle className="text-white text-sm flex items-center gap-2">
              <Globe className="h-4 w-4 text-amber-400" /> Rejection Patterns
            </CardTitle>
            <CardDescription>Most common shipment rejection reasons</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {rejections.length === 0 ? (
              <p className="text-slate-500 text-sm text-center py-4">No rejections recorded</p>
            ) : (
              rejections.slice(0, 8).map((r, i) => (
                <div key={r.reason} className="flex items-start gap-2">
                  <span className="text-slate-600 text-xs w-5 shrink-0 mt-0.5">{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-slate-200 text-xs leading-snug">{r.reason}</p>
                    <div className="flex gap-1 mt-0.5 flex-wrap">
                      {r.markets.slice(0, 3).map(m => (
                        <span key={m} className="text-[9px] text-slate-500">{m}</span>
                      ))}
                    </div>
                  </div>
                  <span className="text-amber-400 font-bold text-sm shrink-0">{r.count}</span>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
