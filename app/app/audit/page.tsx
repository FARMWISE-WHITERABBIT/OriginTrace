'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Shield, Search, ChevronLeft, ChevronRight, Clock, User, FileText } from 'lucide-react';

interface AuditEvent {
  id: string;
  org_id: string;
  actor_id: string;
  actor_email: string;
  action: string;
  resource_type: string;
  resource_id: string;
  metadata: Record<string, any>;
  ip_address: string;
  created_at: string;
}

const ACTION_COLORS: Record<string, string> = {
  create: 'bg-green-100 text-green-800',
  update: 'bg-blue-100 text-blue-800',
  delete: 'bg-red-100 text-red-800',
  approve: 'bg-emerald-100 text-emerald-800',
  reject: 'bg-orange-100 text-orange-800',
  login: 'bg-gray-100 text-gray-800',
  impersonation_start: 'bg-purple-100 text-purple-800',
  impersonation_end: 'bg-purple-100 text-purple-800',
};

function getActionColor(action: string): string {
  for (const [key, color] of Object.entries(ACTION_COLORS)) {
    if (action.toLowerCase().includes(key)) return color;
  }
  return 'bg-gray-100 text-gray-700';
}

function formatAction(action: string): string {
  return action.replace(/_/g, ' ').replace(/\./g, ' › ');
}

export default function AuditLogPage() {
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState('all');
  const [resourceFilter, setResourceFilter] = useState('all');

  const fetchEvents = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: '30' });
      if (search) params.set('search', search);
      if (actionFilter !== 'all') params.set('action', actionFilter);
      if (resourceFilter !== 'all') params.set('resource_type', resourceFilter);

      const res = await fetch(`/api/audit?${params}`);
      if (res.ok) {
        const data = await res.json();
        setEvents(data.events);
        setTotal(data.total);
        setTotalPages(data.totalPages);
      }
    } catch (error) {
      console.error('Failed to fetch audit events:', error);
    } finally {
      setLoading(false);
    }
  }, [page, search, actionFilter, resourceFilter]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  useEffect(() => {
    setPage(1);
  }, [search, actionFilter, resourceFilter]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2" data-testid="text-audit-title">
          <Shield className="h-6 w-6 text-[#2E7D6B]" />
          Audit Log
        </h1>
        <p className="text-muted-foreground mt-1">
          Immutable record of all data changes and actions across your organization.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Event Timeline</CardTitle>
          <CardDescription>{total} events recorded</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-3 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search actions, users, resources..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
                data-testid="input-audit-search"
              />
            </div>
            <Select value={resourceFilter} onValueChange={setResourceFilter}>
              <SelectTrigger className="w-[160px]" data-testid="select-resource-filter">
                <SelectValue placeholder="Resource" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Resources</SelectItem>
                <SelectItem value="farm">Farms</SelectItem>
                <SelectItem value="batch">Batches</SelectItem>
                <SelectItem value="shipment">Shipments</SelectItem>
                <SelectItem value="payment">Payments</SelectItem>
                <SelectItem value="document">Documents</SelectItem>
                <SelectItem value="user">Users</SelectItem>
                <SelectItem value="settings">Settings</SelectItem>
                <SelectItem value="contract">Contracts</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-12 text-muted-foreground">
              Loading audit events...
            </div>
          ) : events.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <Shield className="h-10 w-10 mb-3 opacity-50" />
              <p>No audit events found</p>
            </div>
          ) : (
            <div className="space-y-1">
              {events.map((event) => (
                <div
                  key={event.id}
                  className="flex items-start gap-4 p-3 rounded-lg hover:bg-muted/50 transition-colors border-l-2 border-transparent hover:border-[#2E7D6B]"
                  data-testid={`audit-event-${event.id}`}
                >
                  <div className="flex-shrink-0 mt-1">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant="secondary" className={getActionColor(event.action)}>
                        {formatAction(event.action)}
                      </Badge>
                      {event.resource_type && (
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <FileText className="h-3 w-3" />
                          {event.resource_type}
                          {event.resource_id && ` #${event.resource_id.slice(0, 8)}`}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                      {event.actor_email && (
                        <span className="flex items-center gap-1">
                          <User className="h-3 w-3" />
                          {event.actor_email}
                        </span>
                      )}
                      <span>•</span>
                      <span>{new Date(event.created_at).toLocaleString()}</span>
                      {event.ip_address && event.ip_address !== 'unknown' && (
                        <>
                          <span>•</span>
                          <span>{event.ip_address}</span>
                        </>
                      )}
                    </div>
                    {event.metadata && Object.keys(event.metadata).length > 0 && (
                      <div className="mt-1 text-xs text-muted-foreground bg-muted/30 rounded px-2 py-1 font-mono">
                        {Object.entries(event.metadata).slice(0, 3).map(([k, v]) => (
                          <span key={k} className="mr-3">{k}: {typeof v === 'object' ? JSON.stringify(v) : String(v)}</span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-6 pt-4 border-t">
              <span className="text-sm text-muted-foreground">
                Page {page} of {totalPages}
              </span>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  data-testid="button-audit-prev"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  data-testid="button-audit-next"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
