'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Loader2, Search, Ship, Package } from 'lucide-react';

interface ContractShipment {
  id: string;
  contract_id: string;
  shipment_id: string;
  contract?: {
    contract_reference: string;
    commodity: string;
    exporter_org?: { name: string };
  };
}

export default function BuyerShipmentsPage() {
  const [shipments, setShipments] = useState<ContractShipment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    async function fetchShipments() {
      try {
        const response = await fetch('/api/buyer');
        if (!response.ok) throw new Error('Failed to fetch');
        const data = await response.json();
        const contracts = data.recentContracts || [];
        const contractShipments: ContractShipment[] = contracts
          .filter((c: Record<string, unknown>) => c.status === 'active' || c.status === 'fulfilled')
          .map((c: Record<string, string>) => ({
            id: c.id,
            contract_id: c.id,
            shipment_id: c.id,
            contract: {
              contract_reference: c.contract_reference,
              commodity: c.commodity,
            },
          }));
        setShipments(contractShipments);
      } catch (error) {
        console.error('Failed to fetch shipments:', error);
      } finally {
        setIsLoading(false);
      }
    }
    fetchShipments();
  }, []);

  const filteredShipments = shipments.filter(s => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return s.contract?.contract_reference?.toLowerCase().includes(q)
      || s.contract?.commodity?.toLowerCase().includes(q);
  });

  return (
    <div className="flex-1 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight" data-testid="text-page-title">Shipments</h1>
        <p className="text-sm text-muted-foreground mt-1">Track shipments linked to your contracts</p>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Search shipments..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-9" data-testid="input-search-shipments" />
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : filteredShipments.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <Ship className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-1">No shipments yet</h3>
            <p className="text-sm text-muted-foreground max-w-md">
              Shipments will appear here once exporters link them to your contracts.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {filteredShipments.map(shipment => (
            <Card key={shipment.id} data-testid={`card-shipment-${shipment.id}`}>
              <CardContent className="py-4">
                <div className="flex items-center gap-4">
                  <div className="h-10 w-10 rounded-md bg-muted flex items-center justify-center shrink-0">
                    <Package className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-sm font-medium" data-testid={`text-shipment-ref-${shipment.id}`}>
                        {shipment.contract?.contract_reference || 'N/A'}
                      </span>
                      <Badge variant="outline">Contract Linked</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      {shipment.contract?.commodity || 'Unknown commodity'}
                    </p>
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
