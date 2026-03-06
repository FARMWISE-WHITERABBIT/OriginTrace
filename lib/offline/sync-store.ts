import { openDB, DBSchema, IDBPDatabase } from 'idb';

interface PendingBatch {
  id: string;
  local_id: string;
  batch_id: string;
  farm_id: string;
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
  status: 'pending' | 'syncing' | 'synced' | 'error';
  error_message?: string;
  created_at: string;
  synced_at?: string;
  yield_photo_proof?: string;
}

interface ContributorEntry {
  farm_id: string;
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
    indexes: { 'by-status': string; 'by-date': string };
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
    };
  };
  cached_bags: {
    key: string;
    value: {
      id: string;
      serial: string;
      status: string;
      cached_at: string;
    };
  };
}

const DB_NAME = 'origintrace-offline';
const DB_VERSION = 4;

let dbInstance: IDBPDatabase<OriginTraceDB> | null = null;

export async function getDB(): Promise<IDBPDatabase<OriginTraceDB>> {
  if (dbInstance) return dbInstance;
  
  dbInstance = await openDB<OriginTraceDB>(DB_NAME, DB_VERSION, {
    upgrade(db, oldVersion) {
      if (!db.objectStoreNames.contains('pending_batches')) {
        const batchStore = db.createObjectStore('pending_batches', { keyPath: 'id' });
        batchStore.createIndex('by-status', 'status');
        batchStore.createIndex('by-date', 'created_at');
      }
      
      if ((db.objectStoreNames as DOMStringList).contains('sync_queue')) {
        (db as any).deleteObjectStore('sync_queue');
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

export function generateLocalId(): string {
  return `local-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

export async function saveBatchOffline(batch: Omit<PendingBatch, 'id' | 'status' | 'created_at'>): Promise<PendingBatch> {
  const db = await getDB();
  
  const newBatch: PendingBatch = {
    ...batch,
    id: generateLocalId(),
    status: 'pending',
    created_at: new Date().toISOString(),
  };
  
  await db.put('pending_batches', newBatch);
  return newBatch;
}

export async function getPendingBatches(): Promise<PendingBatch[]> {
  const db = await getDB();
  return db.getAllFromIndex('pending_batches', 'by-status', 'pending');
}

export async function getErrorBatches(): Promise<PendingBatch[]> {
  const db = await getDB();
  return db.getAllFromIndex('pending_batches', 'by-status', 'error');
}

export async function getAllBatches(): Promise<PendingBatch[]> {
  const db = await getDB();
  const batches = await db.getAll('pending_batches');
  return batches.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
}

export async function updateBatchStatus(
  id: string, 
  status: PendingBatch['status'], 
  error_message?: string
): Promise<void> {
  const db = await getDB();
  const batch = await db.get('pending_batches', id);
  
  if (batch) {
    batch.status = status;
    if (error_message) batch.error_message = error_message;
    if (status === 'synced') batch.synced_at = new Date().toISOString();
    if (status === 'pending') batch.error_message = undefined;
    await db.put('pending_batches', batch);
  }
}

export async function deleteSyncedBatches(): Promise<void> {
  const db = await getDB();
  const syncedBatches = await db.getAllFromIndex('pending_batches', 'by-status', 'synced');
  
  const tx = db.transaction('pending_batches', 'readwrite');
  for (const batch of syncedBatches) {
    await tx.store.delete(batch.id);
  }
  await tx.done;
}

export async function getSyncStats(): Promise<{
  pending: number;
  syncing: number;
  synced: number;
  error: number;
}> {
  try {
    const db = await getDB();
    const batches = await db.getAll('pending_batches');
    
    return {
      pending: batches.filter(b => b.status === 'pending').length,
      syncing: batches.filter(b => b.status === 'syncing').length,
      synced: batches.filter(b => b.status === 'synced').length,
      error: batches.filter(b => b.status === 'error').length,
    };
  } catch (error) {
    console.warn('Failed to get sync stats, attempting recovery:', error);
    await resetDB();
    return { pending: 0, syncing: 0, synced: 0, error: 0 };
  }
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

export async function cacheFarms(farms: any[]): Promise<void> {
  const db = await getDB();
  const tx = db.transaction('cached_farms', 'readwrite');
  
  for (const farm of farms) {
    await tx.store.put({
      id: farm.id,
      farmer_name: farm.farmer_name,
      community: farm.community,
      compliance_status: farm.compliance_status,
      cached_at: new Date().toISOString(),
      commodity: farm.commodity || undefined,
      area_hectares: farm.area_hectares || undefined,
    });
  }
  
  await tx.done;
}

export async function getCachedFarms(): Promise<any[]> {
  const db = await getDB();
  return db.getAll('cached_farms');
}

export async function cacheBags(bags: any[]): Promise<void> {
  const db = await getDB();
  const tx = db.transaction('cached_bags', 'readwrite');
  
  for (const bag of bags) {
    await tx.store.put({
      id: bag.id,
      serial: bag.serial,
      status: bag.status,
      cached_at: new Date().toISOString(),
    });
  }
  
  await tx.done;
}

export async function getCachedBags(): Promise<any[]> {
  const db = await getDB();
  return db.getAll('cached_bags');
}

export async function clearAllData(): Promise<void> {
  const db = await getDB();
  await db.clear('pending_batches');
  await db.clear('cached_farms');
  await db.clear('cached_bags');
}

export type { PendingBatch, PendingBag, ContributorEntry };
