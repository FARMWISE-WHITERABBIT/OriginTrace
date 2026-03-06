'use client';

import { useEffect } from 'react';
import { setupAutoSync } from '@/lib/offline/sync-service';

export function AutoSync() {
  useEffect(() => {
    const cleanup = setupAutoSync();
    return cleanup;
  }, []);

  return null;
}
