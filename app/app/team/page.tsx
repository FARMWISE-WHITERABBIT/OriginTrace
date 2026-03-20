'use client';

import { useState, useEffect } from 'react';
import { useOrg } from '@/lib/contexts/org-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Plus, Trash2, Users, Shield, UserCheck, User } from 'lucide-react';

interface TeamMember {
  id: string;
  user_id: string;
  full_name: string;
  email: string;
  role: string;
  created_at: string;
}

const roleIcons: Record<string, React.ReactNode> = {
  admin: <Shield className="h-4 w-4" />,
  aggregator: <UserCheck className="h-4 w-4" />,
  agent: <User className="h-4 w-4" />,
  quality_manager: <UserCheck className="h-4 w-4" />,
  logistics_coordinator: <UserCheck className="h-4 w-4" />,
  compliance_officer: <Shield className="h-4 w-4" />,
  warehouse_supervisor: <UserCheck className="h-4 w-4" />,
};

const roleColors: Record<string, string> = {
  admin: 'bg-primary text-primary-foreground',
  aggregator: 'bg-blue-500 text-white',
  agent: 'bg-green-600 text-white',
  quality_manager: 'bg-purple-600 text-white',
  logistics_coordinator: 'bg-amber-600 text-white',
  compliance_officer: 'bg-teal-600 text-white',
  warehouse_supervisor: 'bg-indigo-600 text-white',
};

const roleLabels: Record<string, string> = {
  admin: 'Admin',
  aggregator: 'Aggregator',
  agent: 'Agent',
  quality_manager: 'Quality Manager',
  logistics_coordinator: 'Logistics Coordinator',
  compliance_officer: 'Compliance Officer',
  warehouse_supervisor: 'Warehouse Supervisor',
};

