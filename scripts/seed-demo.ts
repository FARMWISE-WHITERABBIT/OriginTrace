/**
 * OriginTrace Demo Data Seed Script
 * All column names verified against actual API route insert/upsert calls.
 *
 * Usage:
 *   npx tsx scripts/seed-demo.ts              # seed everything
 *   npx tsx scripts/seed-demo.ts --wipe       # wipe then re-seed
 *   npx tsx scripts/seed-demo.ts --wipe-only  # wipe only
 */

import { createClient } from '@supabase/supabase-js';
import { randomUUID } from 'crypto';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const SUPABASE_URL    = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_KEY     = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const DEMO_ORG_SLUG   = 'demo-whiterabbit';
const DEMO_BUYER_SLUG = 'demo-nibseurope';

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local');
  process.exit(1);
}

const db = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const args      = process.argv.slice(2);
const WIPE      = args.includes('--wipe') || args.includes('--wipe-only');
const WIPE_ONLY = args.includes('--wipe-only');

function section(t: string) { console.log(`\n▶  ${t}`); }
function ok(m: string)      { console.log(`  ✓  ${m}`); }
function warn(m: string)    { console.log(`  ⚠  ${m}`); }

async function ins(table: string, rows: any | any[], label?: string): Promise<any[]> {
  const arr = Array.isArray(rows) ? rows : [rows];
  if (!arr.length) return [];
  const { data, error } = await db.from(table).insert(arr).select();
  if (error) { console.error(`❌  insert ${table}${label ? ` (${label})` : ''}: ${error.message}`); throw error; }
  ok(`${table}: inserted ${data!.length}${label ? ` ${label}` : ''}`);
  return data!;
}

async function ups(table: string, rows: any | any[], onConflict: string, label?: string): Promise<any[]> {
  const arr = Array.isArray(rows) ? rows : [rows];
  const { data, error } = await db.from(table).upsert(arr, { onConflict }).select();
  if (error) { console.error(`❌  upsert ${table}${label ? ` (${label})` : ''}: ${error.message}`); throw error; }
  ok(`${table}: upserted ${data!.length}${label ? ` ${label}` : ''}`);
  return data!;
}

function ago(n: number): string { return new Date(Date.now() - n * 86_400_000).toISOString(); }
function pick(lo: number, hi: number): number { return Math.round(Math.random() * (hi - lo) + lo); }
function polygon(lat: number, lng: number, s = 0.004) {
  return { type: 'Polygon', coordinates: [[[lng-s,lat-s],[lng+s,lat-s],[lng+s,lat+s],[lng-s,lat+s],[lng-s,lat-s]]] };
}

// ─── Wipe ──────────────────────────────────────────────────────────────────

async function wipeDemoData() {
  section('Wiping demo data');
  const { data: eOrg } = await db.from('organizations').select('id').eq('slug', DEMO_ORG_SLUG).single();
  const { data: bOrg } = await db.from('buyer_organizations').select('id').eq('slug', DEMO_BUYER_SLUG).single();
  const eid = eOrg?.id as string | undefined;
  const bid = bOrg?.id as string | undefined;

  if (!eid && !bid) { ok('Nothing to wipe.'); return; }

  const orgTables = [
    'pedigree_verification','supply_chain_links','cold_chain_logs','document_alerts',
    'audit_events','audit_logs','notifications','digital_product_passports','dds_exports',
    'compliance_documents','compliance_files','shipment_lot_items','shipment_lots',
    'shipment_items','shipment_outcomes','documents','contract_shipments','shipments',
    'finished_goods','processing_run_batches','processing_runs','bags',
    'batch_contributions','collection_batches','farm_conflicts','farm_certifications',
    'farmer_inputs','farmer_training','farmer_performance_ledger','farmer_accounts',
    'yield_predictions','farms','compliance_profiles','delegations','api_keys',
  ];

  if (eid) {
    for (const t of orgTables) {
      const { error } = await db.from(t).delete().eq('org_id', eid);
      if (error && !error.message.includes('does not exist')) warn(`${t}: ${error.message}`);
      else ok(`wiped ${t}`);
    }
    await db.from('tender_bids').delete().eq('exporter_org_id', eid);
    await db.from('contracts').delete().eq('exporter_org_id', eid);
    const { data: profs } = await db.from('profiles').select('user_id').eq('org_id', eid);
    for (const p of profs || []) await db.auth.admin.deleteUser(p.user_id);
    await db.from('profiles').delete().eq('org_id', eid);
    await db.from('organizations').delete().eq('id', eid);
    ok('wiped exporter org + users');
  }

  if (bid) {
    await db.from('tenders').delete().eq('buyer_org_id', bid);
    await db.from('contracts').delete().eq('buyer_org_id', bid);
    await db.from('buyer_profiles').delete().eq('buyer_org_id', bid);
    await db.from('buyer_organizations').delete().eq('id', bid);
    ok('wiped buyer org');
  }
  ok('Wipe complete.');
}

