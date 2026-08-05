import { createClient as createServerClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedProfile } from '@/lib/api-auth';

function getAdminClient() {
  return createAdminClient();
}

async function getBuyerProfile(supabaseAdmin: any, userId: string) {
  const { data } = await supabaseAdmin
    .from('buyer_profiles')
    .select('id, buyer_org_id, full_name, role')
    .eq('user_id', userId)
    .single();
  return data;
}

export async function GET(request: NextRequest) {
  try {
    const supabaseAdmin = await getAdminClient();
    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Supabase is not properly configured' }, { status: 500 });
    }

    const supabase = await createServerClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const buyerProfile = await getBuyerProfile(supabaseAdmin, user.id);
    if (!buyerProfile) {
      return NextResponse.json({ error: 'No buyer profile found' }, { status: 404 });
    }

    const { searchParams } = new URL(request.url);
    const section = searchParams.get('section');

    if (section === 'shipments') {
      return handleShipmentsSection(supabaseAdmin, buyerProfile.buyer_org_id);
    }

    if (section === 'traceability') {
      return handleTraceabilitySection(supabaseAdmin, buyerProfile.buyer_org_id);
    }

    if (section === 'documents') {
      return handleDocumentsSection(supabaseAdmin, buyerProfile.buyer_org_id);
    }

    const [orgRes, linksRes, contractsRes, shipmentsRes] = await Promise.all([
      supabaseAdmin
        .from('buyer_organizations')
        .select('*')
        .eq('id', buyerProfile.buyer_org_id)
        .single(),
      supabaseAdmin
        .from('supply_chain_links')
        .select('id, status, exporter_org_id, invited_at, accepted_at')
        .eq('buyer_org_id', buyerProfile.buyer_org_id),
      supabaseAdmin
        .from('contracts')
        .select('id, status, commodity, quantity_mt, delivery_deadline, contract_reference, created_at')
        .eq('buyer_org_id', buyerProfile.buyer_org_id)
        .order('created_at', { ascending: false }),
      supabaseAdmin
        .from('contract_shipments')
        .select('id, contract_id, shipment_id')
        .in('contract_id', (await supabaseAdmin
          .from('contracts')
          .select('id')
          .eq('buyer_org_id', buyerProfile.buyer_org_id)
        ).data?.map(c => c.id) || []),
    ]);

    const links = linksRes.data || [];
    const contracts = contractsRes.data || [];

    const summary = {
      activeSuppliers: links.filter(l => l.status === 'active').length,
      pendingInvitations: links.filter(l => l.status === 'pending').length,
      activeContracts: contracts.filter(c => c.status === 'active').length,
      draftContracts: contracts.filter(c => c.status === 'draft').length,
      fulfilledContracts: contracts.filter(c => c.status === 'fulfilled').length,
      pendingShipments: shipmentsRes.data?.length || 0,
      totalLinks: links.length,
      totalContracts: contracts.length,
    };

    const recentContracts = contracts.slice(0, 10);

    return NextResponse.json({
      buyerProfile,
      organization: orgRes.data,
      summary,
      recentContracts,
    });
  } catch (error) {
    console.error('Buyer dashboard API error:', error);
    return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 });
  }
}

async function handleShipmentsSection(supabaseAdmin: any, buyerOrgId: string) {
  const { data: contracts } = await supabaseAdmin
    .from('contracts')
    .select('id, contract_reference, commodity, status, exporter_org_id')
    .eq('buyer_org_id', buyerOrgId);

  if (!contracts || contracts.length === 0) {
    return NextResponse.json({ shipments: [] });
  }

  const contractIds = contracts.map((c: any) => c.id);
  const { data: contractShipments } = await supabaseAdmin
    .from('contract_shipments')
    .select('contract_id, shipment_id')
    .in('contract_id', contractIds);

  if (!contractShipments || contractShipments.length === 0) {
    return NextResponse.json({ shipments: [] });
  }

  const shipmentIds = contractShipments
    .map((cs: any) => cs.shipment_id)
    .filter((id: any): id is string => !!id);

  if (shipmentIds.length === 0) {
    return NextResponse.json({ shipments: [] });
  }

  const { data: shipments } = await supabaseAdmin
    .from('shipments')
    .select('id, shipment_code, status, destination_country, destination_port, commodity, total_weight_kg, total_items, readiness_score, readiness_decision, estimated_ship_date, created_at, buyer_company')
    .in('id', shipmentIds)
    .order('created_at', { ascending: false });

  const contractMap = new Map(contracts.map((c: any) => [c.id, c]));
  const shipmentContractMap = new Map<string, any[]>();
  for (const cs of contractShipments) {
    if (!cs.shipment_id) continue;
    const existing = shipmentContractMap.get(cs.shipment_id) || [];
    const contract = contractMap.get(cs.contract_id);
    if (contract) existing.push(contract);
    shipmentContractMap.set(cs.shipment_id, existing);
  }

  const enrichedShipments = (shipments || []).map((s: any) => ({
    ...s,
    linked_contracts: shipmentContractMap.get(s.id) || [],
  }));

  return NextResponse.json({ shipments: enrichedShipments });
}

