import { openDB, DBSchema, IDBPDatabase } from 'idb';

type QueueStatus = 'pending' | 'syncing' | 'synced' | 'error' | 'conflict';
type OrganizationId = number | string;

interface TenantOwnedQueueItem {
  org_id: OrganizationId;
}

interface PendingFarm extends TenantOwnedQueueItem {
  id: string;
  local_id: string;
  farmer_name: string;
  farmer_id?: string | null;
  phone?: string | null;
  community: string;
  commodity?: string | null;
  consent_timestamp?: string | null;
  consent_signature?: string | null;
  compliance_data?: Record<string, boolean | string>;
  status: QueueStatus;
  error_message?: string;
  created_at: string;
  synced_at?: string;
  server_id?: string;
}

interface PendingBoundary extends TenantOwnedQueueItem {
  id: string;
  farm_id: string;
  local_farm_id?: string;
  boundary: { type: string; coordinates: number[][][] };
  area_hectares: number;
  status: QueueStatus;
  error_message?: string;
  created_at: string;
  synced_at?: string;
}

interface PendingUpload extends TenantOwnedQueueItem {
  id: string;
  farm_id: string;
  local_farm_id?: string;
  upload_kind: 'file' | 'record';
  file_type: string;
  file_name?: string;
  file_mime?: string;
  file_size?: number;
  blob?: Blob;
  payload?: unknown;
  status: QueueStatus;
  error_message?: string;
  created_at: string;
  synced_at?: string;
  server_id?: string;
  file_url?: string;
}

interface PendingOcrJob extends TenantOwnedQueueItem {
  id: string;
  farm_id: string;
  local_farm_id?: string;
  upload_id?: string;
  image_data: string;
  status: QueueStatus;
  result?: unknown;
  error_message?: string;
  created_at: string;
  synced_at?: string;
}

interface IdMapping extends TenantOwnedQueueItem {
  local_id: string;
  server_id: string;
  entity_type: 'farm';
  created_at: string;
}

interface PendingBatch extends TenantOwnedQueueItem {
  id: string;
  local_id: string;
  batch_id: string;
  farm_id: string;
  local_farm_id?: string;
  farm_name?: string;
  commodity?: string;
  state?: string;
  lga?: string;
  community?: string;
  gps_lat?: number;
  gps_lng?: number;
  contributors: ContributorEntry[];
  bags: PendingBag[];
  notes?: string;
  collected_at: string;
  status: QueueStatus;
  error_message?: string;
  conflict_id?: string;
  created_at: string;
  synced_at?: string;
  yield_photo_proof?: string;
}

interface ContributorEntry {
  farm_id: string;
  local_farm_id?: string;
  farmer_name: string;
  community?: string;
  bag_count: number;
  weight_kg: number;
}

interface PendingBag {
  serial: string;
  weight: number;
  grade: 'A' | 'B' | 'C';
  is_compliant: boolean;
}

interface OriginTraceDB extends DBSchema {
  pending_batches: {
    key: string;
    value: PendingBatch;
    indexes: { 'by-status': QueueStatus; 'by-date': string };
  };
  pending_farms: {
    key: string;
    value: PendingFarm;
    indexes: { 'by-status': QueueStatus; 'by-date': string; 'by-local-id': string };
  };
  pending_boundaries: {
    key: string;
    value: PendingBoundary;
    indexes: { 'by-status': QueueStatus; 'by-date': string; 'by-farm': string };
  };
  pending_uploads: {
    key: string;
    value: PendingUpload;
    indexes: { 'by-status': QueueStatus; 'by-date': string; 'by-farm': string };
  };
  pending_ocr_jobs: {
    key: string;
    value: PendingOcrJob;
    indexes: { 'by-status': QueueStatus; 'by-date': string; 'by-farm': string };
  };
  id_mappings: {
    key: string;
    value: IdMapping;
    indexes: { 'by-server-id': string; 'by-entity': string };
  };
  cached_farms: {
    key: string;
    value: {
      id: string;
      farmer_name: string;
      community: string;
      compliance_status: string;
      cached_at: string;
      commodity?: string;
      area_hectares?: number;
      org_id?: number | string;
      is_local?: boolean;
      local_id?: string;
      boundary?: unknown;
    };
  };
  cached_bags: {
    key: string;
    value: {
      id: string;
      org_id: OrganizationId;
      serial: string;
      status: string;
      cached_at: string;
    };
  };
}

