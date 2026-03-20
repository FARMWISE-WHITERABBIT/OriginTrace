'use client';

import { useOrg } from '@/lib/contexts/org-context';
import { AdminDashboard } from '@/components/dashboards/admin-dashboard';
import { AgentDashboard } from '@/components/dashboards/agent-dashboard';
import { AggregatorDashboard } from '@/components/dashboards/aggregator-dashboard';
import { QualityManagerDashboard } from '@/components/dashboards/quality-manager-dashboard';
import { LogisticsDashboard } from '@/components/dashboards/logistics-dashboard';
import { ComplianceOfficerDashboard } from '@/components/dashboards/compliance-officer-dashboard';
import { WarehouseDashboard } from '@/components/dashboards/warehouse-dashboard';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';

export default function AppDashboardPage() {
  const { profile, organization, isLoading, isConfigured } = useOrg();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!isConfigured) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <h2 className="text-xl font-semibold mb-2">Configuration Required</h2>
          <p className="text-muted-foreground">
            Supabase is not configured. Please add your Supabase credentials.
          </p>
        </CardContent>
      </Card>
    );
  }

  if (!profile || !organization) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <h2 className="text-xl font-semibold mb-2">Welcome to OriginTrace</h2>
          <p className="text-muted-foreground">
            Please sign in to access your dashboard.
          </p>
        </CardContent>
      </Card>
    );
  }

  const role = profile.role;

  const dashboardMap: Record<string, React.ReactNode> = {
    admin: <AdminDashboard />,
    aggregator: <AggregatorDashboard />,
    agent: <AgentDashboard />,
    quality_manager: <QualityManagerDashboard />,
    logistics_coordinator: <LogisticsDashboard />,
    compliance_officer: <ComplianceOfficerDashboard />,
    warehouse_supervisor: <WarehouseDashboard />,
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          Welcome back, {profile.full_name}
        </p>
      </div>

      {dashboardMap[role] || <AdminDashboard />}
    </div>
  );
}
