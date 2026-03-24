'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import {
  Loader2, Plus, Copy, Check, CreditCard, Building2, RefreshCw,
  ExternalLink, Crown, Zap, Filter
} from 'lucide-react';

interface Org { id: string; name: string; subscription_tier: string; subscription_status: string; }
interface PaymentLink {
  id: string;
  org_id: string;
  tier: string;
  amount_ngn: number;
  billing_period: string;
  status: string;
  paystack_link: string;
  paystack_reference: string;
  expires_at: string;
  paid_at: string | null;
  created_at: string;
  organizations: { name: string };
}

type StatusFilter = 'all' | 'pending' | 'paid' | 'expired' | 'cancelled';

const TIER_STYLES: Record<string, string> = {
  starter:    'bg-slate-700/50 text-slate-300 border-slate-600',
  basic:      'bg-blue-900/50 text-blue-300 border-blue-700',
  pro:        'bg-purple-900/50 text-purple-300 border-purple-700',
  enterprise: 'bg-amber-900/50 text-amber-300 border-amber-700',
};

const STATUS_STYLES: Record<string, string> = {
  pending:   'bg-yellow-900/50 text-yellow-300 border-yellow-700',
  paid:      'bg-green-900/50 text-green-300 border-green-700',
  expired:   'bg-red-900/50 text-red-300 border-red-700',
  cancelled: 'bg-slate-700/50 text-slate-400 border-slate-600',
};

