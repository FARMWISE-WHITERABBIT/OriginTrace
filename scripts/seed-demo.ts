/**
 * OriginTrace Demo Data Seed Script
 * ===================================
 * Populates the database with a realistic, fully-relational demo dataset.
 * Uses the Supabase admin client (bypasses RLS) but respects all FK constraints.
 *
 * Usage:
 *   npx tsx scripts/seed-demo.ts            # seed everything
 *   npx tsx scripts/seed-demo.ts --wipe     # wipe demo data then re-seed
 *   npx tsx scripts/seed-demo.ts --wipe-only  # wipe demo data only
 *
 * All demo data is tagged with org slugs starting with "demo-" so it can be
 * safely wiped without touching real production data.
 *
 * Data graph seeded:
 *   Orgs:        1 exporter (WhiteRabbit Demo Co.), 1 buyer (NibsEurope GmbH)
 *   Users:       exporter admin + agent, buyer admin, superadmin
 *   Farms:       8 farms (6 clean, 1 deforestation risk, 1 boundary dispute)
 *   Batches:     12 collection batches across farms
 *   Bags:        ~400 bags across batches
 *   Processing:  3 processing runs (2 valid, 1 mass-balance failure)
 *   Finished:    4 finished goods
 *   DPPs:        4 digital product passports
 *   Shipments:   4 shipments (go / conditional / no_go / pending)
 *   Documents:   ~20 documents across shipments
 *   Compliance:  3 compliance profiles (EUDR, FSMA 204, UK)
 *   Contracts:   2 contracts
 *   Tenders:     2 tenders
 */

import { createClient } from '@supabase/supabase-js';
import { randomUUID } from 'crypto';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

// ─── Config ────────────────────────────────────────────────────────────────

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const DEMO_ORG_SLUG = 'demo-whiterabbit';
const DEMO_BUYER_SLUG = 'demo-nibseurope';

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('❌  Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local');
  process.exit(1);
}

const db = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const args = process.argv.slice(2);
const WIPE     = args.includes('--wipe') || args.includes('--wipe-only');
const WIPE_ONLY = args.includes('--wipe-only');

// ─── Helpers ───────────────────────────────────────────────────────────────

function log(msg: string) { console.log(`  ${msg}`); }
function section(title: string) { console.log(`\n▶  ${title}`); }

async function insert<T extends object>(
  table: string,
  rows: T | T[],
  label?: string,
): Promise<any[]> {
  const arr = Array.isArray(rows) ? rows : [rows];
  const { data, error } = await db.from(table).insert(arr).select();
  if (error) {
    console.error(`❌  insert ${table}${label ? ` (${label})` : ''}: ${error.message}`);
    throw error;
  }
  log(`✓  ${table}: inserted ${data!.length}${label ? ` ${label}` : ''}`);
  return data!;
}

async function upsert<T extends object>(
  table: string,
  rows: T | T[],
  onConflict: string,
  label?: string,
): Promise<any[]> {
  const arr = Array.isArray(rows) ? rows : [rows];
  const { data, error } = await db.from(table).upsert(arr, { onConflict }).select();
  if (error) {
    console.error(`❌  upsert ${table}${label ? ` (${label})` : ''}: ${error.message}`);
    throw error;
  }
  log(`✓  ${table}: upserted ${data!.length}${label ? ` ${label}` : ''}`);
  return data!;
}

function daysAgo(n: number) {
  return new Date(Date.now() - n * 86400_000).toISOString();
}

function randomBetween(min: number, max: number) {
  return Math.round(Math.random() * (max - min) + min);
}

// ─── Wipe ──────────────────────────────────────────────────────────────────

