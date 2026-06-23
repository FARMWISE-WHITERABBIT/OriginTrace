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
  ChevronDown,
  ChevronUp,
  Upload,
  FileText,
} from 'lucide-react';
import { StatusBadge } from '@/lib/status-badge';

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
  status: 'pending' | 'syncing' | 'synced' | 'error' | 'conflict';
  error_message?: string;
  created_at: string;
  synced_at?: string;
}

interface QueueStats {
  pending: number;
  syncing: number;
  synced: number;
  error: number;
  conflict?: number;
}

interface SyncStats {
  pending: number;
  syncing: number;
  synced: number;
  error: number;
  conflict?: number;
  batches?: QueueStats;
  farms?: QueueStats;
  boundaries?: QueueStats;
  uploads?: QueueStats;
  ocr?: QueueStats;
}

type QueueItemType = 'farm' | 'upload' | 'ocr' | 'boundary';

interface QueueItem {
  id: string;
  type: QueueItemType;
  label: string;
  detail: string;
  status: 'pending' | 'syncing' | 'synced' | 'error' | 'conflict';
  error_message?: string;
  created_at: string;
}

export default function SyncDashboardPage() {
  const { organization, profile, isLoading: orgLoading } = useOrg();
  const { toast } = useToast();
  const isOnline = useOnlineStatus();

  const [batches, setBatches] = useState<LocalBatch[]>([]);
  const [queueItems, setQueueItems] = useState<QueueItem[]>([]);
  const emptyQueue = { pending: 0, syncing: 0, synced: 0, error: 0, conflict: 0 };
  const [stats, setStats] = useState<SyncStats>({ pending: 0, syncing: 0, synced: 0, error: 0, conflict: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const [discardConfirmId, setDiscardConfirmId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [serverMetrics, setServerMetrics] = useState<{
    pendingConflicts: number;
    unsyncedBags: number;
    agentCount: number;
  } | null>(null);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const {
        getAllBatches,
        getAllOfflineFarms,
        getAllBoundaries,
        getAllUploads,
        getAllOcrJobs,
        getSyncStats,
      } = await import('@/lib/offline/sync-store');
      const [batchList, farmList, boundaryList, uploadList, ocrList, syncStats] = await Promise.all([
        getAllBatches(),
        getAllOfflineFarms(),
        getAllBoundaries(),
        getAllUploads(),
        getAllOcrJobs(),
        getSyncStats(),
      ]);
      const fieldItems: QueueItem[] = [
        ...farmList.map((farm: any) => ({
          id: farm.id,
          type: 'farm' as const,
          label: farm.farmer_name || 'Offline farmer',
          detail: [farm.community, farm.phone].filter(Boolean).join(' - ') || farm.local_id,
          status: farm.status,
          error_message: farm.error_message,
          created_at: farm.created_at,
        })),
        ...uploadList.map((upload: any) => ({
          id: upload.id,
          type: 'upload' as const,
          label: upload.file_name || upload.file_type || 'Queued file',
          detail: `${upload.file_type || 'file'} for ${upload.local_farm_id || upload.farm_id}`,
          status: upload.status,
          error_message: upload.error_message,
          created_at: upload.created_at,
        })),
        ...ocrList.map((job: any) => ({
          id: job.id,
          type: 'ocr' as const,
          label: 'Offline OCR job',
          detail: `Runs after ${job.local_farm_id || job.farm_id} syncs`,
          status: job.status,
          error_message: job.error_message,
          created_at: job.created_at,
        })),
        ...boundaryList.map((boundary: any) => ({
          id: boundary.id,
          type: 'boundary' as const,
          label: 'Farm boundary',
          detail: `${boundary.area_hectares ?? 0} ha for ${boundary.local_farm_id || boundary.farm_id}`,
          status: boundary.status,
          error_message: boundary.error_message,
          created_at: boundary.created_at,
        })),
      ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      setBatches(batchList as any);
      setQueueItems(fieldItems);
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

  useEffect(() => {
    let cleanup: (() => void) | undefined;
    let disposed = false;

    import('@/lib/offline/sync-service')
      .then(({ addSyncListener }) => {
        if (disposed) return;
        cleanup = addSyncListener(() => {
          void loadData();
        });
      })
      .catch(() => undefined);

    return () => {
      disposed = true;
      cleanup?.();
    };
  }, [loadData]);

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
        toast({ title: 'Sync Complete', description: `${result.synced} item(s) synced successfully.` });
      }
      if (result.failed > 0) {
        toast({ title: 'Some Syncs Failed', description: `${result.failed} item(s) failed to sync.`, variant: 'destructive' });
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

  const handleRetryQueueItem = async (item: QueueItem) => {
    if (!isOnline) {
      toast({ title: 'Offline', description: 'You need to be online to retry.', variant: 'destructive' });
      return;
    }

    try {
      const {
        updateFarmStatus,
        updateUploadStatus,
        updateOcrJobStatus,
        updateBoundaryStatus,
      } = await import('@/lib/offline/sync-store');

      if (item.type === 'farm') await updateFarmStatus(item.id, 'pending');
      if (item.type === 'upload') await updateUploadStatus(item.id, 'pending');
      if (item.type === 'ocr') await updateOcrJobStatus(item.id, 'pending');
      if (item.type === 'boundary') await updateBoundaryStatus(item.id, 'pending');
      await loadData();
      handleSyncAll();
    } catch {
      toast({ title: 'Error', description: 'Failed to retry item.', variant: 'destructive' });
    }
  };

  const handleClearSynced = async () => {
    setIsClearing(true);
    try {
      const { deleteSyncedQueueItems } = await import('@/lib/offline/sync-store');
      await deleteSyncedQueueItems();
      await loadData();
      toast({ title: 'Cleared', description: 'Synced offline items removed from local storage.' });
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to clear.', variant: 'destructive' });
    } finally {
      setIsClearing(false);
    }
  };

  const handleDiscardQueueItem = async (item: QueueItem) => {
    try {
      const {
        deleteFarm,
        deleteUpload,
        deleteOcrJob,
        deleteBoundary,
      } = await import('@/lib/offline/sync-store');

      if (item.type === 'farm') await deleteFarm(item.id);
      if (item.type === 'upload') await deleteUpload(item.id);
      if (item.type === 'ocr') await deleteOcrJob(item.id);
      if (item.type === 'boundary') await deleteBoundary(item.id);
      setDiscardConfirmId(null);
      await loadData();
      toast({ title: 'Discarded', description: 'Queued item removed from local storage.' });
    } catch {
      toast({ title: 'Error', description: 'Failed to discard item.', variant: 'destructive' });
    }
  };

  const handleDiscard = async (batchId: string) => {
    try {
      const { deleteBatch } = await import('@/lib/offline/sync-store');
      await deleteBatch(batchId);
      setDiscardConfirmId(null);
      await loadData();
      toast({ title: 'Discarded', description: 'Batch removed from local queue.' });
    } catch {
      toast({ title: 'Error', description: 'Failed to discard batch.', variant: 'destructive' });
    }
  };

  const getErrorGuidance = (errorMessage?: string): string => {
    if (!errorMessage) return 'An unknown error occurred. Try retrying when online.';
    const msg = errorMessage.toLowerCase();
    if (msg.includes('farm') && (msg.includes('not found') || msg.includes('does not exist')))
      return 'The farm record no longer exists on the server. Discard this batch.';
    if (msg.includes('duplicate') || msg.includes('already') || msg.includes('already_synced'))
      return 'This batch was already received by the server. Safe to discard.';
    if (msg.includes('validation') || msg.includes('invalid') || msg.includes('required'))
      return 'The batch data failed validation. Check the details below, then retry or discard.';
    if (msg.includes('network') || msg.includes('fetch') || msg.includes('timeout'))
      return 'Network error during sync. Retry when you have a stable connection.';
    if (msg.includes('permission') || msg.includes('unauthorized') || msg.includes('forbidden'))
      return 'You do not have permission to sync this batch. Contact your admin.';
    return 'Sync failed. Retry when online or discard if the data is no longer needed.';
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return <Clock className="h-4 w-4 text-amber-500" />;
      case 'syncing': return <Loader2 className="h-4 w-4 animate-spin text-blue-500" />;
      case 'synced': return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'conflict': return <AlertTriangle className="h-4 w-4 text-amber-500" />;
      case 'error': return <XCircle className="h-4 w-4 text-red-500" />;
      default: return <Clock className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getQueueIcon = (type: QueueItemType) => {
    switch (type) {
      case 'farm': return <Users className="h-4 w-4 text-emerald-600" />;
      case 'upload': return <Upload className="h-4 w-4 text-blue-600" />;
      case 'ocr': return <FileText className="h-4 w-4 text-violet-600" />;
      case 'boundary': return <MapPin className="h-4 w-4 text-amber-600" />;
    }
  };

  const getQueueTypeLabel = (type: QueueItemType) => {
    switch (type) {
      case 'farm': return 'Farmer';
      case 'upload': return 'File';
      case 'ocr': return 'OCR';
      case 'boundary': return 'Boundary';
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
      <div className="space-y-3">{Array.from({length:4}).map((_,i)=><div key={i} className="h-16 bg-muted animate-pulse rounded-xl"/>)}</div>
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
        {[
          { label: 'Pending', value: stats.pending, accent: 'card-accent-amber', color: 'text-amber-600', testId: 'text-stat-pending' },
          { label: 'Syncing', value: stats.syncing, accent: 'card-accent-blue', color: 'text-blue-600', testId: 'text-stat-syncing' },
          { label: 'Synced', value: stats.synced, accent: 'card-accent-emerald', color: 'text-green-600', testId: 'text-stat-synced' },
          { label: 'Failed', value: stats.error, accent: 'card-accent-red', color: 'text-red-600', testId: 'text-stat-error' },
        ].map(s => (
          <Card key={s.label} className={s.accent}>
            <CardContent className="pt-4 pb-3 text-center">
              <div className={`text-2xl font-bold font-mono ${s.color}`} data-testid={s.testId}>{s.value}</div>
              <div className="text-xs text-muted-foreground">{s.label}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[
          { label: 'Farmers', value: (stats.farms || emptyQueue).pending + (stats.farms || emptyQueue).error, testId: 'text-queue-farms' },
          { label: 'Files', value: (stats.uploads || emptyQueue).pending + (stats.uploads || emptyQueue).error, testId: 'text-queue-uploads' },
          { label: 'OCR', value: (stats.ocr || emptyQueue).pending + (stats.ocr || emptyQueue).error, testId: 'text-queue-ocr' },
          { label: 'Boundaries', value: (stats.boundaries || emptyQueue).pending + (stats.boundaries || emptyQueue).error, testId: 'text-queue-boundaries' },
          { label: 'Batches', value: (stats.batches || emptyQueue).pending + (stats.batches || emptyQueue).error, testId: 'text-queue-batches' },
        ].map(item => (
          <Card key={item.label}>
            <CardContent className="pt-3 pb-3 text-center">
              <div className="text-lg font-bold font-mono" data-testid={item.testId}>{item.value}</div>
              <div className="text-[11px] text-muted-foreground">{item.label}</div>
            </CardContent>
          </Card>
        ))}
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

      {!isLoading && queueItems.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Field Work Queue</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {queueItems.map((item) => {
              const confirmId = `${item.type}:${item.id}`;
              return (
                <div key={confirmId} className="rounded-md border p-3 space-y-3" data-testid={`queue-item-${confirmId}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 min-w-0">
                      {getQueueIcon(item.type)}
                      <div className="min-w-0 space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium text-sm truncate">{item.label}</span>
                          <Badge variant="secondary" className="text-xs">{getQueueTypeLabel(item.type)}</Badge>
                        </div>
                        <div className="text-xs text-muted-foreground break-all">{item.detail}</div>
                        <div className="text-xs text-muted-foreground">{formatTime(item.created_at)}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {getStatusIcon(item.status)}
                      <StatusBadge domain="sync" status={item.status} />
                    </div>
                  </div>

                  {item.status === 'error' && (
                    <div className="rounded-md bg-destructive/10 border border-destructive/20 p-3 space-y-1">
                      <div className="flex items-center gap-1.5 text-xs font-medium text-destructive">
                        <AlertTriangle className="h-3.5 w-3.5" />
                        Sync Error
                      </div>
                      {item.error_message && (
                        <p className="text-xs text-muted-foreground font-mono break-all">{item.error_message}</p>
                      )}
                      <p className="text-xs text-muted-foreground">{getErrorGuidance(item.error_message)}</p>
                    </div>
                  )}

                  {discardConfirmId === confirmId ? (
                    <div className="rounded-md bg-muted p-3 space-y-2">
                      <p className="text-xs font-medium">Discard this queued item? This cannot be undone.</p>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="destructive"
                          className="flex-1 h-7 text-xs"
                          onClick={() => handleDiscardQueueItem(item)}
                          data-testid={`button-discard-queue-confirm-${confirmId}`}
                        >
                          Yes, Discard
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="flex-1 h-7 text-xs"
                          onClick={() => setDiscardConfirmId(null)}
                          data-testid={`button-discard-queue-cancel-${confirmId}`}
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1 h-7 text-xs"
                        onClick={() => handleRetryQueueItem(item)}
                        disabled={!isOnline || item.status === 'syncing'}
                        data-testid={`button-retry-queue-${confirmId}`}
                      >
                        <RefreshCw className="h-3 w-3 mr-1" />
                        Retry
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1 h-7 text-xs text-destructive hover:text-destructive"
                        onClick={() => setDiscardConfirmId(confirmId)}
                        data-testid={`button-discard-queue-${confirmId}`}
                      >
                        <Trash2 className="h-3 w-3 mr-1" />
                        Discard
                      </Button>
                    </div>
                  )}
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : batches.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center space-y-2">
            <Package className="h-10 w-10 text-muted-foreground mx-auto" />
            <div className="font-medium">{stats.pending > 0 || stats.error > 0 ? 'Offline field work queued' : 'No offline data'}</div>
            <div className="text-sm text-muted-foreground">
              {stats.pending > 0 || stats.error > 0
                ? 'Queued farmers, files, OCR jobs, or boundaries are shown in the summary above.'
                : 'Batches collected offline will appear here.'}
            </div>
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
                        {batch.synced_at && (
                          <div className="text-xs text-green-600 dark:text-green-400">Synced {formatTime(batch.synced_at)}</div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <StatusBadge domain="sync" status={batch.status} />
                      {batch.status === 'error' && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setExpandedId(expandedId === batch.id ? null : batch.id)}
                          data-testid={`button-expand-${batch.id}`}
                        >
                          {expandedId === batch.id
                            ? <ChevronUp className="h-4 w-4" />
                            : <ChevronDown className="h-4 w-4" />}
                        </Button>
                      )}
                    </div>
                  </div>

                  {batch.status === 'error' && expandedId === batch.id && (
                    <div className="mt-3 pt-3 border-t space-y-3">
                      <div className="rounded-md bg-destructive/10 border border-destructive/20 p-3 space-y-1">
                        <div className="flex items-center gap-1.5 text-xs font-medium text-destructive">
                          <AlertTriangle className="h-3.5 w-3.5" />
                          Sync Error
                        </div>
                        {batch.error_message && (
                          <p className="text-xs text-muted-foreground font-mono break-all" data-testid={`text-batch-error-${batch.id}`}>
                            {batch.error_message}
                          </p>
                        )}
                        <p className="text-xs text-muted-foreground">{getErrorGuidance(batch.error_message)}</p>
                      </div>

                      {(batch.contributors && batch.contributors.length > 0) && (
                        <div className="space-y-1">
                          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Contributors</p>
                          {batch.contributors.map((c, i) => (
                            <div key={i} className="flex justify-between text-xs text-muted-foreground">
                              <span>{c.farmer_name}</span>
                              <span>{c.bag_count} bags · {c.weight_kg} kg</span>
                            </div>
                          ))}
                        </div>
                      )}

                      {discardConfirmId === batch.id ? (
                        <div className="rounded-md bg-muted p-3 space-y-2">
                          <p className="text-xs font-medium">Discard this batch? This cannot be undone.</p>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="destructive"
                              className="flex-1 h-7 text-xs"
                              onClick={() => handleDiscard(batch.id)}
                              data-testid={`button-discard-confirm-${batch.id}`}
                            >
                              Yes, Discard
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="flex-1 h-7 text-xs"
                              onClick={() => setDiscardConfirmId(null)}
                              data-testid={`button-discard-cancel-${batch.id}`}
                            >
                              Cancel
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            className="flex-1 h-7 text-xs"
                            onClick={() => handleRetry(batch.id)}
                            disabled={!isOnline}
                            data-testid={`button-retry-${batch.id}`}
                          >
                            <RefreshCw className="h-3 w-3 mr-1" />
                            Retry
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="flex-1 h-7 text-xs text-destructive hover:text-destructive"
                            onClick={() => setDiscardConfirmId(batch.id)}
                            data-testid={`button-discard-${batch.id}`}
                          >
                            <Trash2 className="h-3 w-3 mr-1" />
                            Discard
                          </Button>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
