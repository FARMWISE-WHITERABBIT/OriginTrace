'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useOrg } from '@/lib/contexts/org-context';
import {
  Warehouse,
  Package,
  ScanLine,
  Send,
  ArrowRight,
  BoxIcon,
  Clock,
} from 'lucide-react';
import Link from 'next/link';

interface WarehouseStats {
  unusedBags: number;
  collectedBags: number;
  processedBags: number;
  totalBags: number;
  recentBatches: Array<{
    id: string;
    status: string;
    bag_count: number;
    total_weight: number;
    created_at: string;
  }>;
}

export function WarehouseDashboard() {
  const [stats, setStats] = useState<WarehouseStats>({
    unusedBags: 0,
    collectedBags: 0,
    processedBags: 0,
    totalBags: 0,
    recentBatches: [],
  });
  const [isLoading, setIsLoading] = useState(true);
  const { organization } = useOrg();

  useEffect(() => {
    async function fetchStats() {
      if (!organization) return;

      try {
        const res = await fetch('/api/dashboard?role=warehouse');
        if (res.ok) {
          const data = await res.json();
          setStats(data);
        }
      } catch (error) {
        console.error('Failed to fetch warehouse stats:', error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchStats();
  }, [organization]);

  const inventoryCards = [
    { title: 'Total Bags', value: stats.totalBags, icon: Package, color: 'text-blue-600' },
    { title: 'Unused', value: stats.unusedBags, icon: BoxIcon, color: 'text-gray-600' },
    { title: 'Collected', value: stats.collectedBags, icon: Clock, color: 'text-orange-600' },
    { title: 'Processed', value: stats.processedBags, icon: Warehouse, color: 'text-green-600' },
  ];

  return (
    <div className="space-y-6" data-testid="warehouse-dashboard">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {inventoryCards.map((stat) => (
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
              <Package className="h-5 w-5" />
              Bag Status Distribution
            </CardTitle>
            <CardDescription>Breakdown of bags by status</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4" data-testid="bag-distribution">
              {[
                { label: 'Unused', count: stats.unusedBags, color: 'bg-gray-500' },
                { label: 'Collected', count: stats.collectedBags, color: 'bg-blue-500' },
                { label: 'Processed', count: stats.processedBags, color: 'bg-green-500' },
              ].map((item) => {
                const pct = stats.totalBags > 0 ? Math.round((item.count / stats.totalBags) * 100) : 0;
                return (
                  <div key={item.label} className="flex items-center gap-3" data-testid={`bag-status-${item.label.toLowerCase()}`}>
                    <span className="text-sm w-20">{item.label}</span>
                    <div className="flex-1">
                      <div className="h-2 rounded-full bg-muted overflow-hidden">
                        <div className={`h-full rounded-full ${item.color}`} style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                    <span className="text-sm font-medium w-20 text-right">
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
              <Clock className="h-5 w-5 text-blue-500" />
              Recent Receiving Activity
            </CardTitle>
            <CardDescription>Latest collection batches received</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <p className="text-sm text-muted-foreground">Loading...</p>
            ) : stats.recentBatches.length === 0 ? (
              <p className="text-sm text-muted-foreground" data-testid="text-no-batches">No recent receiving activity.</p>
            ) : (
              <div className="space-y-3" data-testid="recent-batches-list">
                {stats.recentBatches.map((batch) => (
                  <div key={batch.id} className="flex items-center justify-between gap-3 p-3 rounded-md bg-muted/50" data-testid={`batch-${batch.id}`}>
                    <div className="min-w-0">
                      <p className="text-sm font-medium">{batch.bag_count} bags &middot; {batch.total_weight}kg</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(batch.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <Badge variant={batch.status === 'completed' ? 'default' : 'secondary'}>
                      {batch.status}
                    </Badge>
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
          <CardDescription>Common warehouse tasks</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          <Link href="/app/inventory">
            <Button variant="outline" data-testid="button-view-inventory">
              <Warehouse className="h-4 w-4 mr-2" />
              View Inventory
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </Link>
          <Link href="/app/bags">
            <Button variant="outline" data-testid="button-manage-bags">
              <Package className="h-4 w-4 mr-2" />
              Manage Bags
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </Link>
          <Link href="/app/verify">
            <Button variant="outline" data-testid="button-verify">
              <ScanLine className="h-4 w-4 mr-2" />
              Verify Bags
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </Link>
          <Link href="/app/dispatch">
            <Button variant="outline" data-testid="button-dispatch">
              <Send className="h-4 w-4 mr-2" />
              Dispatch
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