async function wipeDemoData() {
  section('Wiping demo data');

  // Fetch demo org IDs first
  const { data: exporterOrg } = await db.from('organizations').select('id').eq('slug', DEMO_ORG_SLUG).single();
  const { data: buyerOrg }    = await db.from('buyer_organizations').select('id').eq('slug', DEMO_BUYER_SLUG).single();

  const exporterOrgId = exporterOrg?.id;
  const buyerOrgId    = buyerOrg?.id;

  if (!exporterOrgId && !buyerOrgId) {
    log('No demo data found — nothing to wipe.');
    return;
  }

  // Delete in reverse dependency order
  const tables: Array<[string, string, string | null]> = [
    // [table, column, value]
    ['superadmin_audit_logs',       'target_id',    exporterOrgId ?? null],
    ['webhook_deliveries',          'endpoint_id',  null], // handled below
    ['pedigree_verification',       'org_id',       exporterOrgId ?? null],
    ['supply_chain_links',          'org_id',       exporterOrgId ?? null],
    ['cold_chain_logs',             'org_id',       exporterOrgId ?? null],
    ['document_alerts',             'org_id',       exporterOrgId ?? null],
    ['audit_events',                'org_id',       exporterOrgId ?? null],
    ['audit_logs',                  'org_id',       exporterOrgId ?? null],
    ['notifications',               'org_id',       exporterOrgId ?? null],
    ['digital_product_passports',   'org_id',       exporterOrgId ?? null],
    ['dds_exports',                 'org_id',       exporterOrgId ?? null],
    ['compliance_documents',        'org_id',       exporterOrgId ?? null],
    ['compliance_files',            'org_id',       exporterOrgId ?? null],
    ['shipment_lot_items',          'org_id',       exporterOrgId ?? null],
    ['shipment_lots',               'org_id',       exporterOrgId ?? null],
    ['shipment_items',              'org_id',       exporterOrgId ?? null],
    ['shipment_outcomes',           'org_id',       exporterOrgId ?? null],
    ['documents',                   'org_id',       exporterOrgId ?? null],
    ['contract_shipments',          'org_id',       exporterOrgId ?? null],
    ['shipments',                   'org_id',       exporterOrgId ?? null],
    ['finished_goods',              'org_id',       exporterOrgId ?? null],
    ['processing_run_batches',      'org_id',       exporterOrgId ?? null],
    ['processing_runs',             'org_id',       exporterOrgId ?? null],
    ['bags',                        'org_id',       exporterOrgId ?? null],
    ['batch_contributions',         'org_id',       exporterOrgId ?? null],
    ['collection_batches',          'org_id',       exporterOrgId ?? null],
    ['farm_conflicts',              'org_id',       exporterOrgId ?? null],
    ['farm_certifications',         'org_id',       exporterOrgId ?? null],
    ['farmer_inputs',               'org_id',       exporterOrgId ?? null],
    ['farmer_training',             'org_id',       exporterOrgId ?? null],
    ['farmer_performance_ledger',   'org_id',       exporterOrgId ?? null],
    ['farmer_accounts',             'org_id',       exporterOrgId ?? null],
    ['yield_predictions',           'org_id',       exporterOrgId ?? null],
    ['farms',                       'org_id',       exporterOrgId ?? null],
    ['compliance_profiles',         'org_id',       exporterOrgId ?? null],
    ['delegations',                 'org_id',       exporterOrgId ?? null],
    ['api_keys',                    'org_id',       exporterOrgId ?? null],
  ];

  for (const [table, col, val] of tables) {
    if (!val) continue;
    const { error } = await db.from(table).delete().eq(col, val);
    if (error && !error.message.includes('does not exist')) {
      log(`  ⚠  ${table}: ${error.message}`);
    } else {
      log(`  ✓  wiped ${table}`);
    }
  }

  // Wipe contracts / tenders between demo orgs
  if (exporterOrgId) {
    await db.from('tender_bids').delete().eq('exporter_org_id', exporterOrgId);
    await db.from('contracts').delete().eq('exporter_org_id', exporterOrgId);
  }
  if (buyerOrgId) {
    await db.from('tenders').delete().eq('buyer_org_id', buyerOrgId);
    await db.from('contracts').delete().eq('buyer_org_id', buyerOrgId);
    await db.from('buyer_profiles').delete().eq('buyer_org_id', buyerOrgId);
    await db.from('buyer_organizations').delete().eq('id', buyerOrgId);
    log('  ✓  wiped buyer_organizations');
  }

  if (exporterOrgId) {
    // Wipe users associated with demo org
    const { data: profiles } = await db.from('profiles').select('user_id').eq('org_id', exporterOrgId);
    if (profiles?.length) {
      for (const p of profiles) {
        await db.auth.admin.deleteUser(p.user_id);
      }
    }
    await db.from('profiles').delete().eq('org_id', exporterOrgId);
    await db.from('organizations').delete().eq('id', exporterOrgId);
    log('  ✓  wiped organizations + users');
  }

  log('✓  Demo wipe complete.');
}

// ─── Seed ──────────────────────────────────────────────────────────────────

