'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import {
  Loader2, Search, Building2, Users, Eye, Weight, CheckCircle2,
  LogIn, Plus, Mail, Copy, Check, Crown, Ban, PlayCircle, ArrowUpRight, CreditCard,
  ShieldCheck, ShieldAlert, Clock as ClockIcon,
} from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';

// ─── types ────────────────────────────────────────────────────────────────────

interface Organization {
  id: number;
  name: string;
  slug: string;
  subscription_tier: string;
  subscription_status: string;
  logo_url: string | null;
  commodities: string[];
  commodity_types: string[];
  created_at: string;
  user_count: number;
  farm_count: number;
  bag_count: number;
  agent_count: number;
  total_tonnage: number;
  compliance_rate: number;
  approved_farms: number;
}

// ─── constants (defined outside component — no crash risk) ────────────────────

const TIER_ORDER = ['starter', 'basic', 'pro', 'enterprise'] as const;

const TIER_STYLES: Record<string, { label: string; badge: string }> = {
  starter:    { label: 'Starter',    badge: 'bg-slate-700 text-slate-300 border-slate-600' },
  basic:      { label: 'Basic',      badge: 'bg-blue-900/60 text-blue-300 border-blue-700' },
  pro:        { label: 'Pro',        badge: 'bg-purple-900/60 text-purple-300 border-purple-700' },
  enterprise: { label: 'Enterprise', badge: 'bg-amber-900/60 text-amber-300 border-amber-700' },
};

const STATUS_STYLES: Record<string, string> = {
  active:    'bg-green-900/40 text-green-400 border-green-700',
  trial:     'bg-cyan-900/40 text-cyan-400 border-cyan-700',
  suspended: 'bg-red-900/40 text-red-400 border-red-700',
  cancelled: 'bg-slate-700 text-slate-400 border-slate-600',
};

// Safe helpers — no `!` assertions, always fall back
function tierStyle(tier: string | null | undefined) {
  return TIER_STYLES[tier ?? ''] ?? TIER_STYLES.starter;
}
function statusStyle(status: string | null | undefined) {
  return STATUS_STYLES[status ?? ''] ?? STATUS_STYLES.active;
}
function tierIndex(tier: string | null | undefined) {
  return TIER_ORDER.indexOf((tier ?? 'starter') as typeof TIER_ORDER[number]);
}

// ─── component ────────────────────────────────────────────────────────────────

