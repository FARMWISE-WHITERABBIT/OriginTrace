'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter
} from '@/components/ui/dialog';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from '@/components/ui/table';
import {
  Loader2, Search, User, LogIn, Users, ShieldCheck, Building2,
  RefreshCw, ChevronDown, Filter, UserCog
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { ROLE_LABELS, ROLE_DESCRIPTIONS, type AppRole } from '@/lib/rbac';

const ALL_ROLES: AppRole[] = [
  'admin', 'aggregator', 'agent', 'quality_manager',
  'logistics_coordinator', 'compliance_officer', 'warehouse_supervisor', 'buyer'
];

type RoleFilter = 'all' | AppRole;

interface UserProfile {
  id: number;
  user_id: string;
  full_name: string;
  role: string;
  org_id: number;
  organization: { id: number; name: string; slug: string } | null;
}

const ROLE_STYLES: Record<string, string> = {
  admin:                 'bg-violet-900/50 text-violet-300 border-violet-700',
  aggregator:            'bg-blue-900/50 text-blue-300 border-blue-700',
  agent:                 'bg-cyan-900/50 text-cyan-300 border-cyan-700',
  quality_manager:       'bg-amber-900/50 text-amber-300 border-amber-700',
  logistics_coordinator: 'bg-orange-900/50 text-orange-300 border-orange-700',
  compliance_officer:    'bg-green-900/50 text-green-300 border-green-700',
  warehouse_supervisor:  'bg-teal-900/50 text-teal-300 border-teal-700',
  buyer:                 'bg-pink-900/50 text-pink-300 border-pink-700',
};

const initials = (name: string) =>
  name.split(' ').map(p => p[0]).slice(0, 2).join('').toUpperCase();

const AVATAR_COLORS = [
  'bg-violet-700', 'bg-blue-700', 'bg-cyan-700', 'bg-amber-700',
  'bg-emerald-700', 'bg-rose-700', 'bg-indigo-700', 'bg-teal-700',
];

function avatarColor(id: number) {
  return AVATAR_COLORS[id % AVATAR_COLORS.length];
}

export default function UsersPage() {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<RoleFilter>('all');
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [newRole, setNewRole] = useState('');
  const [isSavingRole, setIsSavingRole] = useState(false);
  const [impersonating, setImpersonating] = useState<string | null>(null);
  const { toast } = useToast();
  const router = useRouter();

  useEffect(() => { fetchUsers(); }, []);

  async function fetchUsers() {
    setIsLoading(true);
    try {
      const res = await fetch('/api/superadmin?resource=users');
      if (res.ok) {
        const data = await res.json();
        setUsers(data.users || []);
      }
    } catch {
      toast({ title: 'Error', description: 'Failed to fetch users.', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  }

  async function handleUpdateRole() {
    if (!selectedUser || !newRole) return;
    setIsSavingRole(true);
    try {
      const res = await fetch('/api/superadmin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'update_user_role', target_user_id: selectedUser.user_id, role: newRole }),
      });
      if (res.ok) {
        toast({ title: 'Role updated', description: `${selectedUser.full_name} is now ${ROLE_LABELS[newRole as AppRole] || newRole}.` });
        setSelectedUser(null);
        fetchUsers();
      } else {
        const data = await res.json();
        throw new Error(data.error || 'Failed to update role');
      }
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setIsSavingRole(false);
    }
  }

  async function handleImpersonate(user: UserProfile) {
    if (!user.org_id) {
      toast({ title: 'No organization', description: 'This user has no organization assigned.', variant: 'destructive' });
      return;
    }
    setImpersonating(user.user_id);
    try {
      const res = await fetch('/api/impersonate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'start', org_id: user.org_id }),
      });
      if (res.ok) {
        toast({ title: 'Impersonation Started', description: `Viewing as ${user.organization?.name || 'org'}.` });
        router.push('/app');
      } else {
        throw new Error('Failed to impersonate');
      }
    } catch {
      toast({ title: 'Error', description: 'Failed to impersonate user.', variant: 'destructive' });
    } finally {
      setImpersonating(null);
    }
  }

  const roleCounts = ALL_ROLES.reduce<Record<string, number>>((acc, r) => {
    acc[r] = users.filter(u => u.role === r).length;
    return acc;
  }, {});

  const filtered = users.filter(u => {
    const matchesSearch = u.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.organization?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.role.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRole = roleFilter === 'all' || u.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-cyan-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold text-white" data-testid="text-page-title">Users</h1>
          <p className="text-slate-400 mt-0.5">All platform users across every tenant organization</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={fetchUsers}
          className="border-slate-600 text-slate-300 hover:bg-slate-800 shrink-0"
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Summary strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total Users', value: users.length, icon: Users, color: 'text-white' },
          { label: 'Admins', value: roleCounts.admin || 0, icon: ShieldCheck, color: 'text-violet-400' },
          { label: 'Agents', value: roleCounts.agent || 0, icon: User, color: 'text-cyan-400' },
          { label: 'Orgs Covered', value: new Set(users.map(u => u.org_id).filter(Boolean)).size, icon: Building2, color: 'text-blue-400' },
        ].map(s => (
          <div key={s.label} className="bg-slate-900 border border-slate-700 rounded-lg px-4 py-3 flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg bg-slate-800 flex items-center justify-center shrink-0">
              <s.icon className={`h-4 w-4 ${s.color}`} />
            </div>
            <div>
              <p className="text-xs text-slate-500 uppercase tracking-wide leading-none mb-0.5">{s.label}</p>
              <p className={`text-xl font-bold leading-none ${s.color}`}>{s.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Filters + table */}
      <Card className="bg-slate-900 border-slate-700">
        <CardHeader className="pb-0">
          <div className="flex flex-col sm:flex-row gap-3 justify-between items-start sm:items-center">
            <div>
              <CardTitle className="text-white text-base">All Users</CardTitle>
              <CardDescription className="text-slate-500 text-xs mt-0.5">
                {filtered.length} of {users.length} users
              </CardDescription>
            </div>
            <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                <Input
                  placeholder="Search users, orgs…"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="pl-8 h-9 bg-slate-800 border-slate-600 text-white placeholder:text-slate-500 text-sm w-full sm:w-52"
                  data-testid="input-search-users"
                />
              </div>
              <Select value={roleFilter} onValueChange={v => setRoleFilter(v as RoleFilter)}>
                <SelectTrigger className="h-9 bg-slate-800 border-slate-600 text-slate-300 text-sm w-full sm:w-44" data-testid="select-role-filter">
                  <Filter className="h-3.5 w-3.5 mr-2 text-slate-500" />
                  <SelectValue placeholder="All roles" />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-600">
                  <SelectItem value="all" className="text-slate-200">All roles</SelectItem>
                  {ALL_ROLES.map(r => (
                    <SelectItem key={r} value={r} className="text-slate-200">
                      {ROLE_LABELS[r]}
                      {roleCounts[r] > 0 && (
                        <span className="ml-2 text-xs text-slate-500">({roleCounts[r]})</span>
                      )}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-4">
          {filtered.length === 0 ? (
            <div className="text-center py-16 text-slate-500">
              <User className="h-10 w-10 mx-auto mb-3 opacity-30" />
              <p className="font-medium">No users found</p>
              <p className="text-sm mt-1">{searchQuery ? 'Try a different search or filter.' : 'Users will appear here once they register.'}</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-slate-700">
                    <TableHead className="text-slate-400 w-[240px]">User</TableHead>
                    <TableHead className="text-slate-400">Organization</TableHead>
                    <TableHead className="text-slate-400">Role</TableHead>
                    <TableHead className="text-slate-400 text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map(user => (
                    <TableRow key={user.id} className="border-slate-700 hover:bg-slate-800/40" data-testid={`row-user-${user.id}`}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className={`h-9 w-9 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0 ${avatarColor(user.id)}`}>
                            {initials(user.full_name || 'U U')}
                          </div>
                          <div>
                            <div className="font-medium text-white text-sm">{user.full_name}</div>
                            <div className="text-xs text-slate-600 font-mono">{user.user_id?.slice(0, 8)}…</div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Building2 className="h-3.5 w-3.5 text-slate-600 shrink-0" />
                          <div>
                            <div className="text-sm text-slate-300">{user.organization?.name || <span className="text-slate-600 italic">—</span>}</div>
                            {user.organization?.slug && (
                              <div className="text-xs text-slate-600">{user.organization.slug}</div>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={`text-xs capitalize ${ROLE_STYLES[user.role] || 'bg-slate-800 text-slate-400 border-slate-600'}`}
                          data-testid={`badge-role-${user.role}`}
                        >
                          {ROLE_LABELS[user.role as AppRole] || user.role}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5 justify-end">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 px-3 text-slate-400 hover:text-amber-400 hover:bg-amber-500/10 text-xs gap-1.5"
                            onClick={() => {
                              setSelectedUser(user);
                              setNewRole(user.role);
                            }}
                            data-testid={`button-change-role-${user.id}`}
                          >
                            <UserCog className="h-3.5 w-3.5" />
                            Role
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 px-3 text-slate-400 hover:text-cyan-400 hover:bg-cyan-500/10 text-xs gap-1.5"
                            onClick={() => handleImpersonate(user)}
                            disabled={impersonating === user.user_id || !user.org_id}
                            data-testid={`button-impersonate-${user.id}`}
                          >
                            {impersonating === user.user_id
                              ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              : <LogIn className="h-3.5 w-3.5" />}
                            View As
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Role change dialog */}
      <Dialog open={!!selectedUser} onOpenChange={open => { if (!open) setSelectedUser(null); }}>
        <DialogContent className="bg-slate-900 border-slate-700 text-white sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <UserCog className="h-5 w-5 text-amber-400" />
              Change Role
            </DialogTitle>
            <DialogDescription className="text-slate-400">
              Update the platform role for <span className="text-slate-200 font-medium">{selectedUser?.full_name}</span>.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="flex items-center gap-3 p-3 rounded-lg bg-slate-800 border border-slate-700">
              <div className={`h-9 w-9 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0 ${selectedUser ? avatarColor(selectedUser.id) : 'bg-slate-700'}`}>
                {selectedUser ? initials(selectedUser.full_name || 'U U') : ''}
              </div>
              <div>
                <div className="text-sm font-medium text-white">{selectedUser?.full_name}</div>
                <div className="text-xs text-slate-500">{selectedUser?.organization?.name || 'No org'}</div>
              </div>
            </div>

            <div className="space-y-1.5">
              <p className="text-xs text-slate-500 uppercase tracking-wide">Current role</p>
              <Badge variant="outline" className={`capitalize text-xs ${ROLE_STYLES[selectedUser?.role || ''] || 'bg-slate-800 text-slate-400 border-slate-600'}`}>
                {ROLE_LABELS[selectedUser?.role as AppRole] || selectedUser?.role}
              </Badge>
            </div>

            <div className="space-y-1.5">
              <p className="text-xs text-slate-500 uppercase tracking-wide">New role</p>
              <Select value={newRole} onValueChange={setNewRole}>
                <SelectTrigger className="bg-slate-800 border-slate-600 text-slate-100" data-testid="select-new-role">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-600">
                  {ALL_ROLES.map(r => (
                    <SelectItem key={r} value={r} className="text-slate-200" data-testid={`option-role-${r}`}>
                      <div>
                        <div className="font-medium">{ROLE_LABELS[r]}</div>
                        <div className="text-xs text-slate-500 truncate max-w-[260px]">{ROLE_DESCRIPTIONS[r]}</div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="ghost" className="text-slate-400" onClick={() => setSelectedUser(null)}>
              Cancel
            </Button>
            <Button
              onClick={handleUpdateRole}
              disabled={isSavingRole || newRole === selectedUser?.role}
              className="bg-amber-700 hover:bg-amber-600"
              data-testid="button-confirm-role"
            >
              {isSavingRole
                ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Saving…</>
                : 'Update Role'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
