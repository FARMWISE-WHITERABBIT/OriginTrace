'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, CreditCard, RefreshCw, AlertTriangle, CheckCircle2, Clock, ExternalLink } from 'lucide-react';
import Link from 'next/link';

interface PaymentLink {
  id: string;
  org_id: string;
  tier: string;
  amount_ngn: number;
  billing_period: string;
  status: string;
  paystack_reference: string;
  expires_at: string;
  paid_at: string | null;
  created_at: string;
  organizations: { name: string };
}

const STATUS_STYLES: Record<string, string> = {
  pending:   'bg-yellow-900/40 text-yellow-300 border-yellow-700',
  paid:      'bg-green-900/40 text-green-300 border-green-700',
  expired:   'bg-red-900/40 text-red-300 border-red-700',
  cancelled: 'bg-slate-700 text-slate-400 border-slate-600',
};

const STATUS_ICONS: Record<string, React.ElementType> = {
  pending: Clock,
  paid: CheckCircle2,
  expired: AlertTriangle,
  cancelled: AlertTriangle,
};

export default function PaymentOpsPage() {
  const [links, setLinks] = useState<PaymentLink[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchLinks(); }, []);

  async function fetchLinks() {
    setLoading(true);
    try {
      const res = await fetch('/api/superadmin/payment-links');
      if (res.ok) setLinks((await res.json()).links ?? []);
    } finally { setLoading(false); }
  }

  const pending = links.filter(l => l.status === 'pending');
  const paid = links.filter(l => l.status === 'paid');
  const expired = links.filter(l => l.status === 'expired');

  const totalCollected = paid.reduce((s, l) => s + (l.amount_ngn ?? 0), 0);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <CreditCard className="h-7 w-7 text-cyan-400" />Payment Operations
          </h1>
          <p className="text-slate-400">Manage payment links, escrow health, and billing status across tenants</p>
        </div>
        <Button variant="outline" className="border-slate-600 text-slate-300 hover:bg-slate-800 shrink-0" onClick={fetchLinks}>
          <RefreshCw className="h-4 w-4 mr-2" />Refresh
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-24"><Loader2 className="h-8 w-8 animate-spin text-slate-400" /></div>
      ) : (
        <>
          {/* KPI strip */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: 'Pending Links', value: pending.length, color: 'text-yellow-400', icon: Clock },
              { label: 'Paid Links', value: paid.length, color: 'text-green-400', icon: CheckCircle2 },
              { label: 'Expired Links', value: expired.length, color: 'text-red-400', icon: AlertTriangle },
              { label: 'Total Collected (NGN)', value: `₦${totalCollected.toLocaleString()}`, color: 'text-cyan-400', icon: CreditCard },
            ].map(k => (
              <Card key={k.label} className="bg-slate-900 border-slate-700">
                <CardHeader className="flex flex-row items-center justify-between pb-2 gap-2">
                  <CardTitle className="text-sm font-medium text-slate-400">{k.label}</CardTitle>
                  <k.icon className={`h-4 w-4 ${k.color}`} />
                </CardHeader>
                <CardContent>
                  <div className={`text-2xl font-bold ${k.color}`}>{k.value}</div>
                </CardContent>
              </Card>
            ))}
          </div>

          <Tabs defaultValue="pending">
            <TabsList className="bg-slate-800 border border-slate-700">
              <TabsTrigger value="pending" className="data-[state=active]:bg-slate-700 data-[state=active]:text-white text-slate-400">
                Pending {pending.length > 0 && <Badge variant="destructive" className="ml-1.5 h-4 px-1 text-[10px]">{pending.length}</Badge>}
              </TabsTrigger>
              <TabsTrigger value="paid" className="data-[state=active]:bg-slate-700 data-[state=active]:text-white text-slate-400">Paid</TabsTrigger>
              <TabsTrigger value="expired" className="data-[state=active]:bg-slate-700 data-[state=active]:text-white text-slate-400">Expired</TabsTrigger>
              <TabsTrigger value="all" className="data-[state=active]:bg-slate-700 data-[state=active]:text-white text-slate-400">All</TabsTrigger>
            </TabsList>

            {(['pending', 'paid', 'expired', 'all'] as const).map(tab => {
              const rows = tab === 'all' ? links : links.filter(l => l.status === tab);
              return (
                <TabsContent key={tab} value={tab} className="mt-4">
                  <Card className="bg-slate-900 border-slate-700">
                    <CardContent className="pt-4">
                      <Table>
                        <TableHeader>
                          <TableRow className="border-slate-700">
                            <TableHead className="text-slate-400">Organization</TableHead>
                            <TableHead className="text-slate-400">Tier</TableHead>
                            <TableHead className="text-slate-400">Amount (NGN)</TableHead>
                            <TableHead className="text-slate-400">Status</TableHead>
                            <TableHead className="text-slate-400">Expires</TableHead>
                            <TableHead className="text-slate-400">Reference</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {rows.map(link => {
                            const StatusIcon = STATUS_ICONS[link.status] ?? Clock;
                            return (
                              <TableRow key={link.id} className="border-slate-700 hover:bg-slate-800/40">
                                <TableCell className="font-medium text-white">{link.organizations?.name ?? '—'}</TableCell>
                                <TableCell>
                                  <Badge variant="outline" className="text-xs capitalize border-slate-600 text-slate-300">{link.tier}</Badge>
                                </TableCell>
                                <TableCell className="text-slate-300 font-mono">₦{Number(link.amount_ngn).toLocaleString()}</TableCell>
                                <TableCell>
                                  <Badge variant="outline" className={`text-xs capitalize ${STATUS_STYLES[link.status] ?? ''}`}>
                                    <StatusIcon className="h-3 w-3 mr-1" />{link.status}
                                  </Badge>
                                </TableCell>
                                <TableCell className="text-slate-400 text-sm">
                                  {link.expires_at ? new Date(link.expires_at).toLocaleDateString('en-GB') : '—'}
                                </TableCell>
                                <TableCell className="font-mono text-xs text-slate-500">{link.paystack_reference ?? '—'}</TableCell>
                              </TableRow>
                            );
                          })}
                          {rows.length === 0 && (
                            <TableRow><TableCell colSpan={6} className="text-center text-slate-500 py-12">No {tab === 'all' ? '' : tab} payment links</TableCell></TableRow>
                          )}
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>
                </TabsContent>
              );
            })}
          </Tabs>

          <div className="flex justify-end">
            <Link href="/superadmin/billing" className="text-sm text-cyan-400 hover:text-cyan-300 flex items-center gap-1.5">
              Generate new payment link <ExternalLink className="h-3.5 w-3.5" />
            </Link>
          </div>
        </>
      )}
    </div>
  );
}
