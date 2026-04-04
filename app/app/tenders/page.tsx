'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { TierGate } from '@/components/tier-gate';
import { Loader2, Search, Store, Calendar, Package, DollarSign, Send, CheckCircle, Clock } from 'lucide-react';

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
  created_at: string;
  closes_at: string | null;
  buyer_org?: { id: string; name: string; slug: string; country: string | null };
  my_bid?: { id: string; status: string; price_per_mt: number; quantity_available_mt: number } | null;
}

export default function ExporterTendersPage() {
  const [tenders, setTenders] = useState<Tender[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [commodityFilter, setCommodityFilter] = useState('all');
  const [bidDialogOpen, setBidDialogOpen] = useState(false);
  const [selectedTender, setSelectedTender] = useState<Tender | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newBid, setNewBid] = useState({
    price_per_mt: '',
    quantity_available_mt: '',
    delivery_date: '',
    notes: '',
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

  const openBidDialog = (tender: Tender) => {
    setSelectedTender(tender);
    setNewBid({ price_per_mt: '', quantity_available_mt: '', delivery_date: '', notes: '' });
    setBidDialogOpen(true);
  };

  const handleSubmitBid = async () => {
    if (!selectedTender || !newBid.price_per_mt || !newBid.quantity_available_mt) {
      toast({ title: 'Missing fields', description: 'Price and quantity are required.', variant: 'destructive' });
      return;
    }
    setIsSubmitting(true);
    try {
      const body: Record<string, unknown> = {
        price_per_mt: parseFloat(newBid.price_per_mt),
        quantity_available_mt: parseFloat(newBid.quantity_available_mt),
      };
      if (newBid.delivery_date) body.delivery_date = newBid.delivery_date;
      if (newBid.notes) body.notes = newBid.notes;

      const response = await fetch(`/api/tenders/${selectedTender.id}/bids`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Failed to submit bid');
      }
      toast({ title: 'Bid submitted', description: 'Your bid has been submitted successfully.' });
      setBidDialogOpen(false);
      fetchTenders();
    } catch (error: unknown) {
      toast({ title: 'Error', description: error instanceof Error ? error.message : 'Failed', variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const commodities = [...new Set(tenders.map(t => t.commodity))];

  const filteredTenders = tenders.filter(t => {
    if (commodityFilter !== 'all' && t.commodity !== commodityFilter) return false;
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return t.title.toLowerCase().includes(q) || t.commodity.toLowerCase().includes(q) || t.buyer_org?.name?.toLowerCase().includes(q);
  });

  return (
    <TierGate feature="spot_market" requiredTier="pro" featureLabel="Spot Market & Tenders">
    <div className="flex-1 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight" data-testid="text-page-title">Marketplace</h1>
        <p className="text-sm text-muted-foreground mt-1">Browse open tenders and submit bids</p>
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search tenders..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-9" data-testid="input-search-marketplace" />
        </div>
        <Select value={commodityFilter} onValueChange={setCommodityFilter}>
          <SelectTrigger className="w-[180px]" data-testid="select-commodity-filter">
            <SelectValue placeholder="All Commodities" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Commodities</SelectItem>
            {commodities.map(c => (
              <SelectItem key={c} value={c}>{c}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="space-y-3">{Array.from({length:3}).map((_,i)=><div key={i} className="border border-border rounded-xl p-4 bg-card space-y-3"><div className="flex justify-between items-center"><div className="h-4 w-40 bg-muted animate-pulse rounded"/><div className="h-5 w-16 bg-muted animate-pulse rounded-full"/></div><div className="h-3 w-56 bg-muted animate-pulse rounded"/><div className="h-3 w-32 bg-muted animate-pulse rounded"/></div>)}</div>
      ) : filteredTenders.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <Store className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-1">No open tenders</h3>
            <p className="text-sm text-muted-foreground max-w-md">
              There are no tenders matching your criteria right now. Check back later.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {filteredTenders.map(tender => (
            <Card key={tender.id} className="card-accent-blue transition-shadow hover:shadow-md" data-testid={`card-tender-${tender.id}`}>
              <CardContent className="py-4">
                <div className="flex items-center justify-between gap-4 flex-wrap">
                  <div className="flex items-center gap-4 min-w-0">
                    <div className="h-10 w-10 rounded-md icon-bg-blue flex items-center justify-center shrink-0">
                      <Store className="h-5 w-5" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium" data-testid={`text-tender-title-${tender.id}`}>{tender.title}</span>
                        {tender.regulation_framework && (
                          <Badge variant="outline">{tender.regulation_framework.replace(/_/g, ' ')}</Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground flex-wrap">
                        {tender.buyer_org && <span className="font-medium text-foreground">{tender.buyer_org.name}</span>}
                        <span>{tender.commodity}</span>
                        <span className="flex items-center gap-1"><Package className="h-3 w-3" />{Number(tender.quantity_mt).toLocaleString()} MT</span>
                        {tender.target_price_per_mt && (
                          <span className="flex items-center gap-1"><DollarSign className="h-3 w-3" />Target: {Number(tender.target_price_per_mt).toLocaleString()} {tender.currency}/MT</span>
                        )}
                        {tender.delivery_deadline && (
                          <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />Due: {new Date(tender.delivery_deadline).toLocaleDateString()}</span>
                        )}
                        {tender.destination_country && <span>{tender.destination_country}</span>}
                        {tender.destination_port && <span>{tender.destination_port}</span>}
                      </div>
                      {tender.certifications_required && tender.certifications_required.length > 0 && (
                        <div className="flex items-center gap-1 mt-1 flex-wrap">
                          {tender.certifications_required.map((cert, i) => (
                            <Badge key={i} variant="secondary">{cert}</Badge>
                          ))}
                        </div>
                      )}
                      {tender.closes_at && (
                        <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          Closes: {new Date(tender.closes_at).toLocaleString()}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    {tender.my_bid ? (
                      <div className="flex items-center gap-2">
                        <Badge variant={tender.my_bid.status === 'awarded' ? 'default' : tender.my_bid.status === 'rejected' ? 'destructive' : 'secondary'} data-testid={`badge-my-bid-${tender.id}`}>
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Bid: {tender.my_bid.status}
                        </Badge>
                        <span className="text-sm text-muted-foreground">{Number(tender.my_bid.price_per_mt).toLocaleString()} {tender.currency}/MT</span>
                      </div>
                    ) : (
                      <Button onClick={() => openBidDialog(tender)} data-testid={`button-bid-${tender.id}`}>
                        <Send className="h-4 w-4 mr-2" />
                        Submit Bid
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={bidDialogOpen} onOpenChange={setBidDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Submit Bid</DialogTitle>
            <DialogDescription>
              {selectedTender && (
                <span>Bidding on: {selectedTender.title} ({selectedTender.commodity}, {Number(selectedTender.quantity_mt).toLocaleString()} MT)</span>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="bid-price">Your Price / MT ({selectedTender?.currency || 'USD'})</Label>
              <Input id="bid-price" type="number" placeholder="e.g. 3200" value={newBid.price_per_mt} onChange={e => setNewBid(b => ({ ...b, price_per_mt: e.target.value }))} data-testid="input-bid-price" />
              {selectedTender?.target_price_per_mt && (
                <p className="text-xs text-muted-foreground">Target price: {Number(selectedTender.target_price_per_mt).toLocaleString()} {selectedTender.currency}/MT</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="bid-quantity">Quantity Available (MT)</Label>
              <Input id="bid-quantity" type="number" placeholder="e.g. 50" value={newBid.quantity_available_mt} onChange={e => setNewBid(b => ({ ...b, quantity_available_mt: e.target.value }))} data-testid="input-bid-quantity" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="bid-delivery">Delivery Date</Label>
              <Input id="bid-delivery" type="date" value={newBid.delivery_date} onChange={e => setNewBid(b => ({ ...b, delivery_date: e.target.value }))} data-testid="input-bid-delivery" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="bid-notes">Notes (optional)</Label>
              <Textarea id="bid-notes" placeholder="Any additional information..." value={newBid.notes} onChange={e => setNewBid(b => ({ ...b, notes: e.target.value }))} data-testid="input-bid-notes" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBidDialogOpen(false)} data-testid="button-cancel-bid">Cancel</Button>
            <Button onClick={handleSubmitBid} disabled={isSubmitting} data-testid="button-confirm-bid">
              {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Submit Bid
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
    </TierGate>
  );
}