const DB_NAME = 'origintrace-offline';
const DB_VERSION = 6;
const OFFLINE_TTL_MS = 30 * 24 * 60 * 60 * 1000;

let dbInstance: IDBPDatabase<OriginTraceDB> | null = null;

export async function getDB(): Promise<IDBPDatabase<OriginTraceDB>> {
  if (dbInstance) return dbInstance;

  dbInstance = await openDB<OriginTraceDB>(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains('pending_batches')) {
        const batchStore = db.createObjectStore('pending_batches', { keyPath: 'id' });
        batchStore.createIndex('by-status', 'status');
        batchStore.createIndex('by-date', 'created_at');
      }

      if ((db.objectStoreNames as DOMStringList).contains('sync_queue')) {
        (db as unknown as IDBDatabase).deleteObjectStore('sync_queue');
      }

      if (!db.objectStoreNames.contains('pending_farms')) {
        const store = db.createObjectStore('pending_farms', { keyPath: 'id' });
        store.createIndex('by-status', 'status');
        store.createIndex('by-date', 'created_at');
        store.createIndex('by-local-id', 'local_id');
      }

      if (!db.objectStoreNames.contains('pending_boundaries')) {
        const store = db.createObjectStore('pending_boundaries', { keyPath: 'id' });
        store.createIndex('by-status', 'status');
        store.createIndex('by-date', 'created_at');
        store.createIndex('by-farm', 'farm_id');
      }

      if (!db.objectStoreNames.contains('pending_uploads')) {
        const store = db.createObjectStore('pending_uploads', { keyPath: 'id' });
        store.createIndex('by-status', 'status');
        store.createIndex('by-date', 'created_at');
        store.createIndex('by-farm', 'farm_id');
      }

      if (!db.objectStoreNames.contains('pending_ocr_jobs')) {
        const store = db.createObjectStore('pending_ocr_jobs', { keyPath: 'id' });
        store.createIndex('by-status', 'status');
        store.createIndex('by-date', 'created_at');
        store.createIndex('by-farm', 'farm_id');
      }

      if (!db.objectStoreNames.contains('id_mappings')) {
        const store = db.createObjectStore('id_mappings', { keyPath: 'local_id' });
        store.createIndex('by-server-id', 'server_id');
        store.createIndex('by-entity', 'entity_type');
      }

      if (!db.objectStoreNames.contains('cached_farms')) {
        db.createObjectStore('cached_farms', { keyPath: 'id' });
      }

      if (!db.objectStoreNames.contains('cached_bags')) {
        db.createObjectStore('cached_bags', { keyPath: 'id' });
      }
    },
  });

  return dbInstance;
}

export function generateLocalId(prefix = 'local'): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

function nowIso() {
  return new Date().toISOString();
}

function organizationKey(orgId: OrganizationId): string {
  const key = String(orgId).trim();
  if (!key) throw new Error('An organization id is required for offline data.');
  return key;
}

function hasOrganizationId(value: unknown): value is OrganizationId {
  return (typeof value === 'number' && Number.isFinite(value))
    || (typeof value === 'string' && value.trim().length > 0);
}

function belongsToOrganization(item: { org_id?: OrganizationId }, orgId: OrganizationId): boolean {
  return hasOrganizationId(item.org_id) && organizationKey(item.org_id) === organizationKey(orgId);
}

function filterForOrganization<T extends { org_id?: OrganizationId }>(
  items: T[],
  orgId: OrganizationId,
): T[] {
  organizationKey(orgId);
  return items.filter((item) => belongsToOrganization(item, orgId));
}

async function assertLocalFarmScope(
  db: IDBPDatabase<OriginTraceDB>,
  orgId: OrganizationId,
  farmId?: string,
  localFarmId?: string,
): Promise<void> {
  const localReference = [localFarmId, farmId].find((id) => id && (
    id.startsWith('farm-') || id.startsWith('offline-') || id.startsWith('temp-') || id.startsWith('local-')
  ));
  if (!localReference) return;

  const farm = await db.get('pending_farms', localReference);
  if (!farm) {
    throw new Error('The linked offline farm could not be found.');
  }
  if (!belongsToOrganization(farm, orgId)) {
    throw new Error('The linked offline farm belongs to another organization.');
  }
}

