'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Plus, Search, Gavel, Calendar, Package, DollarSign, Eye, Award, XCircle, ChevronDown, ChevronUp } from 'lucide-react';

interface Tender {
  id: string;
  title: string;
  commodity: string;
  quantity_mt: number;
  target_price_per_mt: number | null;
  currency: string;
  delivery_deadline: string | null;
  destination_country: string | null;
  destination_port: string | null;
  quality_requirements: Record<string, unknown>;
  certifications_required: string[];
  regulation_framework: string | null;
  status: string;
  visibility: string;
  bid_count: number;
  created_at: string;
  closes_at: string | null;
}

interface Bid {
  id: string;
  tender_id: string;
  exporter_org_id: string;
  price_per_mt: number;
  quantity_available_mt: number;
  delivery_date: string | null;
  notes: string | null;
  compliance_score: number | null;
  certifications: string[];
  status: string;
  created_at: string;
  exporter_org?: { id: string; name: string; slug: string };
}

const STATUS_VARIANT: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  open: 'default',
  closed: 'secondary',
  awarded: 'outline',
  cancelled: 'destructive',
};

const BID_STATUS_VARIANT: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  submitted: 'outline',
  shortlisted: 'default',
  awarded: 'default',
  rejected: 'destructive',
  withdrawn: 'secondary',
};

