#!/usr/bin/env tsx

/**
 * Idempotent local-only seed for the illustrative Dutch cocoa buyer pilot.
 *
 * Usage:
 *   npm run seed:dutch-demo -- --dry-run
 *   npm run seed:dutch-demo -- --apply
 *
 * The script never deletes data and refuses any Supabase or application URL
 * that is not loopback. Every write follows inspect -> mutate -> verify.
 */

import nextEnv from '@next/env';
import { createClient, type User } from '@supabase/supabase-js';
import { DUTCH_COCOA_BUYER_PROFILE_TEMPLATE } from '../lib/compliance/buyer-profile';

const { loadEnvConfig } = nextEnv;
loadEnvConfig(process.cwd());

const DRY_RUN = process.argv.includes('--dry-run');
const APPLY = process.argv.includes('--apply');
if (DRY_RUN === APPLY) {
  throw new Error('Choose exactly one mode: --dry-run or --apply');
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  ?? process.env.SUPABASE_URL
  ?? '';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';
const appUrl = process.env.DUTCH_DEMO_APP_URL ?? 'http://127.0.0.1:5000';

function assertLoopback(rawUrl: string, expectedPort: string, label: string) {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    throw new Error(`${label} is not a valid URL`);
  }

  const isLoopback = ['127.0.0.1', 'localhost', '::1', '[::1]'].includes(parsed.hostname);
  if (parsed.protocol !== 'http:' || !isLoopback || parsed.port !== expectedPort) {
    throw new Error(
      `${label} must be loopback HTTP on port ${expectedPort}; refusing ${parsed.origin}`
    );
  }
}

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error('Missing local Supabase URL or service-role key');
}
assertLoopback(supabaseUrl, '54321', 'Supabase URL');
assertLoopback(appUrl, '5000', 'Application URL');

const db = createClient<any>(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const MODE = APPLY ? 'apply' : 'dry-run';
const BUYER_ORG_SLUG = 'dutch-cocoa-buyer-pilot';
const BUYER_EMAIL = 'dutch.buyer@demo.test';
const EXPORTER_EMAIL = 'dutch.exporter@demo.test';
const DEMO_PASSWORD = 'Demo1234!';
const SHIPMENT_CODE = 'WR-SHP-NL-PILOT-001';
const CONTRACT_REFERENCE = 'NL-COCOA-PILOT-001';
const TENDER_TITLE = 'Dutch Cocoa Buyer Pilot — Rotterdam Tender — v1';
const EVIDENCE_TOKEN = 'dutch-cocoa-buyer-pilot-evidence-v1';
const DISCLAIMER = DUTCH_COCOA_BUYER_PROFILE_TEMPLATE.custom_rules.buyer_profile.disclaimer;

const startOfToday = new Date();
startOfToday.setUTCHours(0, 0, 0, 0);
const dateAfter = (days: number) => {
  const value = new Date(startOfToday);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString();
};
const dateOnlyAfter = (days: number) => dateAfter(days).slice(0, 10);

let plannedSequence = 1;
function plannedUuid() {
  const suffix = String(plannedSequence++).padStart(12, '0');
  return `00000000-0000-4000-8000-${suffix}`;
}

function section(title: string) {
  console.log(`\n[${MODE}] ${title}`);
}

function success(message: string) {
  console.log(`  OK  ${message}`);
}

function plan(message: string) {
  console.log(`  PLAN  ${message}`);
}

function fail(message: string): never {
  throw new Error(message);
}

function canonical(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonical);
  if (
    typeof value === 'string'
    && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(value)
    && Number.isFinite(Date.parse(value))
  ) {
    return new Date(value).toISOString();
  }
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, item]) => [key, canonical(item)])
    );
  }
  return value;
}

function equal(left: unknown, right: unknown) {
  return JSON.stringify(canonical(left)) === JSON.stringify(canonical(right));
}

function assertFields(
  row: Record<string, any>,
  expected: Record<string, unknown>,
  label: string
) {
  for (const [key, value] of Object.entries(expected)) {
    if (!equal(row[key], value)) {
      fail(
        `${label}: postcondition mismatch for ${key}; expected ${JSON.stringify(value)}, received ${JSON.stringify(row[key])}`
      );
    }
  }
}

