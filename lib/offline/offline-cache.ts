import { openDB, DBSchema, IDBPDatabase } from 'idb';

interface CachedLocation {
  type: 'state' | 'lga' | 'village';
  id: number;
  name: string;
  code?: string;
  state_id?: number;
  lga_id?: number;
}

interface CachedCommodity {
  id: string;
  name: string;
  org_id?: number;
}

interface CachedFarmFull {
  id: string;
  farmer_name: string;
  community: string;
  commodity?: string;
  area_hectares?: number;
  compliance_status: string;
  boundary?: any;
  phone?: string;
}

interface CachedOrgSettings {
  id: string;
  data: any;
  cached_at: string;
}

interface OfflineCacheDB extends DBSchema {
  cached_locations: {
    key: string;
    value: CachedLocation & { _key: string };
    indexes: { 'by-type': string };
  };
  cached_commodities: {
    key: string;
    value: CachedCommodity;
  };
  cached_farms_full: {
    key: string;
    value: CachedFarmFull & { cached_at: string; org_id: number };
    indexes: { 'by-org': number };
  };
  cache_meta: {
    key: string;
    value: { key: string; cached_at: string; ttl_ms: number };
  };
}

const CACHE_DB_NAME = 'origintrace-cache';
const CACHE_DB_VERSION = 1;
const DEFAULT_TTL = 24 * 60 * 60 * 1000;

let cacheDbInstance: IDBPDatabase<OfflineCacheDB> | null = null;

async function getCacheDB(): Promise<IDBPDatabase<OfflineCacheDB>> {
  if (cacheDbInstance) return cacheDbInstance;

  cacheDbInstance = await openDB<OfflineCacheDB>(CACHE_DB_NAME, CACHE_DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains('cached_locations')) {
        const store = db.createObjectStore('cached_locations', { keyPath: '_key' });
        store.createIndex('by-type', 'type');
      }
      if (!db.objectStoreNames.contains('cached_commodities')) {
        db.createObjectStore('cached_commodities', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('cached_farms_full')) {
        const store = db.createObjectStore('cached_farms_full', { keyPath: 'id' });
        store.createIndex('by-org', 'org_id');
      }
      if (!db.objectStoreNames.contains('cache_meta')) {
        db.createObjectStore('cache_meta', { keyPath: 'key' });
      }
    },
  });

  return cacheDbInstance;
}

async function isCacheValid(cacheKey: string): Promise<boolean> {
  try {
    const db = await getCacheDB();
    const meta = await db.get('cache_meta', cacheKey);
    if (!meta) return false;
    const age = Date.now() - new Date(meta.cached_at).getTime();
    return age < meta.ttl_ms;
  } catch {
    return false;
  }
}

async function setCacheMeta(cacheKey: string, ttl_ms: number = DEFAULT_TTL): Promise<void> {
  const db = await getCacheDB();
  await db.put('cache_meta', {
    key: cacheKey,
    cached_at: new Date().toISOString(),
    ttl_ms,
  });
}

export async function cacheLocations(
  states: any[],
  lgas: any[],
  villages: any[]
): Promise<void> {
  const db = await getCacheDB();
  const tx = db.transaction('cached_locations', 'readwrite');

  await tx.store.clear();

  for (const s of states) {
    await tx.store.put({ _key: `state-${s.id}`, type: 'state', id: s.id, name: s.name, code: s.code });
  }
  for (const l of lgas) {
    await tx.store.put({ _key: `lga-${l.id}`, type: 'lga', id: l.id, name: l.name, state_id: l.state_id });
  }
  for (const v of villages) {
    await tx.store.put({ _key: `village-${v.id}`, type: 'village', id: v.id, name: v.name, lga_id: v.lga_id });
  }

  await tx.done;
  await setCacheMeta('locations');
}

export async function getCachedLocations(): Promise<{
  states: any[];
  lgas: any[];
  villages: any[];
} | null> {
  try {
    const db = await getCacheDB();
    const all = await db.getAll('cached_locations');
    if (all.length === 0) return null;

    return {
      states: all.filter(l => l.type === 'state').map(({ _key, type, ...rest }) => rest),
      lgas: all.filter(l => l.type === 'lga').map(({ _key, type, ...rest }) => rest),
      villages: all.filter(l => l.type === 'village').map(({ _key, type, ...rest }) => rest),
    };
  } catch {
    return null;
  }
}

