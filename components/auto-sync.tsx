'use client';

import { useEffect } from 'react';
import { useOrg } from '@/lib/contexts/org-context';
import { useSyncStatus } from '@/components/sync-status-provider';
import { runWhenIdle } from '@/lib/utils/idle';

export function AutoSync() {
  const { profile, isLoading } = useOrg();
  const { hasPendingWork } = useSyncStatus();

  useEffect(() => {
    if (isLoading || !profile) return;

    let cleanup: (() => void) | undefined;
    let cancelled = false;
    const cancelIdle = runWhenIdle(() => {
      import('@/lib/offline/sync-service')
        .then(({ setupAutoSync, syncFieldWorkQueue }) => {
          if (cancelled) return;
          cleanup = setupAutoSync(60_000, { immediate: false });
          if (hasPendingWork && navigator.onLine) {
            void syncFieldWorkQueue();
          }
        })
        .catch(() => undefined);
    });

    return () => {
      cancelled = true;
      cancelIdle();
      cleanup?.();
    };
  }, [hasPendingWork, isLoading, profile]);

  return null;
}
