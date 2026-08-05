'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plug, Plus, Trash2, Edit2, CheckCircle2, XCircle, Clock, RefreshCw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';

const ALL_EVENTS = [
  { value: 'farm.approved', label: 'Farm Approved' },
  { value: 'farm.rejected', label: 'Farm Rejected' },
  { value: 'farm.created', label: 'Farm Registered' },
  { value: 'batch.created', label: 'Batch Created' },
  { value: 'batch.completed', label: 'Batch Completed' },
  { value: 'shipment.created', label: 'Shipment Created' },
  { value: 'shipment.status_changed', label: 'Shipment Status Changed' },
  { value: 'compliance.changed', label: 'Compliance Status Changed' },
  { value: 'deforestation.alert', label: 'Deforestation Alert' },
];

interface Integration {
  id: string;
  name: string;
  endpoint_url: string;
  http_method: string;
  event_subscriptions: string[];
  is_active: boolean;
  last_synced_at: string | null;
  last_error: string | null;
  created_at: string;
}

const emptyForm = {
  name: '',
  endpoint_url: '',
  http_method: 'POST',
  api_key: '',
  event_subscriptions: [] as string[],
  is_active: true,
};

export function IntegrationsContent() {
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [editing, setEditing] = useState<Integration | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const fetchIntegrations = useCallback(async () => {
    try {
      const res = await fetch('/api/integrations');
      const data = await res.json();
      setIntegrations(data.integrations ?? []);
    } catch {
      toast({ title: 'Failed to load integrations', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { fetchIntegrations(); }, [fetchIntegrations]);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setShowDialog(true);
  };

  const openEdit = (integration: Integration) => {
    setEditing(integration);
    setForm({
      name: integration.name,
      endpoint_url: integration.endpoint_url,
      http_method: integration.http_method,
      api_key: '',
      event_subscriptions: integration.event_subscriptions,
      is_active: integration.is_active,
    });
    setShowDialog(true);
  };

  const handleSave = async () => {
    if (!form.name.trim() || !form.endpoint_url.trim()) {
      toast({ title: 'Name and endpoint URL are required', variant: 'destructive' });
      return;
    }
    if (form.event_subscriptions.length === 0) {
      toast({ title: 'Select at least one event', variant: 'destructive' });
      return;
    }

    setSaving(true);
    try {
      const body: Record<string, unknown> = {
        name: form.name.trim(),
        endpoint_url: form.endpoint_url.trim(),
        http_method: form.http_method,
        event_subscriptions: form.event_subscriptions,
        is_active: form.is_active,
      };
      if (form.api_key.trim()) body.api_key = form.api_key.trim();
      if (editing) body.id = editing.id;

      const res = await fetch('/api/integrations', {
        method: editing ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? 'Save failed');
      }

      toast({ title: editing ? 'Integration updated' : 'Integration created' });
      setShowDialog(false);
      fetchIntegrations();
    } catch (err) {
      toast({ title: String(err instanceof Error ? err.message : err), variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this integration?')) return;
    try {
      const res = await fetch(`/api/integrations?id=${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Delete failed');
      toast({ title: 'Integration deleted' });
      setIntegrations((prev) => prev.filter((i) => i.id !== id));
    } catch {
      toast({ title: 'Failed to delete', variant: 'destructive' });
    }
  };

  const toggleEvent = (event: string) => {
    setForm((prev) => ({
      ...prev,
      event_subscriptions: prev.event_subscriptions.includes(event)
        ? prev.event_subscriptions.filter((e) => e !== event)
        : [...prev.event_subscriptions, event],
    }));
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Plug className="h-5 w-5" />
              <div>
                <CardTitle>Integration Hub</CardTitle>
                <CardDescription>
                  Connect OriginTrace to your ERP, CRM, or any third-party system via outbound webhooks.
                  Events are sent as JSON POST requests when triggered.
                </CardDescription>
              </div>
            </div>
            <Button onClick={openCreate} size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Add Integration
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center gap-2 text-muted-foreground py-8 justify-center">
              <RefreshCw className="h-4 w-4 animate-spin" />
              Loading…
            </div>
          ) : integrations.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground">
              <Plug className="h-8 w-8 mx-auto mb-3 opacity-40" />
              <p className="font-medium">No integrations configured</p>
              <p className="text-sm mt-1">
                Connect your ERP or CRM to automatically receive supply chain events.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {integrations.map((integration) => (
                <div
                  key={integration.id}
                  className="flex items-start justify-between p-4 border rounded-lg gap-4"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium truncate">{integration.name}</span>
                      <Badge variant={integration.is_active ? 'default' : 'secondary'}>
                        {integration.is_active ? 'Active' : 'Paused'}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground truncate">{integration.endpoint_url}</p>
                    <div className="flex flex-wrap gap-1 mt-2">
                      {integration.event_subscriptions.map((ev) => (
                        <Badge key={ev} variant="outline" className="text-xs">
                          {ev}
                        </Badge>
                      ))}
                    </div>
                    <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                      {integration.last_synced_at ? (
                        <span className="flex items-center gap-1">
                          <CheckCircle2 className="h-3 w-3 text-green-500" />
                          Last synced {new Date(integration.last_synced_at).toLocaleString()}
                        </span>
                      ) : (
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          Never synced
                        </span>
                      )}
                      {integration.last_error && (
                        <span className="flex items-center gap-1 text-destructive">
                          <XCircle className="h-3 w-3" />
                          {integration.last_error}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Button variant="ghost" size="icon" onClick={() => openEdit(integration)}>
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(integration.id)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit Integration' : 'New Integration'}</DialogTitle>
            <DialogDescription>
              Configure an outbound connection to an external system.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                placeholder="e.g. Rising CRM, SAP ERP"
              />
            </div>

            <div className="space-y-2">
              <Label>Endpoint URL</Label>
              <Input
                value={form.endpoint_url}
                onChange={(e) => setForm((p) => ({ ...p, endpoint_url: e.target.value }))}
                placeholder="https://your-system.example.com/webhook"
              />
            </div>

            <div className="space-y-2">
              <Label>HTTP Method</Label>
              <Select value={form.http_method} onValueChange={(v) => setForm((p) => ({ ...p, http_method: v }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="POST">POST</SelectItem>
                  <SelectItem value="PUT">PUT</SelectItem>
                  <SelectItem value="PATCH">PATCH</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>API Key / Bearer Token</Label>
              <Input
                type="password"
                value={form.api_key}
                onChange={(e) => setForm((p) => ({ ...p, api_key: e.target.value }))}
                placeholder={editing ? 'Leave blank to keep existing key' : 'Optional'}
              />
            </div>

            <div className="space-y-2">
              <Label>Subscribe to Events</Label>
              <div className="grid grid-cols-1 gap-2 border rounded-md p-3">
                {ALL_EVENTS.map((ev) => (
                  <div key={ev.value} className="flex items-center gap-2">
                    <Checkbox
                      id={`ev-${ev.value}`}
                      checked={form.event_subscriptions.includes(ev.value)}
                      onCheckedChange={() => toggleEvent(ev.value)}
                    />
                    <label htmlFor={`ev-${ev.value}`} className="text-sm cursor-pointer">
                      {ev.label}
                    </label>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Switch
                id="is_active"
                checked={form.is_active}
                onCheckedChange={(v) => setForm((p) => ({ ...p, is_active: v }))}
              />
              <Label htmlFor="is_active">Active</Label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? 'Saving…' : editing ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
