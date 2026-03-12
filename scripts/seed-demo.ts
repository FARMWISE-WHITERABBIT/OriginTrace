/**
 * OriginTrace Demo Data Seed Script
 * All column names verified against actual route handlers.
 *
 * Usage:
 *   npx tsx scripts/seed-demo.ts            # seed
 *   npx tsx scripts/seed-demo.ts --wipe     # wipe then re-seed
 *   npx tsx scripts/seed-demo.ts --wipe-only
 */
import { createClient } from '@supabase/supabase-js';
import { randomUUID } from 'crypto';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const SUPABASE_URL   = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_KEY    = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const DEMO_ORG_SLUG  = 'demo-whiterabbit';
const DEMO_BUYER_SLUG = 'demo-nibseurope';
const DEMO_PASSWORD  = 'Demo1234!';

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('Missing env vars'); process.exit(1);
}

const db = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const args = process.argv.slice(2);
const WIPE = args.includes('--wipe') || args.includes('--wipe-only');
const WIPE_ONLY = args.includes('--wipe-only');

function section(t: string) { console.log(`\n▶  ${t}`); }
function ok(m: string) { console.log(`  ✓  ${m}`); }
function warn(m: string) { console.log(`  ⚠  ${m}`); }

async function ins(table: string, rows: any | any[], label?: string): Promise<any[]> {
  const arr = Array.isArray(rows) ? rows : [rows];
  if (!arr.length) return [];
  const { data, error } = await db.from(table).insert(arr).select();
  if (error) { console.error(`❌  ${table}: ${error.message}`); throw error; }
  ok(`${table}: ${data!.length} row(s)${label ? ' — ' + label : ''}`);
  return data!;
}

function daysAgo(n: number) {
  return new Date(Date.now() - n * 86_400_000).toISOString();
}
function rnd(min: number, max: number) {
  return Math.round(Math.random() * (max - min) + min);
}