// ─── Seed ──────────────────────────────────────────────────────────────────

async function seed() {

  // ── 1. Orgs ──────────────────────────────────────────────────────────────
  section('Organizations');

  // columns from create-org route: name, slug, subscription_status, commodity_types
  // subscription_tier confirmed from cron/feature-toggles routes
  const [eOrg] = await ups('organizations', {
    name: 'WhiteRabbit Demo Co.',
    slug: DEMO_ORG_SLUG,
    subscription_status: 'active',
    subscription_tier:   'pro',
    commodity_types:     ['cocoa', 'cashew'],
  }, 'slug', 'exporter org');

  // columns from create-buyer-org route: name, slug, country, industry, contact_email
  const [bOrg] = await ups('buyer_organizations', {
    name:          'NibsEurope GmbH',
    slug:          DEMO_BUYER_SLUG,
    country:       'Germany',
    industry:      'Confectionery',
    contact_email: 'buyer@nibseurope-demo.com',
  }, 'slug', 'buyer org');

  const eid: string = eOrg.id;
  const bid: string = bOrg.id;

  // ── 2. Users ─────────────────────────────────────────────────────────────
  section('Users');

  async function createUser(email: string, pw: string, role: string, isBuyer = false) {
    const { data: existing } = await db.auth.admin.listUsers();
    const users = (existing as any)?.users ?? [];
    const found = users.find((u: any) => u.email === email);
    let uid: string;

    if (found) { uid = found.id; ok(`exists: ${email}`); }
    else {
      const { data, error } = await db.auth.admin.createUser({
        email, password: pw, email_confirm: true,
        app_metadata: { app_role: role, org_id: isBuyer ? null : eid, is_superadmin: false },
      });
      if (error) throw new Error(`createUser ${email}: ${error.message}`);
      uid = data.user.id;
      ok(`created: ${email} (${role})`);
    }

    // profiles columns: user_id, org_id, role, full_name
    if (!isBuyer) {
      await ups('profiles', { user_id: uid, org_id: eid, role, full_name: email.split('@')[0] }, 'user_id', `profile:${role}`);
    }
    // buyer_profiles columns: user_id, buyer_org_id, role, full_name
    if (isBuyer) {
      await ups('buyer_profiles', { user_id: uid, buyer_org_id: bid, role: 'buyer_admin', full_name: 'Buyer Admin' }, 'user_id', 'buyer profile');
    }
    return uid;
  }

  const adminId = await createUser('demo.admin@origintrace-demo.com', 'Demo1234!', 'admin');
  const agentId = await createUser('demo.agent@origintrace-demo.com', 'Demo1234!', 'agent');
  await createUser('demo.buyer@nibseurope-demo.com', 'Demo1234!', 'buyer_admin', true);

  // ── 3. Compliance Profiles ───────────────────────────────────────────────
  section('Compliance Profiles');

  const [eudrProf] = await ins('compliance_profiles', {
    org_id: eid, name: 'EU Cocoa — EUDR Standard', destination_market: 'European Union',
    regulation_framework: 'EUDR',
    required_documents: ['phytosanitary_certificate','due_diligence_statement','certificate_of_origin','quality_certificate'],
    required_certifications: ['Rainforest Alliance','UTZ'], geo_verification_level: 'polygon', min_traceability_depth: 2,
  });

  const [fsmaProf] = await ins('compliance_profiles', {
    org_id: eid, name: 'US Cocoa — FSMA 204', destination_market: 'United States',
    regulation_framework: 'FSMA_204',
    required_documents: ['phytosanitary_certificate','fda_prior_notice','certificate_of_origin','bill_of_lading'],
    required_certifications: [], geo_verification_level: 'point', min_traceability_depth: 1,
  });

  const [ukProf] = await ins('compliance_profiles', {
    org_id: eid, name: 'UK Cocoa — Environment Act', destination_market: 'United Kingdom',
    regulation_framework: 'UK_Environment_Act',
    required_documents: ['phytosanitary_certificate','due_diligence_statement','certificate_of_origin'],
    required_certifications: ['Rainforest Alliance'], geo_verification_level: 'polygon', min_traceability_depth: 2,
  });

  // ── 4. Farms ─────────────────────────────────────────────────────────────
  section('Farms');

  // farms columns from route: org_id, farmer_name, farmer_id, phone, community,
  //   boundary (GeoJSON), area_hectares, legality_doc_url, created_by, compliance_status
  // deforestation_check is a JSON column added by migration
  const farmDefs = [
    { name: 'Adebayo Ogunleke', phone: '+2348012345001', community: 'Oke-Odan, Abeokuta North, Ogun',      lat: 7.150, lng: 3.350, area: 3.2, cs: 'approved',  dc: { deforestation_free: true,  risk_level: 'low',  forest_loss_hectares: 0,   analysis_date: ago(30) } },
    { name: 'Folake Adeyemi',   phone: '+2348012345002', community: 'Ago-Iwoye, Ijebu Ode, Ogun',          lat: 6.820, lng: 3.930, area: 5.1, cs: 'approved',  dc: { deforestation_free: true,  risk_level: 'low',  forest_loss_hectares: 0,   analysis_date: ago(25) } },
    { name: 'Emeka Nwosu',      phone: '+2348012345003', community: 'Oda, Ondo West, Ondo',                lat: 7.090, lng: 4.840, area: 2.8, cs: 'approved',  dc: { deforestation_free: true,  risk_level: 'low',  forest_loss_hectares: 0,   analysis_date: ago(20) } },
    { name: 'Chukwudi Eze',     phone: '+2348012345004', community: 'Ifon, Owo, Ondo',                     lat: 7.190, lng: 5.590, area: 4.5, cs: 'approved',  dc: { deforestation_free: true,  risk_level: 'low',  forest_loss_hectares: 0,   analysis_date: ago(18) } },
    { name: 'Blessing Okafor',  phone: '+2348012345005', community: 'Oka, Akoko South-East, Ondo',         lat: 7.460, lng: 5.730, area: 6.0, cs: 'approved',  dc: { deforestation_free: true,  risk_level: 'low',  forest_loss_hectares: 0,   analysis_date: ago(15) } },
    { name: 'Ngozi Amadi',      phone: '+2348012345006', community: 'Afikpo, Abi, Cross River',            lat: 5.890, lng: 7.920, area: 3.7, cs: 'approved',  dc: { deforestation_free: true,  risk_level: 'low',  forest_loss_hectares: 0,   analysis_date: ago(12) } },
    { name: 'Taiwo Olanrewaju', phone: '+2348012345007', community: 'Idanre, Idanre LGA, Ondo [RISK]',    lat: 7.090, lng: 5.110, area: 8.2, cs: 'rejected',  dc: { deforestation_free: false, risk_level: 'high', forest_loss_hectares: 1.4, forest_loss_percentage: 17, analysis_date: ago(10), data_source: 'Global Forest Watch' } },
    { name: 'Sola Akinwale',    phone: '+2348012345008', community: 'Abigi, Ogun Waterside, Ogun [PENDING]', lat: 6.580, lng: 4.230, area: 2.1, cs: 'pending', dc: null },
  ];

  const farms = await ins('farms', farmDefs.map(f => ({
    org_id: eid, farmer_name: f.name, phone: f.phone, community: f.community,
    boundary: polygon(f.lat, f.lng), area_hectares: f.area,
    compliance_status: f.cs, deforestation_check: f.dc,
    commodity: 'cocoa', created_by: adminId, created_at: ago(pick(60, 120)),
  })), 'farms (8)');

  const [fA,fB,fC,fD,fE,fF,fG,fH] = farms;

  // ── 5. Collection Batches ────────────────────────────────────────────────
  section('Collection Batches');

  // confirmed columns: org_id, farm_id, agent_id, status, total_weight, bag_count,
  //   notes, local_id, collected_at, synced_at
  // extended columns added by migrations: batch_code, commodity, grade, has_gps,
  //   yield_validated, yield_flag_reason, compliance_status, dispatched
  const bDefs = [
    { f: fA, code: 'WR-BCH-001', grade: 'Grade 1', wt: 820,  bags: 41, gps: true,  vy: true,  st: 'dispatched', cs: 'approved', d: 50, yfr: null },
    { f: fB, code: 'WR-BCH-002', grade: 'Grade 1', wt: 1250, bags: 63, gps: true,  vy: true,  st: 'dispatched', cs: 'approved', d: 48, yfr: null },
    { f: fC, code: 'WR-BCH-003', grade: 'Grade 2', wt: 560,  bags: 28, gps: true,  vy: true,  st: 'dispatched', cs: 'approved', d: 45, yfr: null },
    { f: fD, code: 'WR-BCH-004', grade: 'Grade 1', wt: 940,  bags: 47, gps: true,  vy: true,  st: 'dispatched', cs: 'approved', d: 40, yfr: null },
    { f: fE, code: 'WR-BCH-005', grade: 'Grade 1', wt: 1100, bags: 55, gps: true,  vy: true,  st: 'dispatched', cs: 'approved', d: 38, yfr: null },
    { f: fF, code: 'WR-BCH-006', grade: 'Grade 1', wt: 720,  bags: 36, gps: true,  vy: true,  st: 'dispatched', cs: 'approved', d: 35, yfr: null },
    { f: fA, code: 'WR-BCH-007', grade: 'Grade 2', wt: 310,  bags: 16, gps: true,  vy: false, st: 'collecting', cs: 'approved', d: 20, yfr: 'Weight/bag (19.4kg) exceeds Grade 2 benchmark (18kg max). Manual verification required.' },
    { f: fG, code: 'WR-BCH-008', grade: 'Grade 2', wt: 1640, bags: 82, gps: true,  vy: false, st: 'collecting', cs: 'rejected', d: 15, yfr: 'Farm has active deforestation risk. Batch quarantined pending farm remediation.' },
    { f: fH, code: 'WR-BCH-009', grade: null,      wt: 200,  bags: 10, gps: false, vy: false, st: 'collecting', cs: 'pending',  d: 5,  yfr: null },
    { f: fB, code: 'WR-BCH-010', grade: 'Grade 1', wt: 880,  bags: 44, gps: true,  vy: true,  st: 'collecting', cs: 'approved', d: 10, yfr: null },
    { f: fC, code: 'WR-BCH-011', grade: 'Grade 1', wt: 960,  bags: 48, gps: true,  vy: true,  st: 'collecting', cs: 'approved', d: 8,  yfr: null },
    { f: fD, code: 'WR-BCH-012', grade: 'Grade 1', wt: 740,  bags: 37, gps: true,  vy: true,  st: 'collecting', cs: 'approved', d: 6,  yfr: null },
  ];

  const batches = await ins('collection_batches', bDefs.map(b => ({
    org_id: eid, farm_id: b.f.id, agent_id: agentId, status: b.st,
    total_weight: b.wt, bag_count: b.bags, local_id: randomUUID(),
    collected_at: ago(b.d), synced_at: ago(b.d - 1),
    batch_code: b.code, commodity: 'cocoa', grade: b.grade,
    has_gps: b.gps, yield_validated: b.vy, yield_flag_reason: b.yfr,
    compliance_status: b.cs, dispatched: b.st === 'dispatched',
  })), 'collection_batches (12)');

  // ── 6. Bags ──────────────────────────────────────────────────────────────
  section('Bags');

  for (let i = 0; i < 6; i++) {
    const b = batches[i]; const d = bDefs[i];
    await ins('bags', Array.from({ length: d.bags }, () => ({
      org_id: eid, batch_id: b.id, farm_id: b.farm_id,
      status: 'dispatched', weight_kg: parseFloat((d.wt / d.bags).toFixed(1)),
    })), `bags batch-${i+1}`);
  }

  // ── 7. Processing Runs ───────────────────────────────────────────────────
  section('Processing Runs');

  // confirmed columns: org_id, run_code, facility_name, facility_location,
  //   commodity, input_weight_kg, output_weight_kg, processed_at, notes, created_by
  const [run1] = await ins('processing_runs', { org_id:eid, run_code:'WR-RUN-001', facility_name:'WhiteRabbit Cocoa Processing', facility_location:'Sagamu, Ogun', commodity:'cocoa', input_weight_kg:2630, output_weight_kg:2265, processed_at:ago(35), notes:'EU batch. Grade 1/2 blend, 7-day sun-dry. Recovery 86%.', created_by:adminId });
  const [run2] = await ins('processing_runs', { org_id:eid, run_code:'WR-RUN-002', facility_name:'WhiteRabbit Cocoa Processing', facility_location:'Sagamu, Ogun', commodity:'cocoa', input_weight_kg:2040, output_weight_kg:1815, processed_at:ago(28), notes:'US batch. Premium Grade 1. Recovery 89%.', created_by:adminId });
  const [run3] = await ins('processing_runs', { org_id:eid, run_code:'WR-RUN-003', facility_name:'WhiteRabbit Cocoa Processing', facility_location:'Sagamu, Ogun', commodity:'cocoa', input_weight_kg:720,  output_weight_kg:432,  processed_at:ago(20), notes:'UK batch. MASS BALANCE FAIL — 60% recovery (min 75%). Moisture measurement error under investigation.', created_by:adminId });

  // processing_run_batches: processing_run_id, collection_batch_id, weight_contribution_kg, org_id
  await ins('processing_run_batches', [
    { processing_run_id:run1.id, collection_batch_id:batches[0].id, weight_contribution_kg:820,  org_id:eid },
    { processing_run_id:run1.id, collection_batch_id:batches[1].id, weight_contribution_kg:1250, org_id:eid },
    { processing_run_id:run1.id, collection_batch_id:batches[2].id, weight_contribution_kg:560,  org_id:eid },
    { processing_run_id:run2.id, collection_batch_id:batches[3].id, weight_contribution_kg:940,  org_id:eid },
    { processing_run_id:run2.id, collection_batch_id:batches[4].id, weight_contribution_kg:1100, org_id:eid },
    { processing_run_id:run3.id, collection_batch_id:batches[5].id, weight_contribution_kg:720,  org_id:eid },
  ], 'processing_run_batches');

  // ── 8. Finished Goods ────────────────────────────────────────────────────
  section('Finished Goods');

  // confirmed columns: org_id, pedigree_code, product_name, product_type,
  //   processing_run_id, weight_kg, batch_number, lot_number, production_date,
  //   destination_country, buyer_company, pedigree_verified, created_by
  const [fg1] = await ins('finished_goods', { org_id:eid, processing_run_id:run1.id, pedigree_code:'WR-PED-2026-001', product_name:'Certified Cocoa Beans — EU Grade', product_type:'dried_beans', weight_kg:2265, batch_number:'BATCH-EU-001', lot_number:'LOT-EU-001', production_date:ago(35).split('T')[0], destination_country:'Germany',        buyer_company:'NibsEurope GmbH',    pedigree_verified:true,  created_by:adminId });
  const [fg2] = await ins('finished_goods', { org_id:eid, processing_run_id:run2.id, pedigree_code:'WR-PED-2026-002', product_name:'Premium Cocoa Beans — US Grade',   product_type:'dried_beans', weight_kg:1815, batch_number:'BATCH-US-001', lot_number:'LOT-US-001', production_date:ago(28).split('T')[0], destination_country:'United States',   buyer_company:'CacaoAmerica LLC',   pedigree_verified:true,  created_by:adminId });
  const [fg3] = await ins('finished_goods', { org_id:eid, processing_run_id:run3.id, pedigree_code:'WR-PED-2026-003', product_name:'Cocoa Beans — UK Batch (HOLD)',    product_type:'dried_beans', weight_kg:432,  batch_number:'BATCH-UK-001', lot_number:'LOT-UK-001', production_date:ago(20).split('T')[0], destination_country:'United Kingdom',  buyer_company:'BritishChoc Ltd',    pedigree_verified:false, created_by:adminId });
  const [fg4] = await ins('finished_goods', { org_id:eid, processing_run_id:run1.id, pedigree_code:'WR-PED-2026-004', product_name:'Certified Cocoa Beans — UAE Grade', product_type:'dried_beans', weight_kg:500,  batch_number:'BATCH-UAE-001',lot_number:'LOT-UAE-001',production_date:ago(30).split('T')[0], destination_country:'United Arab Emirates', buyer_company:'GulfChocolate FZCO', pedigree_verified:true,  created_by:adminId });

  // ── 9. DPPs ──────────────────────────────────────────────────────────────
  section('Digital Product Passports');

  // confirmed columns from dpp route POST: org_id, finished_good_id, dpp_code,
  //   product_category, origin_country, sustainability_claims, carbon_footprint_kg,
  //   certifications, processing_history, chain_of_custody, regulatory_compliance,
  //   machine_readable_data, passport_version, status, issued_at, created_by
  function makeDPP(fg: any, certs: string[], extra: object = {}, valid = true) {
    return {
      org_id: eid, finished_good_id: fg.id,
      dpp_code: `DPP-${randomUUID().slice(0,8).toUpperCase()}`,
      product_category: fg.product_type, origin_country: 'NG',
      sustainability_claims: { deforestation_free: valid, traceable_to_farm: true, certified: certs, ...extra },
      carbon_footprint_kg: valid ? 2.4 : null,
      certifications: certs,
      processing_history: [{ facility: 'WhiteRabbit Cocoa Processing, Sagamu', input_kg: fg.weight_kg*1.16, output_kg: fg.weight_kg, processed_at: ago(30) }],
      chain_of_custody: [
        { stage: 'Farm Collection', actor: 'WhiteRabbit Demo Co.', date: ago(50) },
        { stage: 'Processing', actor: 'WhiteRabbit Cocoa Processing', date: ago(35) },
        { stage: 'Export Staging', actor: 'WhiteRabbit Demo Co.', date: ago(10) },
      ],
      regulatory_compliance: { pedigree_verified: valid, mass_balance_valid: valid, dds_submitted: valid, total_smallholders: valid ? 4 : 1, total_farm_area_hectares: valid ? 15.3 : 8.2 },
      machine_readable_data: { '@context':'https://schema.org','@type':'Product', name: fg.product_name, countryOfOrigin:'Nigeria', weight:{'@type':'QuantitativeValue',value:fg.weight_kg,unitCode:'KGM'}, certification: certs },
      passport_version: 1, status: valid ? 'issued' : 'draft', issued_at: ago(10), created_by: adminId,
    };
  }

  await ins('digital_product_passports', [
    makeDPP(fg1, ['Rainforest Alliance','EUDR-compliant'], { eudr_compliant: true }),
    makeDPP(fg2, ['UTZ Certified'],                        { fsma_traceable: true }),
    makeDPP(fg3, [],                                       { mass_balance_hold: true }, false),
    makeDPP(fg4, ['Halal Certified'],                      { halal_certified: true }),
  ], 'DPPs (4)');

  // ── 10. Shipments ────────────────────────────────────────────────────────
  section('Shipments');

  // confirmed columns from selects/updates: org_id, shipment_code, status,
  //   destination_country, destination_port, commodity, buyer_company, buyer_contact,
  //   target_regulations, estimated_ship_date, compliance_profile_id, total_weight_kg,
  //   readiness_score, readiness_decision, doc_status, storage_controls, risk_flags,
  //   score_breakdown, notes
  const shipDefs = [
    {
      shipment_code:'WR-SHP-2026-001', status:'ready', destination_country:'Germany', destination_port:'Hamburg',
      commodity:'Cocoa Beans', buyer_company:'NibsEurope GmbH', buyer_contact:'buyer@nibseurope-demo.com',
      target_regulations:['EUDR','Rainforest Alliance'], estimated_ship_date:ago(-14),
      compliance_profile_id: eudrProf.id, total_weight_kg:2265,
      readiness_score:91, readiness_decision:'go',
      doc_status:{ phytosanitary_certificate:true, due_diligence_statement:true, certificate_of_origin:true, quality_certificate:true },
      storage_controls:{ temperature_logged:true, humidity_controlled:true },
      risk_flags:[], score_breakdown:{ traceability:95, documentation:90, deforestation:100, regulatory:88, operational:82 },
      notes:'Fully cleared. Ready for vessel booking.', fg: fg1,
    },
    {
      shipment_code:'WR-SHP-2026-002', status:'review', destination_country:'United States', destination_port:'New York',
      commodity:'Cocoa Beans', buyer_company:'CacaoAmerica LLC', buyer_contact:'imports@cacaoamerica-demo.com',
      target_regulations:['FSMA 204','Lacey Act'], estimated_ship_date:ago(-21),
      compliance_profile_id: fsmaProf.id, total_weight_kg:1815,
      readiness_score:68, readiness_decision:'conditional',
      doc_status:{ phytosanitary_certificate:true, fda_prior_notice:false, certificate_of_origin:true, bill_of_lading:false },
      storage_controls:{ temperature_logged:true, humidity_controlled:false },
      risk_flags:[
        { severity:'critical', category:'Documentation', message:'FDA Prior Notice not submitted. Required 8h before US port arrival.', is_hard_fail:true },
        { severity:'warning',  category:'Documentation', message:'Bill of Lading not uploaded.', is_hard_fail:false },
      ],
      score_breakdown:{ traceability:88, documentation:40, deforestation:95, regulatory:55, operational:70 },
      notes:'Awaiting FDA Prior Notice before clearance.', fg: fg2,
    },
    {
      shipment_code:'WR-SHP-2026-003', status:'blocked', destination_country:'United Kingdom', destination_port:'Tilbury',
      commodity:'Cocoa Beans', buyer_company:'BritishChoc Ltd', buyer_contact:'ops@britishchoc-demo.com',
      target_regulations:['UK Environment Act'], estimated_ship_date:ago(-7),
      compliance_profile_id: ukProf.id, total_weight_kg:432,
      readiness_score:28, readiness_decision:'no_go',
      doc_status:{ phytosanitary_certificate:true, due_diligence_statement:false, certificate_of_origin:false },
      storage_controls:{ temperature_logged:false, humidity_controlled:false },
      risk_flags:[
        { severity:'critical', category:'Deforestation', message:'Farm G (Idanre) has active deforestation risk. Shipment blocked.', is_hard_fail:true },
        { severity:'critical', category:'Mass Balance',  message:'Processing Run WR-RUN-003 invalid mass balance (60% recovery, min 75%).', is_hard_fail:true },
        { severity:'warning',  category:'Documentation', message:'Due Diligence Statement missing.', is_hard_fail:false },
      ],
      score_breakdown:{ traceability:40, documentation:20, deforestation:0, regulatory:35, operational:50 },
      notes:'Blocked. Resolve Farm G deforestation risk and RUN-003 mass balance.', fg: fg3,
    },
    {
      shipment_code:'WR-SHP-2026-004', status:'draft', destination_country:'United Arab Emirates', destination_port:'Jebel Ali',
      commodity:'Cocoa Beans', buyer_company:'GulfChocolate FZCO', buyer_contact:'trade@gulfchoc-demo.com',
      target_regulations:['UAE Halal','ESMA'], estimated_ship_date:ago(-30),
      compliance_profile_id: null, total_weight_kg:500,
      readiness_score:null, readiness_decision:'pending',
      doc_status:{}, storage_controls:{}, risk_flags:[], score_breakdown:null,
      notes:'Draft. Documents not yet uploaded.', fg: fg4,
    },
  ];

  const shipments: any[] = [];
  for (const s of shipDefs) {
    const { fg, ...rest } = s;
    const [ship] = await ins('shipments', { org_id:eid, created_at:ago(pick(1,10)), ...rest });
    await ins('shipment_items', { shipment_id:ship.id, finished_good_id:fg.id, org_id:eid, weight_kg:fg.weight_kg, item_type:'finished_good' }, `items for ${ship.shipment_code}`);
    shipments.push(ship);
  }

  const [ship1, ship2, ship3] = shipments;

  // ── 11. Documents ────────────────────────────────────────────────────────
  section('Documents');

  // confirmed columns: org_id, shipment_id, type, label, status, uploaded_by, file_url
  await ins('documents', [
    { org_id:eid, shipment_id:ship1.id, type:'phytosanitary_certificate', label:'Phytosanitary Certificate', status:'verified', uploaded_by:adminId, file_url:'https://demo.origintrace.com/docs/phyto-001.pdf' },
    { org_id:eid, shipment_id:ship1.id, type:'due_diligence_statement',   label:'Due Diligence Statement',   status:'verified', uploaded_by:adminId, file_url:'https://demo.origintrace.com/docs/dds-001.pdf'   },
    { org_id:eid, shipment_id:ship1.id, type:'certificate_of_origin',     label:'Certificate of Origin',     status:'verified', uploaded_by:adminId, file_url:'https://demo.origintrace.com/docs/coo-001.pdf'   },
    { org_id:eid, shipment_id:ship1.id, type:'quality_certificate',       label:'Quality Certificate',       status:'verified', uploaded_by:adminId, file_url:'https://demo.origintrace.com/docs/qual-001.pdf'  },
    { org_id:eid, shipment_id:ship2.id, type:'phytosanitary_certificate', label:'Phytosanitary Certificate', status:'verified', uploaded_by:adminId, file_url:'https://demo.origintrace.com/docs/phyto-002.pdf' },
    { org_id:eid, shipment_id:ship2.id, type:'certificate_of_origin',     label:'Certificate of Origin',     status:'verified', uploaded_by:adminId, file_url:'https://demo.origintrace.com/docs/coo-002.pdf'   },
    { org_id:eid, shipment_id:ship3.id, type:'phytosanitary_certificate', label:'Phytosanitary Certificate', status:'rejected', uploaded_by:adminId, file_url:'https://demo.origintrace.com/docs/phyto-003.pdf' },
    { org_id:eid, shipment_id:ship3.id, type:'due_diligence_statement',   label:'Due Diligence Statement (DRAFT)', status:'draft', uploaded_by:adminId, file_url:'https://demo.origintrace.com/docs/dds-draft.pdf' },
  ], 'documents (8)');

  // ── 12. Contracts ────────────────────────────────────────────────────────
  section('Contracts');

  // confirmed columns: buyer_org_id, exporter_org_id, contract_reference, commodity,
  //   quantity_mt, delivery_deadline, destination_port, quality_requirements, notes, status, created_by
  const [con1] = await ins('contracts', { buyer_org_id:bid, exporter_org_id:eid, contract_reference:'WR-CON-2026-001', commodity:'Cocoa Beans', quantity_mt:25, delivery_deadline:ago(-120), destination_port:'Hamburg', quality_requirements:{ min_grade:'Grade 1', max_moisture_pct:7.5, min_fat_pct:55, incoterm:'FOB' }, notes:'Annual supply agreement. 5 MT tranches.', status:'active', created_by:adminId });
  await ins('contracts', { buyer_org_id:bid, exporter_org_id:eid, contract_reference:'WR-CON-2026-002', commodity:'Cocoa Beans', quantity_mt:5, delivery_deadline:ago(-37), destination_port:'Hamburg', quality_requirements:{ min_grade:'Grade 1', max_moisture_pct:7.0, incoterm:'CIF' }, notes:'Spot purchase. Pending buyer signature.', status:'draft', created_by:adminId });
  await ins('contract_shipments', { contract_id:con1.id, shipment_id:ship1.id, org_id:eid, linked_at:ago(8) }, 'contract_shipments');

  // ── 13. Tenders ──────────────────────────────────────────────────────────
  section('Tenders');

  const [ten1] = await ins('tenders', { buyer_org_id:bid, title:'Request for Cocoa Beans — 20MT Grade 1, Q2 2026', status:'open', visibility:'public', commodity:'Cocoa Beans', quantity_mt:20, destination_port:'Hamburg', required_certifications:['Rainforest Alliance','EUDR-compliant'], closing_date:ago(-21), notes:'Looking for reliable West Africa supplier with full EUDR traceability.' });
  await ins('tenders', { buyer_org_id:bid, title:'Invited Tender — 10MT Premium Cocoa for Artisan Range', status:'open', visibility:'invited', invited_orgs:[eid], commodity:'Cocoa Beans', quantity_mt:10, destination_port:'Hamburg', required_certifications:['Rainforest Alliance','UTZ'], closing_date:ago(-14), notes:'Premium artisan range. High-traceability, small-batch.' });

  // tender_bids columns: tender_id, exporter_org_id, price_per_mt, quantity_available_mt,
  //   delivery_date, notes, certifications, submitted_by, status
  await ins('tender_bids', { tender_id:ten1.id, exporter_org_id:eid, price_per_mt:3780, quantity_available_mt:20, delivery_date:ago(-45), notes:'Full EUDR traceability. DPPs for all lots. Ex-Lagos ready.', certifications:['Rainforest Alliance','EUDR-compliant'], submitted_by:adminId, status:'submitted' }, 'tender_bids');

  // ── 14. Farm Conflict ────────────────────────────────────────────────────
  section('Farm Conflicts');

  // confirmed columns: farm_a_id, farm_b_id, overlap_ratio, status
  await ins('farm_conflicts', { farm_a_id:fG.id, farm_b_id:fH.id, overlap_ratio:0.04, status:'pending' }, 'farm_conflicts');

  // ── Done ─────────────────────────────────────────────────────────────────
  section('DONE');
  console.log(`
  Credentials (password: Demo1234!)
  ──────────────────────────────────────────────────────────
  Exporter Admin  demo.admin@origintrace-demo.com
  Exporter Agent  demo.agent@origintrace-demo.com
  Buyer Admin     demo.buyer@nibseurope-demo.com

  Scenarios seeded
  ──────────────────────────────────────────────────────────
  Shipments  4   GO / CONDITIONAL / NO-GO / PENDING
  Farms      8   6 clean / 1 deforestation risk / 1 pending
  Batches   12   yield flag on #7, quarantined on #8
  Processing  3  2 valid, 1 mass-balance FAIL (RUN-003)
  DPPs        4  3 issued, 1 flagged draft
  Conflict    1  boundary overlap Farm G <-> Farm H
  `);
}

async function main() {
  if (WIPE)       await wipeDemoData();
  if (!WIPE_ONLY) await seed();
}

main().catch(err => { console.error('\n❌  Fatal:', err?.message ?? err); process.exit(1); });
