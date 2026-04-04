'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import {
  Loader2, RefreshCw, AlertTriangle, CheckCircle2, XCircle,
  DollarSign, Pause, Play, Shield, Settings,
} from 'lucide-react';

// ─── types ────────────────────────────────────────────────────────────────────

interface EscrowOverview {
  total_accounts: number;
  active_holds: number;
  overdue_releases: number;
  disputed_holds: number;
  total_by_currency: Record<string, number>;
}

// Disputes surface as the "failed transaction" signal for escrow (no 'failed' type exists)
interface EscrowDispute {
  id: string;
  reason: string;
  status: string;
  created_at: string;
  escrow_accounts?: { org_id: string; currency: string; organizations?: { name: string } };
}

interface FailedPayment {
  id: string;
  org_id: string;
  org_name: string;
  amount: number;
  currency: string;
  status: string;
  provider: string;
  failure_reason: string;
  created_at: string;
}

interface KycRecord {
  id: string;
  org_id: string;
  status: string;
  submitted_at: string;
  organizations?: { name: string; subscription_tier: string };
}

interface ProviderStatus {
  provider: string;
  status: string;
  last_checked_at: string;
  error_message: string | null;
}

interface FeeConfig {
  id: string;
  tier: string;
  escrow_fee_pct: number;
  stablecoin_fee_pct: number;
  audit_report_fee_ngn: number;
}

interface PausedOrg {
  id: string;
  org_id: string;
  pause_reason: string;
  paused_at: string;
  organizations?: { name: string; subscription_tier: string };
}

// ─── constants ─────────────────────────────────────────────────────────────────

const TIER_COLORS: Record<string, string> = {
  starter:    'bg-slate-700/50 text-slate-300 border-slate-600',
  basic:      'bg-blue-900/50 text-blue-300 border-blue-700',
  pro:        'bg-purple-900/50 text-purple-300 border-purple-700',
  enterprise: 'bg-amber-900/50 text-amber-300 border-amber-700',
};

const PROVIDER_COLORS: Record<string, string> = {
  operational: 'bg-green-900/40 text-green-300 border-green-700',
  degraded:    'bg-yellow-900/40 text-yellow-300 border-yellow-700',
  down:        'bg-red-900/40 text-red-300 border-red-700',
  unknown:     'bg-slate-700/40 text-slate-400 border-slate-600',
};

function fmtNgn(n: number) {
  return new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', maximumFractionDigits: 0 }).format(n);
}

function fmtDateTime(s: string | null) {
  if (!s) return '—';
  return new Date(s).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
}

// ─── component ────────────────────────────────────────────────────────────────

