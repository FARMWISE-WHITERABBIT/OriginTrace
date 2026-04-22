'use client';

import { useEffect, useState, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useOrg } from '@/lib/contexts/org-context';
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
import { VIZ_COLORS, GRADE_COLORS, TOOLTIP_STYLE } from '@/lib/chart-colors';

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

  useEffect(() => {
    async function fetchStats() {
      if (!organization) return;

      try {
        const res = await fetch('/api/dashboard?role=aggregator');
        if (res.ok) {
          const data = await res.json();
          setStats(data);
        }
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
    {
      title: 'Total Batches',
      value: stats.totalBatches,
      icon: Package,
      iconClass: 'icon-bg-blue',
      accent: 'card-accent-blue',
      subtitle: 'All time',
    },
    {
      title: 'Open Batches',
      value: stats.collectingBatches + stats.resolvedBatches,
      icon: Clock,
      iconClass: 'icon-bg-amber',
      accent: 'card-accent-amber',
      subtitle: 'Needs attention',
    },
    {
      title: 'Dispatched',
      value: stats.dispatchedBatches,
      icon: Truck,
      iconClass: 'icon-bg-emerald',
      accent: 'card-accent-emerald',
      subtitle: 'Completed',
    },
    {
      title: 'Field Agents',
      value: stats.activeAgents,
      icon: Users,
      iconClass: 'icon-bg-violet',
      accent: 'card-accent-violet',
      subtitle: 'Active',
    },
  ];

  const weightCards = [
    { label: 'Today', value: stats.todayWeight },
    { label: 'This Week', value: stats.weekWeight },
    { label: 'This Month', value: stats.monthWeight },
    { label: 'Total Dispatched', value: stats.totalWeight },
  ];

  return (
    <div data-testid="aggregator-dashboard">
      {/* Dashboard Header */}
      <div className="flex items-center justify-between flex-wrap gap-3 mb-6">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">Collection Hub</h2>
          <p className="text-sm text-muted-foreground mt-0.5">Aggregation pipeline and batch performance</p>
        </div>
        <div className="flex items-center gap-3" data-testid="aggregator-period-selector">
          <div className="segmented-control">
            {PERIOD_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                className="segmented-control-item"
                data-active={trendPeriod === opt.value}
                onClick={() => setTrendPeriod(opt.value)}
                data-testid={`button-agg-period-${opt.value}`}
              >
                {opt.label}
              </button>
            ))}
          </div>
          {weightTrend !== 0 && <TrendIndicator value={weightTrend} />}
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat) => (
          <Card
            key={stat.title}
            className={`transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 ${stat.accent}`}
            data-testid={`stat-${stat.title.toLowerCase().replace(/\s+/g, '-')}`}
          >
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{stat.title}</CardTitle>
              <div className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 ${stat.iconClass}`}>
                <stat.icon className="h-4 w-4" />
              </div>
            </CardHeader>
            <CardContent>
              <div
                className="text-3xl font-bold tabular-nums tracking-tight"
                data-testid={`value-${stat.title.toLowerCase().replace(/\s+/g, '-')}`}
              >
                {isLoading ? '—' : stat.value}
              </div>
              <div className="mt-3 pt-3 border-t border-border/50 flex items-center justify-between">
                <span className="text-xs text-muted-foreground">{stat.subtitle || 'vs last period'}</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* ANALYTICS section divider */}
      <div className="flex items-center gap-3 my-6 text-xs text-muted-foreground uppercase tracking-wider font-medium">
        <div className="flex-1 h-px bg-border" />
        <span>ANALYTICS</span>
        <div className="flex-1 h-px bg-border" />
      </div>

      {/* Volume Trends */}
      <Card data-testid="card-volume-trends">
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2.5">
              <div className="h-7 w-7 rounded-md flex items-center justify-center icon-bg-blue shrink-0">
                <BarChart3 className="h-3.5 w-3.5" />
              </div>
              <div>
                <CardTitle className="text-sm font-semibold">Volume Trends</CardTitle>
                <CardDescription className="text-xs">Collection weight over time</CardDescription>
              </div>
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
                  contentStyle={TOOLTIP_STYLE}
                  labelStyle={{ color: 'hsl(var(--foreground))', fontWeight: 600 }}
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

      {/* COMMODITY & QUALITY section divider */}
      <div className="flex items-center gap-3 my-6 text-xs text-muted-foreground uppercase tracking-wider font-medium">
        <div className="flex-1 h-px bg-border" />
        <span>COMMODITY &amp; QUALITY</span>
        <div className="flex-1 h-px bg-border" />
      </div>

      {/* Commodity Distribution + Grade Distribution */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card data-testid="card-commodity-distribution">
          <CardHeader>
            <div className="flex items-center gap-2.5">
              <div className="h-7 w-7 rounded-md flex items-center justify-center icon-bg-emerald shrink-0">
                <Wheat className="h-3.5 w-3.5" />
              </div>
              <div>
                <CardTitle className="text-sm font-semibold">Commodity Distribution</CardTitle>
                <CardDescription className="text-xs">Collection volume by commodity</CardDescription>
              </div>
            </div>
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
            <div className="flex items-center gap-2.5">
              <div className="h-7 w-7 rounded-md flex items-center justify-center icon-bg-violet shrink-0">
                <BarChart3 className="h-3.5 w-3.5" />
              </div>
              <div>
                <CardTitle className="text-sm font-semibold">Grade Distribution</CardTitle>
                <CardDescription className="text-xs">Bags by quality grade</CardDescription>
              </div>
            </div>
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
                colors={Object.values(GRADE_COLORS)}
              />
            )}
          </CardContent>
        </Card>
      </div>

      {/* AGENT PERFORMANCE section divider */}
      <div className="flex items-center gap-3 my-6 text-xs text-muted-foreground uppercase tracking-wider font-medium">
        <div className="flex-1 h-px bg-border" />
        <span>AGENT PERFORMANCE</span>
        <div className="flex-1 h-px bg-border" />
      </div>

      {/* Agent Performance Ranking + Deforestation Risk */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card data-testid="card-agent-ranking">
          <CardHeader>
            <div className="flex items-center gap-2.5">
              <div className="h-7 w-7 rounded-md flex items-center justify-center icon-bg-blue shrink-0">
                <Users className="h-3.5 w-3.5" />
              </div>
              <div>
                <CardTitle className="text-sm font-semibold">Agent Performance Ranking</CardTitle>
                <CardDescription className="text-xs">Top agents by collection weight (kg)</CardDescription>
              </div>
            </div>
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
            <div className="flex items-center gap-2.5">
              <div className="h-7 w-7 rounded-md flex items-center justify-center icon-bg-red shrink-0">
                <Leaf className="h-3.5 w-3.5" />
              </div>
              <div>
                <CardTitle className="text-sm font-semibold">Deforestation Risk</CardTitle>
                <CardDescription className="text-xs">Farm risk distribution</CardDescription>
              </div>
            </div>
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
                colors={['#16A34A', '#DC2626', '#D97706', '#6B7280']}
              />
            )}
          </CardContent>
        </Card>
      </div>

      {/* BATCH STATUS section divider */}
      <div className="flex items-center gap-3 my-6 text-xs text-muted-foreground uppercase tracking-wider font-medium">
        <div className="flex-1 h-px bg-border" />
        <span>BATCH STATUS</span>
        <div className="flex-1 h-px bg-border" />
      </div>

      {/* Weight Summary + Compliance Health */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center gap-2.5">
              <div className="h-7 w-7 rounded-md flex items-center justify-center icon-bg-blue shrink-0">
                <Scale className="h-3.5 w-3.5" />
              </div>
              <div>
                <CardTitle className="text-sm font-semibold">Weight Summary</CardTitle>
                <CardDescription className="text-xs">Collection volumes by time period</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {weightCards.map((item) => (
                <div
                  key={item.label}
                  className="flex flex-col p-4 rounded-lg bg-muted/50 border border-border/50 hover:bg-muted/80 transition-colors"
                  data-testid={`weight-${item.label.toLowerCase().replace(/\s+/g, '-')}`}
                >
                  <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">{item.label}</p>
                  <p className="text-2xl font-bold tabular-nums mt-1.5">
                    {isLoading ? '—' : item.value.toLocaleString()}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">kg</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card data-testid="card-compliance-health">
          <CardHeader>
            <div className="flex items-center gap-2.5">
              <div className="h-7 w-7 rounded-md flex items-center justify-center icon-bg-emerald shrink-0">
                <CheckCircle className="h-3.5 w-3.5" />
              </div>
              <div>
                <CardTitle className="text-sm font-semibold">Compliance Health</CardTitle>
                <CardDescription className="text-xs">Batch quality status</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-center">
              <div className="text-5xl font-bold tabular-nums text-green-600" data-testid="value-compliance-score">
                {isLoading ? '—' : `${stats.complianceScore}%`}
              </div>
              <p className="text-sm text-muted-foreground mt-1">Compliance Score</p>
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

      {/* Open Batches + Quick Actions */}
      <div className="grid gap-4 md:grid-cols-2 mt-4">
        <Card data-testid="card-open-batches">
          <CardHeader>
            <div className="flex items-center gap-2.5">
              <div className="h-7 w-7 rounded-md flex items-center justify-center icon-bg-amber shrink-0">
                <Clock className="h-3.5 w-3.5" />
              </div>
              <div>
                <CardTitle className="text-sm font-semibold">Open Batches</CardTitle>
                <CardDescription className="text-xs">Batches awaiting resolution or dispatch</CardDescription>
              </div>
            </div>
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
                Scan &amp; Verify Bags
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