async function updateStatus<T extends { id: string; status: QueueStatus; error_message?: string; synced_at?: string }>(
  storeName: 'pending_farms' | 'pending_boundaries' | 'pending_uploads' | 'pending_ocr_jobs' | 'pending_batches',
  id: string,
  orgId: OrganizationId,
  status: QueueStatus,
  error_message?: string,
  extra?: Partial<T>
): Promise<void> {
  const db = await getDB();
  const current = await db.get(storeName as never, id as never) as T | undefined;
  if (!current) return;
  if (!belongsToOrganization(current as T & { org_id?: OrganizationId }, orgId)) {
    throw new Error('Offline queue item is outside the active organization.');
  }
  const next = {
    ...current,
    ...extra,
    status,
    error_message: error_message || (status === 'pending' || status === 'synced' ? undefined : current.error_message),
    synced_at: status === 'synced' ? nowIso() : current.synced_at,
  };
  await db.put(storeName as never, next as never);
}

export async function saveFarmOffline(input: Omit<PendingFarm, 'id' | 'status' | 'created_at'>): Promise<PendingFarm> {
  const db = await getDB();
  organizationKey(input.org_id);
  const localId = input.local_id || generateLocalId('farm');
  const farm: PendingFarm = {
    ...input,
    id: localId,
    local_id: localId,
    status: 'pending',
    created_at: nowIso(),
  };

  await db.put('pending_farms', farm);
  await db.put('cached_farms', {
    id: localId,
    local_id: localId,
    org_id: input.org_id,
    farmer_name: input.farmer_name,
    community: input.community,
    compliance_status: 'pending',
    commodity: input.commodity || undefined,
    cached_at: nowIso(),
    is_local: true,
  });

  return farm;
}

export async function getPendingFarms(orgId: OrganizationId): Promise<PendingFarm[]> {
  const db = await getDB();
  return filterForOrganization(
    await db.getAllFromIndex('pending_farms', 'by-status', 'pending'),
    orgId,
  );
}

export async function getAllOfflineFarms(orgId: OrganizationId): Promise<PendingFarm[]> {
  const db = await getDB();
  const farms = filterForOrganization(await db.getAll('pending_farms'), orgId);
  return farms.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
}

export async function getLocalFarmsForOrg(orgId: OrganizationId): Promise<any[]> {
  const farms = await getAllOfflineFarms(orgId);
  return farms
    .filter((farm) => farm.status !== 'synced')
    .map((farm) => ({
      id: farm.local_id,
      local_id: farm.local_id,
      org_id: farm.org_id,
      farmer_name: farm.farmer_name,
      farmer_id: farm.farmer_id,
      phone: farm.phone,
      community: farm.community,
      commodity: farm.commodity,
      compliance_status: 'pending',
      boundary: undefined,
      has_boundary: false,
      is_local: true,
      sync_status: farm.status,
    }));
}

export async function updateFarmStatus(
  id: string,
  orgId: OrganizationId,
  status: QueueStatus,
  error_message?: string,
  extra?: Partial<PendingFarm>
): Promise<void> {
  await updateStatus<PendingFarm>('pending_farms', id, orgId, status, error_message, extra);
}

export async function saveBoundaryOffline(input: Omit<PendingBoundary, 'id' | 'status' | 'created_at'>): Promise<PendingBoundary> {
  const db = await getDB();
  organizationKey(input.org_id);
  await assertLocalFarmScope(db, input.org_id, input.farm_id, input.local_farm_id);
  const boundary: PendingBoundary = {
    ...input,
    id: generateLocalId('boundary'),
    status: 'pending',
    created_at: nowIso(),
  };
  await db.put('pending_boundaries', boundary);
  return boundary;
}

export async function getPendingBoundaries(orgId: OrganizationId): Promise<PendingBoundary[]> {
  const db = await getDB();
  return filterForOrganization(await db.getAllFromIndex('pending_boundaries', 'by-status', 'pending'), orgId);
}

