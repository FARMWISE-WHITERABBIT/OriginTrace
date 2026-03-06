'use client';

import { useEffect, useState } from 'react';
import { RefreshCw, AlertCircle, CheckCircle, Loader2, Package, MapPin } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

interface SyncStats {
  pending: number;
  syncing: number;
  synced: number;
  error: number;
}

interface SyncStatusBarProps {
  onSync?: () => void;
}

export function SyncStatusBar({ onSync }: SyncStatusBarProps) {
  const [isOnline, setIsOnline] = useState(true);
  const [syncStats, setSyncStats] = useState<SyncStats>({ pending: 0, syncing: 0, synced: 0, error: 0 });
  const [cachedFarmCount, setCachedFarmCount] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setIsOnline(navigator.onLine);

      const handleOnline = () => setIsOnline(true);
      const handleOffline = () => setIsOnline(false);

      window.addEventListener('online', handleOnline);
      window.addEventListener('offline', handleOffline);

      return () => {
        window.removeEventListener('online', handleOnline);
        window.removeEventListener('offline', handleOffline);
      };
    }
  }, []);

  useEffect(() => {
    const loadStats = async () => {
      try {
        const { getSyncStats } = await import('@/lib/offline/sync-store');
        const stats = await getSyncStats();
        setSyncStats(stats);
      } catch (error) {
        console.error('Failed to load sync stats:', error);
      }

      try {
        const { getCachedFarms } = await import('@/lib/offline/sync-store');
        const farms = await getCachedFarms();
        setCachedFarmCount(farms.length);
      } catch {
        setCachedFarmCount(0);
      }
    };

    loadStats();
    const interval = setInterval(loadStats, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleSync = async () => {
    if (!isOnline || isSyncing) return;

    setIsSyncing(true);
    try {
      const { syncPendingBatches } = await import('@/lib/offline/sync-service');
      await syncPendingBatches();

      const { getSyncStats } = await import('@/lib/offline/sync-store');
      const stats = await getSyncStats();
      setSyncStats(stats);

      onSync?.();
    } catch (error) {
      console.error('Sync failed:', error);
    } finally {
      setIsSyncing(false);
    }
  };

  const totalPending = syncStats.pending + syncStats.error;

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {totalPending > 0 && (
        <Badge variant="secondary" className="gap-1" data-testid="badge-pending-count">
          <Package className="h-3 w-3 text-orange-500" />
          {totalPending} {totalPending === 1 ? 'Batch' : 'Batches'} Pending
        </Badge>
      )}

      {cachedFarmCount > 0 && (
        <Badge variant="outline" className="gap-1" data-testid="badge-cached-farms">
          <MapPin className="h-3 w-3 text-muted-foreground" />
          {cachedFarmCount} Farms Cached
        </Badge>
      )}

      {syncStats.syncing > 0 && (
        <Badge variant="secondary" className="gap-1">
          <Loader2 className="h-3 w-3 animate-spin" />
          Syncing {syncStats.syncing}
        </Badge>
      )}

      {totalPending === 0 && syncStats.syncing === 0 && (
        <Badge variant="outline" className="gap-1 text-green-600" data-testid="badge-all-synced">
          <CheckCircle className="h-3 w-3" />
          All synced
        </Badge>
      )}

      {syncStats.error > 0 && (
        <Badge variant="destructive" className="gap-1" data-testid="badge-error-count">
          <AlertCircle className="h-3 w-3" />
          {syncStats.error} failed
        </Badge>
      )}

      {totalPending > 0 && isOnline && (
        <Button
          variant="ghost"
          size="sm"
          onClick={handleSync}
          disabled={isSyncing}
          className="h-7 px-2"
          data-testid="button-sync"
        >
          {isSyncing ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4" />
          )}
          <span className="ml-1 text-xs">Sync</span>
        </Button>
      )}
    </div>
  );
}
