import { expect, test, type BrowserContext, type Page } from '@playwright/test';
import { newAuthedPage, QA_SEED_SKIP_MESSAGE } from './helpers/qa-flows';

const SERVER_FARM_ID = '0f2f1714-19fb-41d3-a60d-7df4e97ab931';
const LOCAL_FARM_ID = 'farm-e2e-offline-1';
const LOCAL_BATCH_ID = 'batch-e2e-offline-1';

async function installSyncMocks(page: Page) {
  const seen: string[] = [];

  await page.route('**/api/sync-metrics', async (route) => {
    await route.fulfill({ json: { pendingConflicts: 0, unsyncedBags: 0, agentCount: 1 } });
  });

  await page.route('**/api/farms', async (route) => {
    if (route.request().method() !== 'POST') return route.fallback();
    seen.push('farms');
    await route.fulfill({
      json: {
        success: true,
        farm: {
          id: SERVER_FARM_ID,
          local_id: LOCAL_FARM_ID,
          farmer_name: 'Offline E2E Farmer',
          community: 'Offline Village',
          compliance_status: 'pending',
        },
      },
    });
  });

  await page.route(`**/api/farmers/${SERVER_FARM_ID}/files`, async (route) => {
    seen.push('uploads');
    await route.fulfill({
      json: {
        file: {
          id: 'file-e2e-1',
          file_type: 'id_document',
          file_url: 'https://example.test/id-document.jpg',
          verification_status: 'pending',
          created_at: new Date().toISOString(),
        },
      },
    });
  });

  await page.route('**/api/ocr', async (route) => {
    seen.push('ocr');
    await route.fulfill({
      json: {
        farmerName: 'Offline E2E Farmer',
        idNumber: '12345678901',
        confidence: 0.93,
        documentType: 'National ID',
      },
    });
  });

  await page.route(`**/api/farmers/${SERVER_FARM_ID}`, async (route) => {
    if (route.request().method() !== 'PATCH') return route.fallback();
    await route.fulfill({ json: { farm: { id: SERVER_FARM_ID, farmer_id: '12345678901' } } });
  });

  await page.route(`**/api/farms/${SERVER_FARM_ID}/boundary`, async (route) => {
    seen.push('boundaries');
    await route.fulfill({
      json: {
        success: true,
        farm: { id: SERVER_FARM_ID },
        result: { confidence_score: 88, confidence_level: 'high', flags: {}, analyzed_at: new Date().toISOString() },
      },
    });
  });

  await page.route('**/api/sync', async (route) => {
    if (route.request().method() === 'PUT') {
      seen.push('batches');
      await route.fulfill({
        json: {
          success: true,
          results: [{ local_id: LOCAL_BATCH_ID, status: 'synced', id: 'batch-server-1' }],
        },
      });
      return;
    }
    await route.fulfill({ json: { success: true, sync_status: {} } });
  });

  await page.exposeFunction('offlineSyncSeen', () => seen);
}

