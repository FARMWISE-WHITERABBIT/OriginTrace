'use client';

import { useEffect, useRef } from 'react';
import { useOnlineStatus } from '@/components/online-status';
import { useOrg } from '@/lib/contexts/org-context';
import {
  warmCaches,
  isLocationsCacheValid,
  isCommoditiesCacheValid,
  isFarmsCacheValid,
  purgeExpiredCaches,
} from '@/lib/offline/offline-cache';

export function CacheWarmer() {
  const isOnline = useOnlineStatus();
  const { organization } = useOrg();
  const warmedRefDataRef = useRef(false);
  const warmedFarmsOrgRef = useRef<number | null>(null);

  useEffect(() => {
    // Purge stale cached entries on every app init (client-side only)
    if (typeof window !== 'undefined' && 'indexedDB' in window) {
      purgeExpiredCaches();
    }
  }, []);

  useEffect(() => {
    if (!isOnline) return;

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

    const timer = setTimeout(doWarm, 2000);
    return () => clearTimeout(timer);
  }, [isOnline, organization]);

  return null;
}
