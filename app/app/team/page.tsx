'use client';

import { useState, useEffect } from 'react';
import { useOrg } from '@/lib/contexts/org-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ConfirmDialog } from '@/components/confirm-dialog';
import { useToast } from '@/hooks/use-toast';
import {
  Loader2, Plus, Trash2, Users, Shield, UserCheck, User,
  Mail, Calendar, Crown, ShieldCheck, Truck, Package, Warehouse,
  AlertTriangle,
} from 'lucide-react';

interface TeamMember {
  id: string;
  user_id: string;
  full_name: string;
  email: string;
  role: string;
  created_at: string;
}

const ROLE_CONFIG: Record<string, {
  label: string;
  short: string;
  icon: React.ElementType;
  color: string;
  bg: string;
  ring: string;
  desc: string;
}> = {
  admin: {
    label: 'Admin', short: 'Admin',
    icon: Crown,
    color: 'text-amber-700 dark:text-amber-400',
    bg: 'bg-amber-50 dark:bg-amber-950/40',
    ring: 'ring-amber-200 dark:ring-amber-800',
    desc: 'Full access — team, farms, compliance, exports, and settings',
  },
  aggregator: {
    label: 'Aggregator', short: 'Aggregator',
    icon: UserCheck,
    color: 'text-blue-700 dark:text-blue-400',
    bg: 'bg-blue-50 dark:bg-blue-950/40',
    ring: 'ring-blue-200 dark:ring-blue-800',
    desc: 'Manage field agents, view collections, oversee sync status',
  },
  agent: {
    label: 'Field Agent', short: 'Agent',
    icon: User,
    color: 'text-green-700 dark:text-green-400',
    bg: 'bg-green-50 dark:bg-green-950/40',
    ring: 'ring-green-200 dark:ring-green-800',
    desc: 'Map farms, collect produce (offline-capable), scan farmer IDs',
  },
  quality_manager: {
    label: 'Quality Manager', short: 'Quality',
    icon: ShieldCheck,
    color: 'text-purple-700 dark:text-purple-400',
    bg: 'bg-purple-50 dark:bg-purple-950/40',
    ring: 'ring-purple-200 dark:ring-purple-800',
    desc: 'Grading standards, yield validation, and batch quality review',
  },
  logistics_coordinator: {
    label: 'Logistics', short: 'Logistics',
    icon: Truck,
    color: 'text-orange-700 dark:text-orange-400',
    bg: 'bg-orange-50 dark:bg-orange-950/40',
    ring: 'ring-orange-200 dark:ring-orange-800',
    desc: 'Shipment planning, transport management, delivery tracking',
  },
  compliance_officer: {
    label: 'Compliance Officer', short: 'Compliance',
    icon: Shield,
    color: 'text-teal-700 dark:text-teal-400',
    bg: 'bg-teal-50 dark:bg-teal-950/40',
    ring: 'ring-teal-200 dark:ring-teal-800',
    desc: 'Regulatory compliance, audit logs, farm reviews, certifications',
  },
  warehouse_supervisor: {
    label: 'Warehouse Supervisor', short: 'Warehouse',
    icon: Warehouse,
    color: 'text-indigo-700 dark:text-indigo-400',
    bg: 'bg-indigo-50 dark:bg-indigo-950/40',
    ring: 'ring-indigo-200 dark:ring-indigo-800',
    desc: 'Inventory management, stock tracking, warehouse operations',
  },
};

function Avatar({ name, role, size = 'md' }: { name: string; role: string; size?: 'sm' | 'md' | 'lg' }) {
  const cfg = ROLE_CONFIG[role];
  const initials = name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
  const sz = size === 'sm' ? 'h-8 w-8 text-xs' : size === 'lg' ? 'h-14 w-14 text-lg' : 'h-10 w-10 text-sm';
  return (
    <div className={`${sz} rounded-full ring-2 ${cfg?.ring || 'ring-border'} ${cfg?.bg || 'bg-muted'} flex items-center justify-center shrink-0 font-semibold ${cfg?.color || 'text-muted-foreground'}`}>
      {initials || <User className="h-4 w-4" />}
    </div>
  );
}

