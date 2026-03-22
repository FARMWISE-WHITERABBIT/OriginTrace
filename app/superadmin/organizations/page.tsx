'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import {
  Loader2, Search, Building2, Users, Eye, Weight, CheckCircle2,
  LogIn, Plus, Mail, Copy, Check, Crown, Ban, PlayCircle, ArrowUpRight, CreditCard
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useOrg } from '@/lib/contexts/org-context';
import { StatusBadge } from '@/lib/status-badge';
import Link from 'next/link';

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

const TIER_ORDER = ['starter', 'basic', 'pro', 'enterprise'];

const TIER_STYLES: Record<string, { label: string; badge: string }> = {
  starter: { label: 'Starter', badge: 'bg-slate-700 text-slate-300 border-slate-600' },
  basic:   { label: 'Basic',   badge: 'bg-blue-900/60 text-blue-300 border-blue-700' },
  pro:     { label: 'Pro',     badge: 'bg-purple-900/60 text-purple-300 border-purple-700' },
  enterprise: { label: 'Enterprise', badge: 'bg-amber-900/60 text-amber-300 border-amber-700' },
};

const STATUS_STYLES: Record<string, string> = {
  active:    'bg-green-900/40 text-green-400 border-green-700',
  trial:     'bg-cyan-900/40 text-cyan-400 border-cyan-700',
  suspended: 'bg-red-900/40 text-red-400 border-red-700',
  cancelled: 'bg-slate-700 text-slate-400 border-slate-600',
};

