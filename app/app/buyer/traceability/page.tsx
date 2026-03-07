'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, Database, FileCheck } from 'lucide-react';

interface ContractTrace {
  id: string;
  contract_reference: string;
  commodity: string;
  status: string;
  exporter_org?: { id: string; name: string };
}

export default function BuyerTraceabilityPage() {
  const [contracts, setContracts] = useState<ContractTrace[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const response = await fetch('/api/contracts');
        if (!response.ok) throw new Error('Failed to fetch');
        const data = await response.json();
        setContracts(
          (data.contracts || []).filter((c: ContractTrace) => c.status === 'active' || c.status === 'fulfilled')
        );
      } catch (error) {
        console.error('Failed to fetch traceability data:', error);
      } finally {
        setIsLoading(false);
      }
    }
    fetchData();
  }, []);

  return (
    <div className="flex-1 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight" data-testid="text-page-title">Traceability</h1>
        <p className="text-sm text-muted-foreground mt-1">View traceability data for your contracted goods</p>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : contracts.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <Database className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-1">No traceability data</h3>
            <p className="text-sm text-muted-foreground max-w-md">
              Traceability information will be available once your contracts are active and exporters share supply chain data.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {contracts.map(contract => (
            <Card key={contract.id} data-testid={`card-trace-${contract.id}`}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between gap-4 flex-wrap">
                  <div className="flex items-center gap-3">
                    <FileCheck className="h-5 w-5 text-muted-foreground" />
                    <CardTitle className="text-base" data-testid={`text-trace-ref-${contract.id}`}>
                      {contract.contract_reference}
                    </CardTitle>
                    <Badge variant="default">{contract.status}</Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Commodity</span>
                    <p className="font-medium">{contract.commodity}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Exporter</span>
                    <p className="font-medium">{contract.exporter_org?.name || 'N/A'}</p>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mt-4">
                  Full traceability chain data shared by the exporter will appear here for active contracts.
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
