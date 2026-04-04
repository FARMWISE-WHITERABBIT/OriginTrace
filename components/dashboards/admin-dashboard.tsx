'use client';

import { useEffect, useState, useCallback } from 'react';
import { StatCardSkeleton } from '@/components/skeletons';
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
  AlertTriangle, Ship, FileText, Activity, MapPin, Leaf
} from 'lucide-react';
import dynamic from 'next/dynamic';
import Link from 'next/link';

const FarmMapOverview = dynamic(() => import('@/components/dashboards/farm-map-overview'), {
  ssr: false,
  loading: () => <div className="h-[400px] bg-muted rounded-lg flex items-center justify-center"><div className="text-muted-foreground text-sm">Loading map...</div></div>
});

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
  'Not Reviewed': '#6b7280',
};

const DECISION_COLORS: Record<string, string> = {
  'Go': '#16a34a',
  'Conditional': '#f59e0b',
  'No Go': '#dc2626',
  'Pending': '#6b7280',
};

const DOC_HEALTH_COLORS: Record<string, string> = {
  'Valid': '#16a34a',
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

interface AuditScore {
  overall: number;
  grade: string;
  components: Record<string, { score: number; detail: string }>;
}

export function AdminDashboard() {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [auditScore, setAuditScore] = useState<AuditScore | null>(null);
  const [period, setPeriod] = useState<Period>('30d');
  const [isLoading, setIsLoading] = useState(true);
  const { organization } = useOrg();

  const fetchAnalytics = useCallback(async () => {
    if (!organization) return;
    setIsLoading(true);
    try {
      const [analyticsRes, auditRes] = await Promise.all([
        fetch(`/api/analytics?period=${period}&section=all`),
        fetch('/api/audit-readiness'),
      ]);
      if (analyticsRes.ok) setAnalytics(await analyticsRes.json());
      if (auditRes.ok) setAuditScore(await auditRes.json());
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
      href: '/app/farms',
      action: analytics?.farmSummary.pending ? `${analytics.farmSummary.pending} pending review →` : 'View all farms →',
    },
    {
      title: 'Collection Volume',
      value: `${(analytics?.weightSummary.current || 0).toLocaleString()} kg`,
      icon: Scale,
      description: `${analytics?.batchSummary.current || 0} batches collected`,
      trend: analytics?.weightSummary.trend ?? null,
      color: 'text-blue-600 dark:text-blue-400',
      href: '/app/inventory',
      action: 'View inventory →',
    },
    {
      title: 'Active Shipments',
      value: activeShipments,
      icon: Ship,
      description: 'Recent shipments tracked',
      trend: null as number | null,
      color: 'text-violet-600 dark:text-violet-400',
      href: '/app/shipments?status=pending',
      action: 'View active shipments →',
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
      href: analytics?.farmSummary.pending
        ? '/app/farms?status=pending'
        : analytics?.compliance.flaggedBatches
        ? '/app/yield-alerts'
        : '/app/farms',
      action: overallComplianceRate < 100 ? 'Review compliance →' : 'All compliant →',
    },
  ];

  const flagItems = [
    ...(analytics?.compliance.flaggedBatches
      ? [{ label: `${analytics.compliance.flaggedBatches} batch${analytics.compliance.flaggedBatches !== 1 ? 'es' : ''} with yield anomalies`, priority: 'high' as const, icon: AlertTriangle, href: '/app/yield-alerts', action: 'Review' }]
      : []),
    ...(analytics?.farmSummary.pending
      ? [{ label: `${analytics.farmSummary.pending} farm${analytics.farmSummary.pending !== 1 ? 's' : ''} pending compliance review`, priority: 'medium' as const, icon: Activity, href: '/app/farms', action: 'Review' }]
      : []),
    ...(analytics?.farmSummary.rejected
      ? [{ label: `${analytics.farmSummary.rejected} farm${analytics.farmSummary.rejected !== 1 ? 's' : ''} rejected`, priority: 'high' as const, icon: AlertTriangle, href: '/app/farms?status=rejected', action: 'View' }]
      : []),
    ...((analytics?.documentHealth || []).filter(d => d.status === 'Expired').map(d => ({
      label: `${d.count} document${d.count !== 1 ? 's' : ''} expired`, priority: 'high' as const, icon: FileText, href: '/app/documents?status=expired', action: 'Renew',
    }))),
    ...((analytics?.documentHealth || []).filter(d => d.status === 'Expiring Soon').map(d => ({
      label: `${d.count} document${d.count !== 1 ? 's' : ''} expiring soon`, priority: 'medium' as const, icon: FileText, href: '/app/documents?status=expiring_soon', action: 'Review',
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
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => <StatCardSkeleton key={i} />)
        ) : statCards.map((stat) => (
          <Link key={stat.title} href={stat.href} className="group" data-testid={`stat-${stat.title.toLowerCase().replace(/\s+/g, '-')}`}>
            <Card className="h-full transition-shadow group-hover:shadow-md group-hover:border-primary/30">
              <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
                <stat.icon className={`h-4 w-4 ${stat.color}`} />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid={`value-${stat.title.toLowerCase().replace(/\s+/g, '-')}`}>
                  {isLoading ? '...' : stat.value}
                </div>
                <div className="flex items-center justify-between flex-wrap gap-1 mt-1">
                  <p className="text-xs text-muted-foreground">{stat.description}</p>
                  {stat.trend !== null && <TrendIndicator value={stat.trend} />}
                </div>
                <p className="text-xs text-primary mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  {stat.action}
                </p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* Audit Readiness Score */}
      {auditScore && (
        <Card data-testid="audit-readiness-card">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-green-600" />
              Audit Readiness Score
            </CardTitle>
            <CardDescription>Platform-wide readiness across farm data, batch records, lab coverage, documents, and shipment outcomes</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col md:flex-row gap-6 items-start">
              <div className="flex items-center gap-4 shrink-0">
                <div className={`text-4xl font-bold w-16 h-16 rounded-full flex items-center justify-center border-4 ${
                  auditScore.grade === 'A' ? 'border-green-500 text-green-700 dark:text-green-400' :
                  auditScore.grade === 'B' ? 'border-blue-500 text-blue-700 dark:text-blue-400' :
                  auditScore.grade === 'C' ? 'border-amber-500 text-amber-700 dark:text-amber-400' :
                  'border-red-500 text-red-700 dark:text-red-400'
                }`} data-testid="audit-grade">
                  {auditScore.grade}
                </div>
                <div>
                  <p className="text-2xl font-bold" data-testid="audit-overall">{auditScore.overall}<span className="text-sm font-normal text-muted-foreground">/100</span></p>
                  <p className="text-xs text-muted-foreground">Overall score</p>
                </div>
              </div>
              <div className="flex-1 space-y-2 w-full">
                {Object.entries(auditScore.components).map(([key, comp]) => (
                  <div key={key}>
                    <div className="flex justify-between text-xs mb-0.5">
                      <span className="text-muted-foreground capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</span>
                      <span className="font-medium">{comp.score}%</span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-1.5">
                      <div
                        className={`h-1.5 rounded-full ${comp.score >= 80 ? 'bg-green-500' : comp.score >= 60 ? 'bg-amber-500' : 'bg-red-500'}`}
                        style={{ width: `${comp.score}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

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
                  { dataKey: 'bags', label: 'Bags', color: '#16a34a' },
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
              <div className="space-y-2">
                {flagItems.map((flag, idx) => (
                  <Link
                    key={idx}
                    href={flag.href}
                    className="flex items-center gap-3 p-3 rounded-md bg-muted/50 hover:bg-muted transition-colors group"
                    data-testid={`flag-item-${idx}`}
                  >
                    <flag.icon className={`h-4 w-4 flex-shrink-0 ${
                      flag.priority === 'high'
                        ? 'text-red-500 dark:text-red-400'
                        : 'text-amber-500 dark:text-amber-400'
                    }`} />
                    <span className="text-sm flex-1">{flag.label}</span>
                    <span
                      className={`text-xs font-medium px-2 py-0.5 rounded-full shrink-0 ${
                        flag.priority === 'high'
                          ? 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400'
                          : 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400'
                      }`}
                      data-testid={`badge-priority-${idx}`}
                    >
                      {flag.action} →
                    </span>
                  </Link>
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

      {/* Farm Polygon Overview Map */}
      <Card data-testid="farm-map-overview">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              Farm Polygon Overview
            </CardTitle>
            <Button variant="outline" size="sm" asChild>
              <a href="/app/farms/map">Open Map</a>
            </Button>
          </div>
          <CardDescription>GPS-mapped farm boundaries — colour coded by compliance status</CardDescription>
        </CardHeader>
        <CardContent className="p-0 pb-4 px-4">
          <FarmMapOverview />
        </CardContent>
      </Card>

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
                color="#16a34a"
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
