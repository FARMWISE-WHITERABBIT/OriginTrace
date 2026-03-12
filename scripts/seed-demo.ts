#!/usr/bin/env tsx
/**
 * OriginTrace Demo Seed Script
 * Usage:
 *   npm run seed:demo              — seed everything
 *   npm run seed:demo:wipe         — wipe demo data only
 *   npm run seed:demo:wipe && npm run seed:demo  — full reset + reseed
 *
 * All columns verified against supabase/schema.sql and supabase/migrations/
 * CHECK constraints honoured throughout.
 */

import { createClient } from '@supabase/supabase-js';
import { randomUUID } from 'crypto';

const WIPE      = process.argv.includes('--wipe');
const WIPE_ONLY = WIPE && !process.argv.includes('--seed');

const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL ?? '';
const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';
if (!url || !key) { console.error('Missing SUPABASE env vars'); process.exit(1); }

const db = createClient(url, key, { auth: { persistSession: false } });

// ─── Helpers ───────────────────────────────────────────────────────────────
const section = (t: string) => console.log(`\n▶  ${t}`);
const ok      = (msg: string) => console.log(`  ✓  ${msg}`);
const warn    = (msg: string) => console.log(`  ⚠  ${msg}`);
const fail    = (msg: string) => { console.error(`❌  ${msg}`); throw new Error(msg); };

const daysAgo = (n: number) => {
  const d = new Date(); d.setDate(d.getDate() - n); return d.toISOString();
};
const rnd = (a: number, b: number) => Math.floor(Math.random() * (b - a + 1)) + a;

async function ins<T = any>(table: string, data: any, label?: string): Promise<T[]> {
  const rows = Array.isArray(data) ? data : [data];
  const { data: result, error } = await db.from(table).insert(rows).select();
  if (error) { fail(`${table}: ${error.message}`); }
  ok(`${table}: ${result!.length} row(s)${label ? ` — ${label}` : ''}`);
  return result as T[];
}

// ─── Wipe ──────────────────────────────────────────────────────────────────
async function wipeDemoData() {
  section('Wiping demo data');
  const tryWipe = async (table: string) => {
    const { error } = await db.from(table).delete().neq('id', '00000000-0000-0000-0000-000000000000');
    if (error?.message?.includes('schema cache')) warn(`${table}: ${error.message}`);
    else if (error) warn(`${table}: ${error.message}`);
    else ok(`wiped ${table}`);
  };

  for (const t of [
    'pedigree_verification','supply_chain_links','cold_chain_logs','document_alerts',
    'audit_events','audit_logs','notifications','digital_product_passports','dds_exports',
    'compliance_documents','compliance_files','shipment_lot_items','shipment_lots',
    'shipment_outcomes','shipment_items','documents','contract_shipments','shipments',
    'finished_goods','processing_run_batches','processing_runs','bags','batch_contributions',
    'collection_batches','farm_conflicts','farm_certifications','farmer_inputs',
    'farmer_training','farmer_performance_ledger','farmer_accounts','yield_predictions',
    'farms','compliance_profiles','api_keys',
  ]) await tryWipe(t);

  // buyer_organizations
  await db.from('buyer_organizations').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  ok('wiped buyer_organizations');

  // tender_bids / tenders
  await db.from('tender_bids').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await db.from('tenders').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  ok('wiped tenders + bids');

  // contracts
  await db.from('contracts').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  ok('wiped contracts');

  // orgs + users
  const { data: demoOrg } = await db.from('organizations').select('id').eq('slug', 'demo-whiterabbit').single();
  const eId = (demoOrg as any)?.id;
  if (eId) {
    const { data: profiles } = await db.from('profiles').select('user_id').eq('org_id', eId);
    for (const p of (profiles || [])) await db.auth.admin.deleteUser((p as any).user_id);
    await db.from('profiles').delete().eq('org_id', eId);
    await db.from('organizations').delete().eq('id', eId);
    ok('wiped organizations + users');
  }

  const { data: allUsers } = await db.auth.admin.listUsers() as any;
  const buyerUser = (allUsers?.users || []).find((u: any) => u.email === 'demo.buyer@nibseurope-demo.com');
  if (buyerUser) { await db.auth.admin.deleteUser(buyerUser.id); ok('wiped buyer user'); }

  ok('Wipe complete.');
}