export async function getAllBoundaries(orgId: OrganizationId): Promise<PendingBoundary[]> {
  const db = await getDB();
  return filterForOrganization(await db.getAll('pending_boundaries'), orgId);
}

export async function updateBoundaryStatus(
  id: string,
  orgId: OrganizationId,
  status: QueueStatus,
  error_message?: string,
  extra?: Partial<PendingBoundary>
): Promise<void> {
  await updateStatus<PendingBoundary>('pending_boundaries', id, orgId, status, error_message, extra);
}

export async function saveUploadOffline(input: Omit<PendingUpload, 'id' | 'status' | 'created_at'>): Promise<PendingUpload> {
  const db = await getDB();
  organizationKey(input.org_id);
  await assertLocalFarmScope(db, input.org_id, input.farm_id, input.local_farm_id);
  const upload: PendingUpload = {
    ...input,
    id: generateLocalId('upload'),
    status: 'pending',
    created_at: nowIso(),
  };
  await db.put('pending_uploads', upload);
  return upload;
}

export async function getPendingUploads(orgId: OrganizationId): Promise<PendingUpload[]> {
  const db = await getDB();
  return filterForOrganization(await db.getAllFromIndex('pending_uploads', 'by-status', 'pending'), orgId);
}

export async function getAllUploads(orgId: OrganizationId): Promise<PendingUpload[]> {
  const db = await getDB();
  return filterForOrganization(await db.getAll('pending_uploads'), orgId);
}

export async function updateUploadStatus(
  id: string,
  orgId: OrganizationId,
  status: QueueStatus,
  error_message?: string,
  extra?: Partial<PendingUpload>
): Promise<void> {
  await updateStatus<PendingUpload>('pending_uploads', id, orgId, status, error_message, extra);
}

export async function saveOcrJobOffline(input: Omit<PendingOcrJob, 'id' | 'status' | 'created_at'>): Promise<PendingOcrJob> {
  const db = await getDB();
  organizationKey(input.org_id);
  await assertLocalFarmScope(db, input.org_id, input.farm_id, input.local_farm_id);
  if (input.upload_id) {
    const upload = await db.get('pending_uploads', input.upload_id);
    if (!upload || !belongsToOrganization(upload, input.org_id)) {
      throw new Error('The linked offline upload is outside the active organization.');
    }
  }
  const job: PendingOcrJob = {
    ...input,
    id: generateLocalId('ocr'),
    status: 'pending',
    created_at: nowIso(),
  };
  await db.put('pending_ocr_jobs', job);
  return job;
}

export async function getPendingOcrJobs(orgId: OrganizationId): Promise<PendingOcrJob[]> {
  const db = await getDB();
  return filterForOrganization(await db.getAllFromIndex('pending_ocr_jobs', 'by-status', 'pending'), orgId);
}

export async function getAllOcrJobs(orgId: OrganizationId): Promise<PendingOcrJob[]> {
  const db = await getDB();
  return filterForOrganization(await db.getAll('pending_ocr_jobs'), orgId);
}

export async function updateOcrJobStatus(
  id: string,
  orgId: OrganizationId,
  status: QueueStatus,
  error_message?: string,
  extra?: Partial<PendingOcrJob>
): Promise<void> {
  await updateStatus<PendingOcrJob>('pending_ocr_jobs', id, orgId, status, error_message, extra);
}

export async function setIdMapping(
  local_id: string,
  server_id: string,
  orgId: OrganizationId,
  entity_type: 'farm' = 'farm',
): Promise<void> {
  const db = await getDB();
  organizationKey(orgId);
  const existing = await db.get('id_mappings', local_id);
  if (existing && !belongsToOrganization(existing, orgId)) {
    throw new Error('Offline id mapping is outside the active organization.');
  }
  await db.put('id_mappings', { local_id, server_id, org_id: orgId, entity_type, created_at: nowIso() });

  const cached = await db.get('cached_farms', local_id);
  if (cached && belongsToOrganization(cached, orgId)) {
    await db.delete('cached_farms', local_id);
    await db.put('cached_farms', { ...cached, id: server_id, local_id, is_local: false, cached_at: nowIso() });
  }
}

