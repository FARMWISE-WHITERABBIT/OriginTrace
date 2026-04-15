'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, TrendingUp, DollarSign, Users, RefreshCw, ArrowUpRight, ArrowDownRight } from 'lucide-react';

interface OrgRevRow {
  id: number;
  name: string;
  subscription_tier: string;
  subscription_status: string;
  created_at: string;
  mrr_usd: number;
}

const TIER_MRR: Record<string, number> = {
  starter: 0,
  basic: 99,
  pro: 299,
  enterprise: 899,
};

const TIER_STYLES: Record<string, string> = {
  starter:    'bg-slate-700 text-slate-300 border-slate-600',
  basic:      'bg-blue-900/50 text-blue-300 border-blue-700',
  pro:        'bg-purple-900/50 text-purple-300 border-purple-700',
  enterprise: 'bg-amber-900/50 text-amber-300 border-amber-700',
};

export default function RevenueDashboardPage() {
  const [orgs, setOrgs] = useState<OrgRevRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchData(); }, []);

  async function fetchData() {
    setLoading(true);
    try {
      const res = await fetch('/api/superadmin?resource=organizations');
      if (res.ok) {
        const data = await res.json();
        const rows: OrgRevRow[] = (data.organizations ?? []).map((o: any) => ({
          id: o.id,
          name: o.name,
          subscription_tier: o.subscription_tier ?? 'starter',
          subscription_status: o.subscription_status ?? 'active',
          created_at: o.created_at,
          mrr_usd: o.subscription_status === 'active' || o.subscription_status === 'trial'
            ? (TIER_MRR[o.subscription_tier ?? 'starter'] ?? 0) : 0,
        }));
        setOrgs(rows);
      }
    } finally { setLoading(false); }
  }

  const activeOrgs = orgs.filter(o => o.subscription_status === 'active');
  const mrr = activeOrgs.reduce((s, o) => s + o.mrr_usd, 0);
  const arr = mrr * 12;
  const paidOrgs = activeOrgs.filter(o => o.subscription_tier !== 'starter');
  const churnedOrgs = orgs.filter(o => o.subscription_status === 'cancelled' || o.subscription_status === 'suspended');

  const tierBreakdown = Object.entries(TIER_MRR).map(([tier, price]) => ({
    tier,
    count: orgs.filter(o => o.subscription_tier === tier && o.subscription_status === 'active').length,
    mrr: orgs.filter(o => o.subscription_tier === tier && o.subscription_status === 'active').length * price,
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white flex items-center gap-3">
          <DollarSign className="h-7 w-7 text-cyan-400" />Revenue Dashboard
        </h1>
        <p className="text-slate-400">MRR, ARR, and subscription mix across all tenants</p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-24"><Loader2 className="h-8 w-8 animate-spin text-slate-400" /></div>
      ) : (
        <>
          {/* KPI strip */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: 'MRR (USD)', value: `$${mrr.toLocaleString()}`, icon: TrendingUp, color: 'text-green-400', sub: 'Active paying tenants' },
              { label: 'ARR (USD)', value: `$${arr.toLocaleString()}`, icon: DollarSign, color: 'text-cyan-400', sub: 'Annualised run-rate' },
              { label: 'Paying Orgs', value: paidOrgs.length, icon: Users, color: 'text-white', sub: `${orgs.length} total orgs` },
              { label: 'Churned / Suspended', value: churnedOrgs.length, icon: ArrowDownRight, color: 'text-red-400', sub: 'Cancelled or suspended' },
            ].map(k => (
              <Card key={k.label} className="bg-slate-900 border-slate-700">
                <CardHeader className="flex flex-row items-center justify-between pb-2 gap-2">
                  <CardTitle className="text-sm font-medium text-slate-400">{k.label}</CardTitle>
                  <k.icon className={`h-4 w-4 ${k.color}`} />
                </CardHeader>
                <CardContent>
                  <div className={`text-2xl font-bold ${k.color}`}>{k.value}</div>
                  <p className="text-xs text-slate-500 mt-1">{k.sub}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Tier breakdown */}
          <Card className="bg-slate-900 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white text-base">Subscription Mix</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow className="border-slate-700">
                    <TableHead className="text-slate-400">Tier</TableHead>
                    <TableHead className="text-slate-400 text-right">Orgs</TableHead>
                    <TableHead className="text-slate-400 text-right">Price / mo</TableHead>
                    <TableHead className="text-slate-400 text-right">MRR</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tierBreakdown.map(t => (
                    <TableRow key={t.tier} className="border-slate-700">
                      <TableCell>
                        <Badge variant="outline" className={`capitalize text-xs ${TIER_STYLES[t.tier] ?? ''}`}>{t.tier}</Badge>
                      </TableCell>
                      <TableCell className="text-right text-slate-300">{t.count}</TableCell>
                      <TableCell className="text-right text-slate-400">${TIER_MRR[t.tier]}</TableCell>
                      <TableCell className="text-right font-medium text-white">${t.mrr.toLocaleString()}</TableCell>
                    </TableRow>
                  ))}
                  <TableRow className="border-slate-700 font-bold">
                    <TableCell className="text-slate-300">Total</TableCell>
                    <TableCell className="text-right text-white">{activeOrgs.length}</TableCell>
                    <TableCell />
                    <TableCell className="text-right text-green-400">${mrr.toLocaleString()}</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Per-org table */}
          <Card className="bg-slate-900 border-slate-700">
            <CardHeader><CardTitle className="text-white text-base">Per-Tenant Revenue</CardTitle></CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-slate-700">
                      <TableHead className="text-slate-400">Organization</TableHead>
                      <TableHead className="text-slate-400">Tier</TableHead>
                      <TableHead className="text-slate-400">Status</TableHead>
                      <TableHead className="text-slate-400">Since</TableHead>
                      <TableHead className="text-slate-400 text-right">MRR (USD)</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {orgs.sort((a, b) => b.mrr_usd - a.mrr_usd).map(org => (
                      <TableRow key={org.id} className="border-slate-700 hover:bg-slate-800/40">
                        <TableCell className="font-medium text-white">{org.name}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={`capitalize text-xs ${TIER_STYLES[org.subscription_tier] ?? ''}`}>
                            {org.subscription_tier}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={`text-xs capitalize ${org.subscription_status === 'active' ? 'border-green-700 text-green-400' : org.subscription_status === 'trial' ? 'border-cyan-700 text-cyan-400' : 'border-slate-600 text-slate-400'}`}>
                            {org.subscription_status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-slate-400 text-sm">
                          {new Date(org.created_at).toLocaleDateString('en-GB')}
                        </TableCell>
                        <TableCell className="text-right font-mono text-white">
                          {org.mrr_usd > 0 ? `$${org.mrr_usd}` : <span className="text-slate-600">—</span>}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