async function inspectRows(table: string, lookup: Record<string, unknown>) {
  let query = db.from(table).select('*');
  for (const [column, value] of Object.entries(lookup)) {
    query = value === null ? query.is(column, null) : query.eq(column, value);
  }
  const { data, error } = await query.limit(2);
  if (error) fail(`${table}: inspection failed: ${error.message}`);
  if ((data ?? []).length > 1) {
    fail(`${table}: lookup ${JSON.stringify(lookup)} is not unique`);
  }
  return (data ?? []) as Record<string, any>[];
}

interface EnsureRowOptions {
  table: string;
  label: string;
  lookup: Record<string, unknown>;
  ownership: Record<string, unknown>;
  values: Record<string, unknown>;
}

async function ensureRow(options: EnsureRowOptions): Promise<Record<string, any>> {
  const { table, label, lookup, ownership, values } = options;
  const inspected = await inspectRows(table, lookup);
  const existing = inspected[0] ?? null;

  if (existing) assertFields(existing, ownership, `${label} ownership`);

  const desired = { ...lookup, ...ownership, ...values };
  const differs = existing
    ? Object.entries(desired).some(([key, value]) => !equal(existing[key], value))
    : true;

  if (!APPLY) {
    if (!existing) plan(`${label}: insert after empty inspection`);
    else if (differs) plan(`${label}: reconcile inspected demo-owned row ${existing.id}`);
    else success(`${label}: already matches`);
    return existing ?? { id: plannedUuid(), ...desired };
  }

  let returned: Record<string, any>;
  if (!existing) {
    const { data, error } = await db.from(table).insert(desired).select('*').single();
    if (error || !data) fail(`${label}: insert failed: ${error?.message ?? 'no returned row'}`);
    returned = data;
  } else if (differs) {
    let update = db.from(table).update(values).eq('id', existing.id);
    for (const [column, value] of Object.entries(ownership)) {
      update = value === null ? update.is(column, null) : update.eq(column, value);
    }
    const { data, error } = await update.select('*').maybeSingle();
    if (error || !data) fail(`${label}: update failed ownership check: ${error?.message ?? 'no row returned'}`);
    returned = data;
  } else {
    returned = existing;
  }

  assertFields(returned, desired, `${label} returned row`);
  const postcondition = await inspectRows(table, { id: returned.id });
  if (!postcondition[0]) fail(`${label}: row missing after mutation`);
  assertFields(postcondition[0], desired, `${label} database postcondition`);
  success(`${label}: ${existing ? (differs ? 'reconciled' : 'unchanged') : 'inserted'} (${returned.id})`);
  return postcondition[0];
}

async function listAllAuthUsers(): Promise<User[]> {
  const users: User[] = [];
  for (let page = 1; ; page += 1) {
    const { data, error } = await db.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) fail(`Auth user inspection failed: ${error.message}`);
    users.push(...data.users);
    if (data.users.length < 1000) break;
  }
  return users;
}

async function ensureAuthUser(email: string, fullName: string): Promise<User> {
  const users = await listAllAuthUsers();
  const matches = users.filter((user) => user.email === email);
  if (matches.length > 1) fail(`Auth user ${email}: duplicate email records`);
  const existing = matches[0] ?? null;

  if (!APPLY) {
    if (existing) plan(`auth user ${email}: inspected; reconcile local demo credentials (${existing.id})`);
    else plan(`auth user ${email}: create confirmed .test account`);
    return existing ?? ({ id: plannedUuid(), email } as User);
  }

  if (!existing) {
    const { data, error } = await db.auth.admin.createUser({
      email,
      password: DEMO_PASSWORD,
      email_confirm: true,
      user_metadata: { full_name: fullName, demo_placeholder: true },
    });
    if (error || !data.user) fail(`Auth user ${email}: create failed: ${error?.message}`);
    const { data: verified, error: verifyError } = await db.auth.admin.getUserById(data.user.id);
    if (verifyError || verified.user?.email !== email) fail(`Auth user ${email}: postcondition failed`);
    success(`auth user ${email}: created and verified (${data.user.id})`);
    return verified.user;
  }

  const { data, error } = await db.auth.admin.updateUserById(existing.id, {
    password: DEMO_PASSWORD,
    email_confirm: true,
    user_metadata: {
      ...existing.user_metadata,
      full_name: fullName,
      demo_placeholder: true,
    },
  });
  if (error || data.user.email !== email) fail(`Auth user ${email}: update verification failed: ${error?.message}`);
  const { data: verified, error: verifyError } = await db.auth.admin.getUserById(existing.id);
  if (verifyError || verified.user?.email !== email) fail(`Auth user ${email}: database postcondition failed`);
  success(`auth user ${email}: credentials reconciled and verified (${existing.id})`);
  return verified.user;
}

