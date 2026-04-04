'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { Loader2, RefreshCw, CheckCircle2, XCircle, AlertTriangle, Key } from 'lucide-react';

// ─── types ────────────────────────────────────────────────────────────────────

interface FrameworkHealth {
  framework: string;
  today_total: number;
  today_success: number;
  today_failed: number;
  pending: number;
  success_rate: number | null;
}

interface CredentialRecord {
  id: string;
  org_id: string;
  integration: string;
  is_configured: boolean;
  validation_status: string | null;
  last_validated_at: string | null;
  organizations?: { name: string; subscription_tier: string };
}

interface SubmissionError {
  id: string;
  framework: string;
  status: string;
  error_code: string | null;
  error_message: string | null;
  submitted_at: string;
  organizations?: { name: string };
}

// ─── helpers ───────────────────────────────────────────────────────────────────

const FRAMEWORK_LABELS: Record<string, string> = {
  EU_TRACES: 'EU TRACES',
  FDA_PRIOR_NOTICE: 'FDA Prior Notice',
  IPAFFS: 'IPAFFS (UK)',
};

const FRAMEWORK_COLORS: Record<string, string> = {
  EU_TRACES: 'bg-blue-900/40 text-blue-300 border-blue-700',
  FDA_PRIOR_NOTICE: 'bg-indigo-900/40 text-indigo-300 border-indigo-700',
  IPAFFS: 'bg-red-900/40 text-red-300 border-red-700',
};

function fmtDateTime(s: string | null) {
  if (!s) return '—';
  return new Date(s).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
}

function HealthBar({ pct }: { pct: number | null }) {
  if (pct === null) return <span className="text-slate-500 text-sm">—</span>;
  const color = pct >= 95 ? 'bg-green-500' : pct >= 80 ? 'bg-yellow-500' : 'bg-red-500';
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-slate-700 rounded-full overflow-hidden max-w-[80px]">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-sm text-slate-300">{pct}%</span>
    </div>
  );
}

// ─── component ────────────────────────────────────────────────────────────────

