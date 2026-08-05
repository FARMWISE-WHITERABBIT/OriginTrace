import {
  GFW_TREE_COVER_LOSS_DATASET,
  GFW_TREE_COVER_LOSS_VERSION,
  getGfwFieldsUrl,
  queryGfwTreeCoverLoss,
  resolveGfwApiKey,
} from '../lib/services/gfw-deforestation';
import nextEnv from '@next/env';

const { loadEnvConfig } = nextEnv;
loadEnvConfig(process.cwd());

const apiKey = resolveGfwApiKey();
const origin = process.env.GFW_API_ORIGIN ?? 'http://localhost:5000';

function fail(message: string): never {
  console.error(`[gfw-live] ${message}`);
  process.exit(1);
}

async function main() {
  if (!apiKey) {
    fail('GFW_COMPANY_API_KEY or GFW_API_KEY is required. Create a Global Forest Watch API key, allowlist localhost, then rerun this command.');
  }

  const headers = {
    'x-api-key': apiKey,
    Origin: origin,
  };

  const fieldsResponse = await fetch(getGfwFieldsUrl(), { headers });
  if (!fieldsResponse.ok) {
    fail(`fields request failed: HTTP ${fieldsResponse.status} ${fieldsResponse.statusText}`);
  }

  const fieldsPayload = await fieldsResponse.json();
  const fieldsText = JSON.stringify(fieldsPayload);
  for (const requiredField of ['area__ha', 'umd_tree_cover_loss__year']) {
    if (!fieldsText.includes(requiredField)) {
      fail(`fields response did not include ${requiredField}`);
    }
  }

  const polygon = {
    type: 'Polygon' as const,
    coordinates: [[
      [103.19732666015625, 0.5537709801264608],
      [103.24882507324219, 0.5647567848663363],
      [103.21277618408203, 0.5932511181408705],
      [103.19732666015625, 0.5537709801264608],
    ]],
  };

  const result = await queryGfwTreeCoverLoss(polygon, { apiKey, origin, timeoutMs: 20000 });
  if (!result) {
    fail('tree cover loss query returned no normalized result');
  }

  if (!Number.isFinite(result.forest_loss_hectares) || !Number.isFinite(result.forest_loss_percentage)) {
    fail('normalized tree cover loss result is not numeric');
  }

  console.log('[gfw-live] ok');
  console.log(JSON.stringify({
    dataset: GFW_TREE_COVER_LOSS_DATASET,
    version: GFW_TREE_COVER_LOSS_VERSION,
    origin,
    forest_loss_hectares: result.forest_loss_hectares,
    forest_loss_percentage: result.forest_loss_percentage,
    risk_level: result.risk_level,
    deforestation_free: result.deforestation_free,
  }, null, 2));
}

main().catch((error) => {
  fail(error instanceof Error ? error.message : String(error));
});