export default function TeamPage() {
  const [team, setTeam] = useState<TeamMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newName, setNewName] = useState('');
  const [newRole, setNewRole] = useState('agent');
  
  const { profile } = useOrg();
  const { toast } = useToast();
  
  const canManageTeam = profile?.role === 'admin' || profile?.role === 'aggregator';
  const isAdmin = profile?.role === 'admin';

  useEffect(() => {
    if (canManageTeam) {
      fetchTeam();
    }
  }, [canManageTeam]);

  const fetchTeam = async () => {
    try {
      const response = await fetch('/api/team');
      const data = await response.json();
      
      if (response.ok) {
        setTeam(data.team || []);
      } else {
        toast({ title: 'Error', description: data.error, variant: 'destructive' });
      }
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to load team', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCreating(true);
    
    try {
      const response = await fetch('/api/team', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: newEmail,
          password: newPassword,
          fullName: newName,
          role: newRole,
        }),
      });
      
      const data = await response.json();
      
      if (response.ok) {
        toast({ title: 'Success', description: data.message });
        setDialogOpen(false);
        setNewEmail('');
        setNewPassword('');
        setNewName('');
        setNewRole('agent');
        fetchTeam();
      } else {
        toast({ title: 'Error', description: data.error, variant: 'destructive' });
      }
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to create user', variant: 'destructive' });
    } finally {
      setIsCreating(false);
    }
  };

  const handleRemoveUser = async (userId: string, userName: string) => {
    if (!confirm(`Are you sure you want to remove ${userName} from your team?`)) return;
    
    try {
      const response = await fetch(`/api/team?userId=${userId}`, {
        method: 'DELETE',
      });
      
      const data = await response.json();
      
      if (response.ok) {
        toast({ title: 'Success', description: 'User removed from team' });
        fetchTeam();
      } else {
        toast({ title: 'Error', description: data.error, variant: 'destructive' });
      }
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to remove user', variant: 'destructive' });
    }
  };

  if (!canManageTeam) {
    return (
      <div className="flex items-center justify-center h-[50vh]">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>Access Restricted</CardTitle>
            <CardDescription>
              Only organization admins and aggregators can manage team members.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl">

      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Team</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {isAdmin ? 'Manage accounts and roles for your organisation' : 'View your field team'}
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-add-member" className="shrink-0">
              <Plus className="h-4 w-4 mr-2" />
              Add Member
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Team Member</DialogTitle>
              <DialogDescription>
                Create an account for a new team member. They'll use these credentials to sign in.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreateUser}>
              <div className="space-y-4 py-4">
                <div className="space-y-1.5">
                  <Label htmlFor="name">Full Name</Label>
                  <Input id="name" value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Amaka Obi" required data-testid="input-new-name" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} placeholder="amaka@yourcompany.com" required data-testid="input-new-email" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="password">Temporary Password</Label>
                  <Input id="password" type="text" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="Min 6 characters" required minLength={6} data-testid="input-new-password" />
                  <p className="text-xs text-muted-foreground">Share this with the user — they can change it after first login.</p>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="role">Role</Label>
                  <Select value={newRole} onValueChange={setNewRole}>
                    <SelectTrigger data-testid="select-role"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {isAdmin && (
                        <>
                          <SelectItem value="admin">Admin — Full access</SelectItem>
                          <SelectItem value="aggregator">Aggregator — Manage agents & collections</SelectItem>
                        </>
                      )}
                      <SelectItem value="agent">Agent — Field data collection</SelectItem>
                      {isAdmin && (
                        <>
                          <SelectItem value="quality_manager">Quality Manager — Grading & yield control</SelectItem>
                          <SelectItem value="logistics_coordinator">Logistics Coordinator — Shipments & transport</SelectItem>
                          <SelectItem value="compliance_officer">Compliance Officer — Regulatory & audit</SelectItem>
                          <SelectItem value="warehouse_supervisor">Warehouse Supervisor — Inventory management</SelectItem>
                        </>
                      )}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={isCreating} data-testid="button-create-user">
                  {isCreating ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Creating...</> : 'Create Account'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* ── Member list ── */}
      {isLoading ? (
        <div className="flex items-center justify-center h-48">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : team.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <div className="h-14 w-14 rounded-full bg-muted flex items-center justify-center mb-4">
              <Users className="h-7 w-7 text-muted-foreground" />
            </div>
            <h3 className="font-semibold mb-1">No team members yet</h3>
            <p className="text-sm text-muted-foreground mb-5 max-w-xs">
              Add your first team member to get started with field collections and supply chain management.
            </p>
            <Button onClick={() => setDialogOpen(true)} data-testid="button-add-first-member">
              <Plus className="h-4 w-4 mr-2" />Add First Member
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="divide-y divide-border">
              {team.map((member) => (
                <div key={member.id} className="flex items-center gap-4 px-5 py-4" data-testid={`card-member-${member.id}`}>
                  {/* Avatar */}
                  <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center shrink-0 text-sm font-semibold text-muted-foreground">
                    {member.full_name?.charAt(0)?.toUpperCase() || <User className="h-5 w-5" />}
                  </div>
                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate" data-testid={`text-member-name-${member.id}`}>{member.full_name}</p>
                    <p className="text-xs text-muted-foreground truncate" data-testid={`text-member-email-${member.id}`}>{member.email}</p>
                  </div>
                  {/* Role badge */}
                  <div className="shrink-0">
                    <Badge className={`${roleColors[member.role] || 'bg-muted text-muted-foreground'} text-xs`} data-testid={`badge-role-${member.id}`}>
                      {roleLabels[member.role] || member.role}
                    </Badge>
                  </div>
                  {/* Remove */}
                  {isAdmin && member.user_id !== profile?.user_id && (
                    <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive" onClick={() => handleRemoveUser(member.user_id, member.full_name)} data-testid={`button-remove-${member.id}`}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Role reference ── */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Role Permissions</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="divide-y divide-border">
            {[
              { role: 'admin',                label: 'Admin',                desc: 'Full access: team, farms, compliance, exports, and settings' },
              { role: 'aggregator',           label: 'Aggregator',           desc: 'Manage field agents, view collections, oversee sync status' },
              { role: 'agent',                label: 'Agent',                desc: 'Map farms, collect produce (offline-capable), scan IDs' },
              { role: 'quality_manager',      label: 'Quality Manager',      desc: 'Quality control, grading standards, yield validation, batch review' },
              { role: 'logistics_coordinator',label: 'Logistics',            desc: 'Shipment planning, transport management, delivery tracking' },
              { role: 'compliance_officer',   label: 'Compliance Officer',   desc: 'Regulatory compliance, audit logs, farm reviews, certifications' },
              { role: 'warehouse_supervisor', label: 'Warehouse Supervisor', desc: 'Inventory management, stock tracking, warehouse operations' },
            ].map(({ role, label, desc }) => (
              <div key={role} className="flex items-start gap-3 py-3">
                <Badge className={`${roleColors[role] || 'bg-muted text-muted-foreground'} text-xs shrink-0 mt-0.5`}>{label}</Badge>
                <p className="text-sm text-muted-foreground leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

    </div>
  );
}
