'use client';

import { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Wifi, WifiOff } from 'lucide-react';

interface OnlineStatusProps {
  showLabel?: boolean;
  className?: string;
}

export function OnlineStatus({ showLabel = true, className = '' }: OnlineStatusProps) {
  const [isOnline, setIsOnline] = useState(true);

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
  const [isOnline, setIsOnline] = useState(true);

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

  return isOnline;
}