export async function getServerIdForLocalId(local_id: string, orgId: OrganizationId): Promise<string | undefined> {
  const db = await getDB();
  const mapping = await db.get('id_mappings', local_id);
  return mapping && belongsToOrganization(mapping, orgId) ? mapping.server_id : undefined;
}

export async function resolveFarmId(farmId: string, orgId: OrganizationId): Promise<string | undefined> {
  if (!farmId.startsWith('farm-') && !farmId.startsWith('offline-') && !farmId.startsWith('temp-') && !farmId.startsWith('local-')) {
    return farmId;
  }
  return getServerIdForLocalId(farmId, orgId);
}

export async function saveBatchOffline(batch: Omit<PendingBatch, 'id' | 'status' | 'created_at'>): Promise<PendingBatch> {
  const db = await getDB();
  organizationKey(batch.org_id);
  await assertLocalFarmScope(db, batch.org_id, batch.farm_id, batch.local_farm_id);
  for (const contributor of batch.contributors || []) {
    await assertLocalFarmScope(db, batch.org_id, contributor.farm_id, contributor.local_farm_id);
  }
  const localFarmId = batch.farm_id?.startsWith('farm-') || batch.farm_id?.startsWith('offline-') || batch.farm_id?.startsWith('temp-') || batch.farm_id?.startsWith('local-')
    ? batch.farm_id
    : batch.local_farm_id;

  const newBatch: PendingBatch = {
    ...batch,
    local_farm_id: localFarmId,
    contributors: (batch.contributors || []).map((contributor) => ({
      ...contributor,
      local_farm_id: contributor.farm_id?.startsWith('farm-') || contributor.farm_id?.startsWith('offline-') || contributor.farm_id?.startsWith('temp-') || contributor.farm_id?.startsWith('local-')
        ? contributor.farm_id
        : contributor.local_farm_id,
    })),
    id: generateLocalId('batch'),
    status: 'pending',
    created_at: nowIso(),
  };

  await db.put('pending_batches', newBatch);
  return newBatch;
}

export async function getPendingBatches(orgId: OrganizationId): Promise<PendingBatch[]> {
  const db = await getDB();
  return filterForOrganization(await db.getAllFromIndex('pending_batches', 'by-status', 'pending'), orgId);
}

export async function getErrorBatches(orgId: OrganizationId): Promise<PendingBatch[]> {
  const db = await getDB();
  return filterForOrganization(await db.getAllFromIndex('pending_batches', 'by-status', 'error'), orgId);
}

export async function getAllBatches(orgId: OrganizationId): Promise<PendingBatch[]> {
  const db = await getDB();
  const batches = filterForOrganization(await db.getAll('pending_batches'), orgId);
  return batches.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
}

export async function updateBatchStatus(
  id: string,
  orgId: OrganizationId,
  status: PendingBatch['status'],
  error_message?: string,
  conflict_id?: string,
  extra?: Partial<PendingBatch>
): Promise<void> {
  await updateStatus<PendingBatch>('pending_batches', id, orgId, status, error_message, { ...extra, conflict_id });
}

export async function updateBatchFarmReferences(
  batchId: string,
  orgId: OrganizationId,
  farmMap: Map<string, string>,
): Promise<void> {
  const db = await getDB();
  const batch = await db.get('pending_batches', batchId);
  if (!batch) return;
  if (!belongsToOrganization(batch, orgId)) {
    throw new Error('Offline batch is outside the active organization.');
  }

  const next: PendingBatch = {
    ...batch,
    farm_id: farmMap.get(batch.farm_id) || farmMap.get(batch.local_farm_id || '') || batch.farm_id,
    contributors: batch.contributors.map((contributor) => ({
      ...contributor,
      farm_id: farmMap.get(contributor.farm_id) || farmMap.get(contributor.local_farm_id || '') || contributor.farm_id,
    })),
  };
  await db.put('pending_batches', next);
}

export async function deleteBatch(id: string, orgId: OrganizationId): Promise<void> {
  const db = await getDB();
  const batch = await db.get('pending_batches', id);
  if (!batch) return;
  if (!belongsToOrganization(batch, orgId)) throw new Error('Offline batch is outside the active organization.');
  await db.delete('pending_batches', id);
}

