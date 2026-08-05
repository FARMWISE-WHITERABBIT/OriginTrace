'use client';

import { useState, useEffect, useCallback } from 'react';
import { Badge } from '@/components/ui/badge';
import { Wifi, WifiOff } from 'lucide-react';

interface OnlineStatusProps {
  showLabel?: boolean;
  className?: string;
}

async function probeConnectivity(): Promise<boolean> {
  try {
    const res = await fetch('/api/ping', {
      method: 'HEAD',
      cache: 'no-store',
      signal: AbortSignal.timeout(4000),
    });
    return res.ok;
  } catch {
    return false;
  }
}

function useOnlineStatusInternal() {
  const [isOnline, setIsOnline] = useState(true);

  const check = useCallback(async () => {
    if (!navigator.onLine) {
      setIsOnline(false);
      return;
    }
    const reachable = await probeConnectivity();
    setIsOnline(reachable);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    check();

    const handleOnline = () => check();
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    const interval = setInterval(check, 30_000);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(interval);
    };
  }, [check]);

  return isOnline;
}

export function OnlineStatus({ showLabel = true, className = '' }: OnlineStatusProps) {
  const isOnline = useOnlineStatusInternal();

  return (
    <Badge
      variant={isOnline ? 'default' : 'secondary'}
      className={`gap-1 ${className}`}
      data-testid="badge-online-status"
    >
      {isOnline ? (
        <>
          <Wifi className="h-3 w-3" />
          {showLabel && <span>Online</span>}
        </>
      ) : (
        <>
          <WifiOff className="h-3 w-3" />
          {showLabel && <span>Offline</span>}
        </>
      )}
    </Badge>
  );
}

export function useOnlineStatus() {
  return useOnlineStatusInternal();
}
