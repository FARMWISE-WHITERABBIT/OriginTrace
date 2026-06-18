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

OriginTrace is an offline-first application designed for field agents working in
remote areas with intermittent or zero connectivity. Data is captured locally in
IndexedDB and synchronized to Supabase when a connection is available.

---

## 2. Architecture

| Component | Technology | Responsibility |
|-----------|------------|----------------|
| **Local Storage** | IndexedDB (Dexie.js) | Stores `sync_queue` and `offline_cache`. |
| **Sync Service** | `lib/offline/sync-service.ts` | Orchestrates background synchronization. |
| **Service Worker** | `next-pwa` (Workbox) | Intercepts network requests and serves cached assets. |
| **Cache Warmer** | `components/cache-warmer.tsx` | Prefetches essential data (farmers, farms) on login. |
| **UI Indicator** | `components/offline-indicator.tsx` | Displays current connectivity and sync status. |

---

## 3. IndexedDB Stores

Defined in `lib/offline/sync-store.ts`:

- **`sync_queue`**: Stores pending `POST/PATCH/DELETE` operations.
- **`offline_cache`**: Read-only mirror of essential tables (farmers, farms, batches).
- **`metadata`**: Sync timestamps and versioning.

---

## 4. The Sync Workflow

1. **Capture**: App checks `navigator.onLine`. If offline, the operation is
   serialized and added to `sync_queue`.
2. **Detection**: `components/auto-sync.tsx` monitors connectivity changes.
3. **Trigger**: When online, `syncService.processQueue()` is called.
4. **Processing**: Operations are replayed to Supabase in FIFO order.
5. **Conflict Resolution**: If a sync fails due to a conflict, it is flagged
   for manual resolution in `/app/sync`.

---

## 5. Adding Offline Support to a Feature

### Step 1: Add to `offline_cache`
Update `cache-warmer.tsx` to include the new table in the initial prefetch.

### Step 2: Use the Sync Queue for Mutations
```typescript
import { syncQueue } from '@/lib/offline/sync-store';

async function saveData(data: any) {
  if (!navigator.onLine) {
    await syncQueue.add({
      endpoint: '/api/my-feature',
      method: 'POST',
      payload: data,
      timestamp: Date.now()
    });
    return { status: 'queued' };
  }
  // ... online fetch
}
```

---

## 6. Gotchas

- **Auto-sync Stub**: `components/auto-sync.tsx` is currently a minimal hook —
  ensure it is imported in the main layout.
- **Large Payloads**: Avoid storing large binary blobs (like images) directly
  in the `sync_queue` if possible; use a dedicated storage bucket and store
  the local URI instead.
- **Idempotency**: API endpoints must be idempotent to handle accidental
  duplicate syncs.
- **Order of Operations**: Sync queue is FIFO. Do not skip failed items; block
  the queue until the conflict is resolved or the item is skipped manually.
- **Service Worker Updates**: The PWA service worker is regenerated on every
  deploy. Users must refresh to see changes.
