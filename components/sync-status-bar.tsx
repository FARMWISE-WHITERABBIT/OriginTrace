'use client';

import { useEffect, useRef, useState } from 'react';
import { RefreshCw, AlertCircle, CheckCircle, Loader2, Package, MapPin } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useOrg } from '@/lib/contexts/org-context';

interface SyncStats {
  pending: number;
  syncing: number;
  synced: number;
  error: number;
  conflict?: number;
}

interface SyncStatusBarProps {
  onSync?: () => void;
}

export function SyncStatusBar({ onSync }: SyncStatusBarProps) {
  const { organization } = useOrg();
  const organizationId = organization?.id ?? null;
  const activeOrganizationIdRef = useRef<number | null>(organizationId);
  activeOrganizationIdRef.current = organizationId;
  const [isOnline, setIsOnline] = useState(true);
  const [scopedData, setScopedData] = useState<{
    orgId: number | null;
    syncStats: SyncStats;
    cachedFarmCount: number;
  }>({ orgId: null, syncStats: { pending: 0, syncing: 0, synced: 0, error: 0 }, cachedFarmCount: 0 });
  const syncStats = organizationId !== null && scopedData.orgId === organizationId
    ? scopedData.syncStats
    : { pending: 0, syncing: 0, synced: 0, error: 0 };
  const cachedFarmCount = organizationId !== null && scopedData.orgId === organizationId
    ? scopedData.cachedFarmCount
    : 0;
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
    const requestedOrganizationId = organizationId;
    const loadStats = async () => {
      if (requestedOrganizationId === null) {
        setScopedData({ orgId: null, syncStats: { pending: 0, syncing: 0, synced: 0, error: 0 }, cachedFarmCount: 0 });
        return;
      }
      let nextStats: SyncStats = { pending: 0, syncing: 0, synced: 0, error: 0 };
      let nextCachedFarmCount = 0;
      try {
        const { getSyncStats } = await import('@/lib/offline/sync-store');
        nextStats = await getSyncStats(requestedOrganizationId);
      } catch (error) {
        console.error('Failed to load sync stats:', error);
      }

      try {
        const { getCachedFarms } = await import('@/lib/offline/sync-store');
        const farms = await getCachedFarms(requestedOrganizationId);
        nextCachedFarmCount = farms.length;
      } catch {
        nextCachedFarmCount = 0;
      }

      if (activeOrganizationIdRef.current === requestedOrganizationId) {
        setScopedData({
          orgId: requestedOrganizationId,
          syncStats: nextStats,
          cachedFarmCount: nextCachedFarmCount,
        });
      }
    };

    void loadStats();
    const interval = setInterval(loadStats, 5000);
    return () => clearInterval(interval);
  }, [organizationId]);

  const handleSync = async () => {
    const requestedOrganizationId = organizationId;
    if (!isOnline || isSyncing || requestedOrganizationId === null) return;
    const isOrganizationActive = () => activeOrganizationIdRef.current === requestedOrganizationId;

    setIsSyncing(true);
    try {
      const { syncFieldWorkQueue } = await import('@/lib/offline/sync-service');
      await syncFieldWorkQueue(requestedOrganizationId, isOrganizationActive);
      if (!isOrganizationActive()) return;

      const { getSyncStats } = await import('@/lib/offline/sync-store');
      const stats = await getSyncStats(requestedOrganizationId);
      if (!isOrganizationActive()) return;
      setScopedData((current) => ({
        orgId: requestedOrganizationId,
        syncStats: stats,
        cachedFarmCount: current.orgId === requestedOrganizationId ? current.cachedFarmCount : 0,
      }));

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
          {totalPending} {totalPending === 1 ? 'Item' : 'Items'} Pending
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
