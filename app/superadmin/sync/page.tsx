'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, Wifi, WifiOff, Clock, Package, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface SyncStatus {
  id: string;
  org_id: string;
  agent_id: string;
  device_id: string;
  last_seen_at: string;
  pending_batches: number;
  pending_bags: number;
  app_version: string;
  is_online: boolean;
  agent: {
    id: string;
    full_name: string;
    role: string;
  };
  organization: {
    id: string;
    name: string;
  };
}

export default function SyncStatusPage() {
  const [syncStatus, setSyncStatus] = useState<SyncStatus[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchSyncStatus();
  }, []);

  async function fetchSyncStatus() {
    setIsLoading(true);
    try {
      const response = await fetch('/api/superadmin?resource=sync-status');
      if (response.ok) {
        const data = await response.json();
        setSyncStatus(data.sync_status || []);
      }
    } catch (error) {
      console.error('Failed to fetch sync status:', error);
    } finally {
      setIsLoading(false);
    }
  }

  const getTimeSince = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} min ago`;
    if (diffHours < 24) return `${diffHours} hr ago`;
    return `${diffDays} days ago`;
  };

  const onlineCount = syncStatus.filter(s => s.is_online).length;
  const offlineCount = syncStatus.filter(s => !s.is_online).length;
  const pendingData = syncStatus.filter(s => s.pending_batches > 0 || s.pending_bags > 0).length;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-cyan-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white" data-testid="text-page-title">First-Mile Pulse</h1>
          <p className="text-slate-400">Monitor agent device connectivity across all tenants</p>
        </div>
        <Button 
          onClick={fetchSyncStatus} 
          variant="outline" 
          className="border-slate-600 text-slate-300 hover:bg-slate-800"
          data-testid="button-refresh"
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="bg-slate-900 border-slate-700">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 gap-2">
            <CardTitle className="text-sm font-medium text-slate-300">Online</CardTitle>
            <div className="h-8 w-8 rounded-lg bg-green-500/10 flex items-center justify-center">
              <Wifi className="h-4 w-4 text-green-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-400">{onlineCount}</div>
            <p className="text-xs text-slate-400">Agents connected</p>
          </CardContent>
        </Card>

        <Card className="bg-slate-900 border-slate-700">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 gap-2">
            <CardTitle className="text-sm font-medium text-slate-300">Offline</CardTitle>
            <div className="h-8 w-8 rounded-lg bg-red-500/10 flex items-center justify-center">
              <WifiOff className="h-4 w-4 text-red-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-400">{offlineCount}</div>
            <p className="text-xs text-slate-400">Agents disconnected</p>
          </CardContent>
        </Card>

        <Card className="bg-slate-900 border-slate-700">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 gap-2">
            <CardTitle className="text-sm font-medium text-slate-300">Pending Sync</CardTitle>
            <div className="h-8 w-8 rounded-lg bg-amber-500/10 flex items-center justify-center">
              <Package className="h-4 w-4 text-amber-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-400">{pendingData}</div>
            <p className="text-xs text-slate-400">Agents with unsynced data</p>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-slate-900 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white">Agent Connectivity</CardTitle>
          <CardDescription className="text-slate-400">Real-time view of agent device status</CardDescription>
        </CardHeader>
        <CardContent>
          {syncStatus.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No agent sync data available yet
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Status</TableHead>
                    <TableHead>Agent</TableHead>
                    <TableHead>Organization</TableHead>
                    <TableHead>Device</TableHead>
                    <TableHead>Last Seen</TableHead>
                    <TableHead>Pending</TableHead>
                    <TableHead>Version</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {syncStatus.map((status) => (
                    <TableRow key={status.id} data-testid={`row-sync-${status.id}`}>
                      <TableCell>
                        {status.is_online ? (
                          <Badge variant="default" className="bg-green-500">
                            <Wifi className="h-3 w-3 mr-1" />
                            Online
                          </Badge>
                        ) : (
                          <Badge variant="secondary">
                            <WifiOff className="h-3 w-3 mr-1" />
                            Offline
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">{status.agent?.full_name || 'Unknown'}</div>
                        <div className="text-sm text-muted-foreground">{status.agent?.role}</div>
                      </TableCell>
                      <TableCell>{status.organization?.name || 'Unknown'}</TableCell>
                      <TableCell>
                        <code className="text-xs bg-muted px-1 py-0.5 rounded">
                          {status.device_id || 'web'}
                        </code>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3 text-muted-foreground" />
                          {getTimeSince(status.last_seen_at)}
                        </div>
                      </TableCell>
                      <TableCell>
                        {(status.pending_batches > 0 || status.pending_bags > 0) ? (
                          <Badge variant="destructive">
                            {status.pending_batches} batches, {status.pending_bags} bags
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground">All synced</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <code className="text-xs">{status.app_version || '-'}</code>
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
  );
}
