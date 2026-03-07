'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Handshake, FileCheck, Ship, Clock, Loader2 } from 'lucide-react';
import Link from 'next/link';

interface BuyerSummary {
  activeSuppliers: number;
  pendingInvitations: number;
  activeContracts: number;
  draftContracts: number;
  fulfilledContracts: number;
  pendingShipments: number;
  totalLinks: number;
  totalContracts: number;
}

interface RecentContract {
  id: string;
  contract_reference: string;
  commodity: string;
  status: string;
  quantity_mt: number | null;
  delivery_deadline: string | null;
  created_at: string;
}

interface BuyerDashboardData {
  summary: BuyerSummary;
  recentContracts: RecentContract[];
  organization: { name: string; country?: string } | null;
}

const STATUS_VARIANT: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  active: 'default',
  draft: 'outline',
  fulfilled: 'secondary',
  cancelled: 'destructive',
};

export function BuyerDashboard() {
  const [data, setData] = useState<BuyerDashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const response = await fetch('/api/buyer');
        if (!response.ok) throw new Error('Failed to fetch');
        const json = await response.json();
        setData({
          summary: json.summary,
          recentContracts: json.recentContracts || [],
          organization: json.organization,
        });
      } catch (error) {
        console.error('Failed to fetch buyer dashboard:', error);
      } finally {
        setIsLoading(false);
      }
    }
    fetchData();
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const summary = data?.summary || {
    activeSuppliers: 0, pendingInvitations: 0, activeContracts: 0,
    draftContracts: 0, fulfilledContracts: 0, pendingShipments: 0,
    totalLinks: 0, totalContracts: 0,
  };

  const statCards = [
    { title: 'Active Suppliers', value: summary.activeSuppliers, icon: Handshake, description: 'Connected exporters', href: '/app/buyer/suppliers' },
    { title: 'Active Contracts', value: summary.activeContracts, icon: FileCheck, description: `${summary.totalContracts} total`, href: '/app/buyer/contracts' },
    { title: 'Pending Shipments', value: summary.pendingShipments, icon: Ship, description: 'Linked to contracts', href: '/app/buyer/shipments' },
    { title: 'Pending Invitations', value: summary.pendingInvitations, icon: Clock, description: 'Awaiting response', href: '/app/buyer/suppliers' },
  ];

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat) => (
          <Link key={stat.title} href={stat.href}>
            <Card className="hover-elevate cursor-pointer" data-testid={`stat-${stat.title.toLowerCase().replace(/\s/g, '-')}`}>
              <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
                <stat.icon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid={`text-stat-value-${stat.title.toLowerCase().replace(/\s/g, '-')}`}>
                  {stat.value}
                </div>
                <p className="text-xs text-muted-foreground">{stat.description}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recent Contract Activity</CardTitle>
        </CardHeader>
        <CardContent>
          {data?.recentContracts && data.recentContracts.length > 0 ? (
            <div className="space-y-3">
              {data.recentContracts.map((contract) => (
                <Link key={contract.id} href="/app/buyer/contracts">
                  <div className="flex items-center justify-between gap-4 p-3 rounded-md hover-elevate cursor-pointer" data-testid={`row-contract-${contract.id}`}>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-sm font-medium" data-testid={`text-contract-ref-${contract.id}`}>
                          {contract.contract_reference}
                        </span>
                        <Badge variant={STATUS_VARIANT[contract.status] || 'outline'} data-testid={`badge-contract-status-${contract.id}`}>
                          {contract.status}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground flex-wrap">
                        <span>{contract.commodity}</span>
                        {contract.quantity_mt && <span>{Number(contract.quantity_mt).toLocaleString()} MT</span>}
                        {contract.delivery_deadline && (
                          <span>Due: {new Date(contract.delivery_deadline).toLocaleDateString()}</span>
                        )}
                      </div>
                    </div>
                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                      {new Date(contract.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground py-4 text-center" data-testid="text-no-contracts">
              No contract activity yet. Create your first contract from the Contracts page.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
