'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, Satellite, RefreshCw, CheckCircle2, AlertTriangle, Clock, XCircle, Info } from 'lucide-react';

interface TracesTenant {
  org_id: number;
  org_name: string;
  subscription_tier: string;
  dds_enabled: boolean;
  status: 'healthy' | 'warning' | 'critical' | 'inactive';
}

const STATUS_CONFIG = {
  healthy:  { label: 'Healthy',  badge: 'bg-green-900/40 text-green-300 border-green-700',  icon: CheckCircle2, dot: 'bg-green-400' },
  warning:  { label: 'Warning',  badge: 'bg-amber-900/40 text-amber-300 border-amber-700',  icon: AlertTriangle, dot: 'bg-amber-400' },
  critical: { label: 'Critical', badge: 'bg-red-900/40 text-red-300 border-red-700',        icon: XCircle, dot: 'bg-red-400' },
  inactive: { label: 'Inactive', badge: 'bg-slate-700 text-slate-400 border-slate-600',     icon: Clock, dot: 'bg-slate-500' },
};

export default function TracesMonitorPage() {
  const [tenants, setTenants] = useState<TracesTenant[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchData(); }, []);

  async function fetchData() {
    setLoading(true);
    try {
      const res = await fetch('/api/superadmin?resource=organizations');
      if (res.ok) {
        const data = await res.json();
        const rows: TracesTenant[] = (data.organizations ?? []).map((o: any) => {
          const dds_enabled = ['pro', 'enterprise'].includes(o.subscription_tier ?? '');
          // Status derived from tier eligibility only until dds_submissions table is connected:
          // - pro/enterprise → 'warning' (eligible but no live submission data yet)
          // - starter/basic → 'inactive' (DDS not included in their tier)
          const status: TracesTenant['status'] = dds_enabled ? 'warning' : 'inactive';
          return {
            org_id: o.id,
            org_name: o.name,
            subscription_tier: o.subscription_tier ?? 'starter',
            dds_enabled,
            status,
          };
        });
        setTenants(rows.sort((a, b) => {
          const order = { critical: 0, warning: 1, healthy: 2, inactive: 3 };
          return order[a.status] - order[b.status];
        }));
      }
    } finally { setLoading(false); }
  }

  const counts = {
    healthy: tenants.filter(t => t.status === 'healthy').length,
    warning: tenants.filter(t => t.status === 'warning').length,
    critical: tenants.filter(t => t.status === 'critical').length,
    inactive: tenants.filter(t => t.status === 'inactive').length,
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <Satellite className="h-7 w-7 text-cyan-400" />TRACES Monitor
          </h1>
          <p className="text-slate-400">EU TRACES NT / DDS submission health per tenant</p>
        </div>
        <Button variant="outline" className="border-slate-600 text-slate-300 hover:bg-slate-800 shrink-0" onClick={fetchData}>
          <RefreshCw className="h-4 w-4 mr-2" />Refresh
        </Button>
      </div>

      <div className="rounded-lg bg-blue-950/30 border border-blue-800/50 px-4 py-3 text-sm text-blue-300 flex items-start gap-2">
        <Info className="h-4 w-4 shrink-0 mt-0.5" />
        Live DDS submission counts require a <code className="font-mono text-xs bg-blue-900/40 px-1 rounded">dds_submissions</code> table.
        Status currently reflects DDS eligibility by subscription tier — Pro and Enterprise are DDS-enabled.
        Connect the table to unlock submission counts, failure rates, and last-submission dates.
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-24">
          <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {(Object.entries(counts) as [keyof typeof STATUS_CONFIG, number][]).map(([status, count]) => {
              const cfg = STATUS_CONFIG[status];
              return (
                <Card key={status} className="bg-slate-900 border-slate-700">
                  <CardHeader className="flex flex-row items-center justify-between pb-2 gap-2">
                    <CardTitle className="text-sm font-medium text-slate-400">{cfg.label}</CardTitle>
                    <span className={`h-2.5 w-2.5 rounded-full ${cfg.dot}`} />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-white">{count}</div>
                    <p className="text-xs text-slate-500 mt-1">tenants</p>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          <Card className="bg-slate-900 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white text-base">Per-Tenant DDS Eligibility</CardTitle>
              <CardDescription className="text-slate-400">
                Pro and Enterprise tenants are DDS-enabled. Submission history requires a connected <code className="font-mono text-xs">dds_submissions</code> table.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow className="border-slate-700">
                    <TableHead className="text-slate-400">Organization</TableHead>
                    <TableHead className="text-slate-400">Tier</TableHead>
                    <TableHead className="text-slate-400">DDS Eligible</TableHead>
                    <TableHead className="text-slate-400">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tenants.map(t => {
                    const cfg = STATUS_CONFIG[t.status];
                    const StatusIcon = cfg.icon;
                    return (
                      <TableRow key={t.org_id} className="border-slate-700 hover:bg-slate-800/40">
                        <TableCell className="font-medium text-white">{t.org_name}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs capitalize border-slate-600 text-slate-400">
                            {t.subscription_tier}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {t.dds_enabled
                            ? <span className="text-xs text-green-400 flex items-center gap-1"><CheckCircle2 className="h-3 w-3" />Enabled</span>
                            : <span className="text-xs text-slate-500">Not included</span>}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={`text-xs ${cfg.badge}`}>
                            <StatusIcon className="h-3 w-3 mr-1" />{cfg.label}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {tenants.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-10 text-slate-500">No tenants found</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
