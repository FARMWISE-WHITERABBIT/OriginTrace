'use client';

import { useEffect, useState, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { createClient } from '@/lib/supabase/client';
import { useOrg } from '@/lib/contexts/org-context';
import { ComplianceGauge } from '@/components/compliance-gauge';
import { LiveSupplyMap } from '@/components/live-supply-map';
import { DDSExportModal } from '@/components/dds-export-modal';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  Package, Map, Users, Scale, FileDown, ClipboardCheck, UserPlus,
  TrendingUp, TrendingDown, Minus, BarChart3, ShieldCheck
} from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  AreaChart, Area
} from 'recharts';
import Link from 'next/link';

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
}

const PERIOD_OPTIONS: { value: Period; label: string }[] = [
  { value: '7d', label: '7 Days' },
  { value: '30d', label: '30 Days' },
  { value: '90d', label: '90 Days' },
  { value: '1y', label: '1 Year' },
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

export function AdminDashboard() {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [period, setPeriod] = useState<Period>('30d');
  const [isLoading, setIsLoading] = useState(true);
  const { organization } = useOrg();

  const fetchAnalytics = useCallback(async () => {
    if (!organization) return;
    setIsLoading(true);
    try {
      const res = await fetch(`/api/analytics?period=${period}`);
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

  const statCards = [
    {
      title: 'Total Farms',
      value: analytics?.farmSummary.total || 0,
      icon: Map,
      description: 'Registered farms',
      trend: null as number | null,
    },
    {
      title: 'Total Bags',
      value: analytics?.bagSummary.total || 0,
      icon: Package,
      description: 'Bag inventory',
      trend: analytics?.bagSummary.trend ?? null,
    },
    {
      title: 'Total Weight',
      value: `${(analytics?.weightSummary.current || 0).toLocaleString()} kg`,
      icon: Scale,
      description: `In selected period`,
      trend: analytics?.weightSummary.trend ?? null,
    },
    {
      title: 'Pending Review',
      value: analytics?.farmSummary.pending || 0,
      icon: Users,
      description: 'Compliance pending',
      trend: null as number | null,
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="text-lg font-semibold">Dashboard Overview</h2>
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

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat) => (
          <Card key={stat.title} data-testid={`stat-${stat.title.toLowerCase().replace(' ', '-')}`}>
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
              <stat.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid={`value-${stat.title.toLowerCase().replace(' ', '-')}`}>
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

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2" data-testid="chart-volume-trends">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Volume Trends
            </CardTitle>
            <CardDescription>Collection weight over time</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                Loading chart...
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={analytics?.volumeTrends || []}>
                  <defs>
                    <linearGradient id="weightGradient" x1="0" y1="0" x2="0" y2="1">
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
                      if (period === '1y') return val;
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
                    fill="url(#weightGradient)"
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card data-testid="card-compliance-overview">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5" />
              Compliance Overview
            </CardTitle>
            <CardDescription>Current compliance rates</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between flex-wrap gap-1">
                <span className="text-sm">Farm Compliance</span>
                <span className="text-sm font-semibold" data-testid="value-farm-compliance">
                  {isLoading ? '...' : `${analytics?.compliance.farmRate || 0}%`}
                </span>
              </div>
              <div className="h-2 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full rounded-full bg-green-500 transition-all"
                  style={{ width: `${analytics?.compliance.farmRate || 0}%` }}
                />
              </div>
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between flex-wrap gap-1">
                <span className="text-sm">Batch Compliance</span>
                <span className="text-sm font-semibold" data-testid="value-batch-compliance">
                  {isLoading ? '...' : `${analytics?.compliance.batchRate || 0}%`}
                </span>
              </div>
              <div className="h-2 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full rounded-full bg-blue-500 transition-all"
                  style={{ width: `${analytics?.compliance.batchRate || 0}%` }}
                />
              </div>
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between flex-wrap gap-1">
                <span className="text-sm">Bag Compliance</span>
                <span className="text-sm font-semibold" data-testid="value-bag-compliance">
                  {isLoading ? '...' : `${analytics?.compliance.bagRate || 0}%`}
                </span>
              </div>
              <div className="h-2 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full rounded-full bg-purple-500 transition-all"
                  style={{ width: `${analytics?.compliance.bagRate || 0}%` }}
                />
              </div>
            </div>
            {(analytics?.compliance.flaggedBatches || 0) > 0 && (
              <div className="p-3 rounded-md bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-800">
                <p className="text-sm text-orange-700 dark:text-orange-400" data-testid="text-flagged-batches">
                  {analytics?.compliance.flaggedBatches} batch{analytics?.compliance.flaggedBatches !== 1 ? 'es' : ''} flagged for review
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <ComplianceGauge
          approvedCount={analytics?.farmSummary.approved || 0}
          totalCount={analytics?.farmSummary.total || 0}
        />

        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Common administrative tasks</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <DDSExportModal
              trigger={
                <Button variant="outline" className="w-full justify-start" data-testid="button-dds-export">
                  <FileDown className="h-4 w-4 mr-2" />
                  Export DDS (EU TRACES)
                </Button>
              }
            />
            <Link href="/app/compliance">
              <Button variant="outline" className="w-full justify-start" data-testid="button-compliance-review">
                <ClipboardCheck className="h-4 w-4 mr-2" />
                Review Compliance
              </Button>
            </Link>
            <Link href="/app/settings?tab=team">
              <Button variant="outline" className="w-full justify-start" data-testid="button-manage-team">
                <UserPlus className="h-4 w-4 mr-2" />
                Manage Team
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card data-testid="card-batch-summary">
          <CardHeader>
            <CardTitle>Period Summary</CardTitle>
            <CardDescription>Activity in selected period</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-1">
              <span className="text-sm text-muted-foreground">Batches</span>
              <div className="flex items-center gap-2">
                <span className="font-semibold" data-testid="value-period-batches">
                  {isLoading ? '...' : analytics?.batchSummary.current || 0}
                </span>
                {analytics?.batchSummary.trend !== undefined && (
                  <TrendIndicator value={analytics.batchSummary.trend} />
                )}
              </div>
            </div>
            <div className="flex items-center justify-between flex-wrap gap-1">
              <span className="text-sm text-muted-foreground">Bags Collected</span>
              <div className="flex items-center gap-2">
                <span className="font-semibold" data-testid="value-period-bags">
                  {isLoading ? '...' : analytics?.bagSummary.current || 0}
                </span>
                {analytics?.bagSummary.trend !== undefined && (
                  <TrendIndicator value={analytics.bagSummary.trend} />
                )}
              </div>
            </div>
            <div className="flex items-center justify-between flex-wrap gap-1">
              <span className="text-sm text-muted-foreground">Weight (kg)</span>
              <div className="flex items-center gap-2">
                <span className="font-semibold" data-testid="value-period-weight">
                  {isLoading ? '...' : (analytics?.weightSummary.current || 0).toLocaleString()}
                </span>
                {analytics?.weightSummary.trend !== undefined && (
                  <TrendIndicator value={analytics.weightSummary.trend} />
                )}
              </div>
            </div>
            <div className="flex items-center justify-between flex-wrap gap-1">
              <span className="text-sm text-muted-foreground">Active Agents</span>
              <span className="font-semibold" data-testid="value-active-agents">
                {isLoading ? '...' : analytics?.agentPerformance.length || 0}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {(analytics?.agentPerformance?.length || 0) > 0 && (
        <Card data-testid="card-agent-performance">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Agent Performance
            </CardTitle>
            <CardDescription>Top performing agents in selected period</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Agent</TableHead>
                  <TableHead className="text-right">Batches</TableHead>
                  <TableHead className="text-right">Bags</TableHead>
                  <TableHead className="text-right">Weight (kg)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {analytics?.agentPerformance.map((agent, idx) => (
                  <TableRow key={agent.id} data-testid={`row-agent-${idx}`}>
                    <TableCell className="font-medium">{agent.name}</TableCell>
                    <TableCell className="text-right">{agent.batches}</TableCell>
                    <TableCell className="text-right">{agent.bags}</TableCell>
                    <TableCell className="text-right">{agent.weight.toLocaleString()}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <LiveSupplyMap />
    </div>
  );
}
