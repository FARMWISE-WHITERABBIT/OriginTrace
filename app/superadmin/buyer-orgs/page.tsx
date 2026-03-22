'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2, Search, Building2, Link2, FileCheck, Eye, Globe, Mail, Plus, Copy, Check, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface BuyerOrganization {
  id: string;
  name: string;
  slug: string;
  country: string | null;
  industry: string | null;
  contact_email: string | null;
  logo_url: string | null;
  created_at: string;
  supply_chain_link_count: number;
  contract_count: number;
  linked_exporters: Array<{
    id: string;
    exporter_name: string;
    exporter_slug: string;
    status: string;
    invited_at: string;
    accepted_at: string | null;
  }>;
}

interface CreateResult {
  buyerOrganization: { id: string; name: string; slug: string };
  admin: { email: string; name: string };
  emailSent: boolean;
  emailError?: string;
  temporaryPassword?: string;
}

const COUNTRIES = [
  'Nigeria', 'Ghana', "Côte d'Ivoire", 'Cameroon', 'Uganda', 'Kenya', 'Ethiopia',
  'United Kingdom', 'Germany', 'France', 'Netherlands', 'Belgium', 'Switzerland',
  'United States', 'Canada', 'United Arab Emirates', 'Saudi Arabia', 'Japan', 'China',
  'Other',
];

const INDUSTRIES = [
  'Cocoa & Chocolate', 'Coffee', 'Palm Oil', 'Timber & Wood Products',
  'Soy & Oilseeds', 'Cattle & Leather', 'Rubber', 'Spices & Herbs',
  'Commodity Trading', 'Food & Beverage Manufacturing', 'Retail', 'Other',
];