export async function cacheCommodities(commodities: any[]): Promise<void> {
  const db = await getCacheDB();
  const tx = db.transaction('cached_commodities', 'readwrite');
  await tx.store.clear();
  for (const c of commodities) {
    await tx.store.put({ id: c.id || c.name, name: c.name, org_id: c.org_id });
  }
  await tx.done;
  await setCacheMeta('commodities');
}

export async function getCachedCommodities(): Promise<any[] | null> {
  try {
    const db = await getCacheDB();
    const all = await db.getAll('cached_commodities');
    return all.length > 0 ? all : null;
  } catch {
    return null;
  }
}

export async function cacheFarmsFull(orgId: number, farms: any[]): Promise<void> {
  const db = await getCacheDB();
  const tx = db.transaction('cached_farms_full', 'readwrite');

  const existing = await tx.store.index('by-org').getAll(orgId);
  for (const f of existing) {
    await tx.store.delete(f.id);
  }

  for (const farm of farms) {
    await tx.store.put({
      id: farm.id,
      farmer_name: farm.farmer_name,
      community: farm.community,
      commodity: farm.commodity,
      area_hectares: farm.area_hectares,
      compliance_status: farm.compliance_status,
      boundary: farm.boundary,
      phone: farm.phone,
      cached_at: new Date().toISOString(),
      org_id: orgId,
    });
  }

  await tx.done;
  await setCacheMeta(`farms-${orgId}`);
}

export async function getCachedFarmsFull(orgId: number): Promise<any[] | null> {
  try {
    const db = await getCacheDB();
    const farms = await db.getAll('cached_farms_full');
    const orgFarms = farms.filter(f => f.org_id === orgId);
    return orgFarms.length > 0 ? orgFarms : null;
  } catch {
    return null;
  }
}

export async function purgeExpiredCaches(): Promise<void> {
  try {
    const db = await getCacheDB();
    const allMeta = await db.getAll('cache_meta');
    const now = Date.now();

    for (const meta of allMeta) {
      const age = now - new Date(meta.cached_at).getTime();
      if (age < meta.ttl_ms) continue;

      if (meta.key === 'locations') {
        await db.clear('cached_locations');
      } else if (meta.key === 'commodities') {
        await db.clear('cached_commodities');
      } else if (meta.key.startsWith('farms-')) {
        const orgId = parseInt(meta.key.replace('farms-', ''), 10);
        if (!isNaN(orgId)) {
          const tx = db.transaction('cached_farms_full', 'readwrite');
          const farmsInOrg = await tx.store.index('by-org').getAll(orgId);
          for (const farm of farmsInOrg) {
            await tx.store.delete(farm.id);
          }
          await tx.done;
        }
      }
      await db.delete('cache_meta', meta.key);
    }
  } catch {
    // Non-critical — swallow errors
  }
}

export async function isLocationsCacheValid(): Promise<boolean> {
  return isCacheValid('locations');
}

export async function isCommoditiesCacheValid(): Promise<boolean> {
  return isCacheValid('commodities');
}

export async function isFarmsCacheValid(orgId: number): Promise<boolean> {
  return isCacheValid(`farms-${orgId}`);
}

export async function warmCaches(orgId?: number): Promise<{
  locations: boolean;
  commodities: boolean;
  farms: boolean;
}> {
  const results = { locations: false, commodities: false, farms: false };

  try {
    const locRes = await fetch('/api/locations?all=true');
    if (locRes.ok) {
      const data = await locRes.json();
      await cacheLocations(data.states || [], data.lgas || [], data.villages || []);
      results.locations = true;
    }
  } catch {}

  try {
    const url = orgId ? `/api/commodities?org_id=${orgId}` : '/api/commodities?global_only=true';
    const comRes = await fetch(url);
    if (comRes.ok) {
      const data = await comRes.json();
      const commodities = data.commodities || data;
      if (Array.isArray(commodities)) {
        await cacheCommodities(commodities);
        results.commodities = true;
      }
    }
  } catch {}

  if (orgId) {
    try {
      const { createClient } = await import('@/lib/supabase/client');
      const supabase = createClient()!;
      const { data } = await supabase
        .from('farms')
        .select('id, farmer_name, community, commodity, area_hectares, compliance_status, boundary, phone')
        .eq('org_id', orgId)
        .order('farmer_name');
      if (data) {
        await cacheFarmsFull(orgId, data);
        results.farms = true;
      }
    } catch {}
  }

  return results;
}
