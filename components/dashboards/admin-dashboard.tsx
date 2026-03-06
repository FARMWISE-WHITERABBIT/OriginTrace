'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { createClient } from '@/lib/supabase/client';
import { useOrg } from '@/lib/contexts/org-context';
import { ComplianceGauge } from '@/components/compliance-gauge';
import { LiveSupplyMap } from '@/components/live-supply-map';
import { DDSExportModal } from '@/components/dds-export-modal';
import { Package, Map, Users, Scale, FileDown, ClipboardCheck, UserPlus } from 'lucide-react';
import Link from 'next/link';

interface Stats {
  totalFarms: number;
  approvedFarms: number;
  totalBags: number;
  totalWeight: number;
  pendingCompliance: number;
}

export function AdminDashboard() {
  const [stats, setStats] = useState<Stats>({ totalFarms: 0, approvedFarms: 0, totalBags: 0, totalWeight: 0, pendingCompliance: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const { organization } = useOrg();
  const supabase = createClient();

  useEffect(() => {
    async function fetchStats() {
      if (!supabase || !organization) return;

      try {
        const [farmsRes, approvedRes, bagsRes, collectionsRes, pendingRes] = await Promise.all([
          supabase.from('farms').select('id', { count: 'exact', head: true }).eq('org_id', organization.id),
          supabase.from('farms').select('id', { count: 'exact', head: true }).eq('org_id', organization.id).eq('compliance_status', 'approved'),
          supabase.from('bags').select('id', { count: 'exact', head: true }).eq('org_id', organization.id),
          supabase.from('collections').select('weight').eq('org_id', organization.id),
          supabase.from('farms').select('id', { count: 'exact', head: true }).eq('org_id', organization.id).eq('compliance_status', 'pending'),
        ]);

        const totalWeight = collectionsRes.data?.reduce((sum, c) => sum + Number(c.weight || 0), 0) || 0;

        setStats({
          totalFarms: farmsRes.count || 0,
          approvedFarms: approvedRes.count || 0,
          totalBags: bagsRes.count || 0,
          totalWeight,
          pendingCompliance: pendingRes.count || 0,
        });
      } catch (error) {
        console.error('Failed to fetch stats:', error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchStats();
  }, [organization]);

  const statCards = [
    { title: 'Total Farms', value: stats.totalFarms, icon: Map, description: 'Registered farms' },
    { title: 'Total Bags', value: stats.totalBags, icon: Package, description: 'Bag inventory' },
    { title: 'Total Weight', value: `${stats.totalWeight.toLocaleString()} kg`, icon: Scale, description: 'Collected produce' },
    { title: 'Pending Review', value: stats.pendingCompliance, icon: Users, description: 'Compliance pending' },
  ];

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat) => (
          <Card key={stat.title} data-testid={`stat-${stat.title.toLowerCase().replace(' ', '-')}`}>
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
              <stat.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {isLoading ? '...' : stat.value}
              </div>
              <p className="text-xs text-muted-foreground">{stat.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <ComplianceGauge 
          approvedCount={stats.approvedFarms} 
          totalCount={stats.totalFarms} 
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

        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>Latest collections and updates</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              No recent activity to display.
            </p>
          </CardContent>
        </Card>
      </div>

      <LiveSupplyMap />
    </div>
  );
}
