#!/usr/bin/env tsx
/**
 * OriginTrace Demo Seed Script — ALL columns verified against supabase/schema.sql
 * Usage:
 *   npm run seed:demo              — seed
 *   npm run seed:demo:wipe         — wipe only
 *   npm run seed:demo:wipe && npm run seed:demo  — reset + reseed
 */

import { createClient } from '@supabase/supabase-js';
import { randomUUID } from 'crypto';

const WIPE = process.argv.includes('--wipe');
const WIPE_ONLY = WIPE && !process.argv.includes('--seed');

const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL ?? '';
const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';
if (!url || !key) { console.error('Missing SUPABASE env vars'); process.exit(1); }
const db = createClient(url, key, { auth: { persistSession: false } });

const section = (t: string) => console.log(`\n▶  ${t}`);
const ok = (msg: string) => console.log(`  ✓  ${msg}`);
const warn = (msg: string) => console.log(`  ⚠  ${msg}`);
const fail = (msg: string): never => { console.error(`❌  ${msg}`); throw new Error(msg); };

const daysAgo = (n: number) => { const d = new Date(); d.setDate(d.getDate() - n); return d.toISOString(); };
const dateStr = (n: number) => daysAgo(n).slice(0, 10);
const rnd = (a: number, b: number) => Math.floor(Math.random() * (b - a + 1)) + a;

async function ins<T = any>(table: string, data: object | object[], label?: string): Promise<T[]> {
  const rows = Array.isArray(data) ? data : [data];
  const { data: result, error } = await db.from(table).insert(rows).select();
  if (error) fail(`${table}: ${error.message}`);
  ok(`${table}: ${result!.length} row(s)${label ? ` — ${label}` : ''}`);
  return result as T[];
}


async function wipeDemoData() {
  section('Wiping demo data');

  // Tables with UUID PKs
  const uuidTables = [
    'pedigree_verification','supply_chain_links','cold_chain_logs','document_alerts',
    'audit_events','audit_logs','notifications','digital_product_passports','dds_exports',
    'compliance_documents','compliance_files','shipment_lot_items','shipment_lots',
    'shipment_outcomes','shipment_items','documents','contract_shipments','shipments',
    'finished_goods','processing_run_batches','processing_runs','bags','batch_contributions',
    'collection_batches','farm_certifications','farmer_inputs','farmer_training',
    'farmer_performance_ledger','farmer_accounts','yield_predictions','farms',
    'compliance_profiles','api_keys',
  ];
  for (const t of uuidTables) {
    const { error } = await db.from(t).delete().neq('id', '00000000-0000-0000-0000-000000000000');
    if (error?.message?.includes('schema cache') || error?.message?.includes('does not exist')) warn(`${t}: ${error!.message}`);
    else if (error) warn(`${t}: ${error.message}`);
    else ok(`wiped ${t}`);
  }

  // farm_conflicts has SERIAL (bigint) PK - use gt(0) not neq(uuid)
  const { error: fcErr } = await db.from('farm_conflicts').delete().gt('id', 0);
  if (fcErr?.message?.includes('schema cache') || fcErr?.message?.includes('does not exist')) warn(`farm_conflicts: ${fcErr!.message}`);
  else if (fcErr) warn(`farm_conflicts: ${fcErr.message}`);
  else ok('wiped farm_conflicts');

  await db.from('tender_bids').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await db.from('tenders').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  ok('wiped tenders + bids');
  await db.from('contracts').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  ok('wiped contracts');
  await db.from('buyer_organizations').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  ok('wiped buyer_organizations');

  const { data: demoOrg } = await db.from('organizations').select('id').eq('slug', 'demo-whiterabbit').single();
  const eId = (demoOrg as any)?.id;
  if (eId) {
    const { data: profiles } = await db.from('profiles').select('user_id').eq('org_id', eId);
    for (const p of (profiles || [])) await db.auth.admin.deleteUser((p as any).user_id);
    await db.from('profiles').delete().eq('org_id', eId);
    await db.from('organizations').delete().eq('id', eId);
    ok('wiped organizations + users');
  }
  const { data: allUsersRes } = await db.auth.admin.listUsers() as any;
  const buyerUser = (allUsersRes?.users || []).find((u: any) => u.email === 'demo.buyer@nibseurope-demo.com');
  if (buyerUser) { await db.auth.admin.deleteUser(buyerUser.id); ok('wiped buyer user'); }
  ok('Wipe complete.');
}

