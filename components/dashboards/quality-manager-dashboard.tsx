'use client';

import { useEffect, useState } from 'react';
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
} from 'lucide-react';
import Link from 'next/link';

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

  const complianceCards = [
    { title: 'Approved Farms', value: stats.approvedFarms, icon: CheckCircle, color: 'text-green-600' },
    { title: 'Pending Review', value: stats.pendingFarms, icon: Clock, color: 'text-orange-600' },
    { title: 'Rejected Farms', value: stats.rejectedFarms, icon: XCircle, color: 'text-red-600' },
    { title: 'Yield Alerts', value: stats.yieldAlertCount, icon: AlertTriangle, color: 'text-yellow-600' },
  ];

  return (
    <div className="space-y-6" data-testid="quality-manager-dashboard">
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
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Quality Grade Distribution
            </CardTitle>
            <CardDescription>Bags by quality grade</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4" data-testid="grade-distribution">
              {[
                { grade: 'A', count: stats.gradeA, color: 'bg-green-500' },
                { grade: 'B', count: stats.gradeB, color: 'bg-yellow-500' },
                { grade: 'C', count: stats.gradeC, color: 'bg-red-500' },
              ].map((item) => {
                const pct = stats.totalBags > 0 ? Math.round((item.count / stats.totalBags) * 100) : 0;
                return (
                  <div key={item.grade} className="flex items-center gap-3" data-testid={`grade-${item.grade.toLowerCase()}`}>
                    <Badge variant="outline" className="w-10 justify-center">
                      {item.grade}
                    </Badge>
                    <div className="flex-1">
                      <div className="h-2 rounded-full bg-muted overflow-hidden">
                        <div className={`h-full rounded-full ${item.color}`} style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                    <span className="text-sm font-medium w-16 text-right">
                      {isLoading ? '...' : `${item.count} (${pct}%)`}
                    </span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-orange-500" />
              Recent Flagged Batches
            </CardTitle>
            <CardDescription>Batches with yield anomalies</CardDescription>
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
      </div>

      <Card>
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
  );
}
