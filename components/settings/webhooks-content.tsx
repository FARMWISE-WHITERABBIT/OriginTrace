'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Webhook, Plus, Trash2, Copy, CheckCircle2, XCircle, Clock } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useApiResource } from '@/hooks/use-api-resource';
import { useOrg } from '@/lib/contexts/org-context';
import { useTranslations } from 'next-intl';

interface WebhookEndpoint {
  id: string;
  url: string;
  secret?: string;
  events: string[];
  status: string;
  description: string;
  created_at: string;
}

interface WebhookDelivery {
  id: string;
  webhook_id: string;
  event_type: string;
  response_status: number | null;
  attempts: number;
  status: string;
  created_at: string;
}

export function WebhooksContent() {
  const [showCreate, setShowCreate] = useState(false);
  const [newUrl, setNewUrl] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [selectedEvents, setSelectedEvents] = useState<string[]>([]);
  const [creating, setCreating] = useState(false);
  const [newSecret, setNewSecret] = useState<string | null>(null);
  const { toast } = useToast();
  const { organization, isLoading: orgLoading } = useOrg();
  const tErrors = useTranslations('errors');
  const {
    data: webhookData,
    error: webhooksError,
    loading,
    refetch: fetchWebhooks,
  } = useApiResource<{
    endpoints: WebhookEndpoint[];
    deliveries: WebhookDelivery[];
    availableEvents: string[];
  }>('/api/webhooks', {
    enabled: !!organization?.id,
    scopeKey: organization?.id,
    deps: [organization?.id],
    showErrorToast: false,
    select: (raw) => {
      const data = raw as {
        endpoints?: WebhookEndpoint[];
        deliveries?: WebhookDelivery[];
        availableEvents?: string[];
      };
      return {
        endpoints: data.endpoints || [],
        deliveries: data.deliveries || [],
        availableEvents: data.availableEvents || [],
      };
    },
  });
  const endpoints = webhookData?.endpoints ?? [];
  const deliveries = webhookData?.deliveries ?? [];
  const availableEvents = webhookData?.availableEvents ?? [];

  const handleCreate = async () => {
    if (!newUrl || selectedEvents.length === 0) return;
    setCreating(true);
    try {
      const res = await fetch('/api/webhooks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: newUrl, events: selectedEvents, description: newDescription }),
      });
      if (res.ok) {
        const data = await res.json();
        setNewSecret(data.endpoint.secret);
        toast({ title: 'Webhook Created', description: 'Save the signing secret — it won\'t be shown again.' });
        fetchWebhooks();
        setNewUrl('');
        setNewDescription('');
        setSelectedEvents([]);
      } else {
        const err = await res.json();
        toast({ title: 'Error', description: err.error, variant: 'destructive' });
      }
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to create webhook', variant: 'destructive' });
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const response = await fetch(`/api/webhooks?id=${id}`, { method: 'DELETE' });
      const body: unknown = await response.json().catch(() => null);
      if (!response.ok) {
        const message = body && typeof body === 'object' && 'error' in body
          ? String((body as { error: unknown }).error)
          : tErrors('failedToDeleteWebhook');
        throw new Error(message);
      }
      toast({ title: 'Webhook Deleted' });
      await fetchWebhooks();
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : tErrors('failedToDeleteWebhook'),
        variant: 'destructive',
      });
    }
  };

  const toggleEvent = (event: string) => {
    setSelectedEvents(prev =>
      prev.includes(event) ? prev.filter(e => e !== event) : [...prev, event]
    );
  };

  if ((orgLoading || (!!organization?.id && loading)) && webhookData === null) {
    return <div className="flex items-center justify-center py-12 text-muted-foreground">Loading webhooks...</div>;
  }

  const resourceError = webhooksError ? (
    <Card role="alert" className="border-destructive/40">
      <CardContent className="flex flex-col items-center gap-3 py-8 text-center">
        <XCircle className="h-7 w-7 text-destructive" />
        <div>
          <p className="font-medium">{tErrors('unableToLoadWebhooks')}</p>
          <p className="mt-1 text-sm text-muted-foreground">{webhooksError}</p>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={() => void fetchWebhooks()}>
          {tErrors('tryAgain')}
        </Button>
      </CardContent>
    </Card>
  ) : null;

  if (resourceError && webhookData === null) return resourceError;

  return (
    <div className="space-y-6">
      {resourceError}
      {newSecret && (
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="pt-4">
            <p className="text-sm font-medium text-amber-800 mb-2">Signing Secret (save this now — it won't be shown again):</p>
            <div className="flex items-center gap-2">
              <code className="text-xs bg-muted px-3 py-2 rounded border flex-1 break-all font-mono" data-testid="text-webhook-secret">{newSecret}</code>
              <Button variant="outline" size="sm" onClick={() => { navigator.clipboard.writeText(newSecret); toast({ title: 'Copied' }); }}>
                <Copy className="h-4 w-4" />
              </Button>
            </div>
            <Button variant="ghost" size="sm" className="mt-2" onClick={() => setNewSecret(null)}>Dismiss</Button>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-lg">Endpoints ({endpoints.length})</CardTitle>
            <CardDescription>Registered webhook destinations</CardDescription>
          </div>
          <Button onClick={() => setShowCreate(!showCreate)} data-testid="button-add-webhook">
            <Plus className="h-4 w-4 mr-2" />
            Add Endpoint
          </Button>
        </CardHeader>
        <CardContent>
          {showCreate && (
            <div className="border rounded-lg p-4 mb-4 space-y-4 bg-muted/30">
              <div className="space-y-2">
                <Label>Endpoint URL</Label>
                <Input placeholder="https://your-app.com/webhooks" value={newUrl} onChange={e => setNewUrl(e.target.value)} data-testid="input-webhook-url" />
              </div>
              <div className="space-y-2">
                <Label>Description (optional)</Label>
                <Input placeholder="ERP integration" value={newDescription} onChange={e => setNewDescription(e.target.value)} data-testid="input-webhook-desc" />
              </div>
              <div className="space-y-2">
                <Label>Subscribe to Events</Label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {availableEvents.map(event => (
                    <label key={event} className="flex items-center gap-2 text-sm cursor-pointer">
                      <Checkbox checked={selectedEvents.includes(event)} onCheckedChange={() => toggleEvent(event)} />
                      <span className="font-mono text-xs">{event}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div className="flex gap-2">
                <Button onClick={handleCreate} disabled={creating || !newUrl || selectedEvents.length === 0} data-testid="button-create-webhook">
                  {creating ? 'Creating...' : 'Create Endpoint'}
                </Button>
                <Button variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
              </div>
            </div>
          )}

          {endpoints.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">No webhook endpoints configured.</p>
          ) : (
            <div className="space-y-3">
              {endpoints.map(ep => (
                <div key={ep.id} className="flex items-center justify-between p-3 border rounded-lg" data-testid={`webhook-endpoint-${ep.id}`}>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <code className="text-sm font-mono truncate">{ep.url}</code>
                      <Badge variant={ep.status === 'active' ? 'default' : 'secondary'}>{ep.status}</Badge>
                    </div>
                    <div className="flex gap-1 mt-1 flex-wrap">
                      {ep.events.map(e => (
                        <Badge key={e} variant="outline" className="text-xs font-mono">{e}</Badge>
                      ))}
                    </div>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => handleDelete(ep.id)} aria-label="Delete webhook" data-testid={`button-delete-webhook-${ep.id}`}>
                    <Trash2 className="h-4 w-4 text-red-500" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Recent Deliveries</CardTitle>
          <CardDescription>Last 50 webhook delivery attempts</CardDescription>
        </CardHeader>
        <CardContent>
          {deliveries.length === 0 ? (
            <p className="text-muted-foreground text-center py-6">No deliveries yet.</p>
          ) : (
            <div className="space-y-2">
              {deliveries.map(d => (
                <div key={d.id} className="flex items-center justify-between p-2 border rounded text-sm" data-testid={`webhook-delivery-${d.id}`}>
                  <div className="flex items-center gap-2">
                    {d.status === 'delivered' ? <CheckCircle2 className="h-4 w-4 text-green-600" /> :
                     d.status === 'failed' ? <XCircle className="h-4 w-4 text-red-600" /> :
                     <Clock className="h-4 w-4 text-amber-600" />}
                    <span className="font-mono text-xs">{d.event_type}</span>
                  </div>
                  <div className="flex items-center gap-3 text-muted-foreground text-xs">
                    {d.response_status && <span>HTTP {d.response_status}</span>}
                    <span>Attempt {d.attempts}</span>
                    <span>{new Date(d.created_at).toLocaleString()}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
