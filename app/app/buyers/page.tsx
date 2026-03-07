'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { TierGate } from '@/components/tier-gate';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Search, Handshake, Building2, CheckCircle2, Clock, XCircle, Pause, Globe } from 'lucide-react';

interface SupplyChainLink {
  id: string;
  status: string;
  invited_at: string;
  accepted_at: string | null;
  buyer_org?: {
    id: string;
    name: string;
    slug: string;
    logo_url: string | null;
    country: string | null;
  };
}

const STATUS_CONFIG: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline'; icon: typeof CheckCircle2 }> = {
  active: { label: 'Active', variant: 'default', icon: CheckCircle2 },
  pending: { label: 'Pending', variant: 'outline', icon: Clock },
  suspended: { label: 'Suspended', variant: 'secondary', icon: Pause },
  terminated: { label: 'Terminated', variant: 'destructive', icon: XCircle },
};

export default function ExporterBuyersPage() {
  const [links, setLinks] = useState<SupplyChainLink[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const { toast } = useToast();

  const fetchLinks = async () => {
    try {
      const response = await fetch('/api/supply-chain-links');
      if (!response.ok) throw new Error('Failed to fetch');
      const data = await response.json();
      setLinks(data.links || []);
    } catch (error) {
      console.error('Failed to fetch buyer links:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchLinks(); }, []);

  const handleAccept = async (linkId: string) => {
    try {
      const response = await fetch('/api/supply-chain-links', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ link_id: linkId, status: 'active' }),
      });
      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Failed to accept');
      }
      toast({ title: 'Accepted', description: 'Buyer link accepted successfully.' });
      fetchLinks();
    } catch (error: unknown) {
      toast({ title: 'Error', description: error instanceof Error ? error.message : 'Failed', variant: 'destructive' });
    }
  };

  const handleDecline = async (linkId: string) => {
    try {
      const response = await fetch('/api/supply-chain-links', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ link_id: linkId, status: 'terminated' }),
      });
      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Failed to decline');
      }
      toast({ title: 'Declined', description: 'Buyer link declined.' });
      fetchLinks();
    } catch (error: unknown) {
      toast({ title: 'Error', description: error instanceof Error ? error.message : 'Failed', variant: 'destructive' });
    }
  };

  const filteredLinks = links.filter(l => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return l.buyer_org?.name?.toLowerCase().includes(q) || l.status.includes(q);
  });

  const pendingLinks = filteredLinks.filter(l => l.status === 'pending');
  const otherLinks = filteredLinks.filter(l => l.status !== 'pending');

  return (
    <TierGate feature="buyer_portal" requiredTier="pro" featureLabel="Buyer Portal">
      <div className="flex-1 space-y-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight" data-testid="text-page-title">Connected Buyers</h1>
          <p className="text-sm text-muted-foreground mt-1">View and manage buyer connections to your organization</p>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search buyers..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-9" data-testid="input-search-buyers" />
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : filteredLinks.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16 text-center">
              <Handshake className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-1">No buyer connections</h3>
              <p className="text-sm text-muted-foreground max-w-md" data-testid="text-no-buyers">
                When buyers invite your organization, their invitations will appear here for you to accept or decline.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {pendingLinks.length > 0 && (
              <div className="space-y-3">
                <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Pending Invitations</h2>
                {pendingLinks.map(link => {
                  const config = STATUS_CONFIG[link.status];
                  const StatusIcon = config.icon;
                  return (
                    <Card key={link.id} data-testid={`card-buyer-pending-${link.id}`}>
                      <CardContent className="py-4">
                        <div className="flex items-center justify-between gap-4 flex-wrap">
                          <div className="flex items-center gap-4 min-w-0">
                            <div className="h-10 w-10 rounded-md bg-muted flex items-center justify-center shrink-0">
                              <Building2 className="h-5 w-5 text-muted-foreground" />
                            </div>
                            <div>
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-medium" data-testid={`text-buyer-name-${link.id}`}>
                                  {link.buyer_org?.name || 'Unknown Buyer'}
                                </span>
                                <Badge variant={config.variant}>
                                  <StatusIcon className="h-3 w-3 mr-1" />
                                  {config.label}
                                </Badge>
                              </div>
                              <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1 flex-wrap">
                                {link.buyer_org?.country && (
                                  <span className="flex items-center gap-1"><Globe className="h-3 w-3" />{link.buyer_org.country}</span>
                                )}
                                <span>Invited {new Date(link.invited_at).toLocaleDateString()}</span>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button size="sm" onClick={() => handleAccept(link.id)} data-testid={`button-accept-${link.id}`}>Accept</Button>
                            <Button variant="outline" size="sm" onClick={() => handleDecline(link.id)} data-testid={`button-decline-${link.id}`}>Decline</Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}

            {otherLinks.length > 0 && (
              <div className="space-y-3">
                <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">All Connections</h2>
                {otherLinks.map(link => {
                  const config = STATUS_CONFIG[link.status] || STATUS_CONFIG.pending;
                  const StatusIcon = config.icon;
                  return (
                    <Card key={link.id} data-testid={`card-buyer-${link.id}`}>
                      <CardContent className="py-4">
                        <div className="flex items-center justify-between gap-4 flex-wrap">
                          <div className="flex items-center gap-4 min-w-0">
                            <div className="h-10 w-10 rounded-md bg-muted flex items-center justify-center shrink-0">
                              <Building2 className="h-5 w-5 text-muted-foreground" />
                            </div>
                            <div>
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-medium" data-testid={`text-buyer-name-${link.id}`}>
                                  {link.buyer_org?.name || 'Unknown Buyer'}
                                </span>
                                <Badge variant={config.variant}>
                                  <StatusIcon className="h-3 w-3 mr-1" />
                                  {config.label}
                                </Badge>
                              </div>
                              <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1 flex-wrap">
                                {link.buyer_org?.country && (
                                  <span className="flex items-center gap-1"><Globe className="h-3 w-3" />{link.buyer_org.country}</span>
                                )}
                                {link.accepted_at && <span>Connected {new Date(link.accepted_at).toLocaleDateString()}</span>}
                              </div>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </TierGate>
  );
}