export default function PaymentsPage() {
  const { toast } = useToast();

  const [escrowOverview, setEscrowOverview] = useState<EscrowOverview | null>(null);
  const [failedTxns, setFailedTxns] = useState<EscrowDispute[]>([]);
  const [failedPayments, setFailedPayments] = useState<FailedPayment[]>([]);
  const [kycQueue, setKycQueue] = useState<KycRecord[]>([]);
  const [providers, setProviders] = useState<ProviderStatus[]>([]);
  const [feeConfig, setFeeConfig] = useState<FeeConfig[]>([]);
  const [pausedOrgs, setPausedOrgs] = useState<PausedOrg[]>([]);
  const [loading, setLoading] = useState(true);

  // KYC review
  const [reviewingKyc, setReviewingKyc] = useState<KycRecord | null>(null);
  const [kycDecision, setKycDecision] = useState<'approved' | 'rejected'>('approved');
  const [kycNotes, setKycNotes] = useState('');
  const [submittingKyc, setSubmittingKyc] = useState(false);

  // Fee config edit
  const [editingFee, setEditingFee] = useState<FeeConfig | null>(null);
  const [feeForm, setFeeForm] = useState({ escrow_fee_pct: '', stablecoin_fee_pct: '', audit_report_fee_ngn: '' });
  const [savingFee, setSavingFee] = useState(false);

  // Pause dialog
  const [showPauseDialog, setShowPauseDialog] = useState(false);
  const [pauseOrgId, setPauseOrgId] = useState('');
  const [pauseReason, setPauseReason] = useState('');
  const [submittingPause, setSubmittingPause] = useState(false);

  useEffect(() => { loadAll(); }, []);

  const loadAll = async () => {
    setLoading(true);
    try {
      const results = await Promise.all([
        fetch('/api/superadmin/payments?resource=escrow_overview').then(r => r.json()),
        fetch('/api/superadmin/payments?resource=failed_transactions').then(r => r.json()),
        fetch('/api/superadmin/payments?resource=kyc_queue').then(r => r.json()),
        fetch('/api/superadmin/payments?resource=provider_status').then(r => r.json()),
        fetch('/api/superadmin/payments?resource=fee_config').then(r => r.json()),
        fetch('/api/superadmin/payments?resource=payout_controls').then(r => r.json()),
      ]);
      setEscrowOverview(results[0].escrow_overview ?? null);
      setFailedTxns(results[1].failed_transactions ?? []);
      setFailedPayments(results[1].failed_payments ?? []);
      setKycQueue(results[2].kyc_queue ?? []);
      setProviders(results[3].providers ?? []);
      setFeeConfig(results[4].fee_config ?? []);
      setPausedOrgs(results[5].paused_orgs ?? []);
    } catch {
      toast({ title: 'Failed to load payment data', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const submitKycReview = async () => {
    if (!reviewingKyc) return;
    setSubmittingKyc(true);
    try {
      const res = await fetch('/api/superadmin/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'review_kyc', org_id: reviewingKyc.org_id, decision: kycDecision, notes: kycNotes }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      toast({ title: `KYC ${kycDecision} for ${reviewingKyc.organizations?.name}` });
      setReviewingKyc(null);
      loadAll();
    } catch (err: any) {
      toast({ title: err.message ?? 'Review failed', variant: 'destructive' });
    } finally {
      setSubmittingKyc(false);
    }
  };

  const saveFeeConfig = async () => {
    if (!editingFee) return;
    setSavingFee(true);
    try {
      const res = await fetch('/api/superadmin/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update_fee_config',
          tier: editingFee.tier,
          escrow_fee_pct: parseFloat(feeForm.escrow_fee_pct) / 100,
          stablecoin_fee_pct: parseFloat(feeForm.stablecoin_fee_pct) / 100,
          audit_report_fee_ngn: parseFloat(feeForm.audit_report_fee_ngn),
        }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      toast({ title: 'Fee config updated' });
      setEditingFee(null);
      loadAll();
    } catch (err: any) {
      toast({ title: err.message ?? 'Save failed', variant: 'destructive' });
    } finally {
      setSavingFee(false);
    }
  };

  const pausePayouts = async () => {
    if (!pauseOrgId || !pauseReason) return;
    setSubmittingPause(true);
    try {
      const res = await fetch('/api/superadmin/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'pause_payouts', org_id: pauseOrgId, reason: pauseReason }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      toast({ title: 'Payouts paused' });
      setShowPauseDialog(false);
      setPauseOrgId('');
      setPauseReason('');
      loadAll();
    } catch (err: any) {
      toast({ title: err.message ?? 'Failed', variant: 'destructive' });
    } finally {
      setSubmittingPause(false);
    }
  };

  const resumePayouts = async (orgId: string) => {
    try {
      const res = await fetch('/api/superadmin/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'resume_payouts', org_id: orgId }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      toast({ title: 'Payouts resumed' });
      loadAll();
    } catch (err: any) {
      toast({ title: err.message ?? 'Failed', variant: 'destructive' });
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin text-cyan-400" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Payment & Escrow Operations</h1>
          <p className="text-slate-400 text-sm mt-1">Oversight of escrow health, KYC queue, payment rails, and fee configuration.</p>
        </div>
        <Button size="sm" variant="outline" className="border-slate-700 text-slate-300 hover:bg-slate-800" onClick={loadAll}>
          <RefreshCw className="h-4 w-4 mr-2" /> Refresh
        </Button>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'Active Escrow Holds', value: escrowOverview?.active_holds ?? 0, icon: DollarSign, color: 'text-cyan-400' },
          { label: 'Overdue Releases', value: escrowOverview?.overdue_releases ?? 0, icon: AlertTriangle, color: escrowOverview?.overdue_releases ? 'text-red-400' : 'text-slate-400' },
          { label: 'Disputed Holds', value: escrowOverview?.disputed_holds ?? 0, icon: XCircle, color: escrowOverview?.disputed_holds ? 'text-amber-400' : 'text-slate-400' },
          { label: 'KYC Pending Review', value: kycQueue.length, icon: Shield, color: kycQueue.length ? 'text-yellow-400' : 'text-slate-400' },
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

      {/* Currency Totals */}
      {escrowOverview?.total_by_currency && Object.keys(escrowOverview.total_by_currency).length > 0 && (
        <div className="flex gap-3 flex-wrap">
          {Object.entries(escrowOverview.total_by_currency).map(([cur, amt]) => (
            <div key={cur} className="bg-slate-900 border border-slate-800 rounded-lg px-4 py-3 text-center min-w-[140px]">
              <p className="text-xs text-slate-500 uppercase tracking-wider">{cur} In Escrow</p>
              <p className="text-lg font-semibold text-white mt-1">
                {cur === 'NGN' ? fmtNgn(amt) : amt.toLocaleString()}
              </p>
            </div>
          ))}
        </div>
      )}

      <Tabs defaultValue="kyc">
        <TabsList className="bg-slate-900 border border-slate-800">
          <TabsTrigger value="kyc" className="data-[state=active]:bg-slate-800 data-[state=active]:text-white text-slate-400">
            KYC Queue {kycQueue.length > 0 && <Badge className="ml-2 bg-yellow-900/60 text-yellow-300 border-0">{kycQueue.length}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="failed" className="data-[state=active]:bg-slate-800 data-[state=active]:text-white text-slate-400">
            Failed Transactions
          </TabsTrigger>
          <TabsTrigger value="providers" className="data-[state=active]:bg-slate-800 data-[state=active]:text-white text-slate-400">
            Provider Status
          </TabsTrigger>
          <TabsTrigger value="fees" className="data-[state=active]:bg-slate-800 data-[state=active]:text-white text-slate-400">
            Fee Config
          </TabsTrigger>
          <TabsTrigger value="paused" className="data-[state=active]:bg-slate-800 data-[state=active]:text-white text-slate-400">
            Payout Controls
          </TabsTrigger>
        </TabsList>

        {/* KYC Queue */}
        <TabsContent value="kyc">
          <Card className="bg-slate-900 border-slate-800">
            <CardHeader>
              <CardTitle className="text-white text-base">KYC Manual Review Queue</CardTitle>
              <CardDescription>Organisations awaiting identity verification review</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow className="border-slate-800">
                    <TableHead className="text-slate-400">Organisation</TableHead>
                    <TableHead className="text-slate-400">Tier</TableHead>
                    <TableHead className="text-slate-400">Submitted</TableHead>
                    <TableHead className="text-slate-400">Status</TableHead>
                    <TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {kycQueue.length === 0 ? (
                    <TableRow><TableCell colSpan={5} className="text-center text-slate-500 py-8">
                      <CheckCircle2 className="h-6 w-6 mx-auto mb-2 text-green-500" />
                      No pending KYC reviews
                    </TableCell></TableRow>
                  ) : (
                    kycQueue.map(k => (
                      <TableRow key={k.id} className="border-slate-800 hover:bg-slate-800/30">
                        <TableCell className="font-medium text-slate-200">{k.organizations?.name ?? k.org_id}</TableCell>
                        <TableCell>
                          <Badge className={`text-xs border ${TIER_COLORS[k.organizations?.subscription_tier ?? ''] ?? 'bg-slate-800 text-slate-400'}`}>
                            {k.organizations?.subscription_tier ?? '—'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-slate-400 text-sm">{fmtDateTime(k.submitted_at)}</TableCell>
                        <TableCell>
                          <Badge className="text-xs border bg-yellow-900/40 text-yellow-300 border-yellow-700">pending review</Badge>
                        </TableCell>
                        <TableCell>
                          <Button
                            size="sm"
                            className="h-7 text-xs bg-cyan-900/40 text-cyan-300 hover:bg-cyan-800/60 border border-cyan-700"
                            onClick={() => { setReviewingKyc(k); setKycDecision('approved'); setKycNotes(''); }}
                          >
                            Review
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

        {/* Failed Transactions */}
        <TabsContent value="failed">
          <div className="space-y-4">
            {/* Escrow Disputes */}
            {failedTxns.length > 0 && (
              <Card className="bg-slate-900 border-slate-800 border-amber-800/40">
                <CardHeader className="pb-3">
                  <CardTitle className="text-white text-sm">Open Escrow Disputes</CardTitle>
                  <CardDescription>Disputed holds requiring resolution before funds release</CardDescription>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow className="border-slate-800">
                        <TableHead className="text-slate-400">Organisation</TableHead>
                        <TableHead className="text-slate-400">Reason</TableHead>
                        <TableHead className="text-slate-400">Status</TableHead>
                        <TableHead className="text-slate-400">Date</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {failedTxns.map(d => (
                        <TableRow key={d.id} className="border-slate-800 hover:bg-slate-800/30">
                          <TableCell className="text-slate-200 font-medium">
                            {(d.escrow_accounts as any)?.organizations?.name ?? '—'}
                          </TableCell>
                          <TableCell className="text-amber-400 text-sm max-w-[250px] truncate">{d.reason}</TableCell>
                          <TableCell>
                            <Badge className="text-xs border bg-amber-900/40 text-amber-300 border-amber-700">{d.status}</Badge>
                          </TableCell>
                          <TableCell className="text-slate-500 text-sm">{fmtDateTime(d.created_at)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )}

            {/* Failed Payments */}
            <Card className="bg-slate-900 border-slate-800">
              <CardHeader className="pb-3">
                <CardTitle className="text-white text-sm">Failed Payments</CardTitle>
                <CardDescription>Payment transactions that did not complete</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow className="border-slate-800">
                      <TableHead className="text-slate-400">Organisation</TableHead>
                      <TableHead className="text-slate-400">Method</TableHead>
                      <TableHead className="text-slate-400 text-right">Amount</TableHead>
                      <TableHead className="text-slate-400">Notes</TableHead>
                      <TableHead className="text-slate-400">Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {failedPayments.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center text-slate-500 py-6">No failed payments</TableCell>
                      </TableRow>
                    ) : (
                      failedPayments.map(p => (
                        <TableRow key={p.id} className="border-slate-800 hover:bg-slate-800/30">
                          <TableCell className="text-slate-200 font-medium">{p.org_name}</TableCell>
                          <TableCell className="text-slate-400 text-sm capitalize">{p.provider}</TableCell>
                          <TableCell className="text-right text-slate-300">
                            {p.currency === 'NGN' ? fmtNgn(p.amount) : `${p.currency} ${p.amount}`}
                          </TableCell>
                          <TableCell className="text-red-400 text-sm max-w-[200px] truncate">{p.failure_reason}</TableCell>
                          <TableCell className="text-slate-500 text-sm">{fmtDateTime(p.created_at)}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Provider Status */}
        <TabsContent value="providers">
          <Card className="bg-slate-900 border-slate-800">
            <CardHeader>
              <CardTitle className="text-white text-base">Payment Provider Status</CardTitle>
              <CardDescription>Live connectivity status of all payment rails</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {providers.map(p => (
                  <div key={p.provider} className="bg-slate-800/50 rounded-lg p-4 border border-slate-700 flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium text-white capitalize">{p.provider.replace('_', ' ')}</p>
                      <p className="text-xs text-slate-500 mt-0.5">Checked {fmtDateTime(p.last_checked_at)}</p>
                      {p.error_message && <p className="text-xs text-red-400 mt-1">{p.error_message}</p>}
                    </div>
                    <Badge className={`text-xs border shrink-0 ${PROVIDER_COLORS[p.status]}`}>{p.status}</Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Fee Config */}
        <TabsContent value="fees">
          <Card className="bg-slate-900 border-slate-800">
            <CardHeader>
              <CardTitle className="text-white text-base">Escrow Fee Configuration</CardTitle>
              <CardDescription>Per-tier fee rates applied to escrow, stablecoin, and audit transactions</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow className="border-slate-800">
                    <TableHead className="text-slate-400">Tier</TableHead>
                    <TableHead className="text-slate-400 text-right">Escrow Fee</TableHead>
                    <TableHead className="text-slate-400 text-right">Stablecoin Fee</TableHead>
                    <TableHead className="text-slate-400 text-right">Audit Report Fee</TableHead>
                    <TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {feeConfig.map(f => (
                    <TableRow key={f.id} className="border-slate-800 hover:bg-slate-800/30">
                      <TableCell>
                        <Badge className={`text-xs border capitalize ${TIER_COLORS[f.tier] ?? 'bg-slate-800 text-slate-300'}`}>{f.tier}</Badge>
                      </TableCell>
                      <TableCell className="text-right text-slate-300">{(f.escrow_fee_pct * 100).toFixed(2)}%</TableCell>
                      <TableCell className="text-right text-slate-300">{(f.stablecoin_fee_pct * 100).toFixed(2)}%</TableCell>
                      <TableCell className="text-right text-slate-300">{fmtNgn(f.audit_report_fee_ngn)}</TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 text-xs text-slate-400 hover:text-white"
                          onClick={() => {
                            setEditingFee(f);
                            setFeeForm({
                              escrow_fee_pct: (f.escrow_fee_pct * 100).toFixed(2),
                              stablecoin_fee_pct: (f.stablecoin_fee_pct * 100).toFixed(2),
                              audit_report_fee_ngn: String(f.audit_report_fee_ngn),
                            });
                          }}
                        >
                          <Settings className="h-3 w-3 mr-1" /> Edit
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Payout Controls */}
        <TabsContent value="paused">
          <Card className="bg-slate-900 border-slate-800">
            <CardHeader className="flex flex-row items-center justify-between gap-4 pb-3">
              <div>
                <CardTitle className="text-white text-base">Payout Controls</CardTitle>
                <CardDescription>Organisations with outbound payments paused</CardDescription>
              </div>
              <Button
                size="sm"
                className="bg-red-900/50 text-red-300 border border-red-700 hover:bg-red-800/60"
                onClick={() => setShowPauseDialog(true)}
              >
                <Pause className="h-4 w-4 mr-2" /> Pause Org Payouts
              </Button>
            </CardHeader>
            <CardContent>
              {pausedOrgs.length === 0 ? (
                <div className="text-center text-slate-500 py-8">
                  <CheckCircle2 className="h-6 w-6 mx-auto mb-2 text-green-500" />
                  No organisations currently paused
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="border-slate-800">
                      <TableHead className="text-slate-400">Organisation</TableHead>
                      <TableHead className="text-slate-400">Reason</TableHead>
                      <TableHead className="text-slate-400">Paused At</TableHead>
                      <TableHead />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pausedOrgs.map(po => (
                      <TableRow key={po.id} className="border-slate-800 hover:bg-slate-800/30">
                        <TableCell className="font-medium text-slate-200">{po.organizations?.name ?? po.org_id}</TableCell>
                        <TableCell className="text-slate-400 text-sm max-w-[250px] truncate">{po.pause_reason}</TableCell>
                        <TableCell className="text-slate-500 text-sm">{fmtDateTime(po.paused_at)}</TableCell>
                        <TableCell>
                          <Button
                            size="sm"
                            className="h-7 text-xs bg-green-900/40 text-green-300 border border-green-700 hover:bg-green-800/60"
                            onClick={() => resumePayouts(po.org_id)}
                          >
                            <Play className="h-3 w-3 mr-1" /> Resume
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* KYC Review Dialog */}
      <Dialog open={!!reviewingKyc} onOpenChange={o => !o && setReviewingKyc(null)}>
        <DialogContent className="bg-slate-900 border-slate-700 text-white max-w-md">
          <DialogHeader>
            <DialogTitle>KYC Review — {reviewingKyc?.organizations?.name}</DialogTitle>
            <DialogDescription className="text-slate-400">Approve or reject this organisation's KYC submission.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="flex gap-3">
              {(['approved', 'rejected'] as const).map(d => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setKycDecision(d)}
                  className={`flex-1 py-2 rounded-lg border text-sm font-medium transition-colors capitalize ${kycDecision === d
                    ? d === 'approved' ? 'bg-green-900/60 text-green-300 border-green-600' : 'bg-red-900/60 text-red-300 border-red-600'
                    : 'bg-slate-800 text-slate-400 border-slate-700 hover:border-slate-500'
                  }`}
                >
                  {d}
                </button>
              ))}
            </div>
            <div className="space-y-1.5">
              <Label className="text-slate-300">Review Notes</Label>
              <Textarea
                className="bg-slate-800 border-slate-700 text-white"
                placeholder="Document verified against CAC registry..."
                value={kycNotes}
                onChange={e => setKycNotes(e.target.value)}
              />
            </div>
            <div className="flex gap-3 pt-2">
              <Button variant="outline" className="flex-1 border-slate-700 text-slate-300 hover:bg-slate-800" onClick={() => setReviewingKyc(null)}>Cancel</Button>
              <Button
                className={`flex-1 ${kycDecision === 'approved' ? 'bg-green-700 hover:bg-green-600' : 'bg-red-700 hover:bg-red-600'} text-white`}
                onClick={submitKycReview}
                disabled={submittingKyc}
              >
                {submittingKyc ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Confirm {kycDecision}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Fee Edit Dialog */}
      <Dialog open={!!editingFee} onOpenChange={o => !o && setEditingFee(null)}>
        <DialogContent className="bg-slate-900 border-slate-700 text-white max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Fee Config — <span className="capitalize">{editingFee?.tier}</span></DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label className="text-slate-300">Escrow Fee (%)</Label>
              <Input type="number" step="0.01" className="bg-slate-800 border-slate-700 text-white" value={feeForm.escrow_fee_pct} onChange={e => setFeeForm(f => ({ ...f, escrow_fee_pct: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-slate-300">Stablecoin Fee (%)</Label>
              <Input type="number" step="0.01" className="bg-slate-800 border-slate-700 text-white" value={feeForm.stablecoin_fee_pct} onChange={e => setFeeForm(f => ({ ...f, stablecoin_fee_pct: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-slate-300">Audit Report Fee (NGN)</Label>
              <Input type="number" step="100" className="bg-slate-800 border-slate-700 text-white" value={feeForm.audit_report_fee_ngn} onChange={e => setFeeForm(f => ({ ...f, audit_report_fee_ngn: e.target.value }))} />
            </div>
            <div className="flex gap-3 pt-2">
              <Button variant="outline" className="flex-1 border-slate-700 text-slate-300 hover:bg-slate-800" onClick={() => setEditingFee(null)}>Cancel</Button>
              <Button className="flex-1 bg-cyan-600 hover:bg-cyan-500 text-white" onClick={saveFeeConfig} disabled={savingFee}>
                {savingFee ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null} Save
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Pause Payouts Dialog */}
      <Dialog open={showPauseDialog} onOpenChange={setShowPauseDialog}>
        <DialogContent className="bg-slate-900 border-slate-700 text-white max-w-md">
          <DialogHeader>
            <DialogTitle>Pause Outbound Payments</DialogTitle>
            <DialogDescription className="text-slate-400">Enter the organisation ID and the reason. This action is logged.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label className="text-slate-300">Organisation ID</Label>
              <Input className="bg-slate-800 border-slate-700 text-white font-mono text-sm" placeholder="org UUID" value={pauseOrgId} onChange={e => setPauseOrgId(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-slate-300">Reason <span className="text-red-400">*</span></Label>
              <Textarea className="bg-slate-800 border-slate-700 text-white" placeholder="Suspected fraudulent activity — investigating transaction pattern..." value={pauseReason} onChange={e => setPauseReason(e.target.value)} />
            </div>
            <div className="flex gap-3 pt-2">
              <Button variant="outline" className="flex-1 border-slate-700 text-slate-300 hover:bg-slate-800" onClick={() => setShowPauseDialog(false)}>Cancel</Button>
              <Button
                className="flex-1 bg-red-700 hover:bg-red-600 text-white"
                onClick={pausePayouts}
                disabled={submittingPause || !pauseOrgId || !pauseReason}
              >
                {submittingPause ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Pause className="h-4 w-4 mr-2" />}
                Pause Payouts
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
