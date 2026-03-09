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
  DialogTitle 
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Loader2, Search, Building2, Users, Eye, ExternalLink, Weight, CheckCircle2, LogIn, Plus, Mail, Copy, Check } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useOrg } from '@/lib/contexts/org-context';
import { StatusBadge } from '@/lib/status-badge';

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

export default function OrganizationsPage() {
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedOrg, setSelectedOrg] = useState<Organization | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [impersonating, setImpersonating] = useState<number | null>(null);
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
        toast({
          title: 'Impersonation Started',
          description: `Now viewing as ${org.name}. You will see their dashboard.`
        });
        router.push('/app');
      } else {
        throw new Error('Failed to start impersonation');
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to access organization dashboard.',
        variant: 'destructive'
      });
    } finally {
      setImpersonating(null);
    }
  }

  async function updateOrgStatus(orgId: number, status: string) {
    try {
      const response = await fetch('/api/superadmin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update_org_status',
          org_id: orgId,
          subscription_status: status
        })
      });

      if (response.ok) {
        toast({
          title: 'Status updated',
          description: 'Organization status has been updated.'
        });
        fetchOrganizations();
      } else {
        throw new Error('Failed to update status');
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update organization status.',
        variant: 'destructive'
      });
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
        })
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
    } catch (error) {
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
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white" data-testid="text-page-title">Tenants</h1>
        <p className="text-slate-400">Manage all registered organizations and access their dashboards</p>
      </div>

      <Card className="bg-slate-900 border-slate-700">
        <CardHeader>
          <div className="flex flex-col sm:flex-row gap-4 justify-between">
            <div>
              <CardTitle className="text-white">All Organizations</CardTitle>
              <CardDescription className="text-slate-400">{organizations.length} organizations registered</CardDescription>
            </div>
            <div className="flex items-center gap-3">
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
              <Button
                onClick={() => { setCreateResult(null); setCreateDialogOpen(true); }}
                className="bg-[#2E7D6B] hover:bg-[#1F5F52] shrink-0"
                data-testid="button-create-org"
              >
                <Plus className="h-4 w-4 mr-1" />
                Create Org
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Organization</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Active Agents</TableHead>
                  <TableHead>Total Tonnage</TableHead>
                  <TableHead>Compliance Rate</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredOrgs.map((org) => (
                  <TableRow key={org.id} data-testid={`row-org-${org.id}`}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                          <Building2 className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <div className="font-medium">{org.name}</div>
                          <div className="text-sm text-muted-foreground">{org.slug || '-'}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                        <div className="flex flex-col gap-1">
                          <StatusBadge domain="subscription" status={org.subscription_tier || 'starter'} />
                          <span className="text-xs text-slate-400 capitalize">{org.subscription_status || 'active'}</span>
                        </div>
                      </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Users className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">{org.agent_count || 0}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Weight className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">{(org.total_tonnage || 0).toFixed(1)} t</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">
                          {org.farm_count > 0 
                            ? `${Math.round((org.approved_farms || 0) / org.farm_count * 100)}%` 
                            : '-'}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {new Date(org.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setSelectedOrg(org);
                            setDialogOpen(true);
                          }}
                          data-testid={`button-view-org-${org.id}`}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="default"
                          size="sm"
                          onClick={() => handleImpersonate(org)}
                          disabled={impersonating === org.id}
                          data-testid={`button-access-org-${org.id}`}
                        >
                          {impersonating === org.id ? (
                            <Loader2 className="h-4 w-4 animate-spin mr-1" />
                          ) : (
                            <LogIn className="h-4 w-4 mr-1" />
                          )}
                          Access Dashboard
                        </Button>
                        <Select
                          value={org.subscription_tier || 'starter'}
                          onValueChange={(value: string) => updateOrgStatus(org.id, value)}
                        >
                          <SelectTrigger className="w-[110px]" data-testid={`select-status-${org.id}`}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="starter">Starter</SelectItem>
                            <SelectItem value="basic">Basic</SelectItem>
                            <SelectItem value="pro">Pro</SelectItem>
                            <SelectItem value="enterprise">Enterprise</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{selectedOrg?.name}</DialogTitle>
            <DialogDescription>Organization details and metrics</DialogDescription>
          </DialogHeader>
          {selectedOrg && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-sm text-muted-foreground">Slug</div>
                  <div className="font-medium">{selectedOrg.slug || '-'}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Status</div>
                  <div className="flex flex-col gap-1">
                    <StatusBadge domain="subscription" status={selectedOrg.subscription_tier || 'starter'} />
                    <span className="text-xs text-slate-400 capitalize">{selectedOrg.subscription_status || 'active'}</span>
                  </div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Commodities</div>
                  <div className="font-medium">
                    {selectedOrg.commodity_types?.join(', ') || selectedOrg.commodities?.join(', ') || 'None'}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Created</div>
                  <div className="font-medium">{new Date(selectedOrg.created_at).toLocaleDateString()}</div>
                </div>
              </div>
              <div className="grid grid-cols-4 gap-4 pt-4 border-t">
                <div className="text-center">
                  <div className="text-2xl font-bold">{selectedOrg.user_count}</div>
                  <div className="text-sm text-muted-foreground">Users</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold">{selectedOrg.agent_count}</div>
                  <div className="text-sm text-muted-foreground">Agents</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold">{selectedOrg.farm_count}</div>
                  <div className="text-sm text-muted-foreground">Farms</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold">{selectedOrg.bag_count}</div>
                  <div className="text-sm text-muted-foreground">Bags</div>
                </div>
              </div>
              <div className="pt-4 border-t">
                <Button
                  className="w-full"
                  onClick={() => {
                    setDialogOpen(false);
                    handleImpersonate(selectedOrg);
                  }}
                  disabled={impersonating === selectedOrg.id}
                >
                  {impersonating === selectedOrg.id ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <LogIn className="h-4 w-4 mr-2" />
                  )}
                  Access Dashboard as Admin
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={createDialogOpen} onOpenChange={(open) => { if (!open) resetCreateDialog(); else setCreateDialogOpen(true); }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{createResult?.success ? 'Organization Created' : 'Create New Organization'}</DialogTitle>
            <DialogDescription>
              {createResult?.success
                ? 'The organization and admin account have been set up.'
                : 'Set up a new organization and its admin account. The admin will receive login credentials via email.'}
            </DialogDescription>
          </DialogHeader>

          {createResult?.success ? (
            <div className="space-y-4">
              <div className="rounded-lg bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 p-4 space-y-2">
                <div className="flex items-center gap-2 text-green-700 dark:text-green-400">
                  <Check className="h-5 w-5" />
                  <span className="font-medium">{createResult.orgName} created successfully</span>
                </div>
                <p className="text-sm text-green-600 dark:text-green-500">
                  Admin: {createResult.adminEmail}
                </p>
              </div>

              {createResult.emailSent ? (
                <div className="rounded-lg bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 p-4">
                  <div className="flex items-center gap-2 text-blue-700 dark:text-blue-400">
                    <Mail className="h-4 w-4" />
                    <span className="text-sm font-medium">Welcome email sent successfully</span>
                  </div>
                  <p className="text-xs text-blue-600 dark:text-blue-500 mt-1">
                    The admin will receive login details at {createResult.adminEmail}
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 p-4">
                    <p className="text-sm text-amber-700 dark:text-amber-400 font-medium">
                      Email could not be sent. Please share these credentials manually:
                    </p>
                  </div>
                  {createResult.tempPassword && (
                    <div className="rounded-lg border p-4 space-y-2">
                      <div className="flex items-center justify-between gap-4 flex-wrap">
                        <div>
                          <p className="text-xs text-muted-foreground">Email</p>
                          <p className="text-sm font-medium" data-testid="text-created-email">{createResult.adminEmail}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Temporary Password</p>
                          <p className="text-sm font-mono font-medium" data-testid="text-temp-password">{createResult.tempPassword}</p>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          data-testid="button-copy-password"
                          onClick={() => {
                            navigator.clipboard.writeText(createResult.tempPassword!);
                            setCopiedPassword(true);
                            setTimeout(() => setCopiedPassword(false), 2000);
                          }}
                        >
                          {copiedPassword ? <Check className="h-3 w-3 mr-1" /> : <Copy className="h-3 w-3 mr-1" />}
                          {copiedPassword ? 'Copied' : 'Copy'}
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              <Button onClick={resetCreateDialog} className="w-full" data-testid="button-close-create-result">
                Done
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="create-org-name">Organization Name *</Label>
                <Input
                  id="create-org-name"
                  data-testid="input-create-org-name"
                  placeholder="e.g. Sunshine Cocoa Exports"
                  value={newOrg.orgName}
                  onChange={(e) => setNewOrg(prev => ({ ...prev, orgName: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="create-admin-name">Admin Full Name *</Label>
                <Input
                  id="create-admin-name"
                  data-testid="input-create-admin-name"
                  placeholder="e.g. Adebayo Ogundimu"
                  value={newOrg.adminName}
                  onChange={(e) => setNewOrg(prev => ({ ...prev, adminName: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="create-admin-email">Admin Email *</Label>
                <Input
                  id="create-admin-email"
                  data-testid="input-create-admin-email"
                  type="email"
                  placeholder="e.g. admin@sunshinecocoa.com"
                  value={newOrg.adminEmail}
                  onChange={(e) => setNewOrg(prev => ({ ...prev, adminEmail: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="create-commodities">Commodities (comma-separated)</Label>
                <Input
                  id="create-commodities"
                  data-testid="input-create-commodities"
                  placeholder="e.g. Cocoa, Cashew"
                  value={newOrg.commodities}
                  onChange={(e) => setNewOrg(prev => ({ ...prev, commodities: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Starting Tier</Label>
                <Select
                  value={newOrg.subscriptionStatus}
                  onValueChange={(value) => setNewOrg(prev => ({ ...prev, subscriptionStatus: value }))}
                >
                  <SelectTrigger data-testid="select-create-status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
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
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Building2 className="h-4 w-4 mr-2" />
                    Create Organization & Send Email
                  </>
                )}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
