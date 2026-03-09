import { 
  getPendingBatches, 
  updateBatchStatus, 
  getSyncStats,
  PendingBatch 
} from './sync-store';

let isSyncing = false;
let syncListeners: ((stats: ReturnType<typeof getSyncStats> extends Promise<infer T> ? T : never) => void)[] = [];

export function addSyncListener(listener: (stats: any) => void) {
  syncListeners.push(listener);
  return () => {
    syncListeners = syncListeners.filter(l => l !== listener);
  };
}

async function notifyListeners() {
  const stats = await getSyncStats();
  syncListeners.forEach(listener => listener(stats));
}

export async function syncPendingBatches(): Promise<{
  synced: number;
  failed: number;
  errors: string[];
  warnings: Array<{ type: string; message: string; details?: any }>;
}> {
  if (isSyncing) {
    return { synced: 0, failed: 0, errors: ['Sync already in progress'], warnings: [] };
  }
  
  if (!navigator.onLine) {
    return { synced: 0, failed: 0, errors: ['Device is offline'], warnings: [] };
  }
  
  isSyncing = true;
  let synced = 0;
  let failed = 0;
  const errors: string[] = [];
  let warnings: Array<{ type: string; message: string; details?: any }> = [];
  
  try {
    const pendingBatches = await getPendingBatches();
    
    if (pendingBatches.length === 0) {
      return { synced: 0, failed: 0, errors: [], warnings: [] };
    }
    
    for (const batch of pendingBatches) {
      await updateBatchStatus(batch.id, 'syncing');
    }
    await notifyListeners();
    
    try {
      const response = await fetch('/api/sync', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          batches: pendingBatches.map(b => ({
            local_id: b.local_id,
            batch_id: b.batch_id,
            farm_id: b.farm_id,
            commodity: b.commodity,
            state: b.state,
            lga: b.lga,
            community: b.community,
            gps_lat: b.gps_lat,
            gps_lng: b.gps_lng,
            contributors: b.contributors || [],
            bags: b.bags,
            notes: b.notes,
            collected_at: b.collected_at,
          })),
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Sync failed');
      }
      
      const result = await response.json();
      
      if (result.warnings && Array.isArray(result.warnings)) {
        warnings = result.warnings;
      }
      
      for (const syncResult of result.results) {
        const batch = pendingBatches.find(b => b.local_id === syncResult.local_id);
        if (batch) {
          if (syncResult.status === 'synced' || syncResult.status === 'already_synced') {
            await updateBatchStatus(batch.id, 'synced');
            synced++;
          } else if (syncResult.status === 'error') {
            await updateBatchStatus(batch.id, 'error', syncResult.error);
            failed++;
            errors.push(`Batch ${batch.batch_id || batch.local_id}: ${syncResult.error}`);
          }
        }
      }
    } catch (error) {
      for (const batch of pendingBatches) {
        await updateBatchStatus(batch.id, 'error', error instanceof Error ? error.message : 'Unknown error');
        failed++;
      }
      errors.push(error instanceof Error ? error.message : 'Unknown error');
    }
    
    await notifyListeners();
    
  } finally {
    isSyncing = false;
  }
  
  return { synced, failed, errors, warnings };
}

export async function updateSyncStatus(deviceId?: string): Promise<void> {
  if (!navigator.onLine) return;
  
  try {
    const stats = await getSyncStats();
    
    await fetch('/api/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        device_id: deviceId || 'web',
        pending_batches: stats.pending + stats.error,
        pending_bags: 0,
        app_version: '1.0.0',
        is_online: true,
      }),
    });
  } catch (error) {
    console.error('Failed to update sync status:', error);
  }
}

export function setupAutoSync(intervalMs: number = 30000): () => void {
  const sync = async () => {
    if (navigator.onLine) {
      await syncPendingBatches();
      await updateSyncStatus();
    }
  };
  
  sync();
  
  const intervalId = setInterval(sync, intervalMs);
  
  const handleOnline = () => {
    console.log('Device is online, syncing...');
    sync();
  };
  
  const handleOffline = () => {
    console.log('Device is offline');
    notifyListeners();
  };
  
  window.addEventListener('online', handleOnline);
  window.addEventListener('offline', handleOffline);
  
  return () => {
    clearInterval(intervalId);
    window.removeEventListener('online', handleOnline);
    window.removeEventListener('offline', handleOffline);
  };
}

export function isOnline(): boolean {
  return navigator.onLine;
}
