'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import {
  Loader2, RefreshCw, Shield, UserCog, Activity, Download,
  Trash2, Plus, AlertTriangle,
} from 'lucide-react';

// ─── types ────────────────────────────────────────────────────────────────────

interface ImpersonationEvent {
  id: string;
  session_id: string;
  superadmin_id: string;
  event_type: string;
  action_description: string | null;
  resource_type: string | null;
  ip_address: string | null;
  created_at: string;
  organizations?: { name: string };
}

interface ExportAudit {
  id: string;
  exported_by: string;
  export_type: string;
  scope_description: string;
  record_count: number | null;
  created_at: string;
}

interface DeletionRequest {
  id: string;
  org_id: string;
  deletion_reason: string;
  status: string;
  scheduled_deletion_date: string | null;
  created_at: string;
  organizations?: { name: string; subscription_tier: string };
}

// ─── constants ─────────────────────────────────────────────────────────────────

const ROLE_LABELS: Record<string, string> = {
  platform_admin:     'Platform Admin',
  compliance_manager: 'Compliance Manager',
  finance_manager:    'Finance Manager',
  support_agent:      'Support Agent',
};

const ROLE_COLORS: Record<string, string> = {
  platform_admin:     'bg-red-900/40 text-red-300 border-red-700',
  compliance_manager: 'bg-blue-900/40 text-blue-300 border-blue-700',
  finance_manager:    'bg-green-900/40 text-green-300 border-green-700',
  support_agent:      'bg-slate-700/40 text-slate-400 border-slate-600',
};

const ROLE_DESCRIPTIONS: Record<string, string> = {
  platform_admin:     'Full access to all superadmin features',
  compliance_manager: 'Compliance rulesets and tenant compliance health only',
  finance_manager:    'Payment and KYC operations only',
  support_agent:      'Tenant health and impersonation only',
};

const DELETION_STATUS_COLORS: Record<string, string> = {
  pending:   'bg-yellow-900/40 text-yellow-300 border-yellow-700',
  in_review: 'bg-blue-900/40 text-blue-300 border-blue-700',
  approved:  'bg-amber-900/40 text-amber-300 border-amber-700',
  executing: 'bg-orange-900/40 text-orange-300 border-orange-700',
  completed: 'bg-green-900/40 text-green-300 border-green-700',
  rejected:  'bg-red-900/40 text-red-300 border-red-700',
};

function fmtDateTime(s: string | null) {
  if (!s) return '—';
  return new Date(s).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: '2-digit', hour: '2-digit', minute: '2-digit' });
}

// ─── component ────────────────────────────────────────────────────────────────

