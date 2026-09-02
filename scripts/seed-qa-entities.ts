#!/usr/bin/env tsx

import { createClient } from "@supabase/supabase-js";

type Row = Record<string, any>;

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL ?? "";
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

if (!supabaseUrl || !serviceRoleKey) {
  console.error(
    "Missing Supabase env vars. Set NEXT_PUBLIC_SUPABASE_URL or SUPABASE_URL, plus SUPABASE_SERVICE_ROLE_KEY.",
  );
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false },
});

const DAY_MS = 24 * 60 * 60 * 1000;

const daysAgo = (days: number) =>
  new Date(Date.now() - days * DAY_MS).toISOString();
const daysAhead = (days: number) =>
  new Date(Date.now() + days * DAY_MS).toISOString();
const dateDaysAgo = (days: number) => daysAgo(days).slice(0, 10);
const dateDaysAhead = (days: number) => daysAhead(days).slice(0, 10);

function logStep(message: string) {
  console.log(`[ok] ${message}`);
}

function warn(message: string) {
  console.warn(`[warn] ${message}`);
}

function fail(message: string): never {
  throw new Error(message);
}

function isSchemaError(error: any) {
  const text = `${error?.code ?? ""} ${error?.message ?? ""}`.toLowerCase();
  return (
    text.includes("schema cache") ||
    text.includes("does not exist") ||
    text.includes("could not find") ||
    text.includes("column")
  );
}

function closedBoundary(lng: number, lat: number, delta = 0.01) {
  return {
    type: "Feature",
    properties: {
      source: "qa-seed",
      coordinate_system: "WGS84",
    },
    geometry: {
      type: "Polygon",
      coordinates: [
        [
          [lng, lat],
          [lng + delta, lat],
          [lng + delta, lat + delta],
          [lng, lat + delta],
          [lng, lat],
        ],
      ],
    },
  };
}

async function firstByMatch(
  table: string,
  match: Row,
  select = "*",
): Promise<Row | null> {
  let query: any = supabase.from(table).select(select);
  for (const [column, value] of Object.entries(match)) {
    query = query.eq(column, value);
  }

  const { data, error } = await query.limit(1);
  if (error) fail(`${table} lookup failed: ${error.message}`);
  return data?.[0] ?? null;
}

async function upsertByMatch(
  table: string,
  match: Row,
  values: Row,
  label: string,
): Promise<Row> {
  const existing = await firstByMatch(table, match);
  const payload = { ...match, ...values };

  if (existing?.id) {
    const { data, error } = await supabase
      .from(table)
      .update(payload)
      .eq("id", existing.id)
      .select()
      .single();
    if (error) fail(`${label} update failed: ${error.message}`);
    logStep(`${label} updated`);
    return data;
  }

  const { data, error } = await supabase
    .from(table)
    .insert(payload)
    .select()
    .single();
  if (error) fail(`${label} insert failed: ${error.message}`);
  logStep(`${label} inserted`);
  return data;
}

async function deleteWhere(
  table: string,
  match: Row,
  label: string,
  optional = false,
) {
  let query: any = supabase.from(table).delete();
  for (const [column, value] of Object.entries(match)) {
    query = query.eq(column, value);
  }

  const { error } = await query;
  if (error) {
    if (optional && isSchemaError(error)) {
      warn(`${label} skipped: ${error.message}`);
      return;
    }
    fail(`${label} cleanup failed: ${error.message}`);
  }
}

async function insertRows(
  table: string,
  rows: Row[],
  label: string,
  optional = false,
) {
  if (rows.length === 0) return [];
  const { data, error } = await supabase.from(table).insert(rows).select();
  if (error) {
    if (optional && isSchemaError(error)) {
      warn(`${label} skipped: ${error.message}`);
      return [];
    }
    fail(`${label} insert failed: ${error.message}`);
  }
  logStep(`${label} inserted`);
  return data ?? [];
}

async function upsertRows(
  table: string,
  rows: Row[],
  onConflict: string,
  label: string,
) {
  const { data, error } = await supabase
    .from(table)
    .upsert(rows, { onConflict })
    .select();
  if (error) fail(`${label} upsert failed: ${error.message}`);
  logStep(`${label} upserted`);
  return data ?? [];
}

