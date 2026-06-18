'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { runWhenIdle } from '@/lib/utils/idle';

type QueueCounts = {
  pending: number;
  syncing: number;
  synced: number;
  error: number;
  conflict: number;
};

export type SyncStats = QueueCounts & {
  batches: QueueCounts;
  farms: QueueCounts;
  boundaries: QueueCounts;
  uploads: QueueCounts;
  ocr: QueueCounts;
};

type SyncStatusContextValue = {
  isOnline: boolean;
  stats: SyncStats;
  pendingCount: number;
  hasPendingWork: boolean;
  refresh: () => Promise<void>;
};

const EMPTY_COUNTS: QueueCounts = {
  pending: 0,
  syncing: 0,
  synced: 0,
  error: 0,
  conflict: 0,
};

const EMPTY_STATS: SyncStats = {
  ...EMPTY_COUNTS,
  batches: EMPTY_COUNTS,
  farms: EMPTY_COUNTS,
  boundaries: EMPTY_COUNTS,
  uploads: EMPTY_COUNTS,
  ocr: EMPTY_COUNTS,
};

const SyncStatusContext = createContext<SyncStatusContextValue | null>(null);

export function SyncStatusProvider({ children }: { children: ReactNode }) {
  const [isOnline, setIsOnline] = useState(true);
  const [stats, setStats] = useState<SyncStats>(EMPTY_STATS);

  const refresh = useCallback(async () => {
    if (typeof window === 'undefined' || !('indexedDB' in window)) {
      setStats(EMPTY_STATS);
      return;
    }

    try {
      const { getSyncStats } = await import('@/lib/offline/sync-store');
      setStats(await getSyncStats());
    } catch {
      setStats(EMPTY_STATS);
    }
  }, []);

  useEffect(() => {
    const updateOnline = () => setIsOnline(navigator.onLine);
    updateOnline();

    const handleOnline = () => {
      updateOnline();
      void refresh();
    };
    const handleOffline = () => updateOnline();
    const handleVisibility = () => {
      if (!document.hidden) void refresh();
    };
    const handleSyncStats = (event: Event) => {
      const detail = (event as CustomEvent<SyncStats>).detail;
      if (detail) setStats(detail);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    window.addEventListener('origintrace:sync-stats', handleSyncStats);
    document.addEventListener('visibilitychange', handleVisibility);

    const cancelIdle = runWhenIdle(() => void refresh());
    const interval = window.setInterval(() => {
      if (!document.hidden) void refresh();
    }, 30_000);

    return () => {
      cancelIdle();
      window.clearInterval(interval);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('origintrace:sync-stats', handleSyncStats);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [refresh]);

  const value = useMemo<SyncStatusContextValue>(() => {
    const pendingCount = stats.pending + stats.error + stats.conflict;
    return {
      isOnline,
      stats,
      pendingCount,
      hasPendingWork: pendingCount > 0 || stats.syncing > 0,
      refresh,
    };
  }, [isOnline, refresh, stats]);

  return (
    <SyncStatusContext.Provider value={value}>
      {children}
    </SyncStatusContext.Provider>
  );
}

export function useSyncStatus() {
  const context = useContext(SyncStatusContext);
  if (!context) {
    throw new Error('useSyncStatus must be used within a SyncStatusProvider');
  }
  return context;
}
