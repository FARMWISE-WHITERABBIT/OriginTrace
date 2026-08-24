import {
  WHISP_API_BASE_URL,
  resolveWhispApiKey,
  submitWhispPlot,
  pollWhispStatus,
  normalizeWhispResult,
  queryWhispDeforestation,
} from '../lib/services/whisp-deforestation';
import nextEnv from '@next/env';

const { loadEnvConfig } = nextEnv;
loadEnvConfig(process.cwd());

const apiKey = resolveWhispApiKey();

function fail(message: string): never {
  console.error(`[whisp-live] ${message}`);
  process.exit(1);
}

// Same test polygon used in scripts/gfw-live-smoke.ts (Sumatra, Indonesia —
// a region with known tree-cover-loss activity, useful for exercising a
// non-trivial risk classification).
const polygon = {
  type: 'Polygon' as const,
  coordinates: [[
    [103.19732666015625, 0.5537709801264608],
    [103.24882507324219, 0.5647567848663363],
    [103.21277618408203, 0.5932511181408705],
    [103.19732666015625, 0.5537709801264608],
  ]],
};

async function main() {
  if (!apiKey) {
    fail('WHISP_API_KEY is required.');
  }

  console.log(`[whisp-live] base URL: ${WHISP_API_BASE_URL}`);
  console.log('[whisp-live] submitting plot...');
  const token = await submitWhispPlot(polygon, 'whisp-live-smoke-test', { apiKey, timeoutMs: 20000 });
  if (!token) {
    fail('submitWhispPlot returned no token — check the raw request/response above, or add temporary logging to submitWhispPlot to see the actual payload shape.');
  }
  console.log(`[whisp-live] token: ${token}`);

  console.log('[whisp-live] polling raw status endpoint directly (bypassing our parsing) to inspect the real shape...');
  const rawResponse = await fetch(`${WHISP_API_BASE_URL}/status/${encodeURIComponent(token)}`, {
    headers: { 'X-API-KEY': apiKey },
  });
  const rawText = await rawResponse.text();
  console.log(`[whisp-live] raw status response (HTTP ${rawResponse.status}):`);
  console.log(rawText.slice(0, 4000));

  console.log('[whisp-live] polling via our pollWhispStatus() + normalizeWhispResult()...');
  let resolved = false;
  for (let attempt = 0; attempt < 15 && !resolved; attempt++) {
    if (attempt > 0) await new Promise((r) => setTimeout(r, 4000));
    const status = await pollWhispStatus(token, { apiKey, timeoutMs: 20000 });
    console.log(`[whisp-live] attempt ${attempt + 1}: complete=${status.complete} errored=${status.errored} hasProperties=${!!status.properties}`);
    if (status.errored) {
      fail('WHISP job errored — see raw response above for the actual error shape.');
    }
    if (status.complete && status.properties) {
      console.log('[whisp-live] parsed properties:', JSON.stringify(status.properties, null, 2));
      const normalized = normalizeWhispResult(status.properties, 'cocoa');
      if (!normalized) {
        fail('normalizeWhispResult() could not find a recognizable risk column in the real response — RISK_COLUMNS_BY_COMMODITY / ALL_RISK_COLUMNS in lib/services/whisp-deforestation.ts need updating to match the real field names shown above.');
      }
      console.log('[whisp-live] normalized result:', JSON.stringify(normalized, null, 2));
      resolved = true;
    }
  }

  if (!resolved) {
    console.warn('[whisp-live] job did not resolve within the smoke test\'s attempt budget — this alone is not necessarily a bug (Earth Engine analysis can be slow), but confirms the pending-state path is worth testing against a real long-running job too.');
  }

  console.log('[whisp-live] running the full queryWhispDeforestation() orchestrator end-to-end...');
  const finalResult = await queryWhispDeforestation(polygon, 'cocoa', { apiKey, plotId: 'whisp-live-smoke-test-2' });
  if (!finalResult) {
    fail('queryWhispDeforestation() returned null — the full pipeline failed even though lower-level calls above may have worked. Compare against the raw response to see where it diverges.');
  }
  console.log('[whisp-live] ok');
  console.log(JSON.stringify(finalResult, null, 2));
}

main().catch((error) => {
  fail(error instanceof Error ? `${error.message}\n${error.stack}` : String(error));
});
