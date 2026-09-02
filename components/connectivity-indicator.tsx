'use client';

import { Wifi, WifiOff, RefreshCw } from 'lucide-react';
import { useSyncStatus } from '@/components/sync-status-provider';

type ConnectionStatus = 'online' | 'syncing' | 'offline';

export function ConnectivityIndicator() {
  const { isOnline, pendingCount, stats } = useSyncStatus();
  const status: ConnectionStatus = !isOnline
    ? 'offline'
    : pendingCount > 0 || stats.syncing > 0
      ? 'syncing'
      : 'online';

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
      label: `Syncing - ${pendingCount || stats.syncing} item${(pendingCount || stats.syncing) !== 1 ? 's' : ''} pending`
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
