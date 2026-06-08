import {
  getPendingBatches,
  getPendingFarms,
  getPendingBoundaries,
  getPendingUploads,
  getPendingOcrJobs,
  getAllOfflineFarms,
  updateBatchStatus,
  updateFarmStatus,
  updateBoundaryStatus,
  updateUploadStatus,
  updateOcrJobStatus,
  setIdMapping,
  getServerIdForLocalId,
  getSyncStats,
  PendingBatch,
  PendingFarm,
  PendingUpload,
  PendingBoundary,
  PendingOcrJob,
} from './sync-store';

let isSyncing = false;
let syncListeners: ((stats: Awaited<ReturnType<typeof getSyncStats>>) => void)[] = [];

export const FIELD_WORK_SYNC_ORDER = ['farms', 'uploads', 'ocr', 'boundaries', 'batches', 'status'] as const;

declare global {
  interface Window {
    __originTraceFieldSyncing?: boolean;
  }
}

function getSyncingState(): boolean {
  if (typeof window !== 'undefined') {
    return window.__originTraceFieldSyncing === true;
  }
  return isSyncing;
}

function setSyncingState(value: boolean) {
  isSyncing = value;
  if (typeof window !== 'undefined') {
    window.__originTraceFieldSyncing = value;
  }
}

export function addSyncListener(listener: (stats: Awaited<ReturnType<typeof getSyncStats>>) => void) {
  syncListeners.push(listener);
  return () => {
    syncListeners = syncListeners.filter(l => l !== listener);
  };
}

async function notifyListeners() {
  const stats = await getSyncStats();
  syncListeners.forEach(listener => listener(stats));
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('origintrace:sync-stats', { detail: stats }));
  }
}

export function isLocalFarmId(farmId?: string | null): boolean {
  if (!farmId) return false;
  return ['farm-', 'offline-', 'temp-', 'local-'].some((prefix) => farmId.startsWith(prefix));
}

export function batchHasUnresolvedFarmDependencies(
  batch: Pick<PendingBatch, 'farm_id' | 'local_farm_id' | 'contributors'>,
  farmMappings: Map<string, string>
): boolean {
  const ids = [
    batch.farm_id,
    batch.local_farm_id,
    ...(batch.contributors || []).flatMap((contributor) => [contributor.farm_id, contributor.local_farm_id]),
  ].filter(Boolean) as string[];

  return ids.some((id) => isLocalFarmId(id) && !farmMappings.has(id));
}

export function applyFarmMappingsToBatch(batch: PendingBatch, farmMappings: Map<string, string>): PendingBatch {
  return {
    ...batch,
    farm_id: farmMappings.get(batch.farm_id) || farmMappings.get(batch.local_farm_id || '') || batch.farm_id,
    contributors: (batch.contributors || []).map((contributor) => ({
      ...contributor,
      farm_id: farmMappings.get(contributor.farm_id) || farmMappings.get(contributor.local_farm_id || '') || contributor.farm_id,
    })),
  };
}

async function resolveFarmReference(farmId: string, localFarmId?: string): Promise<string | undefined> {
  if (farmId && !isLocalFarmId(farmId)) return farmId;
  if (farmId) {
    const mapped = await getServerIdForLocalId(farmId);
    if (mapped) return mapped;
  }
  if (localFarmId) {
    return getServerIdForLocalId(localFarmId);
  }
  return undefined;
}

export async function resolveBatchForSync(batch: PendingBatch): Promise<PendingBatch | null> {
  const farmId = await resolveFarmReference(batch.farm_id, batch.local_farm_id);
  if (!farmId) return null;

  const contributors = [];
  for (const contributor of batch.contributors || []) {
    const contributorFarmId = await resolveFarmReference(contributor.farm_id, contributor.local_farm_id);
    if (!contributorFarmId) return null;
    contributors.push({ ...contributor, farm_id: contributorFarmId });
  }

  return { ...batch, farm_id: farmId, contributors };
}

function appendWarning(
  warnings: Array<{ type: string; message: string; details?: unknown }>,
  type: string,
  message: string,
  details?: unknown
) {
  warnings.push({ type, message, details });
}

