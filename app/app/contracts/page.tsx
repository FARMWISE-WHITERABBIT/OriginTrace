'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { TierGate } from '@/components/tier-gate';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Search, FileCheck, Calendar, Package, Ship, Link2 } from 'lucide-react';

interface Contract {
  id: string;
  contract_reference: string;
  commodity: string;
  quantity_mt: number | null;
  status: string;
  delivery_deadline: string | null;
  destination_port: string | null;
  notes: string | null;
  created_at: string;
  buyer_org?: { id: string; name: string; slug: string };
}

interface Shipment {
  id: string;
  shipment_code: string;
  status: string;
}

const STATUS_VARIANT: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  active: 'default',
  draft: 'outline',
  fulfilled: 'secondary',
  cancelled: 'destructive',
};

export default function ExporterContractsPage() {
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [linkDialogOpen, setLinkDialogOpen] = useState(false);
  const [selectedContract, setSelectedContract] = useState<string>('');
  const [selectedShipment, setSelectedShipment] = useState<string>('');
  const [isLinking, setIsLinking] = useState(false);
  const { toast } = useToast();

  const fetchData = async () => {
    try {
      const [contractsRes, shipmentsRes] = await Promise.all([
        fetch('/api/contracts'),
        fetch('/api/shipments'),
      ]);
      if (contractsRes.ok) {
        const d = await contractsRes.json();
        setContracts(d.contracts || []);
      }
      if (shipmentsRes.ok) {
        const d = await shipmentsRes.json();
        setShipments(d.shipments || []);
      }
    } catch (error) {
      console.error('Failed to fetch contracts:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const handleLinkShipment = async () => {
    if (!selectedContract || !selectedShipment) {
      toast({ title: 'Missing selection', description: 'Select both contract and shipment.', variant: 'destructive' });
      return;
    }
    setIsLinking(true);
    try {
      const response = await fetch('/api/contracts', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contract_id: selectedContract, shipment_id: selectedShipment }),
      });
      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Failed to link');
      }
      toast({ title: 'Linked', description: 'Shipment linked to contract successfully.' });
      setLinkDialogOpen(false);
      setSelectedContract('');
      setSelectedShipment('');
    } catch (error: unknown) {
      toast({ title: 'Error', description: error instanceof Error ? error.message : 'Failed', variant: 'destructive' });
    } finally {
      setIsLinking(false);
    }
  };

  const handleStatusChange = async (contractId: string, newStatus: string) => {
    try {
      const response = await fetch('/api/contracts', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contract_id: contractId, status: newStatus }),
      });
      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Failed to update');
      }
      toast({ title: 'Updated', description: `Contract status changed to ${newStatus}.` });
      fetchData();
    } catch (error: unknown) {
      toast({ title: 'Error', description: error instanceof Error ? error.message : 'Failed', variant: 'destructive' });
    }
  };

  const filteredContracts = contracts.filter(c => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return c.contract_reference.toLowerCase().includes(q)
      || c.commodity.toLowerCase().includes(q)
      || c.buyer_org?.name?.toLowerCase().includes(q);
  });

  return (
    <TierGate feature="contracts" requiredTier="pro" featureLabel="Contract Management">
      <div className="flex-1 space-y-6">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight" data-testid="text-page-title">Buyer Contracts</h1>
            <p className="text-sm text-muted-foreground mt-1">View and manage contracts from your buyers</p>
          </div>
          <Button variant="outline" onClick={() => setLinkDialogOpen(true)} data-testid="button-link-shipment">
            <Link2 className="h-4 w-4 mr-2" />
            Link Shipment
          </Button>
        </div>

        <Dialog open={linkDialogOpen} onOpenChange={setLinkDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Link Shipment to Contract</DialogTitle>
              <DialogDescription>Associate a shipment with a buyer contract for tracking.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Contract</Label>
                <Select value={selectedContract} onValueChange={setSelectedContract}>
                  <SelectTrigger data-testid="select-link-contract">
                    <SelectValue placeholder="Select contract" />
                  </SelectTrigger>
                  <SelectContent>
                    {contracts.filter(c => c.status === 'active').map(c => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.contract_reference} - {c.buyer_org?.name || 'Unknown'}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Shipment</Label>
                <Select value={selectedShipment} onValueChange={setSelectedShipment}>
                  <SelectTrigger data-testid="select-link-shipment">
                    <SelectValue placeholder="Select shipment" />
                  </SelectTrigger>
                  <SelectContent>
                    {shipments.map(s => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.shipment_code} ({s.status})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setLinkDialogOpen(false)} data-testid="button-cancel-link">Cancel</Button>
              <Button onClick={handleLinkShipment} disabled={isLinking} data-testid="button-confirm-link">
                {isLinking && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Link Shipment
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search contracts..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-9" data-testid="input-search-contracts" />
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : filteredContracts.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16 text-center">
              <FileCheck className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-1">No contracts from buyers</h3>
              <p className="text-sm text-muted-foreground max-w-md" data-testid="text-no-contracts">
                Contracts created by connected buyers will appear here. Accept buyer invitations to get started.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {filteredContracts.map(contract => (
              <Card key={contract.id} data-testid={`card-contract-${contract.id}`}>
                <CardContent className="py-4">
                  <div className="flex items-center justify-between gap-4 flex-wrap">
                    <div className="flex items-center gap-4 min-w-0">
                      <div className="h-10 w-10 rounded-md bg-muted flex items-center justify-center shrink-0">
                        <FileCheck className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono text-sm font-medium" data-testid={`text-contract-ref-${contract.id}`}>
                            {contract.contract_reference}
                          </span>
                          <Badge variant={STATUS_VARIANT[contract.status] || 'outline'} data-testid={`badge-contract-status-${contract.id}`}>
                            {contract.status}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground flex-wrap">
                          <span>{contract.buyer_org?.name || 'Unknown Buyer'}</span>
                          <span>{contract.commodity}</span>
                          {contract.quantity_mt && (
                            <span className="flex items-center gap-1">
                              <Package className="h-3 w-3" />
                              {Number(contract.quantity_mt).toLocaleString()} MT
                            </span>
                          )}
                          {contract.delivery_deadline && (
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {new Date(contract.delivery_deadline).toLocaleDateString()}
                            </span>
                          )}
                          {contract.destination_port && (
                            <span className="flex items-center gap-1">
                              <Ship className="h-3 w-3" />
                              {contract.destination_port}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      {contract.status === 'active' && (
                        <Button variant="outline" size="sm" onClick={() => handleStatusChange(contract.id, 'fulfilled')} data-testid={`button-fulfill-${contract.id}`}>
                          Mark Fulfilled
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </TierGate>
  );
}
