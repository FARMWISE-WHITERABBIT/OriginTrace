'use client';

import { useEffect, type ComponentType } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { useOrg } from '@/lib/contexts/org-context';
import { ErrorBoundary } from '@/components/error-boundary';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';
import { ROLE_LABELS, isBuyerRole, isFarmerRole, type AppRole } from '@/lib/rbac';

function DashboardLoading() {
  return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
    </div>
  );
}

const AdminDashboard = dynamic(() => import('@/components/dashboards/admin-dashboard').then(mod => mod.AdminDashboard), {
  loading: DashboardLoading,
});
const AggregatorDashboard = dynamic(() => import('@/components/dashboards/aggregator-dashboard').then(mod => mod.AggregatorDashboard), {
  loading: DashboardLoading,
});
const AgentDashboard = dynamic(() => import('@/components/dashboards/agent-dashboard').then(mod => mod.AgentDashboard), {
  loading: DashboardLoading,
});
const QualityManagerDashboard = dynamic(() => import('@/components/dashboards/quality-manager-dashboard').then(mod => mod.QualityManagerDashboard), {
  loading: DashboardLoading,
});
const LogisticsDashboard = dynamic(() => import('@/components/dashboards/logistics-dashboard').then(mod => mod.LogisticsDashboard), {
  loading: DashboardLoading,
});
const ComplianceOfficerDashboard = dynamic(() => import('@/components/dashboards/compliance-officer-dashboard').then(mod => mod.ComplianceOfficerDashboard), {
  loading: DashboardLoading,
});
const WarehouseDashboard = dynamic(() => import('@/components/dashboards/warehouse-dashboard').then(mod => mod.WarehouseDashboard), {
  loading: DashboardLoading,
});

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

  const dashboardMap: Partial<Record<AppRole, ComponentType>> = {
    admin: AdminDashboard,
    aggregator: AggregatorDashboard,
    agent: AgentDashboard,
    quality_manager: QualityManagerDashboard,
    logistics_coordinator: LogisticsDashboard,
    compliance_officer: ComplianceOfficerDashboard,
    warehouse_supervisor: WarehouseDashboard,
  };
  const Dashboard = dashboardMap[appRole];

  if (!Dashboard) {
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

      <ErrorBoundary><Dashboard /></ErrorBoundary>
    </div>
  );
}