export default function BuyerTendersPage() {
  const [tenders, setTenders] = useState<Tender[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [expandedTender, setExpandedTender] = useState<string | null>(null);
  const [bids, setBids] = useState<Record<string, Bid[]>>({});
  const [loadingBids, setLoadingBids] = useState<string | null>(null);
  const [newTender, setNewTender] = useState({
    title: '',
    commodity: '',
    quantity_mt: '',
    target_price_per_mt: '',
    currency: 'USD',
    delivery_deadline: '',
    destination_country: '',
    destination_port: '',
    regulation_framework: '',
    certifications_required: '',
    visibility: 'public',
    closes_at: '',
  });
  const { toast } = useToast();

  const fetchTenders = async () => {
    try {
      const res = await fetch('/api/tenders');
      if (res.ok) {
        const data = await res.json();
        setTenders(data.tenders || []);
      }
    } catch (error) {
      console.error('Failed to fetch tenders:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchTenders(); }, []);

  const fetchBids = async (tenderId: string) => {
    setLoadingBids(tenderId);
    try {
      const res = await fetch(`/api/tenders/${tenderId}/bids`);
      if (res.ok) {
        const data = await res.json();
        setBids(prev => ({ ...prev, [tenderId]: data.bids || [] }));
      }
    } catch (error) {
      console.error('Failed to fetch bids:', error);
    } finally {
      setLoadingBids(null);
    }
  };

  const toggleBids = (tenderId: string) => {
    if (expandedTender === tenderId) {
      setExpandedTender(null);
    } else {
      setExpandedTender(tenderId);
      if (!bids[tenderId]) {
        fetchBids(tenderId);
      }
    }
  };

  const handleCreate = async () => {
    if (!newTender.title || !newTender.commodity || !newTender.quantity_mt) {
      toast({ title: 'Missing fields', description: 'Title, commodity, and quantity are required.', variant: 'destructive' });
      return;
    }
    setIsCreating(true);
    try {
      const body: Record<string, unknown> = {
        title: newTender.title,
        commodity: newTender.commodity,
        quantity_mt: parseFloat(newTender.quantity_mt),
        currency: newTender.currency,
        visibility: newTender.visibility,
      };
      if (newTender.target_price_per_mt) body.target_price_per_mt = parseFloat(newTender.target_price_per_mt);
      if (newTender.delivery_deadline) body.delivery_deadline = newTender.delivery_deadline;
      if (newTender.destination_country) body.destination_country = newTender.destination_country;
      if (newTender.destination_port) body.destination_port = newTender.destination_port;
      if (newTender.regulation_framework) body.regulation_framework = newTender.regulation_framework;
      if (newTender.closes_at) body.closes_at = newTender.closes_at;
      if (newTender.certifications_required) {
        body.certifications_required = newTender.certifications_required.split(',').map(s => s.trim()).filter(Boolean);
      }

      const response = await fetch('/api/tenders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Failed to create tender');
      }
      toast({ title: 'Tender created', description: 'Your tender has been published.' });
      setDialogOpen(false);
      setNewTender({ title: '', commodity: '', quantity_mt: '', target_price_per_mt: '', currency: 'USD', delivery_deadline: '', destination_country: '', destination_port: '', regulation_framework: '', certifications_required: '', visibility: 'public', closes_at: '' });
      fetchTenders();
    } catch (error: unknown) {
      toast({ title: 'Error', description: error instanceof Error ? error.message : 'Failed', variant: 'destructive' });
    } finally {
      setIsCreating(false);
    }
  };

  const handleAwardBid = async (tenderId: string, bidId: string) => {
    try {
      const response = await fetch('/api/tenders', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tender_id: tenderId, award_bid_id: bidId }),
      });
      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Failed to award bid');
      }
      const data = await response.json();
      toast({ title: 'Bid awarded', description: `Contract ${data.contract?.contract_reference || ''} created automatically.` });
      fetchTenders();
      fetchBids(tenderId);
    } catch (error: unknown) {
      toast({ title: 'Error', description: error instanceof Error ? error.message : 'Failed', variant: 'destructive' });
    }
  };

  const handleStatusChange = async (tenderId: string, newStatus: string) => {
    try {
      const response = await fetch('/api/tenders', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tender_id: tenderId, status: newStatus }),
      });
      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Failed to update');
      }
      toast({ title: 'Updated', description: `Tender status changed to ${newStatus}.` });
      fetchTenders();
    } catch (error: unknown) {
      toast({ title: 'Error', description: error instanceof Error ? error.message : 'Failed', variant: 'destructive' });
    }
  };

  const filteredTenders = tenders.filter(t => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return t.title.toLowerCase().includes(q) || t.commodity.toLowerCase().includes(q);
  });

  return (
    <div className="flex-1 space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight" data-testid="text-page-title">Tenders</h1>
          <p className="text-sm text-muted-foreground mt-1">Create tenders and review bids from exporters</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-new-tender">
              <Plus className="h-4 w-4 mr-2" />
              Create Tender
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create Tender</DialogTitle>
              <DialogDescription>Publish a tender for exporters to bid on.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="title">Title</Label>
                <Input id="title" placeholder="e.g. Q1 2025 Cocoa Beans" value={newTender.title} onChange={e => setNewTender(c => ({ ...c, title: e.target.value }))} data-testid="input-tender-title" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="commodity">Commodity</Label>
                  <Input id="commodity" placeholder="e.g. Cocoa" value={newTender.commodity} onChange={e => setNewTender(c => ({ ...c, commodity: e.target.value }))} data-testid="input-tender-commodity" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="quantity">Quantity (MT)</Label>
                  <Input id="quantity" type="number" placeholder="e.g. 100" value={newTender.quantity_mt} onChange={e => setNewTender(c => ({ ...c, quantity_mt: e.target.value }))} data-testid="input-tender-quantity" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="target-price">Target Price / MT</Label>
                  <Input id="target-price" type="number" placeholder="e.g. 3500" value={newTender.target_price_per_mt} onChange={e => setNewTender(c => ({ ...c, target_price_per_mt: e.target.value }))} data-testid="input-tender-price" />
                </div>
                <div className="space-y-2">
                  <Label>Currency</Label>
                  <Select value={newTender.currency} onValueChange={v => setNewTender(c => ({ ...c, currency: v }))}>
                    <SelectTrigger data-testid="select-tender-currency"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="USD">USD</SelectItem>
                      <SelectItem value="EUR">EUR</SelectItem>
                      <SelectItem value="GBP">GBP</SelectItem>
                      <SelectItem value="NGN">NGN</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="deadline">Delivery Deadline</Label>
                  <Input id="deadline" type="date" value={newTender.delivery_deadline} onChange={e => setNewTender(c => ({ ...c, delivery_deadline: e.target.value }))} data-testid="input-tender-deadline" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="closes">Tender Closes</Label>
                  <Input id="closes" type="datetime-local" value={newTender.closes_at} onChange={e => setNewTender(c => ({ ...c, closes_at: e.target.value }))} data-testid="input-tender-closes" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="country">Destination Country</Label>
                  <Input id="country" placeholder="e.g. Germany" value={newTender.destination_country} onChange={e => setNewTender(c => ({ ...c, destination_country: e.target.value }))} data-testid="input-tender-country" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="port">Destination Port</Label>
                  <Input id="port" placeholder="e.g. Hamburg" value={newTender.destination_port} onChange={e => setNewTender(c => ({ ...c, destination_port: e.target.value }))} data-testid="input-tender-port" />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Visibility</Label>
                <Select value={newTender.visibility} onValueChange={v => setNewTender(c => ({ ...c, visibility: v }))}>
                  <SelectTrigger data-testid="select-tender-visibility"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="public">Public</SelectItem>
                    <SelectItem value="invited">Invited Only</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Regulation Framework</Label>
                <Select value={newTender.regulation_framework} onValueChange={v => setNewTender(c => ({ ...c, regulation_framework: v }))}>
                  <SelectTrigger data-testid="select-tender-regulation"><SelectValue placeholder="Optional" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="EUDR">EUDR</SelectItem>
                    <SelectItem value="FSMA_204">FSMA 204</SelectItem>
                    <SelectItem value="UK_Environment_Act">UK Environment Act</SelectItem>
                    <SelectItem value="Lacey_Act_UFLPA">Lacey Act / UFLPA</SelectItem>
                    <SelectItem value="China_Green_Trade">China Green Trade</SelectItem>
                    <SelectItem value="UAE_Halal">UAE Halal</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="certs">Required Certifications (comma-separated)</Label>
                <Input id="certs" placeholder="e.g. Rainforest Alliance, Fairtrade" value={newTender.certifications_required} onChange={e => setNewTender(c => ({ ...c, certifications_required: e.target.value }))} data-testid="input-tender-certs" />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)} data-testid="button-cancel-tender">Cancel</Button>
              <Button onClick={handleCreate} disabled={isCreating} data-testid="button-confirm-tender">
                {isCreating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Publish Tender
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Search tenders..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-9" data-testid="input-search-tenders" />
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : filteredTenders.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <Gavel className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-1">No tenders yet</h3>
            <p className="text-sm text-muted-foreground mb-4 max-w-md">
              Create your first tender to start receiving bids from exporters.
            </p>
            <Button onClick={() => setDialogOpen(true)} data-testid="button-create-first-tender">
              <Plus className="h-4 w-4 mr-2" />
              Create First Tender
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {filteredTenders.map(tender => (
            <Card key={tender.id} data-testid={`card-tender-${tender.id}`}>
              <CardContent className="py-4">
                <div className="flex items-center justify-between gap-4 flex-wrap">
                  <div className="flex items-center gap-4 min-w-0">
                    <div className="h-10 w-10 rounded-md bg-muted flex items-center justify-center shrink-0">
                      <Gavel className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium" data-testid={`text-tender-title-${tender.id}`}>{tender.title}</span>
                        <Badge variant={STATUS_VARIANT[tender.status] || 'outline'} data-testid={`badge-tender-status-${tender.id}`}>{tender.status}</Badge>
                        <Badge variant="outline" data-testid={`badge-tender-visibility-${tender.id}`}>{tender.visibility}</Badge>
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground flex-wrap">
                        <span>{tender.commodity}</span>
                        <span className="flex items-center gap-1"><Package className="h-3 w-3" />{Number(tender.quantity_mt).toLocaleString()} MT</span>
                        {tender.target_price_per_mt && (
                          <span className="flex items-center gap-1"><DollarSign className="h-3 w-3" />{Number(tender.target_price_per_mt).toLocaleString()} {tender.currency}/MT</span>
                        )}
                        {tender.delivery_deadline && (
                          <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{new Date(tender.delivery_deadline).toLocaleDateString()}</span>
                        )}
                        {tender.destination_port && <span>{tender.destination_port}</span>}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <Button variant="outline" size="sm" onClick={() => toggleBids(tender.id)} data-testid={`button-view-bids-${tender.id}`}>
                      <Eye className="h-4 w-4 mr-1" />
                      {tender.bid_count || 0} Bids
                      {expandedTender === tender.id ? <ChevronUp className="h-4 w-4 ml-1" /> : <ChevronDown className="h-4 w-4 ml-1" />}
                    </Button>
                    {tender.status === 'open' && (
                      <Button variant="outline" size="sm" onClick={() => handleStatusChange(tender.id, 'closed')} data-testid={`button-close-${tender.id}`}>
                        Close
                      </Button>
                    )}
                    {tender.status === 'open' && (
                      <Button variant="outline" size="sm" onClick={() => handleStatusChange(tender.id, 'cancelled')} data-testid={`button-cancel-tender-${tender.id}`}>
                        <XCircle className="h-4 w-4 mr-1" />
                        Cancel
                      </Button>
                    )}
                  </div>
                </div>

                {expandedTender === tender.id && (
                  <div className="mt-4 border-t pt-4">
                    {loadingBids === tender.id ? (
                      <div className="flex items-center justify-center py-8">
                        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                      </div>
                    ) : (bids[tender.id] || []).length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-4" data-testid="text-no-bids">No bids received yet.</p>
                    ) : (
                      <div className="space-y-3">
                        <h4 className="text-sm font-medium">Bid Comparison</h4>
                        <div className="overflow-x-auto">
                          <table className="w-full text-sm" data-testid={`table-bids-${tender.id}`}>
                            <thead>
                              <tr className="border-b text-left text-muted-foreground">
                                <th className="py-2 pr-4">Exporter</th>
                                <th className="py-2 pr-4">Price/MT</th>
                                <th className="py-2 pr-4">Qty Available</th>
                                <th className="py-2 pr-4">Delivery</th>
                                <th className="py-2 pr-4">Compliance</th>
                                <th className="py-2 pr-4">Status</th>
                                <th className="py-2">Actions</th>
                              </tr>
                            </thead>
                            <tbody>
                              {(bids[tender.id] || []).map(bid => (
                                <tr key={bid.id} className="border-b last:border-0" data-testid={`row-bid-${bid.id}`}>
                                  <td className="py-2 pr-4 font-medium" data-testid={`text-bid-exporter-${bid.id}`}>{bid.exporter_org?.name || 'Unknown'}</td>
                                  <td className="py-2 pr-4" data-testid={`text-bid-price-${bid.id}`}>{Number(bid.price_per_mt).toLocaleString()} {tender.currency}</td>
                                  <td className="py-2 pr-4">{Number(bid.quantity_available_mt).toLocaleString()} MT</td>
                                  <td className="py-2 pr-4">{bid.delivery_date ? new Date(bid.delivery_date).toLocaleDateString() : '-'}</td>
                                  <td className="py-2 pr-4">
                                    <Badge variant={Number(bid.compliance_score) >= 70 ? 'default' : Number(bid.compliance_score) >= 40 ? 'secondary' : 'destructive'}>
                                      {Number(bid.compliance_score || 0).toFixed(0)}%
                                    </Badge>
                                  </td>
                                  <td className="py-2 pr-4">
                                    <Badge variant={BID_STATUS_VARIANT[bid.status] || 'outline'}>{bid.status}</Badge>
                                  </td>
                                  <td className="py-2">
                                    {bid.status === 'submitted' && tender.status !== 'awarded' && (
                                      <Button size="sm" onClick={() => handleAwardBid(tender.id, bid.id)} data-testid={`button-award-${bid.id}`}>
                                        <Award className="h-4 w-4 mr-1" />
                                        Award
                                      </Button>
                                    )}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