function RoleBadge({ role }: { role: string }) {
  const cfg = ROLE_CONFIG[role];
  if (!cfg) return <Badge variant="outline" className="text-xs">{role}</Badge>;
  const Icon = cfg.icon;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ring-1 ${cfg.bg} ${cfg.color} ${cfg.ring}`}>
      <Icon className="h-3 w-3" />
      {cfg.short}
    </span>
  );
}

export default function TeamPage() {
  const [team, setTeam] = useState<TeamMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newName, setNewName] = useState('');
  const [newRole, setNewRole] = useState('agent');
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [confirmRemove, setConfirmRemove] = useState<{ userId: string; userName: string } | null>(null);

  const { profile } = useOrg();
  const { toast } = useToast();

  const canManageTeam = profile?.role === 'admin' || profile?.role === 'aggregator';
  const isAdmin = profile?.role === 'admin';

  useEffect(() => { if (canManageTeam) fetchTeam(); }, [canManageTeam]);

  const fetchTeam = async () => {
    try {
      const res = await fetch('/api/team');
      const data = await res.json();
      if (res.ok) setTeam(data.team || []);
      else toast({ title: 'Error', description: data.error, variant: 'destructive' });
    } catch {
      toast({ title: 'Error', description: 'Failed to load team', variant: 'destructive' });
    } finally { setIsLoading(false); }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCreating(true);
    try {
      const res = await fetch('/api/team', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: newEmail, password: newPassword, fullName: newName, role: newRole }),
      });
      const data = await res.json();
      if (res.ok) {
        toast({ title: 'Account created', description: `${newName} has been added to your team.` });
        setDialogOpen(false);
        setNewEmail(''); setNewPassword(''); setNewName(''); setNewRole('agent');
        fetchTeam();
      } else {
        toast({ title: 'Error', description: data.error, variant: 'destructive' });
      }
    } catch {
      toast({ title: 'Error', description: 'Failed to create user', variant: 'destructive' });
    } finally { setIsCreating(false); }
  };

  const handleRemoveUser = (userId: string, userName: string) => {
    setConfirmRemove({ userId, userName });
  };

  const doRemoveUser = async () => {
    if (!confirmRemove) return;
    const { userId, userName } = confirmRemove;
    setRemovingId(userId);
    try {
      const res = await fetch(`/api/team?userId=${userId}`, { method: 'DELETE' });
      const data = await res.json();
      if (res.ok) {
        toast({ title: 'Member removed', description: `${userName} has been removed.` });
        fetchTeam();
      } else {
        toast({ title: 'Error', description: data.error, variant: 'destructive' });
      }
    } catch {
      toast({ title: 'Error', description: 'Failed to remove user', variant: 'destructive' });
    } finally { setRemovingId(null); setConfirmRemove(null); }
  };

  if (!canManageTeam) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="text-center max-w-sm">
          <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="h-8 w-8 text-muted-foreground" />
          </div>
          <h2 className="text-lg font-semibold mb-2">Access Restricted</h2>
          <p className="text-sm text-muted-foreground">Only organisation admins and aggregators can manage team members.</p>
        </div>
      </div>
    );
  }

  // Group team by role priority
  const roleOrder = ['admin', 'aggregator', 'compliance_officer', 'quality_manager', 'logistics_coordinator', 'warehouse_supervisor', 'agent'];
  const sorted = [...team].sort((a, b) => {
    const ai = roleOrder.indexOf(a.role); const bi = roleOrder.indexOf(b.role);
    return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
  });

  const byRole = roleOrder.reduce<Record<string, TeamMember[]>>((acc, role) => {
    const members = sorted.filter(m => m.role === role);
    if (members.length) acc[role] = members;
    return acc;
  }, {});

  const totalByRole = roleOrder.map(r => ({ role: r, count: team.filter(m => m.role === r).length })).filter(r => r.count > 0);

  return (
    <div className="space-y-8 max-w-5xl">

      {/* ── Page header ── */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Team</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {team.length} member{team.length !== 1 ? 's' : ''} across {totalByRole.length} role{totalByRole.length !== 1 ? 's' : ''}
          </p>
        </div>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-add-member">
              <Plus className="h-4 w-4 mr-2" />Add Member
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Add Team Member</DialogTitle>
              <DialogDescription>Create a login for a new team member. Share the credentials with them after.</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreateUser} className="space-y-4 py-2">
              <div className="space-y-1.5">
                <Label htmlFor="name">Full Name</Label>
                <Input id="name" value={newName} onChange={e => setNewName(e.target.value)} placeholder="Amaka Obi" required data-testid="input-new-name" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="email">Email Address</Label>
                <Input id="email" type="email" value={newEmail} onChange={e => setNewEmail(e.target.value)} placeholder="amaka@company.com" required data-testid="input-new-email" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="password">Temporary Password</Label>
                <Input id="password" type="text" value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="Min 6 characters" required minLength={6} data-testid="input-new-password" />
                <p className="text-xs text-muted-foreground">Share with the user — they can change it after signing in.</p>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="role">Role</Label>
                <Select value={newRole} onValueChange={setNewRole}>
                  <SelectTrigger id="role" data-testid="select-role"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {isAdmin && (
                      <>
                        <SelectItem value="admin">Admin — Full access</SelectItem>
                        <SelectItem value="aggregator">Aggregator — Manage agents & collections</SelectItem>
                      </>
                    )}
                    <SelectItem value="agent">Field Agent — Data collection</SelectItem>
                    {isAdmin && (
                      <>
                        <SelectItem value="quality_manager">Quality Manager — Grading & yield</SelectItem>
                        <SelectItem value="logistics_coordinator">Logistics Coordinator — Shipments</SelectItem>
                        <SelectItem value="compliance_officer">Compliance Officer — Regulatory & audit</SelectItem>
                        <SelectItem value="warehouse_supervisor">Warehouse Supervisor — Inventory</SelectItem>
                      </>
                    )}
                  </SelectContent>
                </Select>
                {newRole && ROLE_CONFIG[newRole] && (
                  <p className="text-xs text-muted-foreground">{ROLE_CONFIG[newRole].desc}</p>
                )}
              </div>
              <DialogFooter className="pt-2">
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={isCreating} data-testid="button-create-user">
                  {isCreating ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Creating…</> : 'Create Account'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* ── Role summary chips ── */}
      {!isLoading && team.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {totalByRole.map(({ role, count }) => {
            const cfg = ROLE_CONFIG[role];
            const Icon = cfg?.icon || User;
            return (
              <div key={role} className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium ring-1 ${cfg?.bg || 'bg-muted'} ${cfg?.color || 'text-muted-foreground'} ${cfg?.ring || 'ring-border'}`}>
                <Icon className="h-3 w-3" />
                {cfg?.short || role}
                <span className="font-bold">{count}</span>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Content ── */}
      {isLoading ? (
        <div className="grid sm:grid-cols-2 gap-3">{Array.from({length:4}).map((_,i)=><div key={i} className="flex items-center gap-3 p-4 rounded-xl border border-border"><div className="h-10 w-10 rounded-full bg-muted animate-pulse shrink-0"/><div className="space-y-2 flex-1"><div className="h-4 w-28 bg-muted animate-pulse rounded"/><div className="h-3 w-36 bg-muted animate-pulse rounded"/></div></div>)}</div>
      ) : team.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center border-2 border-dashed border-border rounded-xl">
          <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mb-4">
            <Users className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="font-semibold text-lg mb-1">No team members yet</h3>
          <p className="text-sm text-muted-foreground mb-6 max-w-xs">
            Add field agents, quality managers, and other team members to collaborate on your supply chain.
          </p>
          <Button onClick={() => setDialogOpen(true)} data-testid="button-add-first-member">
            <Plus className="h-4 w-4 mr-2" />Add Your First Member
          </Button>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(byRole).map(([role, members]) => {
            const cfg = ROLE_CONFIG[role];
            const Icon = cfg?.icon || User;
            return (
              <div key={role}>
                {/* Role section header */}
                <div className="flex items-center gap-2 mb-3">
                  <div className={`h-6 w-6 rounded-md flex items-center justify-center ${cfg?.bg || 'bg-muted'}`}>
                    <Icon className={`h-3.5 w-3.5 ${cfg?.color || 'text-muted-foreground'}`} />
                  </div>
                  <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                    {cfg?.label || role}
                  </h2>
                  <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded-full">{members.length}</span>
                </div>

                {/* Member cards in this role */}
                <div className="grid sm:grid-cols-2 gap-3">
                  {members.map(member => {
                    const isMe = member.user_id === profile?.user_id;
                    const isRemoving = removingId === member.user_id;
                    const joined = new Date(member.created_at).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' });

                    return (
                      <div
                        key={member.id}
                        className="group relative flex items-center gap-3 p-4 rounded-xl border border-border bg-card hover:border-border/80 hover:shadow-sm transition-all"
                        data-testid={`card-member-${member.id}`}
                      >
                        <Avatar name={member.full_name} role={member.role} size="md" />

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <p className="text-sm font-semibold truncate" data-testid={`text-member-name-${member.id}`}>
                              {member.full_name}
                            </p>
                            {isMe && (
                              <span className="text-[10px] font-medium text-muted-foreground bg-muted px-1.5 py-0.5 rounded-full">You</span>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5 truncate" data-testid={`text-member-email-${member.id}`}>
                            <Mail className="h-3 w-3 shrink-0" />{member.email}
                          </p>
                          <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                            <Calendar className="h-3 w-3 shrink-0" />Joined {joined}
                          </p>
                        </div>

                        <div className="flex flex-col items-end gap-2 shrink-0">
                          <RoleBadge role={member.role} />
                          {isAdmin && !isMe && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
                              onClick={() => handleRemoveUser(member.user_id, member.full_name)}
                              disabled={isRemoving}
                              data-testid={`button-remove-${member.id}`}
                            >
                              {isRemoving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                            </Button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Role reference */}
      <div className="space-y-1">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide px-1 mb-3">Role Permissions</h2>
        <div className="grid sm:grid-cols-2 gap-2">
          {Object.entries(ROLE_CONFIG).map(([role, cfg]) => {
            const Icon = cfg.icon;
            return (
              <div key={role} className="flex items-start gap-3 p-3 rounded-lg border border-border bg-card/50">
                <div className={`h-7 w-7 rounded-md flex items-center justify-center shrink-0 mt-0.5 ${cfg.bg}`}>
                  <Icon className={`h-3.5 w-3.5 ${cfg.color}`} />
                </div>
                <div>
                  <p className="text-sm font-medium">{cfg.label}</p>
                  <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{cfg.desc}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <ConfirmDialog
        open={!!confirmRemove}
        onOpenChange={open => { if (!open) setConfirmRemove(null); }}
        title="Remove team member"
        description={`Remove ${confirmRemove?.userName} from your organisation? They will lose access immediately and cannot be undone.`}
        confirmLabel="Remove Member"
        loading={!!removingId}
        onConfirm={doRemoveUser}
      />
    </div>
  );
}
