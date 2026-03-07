'use client';

import { useState, useEffect, useCallback } from 'react';
import { useOrg } from '@/lib/contexts/org-context';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { TierGate } from '@/components/tier-gate';
import { Loader2, Plus, Key, Copy, Trash2, AlertTriangle } from 'lucide-react';

interface ApiKey {
  id: string;
  key_prefix: string;
  name: string;
  scopes: string[];
  rate_limit_per_hour: number;
  last_used_at: string | null;
  status: string;
  created_at: string;
  expires_at: string | null;
}

export default function ApiKeysPage() {
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [newKeySecret, setNewKeySecret] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: '',
    rate_limit_per_hour: '1000',
    expires_in_days: '365',
  });

  const { organization, isLoading: orgLoading } = useOrg();
  const { toast } = useToast();

  const fetchKeys = useCallback(async () => {
    if (orgLoading || !organization) {
      setIsLoading(false);
      return;
    }
    try {
      const response = await fetch('/api/keys');
      if (!response.ok) throw new Error('Failed to fetch');
      const data = await response.json();
      setKeys(data.keys || []);
    } catch (error) {
      console.error('Failed to fetch API keys:', error);
    } finally {
      setIsLoading(false);
    }
  }, [organization, orgLoading]);

  useEffect(() => {
    fetchKeys();
  }, [fetchKeys]);

  const handleCreate = async () => {
    if (!form.name.trim()) {
      toast({ title: 'Name required', description: 'Please enter a name for this API key.', variant: 'destructive' });
      return;
    }
    setIsCreating(true);
    try {
      const response = await fetch('/api/keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name,
          scopes: ['read'],
          rate_limit_per_hour: parseInt(form.rate_limit_per_hour) || 1000,
          expires_in_days: parseInt(form.expires_in_days) || 365,
        }),
      });
      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Failed to create key');
      }
      const data = await response.json();
      setNewKeySecret(data.secret);
      toast({ title: 'API Key Created', description: 'Copy the key now — it will not be shown again.' });
      fetchKeys();
      setForm({ name: '', rate_limit_per_hour: '1000', expires_in_days: '365' });
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setIsCreating(false);
    }
  };

  const handleRevoke = async (id: string) => {
    try {
      const response = await fetch(`/api/keys?id=${id}`, { method: 'DELETE' });
      if (!response.ok) throw new Error('Failed to revoke');
      toast({ title: 'Key Revoked', description: 'The API key has been revoked.' });
      fetchKeys();
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to revoke API key.', variant: 'destructive' });
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: 'Copied', description: 'API key copied to clipboard.' });
  };

  return (
    <TierGate feature="enterprise_api" requiredTier="enterprise" featureLabel="API Keys">
      <div className="flex-1 space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight" data-testid="text-page-title">API Keys</h1>
            <p className="text-sm text-muted-foreground mt-1">Manage API keys for programmatic access to your data</p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) setNewKeySecret(null); }}>
            <DialogTrigger asChild>
              <Button data-testid="button-create-key">
                <Plus className="h-4 w-4 mr-2" />
                Create Key
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create API Key</DialogTitle>
                <DialogDescription>Generate a new API key for external integrations.</DialogDescription>
              </DialogHeader>
              {newKeySecret ? (
                <div className="space-y-4 py-4">
                  <Alert>
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>Copy this key now. It will not be shown again.</AlertDescription>
                  </Alert>
                  <div className="flex items-center gap-2">
                    <Input value={newKeySecret} readOnly className="font-mono text-sm" data-testid="input-new-key-secret" />
                    <Button variant="outline" size="icon" onClick={() => copyToClipboard(newKeySecret)} data-testid="button-copy-key">
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="key-name">Key Name</Label>
                    <Input id="key-name" placeholder="Production Integration" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} data-testid="input-key-name" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="rate-limit">Rate Limit (per hour)</Label>
                      <Input id="rate-limit" type="number" value={form.rate_limit_per_hour} onChange={e => setForm(f => ({ ...f, rate_limit_per_hour: e.target.value }))} data-testid="input-rate-limit" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="expires">Expires In (days)</Label>
                      <Input id="expires" type="number" value={form.expires_in_days} onChange={e => setForm(f => ({ ...f, expires_in_days: e.target.value }))} data-testid="input-expires-days" />
                    </div>
                  </div>
                </div>
              )}
              {!newKeySecret && (
                <DialogFooter>
                  <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
                  <Button onClick={handleCreate} disabled={isCreating} data-testid="button-confirm-create">
                    {isCreating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                    Create Key
                  </Button>
                </DialogFooter>
              )}
            </DialogContent>
          </Dialog>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Key className="h-5 w-5" />
              Active Keys
            </CardTitle>
            <CardDescription>Keys used to authenticate external API requests</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : keys.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Key className="h-8 w-8 mx-auto mb-3 opacity-50" />
                <p>No API keys yet. Create one to get started.</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Prefix</TableHead>
                    <TableHead>Scopes</TableHead>
                    <TableHead>Rate Limit</TableHead>
                    <TableHead>Last Used</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-[60px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {keys.map(key => (
                    <TableRow key={key.id} data-testid={`row-key-${key.id}`}>
                      <TableCell className="font-medium">{key.name}</TableCell>
                      <TableCell className="font-mono text-sm">{key.key_prefix}...</TableCell>
                      <TableCell>
                        {key.scopes?.map(s => (
                          <Badge key={s} variant="secondary" className="mr-1">{s}</Badge>
                        ))}
                      </TableCell>
                      <TableCell>{key.rate_limit_per_hour}/hr</TableCell>
                      <TableCell className="text-muted-foreground">
                        {key.last_used_at ? new Date(key.last_used_at).toLocaleDateString() : 'Never'}
                      </TableCell>
                      <TableCell>
                        <Badge variant={key.status === 'active' ? 'default' : 'destructive'}>{key.status}</Badge>
                      </TableCell>
                      <TableCell>
                        {key.status === 'active' && (
                          <Button variant="ghost" size="icon" onClick={() => handleRevoke(key.id)} data-testid={`button-revoke-${key.id}`}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </TierGate>
  );
}