async function insertDocument(row: Row, fallbackEntityType?: string) {
  const { data, error } = await supabase
    .from("documents")
    .insert(row)
    .select()
    .single();

  if (!error) {
    logStep(`${row.title} document inserted`);
    return data;
  }

  if (fallbackEntityType) {
    const fallback = { ...row, linked_entity_type: fallbackEntityType };
    const retry = await supabase
      .from("documents")
      .insert(fallback)
      .select()
      .single();
    if (!retry.error) {
      logStep(`${row.title} document inserted with ${fallbackEntityType} link`);
      return retry.data;
    }
    fail(`${row.title} document insert failed: ${retry.error.message}`);
  }

  fail(`${row.title} document insert failed: ${error.message}`);
}

async function insertShipmentItem(row: Row) {
  const { data, error } = await supabase
    .from("shipment_items")
    .insert(row)
    .select()
    .single();

  if (!error) return data;
  if (!isSchemaError(error) || row.org_id === undefined) {
    fail(`shipment item insert failed: ${error.message}`);
  }

  const { org_id: _orgId, ...withoutOrg } = row;
  const retry = await supabase
    .from("shipment_items")
    .insert(withoutOrg)
    .select()
    .single();
  if (retry.error) fail(`shipment item insert failed: ${retry.error.message}`);
  return retry.data;
}

