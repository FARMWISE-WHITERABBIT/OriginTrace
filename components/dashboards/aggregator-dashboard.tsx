'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useOrg } from '@/lib/contexts/org-context';
import { createClient } from '@/lib/supabase/client';
import {
  Package,
  CheckCircle,
  Clock,
  Scale,
  ArrowRight,
  Truck,
  AlertTriangle,
  TrendingUp,
  Users,
  Plus
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

interface AggregatorStats {
  totalBatches: number;
  collectingBatches: number;
  resolvedBatches: number;
  dispatchedBatches: number;
  totalWeight: number;
  todayWeight: number;
  weekWeight: number;
  monthWeight: number;
  activeAgents: number;
  complianceScore: number;
  flaggedBatches: number;
}

export function AggregatorDashboard() {
  const [stats, setStats] = useState<AggregatorStats>({
    totalBatches: 0,
    collectingBatches: 0,
    resolvedBatches: 0,
    dispatchedBatches: 0,
    totalWeight: 0,
    todayWeight: 0,
    weekWeight: 0,
    monthWeight: 0,
    activeAgents: 0,
    complianceScore: 0,
    flaggedBatches: 0
  });
  const [isLoading, setIsLoading] = useState(true);
  const { organization } = useOrg();
  const supabase = createClient();

  useEffect(() => {
    async function fetchStats() {
      if (!supabase || !organization) return;

      try {
        const now = new Date();
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
        const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

        const [
          batchesRes,
          collectingRes,
          resolvedRes,
          dispatchedRes,
          flaggedRes,
          todayWeightRes,
          weekWeightRes,
          monthWeightRes,
          agentsRes,
          allWeightRes
        ] = await Promise.all([
          supabase.from('collection_batches').select('id', { count: 'exact', head: true }).eq('org_id', organization.id),
          supabase.from('collection_batches').select('id', { count: 'exact', head: true }).eq('org_id', organization.id).eq('status', 'collecting'),
          supabase.from('collection_batches').select('id', { count: 'exact', head: true }).eq('org_id', organization.id).eq('status', 'resolved'),
          supabase.from('collection_batches').select('id', { count: 'exact', head: true }).eq('org_id', organization.id).eq('status', 'dispatched'),
          supabase.from('collection_batches').select('id', { count: 'exact', head: true }).eq('org_id', organization.id).not('yield_flag_reason', 'is', null),
          supabase.from('collection_batches').select('total_weight').eq('org_id', organization.id).gte('created_at', todayStart),
          supabase.from('collection_batches').select('total_weight').eq('org_id', organization.id).gte('created_at', weekStart),
          supabase.from('collection_batches').select('total_weight').eq('org_id', organization.id).gte('created_at', monthStart),
          supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('org_id', organization.id).eq('role', 'agent'),
          supabase.from('collection_batches').select('total_weight').eq('org_id', organization.id).eq('status', 'dispatched'),
        ]);

        const todayWeight = todayWeightRes.data?.reduce((sum, b) => sum + Number(b.total_weight || 0), 0) || 0;
        const weekWeight = weekWeightRes.data?.reduce((sum, b) => sum + Number(b.total_weight || 0), 0) || 0;
        const monthWeight = monthWeightRes.data?.reduce((sum, b) => sum + Number(b.total_weight || 0), 0) || 0;
        const totalWeight = allWeightRes.data?.reduce((sum, b) => sum + Number(b.total_weight || 0), 0) || 0;

        const total = batchesRes.count || 0;
        const flagged = flaggedRes.count || 0;
        const complianceScore = total > 0 ? Math.round(((total - flagged) / total) * 100) : 100;

        setStats({
          totalBatches: total,
          collectingBatches: collectingRes.count || 0,
          resolvedBatches: resolvedRes.count || 0,
          dispatchedBatches: dispatchedRes.count || 0,
          totalWeight,
          todayWeight,
          weekWeight,
          monthWeight,
          activeAgents: agentsRes.count || 0,
          complianceScore,
          flaggedBatches: flagged
        });
      } catch (error) {
        console.error('Failed to fetch stats:', error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchStats();
  }, [organization, supabase]);

  const statCards = [
    { title: 'Total Batches', value: stats.totalBatches, icon: Package, color: 'text-blue-600' },
    { title: 'Open Batches', value: stats.collectingBatches + stats.resolvedBatches, icon: Clock, color: 'text-orange-600' },
    { title: 'Dispatched', value: stats.dispatchedBatches, icon: Truck, color: 'text-green-600' },
    { title: 'Field Agents', value: stats.activeAgents, icon: Users, color: 'text-purple-600' },
  ];

  const weightCards = [
    { label: 'Today', value: stats.todayWeight },
    { label: 'This Week', value: stats.weekWeight },
    { label: 'This Month', value: stats.monthWeight },
    { label: 'Total Dispatched', value: stats.totalWeight },
  ];

  return (
    <>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat) => (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
              <stat.icon className={`h-4 w-4 ${stat.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {isLoading ? '...' : stat.value}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Scale className="h-5 w-5" />
              Weight Summary
            </CardTitle>
            <CardDescription>Collection volumes by time period</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {weightCards.map((item) => (
                <div key={item.label} className="text-center p-4 rounded-lg bg-muted/50">
                  <p className="text-sm text-muted-foreground">{item.label}</p>
                  <p className="text-2xl font-bold mt-1">
                    {isLoading ? '...' : item.value.toLocaleString()}
                  </p>
                  <p className="text-xs text-muted-foreground">kg</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              Compliance Health
            </CardTitle>
            <CardDescription>Batch quality status</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-center">
              <div className="text-4xl font-bold text-green-600">
                {isLoading ? '...' : `${stats.complianceScore}%`}
              </div>
              <p className="text-sm text-muted-foreground">Compliance Score</p>
            </div>
            <Progress value={stats.complianceScore} className="h-2" />
            {stats.flaggedBatches > 0 && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-800">
                <AlertTriangle className="h-4 w-4 text-orange-600" />
                <span className="text-sm text-orange-700 dark:text-orange-400">
                  {stats.flaggedBatches} batch{stats.flaggedBatches !== 1 ? 'es' : ''} flagged
                </span>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-orange-500" />
              Open Batches
            </CardTitle>
            <CardDescription>Batches awaiting resolution or dispatch</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">Collecting</Badge>
                  <span className="font-medium">{stats.collectingBatches}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="default">Ready to Dispatch</Badge>
                  <span className="font-medium">{stats.resolvedBatches}</span>
                </div>
              </div>
              {(stats.collectingBatches > 0 || stats.resolvedBatches > 0) && (
                <Link href="/app/inventory">
                  <Button variant="outline" className="w-full" data-testid="button-view-inventory">
                    View Inventory
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </Link>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              Quick Actions
            </CardTitle>
            <CardDescription>Common operations</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Link href="/app/collect">
              <Button variant="outline" className="w-full justify-start" data-testid="button-record-batch">
                <Plus className="h-4 w-4 mr-2" />
                Record New Batch
              </Button>
            </Link>
            <Link href="/app/verify">
              <Button variant="outline" className="w-full justify-start" data-testid="button-scan-verify">
                <Package className="h-4 w-4 mr-2" />
                Scan & Verify Bags
              </Button>
            </Link>
            <Link href="/app/traceability">
              <Button variant="outline" className="w-full justify-start" data-testid="button-trace-origin">
                <TrendingUp className="h-4 w-4 mr-2" />
                Trace Bag Origin
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
