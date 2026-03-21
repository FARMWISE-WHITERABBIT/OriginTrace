#!/usr/bin/env tsx
/**
 * OriginTrace Demo Seed — fully connected supply chains
 *
 * Chain: farms → batches → bags → processing_run_batches
 *        → processing_runs → finished_goods → shipment_items → shipments
 *        → documents / DPPs / farmer_performance_ledger / batch_contributions
 *
 * Usage:
 *   npm run seed:demo              — seed only
 *   npm run seed:demo:wipe         — wipe only
 *   npm run seed:demo:wipe && npm run seed:demo
 *
 * Prerequisites (run in Supabase SQL Editor):
 *   migrations/20260312_seed_schema_extensions.sql
 *   migrations/20260320_expand_constraints.sql
 *   migrations/20260320_batch_contributions_uuid.sql
 */

import { createClient } from '@supabase/supabase-js';
import { randomUUID } from 'crypto';

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
async function wipeDemoData() {
  section('Wiping demo data');
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
  await db.from('farm_conflicts').delete().gt('id', 0);
  ok('wiped farm_conflicts');
  for (const t of ['tender_bids','tenders','contracts','buyer_organizations']) {
    await db.from(t).delete().neq('id', '00000000-0000-0000-0000-000000000000');
  }
  ok('wiped tenders, contracts, buyer_organizations');
  const { data: demoOrg } = await db.from('organizations').select('id').eq('slug','demo-whiterabbit').single();
  if ((demoOrg as any)?.id) {
    const eId = (demoOrg as any).id;
    const { data: profiles } = await db.from('profiles').select('user_id').eq('org_id', eId);
    for (const p of (profiles || [])) await db.auth.admin.deleteUser((p as any).user_id);
    await db.from('profiles').delete().eq('org_id', eId);
    await db.from('organizations').delete().eq('id', eId);
    ok('wiped org + users');
  }
  const { data: allUsersRes } = await db.auth.admin.listUsers() as any;
  const buyerUser = (allUsersRes?.users || []).find((u: any) => u.email === 'demo.buyer@nibseurope-demo.com');
  if (buyerUser) { await db.auth.admin.deleteUser(buyerUser.id); ok('wiped buyer user'); }
  ok('Wipe complete.');
}