export async function deleteFarm(id: string, orgId: OrganizationId): Promise<void> {
  const db = await getDB();
  const farm = await db.get('pending_farms', id);
  if (!farm) return;
  if (!belongsToOrganization(farm, orgId)) throw new Error('Offline farm is outside the active organization.');
  const localIds = [id, farm?.local_id].filter(Boolean) as string[];

  for (const storeName of ['pending_boundaries', 'pending_uploads', 'pending_ocr_jobs'] as const) {
    const items = await db.getAll(storeName);
    const tx = db.transaction(storeName, 'readwrite');
    for (const item of items) {
      if (belongsToOrganization(item, orgId) && (
        localIds.includes(item.farm_id) || (item.local_farm_id && localIds.includes(item.local_farm_id))
      )) {
        await tx.store.delete(item.id as never);
      }
    }
    await tx.done;
  }

  const batches = await db.getAll('pending_batches');
  const batchTx = db.transaction('pending_batches', 'readwrite');
  for (const batch of batches) {
    const hasFarm = belongsToOrganization(batch, orgId) && (localIds.includes(batch.farm_id)
      || (batch.local_farm_id && localIds.includes(batch.local_farm_id))
      || batch.contributors.some((contributor) =>
        localIds.includes(contributor.farm_id) || (!!contributor.local_farm_id && localIds.includes(contributor.local_farm_id))
      ));
    if (hasFarm) {
      await batchTx.store.delete(batch.id);
    }
  }
  await batchTx.done;

  await db.delete('pending_farms', id);
  if (farm.local_id) {
    const cached = await db.get('cached_farms', farm.local_id);
    if (cached && belongsToOrganization(cached, orgId)) {
      await db.delete('cached_farms', farm.local_id);
    }
    const mapping = await db.get('id_mappings', farm.local_id);
    if (mapping && belongsToOrganization(mapping, orgId)) {
      await db.delete('id_mappings', farm.local_id);
    }
  }
}

export async function deleteBoundary(id: string, orgId: OrganizationId): Promise<void> {
  const db = await getDB();
  const item = await db.get('pending_boundaries', id);
  if (!item) return;
  if (!belongsToOrganization(item, orgId)) throw new Error('Offline boundary is outside the active organization.');
  await db.delete('pending_boundaries', id);
}

export async function deleteUpload(id: string, orgId: OrganizationId): Promise<void> {
  const db = await getDB();
  const item = await db.get('pending_uploads', id);
  if (!item) return;
  if (!belongsToOrganization(item, orgId)) throw new Error('Offline upload is outside the active organization.');
  await db.delete('pending_uploads', id);
}

export async function deleteOcrJob(id: string, orgId: OrganizationId): Promise<void> {
  const db = await getDB();
  const item = await db.get('pending_ocr_jobs', id);
  if (!item) return;
  if (!belongsToOrganization(item, orgId)) throw new Error('Offline OCR job is outside the active organization.');
  await db.delete('pending_ocr_jobs', id);
}

export async function deleteSyncedBatches(orgId: OrganizationId): Promise<void> {
  const db = await getDB();
  const syncedBatches = await db.getAllFromIndex('pending_batches', 'by-status', 'synced');

  const tx = db.transaction('pending_batches', 'readwrite');
  for (const batch of syncedBatches) {
    if (belongsToOrganization(batch, orgId)) await tx.store.delete(batch.id);
  }
  await tx.done;
}

export async function deleteSyncedQueueItems(orgId: OrganizationId): Promise<void> {
  const db = await getDB();
  const stores: Array<'pending_farms' | 'pending_boundaries' | 'pending_uploads' | 'pending_ocr_jobs' | 'pending_batches'> = [
    'pending_farms',
    'pending_boundaries',
    'pending_uploads',
    'pending_ocr_jobs',
    'pending_batches',
  ];

  for (const storeName of stores) {
    const items = await db.getAllFromIndex(storeName as never, 'by-status' as never, 'synced' as never) as Array<{ id: string; org_id?: OrganizationId }>;
    const tx = db.transaction(storeName as never, 'readwrite');
    for (const item of items) {
      if (belongsToOrganization(item, orgId)) await tx.store.delete(item.id as never);
    }
    await tx.done;
  }
}

