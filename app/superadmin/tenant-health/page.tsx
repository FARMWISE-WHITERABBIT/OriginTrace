'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, TrendingUp, TrendingDown, Minus, AlertTriangle, Building2, Users, Package, Scale } from 'lucide-react';

interface TenantMetric {
  org_id: number;
  org_name: string;
  subscription_tier: string;
  org_created_at: string;
  total_users: number;
  agent_count: number;
  total_farms: number;
  total_batches: number;
  flagged_batches: number;
  total_weight_kg: number;
  last_collection_date: string | null;
  growth_trend: 'growing' | 'stable' | 'declining';
}

interface FlaggedBatch {
  id: number;
  org_id: number;
  farm_id: number;
  total_weight: number;
  status: string;
  yield_flag_reason: string | null;
  created_at: string;
  farms: { farmer_name: string; area_hectares: number; commodity: string } | null;
  organizations: { name: string } | null;
}

interface Summary {
  total_orgs: number;
  growing_orgs: number;
  total_flagged: number;
  total_weight: number;
}

export default function TenantHealthPage() {
  const [metrics, setMetrics] = useState<TenantMetric[]>([]);
  const [flaggedBatches, setFlaggedBatches] = useState<FlaggedBatch[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchTenantHealth();
  }, []);

  const fetchTenantHealth = async () => {
    try {
      const response = await fetch('/api/tenant-health');
      if (response.ok) {
        const data = await response.json();
        setMetrics(data.metrics || []);
        setFlaggedBatches(data.flaggedBatches || []);
        setSummary(data.summary);
      }
    } catch (error) {
      console.error('Failed to fetch tenant health:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'growing':
        return <TrendingUp className="h-4 w-4 text-green-500" />;
      case 'declining':
        return <TrendingDown className="h-4 w-4 text-red-500" />;
      default:
        return <Minus className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getTierBadge = (tier: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'outline'> = {
      enterprise: 'default',
      pro: 'secondary',
      basic: 'secondary',
      starter: 'outline'
    };
    const labels: Record<string, string> = { starter: 'Starter', basic: 'Basic', pro: 'Pro', enterprise: 'Enterprise' };
    return <Badge variant={variants[tier] || 'outline'} className="capitalize">{labels[tier] || tier}</Badge>;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Tenant Health Dashboard</h1>
        <p className="text-muted-foreground">Monitor organization growth and flag high-risk batches</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 gap-2">
            <CardTitle className="text-sm font-medium">Total Organizations</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary?.total_orgs || 0}</div>
            <p className="text-xs text-muted-foreground">
              {summary?.growing_orgs || 0} growing this month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 gap-2">
            <CardTitle className="text-sm font-medium">Active Agents</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {metrics.reduce((sum, m) => sum + m.agent_count, 0)}
            </div>
            <p className="text-xs text-muted-foreground">Across all organizations</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 gap-2">
            <CardTitle className="text-sm font-medium">Total Volume</CardTitle>
            <Scale className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {((summary?.total_weight || 0) / 1000).toFixed(1)}t
            </div>
            <p className="text-xs text-muted-foreground">Total collected weight</p>
          </CardContent>
        </Card>

        <Card className={summary?.total_flagged ? 'border-amber-500' : ''}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 gap-2">
            <CardTitle className="text-sm font-medium">Flagged Batches</CardTitle>
            <AlertTriangle className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">{summary?.total_flagged || 0}</div>
            <p className="text-xs text-muted-foreground">Requiring review</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="organizations" className="space-y-4">
        <TabsList>
          <TabsTrigger value="organizations" data-testid="tab-organizations">Organizations</TabsTrigger>
          <TabsTrigger value="flagged" data-testid="tab-flagged">
            Flagged Batches
            {(summary?.total_flagged || 0) > 0 && (
              <Badge variant="destructive" className="ml-2">{summary?.total_flagged}</Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="organizations">
          <Card>
            <CardHeader>
              <CardTitle>Organization Health Metrics</CardTitle>
              <CardDescription>View growth trends and activity for all organizations</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Organization</TableHead>
                    <TableHead>Tier</TableHead>
                    <TableHead>Trend</TableHead>
                    <TableHead className="text-right">Users</TableHead>
                    <TableHead className="text-right">Farms</TableHead>
                    <TableHead className="text-right">Batches</TableHead>
                    <TableHead className="text-right">Flagged</TableHead>
                    <TableHead className="text-right">Volume (kg)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {metrics.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                        No organizations found
                      </TableCell>
                    </TableRow>
                  ) : (
                    metrics.map((org) => (
                      <TableRow key={org.org_id} data-testid={`org-row-${org.org_id}`}>
                        <TableCell className="font-medium">{org.org_name}</TableCell>
                        <TableCell>{getTierBadge(org.subscription_tier)}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            {getTrendIcon(org.growth_trend)}
                            <span className="text-sm capitalize">{org.growth_trend}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">{org.total_users}</TableCell>
                        <TableCell className="text-right">{org.total_farms}</TableCell>
                        <TableCell className="text-right">{org.total_batches}</TableCell>
                        <TableCell className="text-right">
                          {org.flagged_batches > 0 ? (
                            <Badge variant="destructive">{org.flagged_batches}</Badge>
                          ) : (
                            <span className="text-muted-foreground">0</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">{Number(org.total_weight_kg).toLocaleString()}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="flagged">
          <Card>
            <CardHeader>
              <CardTitle>Flagged Batches</CardTitle>
              <CardDescription>Batches flagged for yield anomalies requiring review</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Organization</TableHead>
                    <TableHead>Farmer</TableHead>
                    <TableHead>Commodity</TableHead>
                    <TableHead className="text-right">Area (ha)</TableHead>
                    <TableHead className="text-right">Weight (kg)</TableHead>
                    <TableHead>Reason</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {flaggedBatches.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                        No flagged batches
                      </TableCell>
                    </TableRow>
                  ) : (
                    flaggedBatches.map((batch) => (
                      <TableRow key={batch.id} data-testid={`flagged-batch-${batch.id}`}>
                        <TableCell className="font-medium">{batch.organizations?.name || 'Unknown'}</TableCell>
                        <TableCell>{batch.farms?.farmer_name || 'Unknown'}</TableCell>
                        <TableCell className="capitalize">{batch.farms?.commodity || '-'}</TableCell>
                        <TableCell className="text-right">{batch.farms?.area_hectares?.toFixed(2) || '-'}</TableCell>
                        <TableCell className="text-right">{Number(batch.total_weight).toLocaleString()}</TableCell>
                        <TableCell className="max-w-[200px] truncate text-sm text-muted-foreground">
                          {batch.yield_flag_reason || 'Yield exceeds threshold'}
                        </TableCell>
                        <TableCell>{new Date(batch.created_at).toLocaleDateString()}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
