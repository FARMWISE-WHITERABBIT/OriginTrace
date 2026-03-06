'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Building2, 
  Users, 
  Weight, 
  Shield, 
  Activity, 
  Loader2, 
  TrendingUp,
  Globe,
  Wifi,
  CheckCircle2,
  AlertTriangle,
  ArrowUpRight
} from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import Link from 'next/link';

interface EnhancedMetrics {
  organizations: number;
  active_orgs: number;
  suspended_orgs: number;
  users: number;
  farms: number;
  bags: number;
  approved_farms: number;
  total_weight_kg: number;
  active_agents: number;
  online_agents: number;
  compliance_rate: number;
}

export default function SuperadminDashboard() {
  const [metrics, setMetrics] = useState<EnhancedMetrics | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchMetrics() {
      try {
        const response = await fetch('/api/superadmin?resource=enhanced_metrics');
        if (response.ok) {
          const data = await response.json();
          setMetrics(data.metrics);
        }
      } catch (error) {
        console.error('Failed to fetch metrics:', error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchMetrics();
    const interval = setInterval(fetchMetrics, 30000);
    return () => clearInterval(interval);
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-cyan-400" />
      </div>
    );
  }

  const ecosystemVolumeMT = ((metrics?.total_weight_kg || 0) / 1000).toFixed(1);
  const complianceRate = metrics?.compliance_rate || 0;
  const onlineAgentPercent = metrics?.active_agents 
    ? Math.round((metrics.online_agents / metrics.active_agents) * 100) 
    : 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white" data-testid="text-page-title">Command Tower</h1>
          <p className="text-slate-400">Platform-wide health and operations overview</p>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-green-500/10 border border-green-500/30">
          <Activity className="h-4 w-4 text-green-400 animate-pulse" />
          <span className="text-sm text-green-400 font-medium">Live</span>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="bg-slate-900 border-slate-700">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 gap-2">
            <CardTitle className="text-sm font-medium text-slate-300">Ecosystem Volume</CardTitle>
            <div className="h-9 w-9 rounded-lg bg-cyan-500/10 flex items-center justify-center">
              <Weight className="h-5 w-5 text-cyan-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-white">{ecosystemVolumeMT} <span className="text-lg text-slate-400">MT</span></div>
            <div className="flex items-center gap-1 mt-1">
              <TrendingUp className="h-3 w-3 text-green-400" />
              <p className="text-xs text-green-400">Total collected across all tenants</p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-900 border-slate-700">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 gap-2">
            <CardTitle className="text-sm font-medium text-slate-300">Active Tenants</CardTitle>
            <div className="h-9 w-9 rounded-lg bg-violet-500/10 flex items-center justify-center">
              <Building2 className="h-5 w-5 text-violet-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-white">{metrics?.active_orgs || 0}</div>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-xs text-slate-400">{metrics?.organizations || 0} total</span>
              {(metrics?.suspended_orgs || 0) > 0 && (
                <span className="text-xs text-orange-400 flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3" />
                  {metrics?.suspended_orgs} suspended
                </span>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-900 border-slate-700">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 gap-2">
            <CardTitle className="text-sm font-medium text-slate-300">First-Mile Pulse</CardTitle>
            <div className="h-9 w-9 rounded-lg bg-green-500/10 flex items-center justify-center">
              <Wifi className="h-5 w-5 text-green-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-white">{metrics?.online_agents || 0} <span className="text-lg text-slate-400">/ {metrics?.active_agents || 0}</span></div>
            <div className="mt-2">
              <Progress value={onlineAgentPercent} className="h-1.5 bg-slate-700" />
            </div>
            <p className="text-xs text-slate-400 mt-1">{onlineAgentPercent}% agents currently online</p>
          </CardContent>
        </Card>

        <Card className="bg-slate-900 border-slate-700">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 gap-2">
            <CardTitle className="text-sm font-medium text-slate-300">Compliance Heatmap</CardTitle>
            <div className="h-9 w-9 rounded-lg bg-amber-500/10 flex items-center justify-center">
              <Shield className="h-5 w-5 text-amber-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-white">{complianceRate}<span className="text-lg text-slate-400">%</span></div>
            <div className="mt-2">
              <Progress 
                value={complianceRate} 
                className={`h-1.5 bg-slate-700 ${complianceRate >= 80 ? '[&>div]:bg-green-500' : complianceRate >= 50 ? '[&>div]:bg-amber-500' : '[&>div]:bg-red-500'}`} 
              />
            </div>
            <p className="text-xs text-slate-400 mt-1">EUDR-ready farms system-wide</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card className="bg-slate-900 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Globe className="h-5 w-5 text-cyan-400" />
              Quick Actions
            </CardTitle>
            <CardDescription className="text-slate-400">Platform management shortcuts</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <Link 
              href="/superadmin/organizations" 
              className="flex items-center justify-between p-3 rounded-lg border border-slate-700 hover:border-cyan-500/50 hover:bg-slate-800/50 transition-all group"
              data-testid="link-manage-orgs"
            >
              <div>
                <div className="font-medium text-white">Manage Tenants</div>
                <div className="text-sm text-slate-400">View and impersonate organizations</div>
              </div>
              <ArrowUpRight className="h-4 w-4 text-slate-500 group-hover:text-cyan-400 transition-colors" />
            </Link>
            <Link 
              href="/superadmin/users" 
              className="flex items-center justify-between p-3 rounded-lg border border-slate-700 hover:border-cyan-500/50 hover:bg-slate-800/50 transition-all group"
              data-testid="link-manage-users"
            >
              <div>
                <div className="font-medium text-white">User Management</div>
                <div className="text-sm text-slate-400">Manage users and roles</div>
              </div>
              <ArrowUpRight className="h-4 w-4 text-slate-500 group-hover:text-cyan-400 transition-colors" />
            </Link>
            <Link 
              href="/superadmin/settings" 
              className="flex items-center justify-between p-3 rounded-lg border border-slate-700 hover:border-cyan-500/50 hover:bg-slate-800/50 transition-all group"
              data-testid="link-factory-settings"
            >
              <div>
                <div className="font-medium text-white">Factory Settings</div>
                <div className="text-sm text-slate-400">Global commodity & tier controls</div>
              </div>
              <ArrowUpRight className="h-4 w-4 text-slate-500 group-hover:text-cyan-400 transition-colors" />
            </Link>
          </CardContent>
        </Card>

        <Card className="bg-slate-900 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Activity className="h-5 w-5 text-green-400" />
              Platform Health
            </CardTitle>
            <CardDescription className="text-slate-400">System status overview</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-300">Database Status</span>
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-green-400 animate-pulse" />
                <span className="text-sm font-medium text-green-400">Healthy</span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-300">API Status</span>
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-green-400 animate-pulse" />
                <span className="text-sm font-medium text-green-400">Operational</span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-300">Sync Service</span>
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-green-400 animate-pulse" />
                <span className="text-sm font-medium text-green-400">Running</span>
              </div>
            </div>
            <div className="pt-2 border-t border-slate-700">
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-300">Total Farms</span>
                <span className="text-sm font-medium text-white">{metrics?.farms?.toLocaleString() || 0}</span>
              </div>
              <div className="flex items-center justify-between mt-2">
                <span className="text-sm text-slate-300">Approved Farms</span>
                <span className="text-sm font-medium text-green-400">{metrics?.approved_farms?.toLocaleString() || 0}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-900 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-amber-400" />
              Compliance Overview
            </CardTitle>
            <CardDescription className="text-slate-400">EUDR readiness metrics</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-center p-4 rounded-lg bg-slate-800/50 border border-slate-700">
              <div className="text-4xl font-bold text-white mb-1">{complianceRate}%</div>
              <div className="text-sm text-slate-400">Overall Compliance Rate</div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="text-center p-3 rounded-lg bg-green-500/10 border border-green-500/20">
                <div className="text-xl font-bold text-green-400">{metrics?.approved_farms || 0}</div>
                <div className="text-xs text-slate-400">Approved</div>
              </div>
              <div className="text-center p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
                <div className="text-xl font-bold text-amber-400">{(metrics?.farms || 0) - (metrics?.approved_farms || 0)}</div>
                <div className="text-xs text-slate-400">Pending</div>
              </div>
            </div>
            <div className="pt-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-400">Total Bags Tracked</span>
                <span className="font-medium text-white">{metrics?.bags?.toLocaleString() || 0}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