async function handleTraceabilitySection(supabaseAdmin: any, buyerOrgId: string) {
  const { data: contracts } = await supabaseAdmin
    .from('contracts')
    .select('id, contract_reference, commodity, status, exporter_org_id')
    .eq('buyer_org_id', buyerOrgId)
    .in('status', ['active', 'fulfilled']);

  if (!contracts || contracts.length === 0) {
    return NextResponse.json({ traceability: [] });
  }

  const contractIds = contracts.map((c: any) => c.id);
  const { data: contractShipments } = await supabaseAdmin
    .from('contract_shipments')
    .select('contract_id, shipment_id')
    .in('contract_id', contractIds);

  const shipmentIds = (contractShipments || [])
    .map((cs: any) => cs.shipment_id)
    .filter((id: any): id is string => !!id);

  let shipmentItems: Array<Record<string, unknown>> = [];
  if (shipmentIds.length > 0) {
    const { data } = await supabaseAdmin
      .from('shipment_items')
      .select('shipment_id, batch_id, finished_good_id, item_type, weight_kg, compliance_status, traceability_complete')
      .in('shipment_id', shipmentIds);
    shipmentItems = data || [];
  }

  const batchIds = shipmentItems
    .filter(si => si.batch_id)
    .map(si => si.batch_id as string);

  let batches: Array<Record<string, unknown>> = [];
  if (batchIds.length > 0) {
    const { data } = await supabaseAdmin
      .from('collection_batches')
      .select('id, farm_id, status, total_weight, bag_count, collected_at')
      .in('id', batchIds);
    batches = data || [];
  }

  const farmIds = batches
    .filter(b => b.farm_id)
    .map(b => b.farm_id as string);

  let farms: Array<Record<string, unknown>> = [];
  if (farmIds.length > 0) {
    const { data } = await supabaseAdmin
      .from('farms')
      .select('id, farmer_name, community, commodity, compliance_status, area_hectares')
      .in('id', farmIds);
    farms = data || [];
  }

  const exporterOrgIds = [...new Set(contracts.map((c: any) => c.exporter_org_id))];
  let exporterOrgs: Array<Record<string, unknown>> = [];
  if (exporterOrgIds.length > 0) {
    const { data } = await supabaseAdmin
      .from('organizations')
      .select('id, name')
      .in('id', exporterOrgIds);
    exporterOrgs = data || [];
  }
  const exporterMap = new Map(exporterOrgs.map(o => [o.id, o]));
  const farmMap = new Map(farms.map(f => [f.id, f]));
  const batchMap = new Map(batches.map(b => [b.id, b]));

  const shipmentContractMap = new Map<string, string>();
  for (const cs of (contractShipments || [])) {
    if (cs.shipment_id) {
      shipmentContractMap.set(cs.shipment_id, cs.contract_id);
    }
  }

  const traceability = contracts.map((contract: any) => {
    const linkedShipmentIds = (contractShipments || [])
      .filter((cs: any) => cs.contract_id === contract.id && cs.shipment_id)
      .map((cs: any) => cs.shipment_id as string);

    const linkedItems = shipmentItems.filter(si => linkedShipmentIds.includes(si.shipment_id as string));

    const linkedBatches = linkedItems
      .filter(si => si.batch_id)
      .map(si => {
        const batch = batchMap.get(si.batch_id as string);
        if (!batch) return null;
        const farm = batch.farm_id ? farmMap.get(batch.farm_id as string) : null;
        return {
          id: batch.id,
          status: batch.status,
          total_weight: batch.total_weight,
          bag_count: batch.bag_count,
          collected_at: batch.collected_at,
          compliance_status: si.compliance_status,
          traceability_complete: si.traceability_complete,
          farm: farm ? {
            farmer_name: farm.farmer_name,
            community: farm.community,
            commodity: farm.commodity,
            compliance_status: farm.compliance_status,
            area_hectares: farm.area_hectares,
          } : null,
        };
      })
      .filter(Boolean);

    const exporter = exporterMap.get(contract.exporter_org_id);

    return {
      contract_id: contract.id,
      contract_reference: contract.contract_reference,
      commodity: contract.commodity,
      status: contract.status,
      exporter_name: (exporter as Record<string, unknown>)?.name || 'Unknown',
      shipment_count: linkedShipmentIds.length,
      batches: linkedBatches,
      total_weight: linkedBatches.reduce((sum, b) => sum + (Number((b as Record<string, unknown>)?.total_weight) || 0), 0),
      farm_count: new Set(linkedBatches.map(b => (b as Record<string, unknown>)?.farm ? JSON.stringify((b as Record<string, unknown>)?.farm) : null).filter(Boolean)).size,
    };
  });

  return NextResponse.json({ traceability });
}

async function handleDocumentsSection(supabaseAdmin: any, buyerOrgId: string) {
  const { data: links } = await supabaseAdmin
    .from('supply_chain_links')
    .select('exporter_org_id, status')
    .eq('buyer_org_id', buyerOrgId)
    .eq('status', 'active');

  if (!links || links.length === 0) {
    return NextResponse.json({ documents: [], exporters: [] });
  }

  const exporterOrgIds = links.map((l: any) => l.exporter_org_id);

  const [docsRes, orgsRes] = await Promise.all([
    supabaseAdmin
      .from('documents')
      .select('id, title, document_type, file_url, file_name, file_size, issued_date, expiry_date, status, linked_entity_type, linked_entity_id, notes, created_at')
      .in('org_id', exporterOrgIds)
      .order('created_at', { ascending: false }),
    supabaseAdmin
      .from('organizations')
      .select('id, name')
      .in('id', exporterOrgIds),
  ]);

  const now = new Date();
  const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  const documents = (docsRes.data || []).map((doc: any) => {
    let computedStatus = doc.status;
    if (doc.expiry_date && computedStatus !== 'archived') {
      const expiry = new Date(doc.expiry_date);
      if (expiry < now) computedStatus = 'expired';
      else if (expiry <= sevenDaysFromNow) computedStatus = 'expiring_soon';
    }

    return {
      ...doc,
      status: computedStatus,
    };
  });

  const exporters = (orgsRes.data || []).map((o: any) => ({
    id: o.id,
    name: o.name,
  }));

  return NextResponse.json({ documents, exporters });
}
