'use client';

import { WifiOff, CloudOff } from 'lucide-react';

interface OfflineSectionBadgeProps {
  isOnline: boolean;
  className?: string;
}

/**
 * Small badge shown next to section headers in the Collect flow when offline.
 * Reassures field agents that their data will be saved and synced later.
 */
export function OfflineSectionBadge({ isOnline, className = '' }: OfflineSectionBadgeProps) {
  if (isOnline) return null;
  return (
    <span
      className={`inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300 border border-amber-200 dark:border-amber-800 ${className}`}
      title="You're offline. This section will be saved locally and synced when you reconnect."
    >
      <WifiOff className="h-2.5 w-2.5" />
      Offline — saves locally
    </span>
  );
}

/**
 * Full banner for the top of a collect step when offline.
 */
export function OfflineStepBanner({ isOnline }: { isOnline: boolean }) {
  if (isOnline) return null;
  return (
    <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300 text-xs">
      <CloudOff className="h-3.5 w-3.5 shrink-0" />
      <span>You're offline. All data entered here will be saved locally and synced automatically when you reconnect.</span>
    </div>
  );
}
