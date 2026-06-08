'use client';

import { useEffect, useRef } from 'react';
import { useOrg } from '@/lib/contexts/org-context';
import { useSyncStatus } from '@/components/sync-status-provider';
import { runWhenIdle } from '@/lib/utils/idle';
import {
  warmCaches,
  isLocationsCacheValid,
  isCommoditiesCacheValid,
  isFarmsCacheValid,
  purgeExpiredCaches,
} from '@/lib/offline/offline-cache';

export function CacheWarmer() {
  const { isOnline } = useSyncStatus();
  const { organization, profile, isLoading } = useOrg();
  const warmedRefDataRef = useRef(false);
  const warmedFarmsOrgRef = useRef<number | null>(null);

  useEffect(() => {
    // Purge stale cached entries after first paint; this is not needed for initial UI.
    if (typeof window !== 'undefined' && 'indexedDB' in window) {
      return runWhenIdle(() => {
        purgeExpiredCaches();
        import('@/lib/offline/sync-store')
          .then(({ purgeExpiredOfflineData }) => purgeExpiredOfflineData())
          .catch(() => undefined);
      });
    }
  }, []);

  useEffect(() => {
    if (!isOnline || isLoading || !profile) return;

    async function doWarm() {
      const orgId = organization?.id;

      if (!warmedRefDataRef.current) {
        const locValid = await isLocationsCacheValid();
        const comValid = await isCommoditiesCacheValid();

        if (!locValid || !comValid) {
          await warmCaches(undefined);
        }
        warmedRefDataRef.current = true;
      }

      if (orgId && warmedFarmsOrgRef.current !== orgId) {
        const farmsValid = await isFarmsCacheValid(orgId);
        if (!farmsValid) {
          await warmCaches(orgId);
        }
        warmedFarmsOrgRef.current = orgId;
      }
    }

    return runWhenIdle(() => void doWarm());
  }, [isLoading, isOnline, organization, profile]);

  return null;
}
