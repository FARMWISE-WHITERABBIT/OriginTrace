#!/usr/bin/env tsx
/**
 * OriginTrace GACON Demo Seed
 *
 * Creates a GACON (Gum Arabic & Commodities Nigeria) tenant with:
 *   - Pro tier subscription
 *   - Farms in Kaduna state: Kachia LGA (ginger) + Kagarko LGA (hibiscus)
 *   - 1 collection batch + processing run + finished good
 *   - 1 draft EU shipment at readiness score 67 (Conditional) with 2 document gaps
 *
 * Usage:
 *   npm run seed:gacon              — seed only
 *   npm run seed:gacon:wipe         — wipe only
 *   npm run seed:gacon:reset        — wipe then seed
 *
 * Prerequisites (run in Supabase SQL Editor):
 *   supabase/migrations/20260326_add_gum_arabic.sql
 *   migrations/20260320_expand_constraints.sql
 */

import { createClient } from '@supabase/supabase-js';

const WIPE      = process.argv.includes('--wipe');
const WIPE_ONLY = WIPE && !process.argv.includes('--seed');

const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL ?? '';
const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';
if (!url || !key) { console.error('Missing SUPABASE env vars'); process.exit(1); }
const db = createClient(url, key, { auth: { persistSession: false } });

const section = (t: string) => console.log(`\n▶  ${t}`);
const ok      = (msg: string) => console.log(`  ✓  ${msg}`);
const warn    = (msg: string) => console.log(`  ⚠  ${msg}`);
const fail    = (msg: string): never => { console.error(`❌  ${msg}`); throw new Error(msg); };

const daysAgo = (n: number) => { const d = new Date(); d.setDate(d.getDate() - n); return d.toISOString(); };
const dateStr = (n: number) => daysAgo(n).slice(0, 10);
const rnd     = (a: number, b: number) => Math.floor(Math.random() * (b - a + 1)) + a;

async function ins<T = any>(table: string, data: object | object[], label?: string): Promise<T[]> {
  const rows = Array.isArray(data) ? data : [data];
  const { data: result, error } = await db.from(table).insert(rows).select();
  if (error) fail(`${table} [${label}]: ${error.message}`);
  ok(`${table}: ${result!.length} row(s)${label ? ` — ${label}` : ''}`);
  return result as T[];
}

async function tryIns<T = any>(table: string, data: object | object[], label?: string): Promise<T[]> {
  try { return await ins<T>(table, data, label); }
  catch (e: any) { warn(`${table} skipped [${label}]: ${e.message?.slice(0,120)}`); return []; }
}

// ─── WIPE ────────────────────────────────────────────────────────────────────
async function wipeGaconData() {
  section('Wiping GACON demo data');

  const { data: gaconOrg } = await db.from('organizations').select('id').eq('slug', 'gacon').single();
  if (!(gaconOrg as any)?.id) { ok('No GACON org found — nothing to wipe.'); return; }

  const orgId = (gaconOrg as any).id;

  // Delete in FK dependency order
  const uuidTables = [
    'pedigree_verification', 'supply_chain_links', 'cold_chain_logs', 'document_alerts',
    'audit_events', 'audit_logs', 'notifications', 'digital_product_passports', 'dds_exports',
    'compliance_documents', 'compliance_files', 'shipment_lot_items', 'shipment_lots',
    'shipment_outcomes', 'shipment_items', 'documents', 'contract_shipments', 'shipments',
    'finished_goods', 'processing_run_batches', 'processing_runs', 'bags', 'batch_contributions',
    'collection_batches', 'farm_certifications', 'farmer_inputs', 'farmer_training',
    'farmer_performance_ledger', 'farmer_accounts', 'farms',
    'compliance_profiles', 'api_keys',
  ];

  // Wipe farm_conflicts first (FK references farms)
  await db.from('farm_conflicts').delete().eq('org_id', orgId);
  ok('wiped farm_conflicts');

  for (const t of uuidTables) {
    const { error } = await db.from(t).delete().eq('org_id', orgId);
    if (error?.message?.includes('schema cache') || error?.message?.includes('does not exist') || error?.message?.includes('column')) {
      warn(`${t}: skipped (${error!.message.slice(0, 80)})`);
    } else if (error) {
      warn(`${t}: ${error.message.slice(0, 80)}`);
    } else {
      ok(`wiped ${t}`);
    }
  }

  // Delete users
  const { data: profiles } = await db.from('profiles').select('user_id').eq('org_id', orgId);
  for (const p of (profiles || [])) {
    await db.auth.admin.deleteUser((p as any).user_id);
  }
  await db.from('profiles').delete().eq('org_id', orgId);
  await db.from('organizations').delete().eq('id', orgId);
  ok('wiped GACON org + users');

  ok('Wipe complete.');
}

