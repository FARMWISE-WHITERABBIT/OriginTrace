'use client';

import { useEffect, useRef } from 'react';
import { useOrg } from '@/lib/contexts/org-context';
import { useSyncStatus } from '@/components/sync-status-provider';
import { runWhenIdle } from '@/lib/utils/idle';

export function AutoSync() {
  const { organization, profile, isLoading } = useOrg();
  const { hasPendingWork } = useSyncStatus();
  const organizationId = organization?.id ?? null;
  const activeOrganizationIdRef = useRef<number | null>(organizationId);
  activeOrganizationIdRef.current = organizationId;

  useEffect(() => {
    if (isLoading || !profile || organizationId === null) return;

    const requestedOrganizationId = organizationId;
    const isOrganizationActive = () => activeOrganizationIdRef.current === requestedOrganizationId;

    let cleanup: (() => void) | undefined;
    let cancelled = false;
    const cancelIdle = runWhenIdle(() => {
      import('@/lib/offline/sync-service')
        .then(({ setupAutoSync, syncFieldWorkQueue }) => {
          if (cancelled) return;
          cleanup = setupAutoSync(requestedOrganizationId, isOrganizationActive, 60_000, { immediate: false });
          if (hasPendingWork && navigator.onLine) {
            void syncFieldWorkQueue(requestedOrganizationId, isOrganizationActive);
          }
        })
        .catch(() => undefined);
    });

    return () => {
      cancelled = true;
      cancelIdle();
      cleanup?.();
    };
  }, [hasPendingWork, isLoading, organizationId, profile]);

  return null;
}
