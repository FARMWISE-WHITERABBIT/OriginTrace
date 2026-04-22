'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import {
  Loader2, Plus, ShieldCheck, Mail, CheckCircle2, XCircle,
  UserX, UserCheck, Edit2, Shield, RefreshCw,
} from 'lucide-react';

// ── Types ─────────────────────────────────────────────────────────────────────

type SuperadminRole = 'platform_admin' | 'compliance_manager' | 'support_agent' | 'finance_manager' | 'infra_admin';

interface AdminUser {
  id: string;
  user_id: string;
  email: string | null;
  role: SuperadminRole;
  mfa_enrolled: boolean;
  is_active: boolean;
  created_at: string;
  last_login_at: string | null;
  last_login_ip: string | null;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const ROLE_CONFIG: Record<SuperadminRole, { label: string; badge: string; description: string }> = {
  platform_admin:    { label: 'Platform Admin',    badge: 'bg-amber-900/60 text-amber-300 border-amber-700',   description: 'Full access — can manage other admins' },
  compliance_manager:{ label: 'Compliance Manager',badge: 'bg-blue-900/60 text-blue-300 border-blue-700',     description: 'Compliance rulesets, EUDR, MRL, DDS' },
  support_agent:     { label: 'Support Agent',     badge: 'bg-slate-700 text-slate-300 border-slate-600',     description: 'Read-only tenant view + impersonation' },
  finance_manager:   { label: 'Finance Manager',   badge: 'bg-green-900/60 text-green-300 border-green-700',  description: 'Revenue, payments, escrow, billing' },
  infra_admin:       { label: 'Infra Admin',        badge: 'bg-purple-900/60 text-purple-300 border-purple-700',description: 'Feature toggles, API health, config' },
};

const ROLE_ORDER: SuperadminRole[] = ['platform_admin', 'compliance_manager', 'support_agent', 'finance_manager', 'infra_admin'];

// ── Component ─────────────────────────────────────────────────────────────────

export default function AdminUsersPage() {
  const { toast } = useToast();
  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<SuperadminRole>('support_agent');
  const [inviting, setInviting] = useState(false);
  const [editTarget, setEditTarget] = useState<AdminUser | null>(null);
  const [editRole, setEditRole] = useState<SuperadminRole>('support_agent');
  const [editOpen, setEditOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const fetchAdmins = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/superadmin/admin-users');
      if (res.ok) {
        const data = await res.json();
        setAdmins(data.admins ?? []);
      } else {
        const err = await res.json().catch(() => ({}));
        toast({ title: 'Failed to load admins', description: err.error ?? 'Unknown error', variant: 'destructive' });
      }
    } catch (err: any) {
      toast({ title: 'Network error', description: err.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { fetchAdmins(); }, [fetchAdmins]);

  async function handleInvite() {
    if (!inviteEmail.includes('@')) {
      toast({ title: 'Invalid email', description: 'Please enter a valid email address.', variant: 'destructive' });
      return;
    }
    setInviting(true);
    try {
      const res = await fetch('/api/superadmin/admin-users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: inviteEmail.trim(), role: inviteRole }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast({ title: 'Invite failed', description: data.error ?? 'Unknown error', variant: 'destructive' });
        return;
      }
      toast({ title: 'Admin invited', description: `Invite sent to ${inviteEmail}. They will receive a login link.` });
      setInviteOpen(false);
      setInviteEmail('');
      setInviteRole('support_agent');
      fetchAdmins();
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setInviting(false);
    }
  }

  async function handleToggleActive(admin: AdminUser) {
    try {
      const res = await fetch('/api/superadmin/admin-users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ admin_id: admin.id, is_active: !admin.is_active }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast({ title: 'Error', description: data.error ?? 'Update failed', variant: 'destructive' });
        return;
      }
      setAdmins(prev => prev.map(a => a.id === admin.id ? { ...a, is_active: !a.is_active } : a));
      toast({ title: admin.is_active ? 'Admin deactivated' : 'Admin reactivated', description: admin.email ?? admin.id });
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
  }

  async function handleSaveRole() {
    if (!editTarget) return;
    setSaving(true);
    try {
      const res = await fetch('/api/superadmin/admin-users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ admin_id: editTarget.id, role: editRole }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast({ title: 'Error', description: data.error ?? 'Update failed', variant: 'destructive' });
        return;
      }
      setAdmins(prev => prev.map(a => a.id === editTarget.id ? { ...a, role: editRole } : a));
      toast({ title: 'Role updated', description: `${editTarget.email} is now ${ROLE_CONFIG[editRole].label}` });
      setEditOpen(false);
      setEditTarget(null);
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  }

  const activeCount = admins.filter(a => a.is_active).length;
  const mfaCount = admins.filter(a => a.mfa_enrolled).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <Shield className="h-7 w-7 text-cyan-400" />Admin Users
          </h1>
          <p className="text-slate-400">Manage system administrators and their roles</p>
        </div>
        <div className="flex gap-2 shrink-0">
          <Button variant="outline" className="border-slate-600 text-slate-300 hover:bg-slate-800" onClick={fetchAdmins}>
            <RefreshCw className="h-4 w-4 mr-2" />Refresh
          </Button>
          <Button className="bg-[#2E7D6B] hover:bg-[#1F5F52]" onClick={() => setInviteOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />Invite Admin
          </Button>
        </div>
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Total Admins', value: admins.length, color: 'text-white' },
          { label: 'Active', value: activeCount, color: 'text-green-400' },
          { label: 'MFA Enrolled', value: mfaCount, color: 'text-cyan-400' },
        ].map(k => (
          <div key={k.label} className="bg-slate-900 border border-slate-700 rounded-lg px-4 py-3">
            <p className="text-xs text-slate-500 uppercase tracking-wide">{k.label}</p>
            <p className={`text-2xl font-bold ${k.color}`}>{k.value}</p>
          </div>
        ))}
      </div>

      {/* Role reference */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2">
        {ROLE_ORDER.map(r => {
          const cfg = ROLE_CONFIG[r];
          return (
            <div key={r} className="bg-slate-900 border border-slate-800 rounded-lg px-3 py-2">
              <Badge variant="outline" className={`text-xs mb-1.5 ${cfg.badge}`}>{cfg.label}</Badge>
              <p className="text-[11px] text-slate-500">{cfg.description}</p>
            </div>
          );
        })}
      </div>

      {/* Admin table */}
      <Card className="bg-slate-900 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white text-base">System Administrators</CardTitle>
          <CardDescription className="text-slate-400">
            {activeCount} active · {admins.length - activeCount} inactive
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
            </div>
          ) : admins.length === 0 ? (
            <div className="text-center py-16 text-slate-500">
              <Shield className="h-10 w-10 mx-auto mb-3 opacity-30" />
              <p className="text-sm">No system admins found</p>
              <p className="text-xs mt-1 text-slate-600">Invite the first admin using the button above</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-slate-700">
                    <TableHead className="text-slate-400">Email</TableHead>
                    <TableHead className="text-slate-400">Role</TableHead>
                    <TableHead className="text-slate-400">Status</TableHead>
                    <TableHead className="text-slate-400">MFA</TableHead>
                    <TableHead className="text-slate-400">Last Login</TableHead>
                    <TableHead className="text-slate-400">Since</TableHead>
                    <TableHead className="text-slate-400">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {admins.map(admin => {
                    const roleCfg = ROLE_CONFIG[admin.role] ?? ROLE_CONFIG.support_agent;
                    return (
                      <TableRow key={admin.id} className="border-slate-700 hover:bg-slate-800/40">
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className="h-8 w-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center shrink-0">
                              <ShieldCheck className="h-4 w-4 text-slate-400" />
                            </div>
                            <span className="text-sm font-medium text-white">{admin.email ?? <span className="text-slate-500 italic">no email</span>}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={`text-xs ${roleCfg.badge}`}>{roleCfg.label}</Badge>
                        </TableCell>
                        <TableCell>
                          {admin.is_active
                            ? <Badge variant="outline" className="text-xs bg-green-900/40 text-green-300 border-green-700"><CheckCircle2 className="h-3 w-3 mr-1" />Active</Badge>
                            : <Badge variant="outline" className="text-xs bg-slate-800 text-slate-500 border-slate-600"><XCircle className="h-3 w-3 mr-1" />Inactive</Badge>}
                        </TableCell>
                        <TableCell>
                          {admin.mfa_enrolled
                            ? <span className="text-xs text-green-400 flex items-center gap-1"><CheckCircle2 className="h-3 w-3" />Enrolled</span>
                            : <span className="text-xs text-slate-500">Not enrolled</span>}
                        </TableCell>
                        <TableCell className="text-slate-400 text-sm">
                          {admin.last_login_at
                            ? new Date(admin.last_login_at).toLocaleDateString('en-GB')
                            : <span className="text-slate-600">Never</span>}
                        </TableCell>
                        <TableCell className="text-slate-500 text-sm">
                          {new Date(admin.created_at).toLocaleDateString('en-GB')}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1.5">
                            <Button
                              variant="ghost" size="icon"
                              className="h-8 w-8 text-slate-400 hover:text-cyan-400 hover:bg-cyan-500/10"
                              title="Edit role"
                              onClick={() => { setEditTarget(admin); setEditRole(admin.role); setEditOpen(true); }}
                            >
                              <Edit2 className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost" size="icon"
                              className={`h-8 w-8 ${admin.is_active ? 'text-slate-400 hover:text-red-400 hover:bg-red-500/10' : 'text-slate-400 hover:text-green-400 hover:bg-green-500/10'}`}
                              title={admin.is_active ? 'Deactivate' : 'Reactivate'}
                              onClick={() => handleToggleActive(admin)}
                            >
                              {admin.is_active ? <UserX className="h-3.5 w-3.5" /> : <UserCheck className="h-3.5 w-3.5" />}
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Invite dialog */}
      <Dialog open={inviteOpen} onOpenChange={open => { if (!open) { setInviteEmail(''); setInviteRole('support_agent'); } setInviteOpen(open); }}>
        <DialogContent className="bg-slate-900 border-slate-700 text-white sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <Mail className="h-5 w-5 text-cyan-400" />Invite System Admin
            </DialogTitle>
            <DialogDescription className="text-slate-400">
              An email invite will be sent. The user must click the link to set their password before their first login.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-slate-300">Email address</Label>
              <Input
                type="email"
                placeholder="admin@example.com"
                value={inviteEmail}
                onChange={e => setInviteEmail(e.target.value)}
                className="bg-slate-800 border-slate-600 text-white placeholder:text-slate-500"
                onKeyDown={e => e.key === 'Enter' && handleInvite()}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-slate-300">Role</Label>
              <Select value={inviteRole} onValueChange={v => setInviteRole(v as SuperadminRole)}>
                <SelectTrigger className="bg-slate-800 border-slate-600 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-600">
                  {ROLE_ORDER.map(r => (
                    <SelectItem key={r} value={r}>
                      <div>
                        <div className="font-medium">{ROLE_CONFIG[r].label}</div>
                        <div className="text-xs text-slate-500">{ROLE_CONFIG[r].description}</div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {inviteRole === 'platform_admin' && (
              <div className="rounded-lg bg-amber-950/30 border border-amber-800/50 p-3 text-xs text-amber-300">
                Platform Admin has full access including managing other admins. Use with caution.
              </div>
            )}
          </div>
          <DialogFooter className="gap-2">
            <Button variant="ghost" className="text-slate-400" onClick={() => setInviteOpen(false)}>Cancel</Button>
            <Button
              className="bg-[#2E7D6B] hover:bg-[#1F5F52]"
              onClick={handleInvite}
              disabled={inviting || !inviteEmail.includes('@')}
            >
              {inviting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Mail className="h-4 w-4 mr-2" />}
              {inviting ? 'Sending…' : 'Send Invite'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit role dialog */}
      <Dialog open={editOpen} onOpenChange={open => { if (!open) setEditTarget(null); setEditOpen(open); }}>
        <DialogContent className="bg-slate-900 border-slate-700 text-white sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <Edit2 className="h-5 w-5 text-cyan-400" />Edit Role
            </DialogTitle>
            <DialogDescription className="text-slate-400">
              Change the role for <span className="text-slate-200 font-medium">{editTarget?.email}</span>
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <p className="text-xs text-slate-500 mb-1">Current role</p>
              {editTarget && (
                <Badge variant="outline" className={`text-xs ${ROLE_CONFIG[editTarget.role]?.badge}`}>
                  {ROLE_CONFIG[editTarget.role]?.label}
                </Badge>
              )}
            </div>
            <div className="space-y-1.5">
              <Label className="text-slate-300">New role</Label>
              <Select value={editRole} onValueChange={v => setEditRole(v as SuperadminRole)}>
                <SelectTrigger className="bg-slate-800 border-slate-600 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-600">
                  {ROLE_ORDER.map(r => (
                    <SelectItem key={r} value={r}>
                      <div>
                        <div className="font-medium">{ROLE_CONFIG[r].label}</div>
                        <div className="text-xs text-slate-500">{ROLE_CONFIG[r].description}</div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="ghost" className="text-slate-400" onClick={() => setEditOpen(false)}>Cancel</Button>
            <Button
              className="bg-[#2E7D6B] hover:bg-[#1F5F52]"
              onClick={handleSaveRole}
              disabled={saving || editRole === editTarget?.role}
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Save Role
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
