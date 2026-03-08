'use client';

import { useEffect, useState, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useOrg } from '@/lib/contexts/org-context';
import { createClient } from '@/lib/supabase/client';
import {
  CheckCircle,
  Clock,
  XCircle,
  AlertTriangle,
  BarChart3,
  ArrowRight,
  ClipboardCheck,
  ScanLine,
  FlaskConical,
  ShieldAlert,
} from 'lucide-react';
import Link from 'next/link';
import {
  PieDonutChart,
  VerticalBarChart,
} from '@/components/charts';

type Period = '7d' | '30d' | '90d' | '1y';

const PERIOD_OPTIONS: { value: Period; label: string }[] = [
  { value: '7d', label: '7D' },
  { value: '30d', label: '30D' },
  { value: '90d', label: '90D' },
  { value: '1y', label: '1Y' },
];

interface QualityStats {
  approvedFarms: number;
  pendingFarms: number;
  rejectedFarms: number;
  yieldAlertCount: number;
  gradeA: number;
  gradeB: number;
  gradeC: number;
  totalBags: number;
  recentFlaggedBatches: Array<{
    id: string;
    total_weight: number;
    yield_flag_reason: string;
    created_at: string;
  }>;
}

export function QualityManagerDashboard() {
  const [stats, setStats] = useState<QualityStats>({
    approvedFarms: 0,
    pendingFarms: 0,
    rejectedFarms: 0,
    yieldAlertCount: 0,
    gradeA: 0,
    gradeB: 0,
    gradeC: 0,
    totalBags: 0,
    recentFlaggedBatches: [],
  });
  const [isLoading, setIsLoading] = useState(true);
  const [period, setPeriod] = useState<Period>('30d');
  const [isChartLoading, setIsChartLoading] = useState(true);
  const [gradeChartData, setGradeChartData] = useState<Array<{ grade: string; count: number }>>([]);
  const [labTestData, setLabTestData] = useState<Array<{ name: string; value: number }>>([]);
  const [yieldComplianceData, setYieldComplianceData] = useState<Array<{ name: string; compliant: number; flagged: number }>>([]);
  const [riskBreakdownData, setRiskBreakdownData] = useState<Array<{ name: string; value: number }>>([]);
  const { organization } = useOrg();
  const supabase = createClient();

  useEffect(() => {
    async function fetchStats() {
      if (!supabase || !organization) return;

      try {
        const [
          approvedRes,
          pendingRes,
          rejectedRes,
          yieldAlertRes,
          gradeARes,
          gradeBRes,
          gradeCRes,
          totalBagsRes,
          flaggedBatchesRes,
        ] = await Promise.all([
          supabase.from('farms').select('id', { count: 'exact', head: true }).eq('org_id', organization.id).eq('compliance_status', 'approved'),
          supabase.from('farms').select('id', { count: 'exact', head: true }).eq('org_id', organization.id).eq('compliance_status', 'pending'),
          supabase.from('farms').select('id', { count: 'exact', head: true }).eq('org_id', organization.id).eq('compliance_status', 'rejected'),
          supabase.from('collection_batches').select('id', { count: 'exact', head: true }).eq('org_id', organization.id).not('yield_flag_reason', 'is', null),
          supabase.from('bags').select('id', { count: 'exact', head: true }).eq('org_id', organization.id).eq('grade', 'A'),
          supabase.from('bags').select('id', { count: 'exact', head: true }).eq('org_id', organization.id).eq('grade', 'B'),
          supabase.from('bags').select('id', { count: 'exact', head: true }).eq('org_id', organization.id).eq('grade', 'C'),
          supabase.from('bags').select('id', { count: 'exact', head: true }).eq('org_id', organization.id),
          supabase.from('collection_batches').select('id, total_weight, yield_flag_reason, created_at').eq('org_id', organization.id).not('yield_flag_reason', 'is', null).order('created_at', { ascending: false }).limit(5),
        ]);

        setStats({
          approvedFarms: approvedRes.count || 0,
          pendingFarms: pendingRes.count || 0,
          rejectedFarms: rejectedRes.count || 0,
          yieldAlertCount: yieldAlertRes.count || 0,
          gradeA: gradeARes.count || 0,
          gradeB: gradeBRes.count || 0,
          gradeC: gradeCRes.count || 0,
          totalBags: totalBagsRes.count || 0,
          recentFlaggedBatches: (flaggedBatchesRes.data || []) as QualityStats['recentFlaggedBatches'],
        });
      } catch (error) {
        console.error('Failed to fetch quality stats:', error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchStats();
  }, [organization]);

  const fetchChartData = useCallback(async () => {
    if (!organization) return;
    setIsChartLoading(true);
    try {
      const res = await fetch(`/api/analytics?period=${period}`);
      if (res.ok) {
        const data = await res.json();

        if (data.gradeDistribution) {
          setGradeChartData(data.gradeDistribution);
        }

        const compliantBags = data.bagSummary?.total
          ? data.bagSummary.total - (data.riskIntelligence?.find((r: any) => r.type === 'Low Grade (C)')?.count || 0)
          : 0;
        const nonCompliantBags = data.riskIntelligence?.find((r: any) => r.type === 'Low Grade (C)')?.count || 0;

        const passCount = compliantBags > 0 ? compliantBags : (data.bagSummary?.total || 0);
        const failCount = nonCompliantBags;
        if (passCount > 0 || failCount > 0) {
          setLabTestData([
            { name: 'Pass', value: passCount },
            { name: 'Fail', value: failCount },
          ].filter(d => d.value > 0));
        }

        if (data.commodityBreakdown) {
          setYieldComplianceData(
            data.commodityBreakdown.map((c: any) => ({
              name: c.name,
              compliant: c.batches > 0 ? Math.round(c.batches * (c.complianceRate / 100)) : 0,
              flagged: c.batches > 0 ? c.batches - Math.round(c.batches * (c.complianceRate / 100)) : 0,
            })).filter((c: any) => c.compliant > 0 || c.flagged > 0)
          );
        }

        if (data.riskIntelligence) {
          setRiskBreakdownData(
            data.riskIntelligence.map((r: any) => ({ name: r.type, value: r.count }))
          );
        }
      }
    } catch (error) {
      console.error('Failed to fetch chart data:', error);
    } finally {
      setIsChartLoading(false);
    }
  }, [organization, period]);

  useEffect(() => {
    fetchChartData();
  }, [fetchChartData]);

  const complianceCards = [
    { title: 'Approved Farms', value: stats.approvedFarms, icon: CheckCircle, color: 'text-green-600' },
    { title: 'Pending Review', value: stats.pendingFarms, icon: Clock, color: 'text-orange-600' },
    { title: 'Rejected Farms', value: stats.rejectedFarms, icon: XCircle, color: 'text-red-600' },
    { title: 'Yield Alerts', value: stats.yieldAlertCount, icon: AlertTriangle, color: 'text-yellow-600' },
  ];

  const GRADE_COLORS = ['#2E7D6B', '#E9A23B', '#D84315', '#6FB8A8', '#8ECDC0'];
  const LAB_COLORS = ['#2E7D6B', '#D84315'];
  const RISK_COLORS = ['#D84315', '#E9A23B', '#1F5F52', '#6FB8A8', '#8ECDC0'];

  return (
    <div className="space-y-4" data-testid="quality-manager-dashboard">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div />
        <div className="flex items-center gap-1" data-testid="quality-period-selector">
          {PERIOD_OPTIONS.map((opt) => (
            <Button
              key={opt.value}
              variant={period === opt.value ? 'default' : 'outline'}
              size="sm"
              onClick={() => setPeriod(opt.value)}
              data-testid={`button-qm-period-${opt.value}`}
            >
              {opt.label}
            </Button>
          ))}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {complianceCards.map((stat) => (
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

      <div className="grid gap-4 md:grid-cols-2">
        <Card data-testid="card-grade-distribution">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Quality Grade Distribution
            </CardTitle>
            <CardDescription>Bags by quality grade</CardDescription>
          </CardHeader>
          <CardContent>
            {isChartLoading ? (
              <div className="h-[280px] flex items-center justify-center text-muted-foreground">
                Loading chart...
              </div>
            ) : gradeChartData.length === 0 ? (
              <div className="h-[280px] flex items-center justify-center text-muted-foreground" data-testid="text-no-grade-data">
                No grade data available
              </div>
            ) : (
              <VerticalBarChart
                data={gradeChartData}
                dataKey="count"
                categoryKey="grade"
                height={280}
                barLabel="Bags"
                colors={GRADE_COLORS}
              />
            )}
          </CardContent>
        </Card>

        <Card data-testid="card-lab-test-results">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FlaskConical className="h-5 w-5" />
              Lab Test Results
            </CardTitle>
            <CardDescription>Pass vs fail rate</CardDescription>
          </CardHeader>
          <CardContent>
            {isChartLoading ? (
              <div className="h-[280px] flex items-center justify-center text-muted-foreground">
                Loading chart...
              </div>
            ) : labTestData.length === 0 ? (
              <div className="h-[280px] flex items-center justify-center text-muted-foreground" data-testid="text-no-lab-data">
                No lab test data available
              </div>
            ) : (
              <PieDonutChart
                data={labTestData}
                donut
                height={280}
                colors={LAB_COLORS}
              />
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card data-testid="card-yield-compliance">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ClipboardCheck className="h-5 w-5" />
              Batch Yield Compliance
            </CardTitle>
            <CardDescription>Compliant vs flagged batches by commodity</CardDescription>
          </CardHeader>
          <CardContent>
            {isChartLoading ? (
              <div className="h-[280px] flex items-center justify-center text-muted-foreground">
                Loading chart...
              </div>
            ) : yieldComplianceData.length === 0 ? (
              <div className="h-[280px] flex items-center justify-center text-muted-foreground" data-testid="text-no-yield-data">
                No yield compliance data available
              </div>
            ) : (
              <VerticalBarChart
                data={yieldComplianceData.map(c => ({
                  commodity: c.name,
                  compliant: c.compliant,
                  flagged: c.flagged,
                  total: c.compliant + c.flagged,
                }))}
                dataKey="total"
                categoryKey="commodity"
                height={280}
                barLabel="Batches"
                color="#2E7D6B"
              />
            )}
          </CardContent>
        </Card>

        <Card data-testid="card-risk-breakdown">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShieldAlert className="h-5 w-5" />
              Contamination & Risk Breakdown
            </CardTitle>
            <CardDescription>Risk categories across operations</CardDescription>
          </CardHeader>
          <CardContent>
            {isChartLoading ? (
              <div className="h-[280px] flex items-center justify-center text-muted-foreground">
                Loading chart...
              </div>
            ) : riskBreakdownData.length === 0 ? (
              <div className="h-[280px] flex items-center justify-center text-muted-foreground" data-testid="text-no-risk-data">
                No risk data available
              </div>
            ) : (
              <PieDonutChart
                data={riskBreakdownData}
                donut
                height={280}
                colors={RISK_COLORS}
              />
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card data-testid="card-flagged-batches">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-orange-500" />
              Recent Flagged Batches
            </CardTitle>
            <CardDescription>Batches with yield anomalies requiring review</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <p className="text-sm text-muted-foreground">Loading...</p>
            ) : stats.recentFlaggedBatches.length === 0 ? (
              <p className="text-sm text-muted-foreground" data-testid="text-no-flagged">No flagged batches found.</p>
            ) : (
              <div className="space-y-3" data-testid="flagged-batches-list">
                {stats.recentFlaggedBatches.map((batch) => (
                  <div key={batch.id} className="flex items-start gap-3 p-3 rounded-md bg-muted/50" data-testid={`flagged-batch-${batch.id}`}>
                    <AlertTriangle className="h-4 w-4 text-orange-500 mt-0.5 shrink-0" />
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{batch.yield_flag_reason}</p>
                      <p className="text-xs text-muted-foreground">
                        {batch.total_weight}kg &middot; {new Date(batch.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card data-testid="card-quick-actions">
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Common quality management tasks</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-3">
            <Link href="/app/compliance">
              <Button variant="outline" data-testid="button-compliance-review">
                <ClipboardCheck className="h-4 w-4 mr-2" />
                Review Compliance
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </Link>
            <Link href="/app/yield-alerts">
              <Button variant="outline" data-testid="button-yield-alerts">
                <AlertTriangle className="h-4 w-4 mr-2" />
                Yield Alerts
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </Link>
            <Link href="/app/verify">
              <Button variant="outline" data-testid="button-verify-bags">
                <ScanLine className="h-4 w-4 mr-2" />
                Verify Bags
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