function BillingPageInner() {
  const { toast } = useToast();
  const searchParams = useSearchParams();
  const [orgs, setOrgs] = useState<Org[]>([]);
  const [links, setLinks] = useState<PaymentLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [creating, setCreating] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Direct upgrade panel
  const [showDirectUpgrade, setShowDirectUpgrade] = useState(false);
  const [directUpgradeOrgId, setDirectUpgradeOrgId] = useState('');
  const [directUpgradeTier, setDirectUpgradeTier] = useState('');
  const [isDirectUpgrading, setIsDirectUpgrading] = useState(false);

  const [form, setForm] = useState({
    org_id: '',
    tier: '',
    amount_ngn: '',
    billing_period: 'monthly',
    note: '',
  });

  useEffect(() => {
    loadData();
  }, []);

  // Pre-select org if passed via query param (from org detail modal)
  useEffect(() => {
    const orgId = searchParams.get('org_id');
    if (orgId && orgs.length > 0) {
      const match = orgs.find(o => o.id === orgId);
      if (match) {
        setForm(f => ({ ...f, org_id: orgId }));
        setShowCreateDialog(true);
      }
    }
  }, [searchParams, orgs]);

  async function loadData() {
    setLoading(true);
    try {
      const [orgsRes, linksRes] = await Promise.all([
        fetch('/api/superadmin?resource=organizations'),
        fetch('/api/superadmin/payment-links'),
      ]);
      const orgsData = await orgsRes.json();
      const linksData = await linksRes.json();
      setOrgs(orgsData.organizations || []);
      setLinks(linksData.links || []);
    } catch {
      toast({ title: 'Failed to load data', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate() {
    if (!form.org_id || !form.tier || !form.amount_ngn) {
      toast({ title: 'Fill in all required fields', variant: 'destructive' });
      return;
    }
    setCreating(true);
    try {
      const res = await fetch('/api/superadmin/payment-links', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          org_id: form.org_id,
          tier: form.tier,
          amount_ngn: parseFloat(form.amount_ngn),
          billing_period: form.billing_period,
          note: form.note || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast({ title: 'Payment link created and emailed to org admin' });
      setShowCreateDialog(false);
      setForm({ org_id: '', tier: '', amount_ngn: '', billing_period: 'monthly', note: '' });
      loadData();
    } catch (e: any) {
      toast({ title: e.message || 'Failed to create link', variant: 'destructive' });
    } finally {
      setCreating(false);
    }
  }

  async function handleDirectUpgrade() {
    if (!directUpgradeOrgId || !directUpgradeTier) {
      toast({ title: 'Select an org and target tier', variant: 'destructive' });
      return;
    }
    const org = orgs.find(o => o.id === directUpgradeOrgId);
    setIsDirectUpgrading(true);
    try {
      const res = await fetch('/api/superadmin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update_org_status',
          org_id: directUpgradeOrgId,
          subscription_tier: directUpgradeTier,
          current_tier: org?.subscription_tier,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast({ title: 'Tier updated', description: `${org?.name} is now on ${directUpgradeTier}.` });
      setDirectUpgradeOrgId('');
      setDirectUpgradeTier('');
      setShowDirectUpgrade(false);
      loadData();
    } catch (e: any) {
      toast({ title: e.message || 'Failed to update tier', variant: 'destructive' });
    } finally {
      setIsDirectUpgrading(false);
    }
  }

  function copyLink(link: PaymentLink) {
    navigator.clipboard.writeText(link.paystack_link);
    setCopiedId(link.id);
    setTimeout(() => setCopiedId(null), 2000);
  }

  const stats = {
    total: links.length,
    paid: links.filter(l => l.status === 'paid').length,
    pending: links.filter(l => l.status === 'pending').length,
    revenue: links.filter(l => l.status === 'paid').reduce((s, l) => s + l.amount_ngn, 0),
  };

  const filteredLinks = statusFilter === 'all' ? links : links.filter(l => l.status === statusFilter);
  const selectedOrg = orgs.find(o => o.id === form.org_id);
  const directUpgradeOrg = orgs.find(o => o.id === directUpgradeOrgId);

  const STATUS_FILTER_TABS: { key: StatusFilter; label: string }[] = [
    { key: 'all', label: `All (${links.length})` },
    { key: 'pending', label: `Pending (${stats.pending})` },
    { key: 'paid', label: `Paid (${stats.paid})` },
    { key: 'expired', label: `Expired (${links.filter(l => l.status === 'expired').length})` },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white">Billing & Subscriptions</h1>
          <p className="text-slate-400 text-sm mt-1">Generate payment links and manage org subscriptions</p>
        </div>
        <div className="flex gap-2 shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={loadData}
            className="border-slate-600 text-slate-300 hover:bg-slate-800"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowDirectUpgrade(true)}
            className="border-amber-700 text-amber-400 hover:bg-amber-500/10"
          >
            <Crown className="h-4 w-4 mr-2" />
            Direct Upgrade
          </Button>
          <Button
            size="sm"
            onClick={() => setShowCreateDialog(true)}
            className="bg-emerald-700 hover:bg-emerald-600"
          >
            <Plus className="h-4 w-4 mr-2" />
            Payment Link
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Links', value: stats.total, icon: CreditCard, color: 'text-slate-300' },
          { label: 'Paid', value: stats.paid, icon: Check, color: 'text-green-400' },
          { label: 'Pending', value: stats.pending, icon: Loader2, color: 'text-yellow-400' },
          { label: 'Revenue (NGN)', value: `₦${stats.revenue.toLocaleString()}`, icon: Building2, color: 'text-emerald-400' },
        ].map(s => (
          <Card key={s.label} className="bg-slate-900 border-slate-700">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-slate-800 flex items-center justify-center shrink-0">
                <s.icon className={`h-5 w-5 ${s.color}`} />
              </div>
              <div>
                <p className="text-slate-500 text-xs uppercase tracking-wide">{s.label}</p>
                <p className={`font-bold text-xl ${loading ? 'text-slate-600' : 'text-white'}`}>
                  {loading ? '—' : s.value}
                </p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Payment links table */}
      <Card className="bg-slate-900 border-slate-700">
        <CardHeader className="pb-0">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <CardTitle className="text-white text-base">Payment Links</CardTitle>
            <div className="flex items-center gap-1 bg-slate-800 rounded-lg p-1">
              <Filter className="h-3.5 w-3.5 text-slate-500 ml-2 mr-1" />
              {STATUS_FILTER_TABS.map(tab => (
                <button
                  key={tab.key}
                  onClick={() => setStatusFilter(tab.key)}
                  className={`px-3 py-1.5 text-xs rounded-md font-medium transition-all ${
                    statusFilter === tab.key
                      ? 'bg-slate-700 text-white'
                      : 'text-slate-400 hover:text-slate-300'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-4">
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-slate-500" />
            </div>
          ) : filteredLinks.length === 0 ? (
            <div className="text-center py-12 text-slate-500">
              <CreditCard className="h-10 w-10 mx-auto mb-3 opacity-30" />
              <p>{statusFilter === 'all' ? 'No payment links yet.' : `No ${statusFilter} links.`}</p>
              {statusFilter === 'all' && (
                <p className="text-sm mt-1">Click &ldquo;Payment Link&rdquo; to generate one.</p>
              )}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-slate-700">
                  <TableHead className="text-slate-400">Organisation</TableHead>
                  <TableHead className="text-slate-400">Tier</TableHead>
                  <TableHead className="text-slate-400">Amount</TableHead>
                  <TableHead className="text-slate-400">Period</TableHead>
                  <TableHead className="text-slate-400">Status</TableHead>
                  <TableHead className="text-slate-400">Date</TableHead>
                  <TableHead className="text-slate-400">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLinks.map(link => (
                  <TableRow key={link.id} className="border-slate-700 hover:bg-slate-800/40">
                    <TableCell className="text-slate-200 font-medium">
                      {link.organizations?.name || link.org_id.slice(0, 8)}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={`capitalize text-xs ${TIER_STYLES[link.tier] || TIER_STYLES.starter}`}>
                        {link.tier}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-slate-200 font-medium">
                      ₦{link.amount_ngn?.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-slate-400 text-sm capitalize">
                      {link.billing_period}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={`capitalize text-xs ${STATUS_STYLES[link.status] || ''}`}>
                        {link.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-slate-400 text-sm">
                      {link.paid_at
                        ? `Paid ${new Date(link.paid_at).toLocaleDateString('en-GB')}`
                        : new Date(link.expires_at) < new Date()
                        ? `Expired ${new Date(link.expires_at).toLocaleDateString('en-GB')}`
                        : `Expires ${new Date(link.expires_at).toLocaleDateString('en-GB')}`}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1.5">
                        {link.paystack_link && link.status === 'pending' && (
                          <>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 w-7 p-0 text-slate-400 hover:text-white hover:bg-slate-700"
                              title="Copy link"
                              onClick={() => copyLink(link)}
                            >
                              {copiedId === link.id
                                ? <Check className="h-3.5 w-3.5 text-green-400" />
                                : <Copy className="h-3.5 w-3.5" />}
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 w-7 p-0 text-slate-400 hover:text-cyan-400 hover:bg-slate-700"
                              title="Open link"
                              onClick={() => window.open(link.paystack_link, '_blank')}
                            >
                              <ExternalLink className="h-3.5 w-3.5" />
                            </Button>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Generate Payment Link dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="bg-slate-900 border-slate-700 text-slate-100 max-w-md">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-emerald-400" />
              Generate Payment Link
            </DialogTitle>
            <DialogDescription className="text-slate-400">
              Creates a Paystack payment link and emails it to the org admin.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label className="text-slate-300">Organisation *</Label>
              <Select value={form.org_id} onValueChange={v => setForm(f => ({ ...f, org_id: v }))}>
                <SelectTrigger className="bg-slate-800 border-slate-600 text-slate-100">
                  <SelectValue placeholder="Select organisation…" />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-600">
                  {orgs.length === 0 ? (
                    <div className="py-3 text-center text-sm text-slate-400">No organizations found</div>
                  ) : orgs.map(o => (
                    <SelectItem key={o.id} value={o.id} className="text-slate-200">
                      <span className="flex items-center gap-2">
                        {o.name}
                        <Badge variant="outline" className={`text-xs ${TIER_STYLES[o.subscription_tier] || TIER_STYLES.starter}`}>
                          {o.subscription_tier || 'starter'}
                        </Badge>
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedOrg && (
                <p className="text-xs text-slate-500">
                  Current plan: <span className="text-slate-300 capitalize">{selectedOrg.subscription_tier || 'starter'}</span>
                  {' · '}Status: <span className="text-slate-300 capitalize">{selectedOrg.subscription_status || 'active'}</span>
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label className="text-slate-300">Upgrade to *</Label>
              <Select value={form.tier} onValueChange={v => setForm(f => ({ ...f, tier: v }))}>
                <SelectTrigger className="bg-slate-800 border-slate-600 text-slate-100">
                  <SelectValue placeholder="Select tier…" />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-600">
                  {['starter', 'basic', 'pro', 'enterprise'].map(t => (
                    <SelectItem key={t} value={t} className="text-slate-200 capitalize">{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-slate-300">Amount (NGN) *</Label>
                <Input
                  type="number"
                  placeholder="e.g. 150000"
                  value={form.amount_ngn}
                  onChange={e => setForm(f => ({ ...f, amount_ngn: e.target.value }))}
                  className="bg-slate-800 border-slate-600 text-slate-100"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-slate-300">Billing Period</Label>
                <Select value={form.billing_period} onValueChange={v => setForm(f => ({ ...f, billing_period: v }))}>
                  <SelectTrigger className="bg-slate-800 border-slate-600 text-slate-100">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-600">
                    <SelectItem value="monthly">Monthly</SelectItem>
                    <SelectItem value="annual">Annual</SelectItem>
                    <SelectItem value="custom">Custom</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-slate-300">Note (optional)</Label>
              <Textarea
                placeholder="e.g. Includes onboarding support for 3 months"
                value={form.note}
                onChange={e => setForm(f => ({ ...f, note: e.target.value }))}
                className="bg-slate-800 border-slate-600 text-slate-100 resize-none"
                rows={2}
              />
            </div>

            <div className="flex gap-3 pt-2">
              <Button
                onClick={handleCreate}
                disabled={creating || !form.org_id || !form.tier || !form.amount_ngn}
                className="flex-1 bg-emerald-700 hover:bg-emerald-600"
              >
                {creating
                  ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Creating…</>
                  : 'Generate & Send'}
              </Button>
              <Button
                variant="outline"
                onClick={() => setShowCreateDialog(false)}
                className="border-slate-600 text-slate-300 hover:bg-slate-800"
              >
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Direct Upgrade dialog */}
      <Dialog open={showDirectUpgrade} onOpenChange={setShowDirectUpgrade}>
        <DialogContent className="bg-slate-900 border-slate-700 text-slate-100 max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <Zap className="h-5 w-5 text-amber-400" />
              Direct Tier Upgrade
            </DialogTitle>
            <DialogDescription className="text-slate-400">
              Instantly activate a tier without generating a payment link. Use for trials, free upgrades, or manual activations.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-slate-300">Organisation</Label>
              <Select value={directUpgradeOrgId} onValueChange={setDirectUpgradeOrgId}>
                <SelectTrigger className="bg-slate-800 border-slate-600 text-slate-100">
                  <SelectValue placeholder="Select organisation…" />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-600">
                  {orgs.map(o => (
                    <SelectItem key={o.id} value={o.id} className="text-slate-200">
                      {o.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {directUpgradeOrg && (
                <p className="text-xs text-slate-500">
                  Current tier: <span className="text-slate-300 capitalize">{directUpgradeOrg.subscription_tier || 'starter'}</span>
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label className="text-slate-300">New Tier</Label>
              <Select value={directUpgradeTier} onValueChange={setDirectUpgradeTier}>
                <SelectTrigger className="bg-slate-800 border-slate-600 text-slate-100">
                  <SelectValue placeholder="Select tier…" />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-600">
                  {['starter', 'basic', 'pro', 'enterprise'].map(t => (
                    <SelectItem key={t} value={t} className="text-slate-200 capitalize">{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="rounded-lg bg-amber-950/30 border border-amber-800/50 p-3 text-xs text-amber-300">
              This bypasses payment. Only use for internal purposes or customer trials.
            </div>

            <div className="flex gap-3">
              <Button
                onClick={handleDirectUpgrade}
                disabled={isDirectUpgrading || !directUpgradeOrgId || !directUpgradeTier}
                className="flex-1 bg-amber-700 hover:bg-amber-600"
              >
                {isDirectUpgrading
                  ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Upgrading…</>
                  : <><Crown className="h-4 w-4 mr-2" />Apply Upgrade</>}
              </Button>
              <Button
                variant="outline"
                onClick={() => setShowDirectUpgrade(false)}
                className="border-slate-600 text-slate-300 hover:bg-slate-800"
              >
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function BillingPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-cyan-400" />
      </div>
    }>
      <BillingPageInner />
    </Suspense>
  );
}