async function seedOfflineQueue(page: Page) {
  await page.evaluate(async ({ localFarmId, localBatchId }) => {
    function requestToPromise<T = IDBDatabase>(request: IDBRequest<T>): Promise<T> {
      return new Promise((resolve, reject) => {
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
    }

    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open('origintrace-offline', 6);
      request.onerror = () => reject(request.error);
      request.onupgradeneeded = () => {
        const db = request.result;
        const stores = [
          ['pending_batches', 'id'],
          ['pending_farms', 'id'],
          ['pending_boundaries', 'id'],
          ['pending_uploads', 'id'],
          ['pending_ocr_jobs', 'id'],
          ['id_mappings', 'local_id'],
          ['cached_farms', 'id'],
          ['cached_bags', 'id'],
        ] as const;
        for (const [name, keyPath] of stores) {
          if (!db.objectStoreNames.contains(name)) db.createObjectStore(name, { keyPath });
        }
      };
      request.onsuccess = () => resolve(request.result);
    });

    const now = new Date().toISOString();
    const tx = db.transaction(['pending_farms', 'pending_uploads', 'pending_ocr_jobs', 'pending_boundaries', 'pending_batches'], 'readwrite');

    await requestToPromise(tx.objectStore('pending_farms').put({
      id: localFarmId,
      local_id: localFarmId,
      org_id: 'offline-e2e-org',
      farmer_name: 'Offline E2E Farmer',
      community: 'Offline Village',
      status: 'pending',
      created_at: now,
    }));

    await requestToPromise(tx.objectStore('pending_uploads').put({
      id: 'upload-e2e-1',
      farm_id: localFarmId,
      local_farm_id: localFarmId,
      upload_kind: 'file',
      file_type: 'id_document',
      file_name: 'id-document.jpg',
      file_mime: 'image/jpeg',
      file_size: 12,
      blob: new Blob(['offline-id'], { type: 'image/jpeg' }),
      status: 'pending',
      created_at: now,
    }));

    await requestToPromise(tx.objectStore('pending_ocr_jobs').put({
      id: 'ocr-e2e-1',
      farm_id: localFarmId,
      local_farm_id: localFarmId,
      upload_id: 'upload-e2e-1',
      image_data: 'data:image/jpeg;base64,b2ZmbGluZS1pZA==',
      status: 'pending',
      created_at: now,
    }));

    await requestToPromise(tx.objectStore('pending_boundaries').put({
      id: 'boundary-e2e-1',
      farm_id: localFarmId,
      local_farm_id: localFarmId,
      boundary: {
        type: 'Polygon',
        coordinates: [[[3.9, 7.4], [3.91, 7.4], [3.91, 7.41], [3.9, 7.4]]],
      },
      area_hectares: 1.2,
      status: 'pending',
      created_at: now,
    }));

    await requestToPromise(tx.objectStore('pending_batches').put({
      id: 'queue-batch-e2e-1',
      local_id: localBatchId,
      batch_id: 'BAT-OFFLINE-E2E',
      farm_id: localFarmId,
      local_farm_id: localFarmId,
      farm_name: 'Offline E2E Farmer',
      commodity: 'cocoa',
      contributors: [{
        farm_id: localFarmId,
        local_farm_id: localFarmId,
        farmer_name: 'Offline E2E Farmer',
        community: 'Offline Village',
        bag_count: 1,
        weight_kg: 64,
      }],
      bags: [{ serial: '', weight: 64, grade: 'A', is_compliant: true }],
      collected_at: now,
      status: 'pending',
      created_at: now,
    }));

    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    });
    db.close();
  }, { localFarmId: LOCAL_FARM_ID, localBatchId: LOCAL_BATCH_ID });
}

test('field agent syncs queued offline farmer, files, OCR, boundary, and batch in order', async ({ browser }) => {
  let authed: Awaited<ReturnType<typeof newAuthedPage>>;
  try {
    authed = await newAuthedPage(browser, 'agent');
  } catch {
    test.skip(true, QA_SEED_SKIP_MESSAGE);
    return;
  }

    const { context, page } = authed;
  try {
    await installSyncMocks(page);
    await page.goto('/app/sync', { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle', { timeout: 30_000 }).catch(() => {});
    await expect(page.getByTestId('button-refresh')).toBeVisible({ timeout: 30_000 });
    await context.setOffline(true);
    await seedOfflineQueue(page);
    await page.getByTestId('button-refresh').click();
    await expect(page.getByTestId('text-stat-pending')).toHaveText('5');

    await context.setOffline(false);
    await page.getByTestId('button-sync-all').click();
    await expect(page.getByTestId('text-stat-pending')).toHaveText('0');
    await expect(page.getByTestId('text-stat-synced')).toHaveText('5');

    const seen = await page.evaluate(() => (window as unknown as { offlineSyncSeen: () => string[] }).offlineSyncSeen());
    expect(seen).toEqual(['farms', 'uploads', 'ocr', 'boundaries', 'batches']);
  } finally {
    await context.setOffline(false).catch(() => undefined);
    await context.close();
  }
});
