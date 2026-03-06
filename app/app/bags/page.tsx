'use client';

import { useState, useEffect } from 'react';
import { useOrg } from '@/lib/contexts/org-context';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Package, Plus, Search } from 'lucide-react';
import { TierGate } from '@/components/tier-gate';

interface Bag {
  id: string;
  serial: string;
  status: string;
  batch_id: string | null;
  created_at: string;
}

export default function BagsPage() {
  const [bags, setBags] = useState<Bag[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [batchCount, setBatchCount] = useState(10);
  const [dialogOpen, setDialogOpen] = useState(false);
  const { organization, profile, isSystemAdmin, isLoading: orgLoading } = useOrg();
  const { toast } = useToast();

  const fetchBags = async () => {
    if (orgLoading) return;
    if (!organization) {
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch('/api/bags');
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to fetch bags');
      }
      const data = await response.json();
      setBags(data.bags || []);
    } catch (error) {
      console.error('Failed to fetch bags:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchBags();
  }, [organization, orgLoading]);

  const generateBatch = async () => {
    if (!organization) return;

    setIsGenerating(true);
    
    try {
      const response = await fetch('/api/bags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ count: Math.min(batchCount, 100) }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to generate bags');
      }

      const data = await response.json();

      toast({
        title: 'Batch Generated',
        description: `Created ${data.count} new bags with batch ID ${data.batchId}`,
      });

      setDialogOpen(false);
      fetchBags();
    } catch (error) {
      console.error('Failed to generate bags:', error);
      toast({
        title: 'Error',
        description: 'Failed to generate bag batch',
        variant: 'destructive',
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const filteredBags = bags.filter(bag => 
    bag.serial.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (bag.batch_id && bag.batch_id.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'collected':
        return <Badge className="bg-blue-600">Collected</Badge>;
      case 'processed':
        return <Badge className="bg-green-600">Processed</Badge>;
      default:
        return <Badge variant="secondary">Unused</Badge>;
    }
  };

  const stats = {
    total: bags.length,
    unused: bags.filter(b => b.status === 'unused').length,
    collected: bags.filter(b => b.status === 'collected').length,
    processed: bags.filter(b => b.status === 'processed').length,
  };

  const isAdmin = profile?.role === 'admin' || isSystemAdmin;

  return (
    <TierGate feature="bags" requiredTier="pro" featureLabel="Bags">
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Bags</h1>
          <p className="text-muted-foreground">
            Manage bag inventory and generate new batches
          </p>
        </div>
        {isAdmin && (
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button data-testid="button-generate-batch">
                <Plus className="h-4 w-4 mr-2" />
                Generate Batch
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Generate Bag Batch</DialogTitle>
                <DialogDescription>
                  Create a new batch of unique bag identifiers for field distribution.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="batchCount">Number of Bags (max 100)</Label>
                  <Input
                    id="batchCount"
                    type="number"
                    min={1}
                    max={100}
                    value={batchCount}
                    onChange={(e) => setBatchCount(Math.min(100, Math.max(1, parseInt(e.target.value) || 1)))}
                    data-testid="input-batch-count"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
                <Button onClick={generateBatch} disabled={isGenerating} data-testid="button-confirm-generate">
                  {isGenerating ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    `Generate ${batchCount} Bags`
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">{stats.total}</div>
            <div className="text-sm text-muted-foreground">Total Bags</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-gray-600">{stats.unused}</div>
            <div className="text-sm text-muted-foreground">Unused</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-blue-600">{stats.collected}</div>
            <div className="text-sm text-muted-foreground">Collected</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-green-600">{stats.processed}</div>
            <div className="text-sm text-muted-foreground">Processed</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div>
              <CardTitle>Bag Inventory</CardTitle>
              <CardDescription>All registered bag identifiers</CardDescription>
            </div>
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search bags..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
                data-testid="input-search-bags"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center h-32">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : filteredBags.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>{searchQuery ? 'No bags match your search' : 'No bags in inventory yet'}</p>
              {isAdmin && !searchQuery && (
                <p className="mt-2 text-sm">Click "Generate Batch" to create new bags</p>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Serial Number</TableHead>
                    <TableHead>Batch ID</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredBags.slice(0, 100).map((bag) => (
                    <TableRow key={bag.id} data-testid={`bag-row-${bag.id}`}>
                      <TableCell className="font-mono">{bag.serial}</TableCell>
                      <TableCell>{bag.batch_id || '-'}</TableCell>
                      <TableCell>{getStatusBadge(bag.status)}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {new Date(bag.created_at).toLocaleDateString()}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {filteredBags.length > 100 && (
                <p className="text-center text-sm text-muted-foreground mt-4">
                  Showing first 100 of {filteredBags.length} bags
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
    </TierGate>
  );
}
