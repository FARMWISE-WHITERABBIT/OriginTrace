'use client';

import { useEffect, useState, useCallback } from 'react';
import { useOrg } from '@/lib/contexts/org-context';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Loader2, TrendingUp, TrendingDown, Printer, BarChart3, ShieldCheck, DollarSign, Search } from 'lucide-react';
import {
  PieDonutChart,
  VerticalBarChart,
  HorizontalBarChart,
  StackedBarChart,
  RadarSpiderChart,
  TrendLineChart,
} from '@/components/charts';
import { TierGate } from '@/components/tier-gate';
import { VIZ_COLORS, STATUS_COLORS } from '@/lib/chart-colors';

type Period = '7d' | '30d' | '90d' | '1y';

export default function AnalyticsPage() {
  return (
    <TierGate feature="analytics" requiredTier="basic" featureLabel="Analytics & Reporting">
      <AnalyticsContent />
    </TierGate>
  );
}

function AnalyticsContent() {
  const { organization, profile } = useOrg();
  const [period, setPeriod] = useState<Period>('30d');
  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('operations');

  const fetchAnalytics = useCallback(async () => {
    if (!organization) return;
    setIsLoading(true);
    try {
      const res = await fetch(`/api/analytics?period=${period}&section=all`);
      if (res.ok) {
        const result = await res.json();
        setData(result);
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

  if (isLoading || !data) {
    return (
      <div className="flex items-center justify-center min-h-[400px]" data-testid="analytics-loading">
        <div className="space-y-6"><div className="grid grid-cols-2 md:grid-cols-4 gap-4">{Array.from({length:4}).map((_,i)=><div key={i} className="border border-border rounded-xl p-4 bg-card space-y-2"><div className="h-3 w-20 bg-muted animate-pulse rounded"/><div className="h-7 w-24 bg-muted animate-pulse rounded"/></div>)}</div><div className="border border-border rounded-xl p-6 bg-card"><div className="h-48 bg-muted animate-pulse rounded"/></div></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 print:space-y-4" data-testid="analytics-page">
      <div className="flex items-center justify-between print:hidden">
        <div>
          <h1 className="text-2xl font-bold tracking-tight" data-testid="text-analytics-title">Analytics & Intelligence</h1>
          <p className="text-sm text-muted-foreground">Strategic insights across your supply chain operations</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="segmented-control" data-testid="select-analytics-period">
            {([['7d','7 Days'],['30d','30 Days'],['90d','90 Days'],['1y','1 Year']] as const).map(([val, label]) => (
              <button key={val} className="segmented-control-item" data-active={period === val} onClick={() => setPeriod(val)}>{label}</button>
            ))}
          </div>
          <Button variant="outline" size="sm" onClick={() => window.print()} data-testid="button-print-analytics">
            <Printer className="h-4 w-4 mr-2" />
            Print
          </Button>
        </div>
      </div>

      <div className="print:block">
        <div className="hidden print:block mb-4">
          <h1 className="text-xl font-bold">OriginTrace Analytics Report — {period} period</h1>
          <p className="text-sm text-muted-foreground">Generated {new Date().toLocaleDateString()}</p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="print:hidden" data-testid="tabs-analytics">
          <TabsTrigger value="operations" data-testid="tab-operations">
            <BarChart3 className="h-4 w-4 mr-2" />
            Operations
          </TabsTrigger>
          <TabsTrigger value="compliance" data-testid="tab-compliance">
            <ShieldCheck className="h-4 w-4 mr-2" />
            Compliance
          </TabsTrigger>
          <TabsTrigger value="financial" data-testid="tab-financial">
            <DollarSign className="h-4 w-4 mr-2" />
            Financial
          </TabsTrigger>
          <TabsTrigger value="traceability" data-testid="tab-traceability">
            <Search className="h-4 w-4 mr-2" />
            Traceability
          </TabsTrigger>
        </TabsList>

        <TabsContent value="operations" className="space-y-6 print:break-after-page" data-testid="content-operations">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <StatCard title="Collection Volume" value={`${(data.weightSummary?.current || 0).toLocaleString()} kg`} trend={data.weightSummary?.trend} testId="stat-weight" />
            <StatCard title="Total Batches" value={data.batchSummary?.current || 0} trend={data.batchSummary?.trend} testId="stat-batches" />
            <StatCard title="Total Farms" value={data.farmSummary?.total || 0} testId="stat-farms" />
            <StatCard title="Active Agents" value={data.agentPerformance?.length || 0} testId="stat-agents" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card data-testid="chart-volume-trends">
              <CardHeader>
                <CardTitle className="text-base">Collection Volume Trends</CardTitle>
                <CardDescription>Weight collected over time</CardDescription>
              </CardHeader>
              <CardContent>
                <TrendLineChart
                  data={(data.volumeTrends || []).map((v: any) => ({ date: v.date, value: v.weight }))}
                  xKey="date"
                  series={[{ dataKey: 'value', label: 'Weight (kg)', color: VIZ_COLORS[0] }]}
                  height={280}
                />
              </CardContent>
            </Card>

            <Card data-testid="chart-regional-breakdown">
              <CardHeader>
                <CardTitle className="text-base">Regional Collection Volumes</CardTitle>
                <CardDescription>Weight by state/region</CardDescription>
              </CardHeader>
              <CardContent>
                <VerticalBarChart
                  data={(data.regionalBreakdown || []).slice(0, 10).map((r: any) => ({ name: r.region, value: r.weight }))}
                  dataKey="value"
                  categoryKey="name"
                  height={280}
                  valueFormatter={(v) => `${v.toLocaleString()} kg`}
                />
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card data-testid="chart-agent-performance">
              <CardHeader>
                <CardTitle className="text-base">Agent Performance Ranking</CardTitle>
                <CardDescription>Top agents by collection weight</CardDescription>
              </CardHeader>
              <CardContent>
                <HorizontalBarChart
                  data={(data.agentPerformance || []).slice(0, 8).map((a: any) => ({ name: a.name, value: a.weight }))}
                  dataKey="value"
                  categoryKey="name"
                  height={280}
                  valueFormatter={(v) => `${v.toLocaleString()} kg`}
                />
              </CardContent>
            </Card>

            <Card data-testid="chart-supply-chain-nodes">
              <CardHeader>
                <CardTitle className="text-base">Supply Chain Overview</CardTitle>
                <CardDescription>Network node summary</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <MiniStat label="Verified Farms" value={data.supplyChainNodes?.verifiedFarms || 0} testId="stat-verified-farms" />
                  <MiniStat label="Unverified Farms" value={data.supplyChainNodes?.unverifiedFarms || 0} testId="stat-unverified-farms" />
                  <MiniStat label="Total Hectares" value={`${(data.supplyChainNodes?.totalHectares || 0).toLocaleString()}`} testId="stat-hectares" />
                  <MiniStat label="Total Farms" value={data.supplyChainNodes?.totalFarms || 0} testId="stat-total-farms" />
                </div>
                <div className="mt-4">
                  <VerticalBarChart
                    data={[
                      { name: 'Verified', value: data.supplyChainNodes?.verifiedFarms || 0 },
                      { name: 'Unverified', value: data.supplyChainNodes?.unverifiedFarms || 0 },
                    ]}
                    dataKey="value"
                    categoryKey="name"
                    height={160}
                    colors={[VIZ_COLORS[0], VIZ_COLORS[1]]}
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="compliance" className="space-y-6 print:break-after-page" data-testid="content-compliance">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <StatCard title="Farm Compliance" value={`${data.compliance?.farmRate || 0}%`} testId="stat-farm-compliance" />
            <StatCard title="Batch Compliance" value={`${data.compliance?.batchRate || 0}%`} testId="stat-batch-compliance" />
            <StatCard title="Bag Compliance" value={`${data.compliance?.bagRate || 0}%`} testId="stat-bag-compliance" />
            <StatCard title="Flagged Batches" value={data.compliance?.flaggedBatches || 0} testId="stat-flagged" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card data-testid="chart-farm-compliance">
              <CardHeader>
                <CardTitle className="text-base">Farm Compliance Status</CardTitle>
                <CardDescription>Distribution by compliance status</CardDescription>
              </CardHeader>
              <CardContent>
                <PieDonutChart
                  data={(data.farmComplianceBreakdown || []).map((f: any) => ({
                    name: f.status,
                    value: f.count,
                    color: f.status === 'Approved' ? '#2E7D6B' : f.status === 'Pending' ? '#F59E0B' : f.status === 'Rejected' ? '#EF4444' : '#9CA3AF',
                  }))}
                  donut
                  height={280}
                />
              </CardContent>
            </Card>

            <Card data-testid="chart-deforestation-risk">
              <CardHeader>
                <CardTitle className="text-base">Deforestation Risk Distribution</CardTitle>
                <CardDescription>Risk levels across farm network</CardDescription>
              </CardHeader>
              <CardContent>
                <PieDonutChart
                  data={(data.deforestationRisk || []).map((d: any) => ({
                    name: d.level,
                    value: d.count,
                    color: d.level === 'None Detected' ? '#2E7D6B' : d.level === 'Low' ? '#6FB8A8' : d.level === 'Medium' ? '#F59E0B' : '#EF4444',
                  }))}
                  donut
                  height={280}
                />
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card data-testid="chart-document-health">
              <CardHeader>
                <CardTitle className="text-base">Document Health Overview</CardTitle>
                <CardDescription>Document validity status</CardDescription>
              </CardHeader>
              <CardContent>
                <PieDonutChart
                  data={(data.documentHealth || []).map((d: any) => ({
                    name: d.status,
                    value: d.count,
                    color: d.status === 'Valid' ? '#2E7D6B' : d.status === 'Expiring Soon' ? '#F59E0B' : '#EF4444',
                  }))}
                  donut
                  height={280}
                />
              </CardContent>
            </Card>

            <Card data-testid="chart-risk-intelligence">
              <CardHeader>
                <CardTitle className="text-base">Risk Intelligence</CardTitle>
                <CardDescription>Failure type distribution</CardDescription>
              </CardHeader>
              <CardContent>
                <HorizontalBarChart
                  data={(data.riskIntelligence || []).map((r: any) => ({ name: r.type, value: r.count }))}
                  dataKey="value"
                  categoryKey="name"
                  height={280}
                  colors={['#EF4444', '#F59E0B', '#F97316', '#DC2626']}
                />
              </CardContent>
            </Card>
          </div>

          {data.shipmentScores && data.shipmentScores.length > 0 && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card data-testid="chart-shipment-radar">
                <CardHeader>
                  <CardTitle className="text-base">Shipment Readiness Breakdown</CardTitle>
                  <CardDescription>Score dimensions for recent shipments</CardDescription>
                </CardHeader>
                <CardContent>
                  <RadarSpiderChart
                    data={[
                      { dimension: 'Traceability', ...Object.fromEntries(data.shipmentScores.slice(0, 3).map((s: any, i: number) => [`s${i}`, s.traceability])) },
                      { dimension: 'Contamination', ...Object.fromEntries(data.shipmentScores.slice(0, 3).map((s: any, i: number) => [`s${i}`, s.contamination])) },
                      { dimension: 'Documentation', ...Object.fromEntries(data.shipmentScores.slice(0, 3).map((s: any, i: number) => [`s${i}`, s.documentation])) },
                      { dimension: 'Regulatory', ...Object.fromEntries(data.shipmentScores.slice(0, 3).map((s: any, i: number) => [`s${i}`, s.regulatory])) },
                      { dimension: 'Storage', ...Object.fromEntries(data.shipmentScores.slice(0, 3).map((s: any, i: number) => [`s${i}`, s.storage])) },
                    ]}
                    angleKey="dimension"
                    series={data.shipmentScores.slice(0, 3).map((s: any, i: number) => ({ dataKey: `s${i}`, label: s.name }))}
                    height={320}
                  />
                </CardContent>
              </Card>

              <Card data-testid="chart-shipment-decisions">
                <CardHeader>
                  <CardTitle className="text-base">Shipment Readiness Decisions</CardTitle>
                  <CardDescription>Go / Conditional / No-Go breakdown</CardDescription>
                </CardHeader>
                <CardContent>
                  <PieDonutChart
                    data={(data.shipmentDecisions || []).map((d: any) => ({
                      name: d.decision,
                      value: d.count,
                      color: d.decision === 'Go' ? '#2E7D6B' : d.decision === 'Conditional' ? '#F59E0B' : d.decision === 'No Go' ? '#EF4444' : '#9CA3AF',
                    }))}
                    donut
                    height={280}
                  />
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        <TabsContent value="financial" className="space-y-6 print:break-after-page" data-testid="content-financial">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <StatCard title="Total Payments" value={`₦${(data.paymentSummary?.total || 0).toLocaleString()}`} testId="stat-total-payments" />
            <StatCard title="Payment Count" value={data.paymentSummary?.count || 0} testId="stat-payment-count" />
            <StatCard title="Active Contracts" value={data.contractSummary?.total || 0} testId="stat-contracts" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card data-testid="chart-payment-status">
              <CardHeader>
                <CardTitle className="text-base">Payments by Status</CardTitle>
                <CardDescription>Payment amounts grouped by status</CardDescription>
              </CardHeader>
              <CardContent>
                <VerticalBarChart
                  data={(data.paymentsByStatus || []).map((p: any) => ({ name: p.status, value: p.amount }))}
                  dataKey="value"
                  categoryKey="name"
                  height={280}
                  valueFormatter={(v) => `₦${v.toLocaleString()}`}
                />
              </CardContent>
            </Card>

            <Card data-testid="chart-payment-method">
              <CardHeader>
                <CardTitle className="text-base">Payment Method Distribution</CardTitle>
                <CardDescription>Spend by payment method</CardDescription>
              </CardHeader>
              <CardContent>
                <PieDonutChart
                  data={(data.paymentsByMethod || []).map((p: any) => ({ name: p.method, value: p.amount }))}
                  donut
                  height={280}
                  labelFormatter={(name, value) => `₦${value.toLocaleString()}`}
                />
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card data-testid="chart-contract-status">
              <CardHeader>
                <CardTitle className="text-base">Contract Status</CardTitle>
                <CardDescription>Active, completed, pending contracts</CardDescription>
              </CardHeader>
              <CardContent>
                <PieDonutChart
                  data={(data.contractStatus || []).map((c: any) => ({
                    name: c.status,
                    value: c.count,
                    color: c.status === 'Active' ? '#2E7D6B' : c.status === 'Completed' ? '#6FB8A8' : c.status === 'Pending' ? '#F59E0B' : '#9CA3AF',
                  }))}
                  height={280}
                />
              </CardContent>
            </Card>

            <Card data-testid="chart-contract-summary">
              <CardHeader>
                <CardTitle className="text-base">Contract Portfolio</CardTitle>
                <CardDescription>Volume and value summary</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <MiniStat label="Total Contracts" value={data.contractSummary?.total || 0} testId="stat-contract-total" />
                  <MiniStat label="Contracted Volume" value={`${(data.contractSummary?.totalVolumeMT || 0).toLocaleString()} MT`} testId="stat-contract-volume" />
                  <MiniStat label="Total Value" value={`₦${(data.contractSummary?.totalValue || 0).toLocaleString()}`} testId="stat-contract-value" />
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="traceability" className="space-y-6" data-testid="content-traceability">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <StatCard title="Total Bags" value={data.bagSummary?.total || 0} testId="stat-total-bags" />
            <StatCard title="Verified Hectares" value={`${(data.supplyChainNodes?.totalHectares || 0).toLocaleString()}`} testId="stat-verified-hectares" />
            <StatCard title="Commodities" value={data.commodityBreakdown?.length || 0} testId="stat-commodities" />
            <StatCard title="Bag Trend" value={`${data.bagSummary?.trend > 0 ? '+' : ''}${data.bagSummary?.trend || 0}%`} trend={data.bagSummary?.trend} testId="stat-bag-trend" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card data-testid="chart-commodity-volume">
              <CardHeader>
                <CardTitle className="text-base">Commodity Volume Distribution</CardTitle>
                <CardDescription>Collection weight by commodity</CardDescription>
              </CardHeader>
              <CardContent>
                <PieDonutChart
                  data={(data.commodityBreakdown || []).filter((c: any) => c.weight > 0).map((c: any) => ({ name: c.name, value: c.weight }))}
                  donut
                  height={280}
                  labelFormatter={(name, value) => `${value.toLocaleString()} kg`}
                />
              </CardContent>
            </Card>

            <Card data-testid="chart-commodity-compliance">
              <CardHeader>
                <CardTitle className="text-base">Compliance Rate by Commodity</CardTitle>
                <CardDescription>Farm compliance percentage per commodity</CardDescription>
              </CardHeader>
              <CardContent>
                <VerticalBarChart
                  data={(data.commodityBreakdown || []).filter((c: any) => c.totalFarms > 0).map((c: any) => ({ name: c.name, value: c.complianceRate }))}
                  dataKey="value"
                  categoryKey="name"
                  height={280}
                  valueFormatter={(v) => `${v}%`}
                />
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card data-testid="chart-grade-distribution">
              <CardHeader>
                <CardTitle className="text-base">Grade Quality Distribution</CardTitle>
                <CardDescription>Bag counts by quality grade</CardDescription>
              </CardHeader>
              <CardContent>
                <VerticalBarChart
                  data={(data.gradeDistribution || []).map((g: any) => ({
                    name: `Grade ${g.grade}`,
                    value: g.count,
                    color: g.grade === 'A' ? '#2E7D6B' : g.grade === 'B' ? '#6FB8A8' : '#F59E0B',
                  }))}
                  dataKey="value"
                  categoryKey="name"
                  height={280}
                />
              </CardContent>
            </Card>

            <Card data-testid="chart-shipments-destination">
              <CardHeader>
                <CardTitle className="text-base">Shipments by Destination</CardTitle>
                <CardDescription>Destination market distribution</CardDescription>
              </CardHeader>
              <CardContent>
                <PieDonutChart
                  data={(data.shipmentsByDestination || []).map((s: any) => ({ name: s.country, value: s.count }))}
                  height={280}
                />
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      <style jsx global>{`
        @media print {
          nav, header, .print\\:hidden { display: none !important; }
          .print\\:block { display: block !important; }
          .print\\:break-after-page { page-break-after: always; }
          body { font-size: 11px; }
          .recharts-responsive-container { page-break-inside: avoid; }
        }
      `}</style>
    </div>
  );
}

function StatCard({ title, value, trend, testId }: { title: string; value: string | number; trend?: number; testId: string }) {
  return (
    <Card className="card-accent-blue transition-shadow hover:shadow-sm" data-testid={testId}>
      <CardContent className="pt-4 pb-3">
        <p className="text-xs text-muted-foreground font-medium">{title}</p>
        <div className="flex items-center justify-between mt-1 gap-2">
          <p className="text-2xl font-bold tracking-tight" data-testid={`${testId}-value`}>{value}</p>
          {trend !== undefined && trend !== null && (
            <span className={`flex items-center text-xs font-semibold px-2 py-0.5 rounded-full shrink-0 ${trend >= 0 ? 'bg-green-100 text-green-700 dark:bg-green-950/50 dark:text-green-400' : 'bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-400'}`} data-testid={`${testId}-trend`}>
              {trend >= 0 ? <TrendingUp className="h-3 w-3 mr-1" /> : <TrendingDown className="h-3 w-3 mr-1" />}
              {trend > 0 ? '+' : ''}{trend}%
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function MiniStat({ label, value, testId }: { label: string; value: string | number; testId: string }) {
  return (
    <div className="p-3 rounded-lg bg-muted/40 border border-border/50" data-testid={testId}>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-lg font-semibold tracking-tight mt-0.5">{value}</p>
    </div>
  );
}
