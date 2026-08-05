'use client';

import { useEffect, useState, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetFooter } from '@/components/ui/sheet';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useOrg } from '@/lib/contexts/org-context';
import { useToast } from '@/hooks/use-toast';
import {
  Loader2,
  Shield,
  ShieldCheck,
  ShieldOff,
  Plus,
  Clock,
  User,
  MapPin,
  Layers,
  ClipboardCheck,
  CheckCircle2,
} from 'lucide-react';
import { TierGate } from '@/components/tier-gate';

interface Delegation {
  id: number;
  delegated_to: string;
  delegated_by: string;
  permission: string;
  region_scope: string | null;
  starts_at: string;
  expires_at: string;
  is_active: boolean;
  created_at: string;
  delegated_to_profile?: { full_name: string; email: string; role: string } | null;
  delegated_by_profile?: { full_name: string; email: string } | null;
}

interface Aggregator {
  user_id: string;
  full_name: string;
  email: string;
  assigned_state: string | null;
  assigned_lga: string | null;
}

const PERMISSION_LABELS: Record<string, { label: string; description: string; icon: any }> = {
  conflict_resolution: {
    label: 'Conflict Resolution',
    description: 'Resolve boundary conflicts between overlapping farms',
    icon: Layers,
  },
  compliance_review: {
    label: 'Compliance Review',
    description: 'Review and approve farm compliance status',
    icon: ClipboardCheck,
  },
};

