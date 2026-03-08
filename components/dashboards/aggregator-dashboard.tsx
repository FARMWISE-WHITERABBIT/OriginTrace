'use client';

import { useEffect, useState, useCallback } from 'react';
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
  TrendingDown,
  Minus,
  Users,
  Plus,
  BarChart3,
  Leaf,
  Wheat
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import {
  PieDonutChart,
  VerticalBarChart,
  HorizontalBarChart,
} from '@/components/charts';

type Period = '7d' | '30d' | '90d' | '1y';

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

interface VolumeTrend {
  date: string;
  weight: number;
  bags: number;
  batches: number;
}

const PERIOD_OPTIONS: { value: Period; label: string }[] = [
  { value: '7d', label: '7D' },
  { value: '30d', label: '30D' },
  { value: '90d', label: '90D' },
  { value: '1y', label: '1Y' },
];

function TrendIndicator({ value }: { value: number }) {
  if (value > 0) {
    return (
      <span className="flex items-center gap-0.5 text-xs text-green-600 dark:text-green-400" data-testid="trend-up">
        <TrendingUp className="h-3 w-3" />
        +{value}%
      </span>
    );
  }
  if (value < 0) {
    return (
      <span className="flex items-center gap-0.5 text-xs text-red-600 dark:text-red-400" data-testid="trend-down">
        <TrendingDown className="h-3 w-3" />
        {value}%
      </span>
    );
  }
  return (
    <span className="flex items-center gap-0.5 text-xs text-muted-foreground" data-testid="trend-flat">
      <Minus className="h-3 w-3" />
      0%
    </span>
  );
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
  const [volumeTrends, setVolumeTrends] = useState<VolumeTrend[]>([]);
  const [trendPeriod, setTrendPeriod] = useState<Period>('30d');
  const [weightTrend, setWeightTrend] = useState(0);
  const [isTrendLoading, setIsTrendLoading] = useState(true);
  const [commodityData, setCommodityData] = useState<Array<{ name: string; value: number }>>([]);
  const [gradeData, setGradeData] = useState<Array<{ grade: string; count: number }>>([]);
  const [agentData, setAgentData] = useState<Array<{ name: string; weight: number }>>([]);
  const [deforestationData, setDeforestationData] = useState<Array<{ name: string; value: number }>>([]);
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
  }, [organization]);

  const fetchTrends = useCallback(async () => {
    if (!organization) return;
    setIsTrendLoading(true);
    try {
      const res = await fetch(`/api/analytics?period=${trendPeriod}`);
      if (res.ok) {
        const data = await res.json();
        setVolumeTrends(data.volumeTrends || []);
        setWeightTrend(data.weightSummary?.trend || 0);

        if (data.commodityBreakdown) {
          setCommodityData(
            data.commodityBreakdown.map((c: any) => ({ name: c.name, value: Math.round(c.weight) }))
          );
        }

        if (data.gradeDistribution) {
          setGradeData(data.gradeDistribution);
        }

        if (data.agentPerformance) {
          setAgentData(
            data.agentPerformance.slice(0, 10).map((a: any) => ({
              name: a.name,
              weight: Math.round(a.weight),
            }))
          );
        }

        if (data.deforestationRisk) {
          setDeforestationData(
            data.deforestationRisk.map((d: any) => ({ name: d.level, value: d.count }))
          );
        }
      }
    } catch (error) {
      console.error('Failed to fetch trends:', error);
    } finally {
      setIsTrendLoading(false);
    }
  }, [organization, trendPeriod]);

  useEffect(() => {
    fetchTrends();
  }, [fetchTrends]);

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

  const DEFORESTATION_COLORS = ['#2E7D6B', '#6FB8A8', '#E9A23B', '#D84315'];

  return (
    <div data-testid="aggregator-dashboard">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat) => (
          <Card key={stat.title} data-testid={`stat-${stat.title.toLowerCase().replace(/\s+/g, '-')}`}>
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
              <stat.icon className={`h-4 w-4 ${stat.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid={`value-${stat.title.toLowerCase().replace(/\s+/g, '-')}`}>
                {isLoading ? '...' : stat.value}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card data-testid="card-volume-trends" className="mt-4">
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Volume Trends
              </CardTitle>
              <CardDescription>Collection weight over time</CardDescription>
            </div>
            <div className="flex items-center gap-1" data-testid="aggregator-period-selector">
              {PERIOD_OPTIONS.map((opt) => (
                <Button
                  key={opt.value}
                  variant={trendPeriod === opt.value ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setTrendPeriod(opt.value)}
                  data-testid={`button-agg-period-${opt.value}`}
                >
                  {opt.label}
                </Button>
              ))}
              {weightTrend !== 0 && <TrendIndicator value={weightTrend} />}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isTrendLoading ? (
            <div className="h-[250px] flex items-center justify-center text-muted-foreground">
              Loading chart...
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={250}>
              <AreaChart data={volumeTrends}>
                <defs>
                  <linearGradient id="aggWeightGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 12 }}
                  className="text-muted-foreground"
                  tickFormatter={(val) => {
                    if (trendPeriod === '1y') return val;
                    const d = new Date(val);
                    return `${d.getMonth() + 1}/${d.getDate()}`;
                  }}
                />
                <YAxis tick={{ fontSize: 12 }} className="text-muted-foreground" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '6px',
                  }}
                  labelStyle={{ color: 'hsl(var(--foreground))' }}
                  formatter={(value) => [`${Number(value || 0).toLocaleString()} kg`, 'Weight']}
                />
                <Area
                  type="monotone"
                  dataKey="weight"
                  stroke="hsl(var(--primary))"
                  fill="url(#aggWeightGradient)"
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 mt-4">
        <Card data-testid="card-commodity-distribution">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wheat className="h-5 w-5" />
              Commodity Distribution
            </CardTitle>
            <CardDescription>Collection volume by commodity</CardDescription>
          </CardHeader>
          <CardContent>
            {isTrendLoading ? (
              <div className="h-[280px] flex items-center justify-center text-muted-foreground">
                Loading chart...
              </div>
            ) : commodityData.length === 0 ? (
              <div className="h-[280px] flex items-center justify-center text-muted-foreground" data-testid="text-no-commodity-data">
                No commodity data available
              </div>
            ) : (
              <PieDonutChart
                data={commodityData}
                donut
                height={280}
                labelFormatter={(name, value) => `${value.toLocaleString()} kg`}
              />
            )}
          </CardContent>
        </Card>

        <Card data-testid="card-grade-distribution">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Grade Distribution
            </CardTitle>
            <CardDescription>Bags by quality grade</CardDescription>
          </CardHeader>
          <CardContent>
            {isTrendLoading ? (
              <div className="h-[280px] flex items-center justify-center text-muted-foreground">
                Loading chart...
              </div>
            ) : gradeData.length === 0 ? (
              <div className="h-[280px] flex items-center justify-center text-muted-foreground" data-testid="text-no-grade-data">
                No grade data available
              </div>
            ) : (
              <VerticalBarChart
                data={gradeData}
                dataKey="count"
                categoryKey="grade"
                height={280}
                barLabel="Bags"
                colors={['#2E7D6B', '#1F5F52', '#6FB8A8', '#3A9B8A', '#8ECDC0']}
              />
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 mt-4">
        <Card data-testid="card-agent-ranking">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Agent Performance Ranking
            </CardTitle>
            <CardDescription>Top agents by collection weight (kg)</CardDescription>
          </CardHeader>
          <CardContent>
            {isTrendLoading ? (
              <div className="h-[280px] flex items-center justify-center text-muted-foreground">
                Loading chart...
              </div>
            ) : agentData.length === 0 ? (
              <div className="h-[280px] flex items-center justify-center text-muted-foreground" data-testid="text-no-agent-data">
                No agent data available
              </div>
            ) : (
              <HorizontalBarChart
                data={agentData}
                dataKey="weight"
                categoryKey="name"
                height={280}
                barLabel="Weight (kg)"
                valueFormatter={(v) => `${v.toLocaleString()} kg`}
              />
            )}
          </CardContent>
        </Card>

        <Card data-testid="card-deforestation-risk">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Leaf className="h-5 w-5" />
              Deforestation Risk
            </CardTitle>
            <CardDescription>Farm risk distribution</CardDescription>
          </CardHeader>
          <CardContent>
            {isTrendLoading ? (
              <div className="h-[280px] flex items-center justify-center text-muted-foreground">
                Loading chart...
              </div>
            ) : deforestationData.length === 0 ? (
              <div className="h-[280px] flex items-center justify-center text-muted-foreground" data-testid="text-no-deforestation-data">
                No deforestation data available
              </div>
            ) : (
              <PieDonutChart
                data={deforestationData}
                donut
                height={280}
                colors={DEFORESTATION_COLORS}
              />
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 mt-4">
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
                <div key={item.label} className="text-center p-4 rounded-md bg-muted/50" data-testid={`weight-${item.label.toLowerCase().replace(/\s+/g, '-')}`}>
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

        <Card data-testid="card-compliance-health">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              Compliance Health
            </CardTitle>
            <CardDescription>Batch quality status</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-center">
              <div className="text-4xl font-bold text-green-600" data-testid="value-compliance-score">
                {isLoading ? '...' : `${stats.complianceScore}%`}
              </div>
              <p className="text-sm text-muted-foreground">Compliance Score</p>
            </div>
            <Progress value={stats.complianceScore} className="h-2" />
            {stats.flaggedBatches > 0 && (
              <div className="flex items-center gap-2 p-3 rounded-md bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-800" data-testid="alert-flagged-batches">
                <AlertTriangle className="h-4 w-4 text-orange-600" />
                <span className="text-sm text-orange-700 dark:text-orange-400">
                  {stats.flaggedBatches} batch{stats.flaggedBatches !== 1 ? 'es' : ''} flagged
                </span>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 mt-4">
        <Card data-testid="card-open-batches">
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
                  <span className="font-medium" data-testid="value-collecting">{stats.collectingBatches}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="default">Ready to Dispatch</Badge>
                  <span className="font-medium" data-testid="value-ready-dispatch">{stats.resolvedBatches}</span>
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

        <Card data-testid="card-quick-actions">
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
    </div>
  );
}