async function requireWhiteRabbit() {
  const organizations = await inspectRows('organizations', { slug: 'demo-whiterabbit' });
  const organization = organizations[0];
  if (!organization) fail('WhiteRabbit exporter is missing; run the standard local demo seed first');
  assertFields(organization, { name: 'WhiteRabbit Demo Co.' }, 'WhiteRabbit exporter');
  success(`WhiteRabbit exporter inspected (${organization.id})`);
  return organization;
}

async function requireTraceableBatches(exporterOrgId: string) {
  const { data: batches, error } = await db
    .from('collection_batches')
    .select('id, org_id, farm_id, batch_code, status, total_weight, bag_count, yield_validated, farm:farms(id, org_id, compliance_status, boundary)')
    .eq('org_id', exporterOrgId)
    .in('batch_code', ['WR-BCH-001', 'WR-BCH-002'])
    .order('batch_code');
  if (error) fail(`Traceable batch inspection failed: ${error.message}`);
  if (!batches || batches.length !== 2) fail('Expected traceable batches WR-BCH-001 and WR-BCH-002');

  for (const batch of batches) {
    const farm = Array.isArray(batch.farm) ? batch.farm[0] : batch.farm;
    if (
      batch.org_id !== exporterOrgId
      || !farm
      || farm.org_id !== exporterOrgId
      || farm.compliance_status !== 'approved'
      || farm.boundary?.type !== 'Polygon'
    ) {
      fail(`${batch.batch_code}: ownership, approval, or polygon precondition failed`);
    }
    const { count, error: bagsError } = await db
      .from('bags')
      .select('id', { count: 'exact', head: true })
      .eq('org_id', exporterOrgId)
      .eq('collection_batch_id', batch.id);
    if (bagsError || !count || count !== batch.bag_count) {
      fail(`${batch.batch_code}: bag-to-batch postcondition failed (expected ${batch.bag_count}, found ${count ?? 0})`);
    }
    success(`${batch.batch_code}: bag → batch → approved polygon farm verified (${count} bags)`);
  }

  return batches as Record<string, any>[];
}

