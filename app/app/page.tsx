'use client';

import { useEffect, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { useOrg } from '@/lib/contexts/org-context';
import { AdminDashboard } from '@/components/dashboards/admin-dashboard';
import { AgentDashboard } from '@/components/dashboards/agent-dashboard';
import { AggregatorDashboard } from '@/components/dashboards/aggregator-dashboard';
import { QualityManagerDashboard } from '@/components/dashboards/quality-manager-dashboard';
import { LogisticsDashboard } from '@/components/dashboards/logistics-dashboard';
import { ComplianceOfficerDashboard } from '@/components/dashboards/compliance-officer-dashboard';
import { WarehouseDashboard } from '@/components/dashboards/warehouse-dashboard';
import { ErrorBoundary } from '@/components/error-boundary';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';
import { ROLE_LABELS, isBuyerRole, isFarmerRole, type AppRole } from '@/lib/rbac';

function isAppRole(role: string): role is AppRole {
  return role in ROLE_LABELS;
}

export default function AppDashboardPage() {
  const { profile, organization, isLoading, isConfigured } = useOrg();
  const router = useRouter();
  const appRole = profile?.role && isAppRole(profile.role) ? profile.role : null;

  useEffect(() => {
    if (!appRole) return;
    if (isBuyerRole(appRole)) {
      router.replace('/app/buyer');
    } else if (isFarmerRole(appRole)) {
      router.replace('/app/farmer');
    }
  }, [appRole, router]);

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

  if (!appRole) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <h2 className="text-xl font-semibold mb-2">Access Restricted</h2>
          <p className="text-muted-foreground">
            Your account role is not configured for this dashboard.
          </p>
        </CardContent>
      </Card>
    );
  }

  if (isBuyerRole(appRole) || isFarmerRole(appRole)) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const dashboardMap: Partial<Record<AppRole, ReactNode>> = {
    admin: <AdminDashboard />,
    aggregator: <AggregatorDashboard />,
    agent: <AgentDashboard />,
    quality_manager: <QualityManagerDashboard />,
    logistics_coordinator: <LogisticsDashboard />,
    compliance_officer: <ComplianceOfficerDashboard />,
    warehouse_supervisor: <WarehouseDashboard />,
  };
  const dashboard = dashboardMap[appRole];

  if (!dashboard) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <h2 className="text-xl font-semibold mb-2">Access Restricted</h2>
          <p className="text-muted-foreground">
            {ROLE_LABELS[appRole]} does not have a generic dashboard.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          Welcome back, {profile.full_name}
        </p>
      </div>

      <ErrorBoundary>{dashboard}</ErrorBoundary>
    </div>
  );
}
