'use client';

import { useEffect, useState, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useOrg } from '@/lib/contexts/org-context';
import {
  PieDonutChart,
  VerticalBarChart,
  HorizontalBarChart,
  TrendLineChart,
} from '@/components/charts';
import {
  Package, Map, Users, Scale,
  TrendingUp, TrendingDown, Minus, BarChart3, ShieldCheck,
  AlertTriangle, Ship, FileText, Activity
} from 'lucide-react';

type Period = '7d' | '30d' | '90d' | '1y';

interface AnalyticsData {
  period: string;
  volumeTrends: Array<{ date: string; weight: number; bags: number; batches: number }>;
  weightSummary: { current: number; previous: number; trend: number };
  batchSummary: { current: number; previous: number; trend: number };
  bagSummary: { current: number; previous: number; trend: number; total: number };
  farmSummary: { total: number; approved: number; pending: number; rejected: number };
  compliance: { farmRate: number; batchRate: number; bagRate: number; flaggedBatches: number };
  agentPerformance: Array<{ id: string; name: string; weight: number; bags: number; batches: number }>;
  commodityBreakdown?: Array<{ name: string; weight: number; batches: number; complianceRate: number; totalFarms: number }>;
  gradeDistribution?: Array<{ grade: string; count: number }>;
  farmComplianceBreakdown?: Array<{ status: string; count: number }>;
  shipmentDecisions?: Array<{ decision: string; count: number }>;
  documentHealth?: Array<{ status: string; count: number }>;
  riskIntelligence?: Array<{ type: string; count: number }>;
  shipmentScores?: Array<{ id: string; name: string; overall: number; decision: string }>;
}

const PERIOD_OPTIONS: { value: Period; label: string }[] = [
  { value: '7d', label: '7 Days' },
  { value: '30d', label: '30 Days' },
  { value: '90d', label: '90 Days' },
  { value: '1y', label: '1 Year' },
];

const COMPLIANCE_COLORS: Record<string, string> = {
  'Approved': '#16a34a',
  'Pending': '#f59e0b',
  'Rejected': '#dc2626',
  'Not Reviewed': '#94a3b8',
};

const DECISION_COLORS: Record<string, string> = {
  'Go': '#16a34a',
  'Conditional': '#f59e0b',
  'No Go': '#dc2626',
  'Pending': '#94a3b8',
};

const DOC_HEALTH_COLORS: Record<string, string> = {
  'Valid': '#2E7D6B',
  'Expiring Soon': '#f59e0b',
  'Expired': '#dc2626',
};

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

