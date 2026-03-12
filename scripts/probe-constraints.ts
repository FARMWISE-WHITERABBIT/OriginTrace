import { createClient } from '@supabase/supabase-js';
const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';
const db = createClient(url, key, { auth: { persistSession: false } });

// Probe valid status values for collection_batches by attempting inserts
// with a fake FK that will fail on FK constraint (not status constraint)
// — if error mentions 'status_check' → invalid; if FK error → valid status
async function probeStatusValues(table: string, statuses: string[], extraCols: Record<string,any> = {}) {
  console.log(`\nProbing ${table}.status:`);
  for (const s of statuses) {
    const { error } = await db.from(table).insert({ ...extraCols, status: s }).select('id').single();
    if (!error) {
      // Actually inserted — delete it
      console.log(`  ✓ "${s}" VALID (inserted — will need cleanup)`);
    } else if (error.message.includes('status_check') || error.message.includes('check constraint')) {
      console.log(`  ✗ "${s}" INVALID — ${error.message.slice(0,80)}`);
    } else {
      // FK or other error — status value itself was accepted
      console.log(`  ✓ "${s}" VALID (rejected for other reason: ${error.message.slice(0,60)})`);
    }
  }
}

async function main() {
  await probeStatusValues('collection_batches',
    ['collecting','collected','completed','aggregated','shipped','dispatched','pending','processing','active'],
    { org_id: '00000000-0000-0000-0000-000000000000', farm_id: '00000000-0000-0000-0000-000000000000', agent_id: '00000000-0000-0000-0000-000000000000', total_weight: 0, bag_count: 0 }
  );

  await probeStatusValues('bags',
    ['unused','collected','processed','dispatched','active'],
    { org_id: '00000000-0000-0000-0000-000000000000', serial: 'TEST-PROBE', collection_batch_id: '00000000-0000-0000-0000-000000000000', weight_kg: 0 }
  );

  await probeStatusValues('digital_product_passports',
    ['draft','active','issued','revoked','published'],
    { org_id: '00000000-0000-0000-0000-000000000000', finished_good_id: '00000000-0000-0000-0000-000000000000' }
  );

  await probeStatusValues('shipments',
    ['draft','ready','review','blocked','shipped','cancelled','pending'],
    { org_id: '00000000-0000-0000-0000-000000000000', shipment_code: 'TEST', commodity: 'cocoa', destination_country: 'NG' }
  );

  // Also probe readiness_decision
  console.log('\nProbing shipments.readiness_decision:');
  for (const v of ['go','conditional_go','conditional','no_go','pending']) {
    const { error } = await db.from('shipments').insert({ org_id: '00000000-0000-0000-0000-000000000000', shipment_code: `TEST-${v}`, commodity: 'cocoa', destination_country: 'NG', readiness_decision: v }).select('id').single();
    if (error?.message.includes('check constraint') || error?.message.includes('readiness_decision')) {
      console.log(`  ✗ "${v}" INVALID`);
    } else {
      console.log(`  ✓ "${v}" VALID`);
    }
  }
}

main().catch(console.error);