async function recalculateReadiness(shipment: Record<string, any>) {
  if (!APPLY) {
    plan(`${shipment.shipment_code}: call real readiness endpoint after apply`);
    return;
  }

  const preRows = await inspectRows('shipments', { id: shipment.id });
  assertFields(preRows[0], { org_id: shipment.org_id }, 'Readiness precondition ownership');

  const authClient = createClient<any>(
    supabaseUrl,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? serviceRoleKey,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
  const { data: login, error: loginError } = await authClient.auth.signInWithPassword({
    email: EXPORTER_EMAIL,
    password: DEMO_PASSWORD,
  });
  if (loginError || !login.session?.access_token) {
    fail(`Exporter login for readiness endpoint failed: ${loginError?.message}`);
  }

  const response = await fetch(`${appUrl}/api/shipments/${shipment.id}/recalculate`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${login.session.access_token}` },
  });
  const payload = await response.json() as Record<string, any>;
  if (!response.ok) fail(`Readiness endpoint failed (${response.status}): ${payload.error ?? 'unknown error'}`);

  const readiness = payload.readiness;
  if (!readiness || typeof readiness.overall_score !== 'number' || readiness.decision !== 'go') {
    fail(`Readiness did not produce a real go decision: ${JSON.stringify(readiness)}`);
  }
  const regulatory = Array.isArray(readiness.dimensions)
    ? readiness.dimensions.find((dimension: any) => dimension.name === 'Regulatory Alignment')
    : null;
  const checks = Array.isArray(regulatory?.requirement_checks)
    ? regulatory.requirement_checks
    : [];
  if (checks.length === 0 || checks.some((check: any) => check.met !== true)) {
    fail('Readiness requirement checks are absent or incomplete');
  }

  const postRows = await inspectRows('shipments', { id: shipment.id });
  assertFields(postRows[0], {
    org_id: shipment.org_id,
    readiness_score: Math.round(readiness.overall_score),
    readiness_decision: readiness.decision,
  }, 'Readiness database postcondition');
  success(
    `${shipment.shipment_code}: readiness computed by API (${readiness.decision}, ${checks.length} profile checks met)`
  );
}

async function main() {
  console.log(`Dutch buyer demo seed (${MODE})`);
  console.log(`Supabase: ${new URL(supabaseUrl).origin}`);

  section('Exporter and traceability prerequisites');
  const exporterOrg = await requireWhiteRabbit();
  const batches = await requireTraceableBatches(exporterOrg.id);
  const exporterUser = await ensureAuthUser(EXPORTER_EMAIL, 'Dutch Pilot Exporter Demo User');
  await ensureRow({
    table: 'profiles',
    label: 'Dutch pilot exporter profile',
    lookup: { user_id: exporterUser.id },
    ownership: { org_id: exporterOrg.id },
    values: { role: 'admin', full_name: 'Dutch Pilot Exporter Demo User' },
  });

  section('Placeholder buyer organization and account');
  const buyerOrg = await ensureRow({
    table: 'buyer_organizations',
    label: 'Dutch Cocoa Buyer Pilot B.V.',
    lookup: { slug: BUYER_ORG_SLUG },
    ownership: {},
    values: {
      name: 'Dutch Cocoa Buyer Pilot B.V.',
      country: 'Netherlands',
      industry: 'Illustrative cocoa procurement demo',
      contact_email: BUYER_EMAIL,
      settings: {
        is_placeholder: true,
        buyer_approved: false,
        disclaimer: DISCLAIMER,
      },
    },
  });
  const buyerUser = await ensureAuthUser(BUYER_EMAIL, 'Dutch Buyer Demo User');
  await ensureRow({
    table: 'buyer_profiles',
    label: 'Dutch buyer profile',
    lookup: { user_id: buyerUser.id },
    ownership: { buyer_org_id: buyerOrg.id },
    values: { full_name: 'Dutch Buyer Demo User', role: 'buyer_admin' },
  });

  section('Exporter linkage and buyer compliance profile');
  await ensureRow({
    table: 'supply_chain_links',
    label: 'Active WhiteRabbit buyer linkage',
    lookup: { buyer_org_id: buyerOrg.id, exporter_org_id: exporterOrg.id },
    ownership: { buyer_org_id: buyerOrg.id, exporter_org_id: exporterOrg.id },
    values: {
      status: 'active',
      invited_by: buyerUser.id,
      invited_at: startOfToday.toISOString(),
      accepted_at: startOfToday.toISOString(),
    },
  });
  const complianceProfile = await ensureRow({
    table: 'compliance_profiles',
    label: DUTCH_COCOA_BUYER_PROFILE_TEMPLATE.name,
    lookup: {
      org_id: exporterOrg.id,
      name: DUTCH_COCOA_BUYER_PROFILE_TEMPLATE.name,
    },
    ownership: { org_id: exporterOrg.id },
    values: {
      destination_market: DUTCH_COCOA_BUYER_PROFILE_TEMPLATE.destination_market,
      regulation_framework: DUTCH_COCOA_BUYER_PROFILE_TEMPLATE.regulation_framework,
      required_documents: [...DUTCH_COCOA_BUYER_PROFILE_TEMPLATE.required_documents],
      required_certifications: [...DUTCH_COCOA_BUYER_PROFILE_TEMPLATE.required_certifications],
      geo_verification_level: DUTCH_COCOA_BUYER_PROFILE_TEMPLATE.geo_verification_level,
      min_traceability_depth: DUTCH_COCOA_BUYER_PROFILE_TEMPLATE.min_traceability_depth,
      custom_rules: DUTCH_COCOA_BUYER_PROFILE_TEMPLATE.custom_rules,
      is_default: false,
    },
  });

  section('Rotterdam contract and separate traceable shipment');
  const totalWeightKg = batches.reduce((sum, batch) => sum + Number(batch.total_weight ?? 0), 0);
  const contract = await ensureRow({
    table: 'contracts',
    label: CONTRACT_REFERENCE,
    lookup: { contract_reference: CONTRACT_REFERENCE },
    ownership: { buyer_org_id: buyerOrg.id, exporter_org_id: exporterOrg.id },
    values: {
      compliance_profile_id: complianceProfile.id,
      commodity: 'Cocoa beans (HS 1801)',
      quantity_mt: totalWeightKg / 1000,
      destination_port: 'Port of Rotterdam',
      delivery_deadline: dateOnlyAfter(60),
      required_certifications: ['Rainforest Alliance Certificate'],
      quality_requirements: {
        placeholder_profile: true,
        hs_code: '1801',
        disclaimer: DISCLAIMER,
      },
      status: 'active',
      currency: 'EUR',
      notes: DISCLAIMER,
      created_by: buyerUser.id,
    },
  });
  const shipment = await ensureRow({
    table: 'shipments',
    label: SHIPMENT_CODE,
    lookup: { org_id: exporterOrg.id, shipment_code: SHIPMENT_CODE },
    ownership: { org_id: exporterOrg.id },
    values: {
      compliance_profile_id: complianceProfile.id,
      destination_country: 'Netherlands',
      destination_port: 'Port of Rotterdam',
      port_of_discharge: 'Port of Rotterdam',
      commodity: 'Cocoa beans',
      buyer_company: 'Dutch Cocoa Buyer Pilot B.V. (illustrative)',
      buyer_contact: BUYER_EMAIL,
      target_regulations: ['EUDR'],
      estimated_ship_date: dateOnlyAfter(45),
      total_weight_kg: totalWeightKg,
      total_items: batches.length,
      status: 'ready',
      current_stage: 7,
      storage_controls: {
        warehouse_certified: true,
        temperature_logged: true,
        pest_control_active: true,
        humidity_monitored: true,
        fifo_enforced: true,
      },
      doc_status: {},
      notes: DISCLAIMER,
      created_by: exporterUser.id,
    },
  });

  for (const batch of batches) {
    await ensureRow({
      table: 'shipment_items',
      label: `${SHIPMENT_CODE} item ${batch.batch_code}`,
      lookup: { shipment_id: shipment.id, batch_id: batch.id },
      ownership: { org_id: exporterOrg.id, shipment_id: shipment.id },
      values: {
        item_type: 'batch',
        farm_id: batch.farm_id,
        weight_kg: Number(batch.total_weight ?? 0),
        farm_count: 1,
        traceability_complete: true,
        compliance_status: 'approved',
      },
    });
  }
  await ensureRow({
    table: 'contract_shipments',
    label: 'Rotterdam contract shipment linkage',
    lookup: { contract_id: contract.id, shipment_id: shipment.id },
    ownership: { contract_id: contract.id, shipment_id: shipment.id },
    values: {},
  });

  section('Supporting documents, lab result, and evidence package');
  const documentTypeByTitle: Record<string, string> = {
    'Certificate of Origin': 'certificate_of_origin',
    'Bill of Lading': 'bill_of_lading',
    'Quality Certificate': 'quality_cert',
    'Aflatoxin Test': 'lab_result',
  };
  const documentTitles = [
    ...DUTCH_COCOA_BUYER_PROFILE_TEMPLATE.required_documents,
    ...DUTCH_COCOA_BUYER_PROFILE_TEMPLATE.required_certifications,
    'Pesticide Declaration',
    'Aflatoxin Test',
  ];
  let labDocument: Record<string, any> | null = null;
  for (const title of documentTitles) {
    const document = await ensureRow({
      table: 'documents',
      label: `${SHIPMENT_CODE} document: ${title}`,
      lookup: {
        org_id: exporterOrg.id,
        linked_entity_type: 'shipment',
        linked_entity_id: shipment.id,
        title,
      },
      ownership: { org_id: exporterOrg.id },
      values: {
        document_type: documentTypeByTitle[title] ?? 'other',
        status: 'active',
        file_name: `${title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.pdf`,
        file_url: `/demo/evidence/${SHIPMENT_CODE}/${title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.pdf`,
        issued_date: dateOnlyAfter(0),
        expiry_date: dateOnlyAfter(365),
        notes: title === 'Rainforest Alliance Certificate'
          ? `Placeholder private buyer requirement. ${DISCLAIMER}`
          : DISCLAIMER,
        uploaded_by: exporterUser.id,
      },
    });
    if (title === 'Quality Certificate') labDocument = document;
  }

  await ensureRow({
    table: 'lab_results',
    label: `${SHIPMENT_CODE} passing lab result`,
    lookup: {
      org_id: exporterOrg.id,
      shipment_id: shipment.id,
      certificate_number: 'NL-PILOT-LAB-001',
    },
    ownership: { org_id: exporterOrg.id, shipment_id: shipment.id },
    values: {
      batch_id: batches[0].id,
      lab_provider: 'Illustrative Accredited Lab',
      test_method: 'Illustrative certificate review',
      test_date: dateOnlyAfter(0),
      test_type: 'pesticide_residue',
      commodity: 'Cocoa beans',
      result: 'pass',
      result_value: null,
      result_unit: null,
      result_notes: `Pass result for workflow demonstration only; no numeric threshold is asserted. ${DISCLAIMER}`,
      certificate_validity_days: 365,
      certificate_expiry_date: dateOnlyAfter(365),
      mrl_flags: [],
      target_markets: ['Netherlands'],
      document_id: labDocument?.id ?? null,
      uploaded_by: exporterUser.id,
    },
  });
  await ensureRow({
    table: 'evidence_packages',
    label: `${SHIPMENT_CODE} evidence package`,
    lookup: { token: EVIDENCE_TOKEN },
    ownership: { org_id: exporterOrg.id, shipment_id: shipment.id },
    values: {
      expires_at: dateAfter(30),
      views: 0,
      created_by: exporterUser.id,
    },
  });

  section('Illustrative tender and exporter bid');
  const tender = await ensureRow({
    table: 'tenders',
    label: TENDER_TITLE,
    lookup: { buyer_org_id: buyerOrg.id, title: TENDER_TITLE },
    ownership: { buyer_org_id: buyerOrg.id },
    values: {
      commodity: 'Cocoa beans (HS 1801)',
      quantity_mt: totalWeightKg / 1000,
      target_price_per_mt: null,
      currency: 'EUR',
      delivery_deadline: dateOnlyAfter(75),
      destination_country: 'Netherlands',
      destination_port: 'Port of Rotterdam',
      quality_requirements: {
        compliance_profile_id: complianceProfile.id,
        placeholder_profile: true,
        disclaimer: DISCLAIMER,
      },
      certifications_required: ['Rainforest Alliance Certificate'],
      regulation_framework: 'EUDR',
      status: 'open',
      visibility: 'invited',
      invited_orgs: [exporterOrg.id],
      created_by: buyerUser.id,
      closes_at: dateAfter(30),
    },
  });
  await ensureRow({
    table: 'tender_bids',
    label: `${TENDER_TITLE} WhiteRabbit bid`,
    lookup: { tender_id: tender.id, exporter_org_id: exporterOrg.id },
    ownership: { tender_id: tender.id, exporter_org_id: exporterOrg.id },
    values: {
      price_per_mt: 4200,
      quantity_available_mt: totalWeightKg / 1000,
      delivery_date: dateOnlyAfter(60),
      notes: `Illustrative exporter bid linked to the Dutch pilot workflow. ${DISCLAIMER}`,
      compliance_score: null,
      certifications: ['Rainforest Alliance Certificate (placeholder demo evidence)'],
      status: 'submitted',
      submitted_by: exporterUser.id,
    },
  });

  section('Real shipment readiness calculation');
  await recalculateReadiness(shipment);

  console.log(`\nDutch buyer demo ${MODE} complete.`);
  console.log(`Buyer login: ${BUYER_EMAIL}`);
  console.log(`Exporter login: ${EXPORTER_EMAIL}`);
  console.log('All named companies, requirements, and evidence are illustrative placeholders.');
}

main().catch((error) => {
  console.error(`\nDutch buyer demo seed stopped: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
});