export default function OrganizationsPage() {
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedOrg, setSelectedOrg] = useState<Organization | null>(null);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [impersonating, setImpersonating] = useState<number | null>(null);

  // Create org
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [createResult, setCreateResult] = useState<{
    success: boolean; orgName?: string; adminEmail?: string;
    emailSent?: boolean; tempPassword?: string;
  } | null>(null);
  const [copiedPassword, setCopiedPassword] = useState(false);
  const [newOrg, setNewOrg] = useState({
    orgName: '', adminName: '', adminEmail: '', commodities: '', subscriptionStatus: 'starter',
  });

  // Upgrade tier
  const [upgradeDialogOpen, setUpgradeDialogOpen] = useState(false);
  const [upgradeTarget, setUpgradeTarget] = useState<Organization | null>(null);
  const [newTier, setNewTier] = useState<string>('starter');
  const [isUpgrading, setIsUpgrading] = useState(false);

  // Status
  const [statusDialogOpen, setStatusDialogOpen] = useState(false);
  const [statusTarget, setStatusTarget] = useState<Organization | null>(null);
  const [newStatus, setNewStatus] = useState<string>('active');
  const [isStatusUpdating, setIsStatusUpdating] = useState(false);

  // KYC review
  const [kycDialogOpen, setKycDialogOpen] = useState(false);
  const [kycTarget, setKycTarget] = useState<Organization | null>(null);
  const [kycRecord, setKycRecord] = useState<any>(null);
  const [kycLoading, setKycLoading] = useState(false);
  const [kycNote, setKycNote] = useState('');
  const [isKycReviewing, setIsKycReviewing] = useState(false);

  const { toast } = useToast();

  useEffect(() => { fetchOrganizations(); }, []);

  async function fetchOrganizations() {
    try {
      const res = await fetch('/api/superadmin?resource=organizations');
      if (res.ok) {
        const data = await res.json();
        setOrganizations(data.organizations ?? []);
      }
    } catch (err) {
      console.error('Failed to fetch organizations:', err);
    } finally {
      setIsLoading(false);
    }
  }

  // Impersonation: use window.location for full reload so OrgContext re-reads cookie
  async function handleImpersonate(org: Organization) {
    setImpersonating(org.id);
    try {
      const res = await fetch('/api/impersonate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'start', org_id: org.id }),
      });
      if (res.ok) {
        toast({ title: 'Impersonation Started', description: `Now viewing as ${org.name}.` });
        // Full page reload — OrgContext must re-initialize from the new cookie
        window.location.href = '/app';
      } else {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to start impersonation');
      }
    } catch (err: any) {
      toast({ title: 'Error', description: err.message || 'Failed to access organization dashboard.', variant: 'destructive' });
      setImpersonating(null);
    }
  }

  function openUpgradeDialog(org: Organization) {
    setUpgradeTarget(org);
    setNewTier(org.subscription_tier ?? 'starter');
    setUpgradeDialogOpen(true);
  }

  async function handleUpgradeTier() {
    if (!upgradeTarget) return;
    setIsUpgrading(true);
    try {
      const res = await fetch('/api/superadmin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update_org_status',
          org_id: upgradeTarget.id,
          subscription_tier: newTier,
          current_tier: upgradeTarget.subscription_tier,
        }),
      });
      if (res.ok) {
        toast({ title: 'Tier updated', description: `${upgradeTarget.name} is now on ${newTier}.` });
        setUpgradeDialogOpen(false);
        setUpgradeTarget(null);
        fetchOrganizations();
      } else {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to update tier');
      }
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setIsUpgrading(false);
    }
  }

  function openStatusDialog(org: Organization) {
    setStatusTarget(org);
    setNewStatus(org.subscription_status ?? 'active');
    setStatusDialogOpen(true);
  }

  async function handleStatusUpdate() {
    if (!statusTarget) return;
    setIsStatusUpdating(true);
    try {
      const res = await fetch('/api/superadmin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update_org_status',
          org_id: statusTarget.id,
          subscription_status: newStatus,
          current_status: statusTarget.subscription_status,
        }),
      });
      if (res.ok) {
        toast({ title: 'Status updated', description: `${statusTarget.name} → ${newStatus}` });
        setStatusDialogOpen(false);
        setStatusTarget(null);
        fetchOrganizations();
      } else {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to update status');
      }
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setIsStatusUpdating(false);
    }
  }

  async function openKycDialog(org: Organization) {
    setKycTarget(org);
    setKycRecord(null);
    setKycNote('');
    setKycDialogOpen(true);
    setKycLoading(true);
    try {
      // Fetch KYC record via superadmin endpoint (org_id param)
      const res = await fetch(`/api/superadmin?resource=kyc_record&org_id=${org.id}`);
      if (res.ok) {
        const data = await res.json();
        setKycRecord(data.kyc_record ?? null);
      }
    } catch { /* silent */ }
    finally { setKycLoading(false); }
  }

  async function handleKycDecision(decision: 'approved' | 'rejected') {
    if (!kycTarget) return;
    setIsKycReviewing(true);
    try {
      const res = await fetch(`/api/org/kyc/${kycTarget.id}/review`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ decision, note: kycNote }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error || 'Review failed');
      }
      toast({ title: decision === 'approved' ? 'KYC Approved' : 'KYC Rejected', description: `${kycTarget.name} KYC ${decision}.` });
      setKycDialogOpen(false);
      setKycTarget(null);
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setIsKycReviewing(false);
    }
  }

  async function handleCreateOrg() {
    if (!newOrg.orgName.trim() || !newOrg.adminName.trim() || !newOrg.adminEmail.trim()) {
      toast({ title: 'Missing fields', description: 'Please fill in all required fields.', variant: 'destructive' });
      return;
    }
    setIsCreating(true);
    setCreateResult(null);
    try {
      const res = await fetch('/api/superadmin/create-org', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orgName: newOrg.orgName.trim(),
          adminName: newOrg.adminName.trim(),
          adminEmail: newOrg.adminEmail.trim(),
          commodities: newOrg.commodities ? newOrg.commodities.split(',').map(c => c.trim()).filter(Boolean) : [],
          subscriptionStatus: newOrg.subscriptionStatus,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast({ title: 'Error', description: data.error || 'Failed to create organization', variant: 'destructive' });
        return;
      }
      setCreateResult({ success: true, orgName: newOrg.orgName, adminEmail: newOrg.adminEmail, emailSent: data.emailSent, tempPassword: data.temporaryPassword });
      fetchOrganizations();
      toast({ title: 'Organization Created', description: data.emailSent ? `Email sent to ${newOrg.adminEmail}` : 'Check temporary password below.' });
    } catch {
      toast({ title: 'Error', description: 'Unexpected error.', variant: 'destructive' });
    } finally {
      setIsCreating(false);
    }
  }

  function resetCreateDialog() {
    setNewOrg({ orgName: '', adminName: '', adminEmail: '', commodities: '', subscriptionStatus: 'starter' });
    setCreateResult(null);
    setCopiedPassword(false);
    setCreateDialogOpen(false);
  }

  const filteredOrgs = organizations.filter(org =>
    org.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (org.slug ?? '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  // ─── loading screen ──────────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-cyan-400" />
      </div>
    );
  }

  // ─── main render ─────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white" data-testid="text-page-title">Tenants</h1>
          <p className="text-slate-400">Manage all registered organizations and access their dashboards</p>
        </div>
        <Button
          onClick={() => { setCreateResult(null); setCreateDialogOpen(true); }}
          className="bg-[#2E7D6B] hover:bg-[#1F5F52] shrink-0"
          data-testid="button-create-org"
        >
          <Plus className="h-4 w-4 mr-2" />
          New Organization
        </Button>
      </div>

      {/* Summary strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total',     value: organizations.length, color: 'text-white' },
          { label: 'Active',    value: organizations.filter(o => o.subscription_status === 'active').length,    color: 'text-green-400' },
          { label: 'Trial',     value: organizations.filter(o => o.subscription_status === 'trial').length,     color: 'text-cyan-400' },
          { label: 'Suspended', value: organizations.filter(o => o.subscription_status === 'suspended').length, color: 'text-red-400' },
        ].map(s => (
          <div key={s.label} className="bg-slate-900 border border-slate-700 rounded-lg px-4 py-3">
            <p className="text-xs text-slate-500 uppercase tracking-wide">{s.label}</p>
            <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Table */}
      <Card className="bg-slate-900 border-slate-700">
        <CardHeader>
          <div className="flex flex-col sm:flex-row gap-4 justify-between">
            <div>
              <CardTitle className="text-white">All Organizations</CardTitle>
              <CardDescription className="text-slate-400">{filteredOrgs.length} of {organizations.length} organizations</CardDescription>
            </div>
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search organizations..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="pl-9 bg-slate-800 border-slate-600 text-white placeholder:text-slate-400"
                data-testid="input-search-orgs"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-slate-700">
                  <TableHead className="text-slate-400">Organization</TableHead>
                  <TableHead className="text-slate-400">Tier</TableHead>
                  <TableHead className="text-slate-400">Status</TableHead>
                  <TableHead className="text-slate-400">Agents</TableHead>
                  <TableHead className="text-slate-400">Tonnage</TableHead>
                  <TableHead className="text-slate-400">Compliance</TableHead>
                  <TableHead className="text-slate-400">KYC</TableHead>
                  <TableHead className="text-slate-400">Created</TableHead>
                  <TableHead className="text-slate-400">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredOrgs.map(org => {
                  const ts = tierStyle(org.subscription_tier);
                  const ss = statusStyle(org.subscription_status);
                  const compPct = org.farm_count > 0
                    ? `${Math.round(((org.approved_farms ?? 0) / org.farm_count) * 100)}%`
                    : '—';
                  return (
                    <TableRow key={org.id} className="border-slate-700 hover:bg-slate-800/40" data-testid={`row-org-${org.id}`}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="h-9 w-9 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center shrink-0">
                            <Building2 className="h-4 w-4 text-slate-400" />
                          </div>
                          <div>
                            <div className="font-medium text-white">{org.name}</div>
                            <div className="text-xs text-slate-500">{org.slug || '—'}</div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={`text-xs font-medium capitalize ${ts.badge}`}>{ts.label}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={`text-xs capitalize ${ss}`}>
                          {org.subscription_status || 'active'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-slate-300">
                          <Users className="h-3.5 w-3.5 text-slate-500" />
                          <span className="text-sm">{org.agent_count ?? 0}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-slate-300">
                          <Weight className="h-3.5 w-3.5 text-slate-500" />
                          <span className="text-sm">{((org.total_tonnage ?? 0)).toFixed(1)} t</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-slate-300">
                          <CheckCircle2 className="h-3.5 w-3.5 text-slate-500" />
                          <span className="text-sm">{compPct}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 px-2 text-slate-400 hover:text-white hover:bg-slate-700 text-xs"
                          onClick={() => openKycDialog(org)}
                          data-testid={`button-kyc-${org.id}`}
                        >
                          <ShieldCheck className="h-3.5 w-3.5 mr-1" />Review
                        </Button>
                      </TableCell>
                      <TableCell className="text-slate-400 text-sm">
                        {org.created_at ? new Date(org.created_at).toLocaleDateString('en-GB') : '—'}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5">
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-white hover:bg-slate-700"
                            onClick={() => { setSelectedOrg(org); setDetailDialogOpen(true); }}
                            title="View details" data-testid={`button-view-org-${org.id}`}>
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-cyan-400 hover:bg-cyan-500/10"
                            onClick={() => handleImpersonate(org)} disabled={impersonating === org.id}
                            title="Access dashboard" data-testid={`button-access-org-${org.id}`}>
                            {impersonating === org.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogIn className="h-4 w-4" />}
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-amber-400 hover:bg-amber-500/10"
                            onClick={() => openUpgradeDialog(org)} title="Change subscription tier"
                            data-testid={`button-upgrade-org-${org.id}`}>
                            <Crown className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon"
                            className={`h-8 w-8 ${org.subscription_status === 'suspended' ? 'text-slate-400 hover:text-green-400 hover:bg-green-500/10' : 'text-slate-400 hover:text-red-400 hover:bg-red-500/10'}`}
                            onClick={() => openStatusDialog(org)}
                            title={org.subscription_status === 'suspended' ? 'Reactivate org' : 'Manage status'}
                            data-testid={`button-status-org-${org.id}`}>
                            {org.subscription_status === 'suspended' ? <PlayCircle className="h-4 w-4" /> : <Ban className="h-4 w-4" />}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {filteredOrgs.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-12 text-slate-500">
                      {searchQuery ? `No organizations matching "${searchQuery}"` : 'No organizations found'}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* ── Detail dialog ── */}
      <Dialog open={detailDialogOpen} onOpenChange={open => { setDetailDialogOpen(open); if (!open) setSelectedOrg(null); }}>
        <DialogContent className="bg-slate-900 border-slate-700 text-white sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-white">{selectedOrg?.name ?? 'Organization'}</DialogTitle>
            <DialogDescription className="text-slate-400">Organization details and metrics</DialogDescription>
          </DialogHeader>
          {selectedOrg && (
            <div className="space-y-5">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-slate-500 mb-0.5">Slug</p>
                  <p className="text-slate-200 font-mono">{selectedOrg.slug || '—'}</p>
                </div>
                <div>
                  <p className="text-slate-500 mb-0.5">Created</p>
                  <p className="text-slate-200">{selectedOrg.created_at ? new Date(selectedOrg.created_at).toLocaleDateString('en-GB') : '—'}</p>
                </div>
                <div>
                  <p className="text-slate-500 mb-1">Tier</p>
                  <Badge variant="outline" className={`capitalize ${tierStyle(selectedOrg.subscription_tier).badge}`}>
                    {tierStyle(selectedOrg.subscription_tier).label}
                  </Badge>
                </div>
                <div>
                  <p className="text-slate-500 mb-1">Status</p>
                  <Badge variant="outline" className={`capitalize ${statusStyle(selectedOrg.subscription_status)}`}>
                    {selectedOrg.subscription_status || 'active'}
                  </Badge>
                </div>
                <div className="col-span-2">
                  <p className="text-slate-500 mb-0.5">Commodities</p>
                  <p className="text-slate-200">
                    {(selectedOrg.commodity_types ?? selectedOrg.commodities ?? []).join(', ') || 'None'}
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-4 gap-3 pt-4 border-t border-slate-700">
                {[
                  { label: 'Users',  value: selectedOrg.user_count  ?? 0 },
                  { label: 'Agents', value: selectedOrg.agent_count ?? 0 },
                  { label: 'Farms',  value: selectedOrg.farm_count  ?? 0 },
                  { label: 'Bags',   value: selectedOrg.bag_count   ?? 0 },
                ].map(m => (
                  <div key={m.label} className="text-center p-3 rounded-lg bg-slate-800 border border-slate-700">
                    <div className="text-xl font-bold text-white">{m.value}</div>
                    <div className="text-xs text-slate-500 mt-0.5">{m.label}</div>
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-3 pt-2">
                <Button variant="outline" className="border-amber-700 text-amber-400 hover:bg-amber-500/10"
                  onClick={() => { setDetailDialogOpen(false); openUpgradeDialog(selectedOrg); }}>
                  <Crown className="h-4 w-4 mr-2" />Change Tier
                </Button>
                <Link href={`/superadmin/billing?org_id=${selectedOrg.id}`}
                  className="inline-flex items-center justify-center gap-2 rounded-md border border-slate-600 text-slate-300 hover:bg-slate-800 px-4 py-2 text-sm font-medium transition-colors"
                  onClick={() => setDetailDialogOpen(false)}>
                  <CreditCard className="h-4 w-4" />Payment Link
                </Link>
              </div>
              <Button className="w-full bg-cyan-600 hover:bg-cyan-700"
                onClick={() => { setDetailDialogOpen(false); handleImpersonate(selectedOrg); }}
                disabled={impersonating === selectedOrg.id}>
                {impersonating === selectedOrg.id ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <LogIn className="h-4 w-4 mr-2" />}
                Access Dashboard as Admin
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ── Upgrade Tier dialog ── */}
      <Dialog open={upgradeDialogOpen} onOpenChange={open => { setUpgradeDialogOpen(open); if (!open) setUpgradeTarget(null); }}>
        <DialogContent className="bg-slate-900 border-slate-700 text-white sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <Crown className="h-5 w-5 text-amber-400" />Change Subscription Tier
            </DialogTitle>
            <DialogDescription className="text-slate-400">
              Instantly changes the plan for <span className="text-slate-200 font-medium">{upgradeTarget?.name ?? '…'}</span>.
              Does not generate a payment link.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <p className="text-xs text-slate-500 mb-1">Current tier</p>
              <Badge variant="outline" className={`capitalize ${tierStyle(upgradeTarget?.subscription_tier).badge}`}>
                {tierStyle(upgradeTarget?.subscription_tier).label}
              </Badge>
            </div>
            <div className="space-y-1.5">
              <Label className="text-slate-300">New tier</Label>
              <Select value={newTier} onValueChange={setNewTier}>
                <SelectTrigger className="bg-slate-800 border-slate-600 text-white" data-testid="select-new-tier">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-600">
                  {TIER_ORDER.map(t => {
                    const currentIdx = tierIndex(upgradeTarget?.subscription_tier);
                    const thisIdx    = TIER_ORDER.indexOf(t);
                    return (
                      <SelectItem key={t} value={t}
                        className={`capitalize ${t === (upgradeTarget?.subscription_tier ?? 'starter') ? 'opacity-50' : ''}`}>
                        <span className="flex items-center gap-2">
                          {TIER_STYLES[t].label}
                          {currentIdx < thisIdx && <ArrowUpRight className="h-3 w-3 text-green-400" />}
                        </span>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
            {newTier !== (upgradeTarget?.subscription_tier ?? 'starter') && (
              <div className="rounded-lg bg-amber-950/30 border border-amber-800/50 p-3 text-xs text-amber-300">
                This will immediately change feature access. Use Billing to generate a payment link if payment is required.
              </div>
            )}
          </div>
          <DialogFooter className="gap-2">
            <Button variant="ghost" className="text-slate-400" onClick={() => setUpgradeDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleUpgradeTier}
              disabled={isUpgrading || newTier === (upgradeTarget?.subscription_tier ?? 'starter')}
              className="bg-amber-600 hover:bg-amber-700" data-testid="button-confirm-upgrade">
              {isUpgrading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Crown className="h-4 w-4 mr-2" />}
              Confirm Change
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Status dialog ── */}
      <Dialog open={statusDialogOpen} onOpenChange={open => { setStatusDialogOpen(open); if (!open) setStatusTarget(null); }}>
        <DialogContent className="bg-slate-900 border-slate-700 text-white sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-white">Manage Organization Status</DialogTitle>
            <DialogDescription className="text-slate-400">
              Update status for <span className="text-slate-200 font-medium">{statusTarget?.name ?? '…'}</span>.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <p className="text-xs text-slate-500 mb-1">Current status</p>
              <Badge variant="outline" className={`capitalize ${statusStyle(statusTarget?.subscription_status)}`}>
                {statusTarget?.subscription_status || 'active'}
              </Badge>
            </div>
            <div className="space-y-1.5">
              <Label className="text-slate-300">New status</Label>
              <Select value={newStatus} onValueChange={setNewStatus}>
                <SelectTrigger className="bg-slate-800 border-slate-600 text-white" data-testid="select-new-status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-600">
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="trial">Trial</SelectItem>
                  <SelectItem value="suspended">Suspended</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {newStatus === 'suspended' && (
              <div className="rounded-lg bg-red-950/30 border border-red-800/50 p-3 text-xs text-red-300">
                Suspending will block all users in this organization from accessing the platform.
              </div>
            )}
          </div>
          <DialogFooter className="gap-2">
            <Button variant="ghost" className="text-slate-400" onClick={() => setStatusDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleStatusUpdate}
              disabled={isStatusUpdating || newStatus === (statusTarget?.subscription_status ?? 'active')}
              className={newStatus === 'suspended' ? 'bg-red-700 hover:bg-red-800' : 'bg-[#2E7D6B] hover:bg-[#1F5F52]'}
              data-testid="button-confirm-status">
              {isStatusUpdating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Update Status
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Create Org dialog ── */}
      <Dialog open={createDialogOpen} onOpenChange={open => { if (!open) resetCreateDialog(); }}>
        <DialogContent className="bg-slate-900 border-slate-700 text-white sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-white">
              {createResult?.success ? 'Organization Created' : 'Create New Organization'}
            </DialogTitle>
            <DialogDescription className="text-slate-400">
              {createResult?.success
                ? 'The organization and admin account have been set up.'
                : 'Set up a new organization and admin account.'}
            </DialogDescription>
          </DialogHeader>

          {createResult?.success ? (
            <div className="space-y-4">
              <div className="rounded-lg bg-green-950/30 border border-green-800/50 p-4 space-y-2">
                <div className="flex items-center gap-2 text-green-400">
                  <Check className="h-5 w-5" />
                  <span className="font-medium">{createResult.orgName} created</span>
                </div>
                <p className="text-sm text-green-500">Admin: {createResult.adminEmail}</p>
              </div>
              {createResult.emailSent ? (
                <div className="rounded-lg bg-blue-950/30 border border-blue-800/50 p-4">
                  <div className="flex items-center gap-2 text-blue-400">
                    <Mail className="h-4 w-4" />
                    <span className="text-sm font-medium">Welcome email sent successfully</span>
                  </div>
                </div>
              ) : createResult.tempPassword ? (
                <div className="rounded-lg border border-slate-700 bg-slate-800 p-4 space-y-3">
                  <p className="text-sm text-amber-300 font-medium">Email failed — share manually:</p>
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="text-xs text-slate-500">Email</p>
                      <p className="text-sm font-medium text-slate-200">{createResult.adminEmail}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">Temporary Password</p>
                      <p className="text-sm font-mono text-cyan-300">{createResult.tempPassword}</p>
                    </div>
                    <Button variant="outline" size="sm" className="border-slate-600 text-slate-300"
                      onClick={() => { navigator.clipboard.writeText(createResult.tempPassword!); setCopiedPassword(true); setTimeout(() => setCopiedPassword(false), 2000); }}>
                      {copiedPassword ? <Check className="h-3 w-3 mr-1 text-green-400" /> : <Copy className="h-3 w-3 mr-1" />}
                      {copiedPassword ? 'Copied' : 'Copy'}
                    </Button>
                  </div>
                </div>
              ) : null}
              <Button onClick={resetCreateDialog} className="w-full bg-[#2E7D6B] hover:bg-[#1F5F52]">Done</Button>
            </div>
          ) : (
            <div className="space-y-4">
              {[
                { id: 'name', label: 'Organization Name *', placeholder: 'e.g. Sunshine Cocoa Exports', key: 'orgName' as const },
                { id: 'admin-name', label: 'Admin Full Name *', placeholder: 'e.g. Adebayo Ogundimu', key: 'adminName' as const },
                { id: 'admin-email', label: 'Admin Email *', placeholder: 'admin@example.com', key: 'adminEmail' as const },
                { id: 'commodities', label: 'Commodities (comma-separated)', placeholder: 'e.g. Cocoa, Cashew', key: 'commodities' as const },
              ].map(f => (
                <div key={f.id} className="space-y-2">
                  <Label className="text-slate-300">{f.label}</Label>
                  <Input placeholder={f.placeholder} value={newOrg[f.key]}
                    onChange={e => setNewOrg(p => ({ ...p, [f.key]: e.target.value }))}
                    className="bg-slate-800 border-slate-600 text-white placeholder:text-slate-500" />
                </div>
              ))}
              <div className="space-y-2">
                <Label className="text-slate-300">Starting Tier</Label>
                <Select value={newOrg.subscriptionStatus} onValueChange={v => setNewOrg(p => ({ ...p, subscriptionStatus: v }))}>
                  <SelectTrigger className="bg-slate-800 border-slate-600 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-600">
                    {TIER_ORDER.map(t => <SelectItem key={t} value={t} className="capitalize">{TIER_STYLES[t].label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={handleCreateOrg}
                disabled={isCreating || !newOrg.orgName.trim() || !newOrg.adminName.trim() || !newOrg.adminEmail.trim()}
                className="w-full bg-[#2E7D6B] hover:bg-[#1F5F52]">
                {isCreating ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Creating…</> : <><Building2 className="h-4 w-4 mr-2" />Create Organization & Send Email</>}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
      {/* ── KYC Review Dialog ── */}
      <Dialog open={kycDialogOpen} onOpenChange={open => { setKycDialogOpen(open); if (!open) setKycTarget(null); }}>
        <DialogContent className="bg-slate-900 border-slate-700 text-white sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-emerald-400" />
              KYC Review — {kycTarget?.name}
            </DialogTitle>
            <DialogDescription className="text-slate-400">
              Review the organization's KYC submission and approve or reject.
            </DialogDescription>
          </DialogHeader>
          {kycLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
            </div>
          ) : kycRecord ? (
            <div className="space-y-4 py-2">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-slate-500 mb-0.5">Business Name</p>
                  <p className="text-slate-200 font-medium">{kycRecord.business_name || '—'}</p>
                </div>
                <div>
                  <p className="text-slate-500 mb-0.5">RC Number</p>
                  <p className="text-slate-200 font-mono">{kycRecord.rc_number || '—'}</p>
                </div>
                <div>
                  <p className="text-slate-500 mb-0.5">TIN</p>
                  <p className="text-slate-200 font-mono">{kycRecord.tin || '—'}</p>
                </div>
                <div>
                  <p className="text-slate-500 mb-0.5">Current Status</p>
                  <Badge
                    variant="outline"
                    className={
                      kycRecord.kyc_status === 'approved' ? 'border-emerald-700 text-emerald-400' :
                      kycRecord.kyc_status === 'rejected' ? 'border-red-700 text-red-400' :
                      kycRecord.kyc_status === 'under_review' ? 'border-amber-700 text-amber-400' :
                      'border-slate-600 text-slate-400'
                    }
                  >
                    {kycRecord.kyc_status || 'not_submitted'}
                  </Badge>
                </div>
                {kycRecord.director_name && (
                  <div className="col-span-2">
                    <p className="text-slate-500 mb-0.5">Director</p>
                    <p className="text-slate-200">{kycRecord.director_name}</p>
                  </div>
                )}
                {kycRecord.bank_account_name && (
                  <div className="col-span-2">
                    <p className="text-slate-500 mb-0.5">Bank Account</p>
                    <p className="text-slate-200">{kycRecord.bank_account_name} · {kycRecord.bank_account_number} ({kycRecord.bank_name})</p>
                  </div>
                )}
              </div>
              <div className="space-y-1.5">
                <Label className="text-slate-300 text-sm">Review Note (optional)</Label>
                <Textarea
                  value={kycNote}
                  onChange={e => setKycNote(e.target.value)}
                  placeholder="Reason for approval or rejection…"
                  className="bg-slate-800 border-slate-600 text-white placeholder:text-slate-500 resize-none"
                  rows={2}
                />
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-slate-400">
              <ShieldAlert className="h-10 w-10 mx-auto mb-3 opacity-40" />
              <p className="text-sm">No KYC record submitted for this organization.</p>
            </div>
          )}
          {kycRecord && (
            <DialogFooter className="gap-2 sm:gap-2">
              <Button
                variant="outline"
                className="border-red-700 text-red-400 hover:bg-red-500/10 flex-1"
                onClick={() => handleKycDecision('rejected')}
                disabled={isKycReviewing}
                data-testid="button-kyc-reject"
              >
                {isKycReviewing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <ShieldAlert className="h-4 w-4 mr-2" />}
                Reject
              </Button>
              <Button
                className="bg-emerald-700 hover:bg-emerald-600 flex-1"
                onClick={() => handleKycDecision('approved')}
                disabled={isKycReviewing}
                data-testid="button-kyc-approve"
              >
                {isKycReviewing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <ShieldCheck className="h-4 w-4 mr-2" />}
                Approve
              </Button>
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>

    </div>
  );
}
