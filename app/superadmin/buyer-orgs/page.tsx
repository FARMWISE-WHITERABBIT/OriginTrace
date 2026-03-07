'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import { Loader2, Search, Building2, Link2, FileCheck, Eye, Globe, Mail } from 'lucide-react';
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

export default function BuyerOrgsPage() {
  const [buyerOrgs, setBuyerOrgs] = useState<BuyerOrganization[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedOrg, setSelectedOrg] = useState<BuyerOrganization | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
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
        toast({
          title: 'Error',
          description: 'Failed to fetch buyer organizations.',
          variant: 'destructive'
        });
      }
    } catch (error) {
      console.error('Failed to fetch buyer organizations:', error);
    } finally {
      setIsLoading(false);
    }
  }

  const filteredOrgs = buyerOrgs.filter(org =>
    org.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (org.slug && org.slug.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (org.country && org.country.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const getLinkStatusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      active: 'default',
      pending: 'secondary',
      suspended: 'destructive',
      terminated: 'outline'
    };
    return <Badge variant={variants[status] || 'secondary'} data-testid={`badge-link-status-${status}`}>{status}</Badge>;
  };

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
        <h1 className="text-3xl font-bold text-white" data-testid="text-page-title">Buyer Organizations</h1>
        <p className="text-slate-400">Monitor buyer organizations and their supply chain connections</p>
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
              <CardDescription className="text-slate-400">{buyerOrgs.length} buyer organizations registered</CardDescription>
            </div>
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
          </div>
        </CardHeader>
        <CardContent>
          {filteredOrgs.length === 0 ? (
            <div className="text-center py-12 text-slate-400">
              <Building2 className="h-12 w-12 mx-auto mb-3 opacity-40" />
              <p className="text-lg font-medium">No buyer organizations found</p>
              <p className="text-sm">Buyer organizations will appear here when they register.</p>
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
                      <TableCell>
                        {new Date(org.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setSelectedOrg(org);
                            setDialogOpen(true);
                          }}
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

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{selectedOrg?.name}</DialogTitle>
            <DialogDescription>Buyer organization details and linked exporters</DialogDescription>
          </DialogHeader>
          {selectedOrg && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-sm text-muted-foreground">Slug</div>
                  <div className="font-medium" data-testid="text-detail-slug">{selectedOrg.slug}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Country</div>
                  <div className="font-medium" data-testid="text-detail-country">{selectedOrg.country || '-'}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Industry</div>
                  <div className="font-medium" data-testid="text-detail-industry">{selectedOrg.industry || '-'}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Contact Email</div>
                  <div className="font-medium" data-testid="text-detail-email">{selectedOrg.contact_email || '-'}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Created</div>
                  <div className="font-medium">{new Date(selectedOrg.created_at).toLocaleDateString()}</div>
                </div>
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

              {selectedOrg.linked_exporters && selectedOrg.linked_exporters.length > 0 && (
                <div className="pt-4 border-t">
                  <h4 className="text-sm font-medium mb-3">Linked Exporters</h4>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {selectedOrg.linked_exporters.map((exporter) => (
                      <div
                        key={exporter.id}
                        className="flex items-center justify-between gap-2 p-2 rounded-md bg-muted/50 flex-wrap"
                        data-testid={`row-linked-exporter-${exporter.id}`}
                      >
                        <div>
                          <div className="text-sm font-medium">{exporter.exporter_name}</div>
                          <div className="text-xs text-muted-foreground">{exporter.exporter_slug}</div>
                        </div>
                        <div className="flex items-center gap-2 flex-wrap">
                          {getLinkStatusBadge(exporter.status)}
                          <span className="text-xs text-muted-foreground">
                            {exporter.accepted_at
                              ? `Accepted ${new Date(exporter.accepted_at).toLocaleDateString()}`
                              : exporter.invited_at
                                ? `Invited ${new Date(exporter.invited_at).toLocaleDateString()}`
                                : 'Pending'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {(!selectedOrg.linked_exporters || selectedOrg.linked_exporters.length === 0) && (
                <div className="pt-4 border-t text-center text-sm text-muted-foreground py-4">
                  No linked exporters yet
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