async function readResponseError(response: Response, fallback: string): Promise<string> {
  const data = await response.json().catch(() => ({}));
  return data.error || data.message || fallback;
}

async function syncFarms(warnings: Array<{ type: string; message: string; details?: unknown }>) {
  const pendingFarms = await getPendingFarms();
  let synced = 0;
  let failed = 0;
  const errors: string[] = [];

  for (const farm of pendingFarms) {
    await updateFarmStatus(farm.id, 'syncing');
    await notifyListeners();

    try {
      const response = await fetch('/api/farms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          local_id: farm.local_id,
          farmer_name: farm.farmer_name,
          farmer_id: farm.farmer_id || undefined,
          phone: farm.phone || undefined,
          community: farm.community,
          commodity: farm.commodity || undefined,
          consent_timestamp: farm.consent_timestamp || undefined,
          consent_signature: farm.consent_signature || undefined,
        }),
      });

      if (!response.ok) {
        throw new Error(await readResponseError(response, 'Failed to sync farm'));
      }

      const result = await response.json();
      const serverId = result?.farm?.id || result?.data?.id;
      if (!serverId) throw new Error('Farm sync response did not include a server id');

      await setIdMapping(farm.local_id, String(serverId), 'farm');
      await updateFarmStatus(farm.id, 'synced', undefined, { server_id: String(serverId) });
      synced++;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown farm sync error';
      await updateFarmStatus(farm.id, 'error', message);
      errors.push(`${farm.farmer_name}: ${message}`);
      failed++;
    }
  }

  if (pendingFarms.length > 0 && failed === 0) {
    appendWarning(warnings, 'farms_synced', `${synced} offline farmer record(s) synced.`);
  }

  return { synced, failed, errors };
}

async function syncUploads(warnings: Array<{ type: string; message: string; details?: unknown }>) {
  const pendingUploads = await getPendingUploads();
  let synced = 0;
  let failed = 0;
  const errors: string[] = [];

  for (const upload of pendingUploads) {
    const farmId = await resolveFarmReference(upload.farm_id, upload.local_farm_id);
    if (!farmId) {
      appendWarning(warnings, 'upload_dependency_pending', 'File upload is waiting for its offline farm to sync first.', { upload_id: upload.id });
      continue;
    }

    await updateUploadStatus(upload.id, 'syncing');
    await notifyListeners();

    try {
      let response: Response;
      if (upload.upload_kind === 'record') {
        response = await fetch('/api/compliance-files', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            farm_id: farmId,
            file_type: upload.file_type,
            file_url: JSON.stringify(upload.payload ?? {}),
            verification_status: 'pending',
          }),
        });
      } else {
        if (!upload.blob) throw new Error('Queued upload has no file data');
        const formData = new FormData();
        formData.append('file_type', upload.file_type);
        formData.append('file', upload.blob, upload.file_name || `${upload.file_type}.bin`);
        response = await fetch(`/api/farmers/${farmId}/files`, {
          method: 'POST',
          body: formData,
        });
      }

      if (!response.ok) {
        throw new Error(await readResponseError(response, 'Failed to upload offline file'));
      }

      const result = await response.json().catch(() => ({}));
      await updateUploadStatus(upload.id, 'synced', undefined, {
        server_id: result?.id || result?.file?.id,
        file_url: result?.file?.file_url,
      });
      synced++;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown upload sync error';
      await updateUploadStatus(upload.id, 'error', message);
      errors.push(`${upload.file_type}: ${message}`);
      failed++;
    }
  }

  return { synced, failed, errors };
}

