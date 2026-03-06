'use client';

import { useEffect, useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useOrg } from '@/lib/contexts/org-context';
import { useToast } from '@/hooks/use-toast';
import { useOnlineStatus } from '@/components/online-status';
import {
  RefreshCw,
  Loader2,
  CheckCircle,
  Clock,
  Package,
  Trash2,
  Wifi,
  WifiOff,
  ArrowUpCircle,
  XCircle,
  AlertTriangle,
  Layers,
  Users,
  MapPin,
  Wheat,
  Scale,
} from 'lucide-react';

interface LocalBatch {
  id: string;
  local_id: string;
  batch_id?: string;
  farm_id?: string;
  farm_name?: string;
  commodity?: string;
  state?: string;
  lga?: string;
  community?: string;
  gps_lat?: number;
  gps_lng?: number;
  contributors?: { farm_id: string; farmer_name: string; community?: string; bag_count: number; weight_kg: number }[];
  bags: any[];
  notes?: string;
  collected_at: string;
  status: 'pending' | 'syncing' | 'synced' | 'error';
  error_message?: string;
  created_at: string;
  synced_at?: string;
}

interface SyncStats {
  pending: number;
  syncing: number;
  synced: number;
  error: number;
}

export default function SyncDashboardPage() {
  const { organization, profile, isLoading: orgLoading } = useOrg();
  const { toast } = useToast();
  const isOnline = useOnlineStatus();

  const [batches, setBatches] = useState<LocalBatch[]>([]);
  const [stats, setStats] = useState<SyncStats>({ pending: 0, syncing: 0, synced: 0, error: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const [serverMetrics, setServerMetrics] = useState<{
    pendingConflicts: number;
    unsyncedBags: number;
    agentCount: number;
  } | null>(null);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const { getAllBatches, getSyncStats } = await import('@/lib/offline/sync-store');
      const [batchList, syncStats] = await Promise.all([getAllBatches(), getSyncStats()]);
      setBatches(batchList as any);
      setStats(syncStats);
    } catch (error) {
      console.error('Failed to load sync data:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const loadServerMetrics = useCallback(async () => {
    try {
      const response = await fetch('/api/sync-metrics');
      if (response.ok) {
        const data = await response.json();
        setServerMetrics(data);
      }
    } catch (error) {
      console.error('Failed to load server metrics:', error);
    }
  }, []);

  useEffect(() => {
    if (!orgLoading) {
      loadData();
      if (isOnline) loadServerMetrics();
    }
  }, [orgLoading, loadData, isOnline, loadServerMetrics]);

  const handleSyncAll = async () => {
    if (!isOnline) {
      toast({ title: 'Offline', description: 'You need to be online to sync.', variant: 'destructive' });
      return;
    }

    setIsSyncing(true);
    try {
      const { syncPendingBatches } = await import('@/lib/offline/sync-service');
      const result = await syncPendingBatches();
      if (result.synced > 0) {
        toast({ title: 'Sync Complete', description: `${result.synced} batch(es) synced successfully.` });
      }
      if (result.failed > 0) {
        toast({ title: 'Some Syncs Failed', description: `${result.failed} batch(es) failed to sync.`, variant: 'destructive' });
      }
      if (result.synced === 0 && result.failed === 0) {
        toast({ title: 'Nothing to Sync', description: 'All data is up to date.' });
      }
      await loadData();
    } catch (error) {
      console.error('Sync error:', error);
      toast({ title: 'Sync Error', description: 'Failed to sync. Please try again.', variant: 'destructive' });
    } finally {
      setIsSyncing(false);
    }
  };

  const handleRetry = async (batchId: string) => {
    if (!isOnline) {
      toast({ title: 'Offline', description: 'You need to be online to retry.', variant: 'destructive' });
      return;
    }

    try {
      const { updateBatchStatus } = await import('@/lib/offline/sync-store');
      await updateBatchStatus(batchId, 'pending');
      await loadData();
      handleSyncAll();
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to retry.', variant: 'destructive' });
    }
  };

  const handleClearSynced = async () => {
    setIsClearing(true);
    try {
      const { deleteSyncedBatches } = await import('@/lib/offline/sync-store');
      await deleteSyncedBatches();
      await loadData();
      toast({ title: 'Cleared', description: 'Synced batches removed from local storage.' });
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to clear.', variant: 'destructive' });
    } finally {
      setIsClearing(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return <Clock className="h-4 w-4 text-amber-500" />;
      case 'syncing': return <Loader2 className="h-4 w-4 animate-spin text-blue-500" />;
      case 'synced': return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'error': return <XCircle className="h-4 w-4 text-red-500" />;
      default: return <Clock className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending': return <Badge variant="outline" className="text-amber-600 border-amber-300">Pending</Badge>;
      case 'syncing': return <Badge variant="outline" className="text-blue-600 border-blue-300">Syncing</Badge>;
      case 'synced': return <Badge variant="outline" className="text-green-600 border-green-300">Synced</Badge>;
      case 'error': return <Badge variant="outline" className="text-red-600 border-red-300">Failed</Badge>;
      default: return <Badge variant="outline">Unknown</Badge>;
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return date.toLocaleDateString();
  };

  if (orgLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div>
          <h1 className="text-xl font-bold" data-testid="text-page-title">Sync Control Tower</h1>
          <p className="text-sm text-muted-foreground">Operational overview and offline data management</p>
        </div>
        <div className="flex items-center gap-2">
          {isOnline ? (
            <Badge variant="outline" className="text-green-600 border-green-300">
              <Wifi className="h-3 w-3 mr-1" />Online
            </Badge>
          ) : (
            <Badge variant="outline" className="text-red-600 border-red-300">
              <WifiOff className="h-3 w-3 mr-1" />Offline
            </Badge>
          )}
        </div>
      </div>

      {serverMetrics && (profile?.role === 'admin' || profile?.role === 'aggregator') && (
        <div className="grid grid-cols-3 gap-3">
          <Card>
            <CardContent className="pt-4 pb-3 text-center">
              <div className="flex items-center justify-center gap-1.5 mb-1">
                <Layers className="h-4 w-4 text-amber-500" />
              </div>
              <div className="text-2xl font-bold text-amber-600 font-mono" data-testid="text-metric-conflicts">
                {serverMetrics.pendingConflicts}
              </div>
              <div className="text-xs text-muted-foreground">Pending Conflicts</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-3 text-center">
              <div className="flex items-center justify-center gap-1.5 mb-1">
                <Package className="h-4 w-4 text-blue-500" />
              </div>
              <div className="text-2xl font-bold text-blue-600 font-mono" data-testid="text-metric-bags">
                {serverMetrics.unsyncedBags}
              </div>
              <div className="text-xs text-muted-foreground">Unused Bags</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-3 text-center">
              <div className="flex items-center justify-center gap-1.5 mb-1">
                <Users className="h-4 w-4 text-green-500" />
              </div>
              <div className="text-2xl font-bold text-green-600 font-mono" data-testid="text-metric-agents">
                {serverMetrics.agentCount}
              </div>
              <div className="text-xs text-muted-foreground">Field Agents</div>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="grid grid-cols-4 gap-3">
        <Card>
          <CardContent className="pt-4 pb-3 text-center">
            <div className="text-2xl font-bold text-amber-600 font-mono" data-testid="text-stat-pending">{stats.pending}</div>
            <div className="text-xs text-muted-foreground">Pending</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 text-center">
            <div className="text-2xl font-bold text-blue-600 font-mono" data-testid="text-stat-syncing">{stats.syncing}</div>
            <div className="text-xs text-muted-foreground">Syncing</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 text-center">
            <div className="text-2xl font-bold text-green-600 font-mono" data-testid="text-stat-synced">{stats.synced}</div>
            <div className="text-xs text-muted-foreground">Synced</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 text-center">
            <div className="text-2xl font-bold text-red-600 font-mono" data-testid="text-stat-error">{stats.error}</div>
            <div className="text-xs text-muted-foreground">Failed</div>
          </CardContent>
        </Card>
      </div>

      <div className="flex gap-3">
        <Button
          onClick={handleSyncAll}
          disabled={isSyncing || !isOnline || stats.pending === 0}
          className="flex-1"
          data-testid="button-sync-all"
        >
          {isSyncing ? (
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
          ) : (
            <ArrowUpCircle className="h-4 w-4 mr-2" />
          )}
          Sync All ({stats.pending})
        </Button>
        {stats.synced > 0 && (
          <Button
            variant="outline"
            onClick={handleClearSynced}
            disabled={isClearing}
            data-testid="button-clear-synced"
          >
            {isClearing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
          </Button>
        )}
        <Button
          variant="outline"
          onClick={loadData}
          disabled={isLoading}
          data-testid="button-refresh"
        >
          <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : batches.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center space-y-2">
            <Package className="h-10 w-10 text-muted-foreground mx-auto" />
            <div className="font-medium">No offline data</div>
            <div className="text-sm text-muted-foreground">Batches collected offline will appear here.</div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {batches.map((batch) => {
            const totalWeight = batch.bags?.reduce((sum: number, b: any) => sum + (b.weight || 0), 0) || 0;
            const contributorCount = batch.contributors?.length || 0;
            const locationParts = [batch.community, batch.lga, batch.state].filter(Boolean);
            const locationStr = locationParts.join(', ');

            return (
              <Card key={batch.id} data-testid={`card-batch-${batch.id}`}>
                <CardContent className="py-3 px-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 min-w-0">
                      {getStatusIcon(batch.status)}
                      <div className="min-w-0 space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium text-sm truncate" data-testid={`text-batch-farm-${batch.id}`}>
                            {batch.farm_name || 'Unknown Farm'}
                          </span>
                          {batch.commodity && (
                            <Badge variant="secondary" data-testid={`badge-commodity-${batch.id}`}>
                              <Wheat className="h-3 w-3 mr-1" />
                              {batch.commodity}
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                          <span data-testid={`text-batch-bags-${batch.id}`}>
                            <Package className="h-3 w-3 inline mr-0.5" />
                            {batch.bags?.length || 0} bags
                          </span>
                          {totalWeight > 0 && (
                            <span data-testid={`text-batch-weight-${batch.id}`}>
                              <Scale className="h-3 w-3 inline mr-0.5" />
                              {totalWeight.toFixed(1)} kg
                            </span>
                          )}
                          {contributorCount > 1 && (
                            <span data-testid={`text-batch-contributors-${batch.id}`}>
                              <Users className="h-3 w-3 inline mr-0.5" />
                              {contributorCount} farmers
                            </span>
                          )}
                          <span>{formatTime(batch.created_at)}</span>
                        </div>
                        {locationStr && (
                          <div className="text-xs text-muted-foreground" data-testid={`text-batch-location-${batch.id}`}>
                            <MapPin className="h-3 w-3 inline mr-0.5" />
                            {locationStr}
                          </div>
                        )}
                        {batch.batch_id && (
                          <div className="text-xs text-muted-foreground font-mono" data-testid={`text-batch-id-${batch.id}`}>
                            {batch.batch_id}
                          </div>
                        )}
                        {batch.error_message && (
                          <div className="text-xs text-destructive mt-1" data-testid={`text-batch-error-${batch.id}`}>{batch.error_message}</div>
                        )}
                        {batch.synced_at && (
                          <div className="text-xs text-green-600 dark:text-green-400">Synced {formatTime(batch.synced_at)}</div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {getStatusBadge(batch.status)}
                      {batch.status === 'error' && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleRetry(batch.id)}
                          disabled={!isOnline}
                          data-testid={`button-retry-${batch.id}`}
                        >
                          <RefreshCw className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
