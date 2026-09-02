'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { LocationSelector } from '@/components/location-selector';
import { useOrg } from '@/lib/contexts/org-context';
import { createClient } from '@/lib/supabase/client';
import { useToast } from '@/hooks/use-toast';
import {
  Users,
  Plus,
  MapPin,
  Activity,
  Loader2,
  Package
} from 'lucide-react';
import { TierGate } from '@/components/tier-gate';

interface Agent {
  id: string;
  user_id: string;
  full_name: string;
  assigned_states: string[];
  assigned_lgas: string[];
  created_at: string;
  collections_count?: number;
}

export default function AgentManagementPage() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [newAgent, setNewAgent] = useState({ 
    name: '', 
    email: '',
    password: '',
    location: { states: [] as string[], lgas: [] as string[] }
  });
  const { organization, profile } = useOrg();
  const { toast } = useToast();
  const supabase = createClient();

  useEffect(() => {
    async function fetchData() {
      if (!organization) return;

      try {
        const response = await fetch('/api/agents');
        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || 'Failed to fetch agents');
        }
        
        const data = await response.json();
        
        const processedAgents = (data.agents || []).map((agent: any) => {
          const assignedStates = agent.assigned_state 
            ? agent.assigned_state.split(',').map((s: string) => s.trim()).filter(Boolean)
            : [];
          const assignedLgas = agent.assigned_lga 
            ? agent.assigned_lga.split(',').map((l: string) => l.trim()).filter(Boolean)
            : [];

          return {
            id: agent.id,
            user_id: agent.user_id,
            full_name: agent.full_name,
            assigned_states: assignedStates,
            assigned_lgas: assignedLgas,
            created_at: agent.created_at,
            collections_count: agent.collections_count || 0
          };
        });

        setAgents(processedAgents);
      } catch (error: any) {
        console.error('Failed to fetch agents:', error?.message || error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchData();
  }, [organization]);


  const handleCreateAgent = async () => {
    if (!newAgent.name.trim()) {
      toast({ title: 'Error', description: 'Name is required', variant: 'destructive' });
      return;
    }
    if (!newAgent.email.trim()) {
      toast({ title: 'Error', description: 'Email is required', variant: 'destructive' });
      return;
    }
    if (!newAgent.password || newAgent.password.length < 6) {
      toast({ title: 'Error', description: 'Password must be at least 6 characters', variant: 'destructive' });
      return;
    }

    setIsCreating(true);

    try {
      const assignedState = newAgent.location.states.length > 0 
        ? newAgent.location.states.join(', ') 
        : null;
      const assignedLga = newAgent.location.lgas.length > 0 
        ? newAgent.location.lgas.join(', ') 
        : null;

      const response = await fetch('/api/team', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: newAgent.email.trim(),
          password: newAgent.password,
          fullName: newAgent.name.trim(),
          role: 'agent',
          assigned_state: assignedState,
          assigned_lga: assignedLga
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create agent');
      }

      const response2 = await fetch('/api/agents');
      if (response2.ok) {
        const data = await response2.json();
        const processedAgents = (data.agents || []).map((agent: any) => {
          const assignedStates = agent.assigned_state 
            ? agent.assigned_state.split(',').map((s: string) => s.trim()).filter(Boolean)
            : [];
          const assignedLgas = agent.assigned_lga 
            ? agent.assigned_lga.split(',').map((l: string) => l.trim()).filter(Boolean)
            : [];
          return {
            id: agent.id,
            user_id: agent.user_id,
            full_name: agent.full_name,
            assigned_states: assignedStates,
            assigned_lgas: assignedLgas,
            created_at: agent.created_at,
            collections_count: agent.collections_count || 0
          };
        });
        setAgents(processedAgents);
      }

      setDialogOpen(false);
      setNewAgent({ name: '', email: '', password: '', location: { states: [], lgas: [] } });

      toast({
        title: 'Agent Created',
        description: `${newAgent.name} has been added as an agent with login: ${newAgent.email}`
      });
    } catch (error: any) {
      console.error('Failed to create agent:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to create agent',
        variant: 'destructive'
      });
    } finally {
      setIsCreating(false);
    }
  };

  const agentStats = {
    total: agents.length,
    active: agents.filter(a => a.collections_count && a.collections_count > 0).length,
    unassigned: agents.filter(a => a.assigned_states.length === 0).length
  };

  return (
    <TierGate feature="agents" requiredTier="basic" featureLabel="Field Agents">
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight" data-testid="text-page-title">Field Agents</h1>
          <p className="text-muted-foreground">Manage your field collection team</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-add-agent">
              <Plus className="h-4 w-4 mr-2" />
              Add Agent
            </Button>
          </DialogTrigger>
          <DialogContent className="max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Add New Agent</DialogTitle>
              <DialogDescription>
                Create a new field agent account for your organization
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Full Name *</Label>
                <Input
                  id="name"
                  placeholder="Enter agent's full name"
                  value={newAgent.name}
                  onChange={(e) => setNewAgent(prev => ({ ...prev, name: e.target.value }))}
                  data-testid="input-agent-name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="agent@example.com"
                  value={newAgent.email}
                  onChange={(e) => setNewAgent(prev => ({ ...prev, email: e.target.value }))}
                  data-testid="input-agent-email"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password *</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Min 6 characters"
                  value={newAgent.password}
                  onChange={(e) => setNewAgent(prev => ({ ...prev, password: e.target.value }))}
                  data-testid="input-agent-password"
                />
              </div>
              <div className="space-y-2">
                <Label>Assigned Regions</Label>
                <p className="text-xs text-muted-foreground mb-2">
                  Select states and LGAs where this agent can collect
                </p>
                <LocationSelector
                  value={newAgent.location}
                  onChange={(location) => setNewAgent(prev => ({ ...prev, location }))}
                  multiSelect={true}
                  placeholder="Select states and LGAs..."
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreateAgent} disabled={isCreating} data-testid="button-create-agent">
                {isCreating && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                Create Agent
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {[
          { icon: Users,    label: 'Total Agents',    value: isLoading ? '…' : String(agentStats.total),     sub: 'Registered field agents',    iconClass: 'icon-bg-blue',    accent: 'card-accent-blue' },
          { icon: Activity, label: 'Active Agents',   value: isLoading ? '…' : String(agentStats.active),    sub: 'With at least 1 collection', iconClass: 'icon-bg-emerald', accent: 'card-accent-emerald' },
          { icon: MapPin,   label: 'Unassigned',      value: isLoading ? '…' : String(agentStats.unassigned), sub: 'No state assigned',          iconClass: 'icon-bg-amber',   accent: 'card-accent-amber' },
        ].map(({ icon: Icon, label, value, sub, iconClass, accent }) => (
          <Card key={label} className={`transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 ${accent}`}>
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
              <div className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 ${iconClass}`}>
                <Icon className="h-4 w-4" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold tracking-tight">{value}</div>
              <p className="text-xs text-muted-foreground">{sub}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Agent Directory
          </CardTitle>
          <CardDescription>
            {agents.length} agents in your organization
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="rounded-md border border-border overflow-hidden">
              <table className="w-full">
                <thead className="border-b border-border bg-muted/30">
                  <tr>{['Name','Region','Collections','Joined'].map(h=><th key={h} className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">{h}</th>)}</tr>
                </thead>
                <tbody>{Array.from({length:5}).map((_,i)=><tr key={i} className="border-b border-border"><td className="px-4 py-3"><div className="h-4 w-32 bg-muted animate-pulse rounded"/></td><td className="hidden md:table-cell px-4 py-3"><div className="h-4 w-24 bg-muted animate-pulse rounded"/></td><td className="px-4 py-3"><div className="h-5 w-10 bg-muted animate-pulse rounded-full"/></td><td className="hidden md:table-cell px-4 py-3"><div className="h-4 w-20 bg-muted animate-pulse rounded"/></td></tr>)}</tbody>
              </table>
            </div>
          ) : agents.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center border-2 border-dashed border-border rounded-xl">
              <div className="h-14 w-14 rounded-full bg-muted flex items-center justify-center mb-4">
                <Users className="h-7 w-7 text-muted-foreground" />
              </div>
              <h3 className="font-semibold mb-1">No field agents yet</h3>
              <p className="text-sm text-muted-foreground max-w-xs mb-5">Add field agents to collect produce and register farmers using the mobile interface.</p>
              <Button onClick={() => setDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />Add First Agent
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead className="hidden md:table-cell">Region</TableHead>
                    <TableHead>Collections</TableHead>
                    <TableHead className="hidden md:table-cell">Joined</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {agents.map((agent) => (
                    <TableRow key={agent.id} data-testid={`agent-row-${agent.id}`}>
                      <TableCell className="font-medium">{agent.full_name}</TableCell>
                      <TableCell className="hidden md:table-cell">
                        {agent.assigned_states.length > 0 || agent.assigned_lgas.length > 0 ? (
                          <div className="flex flex-wrap items-center gap-1">
                            <MapPin className="h-3 w-3 flex-shrink-0" />
                            <span className="text-sm">
                              {[...agent.assigned_lgas, ...agent.assigned_states].slice(0, 3).join(', ')}
                              {[...agent.assigned_lgas, ...agent.assigned_states].length > 3 && (
                                <span className="text-muted-foreground"> +{[...agent.assigned_lgas, ...agent.assigned_states].length - 3}</span>
                              )}
                            </span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant={agent.collections_count && agent.collections_count > 0 ? 'default' : 'secondary'}>
                          <Package className="h-3 w-3 mr-1" />
                          {agent.collections_count || 0}
                        </Badge>
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-muted-foreground">
                        {new Date(agent.created_at).toLocaleDateString()}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
    </TierGate>
  );
}