async function seed() {

  // 0. Pre-flight
  section('Pre-flight schema check');
  const checks: [string, string][] = [
    ['collection_batches','batch_code'],['collection_batches','yield_validated'],
    ['processing_runs','run_code'],['processing_runs','mass_balance_valid'],
    ['finished_goods','pedigree_code'],['digital_product_passports','dpp_code'],
    ['farm_conflicts','overlap_ratio'],
  ];
  let missing = false;
  for (const [table, col] of checks) {
    const { error } = await db.from(table).select(col).limit(0);
    if (error?.message?.includes(`Could not find the '${col}'`)) { warn(`MISSING: ${table}.${col}`); missing = true; }
    else ok(`${table}.${col} ok`);
  }
  if (missing) { console.error('\nRun migrations/20260312_seed_schema_extensions.sql in Supabase SQL Editor first.\n'); process.exit(1); }

  // 1. Orgs
  section('Organizations');
  // organizations cols: name, slug, subscription_status, subscription_tier, commodities
  // CHECK subscription_status: active/grace_period/expired/cancelled/suspended
  // CHECK subscription_tier: starter/basic/pro/enterprise
  const { data: existingOrg } = await db.from('organizations').select('id').eq('slug','demo-whiterabbit').single();
  let eId: string;
  if (existingOrg) { eId = (existingOrg as any).id; ok('organizations: already exists'); }
  else {
    const [org] = await ins('organizations', { name: 'WhiteRabbit Demo Co.', slug: 'demo-whiterabbit', subscription_status: 'active', subscription_tier: 'pro', commodities: ['cocoa'] }, 'exporter org');
    eId = (org as any).id;
  }

  // buyer_organizations cols: name, slug, country, industry, contact_email
  // NOTE: no 'email' column — contact_email is the correct name
  const [buyerOrg] = await ins('buyer_organizations', { name: 'NibsEurope GmbH', slug: 'demo-nibseurope', country: 'Germany', industry: 'Food & Beverage', contact_email: 'procurement@nibseurope-demo.com' }, 'buyer org');
  const bId: string = (buyerOrg as any).id;

  // 2. Users
  section('Users');
  // profiles.role CHECK: admin/aggregator/agent/quality_manager/logistics_coordinator/compliance_officer/warehouse_supervisor/buyer/farmer
  // NOTE: 'org_admin' and 'buyer_admin' are INVALID - use 'admin' and 'buyer'
  // buyer_profiles.role CHECK: buyer_admin/buyer_viewer
  const PASS = 'Demo1234!';
  const getOrCreateUser = async (email: string, profileRole: string, orgId: string | null, buyerOrgId?: string): Promise<string> => {
    const { data: listRes } = await db.auth.admin.listUsers() as any;
    const existing = (listRes?.users || []).find((u: any) => u.email === email);
    let userId: string;
    if (existing) { userId = existing.id; ok(`exists: ${email}`); }
    else {
      const { data: created, error } = await db.auth.admin.createUser({ email, password: PASS, email_confirm: true, user_metadata: { full_name: email.split('@')[0] } });
      if (error) fail(`createUser ${email}: ${error.message}`);
      userId = created!.user.id;
      ok(`created: ${email} (${profileRole})`);
    }
    if (buyerOrgId) {
      await db.from('buyer_profiles').upsert({ user_id: userId, buyer_org_id: buyerOrgId, full_name: email.split('@')[0], role: 'buyer_admin' }, { onConflict: 'user_id' });
    } else {
      await db.from('profiles').upsert({ user_id: userId, org_id: orgId, role: profileRole, full_name: email.split('@')[0] }, { onConflict: 'user_id' });
    }
    return userId;
  };
  const adminId = await getOrCreateUser('demo.admin@origintrace-demo.com', 'admin', eId);
  const agentId = await getOrCreateUser('demo.agent@origintrace-demo.com', 'agent', eId);
  await getOrCreateUser('demo.buyer@nibseurope-demo.com', 'buyer', null, bId);

  // 3. Compliance Profiles
  section('Compliance Profiles');
  const [eudrProf] = await ins('compliance_profiles', { org_id: eId, name: 'EUDR Standard', destination_market: 'European Union', regulation_framework: 'EUDR', required_documents: ['due_diligence_statement','phytosanitary_certificate','certificate_of_origin'], required_certifications: ['Rainforest Alliance'], geo_verification_level: 'polygon', min_traceability_depth: 3, is_default: true }, 'EUDR');
  const [fsmaProf] = await ins('compliance_profiles', { org_id: eId, name: 'FSMA 204 Compliance', destination_market: 'United States', regulation_framework: 'FSMA_204', required_documents: ['fda_prior_notice','certificate_of_origin','phytosanitary_certificate'], required_certifications: [], geo_verification_level: 'basic', min_traceability_depth: 2 }, 'FSMA 204');
  const [ukProf]   = await ins('compliance_profiles', { org_id: eId, name: 'UK Environment Act', destination_market: 'United Kingdom', regulation_framework: 'UK_Environment_Act', required_documents: ['due_diligence_statement','phytosanitary_certificate'], required_certifications: [], geo_verification_level: 'polygon', min_traceability_depth: 3 }, 'UK');

  // 4. Farms
  section('Farms');
  // compliance_status CHECK: pending/approved/rejected
  // NOTE: no 'deforestation_check' col — use compliance_notes for risk info
  const farmDefs = [
    { name: 'Adebayo Ogunleke', phone: '+2348012345001', community: 'Oke-Odan, Ogun',     area: 3.2, status: 'approved', lat: 7.150, lng: 3.350 },
    { name: 'Folake Adeyemi',   phone: '+2348012345002', community: 'Ago-Iwoye, Ogun',    area: 5.1, status: 'approved', lat: 6.820, lng: 3.930 },
    { name: 'Emeka Nwosu',      phone: '+2348012345003', community: 'Oda, Ondo',           area: 2.8, status: 'approved', lat: 7.090, lng: 4.840 },
    { name: 'Chukwudi Eze',     phone: '+2348012345004', community: 'Ifon, Ondo',          area: 4.5, status: 'approved', lat: 7.190, lng: 5.590 },
    { name: 'Blessing Okafor',  phone: '+2348012345005', community: 'Oka, Ondo',           area: 6.0, status: 'approved', lat: 7.460, lng: 5.730 },
    { name: 'Ngozi Amadi',      phone: '+2348012345006', community: 'Afikpo, Cross River', area: 3.7, status: 'approved', lat: 5.890, lng: 7.920 },
    { name: 'Taiwo Olanrewaju', phone: '+2348012345007', community: 'Idanre, Ondo',        area: 8.2, status: 'rejected', lat: 7.090, lng: 5.110, notes: 'DEFORESTATION RISK: 1.4ha forest loss (17%). Source: Global Forest Watch.' },
    { name: 'Sola Akinwale',    phone: '+2348012345008', community: 'Abigi, Ogun',         area: 2.1, status: 'pending',  lat: 6.580, lng: 4.230 },
  ];
  const farms = await ins('farms', farmDefs.map(f => ({
    org_id: eId, farmer_name: f.name, phone: f.phone, community: f.community,
    area_hectares: f.area, compliance_status: f.status, compliance_notes: (f as any).notes || null, created_by: adminId,
    boundary: { type: 'Polygon', coordinates: [[[f.lng-0.002,f.lat-0.002],[f.lng+0.002,f.lat-0.002],[f.lng+0.002,f.lat+0.002],[f.lng-0.002,f.lat+0.002],[f.lng-0.002,f.lat-0.002]]] },
    created_at: daysAgo(rnd(60,120)),
  })), '8 farms');
  const [fA,fB,fC,fD,fE,fF,fG,fH] = farms;

  // 5. Collection Batches
  section('Collection Batches');
  // status CHECK: collecting/completed/aggregated/shipped
  // Extended cols (migration): batch_code, commodity, grade, yield_validated, yield_flag_reason
  const batchDefs = [
    { farm: fA, code: 'WR-BCH-001', weight: 820,  bags: 41, grade: 'Grade 1', validated: true,  status: 'shipped',    daysBack: 50 },
    { farm: fB, code: 'WR-BCH-002', weight: 1250, bags: 63, grade: 'Grade 1', validated: true,  status: 'shipped',    daysBack: 48 },
    { farm: fC, code: 'WR-BCH-003', weight: 560,  bags: 28, grade: 'Grade 2', validated: true,  status: 'shipped',    daysBack: 45 },
    { farm: fD, code: 'WR-BCH-004', weight: 940,  bags: 47, grade: 'Grade 1', validated: true,  status: 'shipped',    daysBack: 40 },
    { farm: fE, code: 'WR-BCH-005', weight: 1100, bags: 55, grade: 'Grade 1', validated: true,  status: 'shipped',    daysBack: 38 },
    { farm: fF, code: 'WR-BCH-006', weight: 720,  bags: 36, grade: 'Grade 1', validated: true,  status: 'shipped',    daysBack: 35 },
    { farm: fA, code: 'WR-BCH-007', weight: 310,  bags: 16, grade: 'Grade 2', validated: false, status: 'collecting', daysBack: 20, flag: 'Weight per bag (19.4kg) exceeds Grade 2 benchmark (max 18kg). Manual verification required.' },
    { farm: fG, code: 'WR-BCH-008', weight: 1640, bags: 82, grade: 'Grade 2', validated: false, status: 'collecting', daysBack: 15, flag: 'Farm has active deforestation risk flag. Batch quarantined pending farm remediation.' },
    { farm: fH, code: 'WR-BCH-009', weight: 200,  bags: 10, grade: null,      validated: false, status: 'collecting', daysBack: 5 },
    { farm: fB, code: 'WR-BCH-010', weight: 880,  bags: 44, grade: 'Grade 1', validated: true,  status: 'completed',  daysBack: 10 },
    { farm: fC, code: 'WR-BCH-011', weight: 960,  bags: 48, grade: 'Grade 1', validated: true,  status: 'completed',  daysBack: 8 },
    { farm: fD, code: 'WR-BCH-012', weight: 740,  bags: 37, grade: 'Grade 1', validated: true,  status: 'completed',  daysBack: 6 },
  ];
  const batches = await ins('collection_batches', batchDefs.map(b => ({
    org_id: eId, farm_id: (b.farm as any).id, agent_id: agentId,
    status: b.status, total_weight: b.weight, bag_count: b.bags,
    notes: `${b.code} — ${b.grade||'ungraded'} cocoa, ${b.weight}kg${(b as any).flag?' [FLAGGED]':''}`,
    local_id: randomUUID(), collected_at: daysAgo(b.daysBack), synced_at: daysAgo(b.daysBack),
    batch_code: b.code, commodity: 'cocoa', grade: b.grade,
    yield_validated: b.validated, yield_flag_reason: (b as any).flag||null,
  })), '12 batches');

  // 6. Bags
  section('Bags');
  // Cols: org_id, serial, collection_batch_id, status, weight_kg, grade, is_compliant
  // status CHECK: unused/collected/processed
  // grade CHECK: A/B/C  (NOT 'Grade 1'/'Grade 2')
  // NOTE: no farm_id, no batch_id - FK is collection_batch_id
  for (let i = 0; i < 6; i++) {
    const b = batchDefs[i];
    const batchRow = batches[i] as any;
    await ins('bags', Array.from({ length: b.bags }, (_, j) => ({
      org_id: eId,
      serial: `${b.code}-BAG-${String(j+1).padStart(3,'0')}`,
      collection_batch_id: batchRow.id,
      status: 'collected',
      weight_kg: +(b.weight/b.bags).toFixed(1),
      grade: b.grade === 'Grade 1' ? 'A' : 'B',
      is_compliant: true,
    })), `${b.bags} bags for ${b.code}`);
  }

  // 7. Processing Runs
  section('Processing Runs');
  const [run1] = await ins('processing_runs', { org_id: eId, run_code: 'WR-RUN-001', facility_name: 'WhiteRabbit Processing — Sagamu', facility_location: 'Sagamu, Ogun State, Nigeria', commodity: 'cocoa', input_weight_kg: 2630, output_weight_kg: 2265, recovery_rate: 86.1, mass_balance_valid: true, processed_at: daysAgo(35), created_by: adminId, notes: 'EU export batch. Grade 1/2 blend, sun-dried 7 days.' }, 'RUN-001 valid');
  const [run2] = await ins('processing_runs', { org_id: eId, run_code: 'WR-RUN-002', facility_name: 'WhiteRabbit Processing — Sagamu', facility_location: 'Sagamu, Ogun State, Nigeria', commodity: 'cocoa', input_weight_kg: 2040, output_weight_kg: 1815, recovery_rate: 88.9, mass_balance_valid: true, processed_at: daysAgo(28), created_by: adminId, notes: 'US export batch. Premium Grade 1 only.' }, 'RUN-002 valid');
  const [run3] = await ins('processing_runs', { org_id: eId, run_code: 'WR-RUN-003', facility_name: 'WhiteRabbit Processing — Sagamu', facility_location: 'Sagamu, Ogun State, Nigeria', commodity: 'cocoa', input_weight_kg: 720, output_weight_kg: 432, recovery_rate: 60.0, mass_balance_valid: false, processed_at: daysAgo(20), created_by: adminId, notes: 'UK batch — mass balance INVALID. 60% recovery below 75% threshold.' }, 'RUN-003 FAIL');

  // processing_run_batches cols: processing_run_id, collection_batch_id, weight_contribution_kg
  // NOTE: no org_id column
  await ins('processing_run_batches', [
    { processing_run_id: (run1 as any).id, collection_batch_id: (batches[0] as any).id, weight_contribution_kg: 820 },
    { processing_run_id: (run1 as any).id, collection_batch_id: (batches[1] as any).id, weight_contribution_kg: 1250 },
    { processing_run_id: (run1 as any).id, collection_batch_id: (batches[2] as any).id, weight_contribution_kg: 560 },
    { processing_run_id: (run2 as any).id, collection_batch_id: (batches[3] as any).id, weight_contribution_kg: 940 },
    { processing_run_id: (run2 as any).id, collection_batch_id: (batches[4] as any).id, weight_contribution_kg: 1100 },
    { processing_run_id: (run3 as any).id, collection_batch_id: (batches[5] as any).id, weight_contribution_kg: 720 },
  ], '6 run-batch links');

  // 8. Finished Goods
  section('Finished Goods');
  const fgBase = { org_id: eId, created_by: adminId };
  const [fg1] = await ins('finished_goods', { ...fgBase, processing_run_id: (run1 as any).id, pedigree_code: 'PED-WR-001', product_name: 'Certified Cocoa Beans — EU Grade', product_type: 'dried_beans', weight_kg: 2265, batch_number: 'FG-2026-001', lot_number: 'LOT-EU-001', production_date: dateStr(35), destination_country: 'Germany', buyer_company: 'NibsEurope GmbH', pedigree_verified: true }, 'FG1 EU');
  const [fg2] = await ins('finished_goods', { ...fgBase, processing_run_id: (run2 as any).id, pedigree_code: 'PED-WR-002', product_name: 'Premium Cocoa Beans — US Grade', product_type: 'dried_beans', weight_kg: 1815, batch_number: 'FG-2026-002', lot_number: 'LOT-US-001', production_date: dateStr(28), destination_country: 'United States', buyer_company: 'CacaoAmerica LLC', pedigree_verified: true }, 'FG2 US');
  const [fg3] = await ins('finished_goods', { ...fgBase, processing_run_id: (run3 as any).id, pedigree_code: 'PED-WR-003', product_name: 'Cocoa Beans — UK Batch (HOLD)', product_type: 'dried_beans', weight_kg: 432, batch_number: 'FG-2026-003', lot_number: 'LOT-UK-001', production_date: dateStr(20), destination_country: 'United Kingdom', buyer_company: 'BritishChoc Ltd', pedigree_verified: false, verification_notes: 'Mass balance invalid — under investigation.' }, 'FG3 UK HOLD');
  const [fg4] = await ins('finished_goods', { ...fgBase, processing_run_id: (run1 as any).id, pedigree_code: 'PED-WR-004', product_name: 'Certified Cocoa Beans — UAE Grade', product_type: 'dried_beans', weight_kg: 1200, batch_number: 'FG-2026-004', lot_number: 'LOT-UAE-001', production_date: dateStr(30), destination_country: 'United Arab Emirates', buyer_company: 'GulfChocolate FZCO', pedigree_verified: true }, 'FG4 UAE');

  // 9. DPPs
  section('Digital Product Passports');
  // status CHECK: draft/active/revoked  (NOT 'issued')
  await ins('digital_product_passports', [
    { org_id: eId, finished_good_id: (fg1 as any).id, dpp_code: 'DPP-'+randomUUID().slice(0,8).toUpperCase(), product_category: 'dried_beans', origin_country: 'NG', sustainability_claims: { deforestation_free: true, eudr_compliant: true }, certifications: ['Rainforest Alliance','EUDR-compliant'], processing_history: [{ run_code: 'WR-RUN-001', input_kg: 2630, output_kg: 2265, recovery_rate: 86.1 }], chain_of_custody: [{ stage: 'collection', actor: 'WhiteRabbit Demo Co.', date: daysAgo(50) },{ stage: 'processing', actor: 'WhiteRabbit Processing', date: daysAgo(35) }], regulatory_compliance: { pedigree_verified: true, mass_balance_valid: true, dds_submitted: true }, machine_readable_data: { '@context': 'https://schema.org', '@type': 'Product', name: 'Certified Cocoa Beans — EU Grade', countryOfOrigin: 'Nigeria' }, passport_version: 1, status: 'active', issued_at: daysAgo(10), created_by: adminId },
    { org_id: eId, finished_good_id: (fg2 as any).id, dpp_code: 'DPP-'+randomUUID().slice(0,8).toUpperCase(), product_category: 'dried_beans', origin_country: 'NG', sustainability_claims: { fsma_traceable: true, cte_records: 4 }, certifications: ['UTZ Certified','FSMA-204-traceable'], processing_history: [{ run_code: 'WR-RUN-002', input_kg: 2040, output_kg: 1815, recovery_rate: 88.9 }], chain_of_custody: [{ stage: 'collection', actor: 'WhiteRabbit Demo Co.', date: daysAgo(40) },{ stage: 'processing', actor: 'WhiteRabbit Processing', date: daysAgo(28) }], regulatory_compliance: { pedigree_verified: true, mass_balance_valid: true, dds_submitted: false }, machine_readable_data: { '@context': 'https://schema.org', '@type': 'Product', name: 'Premium Cocoa Beans — US Grade', countryOfOrigin: 'Nigeria' }, passport_version: 1, status: 'active', issued_at: daysAgo(8), created_by: adminId },
    { org_id: eId, finished_good_id: (fg3 as any).id, dpp_code: 'DPP-'+randomUUID().slice(0,8).toUpperCase(), product_category: 'dried_beans', origin_country: 'NG', sustainability_claims: { mass_balance_hold: true }, certifications: [], processing_history: [{ run_code: 'WR-RUN-003', input_kg: 720, output_kg: 432, recovery_rate: 60.0 }], chain_of_custody: [{ stage: 'collection', actor: 'WhiteRabbit Demo Co.', date: daysAgo(35) },{ stage: 'processing', actor: 'WhiteRabbit Processing', date: daysAgo(20) }], regulatory_compliance: { pedigree_verified: false, mass_balance_valid: false, dds_submitted: false }, machine_readable_data: { '@context': 'https://schema.org', '@type': 'Product', name: 'Cocoa Beans — UK Batch (HOLD)', countryOfOrigin: 'Nigeria' }, passport_version: 1, status: 'draft', issued_at: null, created_by: adminId },
    { org_id: eId, finished_good_id: (fg4 as any).id, dpp_code: 'DPP-'+randomUUID().slice(0,8).toUpperCase(), product_category: 'dried_beans', origin_country: 'NG', sustainability_claims: { halal_certified: true, esma_compliant: true }, certifications: ['Halal Certified','UAE ESMA'], processing_history: [{ run_code: 'WR-RUN-001', input_kg: 2630, output_kg: 2265, recovery_rate: 86.1 }], chain_of_custody: [{ stage: 'collection', actor: 'WhiteRabbit Demo Co.', date: daysAgo(50) },{ stage: 'processing', actor: 'WhiteRabbit Processing', date: daysAgo(35) }], regulatory_compliance: { pedigree_verified: true, mass_balance_valid: true, dds_submitted: false }, machine_readable_data: { '@context': 'https://schema.org', '@type': 'Product', name: 'Certified Cocoa Beans — UAE Grade', countryOfOrigin: 'Nigeria' }, passport_version: 1, status: 'active', issued_at: daysAgo(7), created_by: adminId },
  ], '4 DPPs');

  // 10. Shipments
  section('Shipments');
  // status CHECK: draft/ready/shipped/cancelled
  // readiness_decision CHECK: go/conditional_go/no_go/pending
  // estimated_ship_date is DATE (not TIMESTAMPTZ)
  // NOTE: no doc_status, storage_controls, or remediation_items columns
  const [ship1,ship2,ship3,ship4] = await ins('shipments', [
    { org_id: eId, shipment_code: 'WR-SHP-2026-001', status: 'ready', destination_country: 'Germany', destination_port: 'Hamburg', commodity: 'Cocoa Beans', buyer_company: 'NibsEurope GmbH', buyer_contact: 'demo.buyer@nibseurope-demo.com', target_regulations: ['EUDR','Rainforest Alliance'], estimated_ship_date: dateStr(-14), compliance_profile_id: (eudrProf as any).id, readiness_score: 91, readiness_decision: 'go', risk_flags: [], score_breakdown: [{name:'Traceability',score:95},{name:'Documentation',score:90},{name:'Deforestation',score:100},{name:'Regulatory',score:88},{name:'Operational',score:82}], notes: 'EU shipment fully cleared. Ready for booking.', created_by: adminId },
    { org_id: eId, shipment_code: 'WR-SHP-2026-002', status: 'ready', destination_country: 'United States', destination_port: 'New York', commodity: 'Cocoa Beans', buyer_company: 'CacaoAmerica LLC', buyer_contact: 'imports@cacaoamerica-demo.com', target_regulations: ['FSMA 204','Lacey Act'], estimated_ship_date: dateStr(-21), compliance_profile_id: (fsmaProf as any).id, readiness_score: 68, readiness_decision: 'conditional_go', risk_flags: [{severity:'critical',category:'Documentation',message:'FDA Prior Notice not submitted. Required 8 hours before US port arrival.',is_hard_fail:true},{severity:'warning',category:'Documentation',message:'Bill of Lading not uploaded.',is_hard_fail:false}], score_breakdown: [{name:'Traceability',score:88},{name:'Documentation',score:40},{name:'Deforestation',score:95},{name:'Regulatory',score:55},{name:'Operational',score:70}], notes: 'Awaiting FDA Prior Notice submission.', created_by: adminId },
    { org_id: eId, shipment_code: 'WR-SHP-2026-003', status: 'draft', destination_country: 'United Kingdom', destination_port: 'Tilbury', commodity: 'Cocoa Beans', buyer_company: 'BritishChoc Ltd', buyer_contact: 'ops@britishchoc-demo.com', target_regulations: ['UK Environment Act'], estimated_ship_date: dateStr(-7), compliance_profile_id: (ukProf as any).id, readiness_score: 28, readiness_decision: 'no_go', risk_flags: [{severity:'critical',category:'Deforestation',message:'Farm in supply chain has active deforestation risk.',is_hard_fail:true},{severity:'critical',category:'Mass Balance',message:'Processing Run WR-RUN-003 invalid mass balance (60% recovery, min 75% required).',is_hard_fail:true},{severity:'warning',category:'Documentation',message:'Due Diligence Statement missing.',is_hard_fail:false}], score_breakdown: [{name:'Traceability',score:40},{name:'Documentation',score:20},{name:'Deforestation',score:0},{name:'Regulatory',score:35},{name:'Operational',score:50}], notes: 'Blocked — resolve deforestation risk and mass balance error.', created_by: adminId },
    { org_id: eId, shipment_code: 'WR-SHP-2026-004', status: 'draft', destination_country: 'United Arab Emirates', destination_port: 'Jebel Ali', commodity: 'Cocoa Beans', buyer_company: 'GulfChocolate FZCO', buyer_contact: 'trade@gulfchoc-demo.com', target_regulations: ['UAE Halal','ESMA'], estimated_ship_date: dateStr(-30), compliance_profile_id: null, readiness_score: null, readiness_decision: 'pending', risk_flags: [], score_breakdown: null, notes: 'Draft. Documents not yet uploaded.', created_by: adminId },
  ], '4 shipments');

  // shipment_items cols: shipment_id, item_type, finished_good_id, weight_kg
  // item_type CHECK: batch/finished_good
  // NOTE: no org_id column
  try {
    await ins('shipment_items', [
      { shipment_id: (ship1 as any).id, item_type: 'finished_good', finished_good_id: (fg1 as any).id, weight_kg: (fg1 as any).weight_kg },
      { shipment_id: (ship2 as any).id, item_type: 'finished_good', finished_good_id: (fg2 as any).id, weight_kg: (fg2 as any).weight_kg },
      { shipment_id: (ship3 as any).id, item_type: 'finished_good', finished_good_id: (fg3 as any).id, weight_kg: (fg3 as any).weight_kg },
      { shipment_id: (ship4 as any).id, item_type: 'finished_good', finished_good_id: (fg4 as any).id, weight_kg: (fg4 as any).weight_kg },
    ], '4 shipment items');
  } catch (e: any) { warn(`shipment_items skipped: ${e.message}`); }

  // 11. Documents
  section('Documents');
  // status CHECK: active/expired/expiring_soon/archived
  // linked_entity_type CHECK: shipment/farm/farmer/organization/batch
  // NOTE: no shipment_id, type, or label columns
  await ins('documents', [
    { org_id: eId, title: 'Phytosanitary Certificate',       document_type: 'phytosanitary_certificate', status: 'active',   linked_entity_type: 'shipment', linked_entity_id: (ship1 as any).id, file_url: 'https://demo.origintrace.com/docs/phyto-001.pdf', uploaded_by: adminId },
    { org_id: eId, title: 'Due Diligence Statement',         document_type: 'due_diligence_statement',   status: 'active',   linked_entity_type: 'shipment', linked_entity_id: (ship1 as any).id, file_url: 'https://demo.origintrace.com/docs/dds-001.pdf',   uploaded_by: adminId },
    { org_id: eId, title: 'Certificate of Origin',           document_type: 'certificate_of_origin',     status: 'active',   linked_entity_type: 'shipment', linked_entity_id: (ship1 as any).id, file_url: 'https://demo.origintrace.com/docs/coo-001.pdf',   uploaded_by: adminId },
    { org_id: eId, title: 'Quality Certificate',             document_type: 'quality_certificate',       status: 'active',   linked_entity_type: 'shipment', linked_entity_id: (ship1 as any).id, file_url: 'https://demo.origintrace.com/docs/qual-001.pdf',  uploaded_by: adminId },
    { org_id: eId, title: 'Phytosanitary Certificate',       document_type: 'phytosanitary_certificate', status: 'active',   linked_entity_type: 'shipment', linked_entity_id: (ship2 as any).id, file_url: 'https://demo.origintrace.com/docs/phyto-002.pdf', uploaded_by: adminId },
    { org_id: eId, title: 'Certificate of Origin',           document_type: 'certificate_of_origin',     status: 'active',   linked_entity_type: 'shipment', linked_entity_id: (ship2 as any).id, file_url: 'https://demo.origintrace.com/docs/coo-002.pdf',   uploaded_by: adminId },
    { org_id: eId, title: 'Phytosanitary Certificate (REJ)', document_type: 'phytosanitary_certificate', status: 'archived', linked_entity_type: 'shipment', linked_entity_id: (ship3 as any).id, file_url: 'https://demo.origintrace.com/docs/phyto-003.pdf', uploaded_by: adminId },
    { org_id: eId, title: 'Due Diligence Statement (DRAFT)', document_type: 'due_diligence_statement',   status: 'archived', linked_entity_type: 'shipment', linked_entity_id: (ship3 as any).id, file_url: 'https://demo.origintrace.com/docs/dds-003-draft.pdf', uploaded_by: adminId },
  ], '8 documents');

  // 12. Contracts
  section('Contracts');
  // status CHECK: draft/active/fulfilled/cancelled
  // delivery_deadline is DATE
  // Cols: buyer_org_id, exporter_org_id, contract_reference, commodity, quantity_mt,
  //       quality_requirements (JSONB), required_certifications (JSONB), delivery_deadline (DATE),
  //       destination_port, compliance_profile_id, status, price_per_unit, currency, notes, created_by
  // NOTE: no contract_code, title, price_per_mt_usd, incoterm, origin_port, quality_spec, start_date, end_date, signed_at
  const [contract1] = await ins('contracts', { exporter_org_id: eId, buyer_org_id: bId, contract_reference: 'WR-CON-2026-001', status: 'active', commodity: 'Cocoa Beans', quantity_mt: 25, price_per_unit: 3800, currency: 'USD', quality_requirements: { min_grade: 'Grade 1', max_moisture: 7.5, min_fat: 55 }, required_certifications: ['Rainforest Alliance'], delivery_deadline: dateStr(-120), destination_port: 'Hamburg', compliance_profile_id: (eudrProf as any).id, notes: 'Annual supply. Delivery in 5MT tranches.', created_by: adminId }, 'contract 1 active');
  await ins('contracts', { exporter_org_id: eId, buyer_org_id: bId, contract_reference: 'WR-CON-2026-002', status: 'draft', commodity: 'Cocoa Beans', quantity_mt: 5, price_per_unit: 3950, currency: 'USD', quality_requirements: { min_grade: 'Grade 1', max_moisture: 7.0 }, delivery_deadline: dateStr(-37), destination_port: 'Hamburg', notes: 'Spot purchase. Pending signature.', created_by: adminId }, 'contract 2 draft');

  // contract_shipments cols: contract_id, shipment_id
  // NOTE: no org_id or linked_at columns
  try {
    await ins('contract_shipments', { contract_id: (contract1 as any).id, shipment_id: (ship1 as any).id }, 'contract-shipment link');
  } catch (e: any) { warn(`contract_shipments: ${e.message}`); }

  // 13. Tenders + Bids
  section('Tenders');
  // status CHECK: open/closed/awarded/cancelled
  // visibility CHECK: public/invited
  // Cols: buyer_org_id, title, commodity, quantity_mt, target_price_per_mt, currency,
  //       delivery_deadline (DATE), destination_country, destination_port,
  //       quality_requirements (JSONB), certifications_required (TEXT[]),
  //       regulation_framework, status, visibility, invited_orgs (UUID[]), created_by, closes_at
  // NOTE: no target_price_usd, required_certifications, closing_date, or notes
  const [tender1] = await ins('tenders', { buyer_org_id: bId, title: 'Request for Cocoa Beans — 20MT Grade 1, Q2 2026', status: 'open', visibility: 'public', commodity: 'Cocoa Beans', quantity_mt: 20, target_price_per_mt: 3700, currency: 'USD', destination_port: 'Hamburg', destination_country: 'Germany', certifications_required: ['Rainforest Alliance','EUDR-compliant'], regulation_framework: 'EUDR', closes_at: daysAgo(-21), created_by: adminId }, 'tender 1 public');
  await ins('tenders', { buyer_org_id: bId, title: 'Invited Tender — 10MT Premium Cocoa for Artisan Range', status: 'open', visibility: 'invited', invited_orgs: [eId], commodity: 'Cocoa Beans', quantity_mt: 10, target_price_per_mt: 4200, currency: 'USD', destination_port: 'Hamburg', destination_country: 'Germany', certifications_required: ['Rainforest Alliance','UTZ'], closes_at: daysAgo(-14), created_by: adminId }, 'tender 2 invited');

  // tender_bids cols: tender_id, exporter_org_id, price_per_mt, quantity_available_mt,
  //                   delivery_date (DATE), notes, compliance_score, certifications (TEXT[]),
  //                   status, submitted_by
  // status CHECK: submitted/shortlisted/awarded/rejected/withdrawn
  // NOTE: no submitted_at column
  await ins('tender_bids', { tender_id: (tender1 as any).id, exporter_org_id: eId, price_per_mt: 3780, quantity_available_mt: 20, status: 'submitted', notes: 'Full EUDR traceability. DPPs for all lots. Ready to ship from Lagos.', submitted_by: adminId }, 'bid on tender 1');

  // 14. Farm Conflicts
  section('Farm Conflicts');
  // id is SERIAL bigint (not UUID) — wipe uses gt('id', 0)
  // Cols: farm_a_id, farm_b_id, overlap_ratio, status, resolved_by, resolution_notes
  // status CHECK: pending/resolved/dismissed
  // NOTE: no org_id, conflict_type, overlap_area_hectares, notes, or detected_at
  try {
    await ins('farm_conflicts', { farm_a_id: (fG as any).id, farm_b_id: (fH as any).id, overlap_ratio: 0.037, status: 'pending', resolution_notes: 'GPS boundaries overlap ~0.3ha (~3.7% of Farm G area). Field inspection required.' }, 'boundary overlap G↔H');
  } catch (e: any) { warn(`farm_conflicts: ${e.message}`); }

  section('✅  Seed complete!');
  console.log(`
  Demo credentials (password: Demo1234!)
  ────────────────────────────────────────────
  Exporter Admin:  demo.admin@origintrace-demo.com
  Exporter Agent:  demo.agent@origintrace-demo.com
  Buyer Admin:     demo.buyer@nibseurope-demo.com

  /app/shipments    GO · CONDITIONAL · NO-GO · PENDING
  /app/farms        6 clean · 1 deforestation risk · 1 pending
  /app/batches      12 batches — flag #7, quarantined #8
  /app/processing   3 runs — mass balance FAIL on RUN-003
  /app/dpp          4 DPPs — 3 active, 1 draft
  `);
}

async function main() {
  if (WIPE) await wipeDemoData();
  if (!WIPE_ONLY) await seed();
}
main().catch(err => { console.error('\n❌  Fatal:', err.message || err); process.exit(1); });