export async function resetInterruptedSyncItems(orgId: OrganizationId): Promise<void> {
  const db = await getDB();
  organizationKey(orgId);
  const stores: Array<'pending_farms' | 'pending_boundaries' | 'pending_uploads' | 'pending_ocr_jobs' | 'pending_batches'> = [
    'pending_farms',
    'pending_boundaries',
    'pending_uploads',
    'pending_ocr_jobs',
    'pending_batches',
  ];

  for (const storeName of stores) {
    const items = await db.getAllFromIndex(storeName as never, 'by-status' as never, 'syncing' as never) as Array<{
      id: string;
      org_id?: OrganizationId;
      status: QueueStatus;
      error_message?: string;
    }>;
    const tx = db.transaction(storeName as never, 'readwrite');
    for (const item of items) {
      if (belongsToOrganization(item, orgId)) {
        await tx.store.put({ ...item, status: 'pending', error_message: undefined } as never);
      }
    }
    await tx.done;
  }
}

function countByStatus(items: Array<{ status: QueueStatus }>) {
  return {
    pending: items.filter((item) => item.status === 'pending').length,
    syncing: items.filter((item) => item.status === 'syncing').length,
    synced: items.filter((item) => item.status === 'synced').length,
    error: items.filter((item) => item.status === 'error').length,
    conflict: items.filter((item) => item.status === 'conflict').length,
  };
}

export async function getSyncStats(orgId: OrganizationId): Promise<{
  org_id: OrganizationId;
  pending: number;
  syncing: number;
  synced: number;
  error: number;
  conflict: number;
  batches: ReturnType<typeof countByStatus>;
  farms: ReturnType<typeof countByStatus>;
  boundaries: ReturnType<typeof countByStatus>;
  uploads: ReturnType<typeof countByStatus>;
  ocr: ReturnType<typeof countByStatus>;
}> {
  try {
    const db = await getDB();
    const [batches, farms, boundaries, uploads, ocr] = await Promise.all([
      db.getAll('pending_batches'),
      db.getAll('pending_farms'),
      db.getAll('pending_boundaries'),
      db.getAll('pending_uploads'),
      db.getAll('pending_ocr_jobs'),
    ]);

    const batchStats = countByStatus(filterForOrganization(batches, orgId));
    const farmStats = countByStatus(filterForOrganization(farms, orgId));
    const boundaryStats = countByStatus(filterForOrganization(boundaries, orgId));
    const uploadStats = countByStatus(filterForOrganization(uploads, orgId));
    const ocrStats = countByStatus(filterForOrganization(ocr, orgId));
    const groups = [batchStats, farmStats, boundaryStats, uploadStats, ocrStats];

    return {
      org_id: orgId,
      pending: groups.reduce((sum, group) => sum + group.pending, 0),
      syncing: groups.reduce((sum, group) => sum + group.syncing, 0),
      synced: groups.reduce((sum, group) => sum + group.synced, 0),
      error: groups.reduce((sum, group) => sum + group.error, 0),
      conflict: groups.reduce((sum, group) => sum + group.conflict, 0),
      batches: batchStats,
      farms: farmStats,
      boundaries: boundaryStats,
      uploads: uploadStats,
      ocr: ocrStats,
    };
  } catch (error) {
    console.warn('Failed to get sync stats:', error);
    const empty = { pending: 0, syncing: 0, synced: 0, error: 0, conflict: 0 };
    return { org_id: orgId, ...empty, batches: empty, farms: empty, boundaries: empty, uploads: empty, ocr: empty };
  }
}

