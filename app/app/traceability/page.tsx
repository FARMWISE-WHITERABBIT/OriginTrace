'use client';

import { useState, useEffect } from 'react';
import { useOrg } from '@/lib/contexts/org-context';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { TraceabilityTimeline } from '@/components/traceability-timeline';
import { SupplyChainGraph } from '@/components/supply-chain-graph';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Search, Package, AlertTriangle, Network, Database, Users, MapPin } from 'lucide-react';
import Link from 'next/link';
import { TierGate } from '@/components/tier-gate';

interface TraceContributor {
  farmer_name: string | null;
  weight_kg: number;
  bag_count: number;
  farm_id: string | null;
  community: string | null;
  compliance_status: string | null;
}

interface TraceResult {
  bag: {
    serial: string;
    status: string;
  };
  farm: {
    farmer_name: string;
    community: string;
    compliance_status: string;
    created_at: string;
    boundary?: any;
  } | null;
  collection: {
    weight: number;
    grade: string;
    collected_at: string;
  } | null;
  agent: {
    full_name: string;
  } | null;
  contributors: TraceContributor[];
}

export default function TraceabilityPage() {
  const [searchSerial, setSearchSerial] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [result, setResult] = useState<TraceResult | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [flaggedCount, setFlaggedCount] = useState(0);
  const { organization } = useOrg();
  const { toast } = useToast();

  useEffect(() => {
    fetch('/api/yield-validation')
      .then(res => res.json())
      .then(data => setFlaggedCount(data.flaggedBatches?.length || 0))
      .catch(() => {});
  }, []);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!organization || !searchSerial.trim()) {
      return;
    }

    setIsSearching(true);
    setResult(null);
    setNotFound(false);

    try {
      const response = await fetch(`/api/traceability?serial=${encodeURIComponent(searchSerial.trim())}`);
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Search failed');
      }

      const data = await response.json();

      if (!data.found) {
        setNotFound(true);
        setIsSearching(false);
        return;
      }

      setResult({
        bag: data.bag,
        farm: data.farm,
        collection: data.collection,
        agent: data.agent,
        contributors: data.contributors || [],
      });
      setSheetOpen(true);
    } catch (error) {
      console.error('Search error:', error);
      toast({
        title: 'Search Error',
        description: 'Failed to search for bag',
        variant: 'destructive',
      });
    } finally {
      setIsSearching(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'collected':
        return <Badge className="bg-blue-600">Collected</Badge>;
      case 'verified':
        return <Badge className="bg-green-600">Verified</Badge>;
      case 'processed':
        return <Badge className="bg-purple-600">Processed</Badge>;
      default:
        return <Badge variant="secondary">Unused</Badge>;
    }
  };

  return (
    <TierGate feature="traceability" requiredTier="starter" featureLabel="Traceability">
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Traceability</h1>
        <p className="text-muted-foreground">
          Track produce from farm to warehouse and visualize your supply chain
        </p>
      </div>

      {flaggedCount > 0 && (
        <Link href="/app/yield-alerts">
          <Card className="border-amber-500 bg-amber-50 dark:bg-amber-950/20 cursor-pointer hover:border-amber-600 transition-colors max-w-2xl" data-testid="flagged-batches-alert">
            <CardContent className="py-4">
              <div className="flex items-center gap-3">
                <AlertTriangle className="h-5 w-5 text-amber-500" />
                <div className="flex-1">
                  <p className="font-medium text-amber-700 dark:text-amber-400">
                    {flaggedCount} batch{flaggedCount !== 1 ? 'es' : ''} flagged for yield review
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Click to review batches with yield anomalies
                  </p>
                </div>
                <Badge variant="destructive">{flaggedCount}</Badge>
              </div>
            </CardContent>
          </Card>
        </Link>
      )}

      <Tabs defaultValue="search" className="space-y-4">
        <TabsList data-testid="tabs-traceability">
          <TabsTrigger value="search" data-testid="tab-bag-search">
            <Search className="h-4 w-4 mr-1.5" />
            Bag Search
          </TabsTrigger>
          <TabsTrigger value="graph" data-testid="tab-network-graph">
            <Network className="h-4 w-4 mr-1.5" />
            Network Graph
          </TabsTrigger>
        </TabsList>

        <TabsContent value="search">
          <div className="space-y-6 max-w-2xl">
            <Card>
              <CardHeader>
                <CardTitle>Search by Bag Serial</CardTitle>
                <CardDescription>
                  Enter a bag serial number to trace its complete journey
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSearch} className="flex gap-3">
                  <div className="flex-1">
                    <Input
                      value={searchSerial}
                      onChange={(e) => setSearchSerial(e.target.value.toUpperCase())}
                      placeholder="e.g., FW-B123-0001"
                      className="touch-target font-mono"
                      data-testid="input-trace-serial"
                    />
                  </div>
                  <Button type="submit" disabled={isSearching || !searchSerial.trim()} data-testid="button-search">
                    {isSearching ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Search className="h-4 w-4" />
                    )}
                  </Button>
                </form>
              </CardContent>
            </Card>

            {/* Pre-search guidance — shown before user has searched */}
            {!result && !notFound && !isSearching && !searchSerial && (
              <div className="rounded-xl border border-dashed border-slate-200 dark:border-slate-700 p-8 text-center">
                <Database className="h-10 w-10 mx-auto mb-4 text-muted-foreground opacity-40" />
                <p className="font-medium text-slate-700 dark:text-slate-300 mb-1">Trace any bag in your supply chain</p>
                <p className="text-sm text-muted-foreground max-w-xs mx-auto mb-4">
                  Enter a bag serial number to see the complete journey — from the source farm through collection, processing, and shipment.
                </p>
                <div className="flex flex-wrap justify-center gap-4 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full bg-emerald-500 inline-block" />Farm origin & GPS location</span>
                  <span className="flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full bg-blue-500 inline-block" />Collection batch & agent</span>
                  <span className="flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full bg-violet-500 inline-block" />Processing & shipment chain</span>
                </div>
              </div>
            )}

            {notFound && (
              <Card className="border-orange-500/50">
                <CardContent className="py-8 text-center">
                  <Package className="h-12 w-12 mx-auto mb-4 text-orange-500" />
                  <h3 className="text-lg font-semibold">Bag Not Found</h3>
                  <p className="text-muted-foreground">
                    No bag with serial "{searchSerial}" was found in your organization.
                  </p>
                </CardContent>
              </Card>
            )}

            {result && !sheetOpen && (
              <Card 
                className="cursor-pointer hover:border-primary/50 transition-colors"
                onClick={() => setSheetOpen(true)}
                data-testid="trace-result"
              >
                <CardHeader>
                  <div className="flex items-center justify-between gap-4">
                    <CardTitle className="font-mono">{result.bag.serial}</CardTitle>
                    {getStatusBadge(result.bag.status)}
                  </div>
                  <CardDescription>
                    {result.farm ? `${result.farm.farmer_name} - ${result.farm.community}` : 'No collection data'}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Click to view full traceability timeline
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        <TabsContent value="graph">
          <SupplyChainGraph />
        </TabsContent>
      </Tabs>

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="overflow-y-auto sm:max-w-lg">
          <SheetHeader>
            <SheetTitle>Traceability Timeline</SheetTitle>
            <SheetDescription>
              Complete journey from farm to verification
            </SheetDescription>
          </SheetHeader>
          
          {result && (
            <div className="mt-6 space-y-6">
              <TraceabilityTimeline
                bagId={result.bag.serial}
                farmData={result.farm ? {
                  farmerName: result.farm.farmer_name,
                  community: result.farm.community,
                  mappedAt: result.farm.created_at,
                  mappedBy: result.agent?.full_name || 'Field Agent',
                  coordinates: result.farm.boundary?.coordinates?.[0]?.length
                } : undefined}
                collectionData={result.collection ? {
                  weight: result.collection.weight,
                  grade: result.collection.grade,
                  collectedAt: result.collection.collected_at,
                  agentName: result.agent?.full_name || 'Field Agent'
                } : undefined}
                aggregationData={result.bag.status === 'verified' || result.bag.status === 'processed' ? {
                  warehouse: 'Main Warehouse',
                  aggregatorName: 'Aggregator',
                  receivedAt: result.collection?.collected_at
                } : undefined}
                verificationData={{
                  complianceStatus: result.farm?.compliance_status || 'pending',
                  verifiedAt: result.farm?.compliance_status === 'approved' ? result.collection?.collected_at : undefined,
                  verifiedBy: result.farm?.compliance_status === 'approved' ? 'Admin' : undefined
                }}
              />

              {result.contributors.length > 1 && (
                <div className="border rounded-lg overflow-hidden" data-testid="section-contributors">
                  <div className="flex items-center gap-2 px-3 py-2 bg-muted/50 border-b">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <p className="text-sm font-medium">Contributing Farmers</p>
                    <span className="ml-auto text-xs text-muted-foreground">{result.contributors.length} farms</span>
                  </div>
                  <div className="divide-y">
                    {result.contributors.map((c, i) => (
                      <div key={c.farm_id ?? i} className="px-3 py-2.5 flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate" data-testid={`text-trace-contributor-${i}`}>
                            {c.farmer_name || 'Unknown Farmer'}
                          </p>
                          {c.community && (
                            <p className="text-xs text-muted-foreground flex items-center gap-1">
                              <MapPin className="h-3 w-3 shrink-0" />{c.community}
                            </p>
                          )}
                          <p className="text-xs text-muted-foreground">
                            {c.bag_count} bags · {Number(c.weight_kg).toLocaleString()} kg
                          </p>
                        </div>
                        <Badge
                          variant={c.compliance_status === 'verified' || c.compliance_status === 'approved' ? 'default' : c.compliance_status === 'rejected' ? 'destructive' : 'secondary'}
                          className="text-[10px] shrink-0"
                        >
                          {c.compliance_status || 'unknown'}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
    </TierGate>
  );
}