export default function GovernancePage() {
  const { toast } = useToast();

  const [impersonationLog, setImpersonationLog] = useState<ImpersonationEvent[]>([]);
  const [exportAudit, setExportAudit] = useState<ExportAudit[]>([]);
  const [deletionRequests, setDeletionRequests] = useState<DeletionRequest[]>([]);
  const [loading, setLoading] = useState(true);

  // Role assignment
  const [showRoleDialog, setShowRoleDialog] = useState(false);
  const [roleForm, setRoleForm] = useState({ target_user_id: '', role: 'support_agent' });
  const [assigningRole, setAssigningRole] = useState(false);

  // Deletion request
  const [showDeletionDialog, setShowDeletionDialog] = useState(false);
  const [deletionForm, setDeletionForm] = useState({ org_id: '', deletion_reason: '', scheduled_deletion_date: '' });
  const [submittingDeletion, setSubmittingDeletion] = useState(false);

  useEffect(() => { loadAll(); }, []);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [il, ea, dr] = await Promise.all([
        fetch('/api/superadmin/governance?resource=impersonation_log').then(r => r.json()),
        fetch('/api/superadmin/governance?resource=export_audit').then(r => r.json()),
        fetch('/api/superadmin/governance?resource=deletion_requests').then(r => r.json()),
      ]);
      setImpersonationLog(il.log ?? []);
      setExportAudit(ea.exports ?? []);
      setDeletionRequests(dr.requests ?? []);
    } catch {
      toast({ title: 'Failed to load governance data', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const assignRole = async () => {
    if (!roleForm.target_user_id || !roleForm.role) return;
    setAssigningRole(true);
    try {
      const res = await fetch('/api/superadmin/governance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'assign_superadmin_role', ...roleForm }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      toast({ title: `Role assigned: ${ROLE_LABELS[roleForm.role]}` });
      setShowRoleDialog(false);
      loadAll();
    } catch (err: any) {
      toast({ title: err.message ?? 'Assignment failed', variant: 'destructive' });
    } finally {
      setAssigningRole(false);
    }
  };

  const requestDeletion = async () => {
    if (!deletionForm.org_id || !deletionForm.deletion_reason) return;
    setSubmittingDeletion(true);
    try {
      const res = await fetch('/api/superadmin/governance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'request_tenant_deletion', ...deletionForm }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      toast({ title: 'Deletion request submitted for review' });
      setShowDeletionDialog(false);
      loadAll();
    } catch (err: any) {
      toast({ title: err.message ?? 'Submission failed', variant: 'destructive' });
    } finally {
      setSubmittingDeletion(false);
    }
  };

  const approveDeletion = async (requestId: string) => {
    try {
      const res = await fetch('/api/superadmin/governance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'approve_tenant_deletion', request_id: requestId }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      toast({ title: 'Deletion request approved' });
      loadAll();
    } catch (err: any) {
      toast({ title: err.message ?? 'Approval failed', variant: 'destructive' });
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin text-cyan-400" /></div>;
  }

  const pendingDeletions = deletionRequests.filter(d => ['pending', 'in_review'].includes(d.status));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Security & Governance</h1>
          <p className="text-slate-400 text-sm mt-1">Role separation, impersonation audit, data exports, and tenant deletion workflow.</p>
        </div>
        <Button size="sm" variant="outline" className="border-slate-700 text-slate-300 hover:bg-slate-800" onClick={loadAll}>
          <RefreshCw className="h-4 w-4 mr-2" /> Refresh
        </Button>
      </div>

      {/* Role Definitions */}
      <Card className="bg-slate-900 border-slate-800">
        <CardHeader className="flex flex-row items-center justify-between gap-4 pb-3">
          <div>
            <CardTitle className="text-white text-base flex items-center gap-2">
              <UserCog className="h-4 w-4 text-cyan-400" /> Superadmin Role Separation
            </CardTitle>
            <CardDescription>Assign restricted roles to limit access for individual team members</CardDescription>
          </div>
          <Button
            size="sm"
            className="bg-cyan-600 hover:bg-cyan-500 text-white"
            onClick={() => { setRoleForm({ target_user_id: '', role: 'support_agent' }); setShowRoleDialog(true); }}
          >
            <Plus className="h-4 w-4 mr-2" /> Assign Role
          </Button>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
            {Object.entries(ROLE_LABELS).map(([key, label]) => (
              <div key={key} className="p-3 rounded-lg bg-slate-800/40 border border-slate-800">
                <Badge className={`text-xs border mb-2 ${ROLE_COLORS[key]}`}>{label}</Badge>
                <p className="text-xs text-slate-400 leading-snug">{ROLE_DESCRIPTIONS[key]}</p>
              </div>
            ))}
          </div>
          <div className="bg-amber-950/20 border border-amber-800/40 rounded-lg px-3 py-2 flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
            <p className="text-xs text-amber-300">Platform Admin has full access. Assign restricted roles to team members who do not need full access. MFA enforcement is required for all superadmin accounts.</p>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="impersonation">
        <TabsList className="bg-slate-900 border border-slate-800">
          <TabsTrigger value="impersonation" className="data-[state=active]:bg-slate-800 data-[state=active]:text-white text-slate-400">
            <Activity className="h-4 w-4 mr-2" /> Impersonation Log
          </TabsTrigger>
          <TabsTrigger value="exports" className="data-[state=active]:bg-slate-800 data-[state=active]:text-white text-slate-400">
            <Download className="h-4 w-4 mr-2" /> Data Exports
          </TabsTrigger>
          <TabsTrigger value="deletions" className="data-[state=active]:bg-slate-800 data-[state=active]:text-white text-slate-400">
            <Trash2 className="h-4 w-4 mr-2" /> Tenant Deletion
            {pendingDeletions.length > 0 && <Badge className="ml-2 bg-red-900/60 text-red-300 border-0">{pendingDeletions.length}</Badge>}
          </TabsTrigger>
        </TabsList>

        {/* Impersonation Log */}
        <TabsContent value="impersonation">
          <Card className="bg-slate-900 border-slate-800">
            <CardHeader>
              <CardTitle className="text-white text-base">Enhanced Impersonation Audit Log</CardTitle>
              <CardDescription>Every action taken during impersonation sessions is recorded here</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow className="border-slate-800">
                    <TableHead className="text-slate-400">Event Type</TableHead>
                    <TableHead className="text-slate-400">Organisation</TableHead>
                    <TableHead className="text-slate-400">Action</TableHead>
                    <TableHead className="text-slate-400">Resource</TableHead>
                    <TableHead className="text-slate-400">IP</TableHead>
                    <TableHead className="text-slate-400">Time</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {impersonationLog.length === 0 ? (
                    <TableRow><TableCell colSpan={6} className="text-center text-slate-500 py-8">No impersonation events recorded</TableCell></TableRow>
                  ) : (
                    impersonationLog.map(e => (
                      <TableRow key={e.id} className="border-slate-800 hover:bg-slate-800/30">
                        <TableCell>
                          <Badge className={`text-xs border ${e.event_type === 'session_start' ? 'bg-cyan-900/40 text-cyan-300 border-cyan-700' : e.event_type === 'session_end' ? 'bg-slate-700/40 text-slate-400 border-slate-600' : 'bg-purple-900/40 text-purple-300 border-purple-700'}`}>
                            {e.event_type.replace('_', ' ')}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-slate-200 text-sm">{e.organizations?.name ?? '—'}</TableCell>
                        <TableCell className="text-slate-400 text-sm max-w-[200px] truncate">{e.action_description ?? '—'}</TableCell>
                        <TableCell className="text-slate-500 text-xs">{e.resource_type ? `${e.resource_type}` : '—'}</TableCell>
                        <TableCell className="text-slate-500 text-xs font-mono">{e.ip_address ?? '—'}</TableCell>
                        <TableCell className="text-slate-500 text-sm">{fmtDateTime(e.created_at)}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Export Audit */}
        <TabsContent value="exports">
          <Card className="bg-slate-900 border-slate-800">
            <CardHeader>
              <CardTitle className="text-white text-base">Data Export Audit Trail</CardTitle>
              <CardDescription>Every bulk data export from the superadmin panel is logged here</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow className="border-slate-800">
                    <TableHead className="text-slate-400">Export Type</TableHead>
                    <TableHead className="text-slate-400">Scope</TableHead>
                    <TableHead className="text-slate-400 text-right">Records</TableHead>
                    <TableHead className="text-slate-400">Exported By</TableHead>
                    <TableHead className="text-slate-400">Time</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {exportAudit.length === 0 ? (
                    <TableRow><TableCell colSpan={5} className="text-center text-slate-500 py-8">No data exports recorded</TableCell></TableRow>
                  ) : (
                    exportAudit.map(e => (
                      <TableRow key={e.id} className="border-slate-800 hover:bg-slate-800/30">
                        <TableCell>
                          <Badge className="text-xs border bg-slate-700/50 text-slate-300 border-slate-600">{e.export_type}</Badge>
                        </TableCell>
                        <TableCell className="text-slate-300 text-sm max-w-[250px] truncate">{e.scope_description}</TableCell>
                        <TableCell className="text-right text-slate-400">{e.record_count?.toLocaleString() ?? '—'}</TableCell>
                        <TableCell className="text-slate-500 text-xs font-mono">{e.exported_by.substring(0, 8)}…</TableCell>
                        <TableCell className="text-slate-500 text-sm">{fmtDateTime(e.created_at)}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tenant Deletion */}
        <TabsContent value="deletions">
          <Card className="bg-slate-900 border-slate-800">
            <CardHeader className="flex flex-row items-center justify-between gap-4 pb-3">
              <div>
                <CardTitle className="text-white text-base">Tenant Data Deletion Workflow</CardTitle>
                <CardDescription>Controlled deletion that respects NDPR/GDPR retention obligations</CardDescription>
              </div>
              <Button
                size="sm"
                className="bg-red-900/50 text-red-300 border border-red-700 hover:bg-red-800/60"
                onClick={() => { setDeletionForm({ org_id: '', deletion_reason: '', scheduled_deletion_date: '' }); setShowDeletionDialog(true); }}
              >
                <Trash2 className="h-4 w-4 mr-2" /> New Request
              </Button>
            </CardHeader>
            <CardContent>
              {pendingDeletions.length > 0 && (
                <div className="bg-red-950/20 border border-red-800/40 rounded-lg px-3 py-2 flex items-start gap-2 mb-4">
                  <AlertTriangle className="h-4 w-4 text-red-400 shrink-0 mt-0.5" />
                  <p className="text-xs text-red-300">{pendingDeletions.length} deletion request{pendingDeletions.length !== 1 ? 's' : ''} pending review and approval.</p>
                </div>
              )}
              <Table>
                <TableHeader>
                  <TableRow className="border-slate-800">
                    <TableHead className="text-slate-400">Organisation</TableHead>
                    <TableHead className="text-slate-400">Reason</TableHead>
                    <TableHead className="text-slate-400">Status</TableHead>
                    <TableHead className="text-slate-400">Scheduled</TableHead>
                    <TableHead className="text-slate-400">Requested</TableHead>
                    <TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {deletionRequests.length === 0 ? (
                    <TableRow><TableCell colSpan={6} className="text-center text-slate-500 py-8">No deletion requests</TableCell></TableRow>
                  ) : (
                    deletionRequests.map(r => (
                      <TableRow key={r.id} className="border-slate-800 hover:bg-slate-800/30">
                        <TableCell className="font-medium text-slate-200">{r.organizations?.name ?? r.org_id}</TableCell>
                        <TableCell className="text-slate-400 text-sm max-w-[200px] truncate">{r.deletion_reason}</TableCell>
                        <TableCell>
                          <Badge className={`text-xs border capitalize ${DELETION_STATUS_COLORS[r.status] ?? 'bg-slate-800 text-slate-300'}`}>{r.status.replace('_', ' ')}</Badge>
                        </TableCell>
                        <TableCell className="text-slate-400 text-sm">
                          {r.scheduled_deletion_date ? new Date(r.scheduled_deletion_date).toLocaleDateString('en-GB') : '—'}
                        </TableCell>
                        <TableCell className="text-slate-500 text-sm">{fmtDateTime(r.created_at)}</TableCell>
                        <TableCell>
                          {r.status === 'pending' && (
                            <Button
                              size="sm"
                              className="h-7 text-xs bg-amber-900/40 text-amber-300 border border-amber-700 hover:bg-amber-800/60"
                              onClick={() => approveDeletion(r.id)}
                            >
                              Approve
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Role Assignment Dialog */}
      <Dialog open={showRoleDialog} onOpenChange={setShowRoleDialog}>
        <DialogContent className="bg-slate-900 border-slate-700 text-white max-w-md">
          <DialogHeader>
            <DialogTitle>Assign Superadmin Role</DialogTitle>
            <DialogDescription className="text-slate-400">The user must already have superadmin access. This restricts what they can see.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label className="text-slate-300">User ID</Label>
              <Input
                className="bg-slate-800 border-slate-700 text-white font-mono text-sm"
                placeholder="UUID of the system admin user"
                value={roleForm.target_user_id}
                onChange={e => setRoleForm(f => ({ ...f, target_user_id: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-slate-300">Role</Label>
              <Select value={roleForm.role} onValueChange={v => setRoleForm(f => ({ ...f, role: v }))}>
                <SelectTrigger className="bg-slate-800 border-slate-700 text-white"><SelectValue /></SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-700">
                  {Object.entries(ROLE_LABELS).map(([k, v]) => (
                    <SelectItem key={k} value={k}>
                      <span>{v}</span>
                      <span className="ml-2 text-slate-500 text-xs">— {ROLE_DESCRIPTIONS[k]}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {roleForm.role && (
              <div className={`rounded-lg px-3 py-2 border ${ROLE_COLORS[roleForm.role]}`}>
                <p className="text-xs">{ROLE_DESCRIPTIONS[roleForm.role]}</p>
              </div>
            )}
            <div className="flex gap-3 pt-2">
              <Button variant="outline" className="flex-1 border-slate-700 text-slate-300 hover:bg-slate-800" onClick={() => setShowRoleDialog(false)}>Cancel</Button>
              <Button className="flex-1 bg-cyan-600 hover:bg-cyan-500 text-white" onClick={assignRole} disabled={assigningRole || !roleForm.target_user_id}>
                {assigningRole ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null} Assign Role
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Deletion Dialog */}
      <Dialog open={showDeletionDialog} onOpenChange={setShowDeletionDialog}>
        <DialogContent className="bg-slate-900 border-slate-700 text-white max-w-md">
          <DialogHeader>
            <DialogTitle>Request Tenant Data Deletion</DialogTitle>
            <DialogDescription className="text-slate-400">This initiates a review workflow. Deletion requires explicit approval and respects NDPR/GDPR retention obligations.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="bg-red-950/20 border border-red-800/40 rounded-lg px-3 py-2">
              <p className="text-xs text-red-300">Warning: Certain records (audit logs, financial transactions, regulatory submissions) must be retained even after account cancellation. The workflow will flag these automatically.</p>
            </div>
            <div className="space-y-1.5">
              <Label className="text-slate-300">Organisation ID</Label>
              <Input
                className="bg-slate-800 border-slate-700 text-white font-mono text-sm"
                placeholder="org UUID"
                value={deletionForm.org_id}
                onChange={e => setDeletionForm(f => ({ ...f, org_id: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-slate-300">Reason for Deletion</Label>
              <Textarea
                className="bg-slate-800 border-slate-700 text-white"
                placeholder="Account cancelled — tenant requested full data deletion under NDPR Art. 26..."
                value={deletionForm.deletion_reason}
                onChange={e => setDeletionForm(f => ({ ...f, deletion_reason: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-slate-300">Scheduled Deletion Date (optional)</Label>
              <Input
                type="date"
                className="bg-slate-800 border-slate-700 text-white"
                value={deletionForm.scheduled_deletion_date}
                onChange={e => setDeletionForm(f => ({ ...f, scheduled_deletion_date: e.target.value }))}
              />
            </div>
            <div className="flex gap-3 pt-2">
              <Button variant="outline" className="flex-1 border-slate-700 text-slate-300 hover:bg-slate-800" onClick={() => setShowDeletionDialog(false)}>Cancel</Button>
              <Button
                className="flex-1 bg-red-700 hover:bg-red-600 text-white"
                onClick={requestDeletion}
                disabled={submittingDeletion || !deletionForm.org_id || !deletionForm.deletion_reason}
              >
                {submittingDeletion ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Trash2 className="h-4 w-4 mr-2" />}
                Submit for Review
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
