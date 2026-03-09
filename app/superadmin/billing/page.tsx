'use client';

import { useEffect, useState } from 'react';
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
import { Loader2, Plus, Copy, Check, CreditCard, Building2, RefreshCw, ExternalLink } from 'lucide-react';

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

const TIER_COLORS: Record<string, string> = {
  starter: 'bg-gray-100 text-gray-700',
  basic: 'bg-blue-100 text-blue-700',
  pro: 'bg-purple-100 text-purple-700',
  enterprise: 'bg-green-100 text-green-700',
};

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-700',
  paid: 'bg-green-100 text-green-700',
  expired: 'bg-red-100 text-red-700',
  cancelled: 'bg-gray-100 text-gray-500',
};

export default function BillingPage() {
  const { toast } = useToast();
  const [orgs, setOrgs] = useState<Org[]>([]);
  const [links, setLinks] = useState<PaymentLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [creating, setCreating] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

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

  async function loadData() {
    setLoading(true);
    try {
      const [orgsRes, linksRes] = await Promise.all([
        fetch('/api/superadmin?action=list_organizations'),
        fetch('/api/superadmin/payment-links'),
      ]);
      const orgsData = await orgsRes.json();
      const linksData = await linksRes.json();
      setOrgs(orgsData.organizations || []);
      setLinks(linksData.links || []);
    } catch (e) {
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

  const selectedOrg = orgs.find(o => o.id === form.org_id);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">Billing & Subscriptions</h1>
          <p className="text-slate-400 text-sm mt-1">Generate payment links and manage org subscriptions</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={loadData} className="border-slate-600 text-slate-300">
            <RefreshCw className="h-4 w-4 mr-2" />Refresh
          </Button>
          <Button size="sm" onClick={() => setShowCreateDialog(true)} className="bg-emerald-600 hover:bg-emerald-700">
            <Plus className="h-4 w-4 mr-2" />Generate Payment Link
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Links', value: stats.total, icon: CreditCard },
          { label: 'Paid', value: stats.paid, icon: Check },
          { label: 'Pending', value: stats.pending, icon: Loader2 },
          { label: 'Revenue (NGN)', value: `₦${stats.revenue.toLocaleString()}`, icon: Building2 },
        ].map(s => (
          <Card key={s.label} className="bg-slate-800 border-slate-700">
            <CardContent className="p-4 flex items-center gap-3">
              <s.icon className="h-8 w-8 text-emerald-400 shrink-0" />
              <div>
                <p className="text-slate-400 text-xs">{s.label}</p>
                <p className="text-white font-bold text-xl">{loading ? '—' : s.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Payment links table */}
      <Card className="bg-slate-800 border-slate-700">
        <CardHeader className="pb-3">
          <CardTitle className="text-slate-100 text-base">Payment Links</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
            </div>
          ) : links.length === 0 ? (
            <div className="text-center py-12 text-slate-400">
              <CreditCard className="h-10 w-10 mx-auto mb-3 opacity-40" />
              <p>No payment links yet. Generate one to get started.</p>
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
                  <TableHead className="text-slate-400">Expires</TableHead>
                  <TableHead className="text-slate-400">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {links.map(link => (
                  <TableRow key={link.id} className="border-slate-700">
                    <TableCell className="text-slate-200 font-medium">
                      {link.organizations?.name || link.org_id.slice(0, 8)}
                    </TableCell>
                    <TableCell>
                      <Badge className={TIER_COLORS[link.tier] || 'bg-gray-100 text-gray-700'}>
                        {link.tier}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-slate-200">
                      ₦{link.amount_ngn?.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-slate-400 text-sm capitalize">
                      {link.billing_period}
                    </TableCell>
                    <TableCell>
                      <Badge className={STATUS_COLORS[link.status] || ''}>
                        {link.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-slate-400 text-sm">
                      {link.paid_at
                        ? `Paid ${new Date(link.paid_at).toLocaleDateString('en-GB')}`
                        : new Date(link.expires_at) < new Date()
                        ? 'Expired'
                        : new Date(link.expires_at).toLocaleDateString('en-GB')}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        {link.paystack_link && link.status === 'pending' && (
                          <>
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 px-2 border-slate-600 text-slate-300"
                              onClick={() => copyLink(link)}
                            >
                              {copiedId === link.id
                                ? <Check className="h-3 w-3 text-green-400" />
                                : <Copy className="h-3 w-3" />}
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 px-2 border-slate-600 text-slate-300"
                              onClick={() => window.open(link.paystack_link, '_blank')}
                            >
                              <ExternalLink className="h-3 w-3" />
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

      {/* Create payment link dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="bg-slate-800 border-slate-700 text-slate-100 max-w-md">
          <DialogHeader>
            <DialogTitle>Generate Payment Link</DialogTitle>
            <DialogDescription className="text-slate-400">
              Creates a Paystack payment link and emails it to the org admin.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label className="text-slate-300">Organisation *</Label>
              <Select value={form.org_id} onValueChange={v => setForm(f => ({ ...f, org_id: v }))}>
                <SelectTrigger className="bg-slate-700 border-slate-600 text-slate-100">
                  <SelectValue placeholder="Select organisation…" />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-600">
                  {orgs.map(o => (
                    <SelectItem key={o.id} value={o.id} className="text-slate-200">
                      <span className="flex items-center gap-2">
                        {o.name}
                        <Badge className={`text-xs ${TIER_COLORS[o.subscription_tier] || 'bg-gray-100 text-gray-700'}`}>
                          {o.subscription_tier || 'starter'}
                        </Badge>
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedOrg && (
                <p className="text-xs text-slate-400">
                  Current plan: <span className="font-medium text-slate-300 capitalize">{selectedOrg.subscription_tier || 'starter'}</span>
                  {' · '}Status: <span className="font-medium text-slate-300 capitalize">{selectedOrg.subscription_status || 'active'}</span>
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label className="text-slate-300">Upgrade to *</Label>
              <Select value={form.tier} onValueChange={v => setForm(f => ({ ...f, tier: v }))}>
                <SelectTrigger className="bg-slate-700 border-slate-600 text-slate-100">
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
                  className="bg-slate-700 border-slate-600 text-slate-100"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-slate-300">Billing Period</Label>
                <Select value={form.billing_period} onValueChange={v => setForm(f => ({ ...f, billing_period: v }))}>
                  <SelectTrigger className="bg-slate-700 border-slate-600 text-slate-100">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-600">
                    <SelectItem value="monthly" className="text-slate-200">Monthly</SelectItem>
                    <SelectItem value="annual" className="text-slate-200">Annual</SelectItem>
                    <SelectItem value="custom" className="text-slate-200">Custom</SelectItem>
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
                className="bg-slate-700 border-slate-600 text-slate-100 resize-none"
                rows={2}
              />
            </div>

            <div className="flex gap-3 pt-2">
              <Button
                onClick={handleCreate}
                disabled={creating}
                className="flex-1 bg-emerald-600 hover:bg-emerald-700"
              >
                {creating ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Creating…</> : 'Generate & Send'}
              </Button>
              <Button
                variant="outline"
                onClick={() => setShowCreateDialog(false)}
                className="border-slate-600 text-slate-300"
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
