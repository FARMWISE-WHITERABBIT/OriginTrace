'use client';

import { useEffect, useState } from 'react';
import { Wifi, WifiOff, RefreshCw } from 'lucide-react';

type ConnectionStatus = 'online' | 'syncing' | 'offline';

export function ConnectivityIndicator() {
  const [status, setStatus] = useState<ConnectionStatus>('online');
  const [pendingSync, setPendingSync] = useState(0);

  useEffect(() => {
    const updateStatus = async () => {
      if (!navigator.onLine) {
        setStatus('offline');
        return;
      }
      
      try {
        const { getSyncStats } = await import('@/lib/offline/sync-store');
        const stats = await getSyncStats();
        const pendingCount = stats.pending + stats.syncing;
        if (pendingCount > 0) {
          setStatus('syncing');
          setPendingSync(pendingCount);
          return;
        }
      } catch {}
      
      setStatus('online');
      setPendingSync(0);
    };

    updateStatus();
    
    window.addEventListener('online', updateStatus);
    window.addEventListener('offline', updateStatus);
    
    const interval = setInterval(updateStatus, 5000);

    return () => {
      window.removeEventListener('online', updateStatus);
      window.removeEventListener('offline', updateStatus);
      clearInterval(interval);
    };
  }, []);

  const statusConfig = {
    online: {
      color: 'bg-green-500',
      pulseColor: 'bg-green-400',
      icon: Wifi,
      label: 'Connected - All data synced'
    },
    syncing: {
      color: 'bg-orange-500',
      pulseColor: 'bg-orange-400',
      icon: RefreshCw,
      label: `Syncing - ${pendingSync} item${pendingSync !== 1 ? 's' : ''} pending`
    },
    offline: {
      color: 'bg-red-500',
      pulseColor: 'bg-red-400',
      icon: WifiOff,
      label: 'Offline - Working offline'
    }
  };

  const config = statusConfig[status];
  const Icon = config.icon;

  return (
    <div 
      className="relative flex items-center gap-2 cursor-default"
      title={config.label}
      data-testid="connectivity-indicator"
    >
      <div className="relative">
        <div className={`h-2.5 w-2.5 rounded-full ${config.color}`} />
        <div 
          className={`absolute inset-0 h-2.5 w-2.5 rounded-full ${config.pulseColor} animate-ping opacity-75`}
          style={{ animationDuration: status === 'syncing' ? '1s' : '2s' }}
        />
      </div>
      <Icon className={`h-4 w-4 ${status === 'syncing' ? 'animate-spin' : ''} text-muted-foreground`} />
    </div>
  );
}