export default function DelegationsPage() {
  const { profile } = useOrg();
  const { toast } = useToast();

  const [delegations, setDelegations] = useState<Delegation[]>([]);
  const [aggregators, setAggregators] = useState<Aggregator[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  const [selectedAggregator, setSelectedAggregator] = useState('');
  const [selectedPermission, setSelectedPermission] = useState('');
  const [regionScope, setRegionScope] = useState('');
  const [duration, setDuration] = useState('30');

  const fetchDelegations = useCallback(async () => {
    try {
      const response = await fetch('/api/delegations');
      if (response.ok) {
        const data = await response.json();
        setDelegations(data.delegations || []);
        setAggregators(data.aggregators || []);
      }
    } catch (error) {
      console.error('Failed to fetch delegations:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDelegations();
  }, [fetchDelegations]);

  const handleCreate = async () => {
    if (!selectedAggregator || !selectedPermission) return;

    setIsCreating(true);
    try {
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + parseInt(duration));

      const response = await fetch('/api/delegations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          delegated_to: selectedAggregator,
          permission: selectedPermission,
          region_scope: regionScope || null,
          expires_at: expiresAt.toISOString(),
        }),
      });

      if (response.ok) {
        toast({ title: 'Delegation Created', description: 'Super-Aggregator permissions granted successfully.' });
        setShowCreate(false);
        resetForm();
        fetchDelegations();
      } else {
        const err = await response.json();
        toast({ title: 'Error', description: err.error || 'Failed to create delegation', variant: 'destructive' });
      }
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to create delegation', variant: 'destructive' });
    } finally {
      setIsCreating(false);
    }
  };

  const handleRevoke = async (delegationId: number) => {
    try {
      const response = await fetch('/api/delegations', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ delegation_id: delegationId, action: 'revoke' }),
      });

      if (response.ok) {
        toast({ title: 'Delegation Revoked', description: 'Super-Aggregator permissions removed.' });
        fetchDelegations();
      } else {
        throw new Error('Failed');
      }
    } catch {
      toast({ title: 'Error', description: 'Failed to revoke delegation', variant: 'destructive' });
    }
  };

  const resetForm = () => {
    setSelectedAggregator('');
    setSelectedPermission('');
    setRegionScope('');
    setDuration('30');
  };

  const isExpired = (d: Delegation) => new Date(d.expires_at) < new Date();
  const activeDelegations = delegations.filter(d => d.is_active && !isExpired(d));
  const inactiveDelegations = delegations.filter(d => !d.is_active || isExpired(d));

  const getDaysRemaining = (expiresAt: string) => {
    const diff = new Date(expiresAt).getTime() - Date.now();
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  };

  return (
    <TierGate feature="delegations" requiredTier="pro" featureLabel="Delegations">
    {isLoading ? (
      <div className="rounded-md border border-border overflow-hidden"><table className="w-full"><thead className="border-b border-border bg-muted/30"><tr>{Array.from({length:5}).map((_,i)=><th key={i} className="px-4 py-3"><div className="h-3 w-16 bg-muted animate-pulse rounded"/></th>)}</tr></thead><tbody>{Array.from({length:5}).map((_,i)=><tr key={i} className="border-b border-border">{Array.from({length:5}).map((_,j)=><td key={j} className="px-4 py-3"><div className="h-4 bg-muted animate-pulse rounded" style={{width:`${60+j*15}%`}}/></td>)}</tr>)}</tbody></table></div>
    ) : (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2" data-testid="text-page-title">
            <Shield className="h-6 w-6 text-primary" />
            Super-Aggregator Delegations
          </h1>
          <p className="text-muted-foreground">
            Grant trusted aggregators temporary admin-level powers
          </p>
        </div>
        {profile?.role === 'admin' && (
          <Button onClick={() => setShowCreate(true)} data-testid="button-create-delegation">
            <Plus className="h-4 w-4 mr-2" />
            New Delegation
          </Button>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 gap-2">
            <CardTitle className="text-sm font-medium">Active Delegations</CardTitle>
            <ShieldCheck className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono" data-testid="text-active-count">{activeDelegations.length}</div>
            <p className="text-xs text-muted-foreground">Currently active permissions</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 gap-2">
            <CardTitle className="text-sm font-medium">Aggregators</CardTitle>
            <User className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono">{aggregators.length}</div>
            <p className="text-xs text-muted-foreground">Available for delegation</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Delegation Rules</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Region-scoped, function-specific, time-bound (30-90 days). All actions are audit-logged.
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Active Delegations</CardTitle>
          <CardDescription>Current super-aggregator permissions</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Aggregator</TableHead>
                <TableHead>Permission</TableHead>
                <TableHead>Region</TableHead>
                <TableHead>Expires</TableHead>
                <TableHead>Granted By</TableHead>
                {profile?.role === 'admin' && <TableHead></TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {activeDelegations.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8">
                    <div className="flex flex-col items-center gap-2 text-muted-foreground">
                      <Shield className="h-8 w-8" />
                      <span>No active delegations</span>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                activeDelegations.map((d) => {
                  const permConfig = PERMISSION_LABELS[d.permission];
                  const PermIcon = permConfig?.icon || Shield;
                  return (
                    <TableRow key={d.id} data-testid={`delegation-row-${d.id}`}>
                      <TableCell>
                        <div className="font-medium">{d.delegated_to_profile?.full_name || 'Unknown'}</div>
                        <div className="text-xs text-muted-foreground">{d.delegated_to_profile?.email}</div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <PermIcon className="h-4 w-4 text-muted-foreground" />
                          <span>{permConfig?.label || d.permission}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {d.region_scope ? (
                          <Badge variant="outline">
                            <MapPin className="h-3 w-3 mr-1" />
                            {d.region_scope}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground text-sm">All regions</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3 text-muted-foreground" />
                          <span className="text-sm font-mono">{getDaysRemaining(d.expires_at)}d left</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">{d.delegated_by_profile?.full_name || '-'}</TableCell>
                      {profile?.role === 'admin' && (
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRevoke(d.id)}
                            className="text-destructive"
                            data-testid={`button-revoke-${d.id}`}
                          >
                            <ShieldOff className="h-4 w-4 mr-1" />
                            Revoke
                          </Button>
                        </TableCell>
                      )}
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {inactiveDelegations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Past Delegations</CardTitle>
            <CardDescription>Expired or revoked delegations</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Aggregator</TableHead>
                  <TableHead>Permission</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Period</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {inactiveDelegations.slice(0, 10).map((d) => (
                  <TableRow key={d.id} className="text-muted-foreground">
                    <TableCell>{d.delegated_to_profile?.full_name || 'Unknown'}</TableCell>
                    <TableCell>{PERMISSION_LABELS[d.permission]?.label || d.permission}</TableCell>
                    <TableCell>
                      {!d.is_active ? (
                        <Badge variant="outline" className="text-red-500 border-red-300">Revoked</Badge>
                      ) : (
                        <Badge variant="outline" className="text-amber-500 border-amber-300">Expired</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-xs font-mono">
                      {new Date(d.starts_at).toLocaleDateString()} - {new Date(d.expires_at).toLocaleDateString()}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <Sheet open={showCreate} onOpenChange={(open) => { if (!open) { setShowCreate(false); resetForm(); } }}>
        <SheetContent className="sm:max-w-lg">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5" />
              Grant Super-Aggregator Permission
            </SheetTitle>
            <SheetDescription>
              Delegate admin-level powers to a trusted aggregator. All actions taken under delegation are audit-logged.
            </SheetDescription>
          </SheetHeader>

          <div className="space-y-6 py-6">
            <div className="space-y-2">
              <Label>Aggregator</Label>
              <Select value={selectedAggregator} onValueChange={setSelectedAggregator}>
                <SelectTrigger data-testid="select-aggregator">
                  <SelectValue placeholder="Select an aggregator" />
                </SelectTrigger>
                <SelectContent>
                  {aggregators.map((agg) => (
                    <SelectItem key={agg.user_id} value={agg.user_id}>
                      {agg.full_name} ({agg.assigned_state || 'No region'})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Permission</Label>
              <Select value={selectedPermission} onValueChange={setSelectedPermission}>
                <SelectTrigger data-testid="select-permission">
                  <SelectValue placeholder="Select permission type" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(PERMISSION_LABELS).map(([key, config]) => (
                    <SelectItem key={key} value={key}>
                      {config.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedPermission && (
                <p className="text-xs text-muted-foreground">
                  {PERMISSION_LABELS[selectedPermission]?.description}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label>Region Scope (optional)</Label>
              <Input
                placeholder="e.g. Lagos, Oyo State"
                value={regionScope}
                onChange={(e) => setRegionScope(e.target.value)}
                data-testid="input-region-scope"
              />
              <p className="text-xs text-muted-foreground">Leave empty for all regions</p>
            </div>

            <div className="space-y-2">
              <Label>Duration (days)</Label>
              <Select value={duration} onValueChange={setDuration}>
                <SelectTrigger data-testid="select-duration">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="30">30 days</SelectItem>
                  <SelectItem value="60">60 days</SelectItem>
                  <SelectItem value="90">90 days</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <SheetFooter>
            <Button
              onClick={handleCreate}
              disabled={isCreating || !selectedAggregator || !selectedPermission}
              className="w-full"
              data-testid="button-confirm-delegation"
            >
              {isCreating ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <CheckCircle2 className="h-4 w-4 mr-2" />
              )}
              Grant Permission
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
    )}
    </TierGate>
  );
}