export default function BuyerOrgsPage() {
  const [buyerOrgs, setBuyerOrgs] = useState<BuyerOrganization[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedOrg, setSelectedOrg] = useState<BuyerOrganization | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [createResult, setCreateResult] = useState<CreateResult | null>(null);
  const [copied, setCopied] = useState(false);
  const [formData, setFormData] = useState({
    companyName: '',
    adminName: '',
    adminEmail: '',
    country: '',
    industry: '',
  });
  const { toast } = useToast();

  useEffect(() => {
    fetchBuyerOrgs();
  }, []);

  async function fetchBuyerOrgs() {
    try {
      const response = await fetch('/api/superadmin?resource=buyer_organizations');
      if (response.ok) {
        const data = await response.json();
        setBuyerOrgs(data.buyer_organizations || []);
      } else {
        toast({ title: 'Error', description: 'Failed to fetch buyer organizations.', variant: 'destructive' });
      }
    } catch (error) {
      console.error('Failed to fetch buyer organizations:', error);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleCreateBuyerOrg() {
    if (!formData.companyName || !formData.adminName || !formData.adminEmail) {
      toast({ title: 'Missing fields', description: 'Company name, admin name, and email are required.', variant: 'destructive' });
      return;
    }
    setIsCreating(true);
    setCreateResult(null);
    try {
      const response = await fetch('/api/superadmin/create-buyer-org', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      const data = await response.json();
      if (!response.ok) {
        toast({ title: 'Error', description: data.error || 'Failed to create buyer organization', variant: 'destructive' });
        return;
      }
      setCreateResult(data);
      await fetchBuyerOrgs();
      if (data.emailSent) {
        toast({ title: 'Buyer Org Created', description: `Welcome email sent to ${data.admin.email}` });
      } else {
        toast({ title: 'Buyer Org Created', description: 'Email could not be sent. Temporary password shown below.', variant: 'destructive' });
      }
    } catch (err) {
      console.error('Create buyer org error:', err);
      toast({ title: 'Error', description: 'An unexpected error occurred.', variant: 'destructive' });
    } finally {
      setIsCreating(false);
    }
  }

  function resetCreateDialog() {
    setFormData({ companyName: '', adminName: '', adminEmail: '', country: '', industry: '' });
    setCreateResult(null);
    setCopied(false);
    setCreateDialogOpen(false);
  }

  async function copyPassword(password: string) {
    await navigator.clipboard.writeText(password);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const filteredOrgs = buyerOrgs.filter(org =>
    org.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (org.slug && org.slug.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (org.country && org.country.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const getLinkStatusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      active: 'default', pending: 'secondary', suspended: 'destructive', terminated: 'outline',
    };
    return <Badge variant={variants[status] || 'secondary'} data-testid={`badge-link-status-${status}`}>{status}</Badge>;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-cyan-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white" data-testid="text-page-title">Buyer Organizations</h1>
        <p className="text-slate-400">Provision and monitor buyer organizations and their supply chain connections</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="bg-slate-900 border-slate-700">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-400">Total Buyer Orgs</CardTitle>
            <Building2 className="h-4 w-4 text-cyan-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white" data-testid="text-total-buyer-orgs">{buyerOrgs.length}</div>
          </CardContent>
        </Card>
        <Card className="bg-slate-900 border-slate-700">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-400">Supply Chain Links</CardTitle>
            <Link2 className="h-4 w-4 text-cyan-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white" data-testid="text-total-links">
              {buyerOrgs.reduce((sum, org) => sum + org.supply_chain_link_count, 0)}
            </div>
          </CardContent>
        </Card>
        <Card className="bg-slate-900 border-slate-700">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-400">Total Contracts</CardTitle>
            <FileCheck className="h-4 w-4 text-cyan-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white" data-testid="text-total-contracts">
              {buyerOrgs.reduce((sum, org) => sum + org.contract_count, 0)}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-slate-900 border-slate-700">
        <CardHeader>
          <div className="flex flex-col sm:flex-row gap-4 justify-between">
            <div>
              <CardTitle className="text-white">All Buyer Organizations</CardTitle>
              <CardDescription className="text-slate-400">{buyerOrgs.length} buyer organizations provisioned</CardDescription>
            </div>
            <div className="flex gap-3">
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Search buyer orgs..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 bg-slate-800 border-slate-600 text-white placeholder:text-slate-400"
                  data-testid="input-search-buyer-orgs"
                />
              </div>
              <Button
                onClick={() => { setCreateResult(null); setCreateDialogOpen(true); }}
                className="bg-cyan-600 hover:bg-cyan-500 text-white whitespace-nowrap"
                data-testid="button-create-buyer-org"
              >
                <Plus className="h-4 w-4 mr-2" />
                Create Buyer Org
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filteredOrgs.length === 0 ? (
            <div className="text-center py-12 text-slate-400">
              <Building2 className="h-12 w-12 mx-auto mb-3 opacity-40" />
              <p className="text-lg font-medium">No buyer organizations yet</p>
              <p className="text-sm">Use the Create Buyer Org button to provision a new buyer account.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Organization</TableHead>
                    <TableHead>Country</TableHead>
                    <TableHead>Contact Email</TableHead>
                    <TableHead>Supply Chain Links</TableHead>
                    <TableHead>Contracts</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredOrgs.map((org) => (
                    <TableRow key={org.id} data-testid={`row-buyer-org-${org.id}`}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-full bg-cyan-500/10 flex items-center justify-center">
                            <Building2 className="h-5 w-5 text-cyan-400" />
                          </div>
                          <div>
                            <div className="font-medium">{org.name}</div>
                            <div className="text-sm text-muted-foreground">{org.slug}</div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Globe className="h-4 w-4 text-muted-foreground" />
                          <span>{org.country || '-'}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Mail className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm">{org.contact_email || '-'}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Link2 className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">{org.supply_chain_link_count}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <FileCheck className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">{org.contract_count}</span>
                        </div>
                      </TableCell>
                      <TableCell>{new Date(org.created_at).toLocaleDateString()}</TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => { setSelectedOrg(org); setDialogOpen(true); }}
                          data-testid={`button-view-buyer-org-${org.id}`}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Buyer Org Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={(open) => { if (!open) resetCreateDialog(); else setCreateDialogOpen(true); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Create Buyer Organization</DialogTitle>
            <DialogDescription>
              Provision a new buyer account. A welcome email with login credentials will be sent automatically.
            </DialogDescription>
          </DialogHeader>

          {createResult ? (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-green-600">
                <Check className="h-5 w-5" />
                <span className="font-medium">Buyer org created successfully</span>
              </div>
              <div className="rounded-md bg-muted p-3 text-sm space-y-1">
                <div><span className="text-muted-foreground">Organization:</span> <strong>{createResult.buyerOrganization.name}</strong></div>
                <div><span className="text-muted-foreground">Admin email:</span> {createResult.admin.email}</div>
              </div>
              {!createResult.emailSent && createResult.temporaryPassword && (
                <div className="rounded-md border border-amber-800/50 bg-amber-900/30 p-3 space-y-2">
                  <div className="flex items-center gap-2 text-amber-300 text-sm font-medium">
                    <AlertCircle className="h-4 w-4" />
                    Email not sent — copy this temporary password
                  </div>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 rounded bg-slate-800 border border-slate-700 px-2 py-1 text-sm font-mono text-slate-200" data-testid="text-temp-password">
                      {createResult.temporaryPassword}
                    </code>
                    <Button size="sm" variant="outline" onClick={() => copyPassword(createResult.temporaryPassword ?? '')} data-testid="button-copy-password">
                      {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                    </Button>
                  </div>
                </div>
              )}
              {createResult.emailSent && (
                <p className="text-sm text-muted-foreground">Welcome email sent to {createResult.admin.email} with login instructions.</p>
              )}
              <DialogFooter>
                <Button onClick={resetCreateDialog} data-testid="button-close-create-result">Done</Button>
              </DialogFooter>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="create-company-name">Company Name *</Label>
                <Input id="create-company-name" placeholder="e.g. Barry Callebaut AG" value={formData.companyName}
                  onChange={(e) => setFormData(f => ({ ...f, companyName: e.target.value }))}
                  disabled={isCreating} data-testid="input-buyer-company-name" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="create-admin-name">Admin Full Name *</Label>
                <Input id="create-admin-name" placeholder="e.g. James Müller" value={formData.adminName}
                  onChange={(e) => setFormData(f => ({ ...f, adminName: e.target.value }))}
                  disabled={isCreating} data-testid="input-buyer-admin-name" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="create-admin-email">Admin Email *</Label>
                <Input id="create-admin-email" type="email" placeholder="james@example.com" value={formData.adminEmail}
                  onChange={(e) => setFormData(f => ({ ...f, adminEmail: e.target.value }))}
                  disabled={isCreating} data-testid="input-buyer-admin-email" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Country</Label>
                  <Select value={formData.country} onValueChange={(v) => setFormData(f => ({ ...f, country: v }))} disabled={isCreating}>
                    <SelectTrigger data-testid="select-buyer-country"><SelectValue placeholder="Select..." /></SelectTrigger>
                    <SelectContent>{COUNTRIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Industry</Label>
                  <Select value={formData.industry} onValueChange={(v) => setFormData(f => ({ ...f, industry: v }))} disabled={isCreating}>
                    <SelectTrigger data-testid="select-buyer-industry"><SelectValue placeholder="Select..." /></SelectTrigger>
                    <SelectContent>{INDUSTRIES.map(i => <SelectItem key={i} value={i}>{i}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={resetCreateDialog} disabled={isCreating}>Cancel</Button>
                <Button onClick={handleCreateBuyerOrg}
                  disabled={isCreating || !formData.companyName || !formData.adminName || !formData.adminEmail}
                  className="bg-cyan-600 hover:bg-cyan-500" data-testid="button-confirm-create-buyer-org">
                  {isCreating ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Creating...</> : 'Create Buyer Org'}
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* View Detail Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{selectedOrg?.name}</DialogTitle>
            <DialogDescription>Buyer organization details and linked exporters</DialogDescription>
          </DialogHeader>
          {selectedOrg && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div><div className="text-sm text-muted-foreground">Slug</div><div className="font-medium" data-testid="text-detail-slug">{selectedOrg.slug}</div></div>
                <div><div className="text-sm text-muted-foreground">Country</div><div className="font-medium" data-testid="text-detail-country">{selectedOrg.country || '-'}</div></div>
                <div><div className="text-sm text-muted-foreground">Industry</div><div className="font-medium" data-testid="text-detail-industry">{selectedOrg.industry || '-'}</div></div>
                <div><div className="text-sm text-muted-foreground">Contact Email</div><div className="font-medium" data-testid="text-detail-email">{selectedOrg.contact_email || '-'}</div></div>
                <div><div className="text-sm text-muted-foreground">Created</div><div className="font-medium">{new Date(selectedOrg.created_at).toLocaleDateString()}</div></div>
              </div>
              <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                <div className="text-center">
                  <div className="text-2xl font-bold" data-testid="text-detail-links">{selectedOrg.supply_chain_link_count}</div>
                  <div className="text-sm text-muted-foreground">Supply Chain Links</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold" data-testid="text-detail-contracts">{selectedOrg.contract_count}</div>
                  <div className="text-sm text-muted-foreground">Contracts</div>
                </div>
              </div>
              {selectedOrg.linked_exporters && selectedOrg.linked_exporters.length > 0 ? (
                <div className="pt-4 border-t">
                  <h4 className="text-sm font-medium mb-3">Linked Exporters</h4>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {selectedOrg.linked_exporters.map((exporter) => (
                      <div key={exporter.id} className="flex items-center justify-between gap-2 p-2 rounded-md bg-muted/50 flex-wrap" data-testid={`row-linked-exporter-${exporter.id}`}>
                        <div>
                          <div className="text-sm font-medium">{exporter.exporter_name}</div>
                          <div className="text-xs text-muted-foreground">{exporter.exporter_slug}</div>
                        </div>
                        <div className="flex items-center gap-2 flex-wrap">
                          {getLinkStatusBadge(exporter.status)}
                          <span className="text-xs text-muted-foreground">
                            {exporter.accepted_at ? `Accepted ${new Date(exporter.accepted_at).toLocaleDateString()}` : exporter.invited_at ? `Invited ${new Date(exporter.invited_at).toLocaleDateString()}` : 'Pending'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="pt-4 border-t text-center text-sm text-muted-foreground py-4">No linked exporters yet</div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