export function AdminDashboard() {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [period, setPeriod] = useState<Period>('30d');
  const [isLoading, setIsLoading] = useState(true);
  const { organization } = useOrg();

  const fetchAnalytics = useCallback(async () => {
    if (!organization) return;
    setIsLoading(true);
    try {
      const res = await fetch(`/api/analytics?period=${period}&section=all`);
      if (res.ok) {
        const data = await res.json();
        setAnalytics(data);
      }
    } catch (error) {
      console.error('Failed to fetch analytics:', error);
    } finally {
      setIsLoading(false);
    }
  }, [organization, period]);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  const overallComplianceRate = analytics
    ? Math.round(((analytics.compliance.farmRate + analytics.compliance.batchRate + analytics.compliance.bagRate) / 3))
    : 0;

  const activeShipments = analytics?.shipmentDecisions
    ? analytics.shipmentDecisions.reduce((s, d) => s + d.count, 0)
    : 0;

  const statCards = [
    {
      title: 'Total Farms',
      value: analytics?.farmSummary.total || 0,
      icon: Map,
      description: `${analytics?.farmSummary.approved || 0} approved`,
      trend: null as number | null,
      color: 'text-emerald-600 dark:text-emerald-400',
    },
    {
      title: 'Collection Volume',
      value: `${(analytics?.weightSummary.current || 0).toLocaleString()} kg`,
      icon: Scale,
      description: `${analytics?.batchSummary.current || 0} batches collected`,
      trend: analytics?.weightSummary.trend ?? null,
      color: 'text-blue-600 dark:text-blue-400',
    },
    {
      title: 'Active Shipments',
      value: activeShipments,
      icon: Ship,
      description: 'Recent shipments tracked',
      trend: null as number | null,
      color: 'text-violet-600 dark:text-violet-400',
    },
    {
      title: 'Compliance Rate',
      value: `${overallComplianceRate}%`,
      icon: ShieldCheck,
      description: 'Avg across farms/batches/bags',
      trend: null as number | null,
      color: overallComplianceRate >= 80
        ? 'text-green-600 dark:text-green-400'
        : overallComplianceRate >= 50
        ? 'text-amber-600 dark:text-amber-400'
        : 'text-red-600 dark:text-red-400',
    },
  ];

  const flagItems = [
    ...(analytics?.compliance.flaggedBatches
      ? [{ label: `${analytics.compliance.flaggedBatches} batch${analytics.compliance.flaggedBatches !== 1 ? 'es' : ''} with yield anomalies`, priority: 'high' as const, icon: AlertTriangle }]
      : []),
    ...(analytics?.farmSummary.pending
      ? [{ label: `${analytics.farmSummary.pending} farms pending compliance review`, priority: 'medium' as const, icon: Activity }]
      : []),
    ...(analytics?.farmSummary.rejected
      ? [{ label: `${analytics.farmSummary.rejected} farm${analytics.farmSummary.rejected !== 1 ? 's' : ''} rejected`, priority: 'high' as const, icon: AlertTriangle }]
      : []),
    ...((analytics?.documentHealth || []).filter(d => d.status === 'Expired').map(d => ({
      label: `${d.count} document${d.count !== 1 ? 's' : ''} expired`, priority: 'high' as const, icon: FileText,
    }))),
    ...((analytics?.documentHealth || []).filter(d => d.status === 'Expiring Soon').map(d => ({
      label: `${d.count} document${d.count !== 1 ? 's' : ''} expiring soon`, priority: 'medium' as const, icon: FileText,
    }))),
  ].sort((a, b) => (a.priority === 'high' ? -1 : 1) - (b.priority === 'high' ? -1 : 1));

  const commodityPieData = (analytics?.commodityBreakdown || []).map(c => ({
    name: c.name,
    value: Math.round(c.weight),
  }));

  const complianceDonutData = (analytics?.farmComplianceBreakdown || []).map(item => ({
    name: item.status,
    value: item.count,
    color: COMPLIANCE_COLORS[item.status] || '#94a3b8',
  }));

  const gradeBarData = (analytics?.gradeDistribution || []).map(g => ({
    grade: g.grade,
    count: g.count,
  }));

  const shipmentDecisionData = (analytics?.shipmentDecisions || []).map(d => ({
    name: d.decision,
    value: d.count,
    color: DECISION_COLORS[d.decision] || '#94a3b8',
  }));

  const agentBarData = (analytics?.agentPerformance || []).slice(0, 10).map(a => ({
    name: a.name,
    weight: Math.round(a.weight),
  }));

  const docHealthData = (analytics?.documentHealth || []).map(d => ({
    name: d.status,
    value: d.count,
    color: DOC_HEALTH_COLORS[d.status] || '#94a3b8',
  }));

  const volumeTrendData = (analytics?.volumeTrends || []).map(v => ({
    date: v.date,
    weight: v.weight,
    bags: v.bags,
  }));

  const loadingPlaceholder = (
    <div className="h-[280px] flex items-center justify-center text-muted-foreground">
      Loading chart...
    </div>
  );

  return (
    <div className="space-y-6" data-testid="admin-dashboard">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="text-lg font-semibold" data-testid="text-dashboard-title">Dashboard Overview</h2>
        <div className="flex items-center gap-1" data-testid="period-selector">
          {PERIOD_OPTIONS.map((opt) => (
            <Button
              key={opt.value}
              variant={period === opt.value ? 'default' : 'outline'}
              size="sm"
              onClick={() => setPeriod(opt.value)}
              data-testid={`button-period-${opt.value}`}
            >
              {opt.label}
            </Button>
          ))}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4" data-testid="stat-cards-row">
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
              <div className="flex items-center justify-between flex-wrap gap-1">
                <p className="text-xs text-muted-foreground">{stat.description}</p>
                {stat.trend !== null && <TrendIndicator value={stat.trend} />}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-3" data-testid="row-volume-commodity">
        <Card className="lg:col-span-2" data-testid="chart-volume-trends">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Volume Trends
            </CardTitle>
            <CardDescription>Collection weight and bag count over time</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? loadingPlaceholder : (
              <TrendLineChart
                data={volumeTrendData}
                xKey="date"
                series={[
                  { dataKey: 'weight', label: 'Weight (kg)' },
                  { dataKey: 'bags', label: 'Bags', color: '#6FB8A8' },
                ]}
                height={280}
                xTickFormatter={(val) => {
                  if (period === '1y') return val;
                  const d = new Date(val);
                  return `${d.getMonth() + 1}/${d.getDate()}`;
                }}
                valueFormatter={(v) => v.toLocaleString()}
              />
            )}
          </CardContent>
        </Card>

        <Card data-testid="chart-commodity-distribution">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Commodity Distribution
            </CardTitle>
            <CardDescription>Weight by commodity type</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? loadingPlaceholder : commodityPieData.length > 0 ? (
              <PieDonutChart
                data={commodityPieData}
                donut
                height={280}
                showLabels={false}
                labelFormatter={(name, value) => `${value.toLocaleString()} kg`}
              />
            ) : (
              <div className="h-[280px] flex items-center justify-center text-muted-foreground text-sm">
                No commodity data available
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2" data-testid="row-flags-shipments">
        <Card data-testid="card-active-flags">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Active Flags Requiring Action
            </CardTitle>
            <CardDescription>Issues needing immediate attention</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? loadingPlaceholder : flagItems.length > 0 ? (
              <div className="space-y-3">
                {flagItems.map((flag, idx) => (
                  <div
                    key={idx}
                    className="flex items-center gap-3 p-3 rounded-md bg-muted/50"
                    data-testid={`flag-item-${idx}`}
                  >
                    <flag.icon className={`h-4 w-4 flex-shrink-0 ${
                      flag.priority === 'high'
                        ? 'text-red-500 dark:text-red-400'
                        : 'text-amber-500 dark:text-amber-400'
                    }`} />
                    <span className="text-sm flex-1">{flag.label}</span>
                    <Badge
                      variant={flag.priority === 'high' ? 'destructive' : 'secondary'}
                      className="text-xs"
                      data-testid={`badge-priority-${idx}`}
                    >
                      {flag.priority}
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <div className="h-[200px] flex items-center justify-center text-muted-foreground text-sm">
                No active flags
              </div>
            )}
          </CardContent>
        </Card>

        <Card data-testid="chart-shipment-readiness">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2">
              <Ship className="h-5 w-5" />
              Shipment Readiness Summary
            </CardTitle>
            <CardDescription>Go / Conditional / No-Go distribution</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? loadingPlaceholder : shipmentDecisionData.length > 0 ? (
              <PieDonutChart
                data={shipmentDecisionData}
                donut
                height={280}
                showLabels={false}
              />
            ) : (
              <div className="h-[280px] flex items-center justify-center text-muted-foreground text-sm">
                No shipment data available
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2" data-testid="row-compliance-grade">
        <Card data-testid="chart-compliance-breakdown">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5" />
              Compliance Status Breakdown
            </CardTitle>
            <CardDescription>Farm compliance distribution</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? loadingPlaceholder : complianceDonutData.length > 0 ? (
              <PieDonutChart
                data={complianceDonutData}
                donut
                height={280}
                showLabels={false}
              />
            ) : (
              <div className="h-[280px] flex items-center justify-center text-muted-foreground text-sm">
                No compliance data available
              </div>
            )}
          </CardContent>
        </Card>

        <Card data-testid="chart-grade-distribution">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Grade Distribution
            </CardTitle>
            <CardDescription>Bag grades across inventory</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? loadingPlaceholder : gradeBarData.length > 0 ? (
              <VerticalBarChart
                data={gradeBarData}
                dataKey="count"
                categoryKey="grade"
                height={280}
                barLabel="Count"
              />
            ) : (
              <div className="h-[280px] flex items-center justify-center text-muted-foreground text-sm">
                No grade data available
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2" data-testid="row-agent-docs">
        <Card data-testid="chart-agent-performance">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Agent Performance
            </CardTitle>
            <CardDescription>Top agents by collection weight (kg)</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? loadingPlaceholder : agentBarData.length > 0 ? (
              <HorizontalBarChart
                data={agentBarData}
                dataKey="weight"
                categoryKey="name"
                height={280}
                barLabel="Weight (kg)"
                color="#2E7D6B"
                valueFormatter={(v) => `${v.toLocaleString()} kg`}
              />
            ) : (
              <div className="h-[280px] flex items-center justify-center text-muted-foreground text-sm">
                No agent data available
              </div>
            )}
          </CardContent>
        </Card>

        <Card data-testid="chart-document-health">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Document Health
            </CardTitle>
            <CardDescription>Expiring and expired documents needing attention</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? loadingPlaceholder : docHealthData.length > 0 ? (
              <PieDonutChart
                data={docHealthData}
                donut
                height={280}
                showLabels={false}
              />
            ) : (
              <div className="h-[280px] flex items-center justify-center text-muted-foreground text-sm">
                No document data available
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
