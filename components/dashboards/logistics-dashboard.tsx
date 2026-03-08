'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Truck,
  Package,
  Warehouse,
  ArrowRight,
  Send,
  Clock,
  CheckCircle,
  BoxIcon,
} from 'lucide-react';
import Link from 'next/link';

interface LogisticsStats {
  totalShipments: number;
  pendingShipments: number;
  inTransitShipments: number;
  deliveredShipments: number;
  unusedBags: number;
  collectedBags: number;
  processedBags: number;
  totalBags: number;
  recentDispatches: Array<{
    id: string;
    status: string;
    bag_count: number;
    total_weight: number;
    created_at: string;
  }>;
}

export function LogisticsDashboard() {
  const [stats, setStats] = useState<LogisticsStats>({
    totalShipments: 0,
    pendingShipments: 0,
    inTransitShipments: 0,
    deliveredShipments: 0,
    unusedBags: 0,
    collectedBags: 0,
    processedBags: 0,
    totalBags: 0,
    recentDispatches: [],
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchStats() {
      try {
        const res = await fetch('/api/dashboard?view=logistics_coordinator');
        if (!res.ok) throw new Error('Failed to fetch dashboard data');
        const data = await res.json();
        // Merge shipment counts from API response
        let shipmentStats = { total: 0, pending: data.pendingShipments || 0, inTransit: data.activeShipments || 0, delivered: 0 };
        try {
          const shipmentRes = await fetch('/api/shipments');
          if (shipmentRes.ok) {
            const shipmentData = await shipmentRes.json();
            const shipments = Array.isArray(shipmentData) ? shipmentData : shipmentData.shipments || [];
            shipmentStats.total = shipments.length;
            shipmentStats.pending = shipments.filter((s: any) => s.status === 'pending' || s.status === 'booked').length;
            shipmentStats.inTransit = shipments.filter((s: any) => s.status === 'in_transit').length;
            shipmentStats.delivered = shipments.filter((s: any) => s.status === 'delivered').length;
          }
        } catch { /* use API defaults */ }

        setStats({
          totalShipments: shipmentStats.total,
          pendingShipments: shipmentStats.pending,
          inTransitShipments: shipmentStats.inTransit,
          deliveredShipments: shipmentStats.delivered,
          unusedBags: data.unusedBags || 0,
          collectedBags: data.collectedBags || 0,
          processedBags: data.processedBags || 0,
          totalBags: data.totalBags || 0,
          recentDispatches: data.recentBatches || [],
        });
      } catch (error) {
        console.error('Failed to fetch logistics stats:', error);
      } finally {
        setIsLoading(false);
      }
    }
    fetchStats();
  }, []);

  const pipelineCards = [
    { title: 'Total Shipments', value: stats.totalShipments, icon: Truck, color: 'text-blue-600' },
    { title: 'Pending', value: stats.pendingShipments, icon: Clock, color: 'text-orange-600' },
    { title: 'In Transit', value: stats.inTransitShipments, icon: Send, color: 'text-purple-600' },
    { title: 'Delivered', value: stats.deliveredShipments, icon: CheckCircle, color: 'text-green-600' },
  ];

  return (
    <div className="space-y-6" data-testid="logistics-dashboard">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {pipelineCards.map((stat) => (
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
              <Warehouse className="h-5 w-5" />
              Inventory Summary
            </CardTitle>
            <CardDescription>Bags by current status</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4" data-testid="inventory-summary">
              {[
                { label: 'Unused', count: stats.unusedBags, color: 'bg-gray-500' },
                { label: 'Collected', count: stats.collectedBags, color: 'bg-blue-500' },
                { label: 'Processed', count: stats.processedBags, color: 'bg-green-500' },
              ].map((item) => {
                const pct = stats.totalBags > 0 ? Math.round((item.count / stats.totalBags) * 100) : 0;
                return (
                  <div key={item.label} className="flex items-center gap-3" data-testid={`inventory-${item.label.toLowerCase()}`}>
                    <span className="text-sm w-20">{item.label}</span>
                    <div className="flex-1">
                      <div className="h-2 rounded-full bg-muted overflow-hidden">
                        <div className={`h-full rounded-full ${item.color}`} style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                    <span className="text-sm font-medium w-16 text-right">
                      {isLoading ? '...' : item.count}
                    </span>
                  </div>
                );
              })}
              <div className="pt-2 border-t flex items-center justify-between flex-wrap gap-2">
                <span className="text-sm text-muted-foreground">Total Bags</span>
                <span className="text-sm font-bold" data-testid="value-total-bags">{isLoading ? '...' : stats.totalBags}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BoxIcon className="h-5 w-5 text-blue-500" />
              Recent Dispatch Activity
            </CardTitle>
            <CardDescription>Latest dispatched and completed batches</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <p className="text-sm text-muted-foreground">Loading...</p>
            ) : stats.recentDispatches.length === 0 ? (
              <p className="text-sm text-muted-foreground" data-testid="text-no-dispatches">No recent dispatch activity.</p>
            ) : (
              <div className="space-y-3" data-testid="recent-dispatches-list">
                {stats.recentDispatches.map((batch) => (
                  <div key={batch.id} className="flex items-center justify-between gap-3 p-3 rounded-md bg-muted/50" data-testid={`dispatch-${batch.id}`}>
                    <div className="min-w-0">
                      <p className="text-sm font-medium">{batch.bag_count} bags &middot; {batch.total_weight}kg</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(batch.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <Badge variant={batch.status === 'shipped' ? 'default' : 'secondary'}>
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
          <CardDescription>Common logistics tasks</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          <Link href="/app/shipments">
            <Button variant="outline" data-testid="button-view-shipments">
              <Truck className="h-4 w-4 mr-2" />
              View Shipments
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
          <Link href="/app/inventory">
            <Button variant="outline" data-testid="button-inventory">
              <Package className="h-4 w-4 mr-2" />
              Inventory
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
