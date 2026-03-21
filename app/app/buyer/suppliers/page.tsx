'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Plus, Handshake, Search, Building2, Clock, CheckCircle2, XCircle, Pause } from 'lucide-react';

interface SupplyChainLink {
  id: string;
  status: string;
  invited_at: string;
  accepted_at: string | null;
  exporter_org?: {
    id: string;
    name: string;
    slug: string;
    logo_url: string | null;
  };
}

const STATUS_CONFIG: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline'; icon: typeof CheckCircle2 }> = {
  active: { label: 'Active', variant: 'default', icon: CheckCircle2 },
  pending: { label: 'Pending', variant: 'outline', icon: Clock },
  suspended: { label: 'Suspended', variant: 'secondary', icon: Pause },
  terminated: { label: 'Terminated', variant: 'destructive', icon: XCircle },
};

export default function BuyerSuppliersPage() {
  const [links, setLinks] = useState<SupplyChainLink[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [inviteData, setInviteData] = useState({ exporter_org_name: '', exporter_email: '' });
  const { toast } = useToast();

  const fetchLinks = async () => {
    try {
      const response = await fetch('/api/supply-chain-links');
      if (!response.ok) throw new Error('Failed to fetch');
      const data = await response.json();
      setLinks(data.links || []);
    } catch (error) {
      console.error('Failed to fetch links:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchLinks(); }, []);

  const handleInvite = async () => {
    if (!inviteData.exporter_org_name) {
      toast({ title: 'Missing fields', description: 'Organization name is required.', variant: 'destructive' });
      return;
    }
    setIsCreating(true);
    try {
      const response = await fetch('/api/supply-chain-links', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(inviteData),
      });
      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Failed to send invitation');
      }
      toast({ title: 'Invitation sent', description: `Invitation sent to ${inviteData.exporter_org_name}.` });
      setDialogOpen(false);
      setInviteData({ exporter_org_name: '', exporter_email: '' });
      fetchLinks();
    } catch (error: unknown) {
      toast({ title: 'Error', description: error instanceof Error ? error.message : 'Failed to send invitation', variant: 'destructive' });
    } finally {
      setIsCreating(false);
    }
  };

  const handleStatusChange = async (linkId: string, newStatus: string) => {
    try {
      const response = await fetch('/api/supply-chain-links', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ link_id: linkId, status: newStatus }),
      });
      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Failed to update');
      }
      toast({ title: 'Updated', description: `Link status changed to ${newStatus}.` });
      fetchLinks();
    } catch (error: unknown) {
      toast({ title: 'Error', description: error instanceof Error ? error.message : 'Failed to update', variant: 'destructive' });
    }
  };

  const filteredLinks = links.filter(l => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return l.exporter_org?.name?.toLowerCase().includes(q) || l.status.includes(q);
  });

  return (
    <div className="flex-1 space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight" data-testid="text-page-title">Suppliers</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage your connected exporters and supplier invitations</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-invite-supplier">
              <Plus className="h-4 w-4 mr-2" />
              Invite Supplier
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Invite Supplier</DialogTitle>
              <DialogDescription>Send an invitation to connect with an exporter organization.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="org-name">Organization Name</Label>
                <Input
                  id="org-name"
                  placeholder="e.g. Nigerian Cocoa Exports Ltd"
                  value={inviteData.exporter_org_name}
                  onChange={e => setInviteData(d => ({ ...d, exporter_org_name: e.target.value }))}
                  data-testid="input-exporter-org-name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Contact Email (optional)</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="contact@exporter.com"
                  value={inviteData.exporter_email}
                  onChange={e => setInviteData(d => ({ ...d, exporter_email: e.target.value }))}
                  data-testid="input-exporter-email"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)} data-testid="button-cancel-invite">Cancel</Button>
              <Button onClick={handleInvite} disabled={isCreating} data-testid="button-confirm-invite">
                {isCreating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Send Invitation
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search suppliers..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          className="pl-9"
          data-testid="input-search-suppliers"
        />
      </div>

      {isLoading ? (
        <div className="rounded-md border border-border overflow-hidden"><table className="w-full"><thead className="border-b border-border bg-muted/30"><tr>{Array.from({length:4}).map((_,i)=><th key={i} className="px-4 py-3"><div className="h-3 w-16 bg-muted animate-pulse rounded"/></th>)}</tr></thead><tbody>{Array.from({length:5}).map((_,i)=><tr key={i} className="border-b border-border">{Array.from({length:4}).map((_,j)=><td key={j} className="px-4 py-3"><div className="h-4 bg-muted animate-pulse rounded" style={{width:`${60+j*15}%`}}/></td>)}</tr>)}</tbody></table></div>
      ) : filteredLinks.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <Handshake className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-1">No suppliers connected</h3>
            <p className="text-sm text-muted-foreground mb-4 max-w-md">
              Invite exporters to connect with your organization and start managing your supply chain.
            </p>
            <Button onClick={() => setDialogOpen(true)} data-testid="button-invite-first-supplier">
              <Plus className="h-4 w-4 mr-2" />
              Invite First Supplier
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {filteredLinks.map(link => {
            const config = STATUS_CONFIG[link.status] || STATUS_CONFIG.pending;
            const StatusIcon = config.icon;
            return (
              <Card key={link.id} data-testid={`card-supplier-${link.id}`}>
                <CardContent className="py-4">
                  <div className="flex items-center justify-between gap-4 flex-wrap">
                    <div className="flex items-center gap-4 min-w-0">
                      <div className="h-10 w-10 rounded-md bg-muted flex items-center justify-center shrink-0">
                        <Building2 className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium" data-testid={`text-supplier-name-${link.id}`}>
                            {link.exporter_org?.name || 'Unknown Exporter'}
                          </span>
                          <Badge variant={config.variant} data-testid={`badge-supplier-status-${link.id}`}>
                            <StatusIcon className="h-3 w-3 mr-1" />
                            {config.label}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">
                          Invited {new Date(link.invited_at).toLocaleDateString()}
                          {link.accepted_at && ` · Accepted ${new Date(link.accepted_at).toLocaleDateString()}`}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      {link.status === 'active' && (
                        <Button variant="outline" size="sm" onClick={() => handleStatusChange(link.id, 'suspended')} data-testid={`button-suspend-${link.id}`}>
                          Suspend
                        </Button>
                      )}
                      {link.status === 'suspended' && (
                        <Button variant="outline" size="sm" onClick={() => handleStatusChange(link.id, 'active')} data-testid={`button-reactivate-${link.id}`}>
                          Reactivate
                        </Button>
                      )}
                      {link.status !== 'terminated' && (
                        <Button variant="outline" size="sm" onClick={() => handleStatusChange(link.id, 'terminated')} data-testid={`button-terminate-${link.id}`}>
                          Terminate
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
