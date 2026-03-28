---
name: offline-sync
description: >
  Use this skill when adding a new offline-capable feature, modifying the
  IndexedDB stores, debugging sync queue issues, working with the service
  worker, or implementing the cache warmer. Triggers for any mention of
  "offline", "IndexedDB", "sync queue", "service worker", "PWA", "background
  sync", "cache warmer", "works without internet", or "offline-first". Always
  use this skill before adding any feature that must work without a network
  connection — the sync architecture has strict patterns that must be followed.
---

# Offline Sync Skill

## 1. Overview

**Mission:** Field agents capture agricultural data (batches, contributors, bags) in remote areas. The platform uses two distinct IndexedDB stores to manage offline availability and background synchronization.

1. **`origintrace-offline`**: Manages the life cycle of pending data captured by the agent.
2. **`origintrace-cache`**: Stores reference data (farms, locations, commodities) for offline lookup.

---

## 2. Store Definitions (`lib/offline/sync-store.ts`)

### `origintrace-offline` (The Sync Queue)
Stores `pending_batches` with high granularity:
- `local_id`: Temporary ID generated via `generateLocalId()`.
- `status`: `pending` | `syncing` | `synced` | `error`.
- `contributors`: Array of farmer participation data.
- `bags`: Array of serial-tracked items with weights and grades.

### `origintrace-cache` (`lib/offline/offline-cache.ts`)
Stores reference data with TTL:
- `cached_locations`: States, LGAs, Villages.
- `cached_commodities`: Org-specific crop types.
- `cached_farms_full`: Full farm data including polygons.

---

## 3. The Offline Write Workflow

### Step 1 — Local Save
Use `saveBatchOffline(batch)` to persist to IndexedDB.
```typescript
const batch = await saveBatchOffline({
  batch_id, farm_id, contributors, bags, collected_at: new Date().toISOString()
});
```

### Step 2 — Background Sync
The `sync-service.ts` periodically reads `pending` batches and sends them to `/api/sync`.

### Step 3 — Response Handling
- **Success**: Call `updateBatchStatus(id, 'synced')`.
- **Error**: Call `updateBatchStatus(id, 'error', message)`.

---

## 4. The Cache Warmer (`lib/offline/offline-cache.ts`)

`warmCaches(orgId)` pre-populates reference data from multiple endpoints:
- `/api/locations`
- `/api/commodities`
- Supabase directly for `farms` (using client-side SDK).

---

## 5. Gotchas

- **DB Versioning**: Current version is `4` for `origintrace-offline`. If you modify the schema, increment `DB_VERSION` in `sync-store.ts`.
- **Dual Stores**: Don't mix sync items and cache items in the same DB. `sync-store.ts` only handles outbound data; `offline-cache.ts` only handles inbound reference data.
- **Local IDs**: Always use `generateLocalId()` for offline records to avoid collision with server UUIDs.
- **Auto-Sync**: Background sync is managed by the `auto-sync.tsx` component which pings the sync service when online.
- **Cache warmer runs on app focus, not only on login.** Call `warmCache()` in a `visibilitychange` listener to refresh stale data when the user returns to the tab.