export default function OrganizationsPage() {
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedOrg, setSelectedOrg] = useState<Organization | null>(null);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [impersonating, setImpersonating] = useState<number | null>(null);

  // Create org dialog
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [createResult, setCreateResult] = useState<{
    success: boolean;
    orgName?: string;
    adminEmail?: string;
    emailSent?: boolean;
    tempPassword?: string;
  } | null>(null);
  const [copiedPassword, setCopiedPassword] = useState(false);
  const [newOrg, setNewOrg] = useState({
    orgName: '',
    adminName: '',
    adminEmail: '',
    commodities: '',
    subscriptionStatus: 'starter',
  });

  // Upgrade tier dialog
  const [upgradeDialogOpen, setUpgradeDialogOpen] = useState(false);
  const [upgradeTarget, setUpgradeTarget] = useState<Organization | null>(null);
  const [newTier, setNewTier] = useState('');
  const [isUpgrading, setIsUpgrading] = useState(false);

  // Status toggle dialog
  const [statusDialogOpen, setStatusDialogOpen] = useState(false);
  const [statusTarget, setStatusTarget] = useState<Organization | null>(null);
  const [newStatus, setNewStatus] = useState('');
  const [isStatusUpdating, setIsStatusUpdating] = useState(false);

  const { toast } = useToast();
  const router = useRouter();
  const { startImpersonation } = useOrg();

  useEffect(() => {
    fetchOrganizations();
  }, []);

  async function fetchOrganizations() {
    try {
      const response = await fetch('/api/superadmin?resource=organizations');
      if (response.ok) {
        const data = await response.json();
        setOrganizations(data.organizations || []);
      }
    } catch (error) {
      console.error('Failed to fetch organizations:', error);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleImpersonate(org: Organization) {
    setImpersonating(org.id);
    try {
      const success = await startImpersonation(org.id);
      if (success) {
        toast({ title: 'Impersonation Started', description: `Now viewing as ${org.name}.` });
        router.push('/app');
      } else {
        throw new Error('Failed to start impersonation');
      }
    } catch {
      toast({ title: 'Error', description: 'Failed to access organization dashboard.', variant: 'destructive' });
    } finally {
      setImpersonating(null);
    }
  }

  function openUpgradeDialog(org: Organization) {
    setUpgradeTarget(org);
    setNewTier(org.subscription_tier || 'starter');
    setUpgradeDialogOpen(true);
  }

  async function handleUpgradeTier() {
    if (!upgradeTarget || !newTier) return;
    setIsUpgrading(true);
    try {
      const response = await fetch('/api/superadmin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update_org_status',
          org_id: upgradeTarget.id,
          subscription_tier: newTier,
          current_tier: upgradeTarget.subscription_tier,
        }),
      });

      if (response.ok) {
        toast({ title: 'Tier updated', description: `${upgradeTarget.name} is now on the ${newTier} plan.` });
        setUpgradeDialogOpen(false);
        fetchOrganizations();
      } else {
        const data = await response.json();
        throw new Error(data.error || 'Failed to update tier');
      }
    } catch (err: any) {
      toast({ title: 'Error', description: err.message || 'Failed to update tier.', variant: 'destructive' });
    } finally {
      setIsUpgrading(false);
    }
  }

  function openStatusDialog(org: Organization) {
    setStatusTarget(org);
    setNewStatus(org.subscription_status || 'active');
    setStatusDialogOpen(true);
  }

  async function handleStatusUpdate() {
    if (!statusTarget || !newStatus) return;
    setIsStatusUpdating(true);
    try {
      const response = await fetch('/api/superadmin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update_org_status',
          org_id: statusTarget.id,
          subscription_status: newStatus,
          current_status: statusTarget.subscription_status,
        }),
      });

      if (response.ok) {
        toast({ title: 'Status updated', description: `${statusTarget.name} status set to ${newStatus}.` });
        setStatusDialogOpen(false);
        fetchOrganizations();
      } else {
        const data = await response.json();
        throw new Error(data.error || 'Failed to update status');
      }
    } catch (err: any) {
      toast({ title: 'Error', description: err.message || 'Failed to update status.', variant: 'destructive' });
    } finally {
      setIsStatusUpdating(false);
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
      const response = await fetch('/api/superadmin/create-org', {
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

      const data = await response.json();

      if (!response.ok) {
        toast({ title: 'Error', description: data.error || 'Failed to create organization', variant: 'destructive' });
        return;
      }

      setCreateResult({
        success: true,
        orgName: newOrg.orgName,
        adminEmail: newOrg.adminEmail,
        emailSent: data.emailSent,
        tempPassword: data.temporaryPassword,
      });

      fetchOrganizations();

      if (data.emailSent) {
        toast({ title: 'Organization Created', description: `Welcome email sent to ${newOrg.adminEmail}` });
      } else {
        toast({ title: 'Organization Created', description: 'Email could not be sent. Temporary password shown below.', variant: 'destructive' });
      }
    } catch {
      toast({ title: 'Error', description: 'An unexpected error occurred.', variant: 'destructive' });
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
    (org.slug && org.slug.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-cyan-400" />
      </div>
    );
  }

  const tierInfo = (tier: string) => TIER_STYLES[tier] || TIER_STYLES.starter;
  const currentTierIndex = (org: Organization) => TIER_ORDER.indexOf(org.subscription_tier || 'starter');

  return (
    <div className="space-y-6">
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
          { label: 'Total', value: organizations.length, color: 'text-white' },
          { label: 'Active', value: organizations.filter(o => o.subscription_status === 'active').length, color: 'text-green-400' },
          { label: 'Trial', value: organizations.filter(o => o.subscription_status === 'trial').length, color: 'text-cyan-400' },
          { label: 'Suspended', value: organizations.filter(o => o.subscription_status === 'suspended').length, color: 'text-red-400' },
        ].map(s => (
          <div key={s.label} className="bg-slate-900 border border-slate-700 rounded-lg px-4 py-3">
            <p className="text-xs text-slate-500 uppercase tracking-wide">{s.label}</p>
            <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

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
                onChange={(e) => setSearchQuery(e.target.value)}
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
                  <TableHead className="text-slate-400">Created</TableHead>
                  <TableHead className="text-slate-400">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredOrgs.map((org) => {
                  const tier = tierInfo(org.subscription_tier);
                  const statusStyle = STATUS_STYLES[org.subscription_status] || STATUS_STYLES.active;
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
                        <Badge variant="outline" className={`text-xs font-medium capitalize ${tier.badge}`}>
                          {tier.label}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={`text-xs capitalize ${statusStyle}`}>
                          {org.subscription_status || 'active'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-slate-300">
                          <Users className="h-3.5 w-3.5 text-slate-500" />
                          <span className="text-sm">{org.agent_count || 0}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-slate-300">
                          <Weight className="h-3.5 w-3.5 text-slate-500" />
                          <span className="text-sm">{(org.total_tonnage || 0).toFixed(1)} t</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-slate-300">
                          <CheckCircle2 className="h-3.5 w-3.5 text-slate-500" />
                          <span className="text-sm">
                            {org.farm_count > 0
                              ? `${Math.round((org.approved_farms || 0) / org.farm_count * 100)}%`
                              : '—'}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-slate-400 text-sm">
                        {new Date(org.created_at).toLocaleDateString('en-GB')}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5">
                          {/* View details */}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-slate-400 hover:text-white hover:bg-slate-700"
                            onClick={() => { setSelectedOrg(org); setDetailDialogOpen(true); }}
                            title="View details"
                            data-testid={`button-view-org-${org.id}`}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>

                          {/* Access dashboard */}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-slate-400 hover:text-cyan-400 hover:bg-cyan-500/10"
                            onClick={() => handleImpersonate(org)}
                            disabled={impersonating === org.id}
                            title="Access dashboard"
                            data-testid={`button-access-org-${org.id}`}
                          >
                            {impersonating === org.id
                              ? <Loader2 className="h-4 w-4 animate-spin" />
                              : <LogIn className="h-4 w-4" />}
                          </Button>

                          {/* Upgrade tier */}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-slate-400 hover:text-amber-400 hover:bg-amber-500/10"
                            onClick={() => openUpgradeDialog(org)}
                            title="Change subscription tier"
                            data-testid={`button-upgrade-org-${org.id}`}
                          >
                            <Crown className="h-4 w-4" />
                          </Button>

                          {/* Toggle status */}
                          <Button
                            variant="ghost"
                            size="icon"
                            className={`h-8 w-8 ${
                              org.subscription_status === 'suspended'
                                ? 'text-slate-400 hover:text-green-400 hover:bg-green-500/10'
                                : 'text-slate-400 hover:text-red-400 hover:bg-red-500/10'
                            }`}
                            onClick={() => openStatusDialog(org)}
                            title={org.subscription_status === 'suspended' ? 'Reactivate org' : 'Manage status'}
                            data-testid={`button-status-org-${org.id}`}
                          >
                            {org.subscription_status === 'suspended'
                              ? <PlayCircle className="h-4 w-4" />
                              : <Ban className="h-4 w-4" />}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {filteredOrgs.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-12 text-slate-500">
                      No organizations found matching &ldquo;{searchQuery}&rdquo;
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Detail dialog */}
      <Dialog open={detailDialogOpen} onOpenChange={setDetailDialogOpen}>
        <DialogContent className="bg-slate-900 border-slate-700 text-white sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-white">{selectedOrg?.name}</DialogTitle>
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
                  <p className="text-slate-200">{new Date(selectedOrg.created_at).toLocaleDateString('en-GB')}</p>
                </div>
                <div>
                  <p className="text-slate-500 mb-1">Tier</p>
                  <Badge variant="outline" className={`capitalize ${tierInfo(selectedOrg.subscription_tier).badge}`}>
                    {tierInfo(selectedOrg.subscription_tier).label}
                  </Badge>
                </div>
                <div>
                  <p className="text-slate-500 mb-1">Status</p>
                  <Badge variant="outline" className={`capitalize ${STATUS_STYLES[selectedOrg.subscription_status] || STATUS_STYLES.active}`}>
                    {selectedOrg.subscription_status || 'active'}
                  </Badge>
                </div>
                <div className="col-span-2">
                  <p className="text-slate-500 mb-0.5">Commodities</p>
                  <p className="text-slate-200">
                    {selectedOrg.commodity_types?.join(', ') || selectedOrg.commodities?.join(', ') || 'None'}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-4 gap-3 pt-4 border-t border-slate-700">
                {[
                  { label: 'Users', value: selectedOrg.user_count },
                  { label: 'Agents', value: selectedOrg.agent_count },
                  { label: 'Farms', value: selectedOrg.farm_count },
                  { label: 'Bags', value: selectedOrg.bag_count },
                ].map(m => (
                  <div key={m.label} className="text-center p-3 rounded-lg bg-slate-800 border border-slate-700">
                    <div className="text-xl font-bold text-white">{m.value}</div>
                    <div className="text-xs text-slate-500 mt-0.5">{m.label}</div>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2">
                <Button
                  variant="outline"
                  className="border-amber-700 text-amber-400 hover:bg-amber-500/10"
                  onClick={() => {
                    setDetailDialogOpen(false);
                    openUpgradeDialog(selectedOrg);
                  }}
                >
                  <Crown className="h-4 w-4 mr-2" />
                  Change Tier
                </Button>
                <Link
                  href={`/superadmin/billing?org_id=${selectedOrg.id}`}
                  className="inline-flex items-center justify-center gap-2 rounded-md border border-slate-600 text-slate-300 hover:bg-slate-800 px-4 py-2 text-sm font-medium transition-colors"
                >
                  <CreditCard className="h-4 w-4" />
                  Payment Link
                </Link>
              </div>

              <Button
                className="w-full bg-cyan-600 hover:bg-cyan-700"
                onClick={() => { setDetailDialogOpen(false); handleImpersonate(selectedOrg); }}
                disabled={impersonating === selectedOrg.id}
              >
                {impersonating === selectedOrg.id
                  ? <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  : <LogIn className="h-4 w-4 mr-2" />}
                Access Dashboard as Admin
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Upgrade Tier dialog */}
      <Dialog open={upgradeDialogOpen} onOpenChange={setUpgradeDialogOpen}>
        <DialogContent className="bg-slate-900 border-slate-700 text-white sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <Crown className="h-5 w-5 text-amber-400" />
              Change Subscription Tier
            </DialogTitle>
            <DialogDescription className="text-slate-400">
              Instantly changes the plan for <span className="text-slate-200 font-medium">{upgradeTarget?.name}</span>.
              This does not generate a payment link.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div>
              <p className="text-xs text-slate-500 mb-1">Current tier</p>
              <Badge variant="outline" className={`capitalize ${tierInfo(upgradeTarget?.subscription_tier || 'starter').badge}`}>
                {tierInfo(upgradeTarget?.subscription_tier || 'starter').label}
              </Badge>
            </div>
            <div className="space-y-1.5">
              <Label className="text-slate-300">New tier</Label>
              <Select value={newTier} onValueChange={setNewTier}>
                <SelectTrigger className="bg-slate-800 border-slate-600 text-white" data-testid="select-new-tier">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-600">
                  {TIER_ORDER.map(t => (
                    <SelectItem
                      key={t}
                      value={t}
                      className={`capitalize ${t === (upgradeTarget?.subscription_tier || 'starter') ? 'opacity-50' : ''}`}
                    >
                      <span className="flex items-center gap-2">
                        {TIER_STYLES[t].label}
                        {currentTierIndex(upgradeTarget!) < TIER_ORDER.indexOf(t) && (
                          <ArrowUpRight className="h-3 w-3 text-green-400" />
                        )}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {newTier !== (upgradeTarget?.subscription_tier || 'starter') && (
              <div className="rounded-lg bg-amber-950/30 border border-amber-800/50 p-3 text-xs text-amber-300">
                This will immediately change the org&apos;s feature access. Use Billing to generate a payment link if payment is required.
              </div>
            )}
          </div>

          <DialogFooter className="gap-2">
            <Button variant="ghost" className="text-slate-400" onClick={() => setUpgradeDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleUpgradeTier}
              disabled={isUpgrading || newTier === (upgradeTarget?.subscription_tier || 'starter')}
              className="bg-amber-600 hover:bg-amber-700"
              data-testid="button-confirm-upgrade"
            >
              {isUpgrading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Crown className="h-4 w-4 mr-2" />}
              Confirm Change
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Status dialog */}
      <Dialog open={statusDialogOpen} onOpenChange={setStatusDialogOpen}>
        <DialogContent className="bg-slate-900 border-slate-700 text-white sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-white">Manage Organization Status</DialogTitle>
            <DialogDescription className="text-slate-400">
              Update the billing/access status for <span className="text-slate-200 font-medium">{statusTarget?.name}</span>.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div>
              <p className="text-xs text-slate-500 mb-1">Current status</p>
              <Badge variant="outline" className={`capitalize ${STATUS_STYLES[statusTarget?.subscription_status || 'active'] || STATUS_STYLES.active}`}>
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
            <Button variant="ghost" className="text-slate-400" onClick={() => setStatusDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleStatusUpdate}
              disabled={isStatusUpdating || newStatus === (statusTarget?.subscription_status || 'active')}
              className={newStatus === 'suspended' ? 'bg-red-700 hover:bg-red-800' : 'bg-[#2E7D6B] hover:bg-[#1F5F52]'}
              data-testid="button-confirm-status"
            >
              {isStatusUpdating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Update Status
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Org dialog */}
      <Dialog open={createDialogOpen} onOpenChange={(open) => { if (!open) resetCreateDialog(); else setCreateDialogOpen(true); }}>
        <DialogContent className="bg-slate-900 border-slate-700 text-white sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-white">
              {createResult?.success ? 'Organization Created' : 'Create New Organization'}
            </DialogTitle>
            <DialogDescription className="text-slate-400">
              {createResult?.success
                ? 'The organization and admin account have been set up.'
                : 'Set up a new organization and its admin account. The admin will receive login credentials via email.'}
            </DialogDescription>
          </DialogHeader>

          {createResult?.success ? (
            <div className="space-y-4">
              <div className="rounded-lg bg-green-950/30 border border-green-800/50 p-4 space-y-2">
                <div className="flex items-center gap-2 text-green-400">
                  <Check className="h-5 w-5" />
                  <span className="font-medium">{createResult.orgName} created successfully</span>
                </div>
                <p className="text-sm text-green-500">Admin: {createResult.adminEmail}</p>
              </div>

              {createResult.emailSent ? (
                <div className="rounded-lg bg-blue-950/30 border border-blue-800/50 p-4">
                  <div className="flex items-center gap-2 text-blue-400">
                    <Mail className="h-4 w-4" />
                    <span className="text-sm font-medium">Welcome email sent successfully</span>
                  </div>
                  <p className="text-xs text-blue-500 mt-1">Login details sent to {createResult.adminEmail}</p>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="rounded-lg bg-amber-950/30 border border-amber-800/50 p-4">
                    <p className="text-sm text-amber-300 font-medium">Email failed. Share these credentials manually:</p>
                  </div>
                  {createResult.tempPassword && (
                    <div className="rounded-lg border border-slate-700 bg-slate-800 p-4 space-y-2">
                      <div className="flex items-center justify-between gap-4 flex-wrap">
                        <div>
                          <p className="text-xs text-slate-500">Email</p>
                          <p className="text-sm font-medium" data-testid="text-created-email">{createResult.adminEmail}</p>
                        </div>
                        <div>
                          <p className="text-xs text-slate-500">Temporary Password</p>
                          <p className="text-sm font-mono font-medium text-cyan-300" data-testid="text-temp-password">{createResult.tempPassword}</p>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          className="border-slate-600 text-slate-300"
                          data-testid="button-copy-password"
                          onClick={() => {
                            navigator.clipboard.writeText(createResult.tempPassword!);
                            setCopiedPassword(true);
                            setTimeout(() => setCopiedPassword(false), 2000);
                          }}
                        >
                          {copiedPassword ? <Check className="h-3 w-3 mr-1 text-green-400" /> : <Copy className="h-3 w-3 mr-1" />}
                          {copiedPassword ? 'Copied' : 'Copy'}
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              <Button onClick={resetCreateDialog} className="w-full bg-[#2E7D6B] hover:bg-[#1F5F52]" data-testid="button-close-create-result">
                Done
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="create-org-name" className="text-slate-300">Organization Name *</Label>
                <Input
                  id="create-org-name"
                  data-testid="input-create-org-name"
                  placeholder="e.g. Sunshine Cocoa Exports"
                  value={newOrg.orgName}
                  onChange={(e) => setNewOrg(prev => ({ ...prev, orgName: e.target.value }))}
                  className="bg-slate-800 border-slate-600 text-white placeholder:text-slate-500"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="create-admin-name" className="text-slate-300">Admin Full Name *</Label>
                <Input
                  id="create-admin-name"
                  data-testid="input-create-admin-name"
                  placeholder="e.g. Adebayo Ogundimu"
                  value={newOrg.adminName}
                  onChange={(e) => setNewOrg(prev => ({ ...prev, adminName: e.target.value }))}
                  className="bg-slate-800 border-slate-600 text-white placeholder:text-slate-500"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="create-admin-email" className="text-slate-300">Admin Email *</Label>
                <Input
                  id="create-admin-email"
                  data-testid="input-create-admin-email"
                  type="email"
                  placeholder="e.g. admin@sunshinecocoa.com"
                  value={newOrg.adminEmail}
                  onChange={(e) => setNewOrg(prev => ({ ...prev, adminEmail: e.target.value }))}
                  className="bg-slate-800 border-slate-600 text-white placeholder:text-slate-500"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="create-commodities" className="text-slate-300">Commodities (comma-separated)</Label>
                <Input
                  id="create-commodities"
                  data-testid="input-create-commodities"
                  placeholder="e.g. Cocoa, Cashew"
                  value={newOrg.commodities}
                  onChange={(e) => setNewOrg(prev => ({ ...prev, commodities: e.target.value }))}
                  className="bg-slate-800 border-slate-600 text-white placeholder:text-slate-500"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-slate-300">Starting Tier</Label>
                <Select
                  value={newOrg.subscriptionStatus}
                  onValueChange={(value) => setNewOrg(prev => ({ ...prev, subscriptionStatus: value }))}
                >
                  <SelectTrigger data-testid="select-create-status" className="bg-slate-800 border-slate-600 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-600">
                    <SelectItem value="starter">Starter</SelectItem>
                    <SelectItem value="basic">Basic</SelectItem>
                    <SelectItem value="pro">Pro</SelectItem>
                    <SelectItem value="enterprise">Enterprise</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button
                onClick={handleCreateOrg}
                disabled={isCreating || !newOrg.orgName.trim() || !newOrg.adminName.trim() || !newOrg.adminEmail.trim()}
                className="w-full bg-[#2E7D6B] hover:bg-[#1F5F52]"
                data-testid="button-submit-create-org"
              >
                {isCreating ? (
                  <><Loader2 className="h-4 w-4 animate-spin mr-2" />Creating...</>
                ) : (
                  <><Building2 className="h-4 w-4 mr-2" />Create Organization & Send Email</>
                )}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
