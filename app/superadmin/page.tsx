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
  Wifi,
  CheckCircle2,
  AlertTriangle,
  ArrowUpRight,
  ShoppingCart,
  FileText,
  Banknote,
  QrCode,
  Key,
  ClipboardCheck,
  RefreshCw,
  Zap,
  Handshake,
  AlertCircle,
  XCircle,
} from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
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
  buyer_organizations: number;
  supply_chain_links: number;
  contracts: number;
  documents: number;
  expired_documents: number;
  payment_count: number;
  payment_by_currency: Record<string, number>;
  dpp_total: number;
  dpp_active: number;
  dpp_revoked: number;
  api_keys_total: number;
  api_keys_active: number;
  compliance_profiles: number;
}

interface AlertItem {
  id: string;
  level: 'warning' | 'critical' | 'info';
  message: string;
  href: string;
  count: number;
}

function buildAlerts(m: EnhancedMetrics): AlertItem[] {
  const alerts: AlertItem[] = [];
  if (m.suspended_orgs > 0) {
    alerts.push({
      id: 'suspended',
      level: 'critical',
      message: `${m.suspended_orgs} org${m.suspended_orgs > 1 ? 's' : ''} suspended`,
      href: '/superadmin/organizations',
      count: m.suspended_orgs,
    });
  }
  if (m.expired_documents > 0) {
    alerts.push({
      id: 'docs',
      level: 'warning',
      message: `${m.expired_documents} doc${m.expired_documents > 1 ? 's' : ''} expired/expiring`,
      href: '/superadmin/tenant-health',
      count: m.expired_documents,
    });
  }
  if (m.dpp_revoked > 0) {
    alerts.push({
      id: 'dpp',
      level: 'warning',
      message: `${m.dpp_revoked} DPP passport${m.dpp_revoked > 1 ? 's' : ''} revoked`,
      href: '/superadmin/tenant-health',
      count: m.dpp_revoked,
    });
  }
  if (m.active_agents > 0 && m.online_agents === 0) {
    alerts.push({
      id: 'agents',
      level: 'critical',
      message: 'No agents currently online',
      href: '/superadmin/sync',
      count: 0,
    });
  }
  return alerts;
}

const ALERT_STYLES = {
  critical: 'bg-red-950/40 border-red-800/60 text-red-400',
  warning:  'bg-amber-950/40 border-amber-800/60 text-amber-400',
  info:     'bg-cyan-950/40 border-cyan-800/60 text-cyan-400',
};

const ALERT_ICONS = {
  critical: XCircle,
  warning:  AlertTriangle,
  info:     AlertCircle,
};