async function seed() {
  // ── 1. Organizations ─────────────────────────────────────────────────────
  section('Organizations');

  const [exporterOrg] = await upsert('organizations', {
    name: 'WhiteRabbit Demo Co.',
    slug: DEMO_ORG_SLUG,
    country: 'Nigeria',
    subscription_tier: 'pro',
    subscription_status: 'active',
    compliance_status: 'approved',
  }, 'slug', 'exporter org');

  const [buyerOrg] = await upsert('buyer_organizations', {
    name: 'NibsEurope GmbH',
    slug: DEMO_BUYER_SLUG,
    country: 'Germany',
    contact_email: 'buyer@nibseurope-demo.com',
  }, 'slug', 'buyer org');

  const exporterOrgId: string = exporterOrg.id;
  const buyerOrgId: string    = buyerOrg.id;

  // ── 2. Users ─────────────────────────────────────────────────────────────
  section('Users');

  async function createDemoUser(email: string, password: string, role: string, isBuyer = false) {
    // Check if user already exists
    const { data: existing } = await db.auth.admin.listUsers();
    const users = (existing as any)?.users ?? [];
    const found = users.find((u: any) => u.email === email);
    let userId: string;

    if (found) {
      userId = found.id;
      log(`  ↩  user exists: ${email}`);
    } else {
      const { data, error } = await db.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        app_metadata: {
          app_role: role,
          org_id: isBuyer ? null : exporterOrgId,
          is_superadmin: role === 'superadmin',
        },
      });
      if (error) throw new Error(`createUser ${email}: ${error.message}`);
      userId = data.user.id;
      log(`  ✓  created user: ${email} (${role})`);
    }

    if (!isBuyer && role !== 'superadmin') {
      await upsert('profiles', {
        user_id: userId,
        org_id:  exporterOrgId,
        role,
        full_name: email.split('@')[0].replace('.', ' '),
        email,
      }, 'user_id', `profile for ${role}`);
    }

    if (isBuyer) {
      await upsert('buyer_profiles', {
        user_id:      userId,
        buyer_org_id: buyerOrgId,
        role:         'admin',
        email,
        full_name:    'Buyer Admin Demo',
      }, 'user_id', 'buyer profile');
    }

    return userId;
  }

  const adminUserId  = await createDemoUser('demo.admin@origintrace-demo.com',   'Demo1234!', 'admin');
  const agentUserId  = await createDemoUser('demo.agent@origintrace-demo.com',   'Demo1234!', 'agent');
  await createDemoUser('demo.buyer@nibseurope-demo.com',  'Demo1234!', 'buyer', true);

  // ── 3. Compliance Profiles ───────────────────────────────────────────────
  section('Compliance Profiles');

  const [eudrProfile] = await insert('compliance_profiles', {
    org_id:                  exporterOrgId,
    name:                    'EU Cocoa — EUDR Standard',
    destination_market:      'European Union',
    regulation_framework:    'EUDR',
    required_documents:      ['phytosanitary_certificate', 'due_diligence_statement', 'certificate_of_origin', 'quality_certificate'],
    required_certifications: ['Rainforest Alliance', 'UTZ'],
    geo_verification_level:  'polygon',
    min_traceability_depth:  2,
  }, 'compliance_profiles');

  const [fsmaProfile] = await insert('compliance_profiles', {
    org_id:                  exporterOrgId,
    name:                    'US Cocoa — FSMA 204',
    destination_market:      'United States',
    regulation_framework:    'FSMA_204',
    required_documents:      ['phytosanitary_certificate', 'fda_prior_notice', 'certificate_of_origin', 'bill_of_lading'],
    required_certifications: [],
    geo_verification_level:  'point',
    min_traceability_depth:  1,
  }, 'compliance_profiles');

  const [ukProfile] = await insert('compliance_profiles', {
    org_id:                  exporterOrgId,
    name:                    'UK Cocoa — Environment Act',
    destination_market:      'United Kingdom',
    regulation_framework:    'UK_Environment_Act',
    required_documents:      ['phytosanitary_certificate', 'due_diligence_statement', 'certificate_of_origin'],
    required_certifications: ['Rainforest Alliance'],
    geo_verification_level:  'polygon',
    min_traceability_depth:  2,
  }, 'compliance_profiles');

  // ── 4. Farms ─────────────────────────────────────────────────────────────
  section('Farms');

  // Realistic Ogun/Ondo State cocoa belt coordinates
  const farmData = [
    {
      name: 'Abeokuta North Farm A',
      farmer_name: 'Adebayo Ogunleke',
      farmer_phone: '+2348012345001',
      area_hectares: 3.2,
      state: 'Ogun',
      lga: 'Abeokuta North',
      village: 'Oke-Odan',
      gps_lat: 7.15, gps_lng: 3.35,
      polygon_coordinates: [[7.148,3.348],[7.152,3.348],[7.152,3.352],[7.148,3.352],[7.148,3.348]],
      compliance_status: 'approved',
      deforestation_check: { deforestation_free: true, risk_level: 'low', forest_loss_hectares: 0, analysis_date: daysAgo(30) },
    },
    {
      name: 'Ijebu Ode Farm B',
      farmer_name: 'Folake Adeyemi',
      farmer_phone: '+2348012345002',
      area_hectares: 5.1,
      state: 'Ogun',
      lga: 'Ijebu Ode',
      village: 'Ago-Iwoye',
      gps_lat: 6.82, gps_lng: 3.93,
      polygon_coordinates: [[6.818,3.928],[6.822,3.928],[6.822,3.932],[6.818,3.932],[6.818,3.928]],
      compliance_status: 'approved',
      deforestation_check: { deforestation_free: true, risk_level: 'low', forest_loss_hectares: 0, analysis_date: daysAgo(25) },
    },
    {
      name: 'Ondo South Farm C',
      farmer_name: 'Emeka Nwosu',
      farmer_phone: '+2348012345003',
      area_hectares: 2.8,
      state: 'Ondo',
      lga: 'Ondo West',
      village: 'Oda',
      gps_lat: 7.09, gps_lng: 4.84,
      polygon_coordinates: [[7.088,4.838],[7.092,4.838],[7.092,4.842],[7.088,4.842],[7.088,4.838]],
      compliance_status: 'approved',
      deforestation_check: { deforestation_free: true, risk_level: 'low', forest_loss_hectares: 0, analysis_date: daysAgo(20) },
    },
    {
      name: 'Owo Farm D',
      farmer_name: 'Chukwudi Eze',
      farmer_phone: '+2348012345004',
      area_hectares: 4.5,
      state: 'Ondo',
      lga: 'Owo',
      village: 'Ifon',
      gps_lat: 7.19, gps_lng: 5.59,
      polygon_coordinates: [[7.188,5.588],[7.192,5.588],[7.192,5.592],[7.188,5.592],[7.188,5.588]],
      compliance_status: 'approved',
      deforestation_check: { deforestation_free: true, risk_level: 'low', forest_loss_hectares: 0, analysis_date: daysAgo(18) },
    },
    {
      name: 'Akoko Farm E',
      farmer_name: 'Blessing Okafor',
      farmer_phone: '+2348012345005',
      area_hectares: 6.0,
      state: 'Ondo',
      lga: 'Akoko South-East',
      village: 'Oka',
      gps_lat: 7.46, gps_lng: 5.73,
      polygon_coordinates: [[7.458,5.728],[7.462,5.728],[7.462,5.732],[7.458,5.732],[7.458,5.728]],
      compliance_status: 'approved',
      deforestation_check: { deforestation_free: true, risk_level: 'low', forest_loss_hectares: 0, analysis_date: daysAgo(15) },
    },
    {
      name: 'Cross River Farm F',
      farmer_name: 'Ngozi Amadi',
      farmer_phone: '+2348012345006',
      area_hectares: 3.7,
      state: 'Cross River',
      lga: 'Abi',
      village: 'Afikpo',
      gps_lat: 5.89, gps_lng: 7.92,
      polygon_coordinates: [[5.888,7.918],[5.892,7.918],[5.892,7.922],[5.888,7.922],[5.888,7.918]],
      compliance_status: 'approved',
      deforestation_check: { deforestation_free: true, risk_level: 'low', forest_loss_hectares: 0, analysis_date: daysAgo(12) },
    },
    {
      name: 'Idanre Farm G — DEFORESTATION RISK',
      farmer_name: 'Taiwo Olanrewaju',
      farmer_phone: '+2348012345007',
      area_hectares: 8.2,
      state: 'Ondo',
      lga: 'Idanre',
      village: 'Idanre',
      gps_lat: 7.09, gps_lng: 5.11,
      polygon_coordinates: [[7.088,5.108],[7.092,5.108],[7.092,5.112],[7.088,5.112],[7.088,5.108]],
      compliance_status: 'rejected',
      deforestation_check: { deforestation_free: false, risk_level: 'high', forest_loss_hectares: 1.4, forest_loss_percentage: 17, analysis_date: daysAgo(10), data_source: 'Global Forest Watch' },
    },
    {
      name: 'Ogun East Farm H — PENDING REVIEW',
      farmer_name: 'Sola Akinwale',
      farmer_phone: '+2348012345008',
      area_hectares: 2.1,
      state: 'Ogun',
      lga: 'Ogun Waterside',
      village: 'Abigi',
      gps_lat: 6.58, gps_lng: 4.23,
      polygon_coordinates: [[6.578,4.228],[6.582,4.228],[6.582,4.232],[6.578,4.232],[6.578,4.228]],
      compliance_status: 'pending',
      deforestation_check: null,
    },
  ];

  const farms = await insert('farms', farmData.map(f => ({
    org_id:                exporterOrgId,
    name:                  f.name,
    farmer_name:           f.farmer_name,
    farmer_phone:          f.farmer_phone,
    area_hectares:         f.area_hectares,
    state:                 f.state,
    lga:                   f.lga,
    village:               f.village,
    gps_lat:               f.gps_lat,
    gps_lng:               f.gps_lng,
    polygon_coordinates:   JSON.stringify(f.polygon_coordinates),
    compliance_status:     f.compliance_status,
    deforestation_check:   f.deforestation_check,
    commodity:             'cocoa',
    created_at:            daysAgo(randomBetween(60, 120)),
  })), 'farms (8)');

  const [farmA, farmB, farmC, farmD, farmE, farmF, farmG, farmH] = farms;

  // ── 5. Collection Batches ────────────────────────────────────────────────
  section('Collection Batches');

  const batchRows = [
    // Batch 1-3: Clean batches, EUDR-ready
    { farm_id: farmA.id, batch_code: 'WR-BCH-001', commodity: 'cocoa', grade: 'Grade 1', total_weight: 820, bag_count: 41, has_gps: true, yield_validated: true, compliance_status: 'approved', dispatched: true, collected_at: daysAgo(50) },
    { farm_id: farmB.id, batch_code: 'WR-BCH-002', commodity: 'cocoa', grade: 'Grade 1', total_weight: 1250, bag_count: 63, has_gps: true, yield_validated: true, compliance_status: 'approved', dispatched: true, collected_at: daysAgo(48) },
    { farm_id: farmC.id, batch_code: 'WR-BCH-003', commodity: 'cocoa', grade: 'Grade 2', total_weight: 560, bag_count: 28, has_gps: true, yield_validated: true, compliance_status: 'approved', dispatched: true, collected_at: daysAgo(45) },
    // Batch 4-5: Used in US shipment
    { farm_id: farmD.id, batch_code: 'WR-BCH-004', commodity: 'cocoa', grade: 'Grade 1', total_weight: 940, bag_count: 47, has_gps: true, yield_validated: true, compliance_status: 'approved', dispatched: true, collected_at: daysAgo(40) },
    { farm_id: farmE.id, batch_code: 'WR-BCH-005', commodity: 'cocoa', grade: 'Grade 1', total_weight: 1100, bag_count: 55, has_gps: true, yield_validated: true, compliance_status: 'approved', dispatched: true, collected_at: daysAgo(38) },
    // Batch 6: Clean, UK-bound
    { farm_id: farmF.id, batch_code: 'WR-BCH-006', commodity: 'cocoa', grade: 'Grade 1', total_weight: 720, bag_count: 36, has_gps: true, yield_validated: true, compliance_status: 'approved', dispatched: true, collected_at: daysAgo(35) },
    // Batch 7: Yield flag (low recovery rate anomaly)
    { farm_id: farmA.id, batch_code: 'WR-BCH-007', commodity: 'cocoa', grade: 'Grade 2', total_weight: 310, bag_count: 16, has_gps: true, yield_validated: false, yield_flag_reason: 'Weight per bag (19.4kg) exceeds benchmark for Grade 2 cocoa (max 18kg). Manual verification required.', compliance_status: 'approved', dispatched: false, collected_at: daysAgo(20) },
    // Batch 8: From flagged farm — blocked
    { farm_id: farmG.id, batch_code: 'WR-BCH-008', commodity: 'cocoa', grade: 'Grade 2', total_weight: 1640, bag_count: 82, has_gps: true, yield_validated: false, yield_flag_reason: 'Farm has active deforestation risk flag. Batch quarantined pending farm remediation.', compliance_status: 'rejected', dispatched: false, collected_at: daysAgo(15) },
    // Batch 9: Pending (no GPS yet)
    { farm_id: farmH.id, batch_code: 'WR-BCH-009', commodity: 'cocoa', grade: null, total_weight: 200, bag_count: 10, has_gps: false, yield_validated: false, compliance_status: 'pending', dispatched: false, collected_at: daysAgo(5) },
    // Batches 10-12: Future processing
    { farm_id: farmB.id, batch_code: 'WR-BCH-010', commodity: 'cocoa', grade: 'Grade 1', total_weight: 880, bag_count: 44, has_gps: true, yield_validated: true, compliance_status: 'approved', dispatched: false, collected_at: daysAgo(10) },
    { farm_id: farmC.id, batch_code: 'WR-BCH-011', commodity: 'cocoa', grade: 'Grade 1', total_weight: 960, bag_count: 48, has_gps: true, yield_validated: true, compliance_status: 'approved', dispatched: false, collected_at: daysAgo(8) },
    { farm_id: farmD.id, batch_code: 'WR-BCH-012', commodity: 'cocoa', grade: 'Grade 1', total_weight: 740, bag_count: 37, has_gps: true, yield_validated: true, compliance_status: 'approved', dispatched: false, collected_at: daysAgo(6) },
  ];

  const batches = await insert('collection_batches', batchRows.map(b => ({
    ...b,
    org_id:       exporterOrgId,
    created_by:   agentUserId,
    local_id:     randomUUID(),
    notes:        null,
  })), 'collection_batches (12)');

  // ── 6. Bags ──────────────────────────────────────────────────────────────
  section('Bags');

  // Seed bags for the first 6 batches (the dispatched ones)
  for (let i = 0; i < 6; i++) {
    const batch = batches[i];
    const bagRows = Array.from({ length: batch.bag_count }, () => ({
      org_id:     exporterOrgId,
      batch_id:   batch.id,
      farm_id:    batch.farm_id,
      status:     'dispatched',
      weight_kg:  parseFloat((batch.total_weight / batch.bag_count).toFixed(1)),
    }));
    await insert('bags', bagRows, `bags for batch ${i + 1}`);
  }

  // ── 7. Processing Runs ───────────────────────────────────────────────────
  section('Processing Runs');

  const [run1] = await insert('processing_runs', {
    org_id:             exporterOrgId,
    run_code:           'WR-RUN-001',
    facility_name:      'WhiteRabbit Cocoa Processing, Sagamu',
    commodity:          'cocoa',
    input_weight_kg:    2630,   // batch 1+2+3
    output_weight_kg:   2265,   // ~86% recovery — valid
    recovery_rate:      86.1,
    mass_balance_valid: true,
    processed_at:       daysAgo(35),
    notes:              'Main EU export batch. Grade 1/2 blend, sun-dried 7 days.',
  }, 'processing_runs');

  const [run2] = await insert('processing_runs', {
    org_id:             exporterOrgId,
    run_code:           'WR-RUN-002',
    facility_name:      'WhiteRabbit Cocoa Processing, Sagamu',
    commodity:          'cocoa',
    input_weight_kg:    2040,   // batch 4+5
    output_weight_kg:   1815,   // ~89% recovery — valid
    recovery_rate:      88.9,
    mass_balance_valid: true,
    processed_at:       daysAgo(28),
    notes:              'US export batch. Premium Grade 1 only.',
  }, 'processing_runs');

  const [run3] = await insert('processing_runs', {
    org_id:             exporterOrgId,
    run_code:           'WR-RUN-003',
    facility_name:      'WhiteRabbit Cocoa Processing, Sagamu',
    commodity:          'cocoa',
    input_weight_kg:    720,   // batch 6
    output_weight_kg:   432,   // ~60% recovery — FAIL (too low, flags mass balance)
    recovery_rate:      60.0,
    mass_balance_valid: false,
    processed_at:       daysAgo(20),
    notes:              'UK batch. Mass balance invalid — suspected moisture measurement error. Under investigation.',
  }, 'processing_runs');

  // Link batches to processing runs
  await insert('processing_run_batches', [
    { processing_run_id: run1.id, collection_batch_id: batches[0].id, weight_contribution_kg: 820,  org_id: exporterOrgId },
    { processing_run_id: run1.id, collection_batch_id: batches[1].id, weight_contribution_kg: 1250, org_id: exporterOrgId },
    { processing_run_id: run1.id, collection_batch_id: batches[2].id, weight_contribution_kg: 560,  org_id: exporterOrgId },
    { processing_run_id: run2.id, collection_batch_id: batches[3].id, weight_contribution_kg: 940,  org_id: exporterOrgId },
    { processing_run_id: run2.id, collection_batch_id: batches[4].id, weight_contribution_kg: 1100, org_id: exporterOrgId },
    { processing_run_id: run3.id, collection_batch_id: batches[5].id, weight_contribution_kg: 720,  org_id: exporterOrgId },
  ], 'processing_run_batches');

  // ── 8. Finished Goods ────────────────────────────────────────────────────
  section('Finished Goods');

  const [fg1] = await insert('finished_goods', {
    org_id:               exporterOrgId,
    processing_run_id:    run1.id,
    pedigree_code:        'WR-PED-2026-001',
    product_name:         'Certified Cocoa Beans — EU Grade',
    product_type:         'dried_beans',
    weight_kg:            2265,
    destination_country:  'Germany',
    buyer_company:        'NibsEurope GmbH',
    mass_balance_valid:   true,
    pedigree_verified:    true,
    certification_claims: ['Rainforest Alliance', 'EUDR-compliant', 'Deforestation-free'],
  }, 'finished_goods');

  const [fg2] = await insert('finished_goods', {
    org_id:               exporterOrgId,
    processing_run_id:    run2.id,
    pedigree_code:        'WR-PED-2026-002',
    product_name:         'Premium Cocoa Beans — US Grade',
    product_type:         'dried_beans',
    weight_kg:            1815,
    destination_country:  'United States',
    buyer_company:        'CacaoAmerica LLC',
    mass_balance_valid:   true,
    pedigree_verified:    true,
    certification_claims: ['UTZ Certified', 'FSMA-204-traceable'],
  }, 'finished_goods');

  const [fg3] = await insert('finished_goods', {
    org_id:               exporterOrgId,
    processing_run_id:    run3.id,
    pedigree_code:        'WR-PED-2026-003',
    product_name:         'Cocoa Beans — UK Batch (HOLD)',
    product_type:         'dried_beans',
    weight_kg:            432,
    destination_country:  'United Kingdom',
    buyer_company:        'BritishChoc Ltd',
    mass_balance_valid:   false,
    pedigree_verified:    false,
    certification_claims: [],
  }, 'finished_goods');

  const [fg4] = await insert('finished_goods', {
    org_id:               exporterOrgId,
    processing_run_id:    run1.id,
    pedigree_code:        'WR-PED-2026-004',
    product_name:         'Certified Cocoa Beans — UAE Grade',
    product_type:         'dried_beans',
    weight_kg:            500,
    destination_country:  'United Arab Emirates',
    buyer_company:        'GulfChocolate FZCO',
    mass_balance_valid:   true,
    pedigree_verified:    true,
    certification_claims: ['Halal Certified', 'UAE ESMA compliant'],
  }, 'finished_goods');

  // ── 9. Digital Product Passports ─────────────────────────────────────────
  section('Digital Product Passports');

  async function createDPP(finishedGood: any, extraClaims: object = {}) {
    const code = `DPP-${randomUUID().slice(0, 8).toUpperCase()}`;
    const [dpp] = await insert('digital_product_passports', {
      org_id:               exporterOrgId,
      finished_good_id:     finishedGood.id,
      dpp_code:             code,
      destination_country:  finishedGood.destination_country,
      buyer_company:        finishedGood.buyer_company,
      sustainability_claims: {
        deforestation_free:   finishedGood.mass_balance_valid,
        traceable_to_farm:    true,
        certified:            finishedGood.certification_claims,
        ...extraClaims,
      },
      chain_of_custody: [
        { stage: 'Farm Collection', actors: ['WhiteRabbit Demo Co.'], date: daysAgo(50) },
        { stage: 'Processing',      actors: ['WhiteRabbit Cocoa Processing'], date: daysAgo(35) },
        { stage: 'Export',          actors: ['WhiteRabbit Demo Co.'], date: daysAgo(10) },
      ],
      machine_readable_data: {
        '@context':    'https://schema.org',
        '@type':       'Product',
        name:          finishedGood.product_name,
        description:   'Traceable cocoa beans from Nigeria',
        countryOfOrigin: 'Nigeria',
        weight:        { '@type': 'QuantitativeValue', value: finishedGood.weight_kg, unitCode: 'KGM' },
        certification: finishedGood.certification_claims,
      },
      issued_at: daysAgo(10),
    }, `DPP for ${finishedGood.product_name}`);
    return dpp;
  }

  const dpp1 = await createDPP(fg1, { eudr_compliant: true, geo_verification: 'polygon-level' });
  const dpp2 = await createDPP(fg2, { fsma_traceable: true, cte_records: 4 });
  await createDPP(fg3, { mass_balance_hold: true });  // DPP exists but flagged
  await createDPP(fg4, { halal_certified: true });

  // ── 10. Shipments ────────────────────────────────────────────────────────
  section('Shipments');

  // Shipment 1: GO — full docs, EU, high score
  const [ship1] = await insert('shipments', {
    org_id:               exporterOrgId,
    shipment_code:        'WR-SHP-2026-001',
    status:               'ready',
    destination_country:  'Germany',
    destination_port:     'Hamburg',
    commodity:            'Cocoa Beans',
    buyer_company:        'NibsEurope GmbH',
    buyer_contact:        'buyer@nibseurope-demo.com',
    target_regulations:   ['EUDR', 'Rainforest Alliance'],
    estimated_ship_date:  daysAgo(-14),  // future
    compliance_profile_id: eudrProfile.id,
    readiness_score:      91,
    readiness_decision:   'go',
    doc_status:           { phytosanitary_certificate: true, due_diligence_statement: true, certificate_of_origin: true, quality_certificate: true },
    storage_controls:     { temperature_logged: true, humidity_controlled: true },
    risk_flags:           [],
    score_breakdown:      { traceability: 95, documentation: 90, deforestation: 100, regulatory: 88, operational: 82 },
    notes:                'EU shipment fully cleared. Ready for booking.',
    created_at:           daysAgo(8),
  }, 'shipments');

  // Shipment 2: CONDITIONAL — missing FDA prior notice, US-bound
  const [ship2] = await insert('shipments', {
    org_id:               exporterOrgId,
    shipment_code:        'WR-SHP-2026-002',
    status:               'review',
    destination_country:  'United States',
    destination_port:     'New York',
    commodity:            'Cocoa Beans',
    buyer_company:        'CacaoAmerica LLC',
    buyer_contact:        'imports@cacaoamerica-demo.com',
    target_regulations:   ['FSMA 204', 'Lacey Act'],
    estimated_ship_date:  daysAgo(-21),
    compliance_profile_id: fsmaProfile.id,
    readiness_score:      68,
    readiness_decision:   'conditional',
    doc_status:           { phytosanitary_certificate: true, fda_prior_notice: false, certificate_of_origin: true, bill_of_lading: false },
    storage_controls:     { temperature_logged: true, humidity_controlled: false },
    risk_flags:           [
      { severity: 'critical', category: 'Documentation', message: 'FDA Prior Notice not submitted. Required 8 hours before US port arrival.', is_hard_fail: true },
      { severity: 'warning',  category: 'Documentation', message: 'Bill of Lading not uploaded.', is_hard_fail: false },
    ],
    score_breakdown:      { traceability: 88, documentation: 40, deforestation: 95, regulatory: 55, operational: 70 },
    notes:                'Awaiting FDA Prior Notice submission before clearance.',
    created_at:           daysAgo(6),
  }, 'shipments');

  // Shipment 3: NO-GO — mass balance failure + deforestation risk
  const [ship3] = await insert('shipments', {
    org_id:               exporterOrgId,
    shipment_code:        'WR-SHP-2026-003',
    status:               'blocked',
    destination_country:  'United Kingdom',
    destination_port:     'Tilbury',
    commodity:            'Cocoa Beans',
    buyer_company:        'BritishChoc Ltd',
    buyer_contact:        'ops@britishchoc-demo.com',
    target_regulations:   ['UK Environment Act'],
    estimated_ship_date:  daysAgo(-7),
    compliance_profile_id: ukProfile.id,
    readiness_score:      28,
    readiness_decision:   'no_go',
    doc_status:           { phytosanitary_certificate: true, due_diligence_statement: false, certificate_of_origin: false },
    storage_controls:     { temperature_logged: false, humidity_controlled: false },
    risk_flags:           [
      { severity: 'critical', category: 'Deforestation', message: 'Farm G (Idanre) in supply chain has active deforestation risk. Shipment blocked.', is_hard_fail: true },
      { severity: 'critical', category: 'Mass Balance',  message: 'Processing Run WR-RUN-003 has invalid mass balance (60% recovery rate, min 75% required).', is_hard_fail: true },
      { severity: 'warning',  category: 'Documentation', message: 'Due Diligence Statement missing.', is_hard_fail: false },
    ],
    score_breakdown:      { traceability: 40, documentation: 20, deforestation: 0, regulatory: 35, operational: 50 },
    notes:                'Shipment blocked. Resolve deforestation risk on Farm G and mass balance error on RUN-003 before resubmission.',
    created_at:           daysAgo(4),
  }, 'shipments');

  // Shipment 4: PENDING — fresh, not yet scored
  const [ship4] = await insert('shipments', {
    org_id:               exporterOrgId,
    shipment_code:        'WR-SHP-2026-004',
    status:               'draft',
    destination_country:  'United Arab Emirates',
    destination_port:     'Jebel Ali',
    commodity:            'Cocoa Beans',
    buyer_company:        'GulfChocolate FZCO',
    buyer_contact:        'trade@gulfchoc-demo.com',
    target_regulations:   ['UAE Halal', 'ESMA'],
    estimated_ship_date:  daysAgo(-30),
    compliance_profile_id: null,
    readiness_score:      null,
    readiness_decision:   'pending',
    doc_status:           {},
    storage_controls:     {},
    risk_flags:           [],
    score_breakdown:      null,
    notes:                'Draft shipment. Documents not yet uploaded.',
    created_at:           daysAgo(1),
  }, 'shipments');

  // Link finished goods to shipments
  await insert('shipment_items', [
    { shipment_id: ship1.id, finished_good_id: fg1.id, org_id: exporterOrgId, weight_kg: fg1.weight_kg, item_type: 'finished_good' },
    { shipment_id: ship2.id, finished_good_id: fg2.id, org_id: exporterOrgId, weight_kg: fg2.weight_kg, item_type: 'finished_good' },
    { shipment_id: ship3.id, finished_good_id: fg3.id, org_id: exporterOrgId, weight_kg: fg3.weight_kg, item_type: 'finished_good' },
    { shipment_id: ship4.id, finished_good_id: fg4.id, org_id: exporterOrgId, weight_kg: fg4.weight_kg, item_type: 'finished_good' },
  ], 'shipment_items');

  // ── 11. Documents ────────────────────────────────────────────────────────
  section('Documents');

  const docTypes = [
    { type: 'phytosanitary_certificate', label: 'Phytosanitary Certificate', ship_id: ship1.id, status: 'verified' },
    { type: 'due_diligence_statement',   label: 'Due Diligence Statement',   ship_id: ship1.id, status: 'verified' },
    { type: 'certificate_of_origin',     label: 'Certificate of Origin',     ship_id: ship1.id, status: 'verified' },
    { type: 'quality_certificate',       label: 'Quality Certificate',       ship_id: ship1.id, status: 'verified' },
    { type: 'phytosanitary_certificate', label: 'Phytosanitary Certificate', ship_id: ship2.id, status: 'verified' },
    { type: 'certificate_of_origin',     label: 'Certificate of Origin',     ship_id: ship2.id, status: 'verified' },
    { type: 'phytosanitary_certificate', label: 'Phytosanitary Certificate', ship_id: ship3.id, status: 'rejected' },
    { type: 'due_diligence_statement',   label: 'Due Diligence Statement (DRAFT)', ship_id: ship3.id, status: 'draft' },
  ];

  await insert('documents', docTypes.map(d => ({
    org_id:      exporterOrgId,
    shipment_id: d.ship_id,
    type:        d.type,
    label:       d.label,
    status:      d.status,
    uploaded_by: adminUserId,
    file_url:    `https://demo-storage.origintrace.com/demo-docs/${d.type}-${randomUUID().slice(0,8)}.pdf`,
    created_at:  daysAgo(randomBetween(1, 7)),
  })), 'documents');

  // ── 12. Contracts ────────────────────────────────────────────────────────
  section('Contracts');

  const [contract1] = await insert('contracts', {
    exporter_org_id:    exporterOrgId,
    buyer_org_id:       buyerOrgId,
    contract_code:      'WR-CON-2026-001',
    title:              'Cocoa Supply Agreement Q1-Q2 2026',
    status:             'active',
    commodity:          'Cocoa Beans',
    quantity_mt:        25,
    price_per_mt_usd:   3800,
    incoterm:           'FOB',
    origin_port:        'Lagos',
    destination_port:   'Hamburg',
    quality_spec:       { min_grade: 'Grade 1', max_moisture: 7.5, min_fat: 55 },
    start_date:         daysAgo(60),
    end_date:           daysAgo(-120),
    signed_at:          daysAgo(60),
    notes:              'Annual supply contract. Delivery in 5MT tranches.',
  }, 'contracts');

  await insert('contracts', {
    exporter_org_id:    exporterOrgId,
    buyer_org_id:       buyerOrgId,
    contract_code:      'WR-CON-2026-002',
    title:              'Spot Purchase — 5MT Cocoa March 2026',
    status:             'draft',
    commodity:          'Cocoa Beans',
    quantity_mt:        5,
    price_per_mt_usd:   3950,
    incoterm:           'CIF',
    origin_port:        'Lagos',
    destination_port:   'Hamburg',
    quality_spec:       { min_grade: 'Grade 1', max_moisture: 7.0 },
    start_date:         daysAgo(-7),
    end_date:           daysAgo(-37),
    signed_at:          null,
    notes:              'Spot purchase. Pending contract signature from buyer.',
  }, 'contracts');

  // Link ship1 to contract1
  await insert('contract_shipments', {
    contract_id:  contract1.id,
    shipment_id:  ship1.id,
    org_id:       exporterOrgId,
    linked_at:    daysAgo(8),
  }, 'contract_shipments');

  // ── 13. Tenders ──────────────────────────────────────────────────────────
  section('Tenders');

  const [tender1] = await insert('tenders', {
    buyer_org_id:       buyerOrgId,
    title:              'Request for Cocoa Beans — 20MT Grade 1, Q2 2026',
    status:             'open',
    visibility:         'public',
    commodity:          'Cocoa Beans',
    quantity_mt:        20,
    target_price_usd:   3700,
    destination_port:   'Hamburg',
    required_certifications: ['Rainforest Alliance', 'EUDR-compliant'],
    closing_date:       daysAgo(-21),
    notes:              'Looking for reliable West Africa supplier with EUDR compliance.',
  }, 'tenders');

  await insert('tenders', {
    buyer_org_id:       buyerOrgId,
    title:              'Invited Tender — 10MT Premium Cocoa for Artisan Range',
    status:             'open',
    visibility:         'invited',
    invited_orgs:       [exporterOrgId],
    commodity:          'Cocoa Beans',
    quantity_mt:        10,
    target_price_usd:   4200,
    destination_port:   'Hamburg',
    required_certifications: ['Rainforest Alliance', 'UTZ'],
    closing_date:       daysAgo(-14),
    notes:              'Premium artisan range. Small-batch, high-traceability required.',
  }, 'tenders');

  // Submit a bid from WhiteRabbit on tender1
  await insert('tender_bids', {
    tender_id:            tender1.id,
    exporter_org_id:      exporterOrgId,
    price_per_mt:         3780,
    quantity_available_mt: 20,
    status:               'submitted',
    notes:                'Full EUDR traceability available. DPPs for all lots. Ready to ship from Lagos.',
    submitted_at:         daysAgo(3),
  }, 'tender_bids');

  // ── 14. Farm Conflict ────────────────────────────────────────────────────
  section('Farm Conflicts');

  await insert('farm_conflicts', {
    org_id:       exporterOrgId,
    farm_a_id:    farmG.id,
    farm_b_id:    farmH.id,
    conflict_type: 'boundary_overlap',
    status:       'open',
    overlap_area_hectares: 0.3,
    notes:        'GPS polygons for Farm G and Farm H overlap by ~0.3ha. Field inspection required.',
    detected_at:  daysAgo(12),
  }, 'farm_conflicts');

  // ── Summary ──────────────────────────────────────────────────────────────
  section('✅  Seed complete');
  console.log(`
  Demo credentials (all use password: Demo1234!)
  ─────────────────────────────────────────────
  Exporter Admin:  demo.admin@origintrace-demo.com
  Exporter Agent:  demo.agent@origintrace-demo.com
  Buyer Admin:     demo.buyer@nibseurope-demo.com

  Key URLs (replace with your domain)
  ─────────────────────────────────────────────
  App:             /app/dashboard
  Shipments:       /app/shipments  (4 shipments: go/conditional/no_go/pending)
  Farms:           /app/farms      (8 farms: 6 clean, 1 risk, 1 pending)
  Batches:         /app/batches    (12 batches, yield flag on #7, blocked #8)
  Processing:      /app/processing (3 runs, mass balance fail on RUN-003)
  DPPs:            /app/dpp        (4 DPPs, 1 flagged)
  Conflicts:       /app/conflicts  (1 boundary overlap)
  `);
}

// ─── Main ──────────────────────────────────────────────────────────────────

async function main() {
  if (WIPE) await wipeDemoData();
  if (!WIPE_ONLY) await seed();
}

main().catch(err => {
  console.error('\n❌  Fatal error:', err.message || err);
  process.exit(1);
});