// ─── SEED ────────────────────────────────────────────────────────────────────
async function seed() {

  // 0. Pre-flight
  section('Pre-flight');
  for (const [t, c] of [['collection_batches','batch_code'],['processing_runs','run_code'],['finished_goods','pedigree_code']] as [string,string][]) {
    const { error } = await db.from(t).select(c).limit(0);
    if (error?.message?.includes(`'${c}'`)) { console.error(`MISSING: ${t}.${c}\nRun migrations first.`); process.exit(1); }
    ok(`${t}.${c} ✓`);
  }

  // 1. Organisation
  section('Organisation');
  const { data: existingOrg } = await db.from('organizations').select('id').eq('slug', 'gacon').single();
  let orgId: string;
  if (existingOrg) {
    orgId = (existingOrg as any).id;
    ok('GACON org already exists');
  } else {
    const [org] = await ins('organizations', {
      name: 'GACON — Gum Arabic & Commodities Nigeria',
      slug: 'gacon',
      subscription_status: 'active',
      subscription_tier: 'pro',
      commodities: ['ginger', 'hibiscus', 'gum_arabic'],
    });
    orgId = (org as any).id;
  }

  // 2. Users
  section('Users');
  const PASS = 'Demo1234!';
  const getOrCreateUser = async (email: string, role: string) => {
    const { data: listRes } = await db.auth.admin.listUsers({ perPage: 1000 }) as any;
    const existing = (listRes?.users || []).find((u: any) => u.email === email);
    let userId: string;
    if (existing) { userId = existing.id; ok(`exists: ${email}`); }
    else {
      const { data: created, error } = await db.auth.admin.createUser({
        email, password: PASS, email_confirm: true,
        user_metadata: { full_name: email.split('@')[0] },
      });
      if (error) fail(`createUser ${email}: ${error.message}`);
      userId = created!.user.id; ok(`created: ${email}`);
    }
    const res = await db.from('profiles').upsert(
      { user_id: userId, org_id: orgId, role, full_name: email.split('@')[0] },
      { onConflict: 'user_id' }
    ).select('id').single();
    return { userId, profileId: (res.data as any)?.id ?? null };
  };

  const { userId: adminUserId, profileId: adminProfileId } = await getOrCreateUser('demo.admin@gacon-demo.com', 'admin');
  const { userId: agentUserId,  profileId: agentProfileId  } = await getOrCreateUser('demo.agent@gacon-demo.com',  'agent');
  const adminId = adminProfileId ?? adminUserId;
  const agentId = agentProfileId ?? agentUserId;

  // 3. Compliance Profile — EU EUDR
  section('Compliance Profile');
  const [eudrProf] = await ins('compliance_profiles', {
    org_id: orgId,
    name: 'EU EUDR Compliance — GACON',
    destination_market: 'European Union',
    regulation_framework: 'EUDR',
    is_default: true,
    required_documents: [
      'Deforestation-free declaration',
      'GPS polygon boundaries',
      'Farmer ID verification',
      'Due diligence statement',
      'Phytosanitary certificate',
      'Certificate of origin',
    ],
    required_certifications: [],
    geo_verification_level: 'polygon',
    min_traceability_depth: 3,
  }, 'EUDR');

  // 4. Farms — Kachia LGA (3 ginger)
  section('Farms — Kachia LGA, Kaduna (ginger)');
  type FarmDef = { name:string; phone:string; community:string; area:number; status:string; lat:number; lng:number; commodity:string; notes?:string };
  const kachiaGingerDefs: FarmDef[] = [
    { name:'Abubakar Sule',  phone:'+2348041200001', community:'Kachia, Kaduna',  area:2.5, status:'approved', lat:9.875, lng:7.952, commodity:'ginger', notes:'GACON cooperative member. Mapped Jan 2026. High-yield Tafin Giwa variety.' },
    { name:'Hadiza Ibrahim', phone:'+2348041200002', community:'Kachia, Kaduna',  area:3.2, status:'approved', lat:9.891, lng:7.968, commodity:'ginger', notes:'GACON cooperative member. Intercropped with sesame.' },
    { name:'Musa Danladi',   phone:'+2348041200003', community:'Kachia, Kaduna',  area:1.9, status:'pending',  lat:9.863, lng:7.938, commodity:'ginger', notes:'Pending boundary verification. New GACON member, 2026 season.' },
  ];

  // 5. Farms — Kagarko LGA (2 hibiscus)
  section('Farms — Kagarko LGA, Kaduna (hibiscus)');
  const kagarkoHibiscusDefs: FarmDef[] = [
    { name:'Hauwa Bello',   phone:'+2348041200004', community:'Kagarko, Kaduna', area:2.1, status:'approved', lat:9.718, lng:7.602, commodity:'hibiscus', notes:'GACON cooperative member. Dried hibiscus calyces. EU market.' },
    { name:'Garba Yakubu',  phone:'+2348041200005', community:'Kagarko, Kaduna', area:1.7, status:'approved', lat:9.705, lng:7.617, commodity:'hibiscus', notes:'GACON cooperative member. Farm adjacent to seasonal wetland.' },
  ];

  const allFarmDefs = [...kachiaGingerDefs, ...kagarkoHibiscusDefs];
  const allFarms = await ins('farms', allFarmDefs.map(f => ({
    org_id: orgId,
    farmer_name: f.name,
    phone: f.phone,
    community: f.community,
    area_hectares: f.area,
    compliance_status: f.status,
    compliance_notes: f.notes ?? null,
    commodity: f.commodity,
    created_by: adminUserId,
    boundary: {
      type: 'Polygon',
      coordinates: [[[f.lng-.004, f.lat-.004],[f.lng+.004, f.lat-.004],[f.lng+.004, f.lat+.004],[f.lng-.004, f.lat+.004],[f.lng-.004, f.lat-.004]]],
    },
    created_at: daysAgo(rnd(30, 60)),
  })), '5 farms — Kachia (ginger) + Kagarko (hibiscus)');

  const [kF1, kF2, kF3, kF4, kF5] = allFarms;  // kF1-kF3 ginger, kF4-kF5 hibiscus

  // 6. Collection Batch — Ginger (Kachia farms)
  section('Collection Batch — Ginger');
  const [gingerBatch] = await ins('collection_batches', {
    org_id: orgId,
    batch_code: 'GCN-GNG-2026-001',
    farm_id: (kF1 as any).id,   // primary farm; contributions cover others
    agent_id: agentId,
    status: 'completed',
    commodity: 'ginger',
    grade: 'Grade 1',
    total_weight: 3200,
    bag_count: 64,
    yield_validated: true,
    community: 'Kachia, Kaduna',
    state: 'Kaduna',
    lga: 'Kachia',
    collected_at: daysAgo(25),
    synced_at: daysAgo(24),
  }, 'GCN-GNG-2026-001 — 3,200 kg ginger');

  // 7. Batch contributions (multi-farm cooperative)
  section('Batch Contributions');
  await tryIns('batch_contributions', [
    { batch_id:(gingerBatch as any).id, farm_id:(kF1 as any).id, farmer_name:'Abubakar Sule',  weight_kg:1050, bag_count:21, compliance_status:'verified', notes:'GCN-GNG-2026-001 — GACON cooperative contributor' },
    { batch_id:(gingerBatch as any).id, farm_id:(kF2 as any).id, farmer_name:'Hadiza Ibrahim', weight_kg:1280, bag_count:26, compliance_status:'verified', notes:'GCN-GNG-2026-001 — GACON cooperative contributor' },
    { batch_id:(gingerBatch as any).id, farm_id:(kF3 as any).id, farmer_name:'Musa Danladi',   weight_kg:870,  bag_count:17, compliance_status:'pending',  notes:'GCN-GNG-2026-001 — GACON cooperative contributor (boundary verification pending)' },
  ], '3 ginger farm contributions');

  // 8. Bags
  section('Bags');
  const bagRows = Array.from({ length: 64 }, (_, i) => ({
    org_id: orgId,
    collection_batch_id: (gingerBatch as any).id,
    serial: `GCN-GNG-001-${String(i+1).padStart(3,'0')}`,
    status: 'collected',
    weight_kg: 50,
    grade: 'A',
    is_compliant: true,
  }));
  await tryIns('bags', bagRows, '64 ginger bags');

  // 9. Processing Run
  section('Processing Run');
  const [gingerRun] = await ins('processing_runs', {
    org_id: orgId,
    run_code: 'GCN-RUN-001',
    commodity: 'ginger',
    input_weight_kg: 3200,
    output_weight_kg: 780,
    recovery_rate: 24.4,
    mass_balance_valid: true,
    facility_name: 'GACON Kachia Processing Centre',
    facility_location: 'Kachia, Kaduna State, Nigeria',
    notes: 'Cleaned, peeled, split, and dried. 24.4% recovery to export-grade dried split ginger.',
    processed_at: daysAgo(18),
    created_by: adminUserId,
  }, 'GCN-RUN-001');

  await tryIns('processing_run_batches', {
    processing_run_id: (gingerRun as any).id,
    collection_batch_id: (gingerBatch as any).id,
  }, 'run-batch link');

  // 10. Finished Good
  section('Finished Good');
  const [gingerFG] = await ins('finished_goods', {
    org_id: orgId,
    processing_run_id: (gingerRun as any).id,
    pedigree_code: 'PED-GCN-001',
    product_name: 'Dried Split Ginger — EU Export Grade',
    product_type: 'spice',
    weight_kg: 780,
    batch_number: 'FG-GCN-2026-001',
    lot_number: 'LOT-GCN-EU-001',
    production_date: dateStr(18),
    destination_country: 'Germany',
    buyer_company: 'EuroSpice GmbH',
    pedigree_verified: true,
    created_by: adminUserId,
  }, 'FG-GCN-2026-001');

  // 11. Shipment — draft EU, Conditional (score 67, 2 doc gaps)
  section('Shipment — EU Draft (Conditional)');
  const [euShipment] = await ins('shipments', {
    org_id: orgId,
    created_by: adminUserId,
    shipment_code: 'GCN-SHP-2026-001',
    status: 'draft',
    destination_country: 'Germany',
    destination_port: 'Hamburg',
    commodity: 'Dried Split Ginger',
    buyer_company: 'EuroSpice GmbH',
    buyer_contact: 'procurement@eurospice-demo.com',
    target_regulations: ['EUDR', 'EU Phytosanitary'],
    estimated_ship_date: dateStr(-14),
    compliance_profile_id: (eudrProf as any).id,
    readiness_score: 67,
    readiness_decision: 'conditional',
    risk_flags: [
      {
        severity: 'warning',
        category: 'Documentation',
        message: 'Due Diligence Statement not yet uploaded. Required for EUDR compliance.',
        is_hard_fail: false,
      },
      {
        severity: 'warning',
        category: 'Documentation',
        message: 'Phytosanitary certificate pending NAFDAC issuance.',
        is_hard_fail: false,
      },
    ],
    score_breakdown: [
      { name: 'Traceability Integrity',      score: 90 },
      { name: 'Documentation Completeness',  score: 45 },
      { name: 'Chemical & Contamination Risk', score: 88 },
      { name: 'Storage & Handling Controls', score: 72 },
      { name: 'Regulatory Alignment',        score: 70 },
    ],
    notes: 'DDS and phytosanitary certificate outstanding. All farm polygons verified deforestation-free.',
  }, 'GCN-SHP-2026-001 — 67/100 Conditional');

  // 12. Shipment Item
  await tryIns('shipment_items', {
    shipment_id: (euShipment as any).id,
    item_type: 'finished_good',
    finished_good_id: (gingerFG as any).id,
    weight_kg: (gingerFG as any).weight_kg,
  }, 'shipment item link');

  // 13. Documents — 4 present, 2 gaps (DDS + phytosanitary missing)
  section('Documents');
  const sd = (t: string) => t;  // document_type passthrough
  await tryIns('documents', [
    {
      org_id: orgId,
      title: 'Certificate of Origin — GACON Ginger (NEPC)',
      document_type: sd('certificate_of_origin'),
      status: 'active',
      linked_entity_type: 'shipment',
      linked_entity_id: (euShipment as any).id,
      expiry_date: dateStr(-90),
      file_url: 'https://demo.origintrace.com/docs/gacon/coo-ginger.pdf',
      uploaded_by: adminUserId,
      notes: 'Issued by NEPC. Origin: Kaduna State, Nigeria.',
    },
    {
      org_id: orgId,
      title: 'Export Licence — Ginger (NAFDAC)',
      document_type: sd('export_license'),
      status: 'active',
      linked_entity_type: 'shipment',
      linked_entity_id: (euShipment as any).id,
      expiry_date: dateStr(-180),
      file_url: 'https://demo.origintrace.com/docs/gacon/export-licence.pdf',
      uploaded_by: adminUserId,
      notes: 'NAFDAC product registration and export clearance.',
    },
    {
      org_id: orgId,
      title: 'MRL Lab Result — Pesticide Residue (Ginger/EU)',
      document_type: sd('lab_result'),
      status: 'active',
      linked_entity_type: 'shipment',
      linked_entity_id: (euShipment as any).id,
      expiry_date: dateStr(-30),
      file_url: 'https://demo.origintrace.com/docs/gacon/mrl-ginger-eu.pdf',
      uploaded_by: adminUserId,
      notes: 'NAFDAC-accredited lab. No detectable residues above EU EC 396/2005 MRL limits.',
    },
    {
      org_id: orgId,
      title: 'GPS Polygon Verification Report — 3 Farms',
      document_type: sd('other'),
      status: 'active',
      linked_entity_type: 'shipment',
      linked_entity_id: (euShipment as any).id,
      expiry_date: null,
      file_url: 'https://demo.origintrace.com/docs/gacon/polygon-verification.pdf',
      uploaded_by: adminUserId,
      notes: 'Satellite deforestation check passed. All 3 contributing farms verified deforestation-free.',
    },
    // GAP 1: DDS — not uploaded (intentionally absent for demo tension)
    // GAP 2: Phytosanitary certificate — not uploaded, pending NAFDAC issuance
  ], '4 documents uploaded (DDS + phyto absent)');

  // 14. Farmer training
  section('Farmer Training');
  await tryIns('farmer_training', [
    { org_id:orgId, farm_id:(kF1 as any).id, module_name:'EUDR Deforestation Compliance Awareness', module_type:'eudr_awareness', status:'completed', score:88, completed_at:daysAgo(30), assigned_by:adminUserId },
    { org_id:orgId, farm_id:(kF1 as any).id, module_name:'Good Agricultural Practices — Ginger 2026', module_type:'gap', status:'completed', score:91, completed_at:daysAgo(28), assigned_by:adminUserId },
    { org_id:orgId, farm_id:(kF2 as any).id, module_name:'EUDR Deforestation Compliance Awareness', module_type:'eudr_awareness', status:'completed', score:85, completed_at:daysAgo(32), assigned_by:adminUserId },
    { org_id:orgId, farm_id:(kF2 as any).id, module_name:'Good Agricultural Practices — Ginger 2026', module_type:'gap', status:'completed', score:87, completed_at:daysAgo(29), assigned_by:adminUserId },
    { org_id:orgId, farm_id:(kF3 as any).id, module_name:'EUDR Deforestation Compliance Awareness', module_type:'eudr_awareness', status:'in_progress', score:null, completed_at:null, assigned_by:adminUserId },
    { org_id:orgId, farm_id:(kF4 as any).id, module_name:'EUDR Deforestation Compliance Awareness', module_type:'eudr_awareness', status:'completed', score:90, completed_at:daysAgo(25), assigned_by:adminUserId },
    { org_id:orgId, farm_id:(kF4 as any).id, module_name:'Good Agricultural Practices — Hibiscus 2026', module_type:'gap', status:'completed', score:93, completed_at:daysAgo(23), assigned_by:adminUserId },
    { org_id:orgId, farm_id:(kF5 as any).id, module_name:'Good Agricultural Practices — Hibiscus 2026', module_type:'gap', status:'not_started', score:null, completed_at:null, assigned_by:adminUserId },
  ], '8 training records');

  // 15. Notifications
  section('Notifications');
  await tryIns('notifications', [
    { org_id:orgId, user_id:adminUserId, title:'Shipment Conditional — GCN-SHP-2026-001', message:'EU ginger shipment scored 67/100. Due Diligence Statement and phytosanitary certificate outstanding. Resolve gaps to clear for loading.', type:'compliance_alert', link:'/app/shipments', is_read:false, created_at:daysAgo(3) },
    { org_id:orgId, user_id:adminUserId, title:'Farm Pending Review — Musa Danladi', message:'Kachia farm (1.9 ha) awaiting boundary verification. Batch GCN-GNG-2026-001 includes delivery from this farm.', type:'farm_pending', link:'/app/farms', is_read:false, created_at:daysAgo(5) },
    { org_id:orgId, user_id:adminUserId, title:'Gum Arabic Added to Commodity Catalogue', message:'Gum Arabic (HS 1301.20) is now available as a registered commodity. Yield benchmark: 0.4 kg/tree/year (Nigeria).', type:'system', link:'/app/farms', is_read:true, created_at:daysAgo(10) },
  ], '3 notifications');

  // ── Done ──────────────────────────────────────────────────────────────────
  section('✅  GACON seed complete!');
  console.log(`
  Login (password: Demo1234!)
  ────────────────────────────────────────────────────────────────
  GACON Admin : demo.admin@gacon-demo.com
  GACON Agent : demo.agent@gacon-demo.com

  Organisation  : GACON — Gum Arabic & Commodities Nigeria
  Tier          : pro
  Slug          : gacon
  Commodities   : ginger · hibiscus · gum_arabic

  FARMS (5 total)
    Kachia LGA (ginger) : Abubakar Sule ✓ · Hadiza Ibrahim ✓ · Musa Danladi ⏳ pending
    Kagarko LGA (hibiscus) : Hauwa Bello ✓ · Garba Yakubu ✓

  GINGER SUPPLY CHAIN
    3 farms (Kachia) → batch GCN-GNG-2026-001 (3,200 kg · 64 bags)
    → processing run GCN-RUN-001 (dried split ginger, 24.4% recovery)
    → finished good PED-GCN-001 (780 kg)
    → shipment GCN-SHP-2026-001 → Hamburg/EU (CONDITIONAL 67/100)

  SHIPMENT GAPS (demo talking points)
    ⚠  Due Diligence Statement not uploaded
    ⚠  Phytosanitary certificate pending NAFDAC

  DEMO FLOW
    Dashboard → Farms (Pending Review tab) → Batches → Shipments
    → GCN-SHP-2026-001 (score 67, Conditional) → DDS export
  `);
}

// ─── MAIN ────────────────────────────────────────────────────────────────────
(async () => {
  if (WIPE) await wipeGaconData();
  if (!WIPE_ONLY) await seed();
})().catch(e => { console.error(e); process.exit(1); });
