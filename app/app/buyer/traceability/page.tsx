'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, Database, Search, TreePine, MapPin, Weight, CheckCircle2, AlertCircle, ChevronDown, ChevronRight, Network } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SupplyChainGraph } from '@/components/supply-chain-graph';

interface TraceFarm {
  farmer_name: string;
  community: string;
  commodity: string;
  compliance_status: string;
  area_hectares: number | null;
}

interface TraceBatch {
  id: string;
  status: string;
  total_weight: number;
  bag_count: number;
  collected_at: string;
  compliance_status: string;
  traceability_complete: boolean;
  farm: TraceFarm | null;
}

interface ContractTraceability {
  contract_id: string;
  contract_reference: string;
  commodity: string;
  status: string;
  exporter_name: string;
  shipment_count: number;
  batches: TraceBatch[];
  total_weight: number;
  farm_count: number;
}

const complianceIcons: Record<string, typeof CheckCircle2> = {
  approved: CheckCircle2,
  pending: AlertCircle,
};

export default function BuyerTraceabilityPage() {
  const [traceability, setTraceability] = useState<ContractTraceability[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedContracts, setExpandedContracts] = useState<Set<string>>(new Set());

  useEffect(() => {
    async function fetchData() {
      try {
        const response = await fetch('/api/buyer?section=traceability');
        if (!response.ok) throw new Error('Failed to fetch');
        const data = await response.json();
        setTraceability(data.traceability || []);
      } catch (error) {
        console.error('Failed to fetch traceability data:', error);
      } finally {
        setIsLoading(false);
      }
    }
    fetchData();
  }, []);

  const toggleExpand = (contractId: string) => {
    setExpandedContracts(prev => {
      const next = new Set(prev);
      if (next.has(contractId)) next.delete(contractId);
      else next.add(contractId);
      return next;
    });
  };

  const filtered = traceability.filter(t => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return t.contract_reference?.toLowerCase().includes(q)
      || t.commodity?.toLowerCase().includes(q)
      || t.exporter_name?.toLowerCase().includes(q)
      || t.batches?.some(b => b.farm?.farmer_name?.toLowerCase().includes(q) || b.farm?.community?.toLowerCase().includes(q));
  });

  const totalBatches = traceability.reduce((sum, t) => sum + t.batches.length, 0);
  const totalFarms = traceability.reduce((sum, t) => sum + t.farm_count, 0);
  const totalWeight = traceability.reduce((sum, t) => sum + t.total_weight, 0);

  return (
    <div className="flex-1 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight" data-testid="text-page-title">Traceability</h1>
        <p className="text-sm text-muted-foreground mt-1">View farm-to-export traceability data for your contracted goods</p>
      </div>

      <Tabs defaultValue="contracts" className="space-y-4">
        <TabsList data-testid="tabs-buyer-traceability">
          <TabsTrigger value="contracts" data-testid="tab-contracts-view">
            <TreePine className="h-4 w-4 mr-1.5" />
            Contracts
          </TabsTrigger>
          <TabsTrigger value="graph" data-testid="tab-supply-chain-map">
            <Network className="h-4 w-4 mr-1.5" />
            Supply Chain Map
          </TabsTrigger>
        </TabsList>

        <TabsContent value="contracts">
          {!isLoading && traceability.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              <Card>
                <CardContent className="pt-4 pb-4">
                  <p className="text-sm text-muted-foreground">Contracts</p>
                  <p className="text-2xl font-semibold mt-1" data-testid="text-total-contracts">{traceability.length}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4 pb-4">
                  <p className="text-sm text-muted-foreground">Batches Traced</p>
                  <p className="text-2xl font-semibold mt-1" data-testid="text-total-batches">{totalBatches}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4 pb-4">
                  <p className="text-sm text-muted-foreground">Source Farms</p>
                  <p className="text-2xl font-semibold mt-1" data-testid="text-total-farms">{totalFarms}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4 pb-4">
                  <p className="text-sm text-muted-foreground">Total Weight</p>
                  <p className="text-2xl font-semibold mt-1" data-testid="text-total-weight">{totalWeight.toLocaleString()} kg</p>
                </CardContent>
              </Card>
            </div>
          )}

          <div className="relative mt-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by contract, commodity, farmer, or community..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="pl-9"
              data-testid="input-search-traceability"
            />
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : filtered.length === 0 ? (
            <Card className="mt-4">
              <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                <Database className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-1">No traceability data</h3>
                <p className="text-sm text-muted-foreground max-w-md">
                  Traceability information will be available once your contracts are active and exporters share supply chain data.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 mt-4">
              {filtered.map(contract => {
                const isExpanded = expandedContracts.has(contract.contract_id);
                return (
                  <Card key={contract.contract_id} data-testid={`card-trace-${contract.contract_id}`}>
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between gap-4 flex-wrap">
                        <div className="flex items-center gap-3 flex-wrap">
                          <TreePine className="h-5 w-5 text-muted-foreground shrink-0" />
                          <CardTitle className="text-base" data-testid={`text-trace-ref-${contract.contract_id}`}>
                            {contract.contract_reference}
                          </CardTitle>
                          <Badge variant="default">{contract.status}</Badge>
                          <span className="text-sm text-muted-foreground">{contract.commodity}</span>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleExpand(contract.contract_id)}
                          data-testid={`button-expand-${contract.contract_id}`}
                        >
                          {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                          <span className="ml-1 text-xs">{contract.batches.length} batches</span>
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
                        <div>
                          <span className="text-muted-foreground">Exporter</span>
                          <p className="font-medium">{contract.exporter_name}</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Shipments</span>
                          <p className="font-medium">{contract.shipment_count}</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Source Farms</span>
                          <p className="font-medium">{contract.farm_count}</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Total Weight</span>
                          <p className="font-medium">{contract.total_weight.toLocaleString()} kg</p>
                        </div>
                      </div>

                      {isExpanded && contract.batches.length > 0 && (
                        <div className="mt-4 space-y-3 border-t pt-4">
                          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Supply Chain Details</p>
                          {contract.batches.map((batch, index) => (
                            <div
                              key={batch.id || index}
                              className="rounded-md border p-3 space-y-2"
                              data-testid={`card-batch-${batch.id}`}
                            >
                              <div className="flex items-center justify-between gap-3 flex-wrap">
                                <div className="flex items-center gap-2">
                                  <span className="text-sm font-medium">Batch</span>
                                  {batch.traceability_complete ? (
                                    <Badge variant="default" className="text-xs">
                                      <CheckCircle2 className="h-3 w-3 mr-1" />
                                      Traced
                                    </Badge>
                                  ) : (
                                    <Badge variant="outline" className="text-xs">
                                      <AlertCircle className="h-3 w-3 mr-1" />
                                      Partial
                                    </Badge>
                                  )}
                                  <Badge variant="secondary" className="text-xs">{batch.status}</Badge>
                                </div>
                                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                                  <span className="flex items-center gap-1">
                                    <Weight className="h-3 w-3" />
                                    {batch.total_weight} kg
                                  </span>
                                  <span>{batch.bag_count} bags</span>
                                  {batch.collected_at && (
                                    <span>{new Date(batch.collected_at).toLocaleDateString()}</span>
                                  )}
                                </div>
                              </div>

                              {batch.farm && (
                                <div className="rounded-md bg-muted/50 p-2.5 text-sm">
                                  <div className="flex items-center gap-1.5 mb-1">
                                    <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                                    <span className="font-medium text-xs">Source Farm</span>
                                  </div>
                                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                                    <div>
                                      <span className="text-muted-foreground">Farmer</span>
                                      <p className="font-medium">{batch.farm.farmer_name}</p>
                                    </div>
                                    <div>
                                      <span className="text-muted-foreground">Community</span>
                                      <p className="font-medium">{batch.farm.community}</p>
                                    </div>
                                    <div>
                                      <span className="text-muted-foreground">Area</span>
                                      <p className="font-medium">{batch.farm.area_hectares ? `${batch.farm.area_hectares} ha` : 'N/A'}</p>
                                    </div>
                                    <div>
                                      <span className="text-muted-foreground">Compliance</span>
                                      <p className="font-medium capitalize">{batch.farm.compliance_status}</p>
                                    </div>
                                  </div>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}

                      {isExpanded && contract.batches.length === 0 && (
                        <div className="mt-4 border-t pt-4">
                          <p className="text-sm text-muted-foreground text-center py-4">
                            No batch-level traceability data shared yet for this contract.
                          </p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="graph">
          <SupplyChainGraph isBuyer />
        </TabsContent>
      </Tabs>
    </div>
  );
}
