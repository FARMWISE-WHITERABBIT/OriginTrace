'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { Loader2, Search, Ship, Package, MapPin, Calendar, Weight, ChevronRight } from 'lucide-react';
import { ShipmentProofPanel } from '@/components/buyer/shipment-proof-panel';

interface LinkedContract {
  id: string;
  contract_reference: string;
  commodity: string;
  status: string;
}

interface BuyerShipment {
  id: string;
  shipment_code: string;
  status: string;
  destination_country: string;
  destination_port: string;
  commodity: string;
  total_weight_kg: number;
  total_items: number;
  readiness_score: number | null;
  readiness_decision: string | null;
  estimated_ship_date: string | null;
  created_at: string;
  buyer_company: string;
  linked_contracts: LinkedContract[];
}

const statusColors: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  draft: 'secondary',
  planning: 'outline',
  packed: 'default',
  dispatched: 'default',
  in_transit: 'default',
  arrived: 'default',
  cleared: 'default',
};

const statusLabels: Record<string, string> = {
  draft: 'Draft',
  planning: 'Planning',
  packed: 'Packed',
  dispatched: 'Dispatched',
  in_transit: 'In Transit',
  arrived: 'Arrived',
  cleared: 'Cleared',
};

function getReadinessColor(score: number | null): string {
  if (score === null) return 'text-muted-foreground';
  if (score >= 80) return 'text-green-600 dark:text-green-400';
  if (score >= 60) return 'text-yellow-600 dark:text-yellow-400';
  return 'text-red-600 dark:text-red-400';
}

function getReadinessProgressColor(score: number | null): string {
  if (score === null) return '';
  if (score >= 80) return '[&>div]:bg-green-600';
  if (score >= 60) return '[&>div]:bg-yellow-600';
  return '[&>div]:bg-red-600';
}