async function main() {
  console.log("Seeding QA entity chain for demo-whiterabbit...");

  const org = await firstByMatch(
    "organizations",
    { slug: "demo-whiterabbit" },
    "id,slug,name,subscription_tier",
  );
  if (!org?.id) {
    fail("demo-whiterabbit organization not found. Run npm run seed:qa first.");
  }
  const orgId = org.id;

  const adminProfile =
    (await firstByMatch(
      "profiles",
      { org_id: orgId, role: "admin" },
      "id,user_id,full_name,role",
    )) ??
    (await firstByMatch(
      "profiles",
      { org_id: orgId, role: "superadmin" },
      "id,user_id,full_name,role",
    ));
  if (!adminProfile?.id) {
    fail("No admin profile found for demo-whiterabbit. Run npm run seed:qa first.");
  }

  const agentProfile =
    (await firstByMatch(
      "profiles",
      { org_id: orgId, role: "agent" },
      "id,user_id,full_name,role",
    )) ?? adminProfile;

  const logisticsProfile =
    (await firstByMatch(
      "profiles",
      { org_id: orgId, role: "logistics_coordinator" },
      "id,user_id,full_name,role",
    )) ?? adminProfile;

  const farms = await Promise.all([
    upsertByMatch(
      "farms",
      { org_id: orgId, farmer_id: "QA-FARMER-001" },
      {
        farmer_name: "QA Ada Cocoa",
        phone: "+2348012349001",
        community: "Idanre QA Cluster",
        commodity: "cocoa",
        area_hectares: 3.85,
        compliance_status: "approved",
        compliance_notes: "QA seed farm for entity-dependent browser operations.",
        consent_timestamp: daysAgo(75),
        last_collection_date: daysAgo(8),
        boundary: closedBoundary(5.108, 7.087),
        boundary_analysis: {
          status: "verified",
          confidence_score: 94,
          confidence_level: "high",
          overlap_detected: false,
          self_intersection_detected: false,
          analyzed_at: daysAgo(2),
          source: "qa-seed",
        },
        deforestation_check: {
          status: "pass",
          risk_level: "low",
          deforestation_free: true,
          forest_loss_hectares: 0,
          forest_loss_percentage: 0,
          analysis_date: dateDaysAgo(2),
          data_source: "QA mock geospatial baseline",
        },
        created_by: adminProfile.user_id,
      },
      "QA-FARMER-001 farm",
    ),
    upsertByMatch(
      "farms",
      { org_id: orgId, farmer_id: "QA-FARMER-002" },
      {
        farmer_name: "QA Musa Cocoa",
        phone: "+2348012349002",
        community: "Ife QA Cluster",
        commodity: "cocoa",
        area_hectares: 2.7,
        compliance_status: "approved",
        compliance_notes: "Second QA seed farm for multi-farm batch contribution checks.",
        consent_timestamp: daysAgo(70),
        last_collection_date: daysAgo(8),
        boundary: closedBoundary(4.557, 7.482, 0.008),
        boundary_analysis: {
          status: "verified",
          confidence_score: 91,
          confidence_level: "high",
          overlap_detected: false,
          self_intersection_detected: false,
          analyzed_at: daysAgo(2),
          source: "qa-seed",
        },
        deforestation_check: {
          status: "pass",
          risk_level: "low",
          deforestation_free: true,
          forest_loss_hectares: 0,
          forest_loss_percentage: 0,
          analysis_date: dateDaysAgo(2),
          data_source: "QA mock geospatial baseline",
        },
        created_by: adminProfile.user_id,
      },
      "QA-FARMER-002 farm",
    ),
  ]);

  const [farmOne, farmTwo] = farms;

  await Promise.all([
    upsertByMatch(
      "farmer_performance_ledger",
      { org_id: orgId, farm_id: farmOne.id },
      {
        farmer_name: farmOne.farmer_name,
        community: farmOne.community,
        state: "Ondo",
        area_hectares: farmOne.area_hectares,
        commodity: "cocoa",
        total_delivery_kg: 700,
        total_bag_count: 14,
        total_batch_count: 1,
        total_batches: 1,
        avg_quality_score: 94,
        avg_grade_score: 92,
        grade_a_percentage: 100,
        grade_b_percentage: 0,
        grade_c_percentage: 0,
        total_payments_ngn: 1_750_000,
        pending_payments_ngn: 0,
        compliance_status: "verified",
        consent_collected: true,
        has_consent: true,
        gps_recorded: true,
        deforestation_free: true,
        last_delivery_date: daysAgo(8),
      },
      "QA-FARMER-001 ledger",
    ),
    upsertByMatch(
      "farmer_performance_ledger",
      { org_id: orgId, farm_id: farmTwo.id },
      {
        farmer_name: farmTwo.farmer_name,
        community: farmTwo.community,
        state: "Osun",
        area_hectares: farmTwo.area_hectares,
        commodity: "cocoa",
        total_delivery_kg: 500,
        total_bag_count: 10,
        total_batch_count: 1,
        total_batches: 1,
        avg_quality_score: 91,
        avg_grade_score: 90,
        grade_a_percentage: 80,
        grade_b_percentage: 20,
        grade_c_percentage: 0,
        total_payments_ngn: 1_200_000,
        pending_payments_ngn: 0,
        compliance_status: "verified",
        consent_collected: true,
        has_consent: true,
        gps_recorded: true,
        deforestation_free: true,
        last_delivery_date: daysAgo(8),
      },
      "QA-FARMER-002 ledger",
    ),
  ]);

  await upsertByMatch(
    "farmer_bank_accounts",
    {
      org_id: orgId,
      farm_id: farmOne.id,
      account_number: "0123456789",
    },
    {
      farmer_name: farmOne.farmer_name,
      account_name: "QA Ada Cocoa",
      bank_code: "044",
      bank_name: "Access Bank",
      is_verified: true,
      verified_at: daysAgo(30),
    },
    "QA farmer bank account",
  );

  await upsertByMatch(
    "farmer_price_agreements",
    {
      org_id: orgId,
      farm_id: farmOne.id,
      commodity: "cocoa",
      effective_from: "2026-01-01",
    },
    {
      price_per_kg: 2500,
      currency: "NGN",
      effective_to: "2026-12-31",
      notes: "QA-FARMER-001 browser QA price agreement.",
      created_by: adminProfile.user_id,
    },
    "QA price agreement",
  );

  const batch = await upsertByMatch(
    "collection_batches",
    { org_id: orgId, batch_code: "QA-BCH-001" },
    {
      local_id: "qa-bch-001",
      farm_id: farmOne.id,
      agent_id: agentProfile.id,
      commodity: "cocoa",
      grade: "Grade 1",
      total_weight: 1200,
      bag_count: 24,
      status: "dispatched",
      community: "Idanre QA Cluster",
      state: "Ondo",
      lga: "Idanre",
      yield_validated: true,
      dispatched_at: daysAgo(5),
      dispatched_by: logisticsProfile.user_id ?? adminProfile.user_id,
      dispatch_destination: "QA Export Warehouse, Lagos",
      vehicle_reference: "QA-TRUCK-001",
      driver_name: "QA Test Driver",
      driver_phone: "+2348012349999",
      expected_arrival_at: daysAgo(4),
      dispatch_recorded_at: daysAgo(5),
      notes: "QA seeded batch for collection, inventory, dispatch, processing, and shipment routes.",
    },
    "QA-BCH-001 collection batch",
  );

  const bags = Array.from({ length: 24 }, (_, index) => {
    const number = String(index + 1).padStart(3, "0");
    return {
      org_id: orgId,
      serial: `QA-BCH-001-${number}`,
      collection_batch_id: batch.id,
      status: "collected",
      weight_kg: 50,
      grade: index < 20 ? "A" : "B",
      is_compliant: true,
    };
  });
  await upsertRows("bags", bags, "org_id,serial", "QA bags");

  await deleteWhere("batch_contributions", { batch_id: batch.id }, "QA contributions");
  await insertRows(
    "batch_contributions",
    [
      {
        batch_id: batch.id,
        farm_id: farmOne.id,
        farmer_name: farmOne.farmer_name,
        weight_kg: 700,
        bag_count: 14,
        compliance_status: "verified",
        notes: "QA-FARMER-001 contribution.",
      },
      {
        batch_id: batch.id,
        farm_id: farmTwo.id,
        farmer_name: farmTwo.farmer_name,
        weight_kg: 500,
        bag_count: 10,
        compliance_status: "verified",
        notes: "QA-FARMER-002 contribution.",
      },
    ],
    "QA batch contributions",
  );

  const payment = await upsertByMatch(
    "payments",
    { org_id: orgId, reference_number: "QA-PAY-001" },
    {
      payee_type: "farmer",
      payee_id: farmOne.id,
      payee_name: farmOne.farmer_name,
      amount: 1_750_000,
      currency: "NGN",
      payment_method: "bank_transfer",
      status: "completed",
      linked_entity_type: "collection_batch",
      linked_entity_id: batch.id,
      payment_date: dateDaysAgo(6),
      recorded_by: adminProfile.user_id,
      notes: "QA payment for farmer profile ledger checks.",
    },
    "QA payment",
  );

  await deleteWhere(
    "disbursement_calculations",
    { org_id: orgId, batch_id: batch.id },
    "QA disbursement calculations",
  );
  await insertRows(
    "disbursement_calculations",
    [
      {
        org_id: orgId,
        batch_id: batch.id,
        farm_id: farmOne.id,
        farmer_name: farmOne.farmer_name,
        community: farmOne.community,
        weight_kg: 700,
        price_per_kg: 2500,
        gross_amount: 1_750_000,
        deductions: 0,
        net_amount: 1_750_000,
        currency: "NGN",
        status: "disbursed",
        payment_id: payment.id,
        approved_by: adminProfile.user_id,
        approved_at: daysAgo(6),
        notes: "QA disbursement calculation for QA-FARMER-001.",
      },
      {
        org_id: orgId,
        batch_id: batch.id,
        farm_id: farmTwo.id,
        farmer_name: farmTwo.farmer_name,
        community: farmTwo.community,
        weight_kg: 500,
        price_per_kg: 2400,
        gross_amount: 1_200_000,
        deductions: 0,
        net_amount: 1_200_000,
        currency: "NGN",
        status: "approved",
        approved_by: adminProfile.user_id,
        approved_at: daysAgo(6),
        notes: "QA disbursement calculation for QA-FARMER-002.",
      },
    ],
    "QA disbursement calculations",
  );

  const processingRun = await upsertByMatch(
    "processing_runs",
    { org_id: orgId, run_code: "QA-RUN-001" },
    {
      farm_id: farmOne.id,
      facility_name: "QA Lagos Processing Facility",
      commodity: "cocoa",
      input_weight_kg: 1200,
      output_weight_kg: 1020,
      recovery_rate: 85,
      mass_balance_valid: true,
      processed_at: daysAgo(3),
      notes: "QA processing run linked to QA-BCH-001.",
      created_by: adminProfile.user_id,
    },
    "QA-RUN-001 processing run",
  );

  await upsertByMatch(
    "processing_run_batches",
    {
      processing_run_id: processingRun.id,
      collection_batch_id: batch.id,
    },
    {
      weight_contribution_kg: 1200,
    },
    "QA processing batch link",
  );

  const finishedGood = await upsertByMatch(
    "finished_goods",
    { org_id: orgId, pedigree_code: "QA-FG-001" },
    {
      farm_id: farmOne.id,
      processing_run_id: processingRun.id,
      product_name: "QA Export Cocoa Beans",
      product_type: "dried_beans",
      weight_kg: 1020,
      batch_number: "QA-FG-BATCH-001",
      lot_number: "QA-LOT-001",
      production_date: dateDaysAgo(2),
      expiry_date: dateDaysAhead(180),
      destination_country: "Germany",
      buyer_company: "QA Buyer GmbH",
      pedigree_verified: true,
      dds_submitted: true,
      dds_reference: "QA-DDS-001",
      verification_notes: "QA finished good for shipment item and pedigree flows.",
      created_by: adminProfile.user_id,
    },
    "QA-FG-001 finished good",
  );

  const serviceProviders = await Promise.all([
    upsertByMatch(
      "service_providers",
      { org_id: orgId, registration_number: "QA-FF-001" },
      {
        provider_type: "freight_forwarder",
        name: "QA Freight Forwarders Ltd",
        contact_name: "Femi Freight",
        contact_email: "freight.qa@example.test",
        contact_phone: "+2348012349101",
        address: "12 Export Road, Lagos",
        country: "Nigeria",
        is_preferred: true,
        is_active: true,
        created_by: adminProfile.user_id,
        notes: "QA preferred freight forwarder.",
      },
      "QA freight forwarder",
    ),
    upsertByMatch(
      "service_providers",
      { org_id: orgId, registration_number: "QA-CA-001" },
      {
        provider_type: "clearing_agent",
        name: "QA Clearing Agency",
        contact_name: "Chika Clear",
        contact_email: "clearing.qa@example.test",
        contact_phone: "+2348012349102",
        address: "Apapa Port Complex, Lagos",
        country: "Nigeria",
        is_preferred: true,
        is_active: true,
        created_by: adminProfile.user_id,
        notes: "QA preferred clearing agent.",
      },
      "QA clearing agent",
    ),
    upsertByMatch(
      "service_providers",
      { org_id: orgId, registration_number: "QA-INS-001" },
      {
        provider_type: "inspection_body",
        name: "QA Inspection Bureau",
        contact_name: "Ife Inspector",
        contact_email: "inspection.qa@example.test",
        contact_phone: "+2348012349103",
        address: "22 Quality Avenue, Lagos",
        country: "Nigeria",
        is_preferred: true,
        is_active: true,
        created_by: adminProfile.user_id,
        notes: "QA preferred inspection body.",
      },
      "QA inspection body",
    ),
    upsertByMatch(
      "service_providers",
      { org_id: orgId, registration_number: "QA-LAB-001" },
      {
        provider_type: "lab",
        name: "QA Lab Services",
        contact_name: "Lara Lab",
        contact_email: "lab.qa@example.test",
        contact_phone: "+2348012349104",
        address: "8 Science Close, Lagos",
        country: "Nigeria",
        is_preferred: true,
        is_active: true,
        created_by: adminProfile.user_id,
        notes: "QA preferred laboratory.",
      },
      "QA laboratory",
    ),
    upsertByMatch(
      "service_providers",
      { org_id: orgId, registration_number: "QA-SL-001" },
      {
        provider_type: "shipping_line",
        name: "QA Atlantic Shipping Line",
        contact_name: "Sade Shipping",
        contact_email: "shipping.qa@example.test",
        contact_phone: "+2348012349105",
        address: "Marina Terminal, Lagos",
        country: "Nigeria",
        is_preferred: true,
        is_active: true,
        created_by: adminProfile.user_id,
        notes: "QA preferred shipping line.",
      },
      "QA shipping line",
    ),
  ]);

  const [freightForwarder, clearingAgent, inspectionBody, lab, shippingLine] =
    serviceProviders;

  const shipment = await upsertByMatch(
    "shipments",
    { org_id: orgId, shipment_code: "QA-SHP-001" },
    {
      status: "draft",
      commodity: "cocoa",
      buyer_company: "QA Buyer GmbH",
      buyer_contact: "buyer.qa@example.test",
      destination_country: "Germany",
      destination_port: "Hamburg",
      target_regulations: ["EUDR", "FSMA 204"],
      estimated_ship_date: dateDaysAhead(14),
      notes: "QA shipment with seeded providers, lots, documents, lab data, and readiness fields.",
      total_items: 1,
      total_weight_kg: 1020,
      readiness_score: 92,
      readiness_decision: "go",
      risk_flags: [],
      score_breakdown: [
        { dimension: "traceability", score: 96, status: "pass" },
        { dimension: "documents", score: 92, status: "pass" },
        { dimension: "geospatial", score: 94, status: "pass" },
        { dimension: "quality", score: 90, status: "pass" },
      ],
      doc_status: {
        phytosanitary: true,
        phytosanitary_certificate: true,
        certificate_of_origin: true,
        bill_of_lading: true,
        lab_result: true,
        lab_test_certificate: true,
        aflatoxin_test: true,
        quality_certificate: true,
        due_diligence_statement: true,
        deforestation_compliance: true,
        kde_records: true,
        cte_log: true,
        food_safety_plan: true,
      },
      storage_controls: {
        temperature_logged: true,
        humidity_logged: true,
        sealed_container: true,
        pest_control_verified: true,
      },
      current_stage: 5,
      freight_forwarder_name: freightForwarder.name,
      freight_forwarder_contact: `${freightForwarder.contact_name} | ${freightForwarder.contact_email} | ${freightForwarder.contact_phone}`,
      clearing_agent_name: clearingAgent.name,
      clearing_agent_contact: `${clearingAgent.contact_name} | ${clearingAgent.contact_email} | ${clearingAgent.contact_phone}`,
      inspection_body: inspectionBody.name,
      inspection_date: dateDaysAhead(5),
      inspection_certificate_number: "QA-INS-CERT-001",
      inspection_result: "pass",
      shipping_line: shippingLine.name,
      vessel_name: "QA Cocoa Star",
      imo_number: "IMO1234567",
      voyage_number: "QA-VYG-001",
      booking_reference: "QA-BOOK-001",
      port_of_loading: "Lagos",
      port_of_discharge: "Hamburg",
      etd: dateDaysAhead(14),
      eta: dateDaysAhead(35),
      container_number: "QA-CONT-001",
      container_seal_number: "QA-SEAL-001",
      container_type: "20FT",
      purchase_order_number: "QA-PO-001",
      export_invoice_number: "QA-INV-001",
      letter_of_credit_number: "QA-LC-001",
      incoterm: "FOB",
      freight_cost_usd: 4200,
      freight_insurance_usd: 680,
      port_handling_charges_ngn: 320_000,
      inspection_fees_ngn: 180_000,
      phyto_lab_costs_ngn: 120_000,
      prenotif_eu_traces: "confirmed",
      created_by: adminProfile.user_id,
    },
    "QA-SHP-001 shipment",
  );

  await deleteWhere("shipment_items", { shipment_id: shipment.id }, "QA shipment items");
  const shipmentItem = await insertShipmentItem({
    org_id: orgId,
    shipment_id: shipment.id,
    item_type: "finished_good",
    batch_id: batch.id,
    finished_good_id: finishedGood.id,
    farm_id: farmOne.id,
    weight_kg: 1020,
    farm_count: 2,
    traceability_complete: true,
    compliance_status: "approved",
  });
  logStep("QA shipment item inserted");

  const existingLot = await firstByMatch(
    "shipment_lots",
    { shipment_id: shipment.id, lot_code: "QA-LOT-001" },
    "id",
  );
  if (existingLot?.id) {
    await deleteWhere(
      "shipment_lot_items",
      { lot_id: existingLot.id },
      "QA shipment lot items",
      true,
    );
  }
  await deleteWhere(
    "shipment_lots",
    { shipment_id: shipment.id, lot_code: "QA-LOT-001" },
    "QA shipment lots",
    true,
  );
  const lot = (
    await insertRows(
      "shipment_lots",
      [
        {
          org_id: orgId,
          shipment_id: shipment.id,
          lot_number: "QA-LOT-001",
          lot_code: "QA-LOT-001",
          commodity: "cocoa",
          weight_kg: 1020,
          total_weight_kg: 1020,
          total_bags: 24,
          farm_count: 2,
          mass_balance_valid: true,
          notes: "QA shipment lot linked to QA-BCH-001 and QA-FG-001.",
        },
      ],
      "QA shipment lot",
      true,
    )
  )[0];
  if (lot?.id && shipmentItem?.id) {
    await insertRows(
      "shipment_lot_items",
      [
        {
          lot_id: lot.id,
          shipment_item_id: shipmentItem.id,
          batch_id: batch.id,
          weight_kg: 1020,
          bag_count: 24,
        },
      ],
      "QA shipment lot item",
      true,
    );
  }

  for (const certificateNumber of ["QA-LAB-BCH-001", "QA-LAB-SHP-001"]) {
    await deleteWhere(
      "lab_results",
      { org_id: orgId, certificate_number: certificateNumber },
      `${certificateNumber} lab result`,
      true,
    );
  }
  await insertRows(
    "lab_results",
    [
      {
        org_id: orgId,
        batch_id: batch.id,
        lab_provider: lab.name,
        certificate_number: "QA-LAB-BCH-001",
        test_date: dateDaysAgo(4),
        test_type: "aflatoxin",
        commodity: "cocoa",
        result: "pass",
        result_value: 2.1,
        result_unit: "ppb",
        result_notes: "QA batch lab result.",
        certificate_validity_days: 90,
        certificate_expiry_date: dateDaysAhead(86),
        file_url: "https://demo.origintrace.trade/qa/batch-lab-result.pdf",
        file_name: "qa-batch-lab-result.pdf",
        uploaded_by: adminProfile.user_id,
      },
      {
        org_id: orgId,
        shipment_id: shipment.id,
        finished_good_id: finishedGood.id,
        lab_provider: lab.name,
        certificate_number: "QA-LAB-SHP-001",
        test_date: dateDaysAgo(2),
        test_type: "moisture",
        commodity: "cocoa",
        result: "pass",
        result_value: 6.8,
        result_unit: "%",
        result_notes: "QA shipment lab result.",
        certificate_validity_days: 90,
        certificate_expiry_date: dateDaysAhead(88),
        file_url: "https://demo.origintrace.trade/qa/shipment-lab-result.pdf",
        file_name: "qa-shipment-lab-result.pdf",
        uploaded_by: adminProfile.user_id,
      },
    ],
    "QA lab results",
    true,
  );

  for (const title of [
    "QA Batch Quality Certificate",
    "QA Phytosanitary Certificate",
    "QA Certificate of Origin",
    "QA Bill of Lading",
    "QA Shipment Lab Certificate",
  ]) {
    await deleteWhere("documents", { org_id: orgId, title }, `${title} document`, true);
  }

  await insertDocument(
    {
      org_id: orgId,
      title: "QA Batch Quality Certificate",
      document_type: "quality_cert",
      file_url: "https://demo.origintrace.trade/qa/batch-quality-certificate.pdf",
      file_name: "qa-batch-quality-certificate.pdf",
      file_size: 184_000,
      status: "active",
      linked_entity_type: "collection_batch",
      linked_entity_id: batch.id,
      uploaded_by: adminProfile.user_id,
      notes: "QA-BCH-001 batch quality certificate.",
    },
    "batch",
  );

  await Promise.all([
    insertDocument({
      org_id: orgId,
      title: "QA Phytosanitary Certificate",
      document_type: "phytosanitary",
      file_url: "https://demo.origintrace.trade/qa/phytosanitary.pdf",
      file_name: "qa-phytosanitary.pdf",
      file_size: 201_000,
      status: "active",
      linked_entity_type: "shipment",
      linked_entity_id: shipment.id,
      uploaded_by: adminProfile.user_id,
      notes: "QA-SHP-001 phytosanitary certificate.",
    }),
    insertDocument({
      org_id: orgId,
      title: "QA Certificate of Origin",
      document_type: "certificate_of_origin",
      file_url: "https://demo.origintrace.trade/qa/certificate-of-origin.pdf",
      file_name: "qa-certificate-of-origin.pdf",
      file_size: 197_000,
      status: "active",
      linked_entity_type: "shipment",
      linked_entity_id: shipment.id,
      uploaded_by: adminProfile.user_id,
      notes: "QA-SHP-001 certificate of origin.",
    }),
    insertDocument({
      org_id: orgId,
      title: "QA Bill of Lading",
      document_type: "bill_of_lading",
      file_url: "https://demo.origintrace.trade/qa/bill-of-lading.pdf",
      file_name: "qa-bill-of-lading.pdf",
      file_size: 213_000,
      status: "active",
      linked_entity_type: "shipment",
      linked_entity_id: shipment.id,
      uploaded_by: adminProfile.user_id,
      notes: "QA-SHP-001 bill of lading.",
    }),
    insertDocument({
      org_id: orgId,
      title: "QA Shipment Lab Certificate",
      document_type: "lab_result",
      file_url: "https://demo.origintrace.trade/qa/shipment-lab-certificate.pdf",
      file_name: "qa-shipment-lab-certificate.pdf",
      file_size: 166_000,
      status: "active",
      linked_entity_type: "shipment",
      linked_entity_id: shipment.id,
      uploaded_by: adminProfile.user_id,
      notes: "QA-SHP-001 shipment lab certificate.",
    }),
  ]);

  await deleteWhere(
    "cold_chain_logs",
    { org_id: orgId, shipment_id: shipment.id },
    "QA cold-chain logs",
    true,
  );
  await insertRows(
    "cold_chain_logs",
    [
      {
        org_id: orgId,
        shipment_id: shipment.id,
        temperature_celsius: 18.4,
        humidity_percent: 61.5,
        location: "QA Export Warehouse, Lagos",
        is_alert: false,
        recorded_at: daysAgo(2),
      },
      {
        org_id: orgId,
        shipment_id: shipment.id,
        temperature_celsius: 19.1,
        humidity_percent: 59.8,
        location: "QA Container Yard, Apapa",
        is_alert: false,
        recorded_at: daysAgo(1),
      },
    ],
    "QA cold-chain logs",
    true,
  );

  await deleteWhere(
    "shipment_outcomes",
    { org_id: orgId, shipment_id: shipment.id },
    "QA shipment outcome",
    true,
  );
  await insertRows(
    "shipment_outcomes",
    [
      {
        org_id: orgId,
        shipment_id: shipment.id,
        outcome: "accepted",
        reason: "QA mock historical acceptance outcome.",
        destination_country: "Germany",
        recorded_at: daysAgo(1),
      },
    ],
    "QA shipment outcome",
    true,
  );

  console.log("");
  console.log("QA route anchors:");
  console.log(`/app/farmers/${farmOne.id}`);
  console.log(`/app/farms/${farmOne.id}`);
  console.log(`/app/collect/${batch.id}`);
  console.log(`/app/inventory/${batch.id}`);
  console.log(`/app/dispatch/${batch.id}`);
  console.log(`/app/processing/${processingRun.id}`);
  console.log(`/app/shipments/${shipment.id}`);
  console.log("/app/service-providers");
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
