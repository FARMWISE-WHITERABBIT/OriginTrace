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
};

const roleColors: Record<string, string> = {
  admin: 'bg-primary text-primary-foreground',
  aggregator: 'bg-blue-500 text-white',
  agent: 'bg-green-600 text-white',
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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Team Management</h1>
          <p className="text-muted-foreground">
            {isAdmin 
              ? 'Invite admins, aggregators, and field agents to your organization'
              : 'Invite field agents to your organization'}
          </p>
        </div>
        
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-add-member">
              <Plus className="h-4 w-4 mr-2" />
              Add Team Member
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
                <div className="space-y-2">
                  <Label htmlFor="name">Full Name</Label>
                  <Input
                    id="name"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="John Doe"
                    required
                    data-testid="input-new-name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    placeholder="user@example.com"
                    required
                    data-testid="input-new-email"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Temporary Password</Label>
                  <Input
                    id="password"
                    type="text"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Min 6 characters"
                    required
                    minLength={6}
                    data-testid="input-new-password"
                  />
                  <p className="text-xs text-muted-foreground">
                    Share this password with the user. They can change it later.
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="role">Role</Label>
                  <Select value={newRole} onValueChange={setNewRole}>
                    <SelectTrigger data-testid="select-role">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {isAdmin && (
                        <>
                          <SelectItem value="admin">Admin - Full access</SelectItem>
                          <SelectItem value="aggregator">Aggregator - Manage agents & collections</SelectItem>
                        </>
                      )}
                      <SelectItem value="agent">Agent - Field data collection</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isCreating} data-testid="button-create-user">
                  {isCreating ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    'Create Account'
                  )}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-48">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : team.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Users className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No team members yet</h3>
            <p className="text-muted-foreground text-center mb-4">
              Add your first team member to get started with field collections.
            </p>
            <Button onClick={() => setDialogOpen(true)} data-testid="button-add-first-member">
              <Plus className="h-4 w-4 mr-2" />
              Add First Member
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {team.map((member) => (
            <Card key={member.id} data-testid={`card-member-${member.id}`}>
              <CardContent className="flex items-center justify-between p-4">
                <div className="flex items-center gap-4">
                  <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                    {roleIcons[member.role] || <User className="h-5 w-5" />}
                  </div>
                  <div>
                    <p className="font-medium" data-testid={`text-member-name-${member.id}`}>
                      {member.full_name}
                    </p>
                    <p className="text-sm text-muted-foreground" data-testid={`text-member-email-${member.id}`}>
                      {member.email}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Badge className={roleColors[member.role]} data-testid={`badge-role-${member.id}`}>
                    {member.role}
                  </Badge>
                  {isAdmin && member.user_id !== profile?.user_id && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRemoveUser(member.user_id, member.full_name)}
                      data-testid={`button-remove-${member.id}`}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Role Permissions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 text-sm">
            <div className="flex items-start gap-3">
              <Badge className={roleColors.admin}>Admin</Badge>
              <span>Full access: manage team, farms, bags, compliance, exports, and settings</span>
            </div>
            <div className="flex items-start gap-3">
              <Badge className={roleColors.aggregator}>Aggregator</Badge>
              <span>Manage field agents, view collections, oversee sync status</span>
            </div>
            <div className="flex items-start gap-3">
              <Badge className={roleColors.agent}>Agent</Badge>
              <span>Map farms, collect produce (offline-capable), scan IDs</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