export default function BuyerShipmentsPage() {
  const [shipments, setShipments] = useState<BuyerShipment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => {
    async function fetchShipments() {
      try {
        const response = await fetch('/api/buyer?section=shipments');
        if (!response.ok) throw new Error('Failed to fetch');
        const data = await response.json();
        setShipments(data.shipments || []);
      } catch (error) {
        console.error('Failed to fetch shipments:', error);
      } finally {
        setIsLoading(false);
      }
    }
    fetchShipments();
  }, []);

  const filteredShipments = shipments.filter(s => {
    if (statusFilter !== 'all' && s.status !== statusFilter) return false;
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return s.shipment_code?.toLowerCase().includes(q)
      || s.commodity?.toLowerCase().includes(q)
      || s.destination_country?.toLowerCase().includes(q)
      || s.linked_contracts?.some(c => c.contract_reference?.toLowerCase().includes(q));
  });

  const totalShipments = shipments.length;
  const inTransitCount = shipments.filter(s => s.status === 'in_transit' || s.status === 'dispatched').length;
  const avgReadiness = shipments.filter(s => s.readiness_score !== null).length > 0
    ? Math.round(shipments.filter(s => s.readiness_score !== null).reduce((sum, s) => sum + (s.readiness_score || 0), 0) / shipments.filter(s => s.readiness_score !== null).length)
    : null;

  return (
    <div className="flex-1 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight" data-testid="text-page-title">Shipments</h1>
        <p className="text-sm text-muted-foreground mt-1">Track shipments linked to your contracts</p>
      </div>

      {!isLoading && shipments.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card className="card-accent-blue transition-all duration-200 hover:shadow-md hover:-translate-y-0.5">
            <CardContent className="pt-4 pb-4">
              <p className="text-xs text-muted-foreground">Total Shipments</p>
              <p className="text-2xl font-semibold mt-1" data-testid="text-total-shipments">{totalShipments}</p>
            </CardContent>
          </Card>
          <Card className="card-accent-amber transition-all duration-200 hover:shadow-md hover:-translate-y-0.5">
            <CardContent className="pt-4 pb-4">
              <p className="text-xs text-muted-foreground">In Transit</p>
              <p className="text-2xl font-semibold mt-1" data-testid="text-in-transit">{inTransitCount}</p>
            </CardContent>
          </Card>
          <Card className="card-accent-emerald transition-all duration-200 hover:shadow-md hover:-translate-y-0.5">
            <CardContent className="pt-4 pb-4">
              <p className="text-xs text-muted-foreground">Avg. Readiness</p>
              <p className={`text-2xl font-semibold mt-1 ${getReadinessColor(avgReadiness)}`} data-testid="text-avg-readiness">
                {avgReadiness !== null ? `${avgReadiness}%` : 'N/A'}
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search shipments..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="pl-9"
            data-testid="input-search-shipments"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[160px]" data-testid="select-status-filter">
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="planning">Planning</SelectItem>
            <SelectItem value="packed">Packed</SelectItem>
            <SelectItem value="dispatched">Dispatched</SelectItem>
            <SelectItem value="in_transit">In Transit</SelectItem>
            <SelectItem value="arrived">Arrived</SelectItem>
            <SelectItem value="cleared">Cleared</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="space-y-3">{Array.from({length:3}).map((_,i)=><div key={i} className="border border-border rounded-xl p-4 bg-card space-y-3"><div className="flex justify-between items-center"><div className="h-4 w-40 bg-muted animate-pulse rounded"/><div className="h-5 w-16 bg-muted animate-pulse rounded-full"/></div><div className="h-3 w-56 bg-muted animate-pulse rounded"/><div className="h-3 w-32 bg-muted animate-pulse rounded"/></div>)}</div>
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
                <div className="flex items-start gap-4">
                  <div className="h-10 w-10 rounded-md bg-muted flex items-center justify-center shrink-0 mt-0.5">
                    <Package className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-0 space-y-3">
                    <div className="flex items-center justify-between gap-3 flex-wrap">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-sm font-medium" data-testid={`text-shipment-code-${shipment.id}`}>
                          {shipment.shipment_code || 'N/A'}
                        </span>
                        <Badge variant={statusColors[shipment.status] || 'outline'} data-testid={`badge-status-${shipment.id}`}>
                          {statusLabels[shipment.status] || shipment.status}
                        </Badge>
                      </div>
                      {shipment.readiness_score !== null && (
                        <div className="flex items-center gap-2">
                          <span className={`text-sm font-medium ${getReadinessColor(shipment.readiness_score)}`} data-testid={`text-readiness-${shipment.id}`}>
                            {shipment.readiness_score}% ready
                          </span>
                        </div>
                      )}
                    </div>

                    {shipment.readiness_score !== null && (
                      <Progress
                        value={shipment.readiness_score}
                        className={`h-1.5 ${getReadinessProgressColor(shipment.readiness_score)}`}
                      />
                    )}

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                      <div className="flex items-center gap-1.5 text-muted-foreground">
                        <Package className="h-3.5 w-3.5" />
                        <span>{shipment.commodity || 'N/A'}</span>
                      </div>
                      {shipment.destination_country && (
                        <div className="flex items-center gap-1.5 text-muted-foreground">
                          <MapPin className="h-3.5 w-3.5" />
                          <span>{shipment.destination_country}{shipment.destination_port ? ` (${shipment.destination_port})` : ''}</span>
                        </div>
                      )}
                      {shipment.total_weight_kg > 0 && (
                        <div className="flex items-center gap-1.5 text-muted-foreground">
                          <Weight className="h-3.5 w-3.5" />
                          <span>{shipment.total_weight_kg.toLocaleString()} kg</span>
                        </div>
                      )}
                      {shipment.estimated_ship_date && (
                        <div className="flex items-center gap-1.5 text-muted-foreground">
                          <Calendar className="h-3.5 w-3.5" />
                          <span>{new Date(shipment.estimated_ship_date).toLocaleDateString()}</span>
                        </div>
                      )}
                    </div>

                    {shipment.linked_contracts.length > 0 && (
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs text-muted-foreground">Contracts:</span>
                        {shipment.linked_contracts.map(contract => (
                          <Badge key={contract.id} variant="outline" className="text-xs" data-testid={`badge-contract-${contract.id}`}>
                            {contract.contract_reference}
                          </Badge>
                        ))}
                      </div>
                    )}

                    {shipment.readiness_decision && (
                      <div className="flex items-center gap-1.5 text-xs">
                        <ChevronRight className="h-3 w-3 text-muted-foreground" />
                        <span className="text-muted-foreground">Decision: </span>
                        <span className="font-medium capitalize">{shipment.readiness_decision.replace(/_/g, ' ')}</span>
                      </div>
                    )}

                    <ShipmentProofPanel shipmentId={shipment.id} />
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