export async function getQuarantinedQueueStats(): Promise<{
  total: number;
  batches: number;
  farms: number;
  boundaries: number;
  uploads: number;
  ocr: number;
  mappings: number;
}> {
  const db = await getDB();
  const [batches, farms, boundaries, uploads, ocr, mappings] = await Promise.all([
    db.getAll('pending_batches'),
    db.getAll('pending_farms'),
    db.getAll('pending_boundaries'),
    db.getAll('pending_uploads'),
    db.getAll('pending_ocr_jobs'),
    db.getAll('id_mappings'),
  ]);
  const counts = {
    batches: batches.filter((item) => !hasOrganizationId(item.org_id)).length,
    farms: farms.filter((item) => !hasOrganizationId(item.org_id)).length,
    boundaries: boundaries.filter((item) => !hasOrganizationId(item.org_id)).length,
    uploads: uploads.filter((item) => !hasOrganizationId(item.org_id)).length,
    ocr: ocr.filter((item) => !hasOrganizationId(item.org_id)).length,
    mappings: mappings.filter((item) => !hasOrganizationId(item.org_id)).length,
  };
  return {
    total: Object.values(counts).reduce((sum, count) => sum + count, 0),
    ...counts,
  };
}

export async function resetDB(): Promise<void> {
  if (dbInstance) {
    dbInstance.close();
    dbInstance = null;
  }
  try {
    await indexedDB.deleteDatabase(DB_NAME);
    console.log('Database reset successfully');
  } catch (error) {
    console.warn('Failed to reset database:', error);
  }
}

export async function cacheFarms(farms: any[], orgId: OrganizationId): Promise<void> {
  const db = await getDB();
  organizationKey(orgId);
  const tx = db.transaction('cached_farms', 'readwrite');

  for (const farm of farms) {
    await tx.store.put({
      id: farm.id,
      farmer_name: farm.farmer_name,
      community: farm.community,
      compliance_status: farm.compliance_status,
      cached_at: nowIso(),
      commodity: farm.commodity || undefined,
      area_hectares: farm.area_hectares || undefined,
      org_id: orgId,
      boundary: farm.boundary,
      is_local: farm.is_local,
      local_id: farm.local_id,
    });
  }

  await tx.done;
}

export async function getCachedFarms(orgId: OrganizationId): Promise<any[]> {
  const db = await getDB();
  return filterForOrganization(await db.getAll('cached_farms'), orgId);
}

export async function cacheBags(bags: any[], orgId: OrganizationId): Promise<void> {
  const db = await getDB();
  organizationKey(orgId);
  const tx = db.transaction('cached_bags', 'readwrite');

  for (const bag of bags) {
    await tx.store.put({
      id: bag.id,
      org_id: orgId,
      serial: bag.serial,
      status: bag.status,
      cached_at: nowIso(),
    });
  }

  await tx.done;
}

export async function getCachedBags(orgId: OrganizationId): Promise<any[]> {
  const db = await getDB();
  return filterForOrganization(await db.getAll('cached_bags'), orgId);
}

export async function purgeExpiredOfflineData(
  orgId: OrganizationId,
  ttlMs = OFFLINE_TTL_MS,
): Promise<void> {
  const db = await getDB();
  organizationKey(orgId);
  const cutoff = Date.now() - ttlMs;
  const stores: Array<'pending_farms' | 'pending_boundaries' | 'pending_uploads' | 'pending_ocr_jobs' | 'pending_batches'> = [
    'pending_farms',
    'pending_boundaries',
    'pending_uploads',
    'pending_ocr_jobs',
    'pending_batches',
  ];

  for (const storeName of stores) {
    const all = await db.getAll(storeName);
    const tx = db.transaction(storeName, 'readwrite');
    for (const item of all) {
      if (
        belongsToOrganization(item, orgId)
        && item.status === 'synced'
        && new Date(item.synced_at || item.created_at).getTime() < cutoff
      ) {
        await tx.store.delete(item.id as never);
      }
    }
    await tx.done;
  }
}

export async function clearAllData(): Promise<void> {
  const db = await getDB();
  await db.clear('pending_batches');
  await db.clear('pending_farms');
  await db.clear('pending_boundaries');
  await db.clear('pending_uploads');
  await db.clear('pending_ocr_jobs');
  await db.clear('id_mappings');
  await db.clear('cached_farms');
  await db.clear('cached_bags');
}

export type {
  QueueStatus,
  OrganizationId,
  PendingFarm,
  PendingBoundary,
  PendingUpload,
  PendingOcrJob,
  PendingBatch,
  PendingBag,
  ContributorEntry,
  IdMapping,
};