// ─── Seed ──────────────────────────────────────────────────────────────────
async function seed() {

  // ── 0. Pre-flight: check extended columns exist ───────────────────────────
  section('Pre-flight schema check');
  const schemaChecks: Array<[string, string]> = [
    ['collection_batches', 'batch_code'],
    ['collection_batches', 'yield_validated'],
    ['processing_runs',    'run_code'],
    ['processing_runs',    'mass_balance_valid'],
    ['finished_goods',     'pedigree_code'],
    ['digital_product_passports', 'dpp_code'],
    ['farm_conflicts',     'overlap_ratio'],
  ];
  let missingCols = false;
  for (const [table, col] of schemaChecks) {
    const { error } = await db.from(table).select(col).limit(0);
    if (error?.message?.includes(`Could not find the '${col}'`)) {
      warn(`MISSING: ${table}.${col} — run migrations/20260312_seed_schema_extensions.sql first`);
      missingCols = true;
    } else {
      ok(`${table}.${col} ✓`);
    }
  }
  if (missingCols) {
    console.error('\n❌  Schema extensions missing. Run migrations/20260312_seed_schema_extensions.sql in Supabase SQL Editor first.\n');
    process.exit(1);
  }

  // ── 1. Organizations ──────────────────────────────────────────────────────
  section('Organizations');
  // Columns: name, slug, subscription_status, subscription_tier
  const { data: existingOrg } = await db.from('organizations').select('id').eq('slug','demo-whiterabbit').single();
  let eId: string;
  if (existingOrg) {
    eId = (existingOrg as any).id;
    ok('organizations: upserted exporter');
  } else {
    const [org] = await ins('organizations', {
      name: 'WhiteRabbit Demo Co.', slug: 'demo-whiterabbit',
      subscription_status: 'active', subscription_tier: 'pro',
    }, 'exporter org');
    eId = (org as any).id;
  }

  // Buyer org
  const { data: existingBuyer } = await db.from('buyer_organizations').select('id').eq('slug','demo-nibseurope').maybeSingle();
  let bId: string;
  if (existingBuyer) {
    bId = (existingBuyer as any).id;
    ok('buyer_organizations: upserted buyer');
  } else {
    const [buyer] = await ins('buyer_organizations', {
      name: 'NibsEurope GmbH', slug: 'demo-nibseurope',
      country: 'Germany', email: 'procurement@nibseurope-demo.com',
    }, 'buyer org');
    bId = (buyer as any).id;
  }

  // ── 2. Users ──────────────────────────────────────────────────────────────
  section('Users');
  const PASS = 'Demo1234!';

  const getOrCreateUser = async (email: string, role: string, orgId: string, isBuyer = false) => {
    const { data: userList } = await db.auth.admin.listUsers() as any;
    const existing = (userList?.users || []).find((u: any) => u.email === email);
    if (existing) {
      ok(`exists: ${email}`);
      // Ensure profile exists
      await db.from('profiles').upsert({
        user_id: existing.id, org_id: isBuyer ? null : orgId,
        role, email, full_name: email.split('@')[0],
      }, { onConflict: 'user_id' });
      return existing.id;
    }
    const { data: created, error } = await db.auth.admin.createUser({
      email, password: PASS, email_confirm: true,
      user_metadata: { full_name: email.split('@')[0] },
    });
    if (error) fail(`createUser ${email}: ${error.message}`);
    await db.from('profiles').insert({
      user_id: created!.user.id, org_id: isBuyer ? null : orgId,
      role, email, full_name: email.split('@')[0],
    });
    ok(`created: ${email} (${role})`);
    return created!.user.id;
  };

  const adminId = await getOrCreateUser('demo.admin@origintrace-demo.com', 'org_admin', eId);
  const agentId = await getOrCreateUser('demo.agent@origintrace-demo.com', 'agent', eId);
  await getOrCreateUser('demo.buyer@nibseurope-demo.com', 'buyer_admin', eId, true);

  // ── 3. Compliance Profiles ────────────────────────────────────────────────
  section('Compliance Profiles');
  // CHECK: regulation_framework IN ('EUDR','FSMA_204','UK_Environment_Act','Lacey_Act_UFLPA','China_Green_Trade','UAE_Halal','custom')
  // CHECK: geo_verification_level IN ('basic','polygon','satellite')
  const [eudrProf] = await ins('compliance_profiles', {
    org_id: eId, name: 'EUDR Standard',
    destination_market: 'European Union', regulation_framework: 'EUDR',
    required_documents: ['due_diligence_statement','phytosanitary_certificate','certificate_of_origin'],
    geo_verification_level: 'polygon', min_traceability_depth: 3, is_default: true,
  }, 'EUDR');
  const [fsmaProf] = await ins('compliance_profiles', {
    org_id: eId, name: 'FSMA 204 Compliance',
    destination_market: 'United States', regulation_framework: 'FSMA_204',
    required_documents: ['fda_prior_notice','certificate_of_origin','phytosanitary_certificate'],
    geo_verification_level: 'basic', min_traceability_depth: 2,
  }, 'FSMA 204');
  const [ukProf] = await ins('compliance_profiles', {
    org_id: eId, name: 'UK Environment Act',
    destination_market: 'United Kingdom', regulation_framework: 'UK_Environment_Act',
    required_documents: ['due_diligence_statement','phytosanitary_certificate'],
    geo_verification_level: 'polygon', min_traceability_depth: 3,
  }, 'UK');

  // ── 4. Farms ──────────────────────────────────────────────────────────────
  section('Farms');
  // CHECK: compliance_status IN ('pending','approved','rejected')
  const farmDefs = [
    { name: 'Adebayo Ogunleke', phone: '+2348012345001', community: 'Oke-Odan, Ogun',      area: 3.2, status: 'approved', lat: 7.150, lng: 3.350 },
    { name: 'Folake Adeyemi',   phone: '+2348012345002', community: 'Ago-Iwoye, Ogun',     area: 5.1, status: 'approved', lat: 6.820, lng: 3.930 },
    { name: 'Emeka Nwosu',      phone: '+2348012345003', community: 'Oda, Ondo',            area: 2.8, status: 'approved', lat: 7.090, lng: 4.840 },
    { name: 'Chukwudi Eze',     phone: '+2348012345004', community: 'Ifon, Ondo',           area: 4.5, status: 'approved', lat: 7.190, lng: 5.590 },
    { name: 'Blessing Okafor',  phone: '+2348012345005', community: 'Oka, Ondo',            area: 6.0, status: 'approved', lat: 7.460, lng: 5.730 },
    { name: 'Ngozi Amadi',      phone: '+2348012345006', community: 'Afikpo, Cross River',  area: 3.7, status: 'approved', lat: 5.890, lng: 7.920 },
    { name: 'Taiwo Olanrewaju', phone: '+2348012345007', community: 'Idanre, Ondo',         area: 8.2, status: 'rejected', lat: 7.090, lng: 5.110,
      deforestation_check: { deforestation_free: false, risk_level: 'high', forest_loss_hectares: 1.4, forest_loss_percentage: 17, analysis_date: daysAgo(10), data_source: 'Global Forest Watch' } },
    { name: 'Sola Akinwale',    phone: '+2348012345008', community: 'Abigi, Ogun',          area: 2.1, status: 'pending',  lat: 6.580, lng: 4.230 },
  ];

  const farms = await ins('farms', farmDefs.map(f => ({
    org_id: eId, farmer_name: f.name, phone: f.phone, community: f.community,
    area_hectares: f.area, compliance_status: f.status, created_by: adminId,
    boundary: { type: 'Polygon', coordinates: [[[f.lng-0.002,f.lat-0.002],[f.lng+0.002,f.lat-0.002],[f.lng+0.002,f.lat+0.002],[f.lng-0.002,f.lat+0.002],[f.lng-0.002,f.lat-0.002]]] },
    deforestation_check: (f as any).deforestation_check || { deforestation_free: true, risk_level: 'low', forest_loss_hectares: 0, analysis_date: daysAgo(rnd(15,40)), data_source: 'Global Forest Watch' },
    created_at: daysAgo(rnd(60,120)),
  })), '8 farms');
  const [fA,fB,fC,fD,fE,fF,fG,fH] = farms;

  // ── 5. Collection Batches ─────────────────────────────────────────────────
  section('Collection Batches');
  // CHECK: status IN ('collecting','completed','aggregated','shipped')
  // NOTE: 'collected' and 'dispatched' are NOT valid — map to 'completed'/'aggregated'
  const batchDefs = [
    { farm: fA, code: 'WR-BCH-001', weight: 820,  bags: 41, grade: 'Grade 1', validated: true,  status: 'aggregated', daysBack: 50 },
    { farm: fB, code: 'WR-BCH-002', weight: 1250, bags: 63, grade: 'Grade 1', validated: true,  status: 'aggregated', daysBack: 48 },
    { farm: fC, code: 'WR-BCH-003', weight: 560,  bags: 28, grade: 'Grade 2', validated: true,  status: 'aggregated', daysBack: 45 },
    { farm: fD, code: 'WR-BCH-004', weight: 940,  bags: 47, grade: 'Grade 1', validated: true,  status: 'aggregated', daysBack: 40 },
    { farm: fE, code: 'WR-BCH-005', weight: 1100, bags: 55, grade: 'Grade 1', validated: true,  status: 'aggregated', daysBack: 38 },
    { farm: fF, code: 'WR-BCH-006', weight: 720,  bags: 36, grade: 'Grade 1', validated: true,  status: 'aggregated', daysBack: 35 },
    { farm: fA, code: 'WR-BCH-007', weight: 310,  bags: 16, grade: 'Grade 2', validated: false, status: 'collecting', daysBack: 20,
      flag: 'Weight per bag (19.4kg) exceeds Grade 2 benchmark (max 18kg). Manual verification required.' },
    { farm: fG, code: 'WR-BCH-008', weight: 1640, bags: 82, grade: 'Grade 2', validated: false, status: 'collecting', daysBack: 15,
      flag: 'Farm has active deforestation risk flag. Batch quarantined pending farm remediation.' },
    { farm: fH, code: 'WR-BCH-009', weight: 200,  bags: 10, grade: null,      validated: false, status: 'collecting', daysBack: 5 },
    { farm: fB, code: 'WR-BCH-010', weight: 880,  bags: 44, grade: 'Grade 1', validated: true,  status: 'completed',  daysBack: 10 },
    { farm: fC, code: 'WR-BCH-011', weight: 960,  bags: 48, grade: 'Grade 1', validated: true,  status: 'completed',  daysBack: 8 },
    { farm: fD, code: 'WR-BCH-012', weight: 740,  bags: 37, grade: 'Grade 1', validated: true,  status: 'completed',  daysBack: 6 },
  ];

  const batches = await ins('collection_batches', batchDefs.map(b => ({
    org_id: eId, farm_id: b.farm.id, agent_id: agentId,
    total_weight: b.weight, bag_count: b.bags, status: b.status,
    local_id: randomUUID(), collected_at: daysAgo(b.daysBack), synced_at: daysAgo(b.daysBack),
    notes: `${b.code} — ${b.grade || 'ungraded'} cocoa, ${b.weight}kg${(b as any).flag ? ' [FLAGGED]' : ''}`,
    // extended columns from migration 20260312_seed_schema_extensions.sql:
    batch_code: b.code, commodity: 'cocoa', grade: b.grade,
    yield_validated: b.validated, yield_flag_reason: (b as any).flag || null,
  })), '12 batches');

  // ── 6. Bags ───────────────────────────────────────────────────────────────
  section('Bags');
  // CHECK: status IN ('unused','collected','processed')
  // CHECK: grade IN ('A','B','C')
  // Columns: org_id, serial, collection_batch_id, status, weight_kg, grade, is_compliant
  // NOTE: no farm_id or batch_id — FK is collection_batch_id
  for (let i = 0; i < 6; i++) {
    const b = batchDefs[i];
    await ins('bags', Array.from({ length: b.bags }, (_, j) => ({
      org_id: eId,
      serial: `${b.code}-BAG-${String(j+1).padStart(3,'0')}`,
      collection_batch_id: batches[i].id,
      status: 'collected',
      weight_kg: +(b.weight / b.bags).toFixed(1),
      grade: b.grade === 'Grade 1' ? 'A' : 'B',  // schema only allows A/B/C
      is_compliant: true,
    })), `${b.bags} bags for ${b.code}`);
  }

  // ── 7. Processing Runs ────────────────────────────────────────────────────
  section('Processing Runs');
  const [run1] = await ins('processing_runs', {
    org_id: eId, run_code: 'WR-RUN-001',
    facility_name: 'WhiteRabbit Processing — Sagamu',
    facility_location: 'Sagamu, Ogun State, Nigeria',
    commodity: 'cocoa', input_weight_kg: 2630, output_weight_kg: 2265,
    recovery_rate: 86.1, mass_balance_valid: true,
    processed_at: daysAgo(35), created_by: adminId,
    notes: 'EU export batch. Grade 1/2 blend, sun-dried 7 days.',
  }, 'RUN-001 valid');

  const [run2] = await ins('processing_runs', {
    org_id: eId, run_code: 'WR-RUN-002',
    facility_name: 'WhiteRabbit Processing — Sagamu',
    facility_location: 'Sagamu, Ogun State, Nigeria',
    commodity: 'cocoa', input_weight_kg: 2040, output_weight_kg: 1815,
    recovery_rate: 88.9, mass_balance_valid: true,
    processed_at: daysAgo(28), created_by: adminId,
    notes: 'US export batch. Premium Grade 1 only.',
  }, 'RUN-002 valid');

  const [run3] = await ins('processing_runs', {
    org_id: eId, run_code: 'WR-RUN-003',
    facility_name: 'WhiteRabbit Processing — Sagamu',
    facility_location: 'Sagamu, Ogun State, Nigeria',
    commodity: 'cocoa', input_weight_kg: 720, output_weight_kg: 432,
    recovery_rate: 60.0, mass_balance_valid: false,
    processed_at: daysAgo(20), created_by: adminId,
    notes: 'UK batch — mass balance INVALID. 60% recovery rate below 75% threshold. Under investigation.',
  }, 'RUN-003 mass balance FAIL');

  await ins('processing_run_batches', [
    { processing_run_id: run1.id, collection_batch_id: batches[0].id, org_id: eId, weight_contribution_kg: 820 },
    { processing_run_id: run1.id, collection_batch_id: batches[1].id, org_id: eId, weight_contribution_kg: 1250 },
    { processing_run_id: run1.id, collection_batch_id: batches[2].id, org_id: eId, weight_contribution_kg: 560 },
    { processing_run_id: run2.id, collection_batch_id: batches[3].id, org_id: eId, weight_contribution_kg: 940 },
    { processing_run_id: run2.id, collection_batch_id: batches[4].id, org_id: eId, weight_contribution_kg: 1100 },
    { processing_run_id: run3.id, collection_batch_id: batches[5].id, org_id: eId, weight_contribution_kg: 720 },
  ], 'run-batch links');

  // ── 8. Finished Goods ─────────────────────────────────────────────────────
  section('Finished Goods');
  const fgBase = { org_id: eId, destination_country: 'Germany', buyer_company: 'NibsEurope GmbH', pedigree_verified: true, created_by: adminId };
  const [fg1] = await ins('finished_goods', { ...fgBase, processing_run_id: run1.id, pedigree_code: 'PED-WR-001', product_name: 'Certified Cocoa Beans — EU Grade', product_type: 'dried_beans', weight_kg: 2265, batch_number: 'FG-2026-001', lot_number: 'LOT-EU-001', production_date: daysAgo(35).slice(0,10), destination_country: 'Germany' }, 'FG1 EU');
  const [fg2] = await ins('finished_goods', { ...fgBase, processing_run_id: run2.id, pedigree_code: 'PED-WR-002', product_name: 'Premium Cocoa Beans — US Grade', product_type: 'dried_beans', weight_kg: 1815, batch_number: 'FG-2026-002', lot_number: 'LOT-US-001', production_date: daysAgo(28).slice(0,10), destination_country: 'United States', buyer_company: 'CacaoAmerica LLC' }, 'FG2 US');
  const [fg3] = await ins('finished_goods', { ...fgBase, processing_run_id: run3.id, pedigree_code: 'PED-WR-003', product_name: 'Cocoa Beans — UK Batch (HOLD)', product_type: 'dried_beans', weight_kg: 432,  batch_number: 'FG-2026-003', lot_number: 'LOT-UK-001', production_date: daysAgo(20).slice(0,10), destination_country: 'United Kingdom', buyer_company: 'BritishChoc Ltd', pedigree_verified: false }, 'FG3 UK HOLD');
  const [fg4] = await ins('finished_goods', { ...fgBase, processing_run_id: run1.id, pedigree_code: 'PED-WR-004', product_name: 'Certified Cocoa Beans — UAE Grade', product_type: 'dried_beans', weight_kg: 1200, batch_number: 'FG-2026-004', lot_number: 'LOT-UAE-001', production_date: daysAgo(30).slice(0,10), destination_country: 'United Arab Emirates', buyer_company: 'GulfChocolate FZCO' }, 'FG4 UAE');

  // ── 9. Digital Product Passports ──────────────────────────────────────────
  section('Digital Product Passports');
  // CHECK: status IN ('draft','active','revoked')
  // NOTE: 'issued' is NOT valid — use 'active'
  await ins('digital_product_passports', [
    {
      org_id: eId, finished_good_id: fg1.id, dpp_code: 'DPP-' + randomUUID().slice(0,8).toUpperCase(),
      product_category: 'dried_beans', origin_country: 'NG',
      sustainability_claims: { deforestation_free: true, eudr_compliant: true },
      certifications: ['Rainforest Alliance','EUDR-compliant'],
      processing_history: [{ run_code: 'WR-RUN-001', facility: 'WhiteRabbit Processing — Sagamu', input_kg: 2630, output_kg: 2265, recovery_rate: 86.1, processed_at: daysAgo(35) }],
      chain_of_custody: [{ stage: 'collection', actor: 'WhiteRabbit Demo Co.', date: daysAgo(50) }, { stage: 'processing', actor: 'WhiteRabbit Processing', date: daysAgo(35) }],
      regulatory_compliance: { pedigree_verified: true, mass_balance_valid: true, dds_submitted: true, total_smallholders: 3, total_farm_area_hectares: 11.1 },
      machine_readable_data: { '@context': 'https://schema.org', '@type': 'Product', name: 'Certified Cocoa Beans — EU Grade', countryOfOrigin: 'Nigeria' },
      passport_version: 1, status: 'active', issued_at: daysAgo(10), created_by: adminId,
    },
    {
      org_id: eId, finished_good_id: fg2.id, dpp_code: 'DPP-' + randomUUID().slice(0,8).toUpperCase(),
      product_category: 'dried_beans', origin_country: 'NG',
      sustainability_claims: { fsma_traceable: true, cte_records: 4 },
      certifications: ['UTZ Certified','FSMA-204-traceable'],
      processing_history: [{ run_code: 'WR-RUN-002', facility: 'WhiteRabbit Processing — Sagamu', input_kg: 2040, output_kg: 1815, recovery_rate: 88.9, processed_at: daysAgo(28) }],
      chain_of_custody: [{ stage: 'collection', actor: 'WhiteRabbit Demo Co.', date: daysAgo(40) }, { stage: 'processing', actor: 'WhiteRabbit Processing', date: daysAgo(28) }],
      regulatory_compliance: { pedigree_verified: true, mass_balance_valid: true, dds_submitted: false, total_smallholders: 2, total_farm_area_hectares: 9.6 },
      machine_readable_data: { '@context': 'https://schema.org', '@type': 'Product', name: 'Premium Cocoa Beans — US Grade', countryOfOrigin: 'Nigeria' },
      passport_version: 1, status: 'active', issued_at: daysAgo(8), created_by: adminId,
    },
    {
      org_id: eId, finished_good_id: fg3.id, dpp_code: 'DPP-' + randomUUID().slice(0,8).toUpperCase(),
      product_category: 'dried_beans', origin_country: 'NG',
      sustainability_claims: { mass_balance_hold: true },
      certifications: [],
      processing_history: [{ run_code: 'WR-RUN-003', facility: 'WhiteRabbit Processing — Sagamu', input_kg: 720, output_kg: 432, recovery_rate: 60.0, processed_at: daysAgo(20) }],
      chain_of_custody: [{ stage: 'collection', actor: 'WhiteRabbit Demo Co.', date: daysAgo(35) }, { stage: 'processing', actor: 'WhiteRabbit Processing', date: daysAgo(20) }],
      regulatory_compliance: { pedigree_verified: false, mass_balance_valid: false, dds_submitted: false },
      machine_readable_data: { '@context': 'https://schema.org', '@type': 'Product', name: 'Cocoa Beans — UK Batch (HOLD)', countryOfOrigin: 'Nigeria' },
      passport_version: 1, status: 'draft', issued_at: null, created_by: adminId,
    },
    {
      org_id: eId, finished_good_id: fg4.id, dpp_code: 'DPP-' + randomUUID().slice(0,8).toUpperCase(),
      product_category: 'dried_beans', origin_country: 'NG',
      sustainability_claims: { halal_certified: true, esma_compliant: true },
      certifications: ['Halal Certified','UAE ESMA'],
      processing_history: [{ run_code: 'WR-RUN-001', facility: 'WhiteRabbit Processing — Sagamu', input_kg: 2630, output_kg: 2265, recovery_rate: 86.1, processed_at: daysAgo(35) }],
      chain_of_custody: [{ stage: 'collection', actor: 'WhiteRabbit Demo Co.', date: daysAgo(50) }, { stage: 'processing', actor: 'WhiteRabbit Processing', date: daysAgo(35) }],
      regulatory_compliance: { pedigree_verified: true, mass_balance_valid: true, dds_submitted: false },
      machine_readable_data: { '@context': 'https://schema.org', '@type': 'Product', name: 'Certified Cocoa Beans — UAE Grade', countryOfOrigin: 'Nigeria' },
      passport_version: 1, status: 'active', issued_at: daysAgo(7), created_by: adminId,
    },
  ], '4 DPPs');

  // ── 10. Shipments ─────────────────────────────────────────────────────────
  section('Shipments');
  // CHECK: status IN ('draft','ready','shipped','cancelled')
  // CHECK: readiness_decision IN ('go','conditional_go','no_go','pending')
  // NOTE: 'review'/'blocked' → 'ready'/'draft'; 'conditional' → 'conditional_go'
  // Columns: org_id, shipment_code, commodity, compliance_profile_id,
  //          destination_country, destination_port, readiness_score, readiness_decision,
  //          status, risk_flags, score_breakdown, buyer_company, buyer_contact,
  //          target_regulations, notes, estimated_ship_date, created_by
  // NOTE: doc_status, storage_controls, remediation_items do NOT exist in schema
  const [ship1,ship2,ship3,ship4] = await ins('shipments', [
    {
      org_id: eId, shipment_code: 'WR-SHP-2026-001', status: 'ready',
      destination_country: 'Germany', destination_port: 'Hamburg', commodity: 'Cocoa Beans',
      buyer_company: 'NibsEurope GmbH', buyer_contact: 'demo.buyer@nibseurope-demo.com',
      target_regulations: ['EUDR','Rainforest Alliance'], estimated_ship_date: daysAgo(-14),
      compliance_profile_id: eudrProf.id, readiness_score: 91, readiness_decision: 'go',
      risk_flags: [], score_breakdown: [{ name:'Traceability',score:95 },{ name:'Documentation',score:90 },{ name:'Deforestation',score:100 },{ name:'Regulatory',score:88 },{ name:'Operational',score:82 }],
      notes: 'EU shipment fully cleared. Ready for booking.', created_by: adminId,
    },
    {
      org_id: eId, shipment_code: 'WR-SHP-2026-002', status: 'ready',
      destination_country: 'United States', destination_port: 'New York', commodity: 'Cocoa Beans',
      buyer_company: 'CacaoAmerica LLC', buyer_contact: 'imports@cacaoamerica-demo.com',
      target_regulations: ['FSMA 204','Lacey Act'], estimated_ship_date: daysAgo(-21),
      compliance_profile_id: fsmaProf.id, readiness_score: 68, readiness_decision: 'conditional_go',
      risk_flags: [
        { severity: 'critical', category: 'Documentation', message: 'FDA Prior Notice not submitted. Required 8 hours before US port arrival.', is_hard_fail: true },
        { severity: 'warning',  category: 'Documentation', message: 'Bill of Lading not uploaded.', is_hard_fail: false },
      ],
      score_breakdown: [{ name:'Traceability',score:88 },{ name:'Documentation',score:40 },{ name:'Deforestation',score:95 },{ name:'Regulatory',score:55 },{ name:'Operational',score:70 }],
      notes: 'Awaiting FDA Prior Notice submission.', created_by: adminId,
    },
    {
      org_id: eId, shipment_code: 'WR-SHP-2026-003', status: 'draft',
      destination_country: 'United Kingdom', destination_port: 'Tilbury', commodity: 'Cocoa Beans',
      buyer_company: 'BritishChoc Ltd', buyer_contact: 'ops@britishchoc-demo.com',
      target_regulations: ['UK Environment Act'], estimated_ship_date: daysAgo(-7),
      compliance_profile_id: ukProf.id, readiness_score: 28, readiness_decision: 'no_go',
      risk_flags: [
        { severity: 'critical', category: 'Deforestation', message: 'Farm in supply chain has active deforestation risk. Shipment blocked.', is_hard_fail: true },
        { severity: 'critical', category: 'Mass Balance',  message: 'Processing Run WR-RUN-003 invalid mass balance (60% recovery, min 75% required).', is_hard_fail: true },
        { severity: 'warning',  category: 'Documentation', message: 'Due Diligence Statement missing.', is_hard_fail: false },
      ],
      score_breakdown: [{ name:'Traceability',score:40 },{ name:'Documentation',score:20 },{ name:'Deforestation',score:0 },{ name:'Regulatory',score:35 },{ name:'Operational',score:50 }],
      notes: 'Blocked. Resolve deforestation risk and mass balance error before resubmission.', created_by: adminId,
    },
    {
      org_id: eId, shipment_code: 'WR-SHP-2026-004', status: 'draft',
      destination_country: 'United Arab Emirates', destination_port: 'Jebel Ali', commodity: 'Cocoa Beans',
      buyer_company: 'GulfChocolate FZCO', buyer_contact: 'trade@gulfchoc-demo.com',
      target_regulations: ['UAE Halal','ESMA'], estimated_ship_date: daysAgo(-30),
      compliance_profile_id: null, readiness_score: null, readiness_decision: 'pending',
      risk_flags: [], score_breakdown: null,
      notes: 'Draft. Documents not yet uploaded.', created_by: adminId,
    },
  ], '4 shipments');

  // Shipment items (try — schema may differ)
  try {
    await ins('shipment_items', [
      { shipment_id: ship1.id, org_id: eId, item_type: 'finished_good', finished_good_id: fg1.id, weight_kg: (fg1 as any).weight_kg },
      { shipment_id: ship2.id, org_id: eId, item_type: 'finished_good', finished_good_id: fg2.id, weight_kg: (fg2 as any).weight_kg },
      { shipment_id: ship3.id, org_id: eId, item_type: 'finished_good', finished_good_id: fg3.id, weight_kg: (fg3 as any).weight_kg },
      { shipment_id: ship4.id, org_id: eId, item_type: 'finished_good', finished_good_id: fg4.id, weight_kg: (fg4 as any).weight_kg },
    ], 'shipment items');
  } catch (e: any) { warn(`shipment_items skipped: ${e.message}`); }

  // ── 11. Documents ─────────────────────────────────────────────────────────
  section('Documents');
  // CHECK: status IN ('active','expired','expiring_soon','archived')
  // CHECK: linked_entity_type IN ('shipment','farm','farmer','organization','batch')
  // Columns: org_id, title, document_type, file_url, status, linked_entity_type,
  //          linked_entity_id, notes, uploaded_by
  // NOTE: no 'shipment_id', 'type', or 'label' columns — use linked_entity_type/id + title + document_type
  await ins('documents', [
    { org_id: eId, title: 'Phytosanitary Certificate', document_type: 'phytosanitary_certificate', status: 'active', linked_entity_type: 'shipment', linked_entity_id: ship1.id, file_url: 'https://demo.origintrace.com/docs/phyto-001.pdf', uploaded_by: adminId },
    { org_id: eId, title: 'Due Diligence Statement',   document_type: 'due_diligence_statement',   status: 'active', linked_entity_type: 'shipment', linked_entity_id: ship1.id, file_url: 'https://demo.origintrace.com/docs/dds-001.pdf',   uploaded_by: adminId },
    { org_id: eId, title: 'Certificate of Origin',     document_type: 'certificate_of_origin',     status: 'active', linked_entity_type: 'shipment', linked_entity_id: ship1.id, file_url: 'https://demo.origintrace.com/docs/coo-001.pdf',   uploaded_by: adminId },
    { org_id: eId, title: 'Quality Certificate',       document_type: 'quality_certificate',       status: 'active', linked_entity_type: 'shipment', linked_entity_id: ship1.id, file_url: 'https://demo.origintrace.com/docs/qual-001.pdf',  uploaded_by: adminId },
    { org_id: eId, title: 'Phytosanitary Certificate', document_type: 'phytosanitary_certificate', status: 'active', linked_entity_type: 'shipment', linked_entity_id: ship2.id, file_url: 'https://demo.origintrace.com/docs/phyto-002.pdf', uploaded_by: adminId },
    { org_id: eId, title: 'Certificate of Origin',     document_type: 'certificate_of_origin',     status: 'active', linked_entity_type: 'shipment', linked_entity_id: ship2.id, file_url: 'https://demo.origintrace.com/docs/coo-002.pdf',   uploaded_by: adminId },
    { org_id: eId, title: 'Phytosanitary Certificate', document_type: 'phytosanitary_certificate', status: 'archived', linked_entity_type: 'shipment', linked_entity_id: ship3.id, file_url: 'https://demo.origintrace.com/docs/phyto-003.pdf', uploaded_by: adminId },
    { org_id: eId, title: 'Due Diligence Statement (DRAFT)', document_type: 'due_diligence_statement', status: 'archived', linked_entity_type: 'shipment', linked_entity_id: ship3.id, file_url: 'https://demo.origintrace.com/docs/dds-003-draft.pdf', uploaded_by: adminId },
  ], '8 documents');

  // ── 12. Contracts ─────────────────────────────────────────────────────────
  section('Contracts');
  // CHECK: status IN ('draft','active','fulfilled','cancelled')
  // Columns: buyer_org_id, exporter_org_id, contract_reference, commodity,
  //          quantity_mt, quality_requirements, required_certifications,
  //          delivery_deadline, destination_port, compliance_profile_id,
  //          status, price_per_unit, currency, notes, created_by
  // NOTE: no contract_code, title, price_per_mt_usd, incoterm, origin_port,
  //       quality_spec, start_date, end_date, or signed_at columns
  const [contract1] = await ins('contracts', {
    exporter_org_id: eId, buyer_org_id: bId,
    contract_reference: 'WR-CON-2026-001',
    status: 'active', commodity: 'Cocoa Beans', quantity_mt: 25,
    price_per_unit: 3800, currency: 'USD',
    quality_requirements: { min_grade: 'Grade 1', max_moisture: 7.5, min_fat: 55 },
    required_certifications: ['Rainforest Alliance'],
    delivery_deadline: daysAgo(-120), destination_port: 'Hamburg',
    compliance_profile_id: eudrProf.id,
    notes: 'Annual supply. Delivery in 5MT tranches.', created_by: adminId,
  }, 'contract 1 active');

  await ins('contracts', {
    exporter_org_id: eId, buyer_org_id: bId,
    contract_reference: 'WR-CON-2026-002',
    status: 'draft', commodity: 'Cocoa Beans', quantity_mt: 5,
    price_per_unit: 3950, currency: 'USD',
    quality_requirements: { min_grade: 'Grade 1', max_moisture: 7.0 },
    delivery_deadline: daysAgo(-37), destination_port: 'Hamburg',
    notes: 'Spot purchase. Pending signature.', created_by: adminId,
  }, 'contract 2 draft');

  try {
    await ins('contract_shipments', { contract_id: contract1.id, shipment_id: ship1.id, org_id: eId, linked_at: daysAgo(8) }, 'contract-shipment link');
  } catch (e: any) { warn(`contract_shipments: ${e.message}`); }

  // ── 13. Tenders + Bids ────────────────────────────────────────────────────
  section('Tenders');
  // CHECK: status IN ('open','closed','awarded','cancelled')
  // CHECK: visibility IN ('public','invited')
  // Columns: buyer_org_id, title, commodity, quantity_mt, target_price_per_mt,
  //          currency, delivery_deadline, destination_country, destination_port,
  //          quality_requirements, certifications_required, regulation_framework,
  //          status, visibility, invited_orgs, created_by, closes_at
  // NOTE: no target_price_usd, required_certifications, closing_date, or notes columns
  const [tender1] = await ins('tenders', {
    buyer_org_id: bId, title: 'Request for Cocoa Beans — 20MT Grade 1, Q2 2026',
    status: 'open', visibility: 'public', commodity: 'Cocoa Beans',
    quantity_mt: 20, target_price_per_mt: 3700, currency: 'USD',
    destination_port: 'Hamburg', destination_country: 'Germany',
    certifications_required: ['Rainforest Alliance','EUDR-compliant'],
    regulation_framework: 'EUDR',
    closes_at: daysAgo(-21), created_by: adminId,
  }, 'tender 1 public');

  await ins('tenders', {
    buyer_org_id: bId, title: 'Invited Tender — 10MT Premium Cocoa for Artisan Range',
    status: 'open', visibility: 'invited', invited_orgs: [eId], commodity: 'Cocoa Beans',
    quantity_mt: 10, target_price_per_mt: 4200, currency: 'USD',
    destination_port: 'Hamburg', destination_country: 'Germany',
    certifications_required: ['Rainforest Alliance','UTZ'],
    closes_at: daysAgo(-14), created_by: adminId,
  }, 'tender 2 invited');

  // CHECK: status IN ('submitted','shortlisted','awarded','rejected','withdrawn')
  // Columns: tender_id, exporter_org_id, price_per_mt, quantity_available_mt,
  //          delivery_date, notes, compliance_score, certifications, status, submitted_by
  // NOTE: no submitted_at column
  await ins('tender_bids', {
    tender_id: tender1.id, exporter_org_id: eId,
    price_per_mt: 3780, quantity_available_mt: 20, status: 'submitted',
    notes: 'Full EUDR traceability. DPPs for all lots. Ready to ship from Lagos.',
    submitted_by: adminId,
  }, 'bid on tender 1');

  // ── 14. Farm Conflicts ────────────────────────────────────────────────────
  section('Farm Conflicts');
  // Columns: farm_a_id, farm_b_id, overlap_ratio, status, resolved_by, resolution_notes
  // CHECK: status IN ('pending','resolved','dismissed')
  // NOTE: no org_id, conflict_type, overlap_area_hectares, notes, or detected_at columns
  try {
    await ins('farm_conflicts', {
      farm_a_id: fG.id, farm_b_id: fH.id,
      overlap_ratio: 0.037,
      status: 'pending',
      resolution_notes: 'GPS boundaries overlap ~0.3ha (~3.7% of Farm G). Field inspection required.',
    }, 'boundary overlap G↔H');
  } catch (e: any) { warn(`farm_conflicts: ${e.message}`); }

  // ── Done ─────────────────────────────────────────────────────────────────
  section('✅  Seed complete!');
  console.log(`
  Demo credentials (password: Demo1234!)
  ───────────────────────────────────────────────────────
  Exporter Admin:  demo.admin@origintrace-demo.com
  Exporter Agent:  demo.agent@origintrace-demo.com
  Buyer Admin:     demo.buyer@nibseurope-demo.com

  What to explore:
  /app/dashboard    overview
  /app/shipments    GO / CONDITIONAL / NO-GO / PENDING
  /app/farms        6 clean + 1 deforestation risk + 1 pending
  /app/batches      12 batches — yield flag #7, quarantined #8
  /app/processing   3 runs — mass balance FAIL on RUN-003
  /app/dpp          4 DPPs — 3 active, 1 draft/flagged
  `);
}

async function main() {
  if (WIPE) await wipeDemoData();
  if (!WIPE_ONLY) await seed();
}

main().catch(err => { console.error('\n❌  Fatal:', err.message || err); process.exit(1); });