// ─── SEED ────────────────────────────────────────────────────────────────────
async function seed() {

  // 0. Pre-flight
  section('Pre-flight');
  for (const [t, c] of [['collection_batches','batch_code'],['processing_runs','run_code'],['finished_goods','pedigree_code'],['digital_product_passports','dpp_code']] as [string,string][]) {
    const { error } = await db.from(t).select(c).limit(0);
    if (error?.message?.includes(`'${c}'`)) { console.error(`MISSING: ${t}.${c}\nRun migrations first.`); process.exit(1); }
    ok(`${t}.${c} ✓`);
  }

  // 1. Organisation
  section('Organisation');
  const { data: existingOrg } = await db.from('organizations').select('id').eq('slug','demo-whiterabbit').single();
  let eId: string;
  if (existingOrg) { eId = (existingOrg as any).id; ok('org exists'); }
  else {
    const [org] = await ins('organizations', { name: 'WhiteRabbit Demo Co.', slug: 'demo-whiterabbit', subscription_status: 'active', subscription_tier: 'pro', commodities: ['cocoa','ginger','cashew','hibiscus','sesame'] });
    eId = (org as any).id;
  }
  const [buyerOrg] = await ins('buyer_organizations', { name: 'NibsEurope GmbH', slug: 'demo-nibseurope', country: 'Germany', industry: 'Food & Beverage', contact_email: 'procurement@nibseurope-demo.com' });
  const bId: string = (buyerOrg as any).id;

  // 2. Users
  section('Users');
  const PASS = 'Demo1234!';
  const getOrCreateUser = async (email: string, role: string, orgId: string | null, buyerOrgId?: string) => {
    const { data: listRes } = await db.auth.admin.listUsers() as any;
    const existing = (listRes?.users || []).find((u: any) => u.email === email);
    let userId: string;
    if (existing) { userId = existing.id; ok(`exists: ${email}`); }
    else {
      const { data: created, error } = await db.auth.admin.createUser({ email, password: PASS, email_confirm: true, user_metadata: { full_name: email.split('@')[0] } });
      if (error) fail(`createUser ${email}: ${error.message}`);
      userId = created!.user.id; ok(`created: ${email}`);
    }
    if (buyerOrgId) {
      await db.from('buyer_profiles').upsert({ user_id: userId, buyer_org_id: buyerOrgId, full_name: email.split('@')[0], role: 'buyer_admin' }, { onConflict: 'user_id' });
      return { userId, profileId: null as string | null };
    }
    const res = await db.from('profiles').upsert({ user_id: userId, org_id: orgId, role, full_name: email.split('@')[0] }, { onConflict: 'user_id' }).select('id').single();
    return { userId, profileId: (res.data as any)?.id ?? null };
  };
  const { userId: adminUserId, profileId: adminProfileId } = await getOrCreateUser('demo.admin@origintrace-demo.com', 'admin', eId);
  const { userId: agentUserId,  profileId: agentProfileId  } = await getOrCreateUser('demo.agent@origintrace-demo.com',  'agent', eId);
  await getOrCreateUser('demo.buyer@nibseurope-demo.com', 'buyer', null, bId);
  const adminId = adminProfileId ?? adminUserId;
  const agentId  = agentProfileId  ?? agentUserId;

  // 3. Compliance Profiles — all 6 markets
  section('Compliance Profiles');
  const [eudrProf] = await ins('compliance_profiles', {
    org_id: eId, name: 'EU EUDR Compliance', destination_market: 'European Union',
    regulation_framework: 'EUDR', is_default: true,
    required_documents: ['Deforestation-free declaration','GPS polygon boundaries','Farmer ID verification','Due diligence statement','Phytosanitary certificate','Certificate of origin'],
    required_certifications: ['Rainforest Alliance'], geo_verification_level: 'polygon', min_traceability_depth: 3,
  }, 'EUDR');
  const [fsmaProf] = await ins('compliance_profiles', {
    org_id: eId, name: 'US FSMA 204 Compliance', destination_market: 'United States',
    regulation_framework: 'FSMA_204',
    required_documents: ['Key Data Elements (KDE) records','Critical Tracking Events (CTE) log','FDA Prior Notice','Certificate of origin','Phytosanitary certificate'],
    required_certifications: [], geo_verification_level: 'basic', min_traceability_depth: 2,
  }, 'FSMA 204');
  const [ukProf] = await ins('compliance_profiles', {
    org_id: eId, name: 'UK Environment Act Compliance', destination_market: 'United Kingdom',
    regulation_framework: 'UK_Environment_Act',
    required_documents: ['Due diligence statement','Risk assessment report','Supply chain mapping','Phytosanitary certificate'],
    required_certifications: [], geo_verification_level: 'polygon', min_traceability_depth: 3,
  }, 'UK');
  const [gaccProf] = await ins('compliance_profiles', {
    org_id: eId, name: 'China GACC Export', destination_market: 'China',
    regulation_framework: 'GACC',
    required_documents: ['GACC registration certificate','Phytosanitary certificate','Fumigation certificate','Certificate of origin','MRL lab result (pesticide residue)','Health certificate'],
    required_certifications: ['ISO 22000','HACCP'], geo_verification_level: 'basic', min_traceability_depth: 2,
  }, 'China GACC');
  const [cnGreenProf] = await ins('compliance_profiles', {
    org_id: eId, name: 'China Green Trade Compliance', destination_market: 'China',
    regulation_framework: 'China_Green_Trade',
    required_documents: ['GACC registration certificate','GB standards compliance certificate','Phytosanitary certificate','Fumigation certificate','Certificate of origin','Lot-level traceability records'],
    required_certifications: [], geo_verification_level: 'polygon', min_traceability_depth: 2,
  }, 'China Green Trade');
  const [uaeProf] = await ins('compliance_profiles', {
    org_id: eId, name: 'UAE / Halal Compliance', destination_market: 'UAE / Middle East',
    regulation_framework: 'UAE_Halal',
    required_documents: ['Halal certification (accredited body)','ESMA compliance certificate','Certificate of origin','Phytosanitary certificate','Traceability chain documentation'],
    required_certifications: [], geo_verification_level: 'basic', min_traceability_depth: 2,
  }, 'UAE Halal');

  // 4. Farms — Cocoa (8)
  section('Farms — Cocoa');
  type FarmDef = { name:string; phone:string; community:string; area:number; status:string; lat:number; lng:number; notes?:string };
  const cocoaDefs: FarmDef[] = [
    { name:'Adebayo Ogunleke', phone:'+2348012345001', community:'Oke-Odan, Ogun',     area:3.2, status:'approved', lat:7.150, lng:3.350 },
    { name:'Folake Adeyemi',   phone:'+2348012345002', community:'Ago-Iwoye, Ogun',    area:5.1, status:'approved', lat:6.820, lng:3.930 },
    { name:'Emeka Nwosu',      phone:'+2348012345003', community:'Oda, Ondo',           area:2.8, status:'approved', lat:7.090, lng:4.840 },
    { name:'Chukwudi Eze',     phone:'+2348012345004', community:'Ifon, Ondo',          area:4.5, status:'approved', lat:7.190, lng:5.590 },
    { name:'Blessing Okafor',  phone:'+2348012345005', community:'Oka, Ondo',           area:6.0, status:'approved', lat:7.460, lng:5.730 },
    { name:'Ngozi Amadi',      phone:'+2348012345006', community:'Afikpo, Cross River', area:3.7, status:'approved', lat:5.890, lng:7.920 },
    { name:'Taiwo Olanrewaju', phone:'+2348012345007', community:'Idanre, Ondo',        area:8.2, status:'rejected', lat:7.090, lng:5.110, notes:'DEFORESTATION RISK: 1.4ha forest loss (17%). Source: Global Forest Watch.' },
    { name:'Sola Akinwale',    phone:'+2348012345008', community:'Abigi, Ogun',         area:2.1, status:'pending',  lat:6.580, lng:4.230 },
  ];
  const cocoaFarms = await ins('farms', cocoaDefs.map(f => ({
    org_id:eId, farmer_name:f.name, phone:f.phone, community:f.community, area_hectares:f.area,
    compliance_status:f.status, compliance_notes:f.notes||null, commodity:'cocoa', created_by:adminUserId,
    boundary:{ type:'Polygon', coordinates:[[[f.lng-.003,f.lat-.003],[f.lng+.003,f.lat-.003],[f.lng+.003,f.lat+.003],[f.lng-.003,f.lat+.003],[f.lng-.003,f.lat-.003]]] },
    created_at:daysAgo(rnd(60,120)),
  })), '8 cocoa farms');
  const [fA,fB,fC,fD,fE,fF,fG,fH] = cocoaFarms;

  // 5. Farms — Ginger / Southern Kaduna (5)
  section('Farms — Ginger');
  const gingerDefs: FarmDef[] = [
    { name:"Yakubu Dauda",  phone:'+2348031100001', community:'Kafanchan, Kaduna',    area:2.4, status:'approved', lat:9.587, lng:8.291, notes:'WhiteRabbit cooperative member. 3rd season. High-quality yellow ginger.' },
    { name:"Hannatu Musa",  phone:'+2348031100002', community:"Jema'a, Kaduna",       area:3.1, status:'approved', lat:9.531, lng:8.345, notes:'WhiteRabbit cooperative member. Farm mapped Feb 2026.' },
    { name:"Daniel Bawa",   phone:'+2348031100003', community:'Sanga, Kaduna',        area:1.8, status:'approved', lat:9.621, lng:8.470, notes:'WhiteRabbit cooperative member. Adjacent to Sanga River.' },
    { name:"Rachael Garba", phone:'+2348031100004', community:'Kaura, Kaduna',        area:2.9, status:'approved', lat:9.710, lng:8.180, notes:'WhiteRabbit cooperative member. Intercropped with turmeric.' },
    { name:"Ibrahim Tanko", phone:'+2348031100005', community:'Zangon Kataf, Kaduna', area:2.2, status:'pending',  lat:9.669, lng:8.233, notes:'Pending boundary verification. New member 2026 season.' },
  ];
  const gingerFarms = await ins('farms', gingerDefs.map(f => ({
    org_id:eId, farmer_name:f.name, phone:f.phone, community:f.community, area_hectares:f.area,
    compliance_status:f.status, compliance_notes:f.notes||null, commodity:'ginger', created_by:adminUserId,
    boundary:{ type:'Polygon', coordinates:[[[f.lng-.004,f.lat-.004],[f.lng+.004,f.lat-.004],[f.lng+.004,f.lat+.004],[f.lng-.004,f.lat+.004],[f.lng-.004,f.lat-.004]]] },
    created_at:daysAgo(rnd(30,60)),
  })), '5 ginger farms — Southern Kaduna');
  const [gF1,gF2,gF3,gF4,gF5] = gingerFarms;

  // 5b. Cashew Farms — Kogi State
  section('Cashew Farms');
  type CashewFarmDef = { name:string; phone:string; community:string; area:number; status:string; lat:number; lng:number; notes:string };
  const cashewDefs: CashewFarmDef[] = [
    { name:'Abubakar Suleiman', phone:'+2348055600001', community:'Kabba, Kogi',        area:3.8, status:'approved', lat:7.834, lng:6.072, notes:'Cooperative lead. 6-year cashew stands. Rainforest Alliance candidate.' },
    { name:'Grace Oduola',      phone:'+2348055600002', community:'Lokoja, Kogi',        area:2.5, status:'approved', lat:7.802, lng:6.742, notes:'Family-run orchard. Manual harvest, sun-dried.' },
    { name:'Ibrahim Yusuf',     phone:'+2348055600003', community:'Okene, Kogi',         area:4.1, status:'pending',  lat:7.548, lng:6.231, notes:'New member. Pending GIS verification.' },
    { name:'Fatima Adeyemi',    phone:'+2348055600004', community:'Kabba, Kogi',         area:2.2, status:'approved', lat:7.845, lng:6.061, notes:'Premium raw cashew. High kernel outturn.' },
  ];
  const cashewFarms = await ins('farms', cashewDefs.map(f => ({
    org_id:eId, farmer_name:f.name, phone_number:f.phone, community:f.community,
    area_hectares:f.area, compliance_status:f.status, compliance_notes:f.notes,
    commodity:'cashew', state:'Kogi', lga:'Kabba-Bunu',
    latitude:f.lat, longitude:f.lng, created_by:adminUserId, consent_given:true,
    created_at:daysAgo(rnd(45,90)),
  })), '4 cashew farms — Kogi State');
  const [cF1,cF2,cF3,cF4] = cashewFarms;

  // 5c. Hibiscus Farms — Kano State
  section('Hibiscus Farms');
  type HibiscusFarmDef = { name:string; phone:string; community:string; area:number; status:string; lat:number; lng:number; notes:string };
  const hibiscusDefs: HibiscusFarmDef[] = [
    { name:'Musa Garba',        phone:'+2348066700001', community:'Wudil, Kano',         area:1.8, status:'approved', lat:11.797, lng:8.848, notes:'Organic hibiscus. EU export grade. No synthetic inputs.' },
    { name:'Hauwa Usman',       phone:'+2348066700002', community:'Gaya, Kano',          area:2.3, status:'approved', lat:11.888, lng:9.013, notes:'Co-op member. 2nd season. Hand-picked calyces.' },
    { name:'Yusuf Bala',        phone:'+2348066700003', community:'Kura, Kano',          area:1.5, status:'pending',  lat:11.749, lng:8.420, notes:'First season. Good crop density.' },
  ];
  const hibiscusFarms = await ins('farms', hibiscusDefs.map(f => ({
    org_id:eId, farmer_name:f.name, phone_number:f.phone, community:f.community,
    area_hectares:f.area, compliance_status:f.status, compliance_notes:f.notes,
    commodity:'hibiscus', state:'Kano', lga:'Wudil',
    latitude:f.lat, longitude:f.lng, created_by:adminUserId, consent_given:true,
    created_at:daysAgo(rnd(20,50)),
  })), '3 hibiscus farms — Kano State');
  const [hF1,hF2,hF3] = hibiscusFarms;

  // 6. Cocoa Collection Batches (each linked to a specific farm via farm_id)
  section('Cocoa Collection Batches');
  type BatchDef = { farm:any; code:string; weight:number; bags:number; grade:string|null; validated:boolean; status:string; daysBack:number; flag?:string };
  const cocoaBatchDefs: BatchDef[] = [
    { farm:fA, code:'WR-BCH-001', weight:820,  bags:41, grade:'Grade 1', validated:true,  status:'completed',  daysBack:50 },
    { farm:fB, code:'WR-BCH-002', weight:1250, bags:63, grade:'Grade 1', validated:true,  status:'completed',  daysBack:48 },
    { farm:fC, code:'WR-BCH-003', weight:560,  bags:28, grade:'Grade 2', validated:true,  status:'completed',  daysBack:45 },
    { farm:fD, code:'WR-BCH-004', weight:940,  bags:47, grade:'Grade 1', validated:true,  status:'completed',  daysBack:40 },
    { farm:fE, code:'WR-BCH-005', weight:1100, bags:55, grade:'Grade 1', validated:true,  status:'completed',  daysBack:38 },
    { farm:fF, code:'WR-BCH-006', weight:720,  bags:36, grade:'Grade 1', validated:true,  status:'completed',  daysBack:35 },
    { farm:fA, code:'WR-BCH-007', weight:310,  bags:16, grade:'Grade 2', validated:false, status:'collecting', daysBack:20, flag:'Weight per bag (19.4kg) exceeds Grade 2 benchmark (max 18kg). Manual verification required.' },
    { farm:fG, code:'WR-BCH-008', weight:1640, bags:82, grade:'Grade 2', validated:false, status:'collecting', daysBack:15, flag:'Farm has active deforestation risk. Batch quarantined pending remediation.' },
    { farm:fH, code:'WR-BCH-009', weight:200,  bags:10, grade:null,      validated:false, status:'collecting', daysBack:5 },
    { farm:fB, code:'WR-BCH-010', weight:880,  bags:44, grade:'Grade 1', validated:true,  status:'completed',  daysBack:10 },
    { farm:fC, code:'WR-BCH-011', weight:960,  bags:48, grade:'Grade 1', validated:true,  status:'completed',  daysBack:8 },
    { farm:fD, code:'WR-BCH-012', weight:740,  bags:37, grade:'Grade 1', validated:true,  status:'completed',  daysBack:6 },
  ];
  const cocoaBatches = await ins('collection_batches', cocoaBatchDefs.map(b => ({
    org_id:eId, farm_id:(b.farm as any).id, agent_id:agentId,
    status:b.status, total_weight:b.weight, bag_count:b.bags,
    batch_code:b.code, commodity:'cocoa', grade:b.grade,
    yield_validated:b.validated, yield_flag_reason:b.flag||null,
    local_id:randomUUID(), collected_at:daysAgo(b.daysBack), synced_at:daysAgo(b.daysBack),
    notes:`${b.code} — ${b.grade||'ungraded'} cocoa, ${b.weight}kg${b.flag?' [FLAGGED]':''}`,
    created_at:daysAgo(b.daysBack),
  })), '12 cocoa batches');

  // 7. Ginger Collection Batch (WhiteRabbit cooperative)
  section('Ginger Collection Batch — WhiteRabbit');
  const [gingerBatch] = await ins('collection_batches', {
    org_id:eId, farm_id:(gF1 as any).id, agent_id:agentId,
    status:'completed', total_weight:4850, bag_count:97,
    batch_code:'WRG-GNG-2026-001', commodity:'ginger', grade:'Grade 1',
    yield_validated:true, local_id:randomUUID(),
    collected_at:daysAgo(18), synced_at:daysAgo(18),
    community:'Kafanchan, Kaduna', state:'Kaduna', lga:"Jema'a",
    notes:'Southern Kaduna cooperative — WhiteRabbit Demo Co. 4 member farms. Fresh ginger ready for processing.',
    created_at:daysAgo(18),
  }, 'WRG-GNG-2026-001 ginger batch');

  // 7b. Cashew Batches
  section('Cashew Batches');
  const cashewBatchBase = { org_id:eId, status:'completed', yield_validated:true, created_by:agentId };
  const [cashewBatch1] = await ins('collection_batches', {
    ...cashewBatchBase, farm_id:(cF1 as any).id,
    batch_code:'WRK-CSH-2026-001', commodity:'cashew', grade:'Grade 1',
    total_weight_kg:3200, total_bags:32, collected_at:daysAgo(22),
    community:'Kabba, Kogi', state:'Kogi', lga:'Kabba-Bunu',
    notes:'Premium W320 raw cashew. High kernel outturn. 4 cooperative farms aggregated.',
  }, 'WRK-CSH-2026-001 cashew batch');
  const [cashewBatch2] = await ins('collection_batches', {
    ...cashewBatchBase, farm_id:(cF3 as any).id,
    batch_code:'WRK-CSH-2026-002', commodity:'cashew', grade:'Grade 2',
    total_weight_kg:1800, total_bags:18, collected_at:daysAgo(12),
    community:'Okene, Kogi', state:'Kogi', lga:'Okene',
    notes:'Mixed grade lot. Pending full GIS verification on 1 farm.',
  }, 'WRK-CSH-2026-002 cashew batch');

  // 7c. Hibiscus Batches
  section('Hibiscus Batches');
  const hibiscusBatchBase = { org_id:eId, status:'completed', yield_validated:true, created_by:agentId };
  const [hibiscusBatch1] = await ins('collection_batches', {
    ...hibiscusBatchBase, farm_id:(hF1 as any).id,
    batch_code:'WRH-HIB-2026-001', commodity:'hibiscus', grade:'Grade 1',
    total_weight_kg:1450, total_bags:29, collected_at:daysAgo(16),
    community:'Wudil, Kano', state:'Kano', lga:'Wudil',
    notes:'Organic dried hibiscus calyces. No synthetic inputs. EU export grade. Hand-sorted.',
  }, 'WRH-HIB-2026-001 hibiscus batch');

  // 8. Bags — cocoa batches 1-6 (completed)
  section('Bags — Cocoa');
  const bagProbe: Record<string,any> = { org_id:eId };
  for (const col of ['serial','collection_batch_id','status','weight_kg','grade','is_compliant']) {
    const val: any = { serial:'PROBE-001', collection_batch_id:(cocoaBatches[0] as any).id, status:'collected', weight_kg:1.0, grade:'A', is_compliant:true }[col];
    const { error } = await db.from('bags').insert({ ...bagProbe, [col]:val }).select('id').single();
    if (!error) { await db.from('bags').delete().eq('org_id',eId).eq('serial','PROBE-001'); bagProbe[col]=val; }
    else if (!error.message.includes('schema cache') && !error.message.includes('Could not find')) bagProbe[col]=val;
    else warn(`bags.${col} not in live DB`);
  }
  for (let i = 0; i < 6; i++) {
    const b = cocoaBatchDefs[i]; const br = cocoaBatches[i] as any; const wt = +(b.weight/b.bags).toFixed(1);
    const rows = Array.from({length:b.bags},(_,j) => {
      const r: Record<string,any> = { org_id:eId };
      if('serial'               in bagProbe) r.serial               = `${b.code}-${String(j+1).padStart(3,'0')}`;
      if('collection_batch_id'  in bagProbe) r.collection_batch_id  = br.id;
      if('status'               in bagProbe) r.status               = 'collected';
      if('weight_kg'            in bagProbe) r.weight_kg            = wt;
      if('grade'                in bagProbe) r.grade                = b.grade==='Grade 1'?'A':'B';
      if('is_compliant'         in bagProbe) r.is_compliant         = true;
      return r;
    });
    const { error } = await db.from('bags').insert(rows);
    if (error) warn(`bags ${b.code}: ${error.message.slice(0,80)}`);
    else ok(`bags: ${b.bags} for ${b.code}`);
  }
  // Ginger bags
  if ('collection_batch_id' in bagProbe) {
    const gRows = Array.from({length:97},(_,j) => {
      const r: Record<string,any> = { org_id:eId };
      if('serial'               in bagProbe) r.serial               = `WRG-GNG-2026-001-${String(j+1).padStart(3,'0')}`;
      if('collection_batch_id'  in bagProbe) r.collection_batch_id  = (gingerBatch as any).id;
      if('status'               in bagProbe) r.status               = 'collected';
      if('weight_kg'            in bagProbe) r.weight_kg            = 50;
      if('grade'                in bagProbe) r.grade                = 'A';
      if('is_compliant'         in bagProbe) r.is_compliant         = true;
      return r;
    });
    const { error } = await db.from('bags').insert(gRows);
    if (error) warn(`ginger bags: ${error.message.slice(0,80)}`); else ok('bags: 97 ginger bags');
  }

  // 9. Farmer Performance Ledger (powers /app/farmers)
  section('Farmer Performance Ledger');
  type LedgerDef = { farm:any; def:FarmDef; commodity:string; deliveries:number; batches:number; bags:number; gradeA:number; gradeB:number; last:string|null };
  const ledger: LedgerDef[] = [
    { farm:fA, def:cocoaDefs[0], commodity:'cocoa',  deliveries:861,  batches:2, bags:57,  gradeA:78,  gradeB:22,  last:daysAgo(20) },
    { farm:fB, def:cocoaDefs[1], commodity:'cocoa',  deliveries:2130, batches:2, bags:107, gradeA:91,  gradeB:9,   last:daysAgo(10) },
    { farm:fC, def:cocoaDefs[2], commodity:'cocoa',  deliveries:1520, batches:2, bags:76,  gradeA:55,  gradeB:45,  last:daysAgo(8)  },
    { farm:fD, def:cocoaDefs[3], commodity:'cocoa',  deliveries:1680, batches:2, bags:84,  gradeA:85,  gradeB:15,  last:daysAgo(6)  },
    { farm:fE, def:cocoaDefs[4], commodity:'cocoa',  deliveries:1100, batches:1, bags:55,  gradeA:90,  gradeB:10,  last:daysAgo(38) },
    { farm:fF, def:cocoaDefs[5], commodity:'cocoa',  deliveries:720,  batches:1, bags:36,  gradeA:88,  gradeB:12,  last:daysAgo(35) },
    { farm:fG, def:cocoaDefs[6], commodity:'cocoa',  deliveries:1640, batches:1, bags:82,  gradeA:0,   gradeB:100, last:daysAgo(15) },
    { farm:fH, def:cocoaDefs[7], commodity:'cocoa',  deliveries:200,  batches:1, bags:10,  gradeA:0,   gradeB:100, last:daysAgo(5)  },
    { farm:gF1,def:gingerDefs[0],commodity:'ginger', deliveries:1450, batches:1, bags:29,  gradeA:100, gradeB:0,   last:daysAgo(18) },
    { farm:gF2,def:gingerDefs[1],commodity:'ginger', deliveries:1280, batches:1, bags:26,  gradeA:100, gradeB:0,   last:daysAgo(18) },
    { farm:gF3,def:gingerDefs[2],commodity:'ginger', deliveries:950,  batches:1, bags:19,  gradeA:100, gradeB:0,   last:daysAgo(18) },
    { farm:gF4,def:gingerDefs[3],commodity:'ginger', deliveries:1170, batches:1, bags:23,  gradeA:100, gradeB:0,   last:daysAgo(18) },
    { farm:gF5,def:gingerDefs[4],commodity:'ginger', deliveries:0,    batches:0, bags:0,   gradeA:0,   gradeB:0,   last:null        },
    // Cashew farmers
    { farm:cF1,def:cashewDefs[0],commodity:'cashew', deliveries:3200, batches:1, bags:32,  gradeA:100, gradeB:0,   last:daysAgo(22) },
    { farm:cF2,def:cashewDefs[1],commodity:'cashew', deliveries:1250, batches:1, bags:13,  gradeA:80,  gradeB:20,  last:daysAgo(22) },
    { farm:cF3,def:cashewDefs[2],commodity:'cashew', deliveries:1800, batches:1, bags:18,  gradeA:60,  gradeB:40,  last:daysAgo(12) },
    { farm:cF4,def:cashewDefs[3],commodity:'cashew', deliveries:980,  batches:1, bags:10,  gradeA:90,  gradeB:10,  last:daysAgo(22) },
    // Hibiscus farmers
    { farm:hF1,def:hibiscusDefs[0],commodity:'hibiscus', deliveries:1450, batches:1, bags:29, gradeA:100, gradeB:0, last:daysAgo(16) },
    { farm:hF2,def:hibiscusDefs[1],commodity:'hibiscus', deliveries:920,  batches:1, bags:18, gradeA:90,  gradeB:10, last:daysAgo(16) },
    { farm:hF3,def:hibiscusDefs[2],commodity:'hibiscus', deliveries:0,    batches:0, bags:0,  gradeA:0,   gradeB:0,  last:null        },
  ];
  await tryIns('farmer_performance_ledger', ledger.map(r => ({
    org_id:eId, farm_id:(r.farm as any).id, farmer_name:r.def.name,
    community:r.def.community, area_hectares:r.def.area, commodity:r.commodity,
    total_delivery_kg:r.deliveries, total_bag_count:r.bags, total_batch_count:r.batches,
    total_batches:r.batches, avg_quality_score:r.gradeA, avg_grade_score:r.gradeA,
    grade_a_percentage:r.gradeA, grade_b_percentage:r.gradeB,
    gps_recorded:true, deforestation_free:r.def.status!=='rejected',
    compliance_status:r.def.status==='approved'?'verified':r.def.status==='rejected'?'flagged':'pending',
    consent_collected:r.def.status==='approved', has_consent:r.def.status==='approved',
    last_delivery_date:r.last, current_season:'2026',
  })), '23 ledger rows');

  // 9b. Batch Contributions — links farmers → batches
  section('Batch Contributions');
  // For single-farm cocoa batches (each batch came from one farm/farmer)
  const singleFarmContribs = cocoaBatchDefs.map((b, i) => ({
    batch_id:    (cocoaBatches[i] as any).id,
    farm_id:     (b.farm as any).id,
    farmer_name: (b.farm as any).farmer_name ?? 'Unknown',
    weight_kg:   b.weight,
    bag_count:   b.bags,
    compliance_status: (b.farm as any).compliance_status === 'approved' ? 'verified' : 'pending',
    notes:       `${b.code} — sole contributor`,
  }));
  await ins('batch_contributions', singleFarmContribs, '12 cocoa batch contributions');

  // Ginger batch — 5 contributing farms (cooperative multi-farm contribution)
  // Weights distributed proportionally to farm area
  const gingerContribDefs = [
    { farm:gF1, def:gingerDefs[0], weight:1450, bags:29 },
    { farm:gF2, def:gingerDefs[1], weight:1280, bags:26 },
    { farm:gF3, def:gingerDefs[2], weight:950,  bags:19 },
    { farm:gF4, def:gingerDefs[3], weight:1170, bags:23 },
    { farm:gF5, def:gingerDefs[4], weight:0,    bags:0  },
  ];
  await ins('batch_contributions', gingerContribDefs.map(c => ({
    batch_id:    (gingerBatch as any).id,
    farm_id:     (c.farm as any).id,
    farmer_name: c.def.name,
    weight_kg:   c.weight,
    bag_count:   c.bags,
    compliance_status: c.def.status === 'approved' ? 'verified' : 'pending',
    notes:       c.weight === 0
      ? 'WRG-GNG-2026-001 — registered cooperative member, no delivery this cycle'
      : 'WRG-GNG-2026-001 — WhiteRabbit cooperative contributor',
  })), '5 ginger batch contributions (cooperative)');

  // 10. Processing Runs — Cocoa
  section('Processing Runs — Cocoa');
  const [run1] = await ins('processing_runs', { org_id:eId, run_code:'WR-RUN-001', facility_name:'WhiteRabbit Processing — Sagamu', facility_location:'Sagamu, Ogun State, Nigeria', commodity:'cocoa', input_weight_kg:2630, output_weight_kg:2265, recovery_rate:86.1, mass_balance_valid:true,  processed_at:daysAgo(35), created_by:adminUserId, notes:'EU export batch. Grade 1/2 blend, sun-dried 7 days.' }, 'RUN-001');
  const [run2] = await ins('processing_runs', { org_id:eId, run_code:'WR-RUN-002', facility_name:'WhiteRabbit Processing — Sagamu', facility_location:'Sagamu, Ogun State, Nigeria', commodity:'cocoa', input_weight_kg:2040, output_weight_kg:1815, recovery_rate:88.9, mass_balance_valid:true,  processed_at:daysAgo(28), created_by:adminUserId, notes:'US export batch. Premium Grade 1 only.' }, 'RUN-002');
  const [run3] = await ins('processing_runs', { org_id:eId, run_code:'WR-RUN-003', facility_name:'WhiteRabbit Processing — Sagamu', facility_location:'Sagamu, Ogun State, Nigeria', commodity:'cocoa', input_weight_kg:720,  output_weight_kg:432,  recovery_rate:60.0, mass_balance_valid:false, processed_at:daysAgo(20), created_by:adminUserId, notes:'UK batch — mass balance INVALID. 60% recovery below 75% threshold.' }, 'RUN-003 FAIL');

  await ins('processing_run_batches', [
    { processing_run_id:(run1 as any).id, collection_batch_id:(cocoaBatches[0] as any).id, weight_contribution_kg:820  },
    { processing_run_id:(run1 as any).id, collection_batch_id:(cocoaBatches[1] as any).id, weight_contribution_kg:1250 },
    { processing_run_id:(run1 as any).id, collection_batch_id:(cocoaBatches[2] as any).id, weight_contribution_kg:560  },
    { processing_run_id:(run2 as any).id, collection_batch_id:(cocoaBatches[3] as any).id, weight_contribution_kg:940  },
    { processing_run_id:(run2 as any).id, collection_batch_id:(cocoaBatches[4] as any).id, weight_contribution_kg:1100 },
    { processing_run_id:(run3 as any).id, collection_batch_id:(cocoaBatches[5] as any).id, weight_contribution_kg:720  },
  ], '6 cocoa run-batch links');

  // 11. Processing Run — Ginger (WhiteRabbit)
  section('Processing Run — Ginger');
  const [gingerRun] = await ins('processing_runs', {
    org_id:eId, run_code:'WRG-RUN-001',
    facility_name:'WhiteRabbit Processing — Lagos', facility_location:'Magodo GRA, Lagos, Nigeria',
    commodity:'ginger', input_weight_kg:4850, output_weight_kg:1165, recovery_rate:24.0,
    mass_balance_valid:true, processed_at:daysAgo(12), created_by:adminUserId,
    notes:'Washed, peeled, split, tray-dried at 60°C/48hrs. Moisture <12%. ISO 22000/HACCP controls.',
  }, 'WRG-RUN-001 dried split ginger');
  await ins('processing_run_batches', { processing_run_id:(gingerRun as any).id, collection_batch_id:(gingerBatch as any).id, weight_contribution_kg:4850 }, 'ginger run-batch link');

  // 12. Finished Goods
  section('Finished Goods');
  const fgB = { org_id:eId, created_by:adminUserId };
  const [fg1] = await ins('finished_goods', { ...fgB, processing_run_id:(run1 as any).id, pedigree_code:'PED-WR-001', product_name:'Certified Cocoa Beans — EU Grade',          product_type:'dried_beans', weight_kg:2265, batch_number:'FG-2026-001', lot_number:'LOT-EU-001',  production_date:dateStr(35), destination_country:'Germany',              buyer_company:'NibsEurope GmbH',             pedigree_verified:true }, 'FG1 EU');
  const [fg2] = await ins('finished_goods', { ...fgB, processing_run_id:(run2 as any).id, pedigree_code:'PED-WR-002', product_name:'Premium Cocoa Beans — US Grade',            product_type:'dried_beans', weight_kg:1815, batch_number:'FG-2026-002', lot_number:'LOT-US-001',  production_date:dateStr(28), destination_country:'United States',         buyer_company:'CacaoAmerica LLC',            pedigree_verified:true }, 'FG2 US');
  const [fg3] = await ins('finished_goods', { ...fgB, processing_run_id:(run3 as any).id, pedigree_code:'PED-WR-003', product_name:'Cocoa Beans — UK Batch (HOLD)',             product_type:'dried_beans', weight_kg:432,  batch_number:'FG-2026-003', lot_number:'LOT-UK-001',  production_date:dateStr(20), destination_country:'United Kingdom',        buyer_company:'BritishChoc Ltd',             pedigree_verified:false, verification_notes:'Mass balance invalid — under investigation.' }, 'FG3 UK');
  const [fg4] = await ins('finished_goods', { ...fgB, processing_run_id:(run1 as any).id, pedigree_code:'PED-WR-004', product_name:'Certified Cocoa Beans — UAE Grade',         product_type:'dried_beans', weight_kg:1200, batch_number:'FG-2026-004', lot_number:'LOT-UAE-001', production_date:dateStr(30), destination_country:'United Arab Emirates',  buyer_company:'GulfChocolate FZCO',          pedigree_verified:true }, 'FG4 UAE');
  const [gingerFG] = await ins('finished_goods', { ...fgB, processing_run_id:(gingerRun as any).id, pedigree_code:'PED-WRG-001', product_name:'Dried Split Ginger — China Export Grade', product_type:'spice', weight_kg:1165, batch_number:'FG-WRG-2026-001', lot_number:'LOT-CN-001', production_date:dateStr(12), destination_country:'China', buyer_company:'Tianjin Spice Imports Co. Ltd', pedigree_verified:true }, 'FG5 ginger China');

  // 13. Shipments
  section('Shipments');
  const sB = { org_id:eId, created_by:adminUserId };
  const [ship1] = await ins('shipments', { ...sB, shipment_code:'WR-SHP-2026-001', status:'ready', destination_country:'Germany',              destination_port:'Hamburg',   commodity:'Cocoa Beans',       buyer_company:'NibsEurope GmbH',             buyer_contact:'demo.buyer@nibseurope-demo.com',    target_regulations:['EUDR','Rainforest Alliance'],     estimated_ship_date:dateStr(-14), compliance_profile_id:(eudrProf as any).id,   readiness_score:91,   readiness_decision:'go',           risk_flags:[],                                                                                                                                                                                                                                                                                                                                                                score_breakdown:[{name:'Traceability Integrity',score:95},{name:'Documentation Completeness',score:90},{name:'Chemical & Contamination Risk',score:100},{name:'Storage & Handling Controls',score:88},{name:'Regulatory Alignment',score:82}], notes:'EU shipment fully cleared. Ready for booking.' }, 'SHP-001 EU go');
  const [ship2] = await ins('shipments', { ...sB, shipment_code:'WR-SHP-2026-002', status:'ready', destination_country:'United States',         destination_port:'New York',  commodity:'Cocoa Beans',       buyer_company:'CacaoAmerica LLC',            buyer_contact:'imports@cacaoamerica-demo.com',     target_regulations:['FSMA 204','Lacey Act'],           estimated_ship_date:dateStr(-21), compliance_profile_id:(fsmaProf as any).id,   readiness_score:68,   readiness_decision:'conditional', risk_flags:[{severity:'critical',category:'Documentation',message:'FDA Prior Notice not submitted. Required 8 hours before US port arrival.',is_hard_fail:true},{severity:'warning',category:'Documentation',message:'Bill of Lading not uploaded.',is_hard_fail:false}], score_breakdown:[{name:'Traceability Integrity',score:88},{name:'Documentation Completeness',score:40},{name:'Chemical & Contamination Risk',score:95},{name:'Storage & Handling Controls',score:55},{name:'Regulatory Alignment',score:70}], notes:'Awaiting FDA Prior Notice.' }, 'SHP-002 US conditional');
  const [ship3] = await ins('shipments', { ...sB, shipment_code:'WR-SHP-2026-003', status:'draft', destination_country:'United Kingdom',        destination_port:'Tilbury',   commodity:'Cocoa Beans',       buyer_company:'BritishChoc Ltd',             buyer_contact:'ops@britishchoc-demo.com',          target_regulations:['UK Environment Act'],             estimated_ship_date:dateStr(-7),  compliance_profile_id:(ukProf as any).id,    readiness_score:28,   readiness_decision:'no_go',        risk_flags:[{severity:'critical',category:'Deforestation',message:'Farm in supply chain has active deforestation risk.',is_hard_fail:true},{severity:'critical',category:'Mass Balance',message:'Processing Run WR-RUN-003 invalid mass balance (60% recovery, min 75%).',is_hard_fail:true},{severity:'warning',category:'Documentation',message:'Due Diligence Statement missing.',is_hard_fail:false}], score_breakdown:[{name:'Traceability Integrity',score:40},{name:'Documentation Completeness',score:20},{name:'Chemical & Contamination Risk',score:0},{name:'Storage & Handling Controls',score:35},{name:'Regulatory Alignment',score:50}], notes:'Blocked.' }, 'SHP-003 UK no-go');
  const [ship4] = await ins('shipments', { ...sB, shipment_code:'WR-SHP-2026-004', status:'draft', destination_country:'United Arab Emirates',  destination_port:'Jebel Ali', commodity:'Cocoa Beans',       buyer_company:'GulfChocolate FZCO',          buyer_contact:'trade@gulfchoc-demo.com',           target_regulations:['UAE Halal','ESMA'],              estimated_ship_date:dateStr(-30), compliance_profile_id:(uaeProf as any).id,   readiness_score:null, readiness_decision:'pending',      risk_flags:[],                                                                                                                                                                                                                                                                                                                                                                score_breakdown:[], notes:'Draft. Documents not yet uploaded.' }, 'SHP-004 UAE pending');
  const [gingerShip] = await ins('shipments', { ...sB, shipment_code:'WRG-SHP-2026-001', status:'ready', destination_country:'China',          destination_port:'Tianjin',   commodity:'Dried Split Ginger', buyer_company:'Tianjin Spice Imports Co. Ltd', buyer_contact:'imports@tianjinspice-demo.com',   target_regulations:['China GACC','China Green Trade'], estimated_ship_date:dateStr(-5),  compliance_profile_id:(gaccProf as any).id,  readiness_score:82,   readiness_decision:'go',           risk_flags:[{severity:'warning',category:'Documentation',message:'MRL lab result issued 28 days ago — retest recommended before vessel loading.',is_hard_fail:false}], score_breakdown:[{name:'Traceability Integrity',score:90},{name:'Documentation Completeness',score:75},{name:'Chemical & Contamination Risk',score:100},{name:'Storage & Handling Controls',score:88},{name:'Regulatory Alignment',score:80}], notes:'GACC number on packaging. Phytosanitary applied. Fumigation complete 4 days ago.' }, 'SHP-005 WRG ginger China go');

  // 14. Shipment Items (links finished goods → shipments)
  section('Shipment Items');
  await ins('shipment_items', [
    { shipment_id:(ship1 as any).id,      item_type:'finished_good', finished_good_id:(fg1 as any).id,      weight_kg:(fg1 as any).weight_kg      },
    { shipment_id:(ship2 as any).id,      item_type:'finished_good', finished_good_id:(fg2 as any).id,      weight_kg:(fg2 as any).weight_kg      },
    { shipment_id:(ship3 as any).id,      item_type:'finished_good', finished_good_id:(fg3 as any).id,      weight_kg:(fg3 as any).weight_kg      },
    { shipment_id:(ship4 as any).id,      item_type:'finished_good', finished_good_id:(fg4 as any).id,      weight_kg:(fg4 as any).weight_kg      },
    { shipment_id:(gingerShip as any).id, item_type:'finished_good', finished_good_id:(gingerFG as any).id, weight_kg:(gingerFG as any).weight_kg  },
  ], '5 shipment items');

  // 15. Digital Product Passports
  section('DPPs');
  await ins('digital_product_passports', [
    { org_id:eId, finished_good_id:(fg1 as any).id,      dpp_code:'DPP-'+randomUUID().slice(0,8).toUpperCase(), product_category:'dried_beans', origin_country:'NG', sustainability_claims:{deforestation_free:true,eudr_compliant:true}, certifications:['Rainforest Alliance','EUDR-compliant'], processing_history:[{run_code:'WR-RUN-001',input_kg:2630,output_kg:2265,recovery_rate:86.1}], chain_of_custody:[{stage:'collection',actor:'WhiteRabbit Demo Co.',date:daysAgo(50)},{stage:'processing',actor:'WhiteRabbit Processing — Sagamu',date:daysAgo(35)}], regulatory_compliance:{pedigree_verified:true,mass_balance_valid:true,dds_submitted:true}, machine_readable_data:{'@context':'https://schema.org','@type':'Product',name:'Certified Cocoa Beans — EU Grade',countryOfOrigin:'Nigeria',producer:'WhiteRabbit Demo Co.'}, passport_version:1, status:'active', issued_at:daysAgo(10), created_by:adminUserId },
    { org_id:eId, finished_good_id:(fg2 as any).id,      dpp_code:'DPP-'+randomUUID().slice(0,8).toUpperCase(), product_category:'dried_beans', origin_country:'NG', sustainability_claims:{fsma_traceable:true,cte_records:4}, certifications:['UTZ Certified','FSMA-204-traceable'], processing_history:[{run_code:'WR-RUN-002',input_kg:2040,output_kg:1815,recovery_rate:88.9}], chain_of_custody:[{stage:'collection',actor:'WhiteRabbit Demo Co.',date:daysAgo(40)},{stage:'processing',actor:'WhiteRabbit Processing — Sagamu',date:daysAgo(28)}], regulatory_compliance:{pedigree_verified:true,mass_balance_valid:true,dds_submitted:false}, machine_readable_data:{'@context':'https://schema.org','@type':'Product',name:'Premium Cocoa Beans — US Grade',countryOfOrigin:'Nigeria',producer:'WhiteRabbit Demo Co.'}, passport_version:1, status:'active', issued_at:daysAgo(8), created_by:adminUserId },
    { org_id:eId, finished_good_id:(fg3 as any).id,      dpp_code:'DPP-'+randomUUID().slice(0,8).toUpperCase(), product_category:'dried_beans', origin_country:'NG', sustainability_claims:{mass_balance_hold:true}, certifications:[], processing_history:[{run_code:'WR-RUN-003',input_kg:720,output_kg:432,recovery_rate:60.0}], chain_of_custody:[{stage:'collection',actor:'WhiteRabbit Demo Co.',date:daysAgo(35)},{stage:'processing',actor:'WhiteRabbit Processing — Sagamu',date:daysAgo(20)}], regulatory_compliance:{pedigree_verified:false,mass_balance_valid:false,dds_submitted:false}, machine_readable_data:{'@context':'https://schema.org','@type':'Product',name:'Cocoa Beans — UK Batch (HOLD)',countryOfOrigin:'Nigeria',producer:'WhiteRabbit Demo Co.'}, passport_version:1, status:'draft', issued_at:null, created_by:adminUserId },
    { org_id:eId, finished_good_id:(fg4 as any).id,      dpp_code:'DPP-'+randomUUID().slice(0,8).toUpperCase(), product_category:'dried_beans', origin_country:'NG', sustainability_claims:{halal_certified:true,esma_compliant:true}, certifications:['Halal Certified','UAE ESMA'], processing_history:[{run_code:'WR-RUN-001',input_kg:2630,output_kg:2265,recovery_rate:86.1}], chain_of_custody:[{stage:'collection',actor:'WhiteRabbit Demo Co.',date:daysAgo(50)},{stage:'processing',actor:'WhiteRabbit Processing — Sagamu',date:daysAgo(35)}], regulatory_compliance:{pedigree_verified:true,mass_balance_valid:true,dds_submitted:false}, machine_readable_data:{'@context':'https://schema.org','@type':'Product',name:'Certified Cocoa Beans — UAE Grade',countryOfOrigin:'Nigeria',producer:'WhiteRabbit Demo Co.'}, passport_version:1, status:'active', issued_at:daysAgo(7), created_by:adminUserId },
    { org_id:eId, finished_good_id:(gingerFG as any).id,  dpp_code:'DPP-WRG-'+randomUUID().slice(0,8).toUpperCase(), product_category:'spice', origin_country:'NG', sustainability_claims:{gacc_registered:true,iso_22000_certified:true,haccp_certified:true,cooperative_sourced:true,gps_traced_farms:4}, certifications:['ISO 22000:2018','HACCP','GACC Registered','NAFDAC Approved'], processing_history:[{run_code:'WRG-RUN-001',input_kg:4850,output_kg:1165,recovery_rate:24.0,process:'Washed→Peeled→Split→Tray-dried 60°C/48hrs'}], chain_of_custody:[{stage:'farm collection',actor:'WhiteRabbit Cooperative — Southern Kaduna',date:daysAgo(18)},{stage:'processing',actor:'WhiteRabbit Processing — Lagos',date:daysAgo(12)},{stage:'export',actor:'WhiteRabbit Demo Co. Export Division',date:daysAgo(5)}], regulatory_compliance:{pedigree_verified:true,mass_balance_valid:true,gacc_compliant:true,dds_submitted:false}, machine_readable_data:{'@context':'https://schema.org','@type':'Product',name:'Dried Split Ginger — China Export Grade',countryOfOrigin:'Nigeria',producer:'WhiteRabbit Demo Co.'}, passport_version:1, status:'active', issued_at:daysAgo(4), created_by:adminUserId },
  ], '5 DPPs');

  // 16. Documents
  section('Documents');
  const dtProbe = ['phytosanitary','certificate_of_origin','quality_cert','fumigation','lab_result','gacc_registration','haccp_cert','iso_cert','other'];
  const validDt: string[] = [];
  for (const dt of dtProbe) {
    const { error } = await db.from('documents').insert({ org_id:eId, title:'PROBE', document_type:dt, linked_entity_type:'organization', linked_entity_id:eId, uploaded_by:adminUserId, file_url:'x' }).select('id').single();
    if (error?.message?.includes('check constraint')||error?.message?.includes('document_type')) warn(`doc_type '${dt}' invalid`);
    else { validDt.push(dt); if (!error) await db.from('documents').delete().eq('title','PROBE').eq('org_id',eId); }
  }
  ok(`valid doc types: ${validDt.join(', ')}`);
  const sd = (p: string) => validDt.includes(p) ? p : (validDt[0]??'other');

  await ins('documents', [
    { org_id:eId, title:'Phytosanitary Certificate — EU Shipment',        document_type:sd('phytosanitary'),          status:'active',        linked_entity_type:'shipment',      linked_entity_id:(ship1 as any).id,      expiry_date:dateStr(-60),  file_url:'https://demo.origintrace.com/docs/phyto-001.pdf',           uploaded_by:adminUserId },
    { org_id:eId, title:'Due Diligence Statement — EU Shipment',           document_type:sd('other'),                  status:'active',        linked_entity_type:'shipment',      linked_entity_id:(ship1 as any).id,      expiry_date:null,          file_url:'https://demo.origintrace.com/docs/dds-001.pdf',             uploaded_by:adminUserId },
    { org_id:eId, title:'Certificate of Origin — EU Shipment',             document_type:sd('certificate_of_origin'), status:'active',        linked_entity_type:'shipment',      linked_entity_id:(ship1 as any).id,      expiry_date:dateStr(-90),  file_url:'https://demo.origintrace.com/docs/coo-001.pdf',             uploaded_by:adminUserId },
    { org_id:eId, title:'Quality Certificate — EU Shipment',               document_type:sd('quality_cert'),          status:'active',        linked_entity_type:'shipment',      linked_entity_id:(ship1 as any).id,      expiry_date:dateStr(-30),  file_url:'https://demo.origintrace.com/docs/qual-001.pdf',            uploaded_by:adminUserId },
    { org_id:eId, title:'Phytosanitary Certificate — US Shipment',        document_type:sd('phytosanitary'),          status:'active',        linked_entity_type:'shipment',      linked_entity_id:(ship2 as any).id,      expiry_date:dateStr(-45),  file_url:'https://demo.origintrace.com/docs/phyto-002.pdf',           uploaded_by:adminUserId },
    { org_id:eId, title:'Certificate of Origin — US Shipment',             document_type:sd('certificate_of_origin'), status:'active',        linked_entity_type:'shipment',      linked_entity_id:(ship2 as any).id,      expiry_date:dateStr(-60),  file_url:'https://demo.origintrace.com/docs/coo-002.pdf',             uploaded_by:adminUserId },
    { org_id:eId, title:'Phytosanitary Certificate (REJECTED)',            document_type:sd('phytosanitary'),          status:'archived',      linked_entity_type:'shipment',      linked_entity_id:(ship3 as any).id,      expiry_date:null,          file_url:'https://demo.origintrace.com/docs/phyto-003.pdf',           uploaded_by:adminUserId },
    { org_id:eId, title:'Due Diligence Statement (DRAFT)',                 document_type:sd('other'),                  status:'archived',      linked_entity_type:'shipment',      linked_entity_id:(ship3 as any).id,      expiry_date:null,          file_url:'https://demo.origintrace.com/docs/dds-003-draft.pdf',       uploaded_by:adminUserId },
    { org_id:eId, title:'GACC Facility Registration Certificate',          document_type:sd('gacc_registration'),      status:'active',        linked_entity_type:'organization',  linked_entity_id:eId,                    expiry_date:dateStr(-365), file_url:'https://demo.origintrace.com/docs/whiterabbit/gacc-reg.pdf',    uploaded_by:adminUserId, notes:'WhiteRabbit Demo Co. — ginger processing facility. Valid until March 2027.' },
    { org_id:eId, title:'ISO 22000:2018 Certification',                    document_type:sd('iso_cert'),               status:'active',        linked_entity_type:'organization',  linked_entity_id:eId,                    expiry_date:dateStr(-720), file_url:'https://demo.origintrace.com/docs/whiterabbit/iso22000.pdf',     uploaded_by:adminUserId, notes:'Food safety management system certification.' },
    { org_id:eId, title:'HACCP Certificate',                               document_type:sd('haccp_cert'),             status:'active',        linked_entity_type:'organization',  linked_entity_id:eId,                    expiry_date:dateStr(-365), file_url:'https://demo.origintrace.com/docs/whiterabbit/haccp.pdf',        uploaded_by:adminUserId, notes:'Annex to ISO 22000.' },
    { org_id:eId, title:'Phytosanitary Certificate — Ginger/China',       document_type:sd('phytosanitary'),          status:'active',        linked_entity_type:'shipment',      linked_entity_id:(gingerShip as any).id, expiry_date:dateStr(-20),  file_url:'https://demo.origintrace.com/docs/whiterabbit/phyto-ginger.pdf', uploaded_by:adminUserId, notes:'Issued by NAFDAC. No live pests detected.' },
    { org_id:eId, title:'Fumigation Certificate — Ginger/China',          document_type:sd('fumigation'),             status:'active',        linked_entity_type:'shipment',      linked_entity_id:(gingerShip as any).id, expiry_date:dateStr(-18),  file_url:'https://demo.origintrace.com/docs/whiterabbit/fumigation.pdf',   uploaded_by:adminUserId, notes:'Methyl bromide. 4 days pre-shipment. IPPC stamp attached.' },
    { org_id:eId, title:'MRL Lab Result — Pesticide Residue (Ginger)',    document_type:sd('lab_result'),             status:'expiring_soon', linked_entity_type:'shipment',      linked_entity_id:(gingerShip as any).id, expiry_date:dateStr(-3),   file_url:'https://demo.origintrace.com/docs/whiterabbit/mrl-ginger.pdf',   uploaded_by:adminUserId, notes:'NAFDAC-accredited lab. Compliant with China GB 2763-2021 MRL limits. Retest recommended.' },
    { org_id:eId, title:'Certificate of Origin — Ginger/China (NEPC)',    document_type:sd('certificate_of_origin'), status:'active',        linked_entity_type:'shipment',      linked_entity_id:(gingerShip as any).id, expiry_date:dateStr(-25),  file_url:'https://demo.origintrace.com/docs/whiterabbit/coo-ginger.pdf',   uploaded_by:adminUserId, notes:'Issued by NEPC. Origin: Kaduna State, Nigeria.' },
  ], '15 documents');

  // 17. Contracts + Tenders
  section('Contracts');
  const [contract1] = await tryIns('contracts', { exporter_org_id:eId, buyer_org_id:bId, contract_reference:'WR-CON-2026-001', status:'active', commodity:'Cocoa Beans', quantity_mt:25, price_per_unit:3800, currency:'USD', quality_requirements:{min_grade:'Grade 1',max_moisture:7.5,min_fat:55}, required_certifications:['Rainforest Alliance'], delivery_deadline:dateStr(-120), destination_port:'Hamburg', compliance_profile_id:(eudrProf as any).id, notes:'Annual supply. Delivery in 5MT tranches.', created_by:adminUserId }, 'contract 1');
  await tryIns('contracts', { exporter_org_id:eId, buyer_org_id:bId, contract_reference:'WR-CON-2026-002', status:'draft', commodity:'Cocoa Beans', quantity_mt:5, price_per_unit:3950, currency:'USD', quality_requirements:{min_grade:'Grade 1',max_moisture:7.0}, delivery_deadline:dateStr(-37), destination_port:'Hamburg', notes:'Spot purchase. Pending signature.', created_by:adminUserId }, 'contract 2');
  if (contract1.length) await tryIns('contract_shipments', { contract_id:(contract1[0] as any).id, shipment_id:(ship1 as any).id }, 'contract-shipment link');

  section('Tenders');
  const [t1] = await tryIns('tenders', { buyer_org_id:bId, title:'Request for Cocoa Beans — 20MT Grade 1, Q2 2026', status:'open', visibility:'public', commodity:'Cocoa Beans', quantity_mt:20, target_price_per_mt:3700, currency:'USD', destination_port:'Hamburg', destination_country:'Germany', certifications_required:['Rainforest Alliance','EUDR-compliant'], regulation_framework:'EUDR', closes_at:daysAgo(-21), created_by:adminUserId }, 'tender 1');
  await tryIns('tenders', { buyer_org_id:bId, title:'Invited Tender — 10MT Premium Cocoa for Artisan Range', status:'open', visibility:'invited', invited_orgs:[eId], commodity:'Cocoa Beans', quantity_mt:10, target_price_per_mt:4200, currency:'USD', destination_port:'Hamburg', destination_country:'Germany', certifications_required:['Rainforest Alliance','UTZ'], closes_at:daysAgo(-14), created_by:adminUserId }, 'tender 2');
  if (t1.length) await tryIns('tender_bids', { tender_id:(t1[0] as any).id, exporter_org_id:eId, price_per_mt:3780, quantity_available_mt:20, status:'submitted', notes:'Full EUDR traceability. DPPs for all lots.', submitted_by:adminUserId }, 'tender bid');

  // 18. Farm Conflicts
  section('Farm Conflicts');
  await tryIns('farm_conflicts', { org_id:eId, farm_a_id:(fG as any).id, farm_b_id:(fH as any).id, overlap_ratio:0.037, status:'pending' }, 'overlap G↔H');

  // 19. Farmer Inputs (agricultural production records — GACC MRL + Rainforest Alliance)
  section('Farmer Inputs');
  const inputDefs = [
    { farm:fA,  type:'fertilizer',         name:'NPK 15-15-15',                      qty:50,  unit:'kg',     date:dateStr(55), area:3.2, notes:'Basal application at beginning of season.' },
    { farm:fA,  type:'organic_amendment',  name:'Composted Palm Bunch',               qty:200, unit:'kg',     date:dateStr(45), area:3.2, notes:'Applied to improve soil organic matter.' },
    { farm:fB,  type:'fertilizer',         name:'Urea 46%',                           qty:75,  unit:'kg',     date:dateStr(52), area:5.1, notes:'Top dressing after heavy rains.' },
    { farm:fB,  type:'pesticide',          name:'Confidor (Imidacloprid)',             qty:2,   unit:'liters', date:dateStr(40), area:5.1, notes:'Target: black pod disease. RA approved list.' },
    { farm:fC,  type:'fertilizer',         name:'NPK 15-15-15',                       qty:40,  unit:'kg',     date:dateStr(50), area:2.8, notes:null },
    { farm:gF1, type:'fertilizer',         name:'CAN (Calcium Ammonium Nitrate)',      qty:60,  unit:'kg',     date:dateStr(25), area:2.4, notes:'Pre-planting fertilizer application.' },
    { farm:gF1, type:'herbicide',          name:'Atrazine 80%WP',                     qty:1.5, unit:'kg',     date:dateStr(22), area:2.4, notes:'Pre-emergence weed control. Compliant with China GB 2763-2021 MRL.' },
    { farm:gF2, type:'fertilizer',         name:'NPK 20-10-10',                       qty:45,  unit:'kg',     date:dateStr(28), area:3.1, notes:'Split application. Second dose at 6 weeks.' },
    { farm:gF2, type:'organic_amendment',  name:'Poultry Manure',                     qty:500, unit:'kg',     date:dateStr(35), area:3.1, notes:'Applied 2 weeks before planting.' },
    { farm:gF3, type:'fertilizer',         name:'CAN (Calcium Ammonium Nitrate)',      qty:40,  unit:'kg',     date:dateStr(26), area:1.8, notes:null },
    { farm:gF4, type:'fertilizer',         name:'NPK 15-15-15',                       qty:55,  unit:'kg',     date:dateStr(24), area:2.9, notes:'Combined for ginger and turmeric intercrop.' },
  ];
  await tryIns('farmer_inputs', inputDefs.map(d => ({
    org_id:eId, farm_id:(d.farm as any).id,
    input_type:d.type, product_name:d.name,
    quantity:d.qty, unit:d.unit,
    application_date:d.date, area_applied_hectares:d.area,
    notes:d.notes, recorded_by:adminUserId,
  })), `${inputDefs.length} input records`);

  // 20. Farmer Training (compliance modules — Rainforest Alliance, EUDR, GACC awareness)
  section('Farmer Training');
  const trainingDefs = [
    // Cocoa farmers
    { farm:fA,  name:'Good Agricultural Practices — Cocoa 2026',  type:'gap',            status:'completed',   score:88, completedAt:daysAgo(45) },
    { farm:fA,  name:'Child Labor Awareness & Prevention',         type:'child_labor',    status:'completed',   score:95, completedAt:daysAgo(44) },
    { farm:fA,  name:'EUDR Deforestation Compliance Awareness',    type:'eudr_awareness', status:'completed',   score:82, completedAt:daysAgo(43) },
    { farm:fB,  name:'Good Agricultural Practices — Cocoa 2026',  type:'gap',            status:'completed',   score:91, completedAt:daysAgo(48) },
    { farm:fB,  name:'Health & Safety in the Field',               type:'safety',         status:'completed',   score:78, completedAt:daysAgo(47) },
    { farm:fB,  name:'Child Labor Awareness & Prevention',         type:'child_labor',    status:'in_progress', score:null, completedAt:null },
    { farm:fC,  name:'Good Agricultural Practices — Cocoa 2026',  type:'gap',            status:'completed',   score:85, completedAt:daysAgo(50) },
    { farm:fC,  name:'Sustainability & Environment Module',        type:'sustainability',  status:'not_started', score:null, completedAt:null },
    // Ginger farmers — GACC and safety focus
    { farm:gF1, name:'GACC Export Standards Awareness',            type:'gap',            status:'completed',   score:90, completedAt:daysAgo(20) },
    { farm:gF1, name:'Pesticide Safety & MRL Compliance',          type:'safety',         status:'completed',   score:87, completedAt:daysAgo(19) },
    { farm:gF1, name:'Good Agricultural Practices — Ginger 2026', type:'gap',            status:'completed',   score:93, completedAt:daysAgo(18) },
    { farm:gF2, name:'GACC Export Standards Awareness',            type:'gap',            status:'completed',   score:85, completedAt:daysAgo(21) },
    { farm:gF2, name:'Pesticide Safety & MRL Compliance',          type:'safety',         status:'completed',   score:92, completedAt:daysAgo(20) },
    { farm:gF3, name:'GACC Export Standards Awareness',            type:'gap',            status:'completed',   score:88, completedAt:daysAgo(22) },
    { farm:gF3, name:'Good Agricultural Practices — Ginger 2026', type:'gap',            status:'in_progress', score:null, completedAt:null },
    { farm:gF4, name:'GACC Export Standards Awareness',            type:'gap',            status:'completed',   score:79, completedAt:daysAgo(23) },
    { farm:gF4, name:'EUDR Deforestation Compliance Awareness',    type:'eudr_awareness', status:'not_started', score:null, completedAt:null },
  ];
  await tryIns('farmer_training', trainingDefs.map(d => ({
    org_id:eId, farm_id:(d.farm as any).id,
    module_name:d.name, module_type:d.type,
    status:d.status, score:d.score,
    completed_at:d.completedAt, assigned_by:adminUserId,
  })), `${trainingDefs.length} training records`);

  // ── Done ──────────────────────────────────────────────────────────────────
  section('✅  Seed complete!');
  console.log(`
  Login (password: Demo1234!)
  ────────────────────────────────────────────────────────────────
  Exporter Admin : demo.admin@origintrace-demo.com
  Exporter Agent : demo.agent@origintrace-demo.com
  Buyer Admin    : demo.buyer@nibseurope-demo.com

  COMPLIANCE PROFILES — 6 markets
    EU EUDR  |  US FSMA 204  |  UK Environment Act
    China GACC  |  China Green Trade  |  UAE Halal

  COCOA SUPPLY CHAIN (fully connected)
    8 farms → 12 batches → bags → 3 processing runs → 4 FGs → 4 shipments
    Farmers page: 8 ledger rows | 5 input records | 8 training records

  WHITERABBIT GINGER SUPPLY CHAIN (fully connected)
    5 ginger farms (Southern Kaduna) → 1 batch WRG-GNG-2026-001 (4,850 kg, 97 bags)
    → 1 processing run WRG-RUN-001 (dried split ginger, 24% recovery)
    → 1 finished good PED-WRG-001 → WRG-SHP-2026-001 → Tianjin China (GO 82/100)
    batch_contributions: 5 rows (cooperative multi-farm, 4 delivering + 1 registered/no delivery)
    Documents: GACC cert · Phyto · Fumigation · MRL ⚠ expiring · COO · ISO 22000 · HACCP
    Farmers: +5 ledger rows | 6 input records | 9 training records
  `);
}

async function main() {
  if (WIPE) await wipeDemoData();
  if (!WIPE_ONLY) await seed();
}
main().catch(err => { console.error('\n❌  Fatal:', err.message || err); process.exit(1); });