export default function SuperadminDashboard() {
  const [metrics, setMetrics] = useState<EnhancedMetrics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    async function fetchMetrics() {
      try {
        const response = await fetch('/api/superadmin?resource=enhanced_metrics');
        if (response.ok) {
          const data = await response.json();
          setMetrics(data.metrics);
          setLastUpdated(new Date());
        } else {
          toast({ title: 'Error', description: 'Failed to load dashboard metrics.', variant: 'destructive' });
        }
      } catch {
        toast({ title: 'Error', description: 'Unable to connect to the server.', variant: 'destructive' });
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
  const alerts = metrics ? buildAlerts(metrics) : [];
  const pendingFarms = (metrics?.farms || 0) - (metrics?.approved_farms || 0);

  const QUICK_ACTIONS = [
    {
      href: '/superadmin/organizations',
      icon: Building2,
      label: 'Tenants',
      desc: 'Orgs, tiers, impersonate',
      color: 'text-violet-400',
      bg: 'bg-violet-500/10 border-violet-500/20',
    },
    {
      href: '/superadmin/billing',
      icon: Banknote,
      label: 'Billing',
      desc: 'Payment links & upgrades',
      color: 'text-emerald-400',
      bg: 'bg-emerald-500/10 border-emerald-500/20',
    },
    {
      href: '/superadmin/users',
      icon: Users,
      label: 'Users',
      desc: 'Roles & profiles',
      color: 'text-blue-400',
      bg: 'bg-blue-500/10 border-blue-500/20',
    },
    {
      href: '/superadmin/feature-toggles',
      icon: Zap,
      label: 'Feature Flags',
      desc: 'Toggle platform features',
      color: 'text-amber-400',
      bg: 'bg-amber-500/10 border-amber-500/20',
    },
    {
      href: '/superadmin/sync',
      icon: RefreshCw,
      label: 'Agent Sync',
      desc: 'First-mile pulse',
      color: 'text-cyan-400',
      bg: 'bg-cyan-500/10 border-cyan-500/20',
    },
    {
      href: '/superadmin/health',
      icon: AlertCircle,
      label: 'War Room',
      desc: 'System diagnostics',
      color: 'text-rose-400',
      bg: 'bg-rose-500/10 border-rose-500/20',
    },
  ];

  return (
    <div className="space-y-7">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold text-white" data-testid="text-page-title">Command Tower</h1>
          <p className="text-slate-400 mt-0.5">Platform-wide health and operations overview</p>
        </div>
        <div className="flex items-center gap-3">
          {lastUpdated && (
            <span className="text-xs text-slate-600">
              Updated {lastUpdated.toLocaleTimeString()}
            </span>
          )}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-green-500/10 border border-green-500/20">
            <Activity className="h-3.5 w-3.5 text-green-400 animate-pulse" />
            <span className="text-xs text-green-400 font-medium">Live · 30s</span>
          </div>
        </div>
      </div>

      {/* Alerts strip */}
      {alerts.length > 0 && (
        <div className="flex flex-wrap gap-2" data-testid="alerts-strip">
          {alerts.map(alert => {
            const Icon = ALERT_ICONS[alert.level];
            return (
              <Link
                key={alert.id}
                href={alert.href}
                className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium transition-opacity hover:opacity-80 ${ALERT_STYLES[alert.level]}`}
                data-testid={`alert-${alert.id}`}
              >
                <Icon className="h-4 w-4" />
                {alert.message}
                <ArrowUpRight className="h-3.5 w-3.5 opacity-60" />
              </Link>
            );
          })}
          {alerts.length === 0 && (
            <div className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-green-800/40 bg-green-950/30 text-green-400 text-sm">
              <CheckCircle2 className="h-4 w-4" />
              All systems healthy
            </div>
          )}
        </div>
      )}
      {alerts.length === 0 && !isLoading && (
        <div className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-green-800/40 bg-green-950/30 text-green-400 text-sm">
          <CheckCircle2 className="h-4 w-4" />
          All systems healthy — no active alerts
        </div>
      )}

      {/* Hero KPIs */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="bg-slate-900 border-slate-700">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 gap-2">
            <CardTitle className="text-xs font-medium text-slate-400 uppercase tracking-wide">Ecosystem Volume</CardTitle>
            <div className="h-8 w-8 rounded-lg bg-cyan-500/10 flex items-center justify-center">
              <Weight className="h-4 w-4 text-cyan-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-white">{ecosystemVolumeMT} <span className="text-base text-slate-500">MT</span></div>
            <div className="flex items-center gap-1 mt-1.5">
              <TrendingUp className="h-3 w-3 text-green-400" />
              <p className="text-xs text-slate-500">Across all tenants</p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-900 border-slate-700">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 gap-2">
            <CardTitle className="text-xs font-medium text-slate-400 uppercase tracking-wide">Active Tenants</CardTitle>
            <div className="h-8 w-8 rounded-lg bg-violet-500/10 flex items-center justify-center">
              <Building2 className="h-4 w-4 text-violet-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-white">{metrics?.active_orgs || 0}</div>
            <div className="flex items-center gap-2 mt-1.5">
              <span className="text-xs text-slate-500">{metrics?.organizations || 0} total</span>
              {(metrics?.suspended_orgs || 0) > 0 && (
                <span className="text-xs text-red-400 flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3" />
                  {metrics?.suspended_orgs} suspended
                </span>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-900 border-slate-700">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 gap-2">
            <CardTitle className="text-xs font-medium text-slate-400 uppercase tracking-wide">Agent Pulse</CardTitle>
            <div className={`h-8 w-8 rounded-lg flex items-center justify-center ${onlineAgentPercent > 0 ? 'bg-green-500/10' : 'bg-red-500/10'}`}>
              <Wifi className={`h-4 w-4 ${onlineAgentPercent > 0 ? 'text-green-400' : 'text-red-400'}`} />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-white">
              {metrics?.online_agents || 0}
              <span className="text-base text-slate-500 ml-1">/ {metrics?.active_agents || 0}</span>
            </div>
            <div className="mt-2">
              <Progress
                value={onlineAgentPercent}
                className={`h-1.5 bg-slate-800 ${onlineAgentPercent === 0 ? '[&>div]:bg-red-500' : '[&>div]:bg-green-500'}`}
              />
            </div>
            <p className="text-xs text-slate-500 mt-1">{onlineAgentPercent}% online now</p>
          </CardContent>
        </Card>

        <Card className="bg-slate-900 border-slate-700">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 gap-2">
            <CardTitle className="text-xs font-medium text-slate-400 uppercase tracking-wide">EUDR Compliance</CardTitle>
            <div className={`h-8 w-8 rounded-lg flex items-center justify-center ${
              complianceRate >= 80 ? 'bg-green-500/10' : complianceRate >= 50 ? 'bg-amber-500/10' : 'bg-red-500/10'
            }`}>
              <Shield className={`h-4 w-4 ${
                complianceRate >= 80 ? 'text-green-400' : complianceRate >= 50 ? 'text-amber-400' : 'text-red-400'
              }`} />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-white">{complianceRate}<span className="text-base text-slate-500">%</span></div>
            <div className="mt-2">
              <Progress
                value={complianceRate}
                className={`h-1.5 bg-slate-800 ${
                  complianceRate >= 80
                    ? '[&>div]:bg-green-500'
                    : complianceRate >= 50
                    ? '[&>div]:bg-amber-500'
                    : '[&>div]:bg-red-500'
                }`}
              />
            </div>
            <p className="text-xs text-slate-500 mt-1">Farm readiness system-wide</p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions + Operations + Compliance */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Quick Actions — 2x3 grid */}
        <Card className="bg-slate-900 border-slate-700 lg:col-span-1">
          <CardHeader className="pb-3">
            <CardTitle className="text-white text-sm font-semibold">Quick Access</CardTitle>
            <CardDescription className="text-slate-500 text-xs">Navigate to key sections</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-2">
            {QUICK_ACTIONS.map(action => (
              <Link
                key={action.href}
                href={action.href}
                className={`flex flex-col gap-1.5 p-3 rounded-lg border transition-all hover:scale-[1.02] group ${action.bg}`}
                data-testid={`link-action-${action.label.toLowerCase().replace(' ', '-')}`}
              >
                <action.icon className={`h-4 w-4 ${action.color}`} />
                <div>
                  <div className="text-xs font-semibold text-white">{action.label}</div>
                  <div className="text-[10px] text-slate-500 leading-tight">{action.desc}</div>
                </div>
              </Link>
            ))}
          </CardContent>
        </Card>

        {/* Operations */}
        <Card className="bg-slate-900 border-slate-700">
          <CardHeader className="pb-3">
            <CardTitle className="text-white text-sm font-semibold flex items-center gap-2">
              <Activity className="h-4 w-4 text-cyan-400" />
              Operations
            </CardTitle>
            <CardDescription className="text-slate-500 text-xs">Supply chain & collection stats</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {[
              { label: 'Total Farms', value: (metrics?.farms || 0).toLocaleString(), sub: `${metrics?.approved_farms || 0} approved`, ok: true },
              { label: 'Pending Farms', value: pendingFarms.toLocaleString(), sub: 'awaiting approval', ok: pendingFarms === 0 },
              { label: 'Bags Tracked', value: (metrics?.bags || 0).toLocaleString(), sub: 'all tenants', ok: true },
              { label: 'Total Users', value: (metrics?.users || 0).toLocaleString(), sub: `${metrics?.active_agents || 0} agents`, ok: true },
            ].map(row => (
              <div key={row.label} className="flex items-center justify-between py-1 border-b border-slate-800 last:border-0">
                <div>
                  <div className="text-sm text-slate-300">{row.label}</div>
                  <div className="text-xs text-slate-600">{row.sub}</div>
                </div>
                <div className={`text-sm font-semibold ${row.ok ? 'text-white' : 'text-amber-400'}`}>
                  {row.value}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Compliance */}
        <Card className="bg-slate-900 border-slate-700">
          <CardHeader className="pb-3">
            <CardTitle className="text-white text-sm font-semibold flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-amber-400" />
              Compliance & DPP
            </CardTitle>
            <CardDescription className="text-slate-500 text-xs">EUDR readiness and passport status</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="rounded-lg bg-slate-800/60 border border-slate-700 p-3 text-center">
              <div className={`text-3xl font-bold ${
                complianceRate >= 80 ? 'text-green-400' : complianceRate >= 50 ? 'text-amber-400' : 'text-red-400'
              }`}>{complianceRate}%</div>
              <div className="text-xs text-slate-500 mt-0.5">Overall EUDR Compliance</div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="text-center p-2.5 rounded-lg bg-green-500/10 border border-green-500/20">
                <div className="text-lg font-bold text-green-400">{metrics?.approved_farms || 0}</div>
                <div className="text-[10px] text-slate-500">Approved</div>
              </div>
              <div className="text-center p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20">
                <div className={`text-lg font-bold ${pendingFarms > 0 ? 'text-amber-400' : 'text-slate-500'}`}>{pendingFarms}</div>
                <div className="text-[10px] text-slate-500">Pending</div>
              </div>
            </div>
            {[
              { label: 'DPP Passports', value: metrics?.dpp_total || 0, sub: `${metrics?.dpp_active || 0} active`, warn: (metrics?.dpp_revoked || 0) > 0, warnText: `${metrics?.dpp_revoked} revoked` },
              { label: 'Compliance Profiles', value: metrics?.compliance_profiles || 0, sub: 'across all orgs' },
            ].map(row => (
              <div key={row.label} className="flex items-center justify-between py-1 border-b border-slate-800 last:border-0">
                <div>
                  <div className="text-sm text-slate-300">{row.label}</div>
                  <div className={`text-xs ${row.warn ? 'text-red-400' : 'text-slate-600'}`}>
                    {row.warn ? row.warnText : row.sub}
                  </div>
                </div>
                <div className="text-sm font-semibold text-white">{row.value}</div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Platform Expansion */}
      <div>
        <h2 className="text-base font-semibold text-slate-300 mb-4 flex items-center gap-2" data-testid="text-expansion-title">
          <TrendingUp className="h-4 w-4 text-cyan-400" />
          Platform Expansion
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">

          {/* Buyer Ecosystem */}
          <Card className="bg-slate-900 border-slate-700" data-testid="card-buyer-ecosystem">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 gap-2">
              <CardTitle className="text-xs font-medium text-slate-400 uppercase tracking-wide">Buyer Ecosystem</CardTitle>
              <div className="h-8 w-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
                <Handshake className="h-4 w-4 text-blue-400" />
              </div>
            </CardHeader>
            <CardContent className="space-y-2.5">
              {[
                { label: 'Buyer Organizations', value: metrics?.buyer_organizations || 0, testid: 'text-buyer-orgs' },
                { label: 'Supply Chain Links', value: metrics?.supply_chain_links || 0, testid: 'text-supply-chain-links' },
                { label: 'Contracts', value: metrics?.contracts || 0, testid: 'text-contracts' },
              ].map(r => (
                <div key={r.label} className="flex items-center justify-between text-sm">
                  <span className="text-slate-500">{r.label}</span>
                  <span className="font-medium text-white" data-testid={r.testid}>{r.value}</span>
                </div>
              ))}
              <Link href="/superadmin/buyer-orgs" className="flex items-center gap-1 text-xs text-cyan-500 hover:text-cyan-400 pt-1">
                Manage <ArrowUpRight className="h-3 w-3" />
              </Link>
            </CardContent>
          </Card>

          {/* Document Vault */}
          <Card className="bg-slate-900 border-slate-700" data-testid="card-document-vault">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 gap-2">
              <CardTitle className="text-xs font-medium text-slate-400 uppercase tracking-wide">Document Vault</CardTitle>
              <div className="h-8 w-8 rounded-lg bg-indigo-500/10 flex items-center justify-center">
                <FileText className="h-4 w-4 text-indigo-400" />
              </div>
            </CardHeader>
            <CardContent className="space-y-2.5">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-500">Total Documents</span>
                <span className="font-medium text-white" data-testid="text-total-documents">{metrics?.documents || 0}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-500">Expired / Expiring</span>
                <span className={`font-medium ${(metrics?.expired_documents || 0) > 0 ? 'text-orange-400' : 'text-slate-500'}`} data-testid="text-expired-documents">
                  {metrics?.expired_documents || 0}
                </span>
              </div>
              {(metrics?.expired_documents || 0) > 0 && (
                <Badge variant="outline" className="text-[10px] bg-orange-950/30 text-orange-400 border-orange-800/50">
                  Action required
                </Badge>
              )}
            </CardContent>
          </Card>

          {/* Payment Volume */}
          <Card className="bg-slate-900 border-slate-700" data-testid="card-payment-volume">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 gap-2">
              <CardTitle className="text-xs font-medium text-slate-400 uppercase tracking-wide">Payment Volume</CardTitle>
              <div className="h-8 w-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                <Banknote className="h-4 w-4 text-emerald-400" />
              </div>
            </CardHeader>
            <CardContent className="space-y-2.5">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-500">Transactions</span>
                <span className="font-medium text-white" data-testid="text-payment-count">{metrics?.payment_count || 0}</span>
              </div>
              {metrics?.payment_by_currency && Object.entries(metrics.payment_by_currency).map(([currency, amount]) => (
                <div key={currency} className="flex items-center justify-between text-sm">
                  <span className="text-slate-500">{currency}</span>
                  <span className="font-medium text-white" data-testid={`text-payment-${currency}`}>
                    {Number(amount).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                  </span>
                </div>
              ))}
              <Link href="/superadmin/billing" className="flex items-center gap-1 text-xs text-cyan-500 hover:text-cyan-400 pt-1">
                View billing <ArrowUpRight className="h-3 w-3" />
              </Link>
            </CardContent>
          </Card>

          {/* Enterprise API */}
          <Card className="bg-slate-900 border-slate-700" data-testid="card-api-usage">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 gap-2">
              <CardTitle className="text-xs font-medium text-slate-400 uppercase tracking-wide">Enterprise API</CardTitle>
              <div className="h-8 w-8 rounded-lg bg-teal-500/10 flex items-center justify-center">
                <Key className="h-4 w-4 text-teal-400" />
              </div>
            </CardHeader>
            <CardContent className="space-y-2.5">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-500">Total API Keys</span>
                <span className="font-medium text-white" data-testid="text-api-keys-total">{metrics?.api_keys_total || 0}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-500">Active Keys</span>
                <span className={`font-medium ${(metrics?.api_keys_active || 0) > 0 ? 'text-green-400' : 'text-slate-500'}`} data-testid="text-api-keys-active">
                  {metrics?.api_keys_active || 0}
                </span>
              </div>
              {metrics?.api_keys_total ? (
                <div className="pt-1">
                  <Progress
                    value={metrics.api_keys_total > 0 ? Math.round((metrics.api_keys_active / metrics.api_keys_total) * 100) : 0}
                    className="h-1.5 bg-slate-800 [&>div]:bg-teal-500"
                  />
                  <p className="text-[10px] text-slate-600 mt-1">
                    {metrics.api_keys_total > 0 ? Math.round((metrics.api_keys_active / metrics.api_keys_total) * 100) : 0}% active utilization
                  </p>
                </div>
              ) : null}
            </CardContent>
          </Card>

          {/* DPP Passports */}
          <Card className="bg-slate-900 border-slate-700" data-testid="card-dpp-passports">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 gap-2">
              <CardTitle className="text-xs font-medium text-slate-400 uppercase tracking-wide">DPP Passports</CardTitle>
              <div className="h-8 w-8 rounded-lg bg-purple-500/10 flex items-center justify-center">
                <QrCode className="h-4 w-4 text-purple-400" />
              </div>
            </CardHeader>
            <CardContent className="space-y-2.5">
              {[
                { label: 'Total', value: metrics?.dpp_total || 0, color: 'text-white', testid: 'text-dpp-total' },
                { label: 'Active', value: metrics?.dpp_active || 0, color: 'text-green-400', testid: 'text-dpp-active' },
                { label: 'Revoked', value: metrics?.dpp_revoked || 0, color: (metrics?.dpp_revoked || 0) > 0 ? 'text-red-400' : 'text-slate-500', testid: 'text-dpp-revoked' },
              ].map(r => (
                <div key={r.label} className="flex items-center justify-between text-sm">
                  <span className="text-slate-500">{r.label}</span>
                  <span className={`font-medium ${r.color}`} data-testid={r.testid}>{r.value}</span>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Compliance Profiles */}
          <Card className="bg-slate-900 border-slate-700" data-testid="card-compliance-profiles">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 gap-2">
              <CardTitle className="text-xs font-medium text-slate-400 uppercase tracking-wide">Compliance Profiles</CardTitle>
              <div className="h-8 w-8 rounded-lg bg-rose-500/10 flex items-center justify-center">
                <ClipboardCheck className="h-4 w-4 text-rose-400" />
              </div>
            </CardHeader>
            <CardContent className="space-y-2.5">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-500">Total Profiles</span>
                <span className="font-medium text-white" data-testid="text-compliance-profiles">{metrics?.compliance_profiles || 0}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-500">Orgs with profile</span>
                <span className="font-medium text-white">
                  {metrics?.compliance_profiles && metrics?.organizations
                    ? Math.min(metrics.compliance_profiles, metrics.organizations)
                    : 0}
                </span>
              </div>
              <Link href="/superadmin/tenant-health" className="flex items-center gap-1 text-xs text-cyan-500 hover:text-cyan-400 pt-1">
                View health <ArrowUpRight className="h-3 w-3" />
              </Link>
            </CardContent>
          </Card>

        </div>
      </div>
    </div>
  );
}