// ─── Wipe ──────────────────────────────────────────────────────────────────
async function wipeDemoData() {
  section('Wiping demo data');
  const { data: eOrg } = await db.from('organizations').select('id').eq('slug', DEMO_ORG_SLUG).maybeSingle();
  const { data: bOrg } = await db.from('buyer_organizations').select('id').eq('slug', DEMO_BUYER_SLUG).maybeSingle();
  const eId = eOrg?.id as string | undefined;
  const bId = bOrg?.id as string | undefined;
  if (!eId && !bId) { ok('Nothing to wipe.'); return; }

  if (eId) {
    for (const t of [
      'pedigree_verification','supply_chain_links','cold_chain_logs','document_alerts',
      'audit_events','audit_logs','notifications','digital_product_passports','dds_exports',
      'compliance_documents','compliance_files','shipment_lot_items','shipment_lots',
      'shipment_outcomes','shipment_items','documents','contract_shipments','shipments',
      'finished_goods','processing_run_batches','processing_runs','bags','batch_contributions',
      'collection_batches','farm_conflicts','farm_certifications','farmer_inputs',
      'farmer_training','farmer_performance_ledger','farmer_accounts','yield_predictions',
      'farms','compliance_profiles','api_keys',
    ]) {
      const { error } = await db.from(t).delete().eq('org_id', eId);
      if (error && !error.message.includes('does not exist')) warn(`${t}: ${error.message}`);
      else ok(`wiped ${t}`);
    }
    await db.from('tender_bids').delete().eq('exporter_org_id', eId);
    await db.from('contracts').delete().eq('exporter_org_id', eId);
  }

  if (bId) {
    const { data: tenderIds } = await db.from('tenders').select('id').eq('buyer_org_id', bId);
    if (tenderIds?.length) await db.from('tender_bids').delete().in('tender_id', tenderIds.map((r: any) => r.id));
    await db.from('tenders').delete().eq('buyer_org_id', bId);
    await db.from('contracts').delete().eq('buyer_org_id', bId);
    await db.from('buyer_profiles').delete().eq('buyer_org_id', bId);
    await db.from('buyer_organizations').delete().eq('id', bId);
    ok('wiped buyer_organizations');
  }

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
    console.error('\n❌  Schema extensions missing. Run this in Supabase SQL Editor:\n');
    console.error('    Copy and paste: migrations/20260312_seed_schema_extensions.sql\n');
    process.exit(1);
  }

  // ── 1. Organizations ──────────────────────────────────────────────────────
  section('Organizations');
  // Columns: name, slug, subscription_status, subscription_tier
  // Source: app/api/superadmin/create-org/route.ts
  let exporterOrg: any;
  { const { data, error } = await db.from('organizations').upsert({
      name: 'WhiteRabbit Demo Co.', slug: DEMO_ORG_SLUG,
      subscription_status: 'active', subscription_tier: 'pro',
    }, { onConflict: 'slug' }).select().single();
    if (error) { console.error(`❌  organizations: ${error.message}`); throw error; }
    exporterOrg = data; ok(`organizations: upserted exporter`);
  }

  // Columns: name, slug, country, industry, contact_email
  // Source: app/api/superadmin/create-buyer-org/route.ts
  let buyerOrg: any;
  { const { data, error } = await db.from('buyer_organizations').upsert({
      name: 'NibsEurope GmbH', slug: DEMO_BUYER_SLUG,
      country: 'Germany', industry: 'chocolate_manufacturing',
      contact_email: 'demo.buyer@nibseurope-demo.com',
    }, { onConflict: 'slug' }).select().single();
    if (error) { console.error(`❌  buyer_organizations: ${error.message}`); throw error; }
    buyerOrg = data; ok(`buyer_organizations: upserted buyer`);
  }

  const eId: string = exporterOrg.id;
  const bId: string = buyerOrg.id;

  // ── 2. Users ──────────────────────────────────────────────────────────────
  section('Users');
  async function ensureUser(email: string, role: string, fullName: string, isBuyer = false) {
    const { data: existing } = await db.auth.admin.listUsers() as any;
    const found = (existing?.users || []).find((u: any) => u.email === email);
    let uid: string;
    if (found) { uid = found.id; ok(`exists: ${email}`); }
    else {
      const { data, error } = await db.auth.admin.createUser({
        email, password: DEMO_PASSWORD, email_confirm: true,
        app_metadata: { app_role: role, org_id: isBuyer ? null : eId, is_superadmin: false },
        user_metadata: { full_name: fullName },
      });
      if (error) throw new Error(`createUser ${email}: ${error.message}`);
      uid = data.user.id; ok(`created: ${email} (${role})`);
    }
    if (!isBuyer) {
      await db.from('profiles').upsert(
        { user_id: uid, org_id: eId, role, full_name: fullName, email },
        { onConflict: 'user_id' });
    } else {
      await db.from('buyer_profiles').upsert(
        { user_id: uid, buyer_org_id: bId, role: 'buyer_admin', full_name: fullName },
        { onConflict: 'user_id' });
    }
    return uid;
  }

  const adminId = await ensureUser('demo.admin@origintrace-demo.com', 'admin', 'Demo Admin');
  const agentId = await ensureUser('demo.agent@origintrace-demo.com', 'agent', 'Demo Agent');
  await ensureUser('demo.buyer@nibseurope-demo.com', 'buyer_admin', 'Buyer Admin Demo', true);

  // ── 3. Compliance Profiles ────────────────────────────────────────────────
  section('Compliance Profiles');
  // Columns: org_id, name, destination_market, regulation_framework, required_documents,
  //          required_certifications, geo_verification_level, min_traceability_depth
  // Source: app/api/compliance-profiles/route.ts TEMPLATES
  const [eudrProf] = await ins('compliance_profiles', {
    org_id: eId, name: 'EU Cocoa — EUDR Standard',
    destination_market: 'European Union', regulation_framework: 'EUDR',
    required_documents: ['phytosanitary_certificate','due_diligence_statement','certificate_of_origin','quality_certificate'],
    required_certifications: ['Rainforest Alliance','UTZ'],
    geo_verification_level: 'polygon', min_traceability_depth: 2,
  }, 'EUDR');

  const [fsmaProf] = await ins('compliance_profiles', {
    org_id: eId, name: 'US Cocoa — FSMA 204',
    destination_market: 'United States', regulation_framework: 'FSMA_204',
    required_documents: ['phytosanitary_certificate','fda_prior_notice','certificate_of_origin','bill_of_lading'],
    required_certifications: [], geo_verification_level: 'basic', min_traceability_depth: 1,
  }, 'FSMA 204');

  const [ukProf] = await ins('compliance_profiles', {
    org_id: eId, name: 'UK Cocoa — Environment Act',
    destination_market: 'United Kingdom', regulation_framework: 'UK_Environment_Act',
    required_documents: ['phytosanitary_certificate','due_diligence_statement','certificate_of_origin'],
    required_certifications: ['Rainforest Alliance'],
    geo_verification_level: 'polygon', min_traceability_depth: 2,
  }, 'UK');

  // ── 4. Farms ──────────────────────────────────────────────────────────────
  section('Farms');
  // Columns: org_id, farmer_name, phone, community, area_hectares, compliance_status,
  //          created_by, boundary, deforestation_check
  // Source: app/api/farms/route.ts + farmCreateSchema
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
  // Columns: org_id, farm_id, agent_id, batch_code, commodity, grade, total_weight,
  //          bag_count, status, yield_validated, yield_flag_reason, local_id,
  //          collected_at, synced_at
  // Source: app/api/batches/route.ts
  const batchDefs = [
    { farm: fA, code: 'WR-BCH-001', weight: 820,  bags: 41, grade: 'Grade 1', validated: true,  status: 'completed',  daysBack: 50 },
    { farm: fB, code: 'WR-BCH-002', weight: 1250, bags: 63, grade: 'Grade 1', validated: true,  status: 'completed',  daysBack: 48 },
    { farm: fC, code: 'WR-BCH-003', weight: 560,  bags: 28, grade: 'Grade 2', validated: true,  status: 'completed',  daysBack: 45 },
    { farm: fD, code: 'WR-BCH-004', weight: 940,  bags: 47, grade: 'Grade 1', validated: true,  status: 'completed',  daysBack: 40 },
    { farm: fE, code: 'WR-BCH-005', weight: 1100, bags: 55, grade: 'Grade 1', validated: true,  status: 'completed',  daysBack: 38 },
    { farm: fF, code: 'WR-BCH-006', weight: 720,  bags: 36, grade: 'Grade 1', validated: true,  status: 'completed',  daysBack: 35 },
    { farm: fA, code: 'WR-BCH-007', weight: 310,  bags: 16, grade: 'Grade 2', validated: false, status: 'collecting', daysBack: 20,
      flag: 'Weight per bag (19.4kg) exceeds Grade 2 benchmark (max 18kg). Manual verification required.' },
    { farm: fG, code: 'WR-BCH-008', weight: 1640, bags: 82, grade: 'Grade 2', validated: false, status: 'collecting', daysBack: 15,
      flag: 'Farm has active deforestation risk flag. Batch quarantined pending farm remediation.' },
    { farm: fH, code: 'WR-BCH-009', weight: 200,  bags: 10, grade: null,      validated: false, status: 'collecting', daysBack: 5 },
    { farm: fB, code: 'WR-BCH-010', weight: 880,  bags: 44, grade: 'Grade 1', validated: true,  status: 'collected',  daysBack: 10 },
    { farm: fC, code: 'WR-BCH-011', weight: 960,  bags: 48, grade: 'Grade 1', validated: true,  status: 'collected',  daysBack: 8 },
    { farm: fD, code: 'WR-BCH-012', weight: 740,  bags: 37, grade: 'Grade 1', validated: true,  status: 'collected',  daysBack: 6 },
  ];

  const batches = await ins('collection_batches', batchDefs.map(b => ({
    org_id: eId, farm_id: b.farm.id, agent_id: agentId,
    // base columns (always exist)
    total_weight: b.weight, bag_count: b.bags, status: b.status,
    local_id: randomUUID(), collected_at: daysAgo(b.daysBack), synced_at: daysAgo(b.daysBack),
    // extended columns (added by migration 20260312_seed_schema_extensions.sql)
    batch_code: b.code, commodity: 'cocoa', grade: b.grade,
    yield_validated: b.validated, yield_flag_reason: (b as any).flag || null,
    notes: `${b.code} — ${b.grade || 'ungraded'} cocoa, ${b.weight}kg${(b as any).flag ? ' [FLAGGED]' : ''}`,
  })), '12 batches');

  // ── 6. Bags ───────────────────────────────────────────────────────────────
  section('Bags');
  // Columns: org_id, batch_id, farm_id, status, weight_kg
  // Source: app/api/bags/route.ts
  for (let i = 0; i < 6; i++) {
    const b = batchDefs[i];
    await ins('bags', Array.from({ length: b.bags }, () => ({
      org_id: eId, batch_id: batches[i].id, farm_id: batches[i].farm_id,
      status: 'dispatched', weight_kg: +(b.weight / b.bags).toFixed(1),
    })), `${b.bags} bags for ${b.code}`);
  }

  // ── 7. Processing Runs ────────────────────────────────────────────────────
  section('Processing Runs');
  // Columns: org_id, run_code, facility_name, facility_location, commodity,
  //          input_weight_kg, output_weight_kg, recovery_rate, mass_balance_valid,
  //          processed_at, notes, created_by
  // Source: app/api/processing-runs/route.ts
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
  // Columns: org_id, processing_run_id, pedigree_code, product_name, product_type,
  //          weight_kg, batch_number, lot_number, production_date, destination_country,
  //          buyer_company, pedigree_verified, created_by
  // Source: app/api/finished-goods/route.ts
  const mkDate = (d: number) => new Date(Date.now() - d*86400000).toISOString().split('T')[0];
  const [fg1] = await ins('finished_goods', {
    org_id: eId, processing_run_id: run1.id, pedigree_code: 'WR-PED-2026-001',
    product_name: 'Certified Cocoa Beans — EU Grade', product_type: 'dried_beans',
    weight_kg: 2265, batch_number: 'BATCH-EU-001', lot_number: 'LOT-EU-001',
    production_date: mkDate(35), destination_country: 'DE',
    buyer_company: 'NibsEurope GmbH', pedigree_verified: true, created_by: adminId,
  }, 'FG1 EU');

  const [fg2] = await ins('finished_goods', {
    org_id: eId, processing_run_id: run2.id, pedigree_code: 'WR-PED-2026-002',
    product_name: 'Premium Cocoa Beans — US Grade', product_type: 'dried_beans',
    weight_kg: 1815, batch_number: 'BATCH-US-001', lot_number: 'LOT-US-001',
    production_date: mkDate(28), destination_country: 'US',
    buyer_company: 'CacaoAmerica LLC', pedigree_verified: true, created_by: adminId,
  }, 'FG2 US');

  const [fg3] = await ins('finished_goods', {
    org_id: eId, processing_run_id: run3.id, pedigree_code: 'WR-PED-2026-003',
    product_name: 'Cocoa Beans — UK Batch (HOLD)', product_type: 'dried_beans',
    weight_kg: 432, batch_number: 'BATCH-UK-001', lot_number: 'LOT-UK-001',
    production_date: mkDate(20), destination_country: 'GB',
    buyer_company: 'BritishChoc Ltd', pedigree_verified: false, created_by: adminId,
  }, 'FG3 UK mass-balance-fail');

  const [fg4] = await ins('finished_goods', {
    org_id: eId, processing_run_id: run1.id, pedigree_code: 'WR-PED-2026-004',
    product_name: 'Certified Cocoa Beans — UAE Grade', product_type: 'dried_beans',
    weight_kg: 500, batch_number: 'BATCH-UAE-001', lot_number: 'LOT-UAE-001',
    production_date: mkDate(30), destination_country: 'AE',
    buyer_company: 'GulfChocolate FZCO', pedigree_verified: true, created_by: adminId,
  }, 'FG4 UAE');

  // ── 9. Digital Product Passports ──────────────────────────────────────────
  section('Digital Product Passports');
  // Columns: org_id, finished_good_id, dpp_code, product_category, origin_country,
  //          sustainability_claims, certifications, processing_history, chain_of_custody,
  //          regulatory_compliance, machine_readable_data, passport_version, status,
  //          issued_at, created_by
  // Source: app/api/dpp/route.ts dppData object
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
      passport_version: 1, status: 'issued', issued_at: daysAgo(10), created_by: adminId,
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
      passport_version: 1, status: 'issued', issued_at: daysAgo(8), created_by: adminId,
    },
    {
      org_id: eId, finished_good_id: fg3.id, dpp_code: 'DPP-' + randomUUID().slice(0,8).toUpperCase(),
      product_category: 'dried_beans', origin_country: 'NG',
      sustainability_claims: { mass_balance_hold: true },
      certifications: [],
      processing_history: [{ run_code: 'WR-RUN-003', facility: 'WhiteRabbit Processing — Sagamu', input_kg: 720, output_kg: 432, recovery_rate: 60.0, processed_at: daysAgo(20) }],
      chain_of_custody: [{ stage: 'collection', actor: 'WhiteRabbit Demo Co.', date: daysAgo(35) }, { stage: 'processing', actor: 'WhiteRabbit Processing', date: daysAgo(20) }],
      regulatory_compliance: { pedigree_verified: false, mass_balance_valid: false, dds_submitted: false, total_smallholders: 1, total_farm_area_hectares: 3.7 },
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
      regulatory_compliance: { pedigree_verified: true, mass_balance_valid: true, dds_submitted: false, total_smallholders: 3, total_farm_area_hectares: 11.1 },
      machine_readable_data: { '@context': 'https://schema.org', '@type': 'Product', name: 'Certified Cocoa Beans — UAE Grade', countryOfOrigin: 'Nigeria' },
      passport_version: 1, status: 'issued', issued_at: daysAgo(7), created_by: adminId,
    },
  ], '4 DPPs');

  // ── 10. Shipments ─────────────────────────────────────────────────────────
  section('Shipments');
  // Columns: org_id, shipment_code, status, destination_country, destination_port,
  //          commodity, buyer_company, buyer_contact, target_regulations,
  //          estimated_ship_date, compliance_profile_id, readiness_score,
  //          readiness_decision, doc_status, storage_controls, risk_flags,
  //          remediation_items, score_breakdown, notes
  // Source: app/api/shipments/[id]/route.ts update block

  const [ship1,ship2,ship3,ship4] = await ins('shipments', [
    {
      org_id: eId, shipment_code: 'WR-SHP-2026-001', status: 'ready',
      destination_country: 'Germany', destination_port: 'Hamburg', commodity: 'Cocoa Beans',
      buyer_company: 'NibsEurope GmbH', buyer_contact: 'demo.buyer@nibseurope-demo.com',
      target_regulations: ['EUDR','Rainforest Alliance'], estimated_ship_date: daysAgo(-14),
      compliance_profile_id: eudrProf.id, readiness_score: 91, readiness_decision: 'go',
      doc_status: { phytosanitary_certificate: true, due_diligence_statement: true, certificate_of_origin: true, quality_certificate: true },
      storage_controls: { temperature_logged: true, humidity_controlled: true },
      risk_flags: [], remediation_items: [],
      score_breakdown: [{ name:'Traceability',score:95 },{ name:'Documentation',score:90 },{ name:'Deforestation',score:100 },{ name:'Regulatory',score:88 },{ name:'Operational',score:82 }],
      notes: 'EU shipment fully cleared. Ready for booking.', created_at: daysAgo(8),
    },
    {
      org_id: eId, shipment_code: 'WR-SHP-2026-002', status: 'review',
      destination_country: 'United States', destination_port: 'New York', commodity: 'Cocoa Beans',
      buyer_company: 'CacaoAmerica LLC', buyer_contact: 'imports@cacaoamerica-demo.com',
      target_regulations: ['FSMA 204','Lacey Act'], estimated_ship_date: daysAgo(-21),
      compliance_profile_id: fsmaProf.id, readiness_score: 68, readiness_decision: 'conditional',
      doc_status: { phytosanitary_certificate: true, fda_prior_notice: false, certificate_of_origin: true, bill_of_lading: false },
      storage_controls: { temperature_logged: true, humidity_controlled: false },
      risk_flags: [
        { severity: 'critical', category: 'Documentation', message: 'FDA Prior Notice not submitted. Required 8 hours before US port arrival.', is_hard_fail: true },
        { severity: 'warning',  category: 'Documentation', message: 'Bill of Lading not uploaded.', is_hard_fail: false },
      ],
      remediation_items: [{ priority: 'urgent', title: 'Submit FDA Prior Notice', description: 'File FDA PN via Automated Broker Interface before vessel departure.', dimension: 'Documentation' }],
      score_breakdown: [{ name:'Traceability',score:88 },{ name:'Documentation',score:40 },{ name:'Deforestation',score:95 },{ name:'Regulatory',score:55 },{ name:'Operational',score:70 }],
      notes: 'Awaiting FDA Prior Notice submission.', created_at: daysAgo(6),
    },
    {
      org_id: eId, shipment_code: 'WR-SHP-2026-003', status: 'blocked',
      destination_country: 'United Kingdom', destination_port: 'Tilbury', commodity: 'Cocoa Beans',
      buyer_company: 'BritishChoc Ltd', buyer_contact: 'ops@britishchoc-demo.com',
      target_regulations: ['UK Environment Act'], estimated_ship_date: daysAgo(-7),
      compliance_profile_id: ukProf.id, readiness_score: 28, readiness_decision: 'no_go',
      doc_status: { phytosanitary_certificate: true, due_diligence_statement: false, certificate_of_origin: false },
      storage_controls: { temperature_logged: false, humidity_controlled: false },
      risk_flags: [
        { severity: 'critical', category: 'Deforestation', message: 'Farm in supply chain has active deforestation risk. Shipment blocked.', is_hard_fail: true },
        { severity: 'critical', category: 'Mass Balance',  message: 'Processing Run WR-RUN-003 invalid mass balance (60% recovery, min 75% required).', is_hard_fail: true },
        { severity: 'warning',  category: 'Documentation', message: 'Due Diligence Statement missing.', is_hard_fail: false },
      ],
      remediation_items: [
        { priority: 'urgent', title: 'Resolve deforestation risk on source farm', description: 'Farm remediation plan required.', dimension: 'Deforestation' },
        { priority: 'urgent', title: 'Investigate mass balance error', description: 'Review moisture measurements for WR-RUN-003.', dimension: 'Mass Balance' },
      ],
      score_breakdown: [{ name:'Traceability',score:40 },{ name:'Documentation',score:20 },{ name:'Deforestation',score:0 },{ name:'Regulatory',score:35 },{ name:'Operational',score:50 }],
      notes: 'Blocked. Resolve deforestation risk and mass balance error before resubmission.', created_at: daysAgo(4),
    },
    {
      org_id: eId, shipment_code: 'WR-SHP-2026-004', status: 'draft',
      destination_country: 'United Arab Emirates', destination_port: 'Jebel Ali', commodity: 'Cocoa Beans',
      buyer_company: 'GulfChocolate FZCO', buyer_contact: 'trade@gulfchoc-demo.com',
      target_regulations: ['UAE Halal','ESMA'], estimated_ship_date: daysAgo(-30),
      compliance_profile_id: null, readiness_score: null, readiness_decision: 'pending',
      doc_status: {}, storage_controls: {}, risk_flags: [], remediation_items: [], score_breakdown: null,
      notes: 'Draft. Documents not yet uploaded.', created_at: daysAgo(1),
    },
  ], '4 shipments');

  // Shipment items (try — schema may differ)
  try {
    await ins('shipment_items', [
      { shipment_id: ship1.id, org_id: eId, item_type: 'finished_good', finished_good_id: fg1.id, weight_kg: fg1.weight_kg },
      { shipment_id: ship2.id, org_id: eId, item_type: 'finished_good', finished_good_id: fg2.id, weight_kg: fg2.weight_kg },
      { shipment_id: ship3.id, org_id: eId, item_type: 'finished_good', finished_good_id: fg3.id, weight_kg: fg3.weight_kg },
      { shipment_id: ship4.id, org_id: eId, item_type: 'finished_good', finished_good_id: fg4.id, weight_kg: fg4.weight_kg },
    ], 'shipment items');
  } catch (e: any) { warn(`shipment_items skipped: ${e.message}`); }

  // ── 11. Documents ─────────────────────────────────────────────────────────
  section('Documents');
  await ins('documents', [
    { org_id: eId, shipment_id: ship1.id, type: 'phytosanitary_certificate', label: 'Phytosanitary Certificate', status: 'verified', uploaded_by: adminId, file_url: 'https://demo.origintrace.com/docs/phyto-001.pdf', created_at: daysAgo(7) },
    { org_id: eId, shipment_id: ship1.id, type: 'due_diligence_statement',   label: 'Due Diligence Statement',   status: 'verified', uploaded_by: adminId, file_url: 'https://demo.origintrace.com/docs/dds-001.pdf',   created_at: daysAgo(7) },
    { org_id: eId, shipment_id: ship1.id, type: 'certificate_of_origin',     label: 'Certificate of Origin',     status: 'verified', uploaded_by: adminId, file_url: 'https://demo.origintrace.com/docs/coo-001.pdf',   created_at: daysAgo(6) },
    { org_id: eId, shipment_id: ship1.id, type: 'quality_certificate',       label: 'Quality Certificate',       status: 'verified', uploaded_by: adminId, file_url: 'https://demo.origintrace.com/docs/qual-001.pdf',  created_at: daysAgo(6) },
    { org_id: eId, shipment_id: ship2.id, type: 'phytosanitary_certificate', label: 'Phytosanitary Certificate', status: 'verified', uploaded_by: adminId, file_url: 'https://demo.origintrace.com/docs/phyto-002.pdf', created_at: daysAgo(5) },
    { org_id: eId, shipment_id: ship2.id, type: 'certificate_of_origin',     label: 'Certificate of Origin',     status: 'verified', uploaded_by: adminId, file_url: 'https://demo.origintrace.com/docs/coo-002.pdf',   created_at: daysAgo(5) },
    { org_id: eId, shipment_id: ship3.id, type: 'phytosanitary_certificate', label: 'Phytosanitary Certificate', status: 'rejected', uploaded_by: adminId, file_url: 'https://demo.origintrace.com/docs/phyto-003.pdf', created_at: daysAgo(3) },
    { org_id: eId, shipment_id: ship3.id, type: 'due_diligence_statement',   label: 'Due Diligence Statement (DRAFT)', status: 'draft', uploaded_by: adminId, file_url: 'https://demo.origintrace.com/docs/dds-003-draft.pdf', created_at: daysAgo(2) },
  ], '8 documents');

  // ── 12. Contracts ─────────────────────────────────────────────────────────
  section('Contracts');
  const [contract1] = await ins('contracts', {
    exporter_org_id: eId, buyer_org_id: bId,
    contract_code: 'WR-CON-2026-001', title: 'Cocoa Supply Agreement Q1–Q2 2026',
    status: 'active', commodity: 'Cocoa Beans', quantity_mt: 25, price_per_mt_usd: 3800,
    incoterm: 'FOB', origin_port: 'Lagos', destination_port: 'Hamburg',
    quality_spec: { min_grade: 'Grade 1', max_moisture: 7.5, min_fat: 55 },
    start_date: daysAgo(60), end_date: daysAgo(-120), signed_at: daysAgo(60),
    notes: 'Annual supply. Delivery in 5MT tranches.', created_by: adminId,
  }, 'contract 1 active');

  await ins('contracts', {
    exporter_org_id: eId, buyer_org_id: bId,
    contract_code: 'WR-CON-2026-002', title: 'Spot Purchase — 5MT Cocoa March 2026',
    status: 'draft', commodity: 'Cocoa Beans', quantity_mt: 5, price_per_mt_usd: 3950,
    incoterm: 'CIF', origin_port: 'Lagos', destination_port: 'Hamburg',
    quality_spec: { min_grade: 'Grade 1', max_moisture: 7.0 },
    start_date: daysAgo(-7), end_date: daysAgo(-37), signed_at: null,
    notes: 'Spot purchase. Pending signature.', created_by: adminId,
  }, 'contract 2 draft');

  try {
    await ins('contract_shipments', { contract_id: contract1.id, shipment_id: ship1.id, org_id: eId, linked_at: daysAgo(8) }, 'contract-shipment link');
  } catch (e: any) { warn(`contract_shipments: ${e.message}`); }

  // ── 13. Tenders + Bids ────────────────────────────────────────────────────
  section('Tenders');
  const [tender1] = await ins('tenders', {
    buyer_org_id: bId, title: 'Request for Cocoa Beans — 20MT Grade 1, Q2 2026',
    status: 'open', visibility: 'public', commodity: 'Cocoa Beans',
    quantity_mt: 20, target_price_usd: 3700, destination_port: 'Hamburg',
    required_certifications: ['Rainforest Alliance','EUDR-compliant'],
    closing_date: daysAgo(-21), notes: 'Looking for EUDR-compliant West Africa supplier.', created_by: adminId,
  }, 'tender 1 public');

  await ins('tenders', {
    buyer_org_id: bId, title: 'Invited Tender — 10MT Premium Cocoa for Artisan Range',
    status: 'open', visibility: 'invited', invited_orgs: [eId], commodity: 'Cocoa Beans',
    quantity_mt: 10, target_price_usd: 4200, destination_port: 'Hamburg',
    required_certifications: ['Rainforest Alliance','UTZ'],
    closing_date: daysAgo(-14), notes: 'High-traceability required.', created_by: adminId,
  }, 'tender 2 invited');

  await ins('tender_bids', {
    tender_id: tender1.id, exporter_org_id: eId,
    price_per_mt: 3780, quantity_available_mt: 20, status: 'submitted',
    notes: 'Full EUDR traceability. DPPs for all lots. Ready to ship from Lagos.', submitted_at: daysAgo(3),
  }, 'bid on tender 1');

  // ── 14. Farm Conflict ─────────────────────────────────────────────────────
  section('Farm Conflicts');
  try {
    await ins('farm_conflicts', {
      org_id: eId, farm_a_id: fG.id, farm_b_id: fH.id,
      conflict_type: 'boundary_overlap', status: 'open',
      overlap_area_hectares: 0.3,
      notes: 'GPS boundaries overlap ~0.3ha. Field inspection required.', detected_at: daysAgo(12),
    }, 'boundary overlap');
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
  /app/dpp          4 DPPs — 3 issued, 1 draft/flagged
  `);
}

async function main() {
  if (WIPE) await wipeDemoData();
  if (!WIPE_ONLY) await seed();
}

main().catch(err => { console.error('\n❌  Fatal:', err.message || err); process.exit(1); });
