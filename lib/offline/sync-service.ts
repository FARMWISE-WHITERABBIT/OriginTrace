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
  getQuarantinedQueueStats,
  resetInterruptedSyncItems,
  OrganizationId,
  PendingBatch,
  PendingFarm,
  PendingUpload,
  PendingBoundary,
  PendingOcrJob,
} from './sync-store';

let isSyncing = false;
let syncListeners: ((stats: Awaited<ReturnType<typeof getSyncStats>>) => void)[] = [];

class OrganizationScopeChangedError extends Error {
  constructor() {
    super('The active organization changed during offline sync.');
    this.name = 'OrganizationScopeChangedError';
  }
}

type IsOrganizationActive = () => boolean;

function assertOrganizationActive(isOrganizationActive: IsOrganizationActive): void {
  if (!isOrganizationActive()) throw new OrganizationScopeChangedError();
}

function isOrganizationScopeChanged(error: unknown): error is OrganizationScopeChangedError {
  return error instanceof OrganizationScopeChangedError;
}

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

async function notifyListeners(orgId: OrganizationId) {
  const stats = await getSyncStats(orgId);
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

async function resolveFarmReference(
  farmId: string,
  orgId: OrganizationId,
  localFarmId?: string,
): Promise<string | undefined> {
  if (farmId && !isLocalFarmId(farmId)) return farmId;
  if (farmId) {
    const mapped = await getServerIdForLocalId(farmId, orgId);
    if (mapped) return mapped;
  }
  if (localFarmId) {
    return getServerIdForLocalId(localFarmId, orgId);
  }
  return undefined;
}

export async function resolveBatchForSync(batch: PendingBatch, orgId: OrganizationId): Promise<PendingBatch | null> {
  const farmId = await resolveFarmReference(batch.farm_id, orgId, batch.local_farm_id);
  if (!farmId) return null;

  const contributors = [];
  for (const contributor of batch.contributors || []) {
    const contributorFarmId = await resolveFarmReference(contributor.farm_id, orgId, contributor.local_farm_id);
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

async function syncFarms(
  orgId: OrganizationId,
  isOrganizationActive: IsOrganizationActive,
  warnings: Array<{ type: string; message: string; details?: unknown }>,
) {
  assertOrganizationActive(isOrganizationActive);
  const pendingFarms = await getPendingFarms(orgId);
  let synced = 0;
  let failed = 0;
  const errors: string[] = [];

  for (const farm of pendingFarms) {
    assertOrganizationActive(isOrganizationActive);
    await updateFarmStatus(farm.id, orgId, 'syncing');
    await notifyListeners(orgId);

    try {
      assertOrganizationActive(isOrganizationActive);
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
      assertOrganizationActive(isOrganizationActive);
      const serverId = result?.farm?.id || result?.data?.id;
      if (!serverId) throw new Error('Farm sync response did not include a server id');

      await setIdMapping(farm.local_id, String(serverId), orgId, 'farm');
      assertOrganizationActive(isOrganizationActive);
      await updateFarmStatus(farm.id, orgId, 'synced', undefined, { server_id: String(serverId) });
      synced++;
    } catch (error) {
      if (isOrganizationScopeChanged(error)) throw error;
      const message = error instanceof Error ? error.message : 'Unknown farm sync error';
      assertOrganizationActive(isOrganizationActive);
      await updateFarmStatus(farm.id, orgId, 'error', message);
      errors.push(`${farm.farmer_name}: ${message}`);
      failed++;
    }
  }

  if (pendingFarms.length > 0 && failed === 0) {
    appendWarning(warnings, 'farms_synced', `${synced} offline farmer record(s) synced.`);
  }

  return { synced, failed, errors };
}

async function syncUploads(
  orgId: OrganizationId,
  isOrganizationActive: IsOrganizationActive,
  warnings: Array<{ type: string; message: string; details?: unknown }>,
) {
  assertOrganizationActive(isOrganizationActive);
  const pendingUploads = await getPendingUploads(orgId);
  let synced = 0;
  let failed = 0;
  const errors: string[] = [];

  for (const upload of pendingUploads) {
    assertOrganizationActive(isOrganizationActive);
    const farmId = await resolveFarmReference(upload.farm_id, orgId, upload.local_farm_id);
    if (!farmId) {
      appendWarning(warnings, 'upload_dependency_pending', 'File upload is waiting for its offline farm to sync first.', { upload_id: upload.id });
      continue;
    }

    await updateUploadStatus(upload.id, orgId, 'syncing');
    await notifyListeners(orgId);

    try {
      assertOrganizationActive(isOrganizationActive);
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
      assertOrganizationActive(isOrganizationActive);
      await updateUploadStatus(upload.id, orgId, 'synced', undefined, {
        server_id: result?.id || result?.file?.id,
        file_url: result?.file?.file_url,
      });
      synced++;
    } catch (error) {
      if (isOrganizationScopeChanged(error)) throw error;
      const message = error instanceof Error ? error.message : 'Unknown upload sync error';
      assertOrganizationActive(isOrganizationActive);
      await updateUploadStatus(upload.id, orgId, 'error', message);
      errors.push(`${upload.file_type}: ${message}`);
      failed++;
    }
  }

  return { synced, failed, errors };
}

async function syncOcrJobs(
  orgId: OrganizationId,
  isOrganizationActive: IsOrganizationActive,
  warnings: Array<{ type: string; message: string; details?: unknown }>,
) {
  assertOrganizationActive(isOrganizationActive);
  const pendingJobs = await getPendingOcrJobs(orgId);
  const offlineFarms = await getAllOfflineFarms(orgId);
  let synced = 0;
  let failed = 0;
  const errors: string[] = [];

  for (const job of pendingJobs) {
    assertOrganizationActive(isOrganizationActive);
    const farmId = await resolveFarmReference(job.farm_id, orgId, job.local_farm_id);
    if (!farmId) {
      appendWarning(warnings, 'ocr_dependency_pending', 'OCR job is waiting for its offline farm to sync first.', { ocr_id: job.id });
      continue;
    }

    await updateOcrJobStatus(job.id, orgId, 'syncing');
    await notifyListeners(orgId);

    try {
      assertOrganizationActive(isOrganizationActive);
      const response = await fetch('/api/ocr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: job.image_data }),
      });

      if (!response.ok) {
        throw new Error(await readResponseError(response, 'Failed to process offline OCR job'));
      }

      const result = await response.json();
      assertOrganizationActive(isOrganizationActive);
      const sourceFarm = offlineFarms.find((farm) => farm.local_id === job.local_farm_id || farm.local_id === job.farm_id);
      const idNumber = typeof result?.idNumber === 'string' ? result.idNumber.trim() : '';

      if (idNumber && sourceFarm && !sourceFarm.farmer_id) {
        assertOrganizationActive(isOrganizationActive);
        await fetch(`/api/farmers/${farmId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ farmer_id: idNumber }),
        }).catch(() => undefined);
      }

      assertOrganizationActive(isOrganizationActive);
      await updateOcrJobStatus(job.id, orgId, 'synced', undefined, { result });
      synced++;
    } catch (error) {
      if (isOrganizationScopeChanged(error)) throw error;
      const message = error instanceof Error ? error.message : 'Unknown OCR sync error';
      assertOrganizationActive(isOrganizationActive);
      await updateOcrJobStatus(job.id, orgId, 'error', message);
      errors.push(`OCR ${job.id}: ${message}`);
      failed++;
    }
  }

  return { synced, failed, errors };
}

async function syncBoundaries(
  orgId: OrganizationId,
  isOrganizationActive: IsOrganizationActive,
  warnings: Array<{ type: string; message: string; details?: unknown }>,
) {
  assertOrganizationActive(isOrganizationActive);
  const pendingBoundaries = await getPendingBoundaries(orgId);
  let synced = 0;
  let failed = 0;
  const errors: string[] = [];

  for (const boundary of pendingBoundaries) {
    assertOrganizationActive(isOrganizationActive);
    const farmId = await resolveFarmReference(boundary.farm_id, orgId, boundary.local_farm_id);
    if (!farmId) {
      appendWarning(warnings, 'boundary_dependency_pending', 'Boundary is waiting for its offline farm to sync first.', { boundary_id: boundary.id });
      continue;
    }

    await updateBoundaryStatus(boundary.id, orgId, 'syncing');
    await notifyListeners(orgId);

    try {
      assertOrganizationActive(isOrganizationActive);
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

      assertOrganizationActive(isOrganizationActive);
      await updateBoundaryStatus(boundary.id, orgId, 'synced');
      synced++;
    } catch (error) {
      if (isOrganizationScopeChanged(error)) throw error;
      const message = error instanceof Error ? error.message : 'Unknown boundary sync error';
      assertOrganizationActive(isOrganizationActive);
      await updateBoundaryStatus(boundary.id, orgId, 'error', message);
      errors.push(`Boundary ${boundary.id}: ${message}`);
      failed++;
    }
  }

  return { synced, failed, errors };
}

async function syncBatches(
  orgId: OrganizationId,
  isOrganizationActive: IsOrganizationActive,
  warnings: Array<{ type: string; message: string; details?: unknown }>,
) {
  assertOrganizationActive(isOrganizationActive);
  const pendingBatches = await getPendingBatches(orgId);
  let synced = 0;
  let failed = 0;
  let conflicted = 0;
  const errors: string[] = [];

  const syncable: PendingBatch[] = [];
  for (const batch of pendingBatches) {
    assertOrganizationActive(isOrganizationActive);
    const resolved = await resolveBatchForSync(batch, orgId);
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
    assertOrganizationActive(isOrganizationActive);
    await updateBatchStatus(batch.id, orgId, 'syncing');
  }
  await notifyListeners(orgId);

  try {
    assertOrganizationActive(isOrganizationActive);
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
    assertOrganizationActive(isOrganizationActive);

    if (result.warnings && Array.isArray(result.warnings)) {
      warnings.push(...result.warnings);
    }

    for (const syncResult of result.results || []) {
      const batch = syncable.find(b => b.local_id === syncResult.local_id);
      if (batch) {
        assertOrganizationActive(isOrganizationActive);
        if (syncResult.status === 'synced' || syncResult.status === 'already_synced') {
          await updateBatchStatus(batch.id, orgId, 'synced');
          synced++;
        } else if (syncResult.status === 'conflict') {
          await updateBatchStatus(batch.id, orgId, 'conflict', undefined, syncResult.conflict_id);
          conflicted++;
        } else if (syncResult.status === 'error') {
          await updateBatchStatus(batch.id, orgId, 'error', syncResult.error);
          failed++;
          errors.push(`Batch ${batch.batch_id || batch.local_id}: ${syncResult.error}`);
        }
      }
    }
  } catch (error) {
    if (isOrganizationScopeChanged(error)) throw error;
    for (const batch of syncable) {
      assertOrganizationActive(isOrganizationActive);
      await updateBatchStatus(batch.id, orgId, 'error', error instanceof Error ? error.message : 'Unknown error');
      failed++;
    }
    errors.push(error instanceof Error ? error.message : 'Unknown error');
  }

  return { synced, failed, conflicted, errors };
}

export async function syncFieldWorkQueue(
  orgId: OrganizationId,
  isOrganizationActive: IsOrganizationActive,
): Promise<{
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

  if (!isOrganizationActive()) {
    return {
      synced: 0,
      failed: 0,
      conflicted: 0,
      errors: [],
      warnings: [{ type: 'organization_changed', message: 'Offline sync stopped because the active organization changed.' }],
    };
  }

  setSyncingState(true);
  const errors: string[] = [];
  const warnings: Array<{ type: string; message: string; details?: unknown }> = [];
  let synced = 0;
  let failed = 0;
  let conflicted = 0;

  try {
    assertOrganizationActive(isOrganizationActive);
    await resetInterruptedSyncItems(orgId);
    assertOrganizationActive(isOrganizationActive);
    const quarantined = await getQuarantinedQueueStats();
    if (quarantined.total > 0) {
      appendWarning(
        warnings,
        'legacy_unscoped_queue',
        `${quarantined.total} legacy offline item(s) are quarantined because they have no organization owner.`,
        quarantined,
      );
    }

    const farmResult = await syncFarms(orgId, isOrganizationActive, warnings);
    synced += farmResult.synced;
    failed += farmResult.failed;
    errors.push(...farmResult.errors);

    const uploadResult = await syncUploads(orgId, isOrganizationActive, warnings);
    synced += uploadResult.synced;
    failed += uploadResult.failed;
    errors.push(...uploadResult.errors);

    const ocrResult = await syncOcrJobs(orgId, isOrganizationActive, warnings);
    synced += ocrResult.synced;
    failed += ocrResult.failed;
    errors.push(...ocrResult.errors);

    const boundaryResult = await syncBoundaries(orgId, isOrganizationActive, warnings);
    synced += boundaryResult.synced;
    failed += boundaryResult.failed;
    errors.push(...boundaryResult.errors);

    const batchResult = await syncBatches(orgId, isOrganizationActive, warnings);
    synced += batchResult.synced;
    failed += batchResult.failed;
    conflicted += batchResult.conflicted;
    errors.push(...batchResult.errors);

    assertOrganizationActive(isOrganizationActive);
    await notifyListeners(orgId);
  } catch (error) {
    if (isOrganizationScopeChanged(error)) {
      appendWarning(warnings, 'organization_changed', error.message);
    } else {
      errors.push(error instanceof Error ? error.message : 'Unknown sync error');
      failed++;
    }
  } finally {
    setSyncingState(false);
  }

  return { synced, failed, conflicted, errors, warnings };
}

export async function syncPendingBatches(
  orgId: OrganizationId,
  isOrganizationActive: IsOrganizationActive,
) {
  return syncFieldWorkQueue(orgId, isOrganizationActive);
}

export async function updateSyncStatus(
  orgId: OrganizationId,
  isOrganizationActive: IsOrganizationActive,
  deviceId?: string,
): Promise<void> {
  if (!navigator.onLine || !isOrganizationActive()) return;

  try {
    const stats = await getSyncStats(orgId);
    assertOrganizationActive(isOrganizationActive);

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
  orgId: OrganizationId,
  isOrganizationActive: IsOrganizationActive,
  intervalMs: number = 30000,
  options: { immediate?: boolean } = {}
): () => void {
  const sync = async () => {
    if (navigator.onLine && isOrganizationActive()) {
      const stats = await getSyncStats(orgId);
      if (!isOrganizationActive()) return;
      const hasPendingWork = stats.pending + stats.syncing + stats.error + stats.conflict > 0;
      if (!hasPendingWork) {
        await notifyListeners(orgId);
        return;
      }

      await syncFieldWorkQueue(orgId, isOrganizationActive);
      await updateSyncStatus(orgId, isOrganizationActive);
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
    if (isOrganizationActive()) void notifyListeners(orgId);
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