async function syncOcrJobs(warnings: Array<{ type: string; message: string; details?: unknown }>) {
  const pendingJobs = await getPendingOcrJobs();
  const offlineFarms = await getAllOfflineFarms();
  let synced = 0;
  let failed = 0;
  const errors: string[] = [];

  for (const job of pendingJobs) {
    const farmId = await resolveFarmReference(job.farm_id, job.local_farm_id);
    if (!farmId) {
      appendWarning(warnings, 'ocr_dependency_pending', 'OCR job is waiting for its offline farm to sync first.', { ocr_id: job.id });
      continue;
    }

    await updateOcrJobStatus(job.id, 'syncing');
    await notifyListeners();

    try {
      const response = await fetch('/api/ocr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: job.image_data }),
      });

      if (!response.ok) {
        throw new Error(await readResponseError(response, 'Failed to process offline OCR job'));
      }

      const result = await response.json();
      const sourceFarm = offlineFarms.find((farm) => farm.local_id === job.local_farm_id || farm.local_id === job.farm_id);
      const idNumber = typeof result?.idNumber === 'string' ? result.idNumber.trim() : '';

      if (idNumber && sourceFarm && !sourceFarm.farmer_id) {
        await fetch(`/api/farmers/${farmId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ farmer_id: idNumber }),
        }).catch(() => undefined);
      }

      await updateOcrJobStatus(job.id, 'synced', undefined, { result });
      synced++;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown OCR sync error';
      await updateOcrJobStatus(job.id, 'error', message);
      errors.push(`OCR ${job.id}: ${message}`);
      failed++;
    }
  }

  return { synced, failed, errors };
}

async function syncBoundaries(warnings: Array<{ type: string; message: string; details?: unknown }>) {
  const pendingBoundaries = await getPendingBoundaries();
  let synced = 0;
  let failed = 0;
  const errors: string[] = [];

  for (const boundary of pendingBoundaries) {
    const farmId = await resolveFarmReference(boundary.farm_id, boundary.local_farm_id);
    if (!farmId) {
      appendWarning(warnings, 'boundary_dependency_pending', 'Boundary is waiting for its offline farm to sync first.', { boundary_id: boundary.id });
      continue;
    }

    await updateBoundaryStatus(boundary.id, 'syncing');
    await notifyListeners();

    try {
      const response = await fetch(`/api/farms/${farmId}/boundary`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          boundary: boundary.boundary,
          area_hectares: boundary.area_hectares,
        }),
      });

      if (!response.ok) {
        throw new Error(await readResponseError(response, 'Failed to sync boundary'));
      }

      await updateBoundaryStatus(boundary.id, 'synced');
      synced++;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown boundary sync error';
      await updateBoundaryStatus(boundary.id, 'error', message);
      errors.push(`Boundary ${boundary.id}: ${message}`);
      failed++;
    }
  }

  return { synced, failed, errors };
}

async function syncBatches(warnings: Array<{ type: string; message: string; details?: unknown }>) {
  const pendingBatches = await getPendingBatches();
  let synced = 0;
  let failed = 0;
  let conflicted = 0;
  const errors: string[] = [];

  const syncable: PendingBatch[] = [];
  for (const batch of pendingBatches) {
    const resolved = await resolveBatchForSync(batch);
    if (resolved) {
      syncable.push(resolved);
    } else {
      appendWarning(warnings, 'batch_dependency_pending', 'Batch is waiting for its offline farm to sync first.', {
        batch_id: batch.batch_id || batch.local_id,
      });
    }
  }

  if (syncable.length === 0) {
    return { synced, failed, conflicted, errors };
  }

  for (const batch of syncable) {
    await updateBatchStatus(batch.id, 'syncing');
  }
  await notifyListeners();

  try {
    const response = await fetch('/api/sync', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        batches: syncable.map(b => ({
          local_id: b.local_id,
          batch_id: b.batch_id,
          farm_id: b.farm_id,
          commodity: b.commodity,
          state: b.state,
          lga: b.lga,
          community: b.community,
          gps_lat: b.gps_lat,
          gps_lng: b.gps_lng,
          bag_count: b.bags?.length || b.contributors?.reduce((sum, c) => sum + (c.bag_count || 0), 0) || 0,
          total_weight: b.bags?.reduce((sum, bag) => sum + (bag.weight || 0), 0) || b.contributors?.reduce((sum, c) => sum + (c.weight_kg || 0), 0) || 0,
          contributors: b.contributors || [],
          bags: b.bags,
          notes: b.notes,
          collected_at: b.collected_at,
        })),
      }),
    });

    if (!response.ok) {
      throw new Error(await readResponseError(response, 'Sync failed'));
    }

    const result = await response.json();

    if (result.warnings && Array.isArray(result.warnings)) {
      warnings.push(...result.warnings);
    }

    for (const syncResult of result.results || []) {
      const batch = syncable.find(b => b.local_id === syncResult.local_id);
      if (batch) {
        if (syncResult.status === 'synced' || syncResult.status === 'already_synced') {
          await updateBatchStatus(batch.id, 'synced');
          synced++;
        } else if (syncResult.status === 'conflict') {
          await updateBatchStatus(batch.id, 'conflict', undefined, syncResult.conflict_id);
          conflicted++;
        } else if (syncResult.status === 'error') {
          await updateBatchStatus(batch.id, 'error', syncResult.error);
          failed++;
          errors.push(`Batch ${batch.batch_id || batch.local_id}: ${syncResult.error}`);
        }
      }
    }
  } catch (error) {
    for (const batch of syncable) {
      await updateBatchStatus(batch.id, 'error', error instanceof Error ? error.message : 'Unknown error');
      failed++;
    }
    errors.push(error instanceof Error ? error.message : 'Unknown error');
  }

  return { synced, failed, conflicted, errors };
}

export async function syncFieldWorkQueue(): Promise<{
  synced: number;
  failed: number;
  conflicted: number;
  errors: string[];
  warnings: Array<{ type: string; message: string; details?: unknown }>;
}> {
  if (getSyncingState()) {
    return { synced: 0, failed: 0, conflicted: 0, errors: ['Sync already in progress'], warnings: [] };
  }

  if (!navigator.onLine) {
    return { synced: 0, failed: 0, conflicted: 0, errors: ['Device is offline'], warnings: [] };
  }

  setSyncingState(true);
  const errors: string[] = [];
  const warnings: Array<{ type: string; message: string; details?: unknown }> = [];
  let synced = 0;
  let failed = 0;
  let conflicted = 0;

  try {
    const farmResult = await syncFarms(warnings);
    synced += farmResult.synced;
    failed += farmResult.failed;
    errors.push(...farmResult.errors);

    const uploadResult = await syncUploads(warnings);
    synced += uploadResult.synced;
    failed += uploadResult.failed;
    errors.push(...uploadResult.errors);

    const ocrResult = await syncOcrJobs(warnings);
    synced += ocrResult.synced;
    failed += ocrResult.failed;
    errors.push(...ocrResult.errors);

    const boundaryResult = await syncBoundaries(warnings);
    synced += boundaryResult.synced;
    failed += boundaryResult.failed;
    errors.push(...boundaryResult.errors);

    const batchResult = await syncBatches(warnings);
    synced += batchResult.synced;
    failed += batchResult.failed;
    conflicted += batchResult.conflicted;
    errors.push(...batchResult.errors);

    await notifyListeners();
  } finally {
    setSyncingState(false);
  }

  return { synced, failed, conflicted, errors, warnings };
}

export async function syncPendingBatches() {
  return syncFieldWorkQueue();
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
        pending_batches: stats.batches.pending + stats.batches.error,
        pending_bags: 0,
        app_version: '1.0.0',
        is_online: true,
      }),
    });
  } catch (error) {
    console.error('Failed to update sync status:', error);
  }
}

export function setupAutoSync(
  intervalMs: number = 30000,
  options: { immediate?: boolean } = {}
): () => void {
  const sync = async () => {
    if (navigator.onLine) {
      const stats = await getSyncStats();
      const hasPendingWork = stats.pending + stats.error + stats.conflict > 0;
      if (!hasPendingWork) {
        await notifyListeners();
        return;
      }

      await syncFieldWorkQueue();
      await updateSyncStatus();
    }
  };

  if (options.immediate ?? true) {
    sync();
  }

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

export type { PendingFarm, PendingUpload, PendingBoundary, PendingOcrJob, PendingBatch };
