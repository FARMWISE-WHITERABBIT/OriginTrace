'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Plus, Search, FileCheck, Calendar, Package } from 'lucide-react';

interface Contract {
  id: string;
  contract_reference: string;
  commodity: string;
  quantity_mt: number | null;
  status: string;
  delivery_deadline: string | null;
  destination_port: string | null;
  quality_requirements: Record<string, unknown>;
  notes: string | null;
  created_at: string;
  exporter_org?: { id: string; name: string; slug: string };
}

interface SupplyChainLink {
  id: string;
  status: string;
  exporter_org?: { id: string; name: string; slug: string };
}

const STATUS_VARIANT: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  active: 'default',
  draft: 'outline',
  fulfilled: 'secondary',
  cancelled: 'destructive',
};

export default function BuyerContractsPage() {
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [links, setLinks] = useState<SupplyChainLink[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [newContract, setNewContract] = useState({
    exporter_org_id: '',
    commodity: '',
    quantity_mt: '',
    delivery_deadline: '',
    destination_port: '',
    quality_requirements: '',
    notes: '',
  });
  const { toast } = useToast();

  const fetchData = async () => {
    try {
      const [contractsRes, linksRes] = await Promise.all([
        fetch('/api/contracts'),
        fetch('/api/supply-chain-links'),
      ]);
      if (contractsRes.ok) {
        const d = await contractsRes.json();
        setContracts(d.contracts || []);
      }
      if (linksRes.ok) {
        const d = await linksRes.json();
        setLinks((d.links || []).filter((l: SupplyChainLink) => l.status === 'active'));
      }
    } catch (error) {
      console.error('Failed to fetch contracts:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const handleCreate = async () => {
    if (!newContract.exporter_org_id || !newContract.commodity) {
      toast({ title: 'Missing fields', description: 'Exporter and commodity are required.', variant: 'destructive' });
      return;
    }
    setIsCreating(true);
    try {
      const body: Record<string, unknown> = {
        exporter_org_id: newContract.exporter_org_id,
        commodity: newContract.commodity,
        notes: newContract.notes || undefined,
        destination_port: newContract.destination_port || undefined,
        delivery_deadline: newContract.delivery_deadline || undefined,
      };
      if (newContract.quantity_mt) body.quantity_mt = parseFloat(newContract.quantity_mt);
      if (newContract.quality_requirements) {
        try { body.quality_requirements = JSON.parse(newContract.quality_requirements); } catch { /* skip */ }
      }

      const response = await fetch('/api/contracts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Failed to create contract');
      }
      const data = await response.json();
      toast({ title: 'Contract created', description: `Contract ${data.contract?.contract_reference || ''} created.` });
      setDialogOpen(false);
      setNewContract({ exporter_org_id: '', commodity: '', quantity_mt: '', delivery_deadline: '', destination_port: '', quality_requirements: '', notes: '' });
      fetchData();
    } catch (error: unknown) {
      toast({ title: 'Error', description: error instanceof Error ? error.message : 'Failed', variant: 'destructive' });
    } finally {
      setIsCreating(false);
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
      || (c.commodity || '').toLowerCase().includes(q)
      || c.exporter_org?.name?.toLowerCase().includes(q);
  });

  return (
    <div className="flex-1 space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight" data-testid="text-page-title">Contracts</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage purchase contracts with your suppliers</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-new-contract">
              <Plus className="h-4 w-4 mr-2" />
              New Contract
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>New Contract</DialogTitle>
              <DialogDescription>Create a purchase contract with a linked exporter.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Exporter</Label>
                <Select value={newContract.exporter_org_id} onValueChange={v => setNewContract(c => ({ ...c, exporter_org_id: v }))}>
                  <SelectTrigger data-testid="select-exporter">
                    <SelectValue placeholder="Select linked exporter" />
                  </SelectTrigger>
                  <SelectContent>
                    {links.map(l => (
                      <SelectItem key={l.exporter_org?.id || l.id} value={l.exporter_org?.id || ''}>
                        {l.exporter_org?.name || 'Unknown'}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="commodity">Commodity</Label>
                <Input id="commodity" placeholder="e.g. Cocoa Beans" value={newContract.commodity} onChange={e => setNewContract(c => ({ ...c, commodity: e.target.value }))} data-testid="input-commodity" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="quantity">Quantity (MT)</Label>
                  <Input id="quantity" type="number" placeholder="e.g. 50" value={newContract.quantity_mt} onChange={e => setNewContract(c => ({ ...c, quantity_mt: e.target.value }))} data-testid="input-quantity" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="deadline">Delivery Deadline</Label>
                  <Input id="deadline" type="date" value={newContract.delivery_deadline} onChange={e => setNewContract(c => ({ ...c, delivery_deadline: e.target.value }))} data-testid="input-deadline" />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="port">Destination Port</Label>
                <Input id="port" placeholder="e.g. Rotterdam, Hamburg" value={newContract.destination_port} onChange={e => setNewContract(c => ({ ...c, destination_port: e.target.value }))} data-testid="input-port" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="quality">Quality Requirements (JSON, optional)</Label>
                <Textarea id="quality" placeholder='{"moisture_max": 7.5, "grade": "A"}' value={newContract.quality_requirements} onChange={e => setNewContract(c => ({ ...c, quality_requirements: e.target.value }))} data-testid="input-quality" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="notes">Notes (optional)</Label>
                <Textarea id="notes" placeholder="Additional contract notes..." value={newContract.notes} onChange={e => setNewContract(c => ({ ...c, notes: e.target.value }))} data-testid="input-notes" />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)} data-testid="button-cancel-contract">Cancel</Button>
              <Button onClick={handleCreate} disabled={isCreating} data-testid="button-confirm-contract">
                {isCreating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Create Contract
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Search contracts..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-9" data-testid="input-search-contracts" />
      </div>

      {isLoading ? (
        <div className="space-y-3">{Array.from({length:3}).map((_,i)=><div key={i} className="border border-border rounded-xl p-4 bg-card space-y-3"><div className="flex justify-between items-center"><div className="h-4 w-40 bg-muted animate-pulse rounded"/><div className="h-5 w-16 bg-muted animate-pulse rounded-full"/></div><div className="h-3 w-56 bg-muted animate-pulse rounded"/><div className="h-3 w-32 bg-muted animate-pulse rounded"/></div>)}</div>
      ) : filteredContracts.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <FileCheck className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-1">No contracts yet</h3>
            <p className="text-sm text-muted-foreground mb-4 max-w-md">
              Create a contract with one of your linked exporters to start tracking deliveries.
            </p>
            <Button onClick={() => setDialogOpen(true)} data-testid="button-create-first-contract">
              <Plus className="h-4 w-4 mr-2" />
              Create First Contract
            </Button>
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
                        <span>{contract.exporter_org?.name || 'Unknown Exporter'}</span>
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
                        {contract.destination_port && <span>{contract.destination_port}</span>}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    {contract.status === 'draft' && (
                      <Button variant="outline" size="sm" onClick={() => handleStatusChange(contract.id, 'active')} data-testid={`button-activate-${contract.id}`}>
                        Activate
                      </Button>
                    )}
                    {contract.status === 'active' && (
                      <Button variant="outline" size="sm" onClick={() => handleStatusChange(contract.id, 'fulfilled')} data-testid={`button-fulfill-${contract.id}`}>
                        Mark Fulfilled
                      </Button>
                    )}
                    {(contract.status === 'draft' || contract.status === 'active') && (
                      <Button variant="outline" size="sm" onClick={() => handleStatusChange(contract.id, 'cancelled')} data-testid={`button-cancel-${contract.id}`}>
                        Cancel
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
  );
}