export default function SubmissionsPage() {
  const { toast } = useToast();
  const [healthSummary, setHealthSummary] = useState<FrameworkHealth[]>([]);
  const [credentials, setCredentials] = useState<CredentialRecord[]>([]);
  const [errors, setErrors] = useState<SubmissionError[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadAll(); }, []);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [hs, cr, er] = await Promise.all([
        fetch('/api/superadmin/submissions?resource=health_summary').then(r => r.json()),
        fetch('/api/superadmin/submissions?resource=credential_status').then(r => r.json()),
        fetch('/api/superadmin/submissions?resource=recent_errors').then(r => r.json()),
      ]);
      setHealthSummary(hs.health_summary ?? []);
      setCredentials(cr.credentials ?? []);
      setErrors(er.errors ?? []);
    } catch {
      toast({ title: 'Failed to load submission data', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin text-cyan-400" /></div>;
  }

  const totalErrors = errors.length;
  const unconfiguredCreds = credentials.filter(c => !c.is_configured).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Compliance Submission Monitoring</h1>
          <p className="text-slate-400 text-sm mt-1">Operational health of EU TRACES, FDA Prior Notice, and IPAFFS integrations across all tenants.</p>
        </div>
        <Button size="sm" variant="outline" className="border-slate-700 text-slate-300 hover:bg-slate-800" onClick={loadAll}>
          <RefreshCw className="h-4 w-4 mr-2" /> Refresh
        </Button>
      </div>

      {/* Framework Health Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {healthSummary.map(fw => (
          <Card key={fw.framework} className={`bg-slate-900 border-slate-800 ${fw.today_failed > 0 ? 'border-red-800/60' : ''}`}>
            <CardHeader className="pb-3 pt-4 px-4">
              <div className="flex items-center justify-between gap-2">
                <Badge className={`text-xs border ${FRAMEWORK_COLORS[fw.framework]}`}>{FRAMEWORK_LABELS[fw.framework]}</Badge>
                {fw.today_failed > 0 ? (
                  <AlertTriangle className="h-4 w-4 text-red-400" />
                ) : fw.today_total > 0 ? (
                  <CheckCircle2 className="h-4 w-4 text-green-400" />
                ) : null}
              </div>
            </CardHeader>
            <CardContent className="px-4 pb-4 space-y-3">
              <div className="grid grid-cols-3 gap-2 text-center">
                <div>
                  <p className="text-lg font-bold text-white">{fw.today_total}</p>
                  <p className="text-[10px] text-slate-500 uppercase tracking-wider">Today</p>
                </div>
                <div>
                  <p className="text-lg font-bold text-green-400">{fw.today_success}</p>
                  <p className="text-[10px] text-slate-500 uppercase tracking-wider">Confirmed</p>
                </div>
                <div>
                  <p className={`text-lg font-bold ${fw.today_failed > 0 ? 'text-red-400' : 'text-slate-400'}`}>{fw.today_failed}</p>
                  <p className="text-[10px] text-slate-500 uppercase tracking-wider">Failed</p>
                </div>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] text-slate-500 uppercase tracking-wider">Success Rate (today)</p>
                <HealthBar pct={fw.success_rate} />
              </div>
              {fw.pending > 0 && (
                <div className="text-xs text-yellow-400 flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3" /> {fw.pending} pending confirmation
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Alert banner */}
      {(totalErrors > 0 || unconfiguredCreds > 0) && (
        <div className="bg-red-950/40 border border-red-800/60 rounded-lg px-4 py-3 flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-red-400 shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            {totalErrors > 0 && <p className="text-sm text-red-300">{totalErrors} recent submission failure{totalErrors !== 1 ? 's' : ''} require attention.</p>}
            {unconfiguredCreds > 0 && <p className="text-sm text-red-300">{unconfiguredCreds} tenant{unconfiguredCreds !== 1 ? 's' : ''} have not configured EU TRACES credentials.</p>}
          </div>
        </div>
      )}

      <Tabs defaultValue="errors">
        <TabsList className="bg-slate-900 border border-slate-800">
          <TabsTrigger value="errors" className="data-[state=active]:bg-slate-800 data-[state=active]:text-white text-slate-400">
            Recent Errors {totalErrors > 0 && <Badge className="ml-2 bg-red-900/60 text-red-300 border-0">{totalErrors}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="credentials" className="data-[state=active]:bg-slate-800 data-[state=active]:text-white text-slate-400">
            <Key className="h-4 w-4 mr-2" /> API Credential Status
          </TabsTrigger>
        </TabsList>

        {/* Recent Errors */}
        <TabsContent value="errors">
          <Card className="bg-slate-900 border-slate-800">
            <CardHeader>
              <CardTitle className="text-white text-base">Submission Failures</CardTitle>
              <CardDescription>Most recent failed submissions across all tenants and frameworks</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow className="border-slate-800">
                    <TableHead className="text-slate-400">Organisation</TableHead>
                    <TableHead className="text-slate-400">Framework</TableHead>
                    <TableHead className="text-slate-400">Error Code</TableHead>
                    <TableHead className="text-slate-400">Message</TableHead>
                    <TableHead className="text-slate-400">Time</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {errors.length === 0 ? (
                    <TableRow><TableCell colSpan={5} className="text-center text-slate-500 py-8">
                      <CheckCircle2 className="h-6 w-6 mx-auto mb-2 text-green-500" />
                      No recent errors
                    </TableCell></TableRow>
                  ) : (
                    errors.map(e => (
                      <TableRow key={e.id} className="border-slate-800 hover:bg-slate-800/30">
                        <TableCell className="font-medium text-slate-200">{e.organizations?.name ?? '—'}</TableCell>
                        <TableCell>
                          <Badge className={`text-xs border ${FRAMEWORK_COLORS[e.framework] ?? ''}`}>{FRAMEWORK_LABELS[e.framework] ?? e.framework}</Badge>
                        </TableCell>
                        <TableCell className="text-slate-400 font-mono text-xs">{e.error_code ?? '—'}</TableCell>
                        <TableCell className="text-red-400 text-sm max-w-[240px] truncate">{e.error_message ?? '—'}</TableCell>
                        <TableCell className="text-slate-500 text-sm">{fmtDateTime(e.submitted_at)}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Credential Status */}
        <TabsContent value="credentials">
          <Card className="bg-slate-900 border-slate-800">
            <CardHeader>
              <CardTitle className="text-white text-base">API Credential Status by Tenant</CardTitle>
              <CardDescription>Which tenants have configured their government API credentials</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow className="border-slate-800">
                    <TableHead className="text-slate-400">Organisation</TableHead>
                    <TableHead className="text-slate-400">Integration</TableHead>
                    <TableHead className="text-slate-400">Configured</TableHead>
                    <TableHead className="text-slate-400">Validation</TableHead>
                    <TableHead className="text-slate-400">Last Checked</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {credentials.length === 0 ? (
                    <TableRow><TableCell colSpan={5} className="text-center text-slate-500 py-8">No credential records found</TableCell></TableRow>
                  ) : (
                    credentials.map(c => (
                      <TableRow key={c.id} className="border-slate-800 hover:bg-slate-800/30">
                        <TableCell className="font-medium text-slate-200">{c.organizations?.name ?? c.org_id}</TableCell>
                        <TableCell>
                          <Badge className={`text-xs border ${FRAMEWORK_COLORS[c.integration] ?? 'bg-slate-800 text-slate-300 border-slate-700'}`}>{FRAMEWORK_LABELS[c.integration] ?? c.integration}</Badge>
                        </TableCell>
                        <TableCell>
                          {c.is_configured ? (
                            <span className="flex items-center gap-1 text-green-400 text-sm"><CheckCircle2 className="h-4 w-4" /> Yes</span>
                          ) : (
                            <span className="flex items-center gap-1 text-red-400 text-sm"><XCircle className="h-4 w-4" /> Not set</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {c.validation_status ? (
                            <Badge className={`text-xs border ${c.validation_status === 'valid' ? 'bg-green-900/40 text-green-300 border-green-700' : c.validation_status === 'invalid' ? 'bg-red-900/40 text-red-300 border-red-700' : 'bg-slate-700/40 text-slate-400 border-slate-600'}`}>
                              {c.validation_status}
                            </Badge>
                          ) : <span className="text-slate-500 text-sm">—</span>}
                        </TableCell>
                        <TableCell className="text-slate-500 text-sm">{fmtDateTime(c.last_validated_at)}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
