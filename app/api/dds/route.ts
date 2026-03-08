import { createClient as createServerClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { NextRequest, NextResponse } from 'next/server';

/**
 * POST /api/dds
 * Generate a structured EUDR Due Diligence Statement (DDS) for a shipment.
 * Produces JSON-LD output compatible with the EUDR Information System format.
 *
 * POST /api/dds with { shipment_id } to generate per-shipment DDS
 * GET  /api/dds?shipment_id=xxx to retrieve a cached DDS
 * GET  /api/dds?format=csv to export all farm polygons as bulk CSV
 */

export async function GET(request: NextRequest) {
  try {
    const authClient = await createServerClient();
    const { data: { user }, error: authErr } = await authClient.auth.getUser();
    if (authErr || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const supabase = createAdminClient();
    const { data: profile } = await supabase
      .from('profiles').select('org_id, role').eq('user_id', user.id).single();
    if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 });

    const { searchParams } = new URL(request.url);
    const shipmentId = searchParams.get('shipment_id');
    const format = searchParams.get('format') || 'json';
    const orgId = profile.org_id;

    if (format === 'csv') {
      // Bulk farm polygon export for EUDR portal upload
      const { data: farms } = await supabase
        .from('farms')
        .select('id, farmer_name, community, state, commodity, area_hectares, gps_latitude, gps_longitude, boundary_geo, compliance_status')
        .eq('org_id', orgId);

      if (!farms?.length) return NextResponse.json({ error: 'No farms found' }, { status: 404 });

      const csvRows = [
        ['farm_id', 'farmer_name', 'community', 'state', 'commodity', 'area_hectares', 'latitude', 'longitude', 'has_polygon', 'compliance_status'],
        ...(farms || []).map(f => [
          f.id,
          f.farmer_name || '',
          f.community || '',
          f.state || '',
          f.commodity || '',
          f.area_hectares || '',
          f.gps_latitude || '',
          f.gps_longitude || '',
          f.boundary_geo ? 'yes' : 'no',
          f.compliance_status || 'pending',
        ]),
      ];

      const csv = csvRows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
      return new NextResponse(csv, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="origintrace-farm-polygons-${new Date().toISOString().split('T')[0]}.csv"`,
        },
      });
    }

    if (!shipmentId) return NextResponse.json({ error: 'shipment_id is required' }, { status: 400 });

    const dds = await generateDDS(supabase, orgId, shipmentId);
    if (!dds) return NextResponse.json({ error: 'Shipment not found or no data available' }, { status: 404 });

    return NextResponse.json(dds);
  } catch (err) {
    console.error('[dds] GET error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const authClient = await createServerClient();
    const { data: { user }, error: authErr } = await authClient.auth.getUser();
    if (authErr || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const supabase = createAdminClient();
    const { data: profile } = await supabase
      .from('profiles').select('org_id, role').eq('user_id', user.id).single();
    if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 });

    if (!profile.org_id) {
      return NextResponse.json({ error: 'No organisation associated with this account' }, { status: 403 });
    }

    if (!['admin', 'compliance_officer'].includes(profile.role)) {
      return NextResponse.json({ error: 'DDS generation requires admin or compliance officer role' }, { status: 403 });
    }

    const body = await request.json();
    const { shipment_id, format = 'json' } = body;

    if (!shipment_id) return NextResponse.json({ error: 'shipment_id is required' }, { status: 400 });

    const dds = await generateDDS(supabase, profile.org_id, shipment_id);
    if (!dds) return NextResponse.json({ error: 'Shipment not found or insufficient data to generate DDS' }, { status: 404 });

    // Persist DDS export record
    await supabase.from('dds_exports').insert({
      org_id: profile.org_id,
      shipment_id,
      created_by: user.id,
      format,
      dds_data: dds,
      created_at: new Date().toISOString(),
    }).throwOnError().catch(() => {
      // dds_exports table may not exist yet — non-fatal
    });

    if (format === 'xml') {
      const xml = ddsToXml(dds);
      return new NextResponse(xml, {
        headers: {
          'Content-Type': 'application/xml',
          'Content-Disposition': `attachment; filename="DDS-${shipment_id.slice(0, 8)}-${new Date().toISOString().split('T')[0]}.xml"`,
        },
      });
    }

    return NextResponse.json(dds, {
      headers: {
        'Content-Disposition': `attachment; filename="DDS-${shipment_id.slice(0, 8)}-${new Date().toISOString().split('T')[0]}.json"`,
      },
    });
  } catch (err) {
    console.error('[dds] POST error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// ---------------------------------------------------------------------------
// DDS generation
// ---------------------------------------------------------------------------

async function generateDDS(supabase: any, orgId: string, shipmentId: string) {
  const [shipmentRes, orgRes] = await Promise.all([
    supabase.from('shipments')
      .select('*, items:shipment_items(*)')
      .eq('id', shipmentId)
      .eq('org_id', orgId)
      .single(),
    supabase.from('organizations')
      .select('id, name, slug, settings')
      .eq('id', orgId)
      .single(),
  ]);

  const shipment = shipmentRes.data;
  const org = orgRes.data;
  if (!shipment || !org) return null;

  // Collect all batch IDs and finished good IDs
  const items: any[] = shipment.items || [];
  const batchIds = items.filter(i => i.item_type === 'batch' && i.batch_id).map((i: any) => i.batch_id);
  const fgIds = items.filter(i => i.item_type === 'finished_good' && i.finished_good_id).map((i: any) => i.finished_good_id);

  const [batchesRes, fgRes] = await Promise.all([
    batchIds.length > 0
      ? supabase.from('collection_batches')
          .select('id, farm_id, commodity, total_weight, bag_count, status, yield_validated, farm:farms(id, farmer_name, community, state, area_hectares, gps_latitude, gps_longitude, boundary_geo, compliance_status, deforestation_check)')
          .in('id', batchIds)
      : Promise.resolve({ data: [] }),
    fgIds.length > 0
      ? supabase.from('finished_goods').select('*').in('id', fgIds)
      : Promise.resolve({ data: [] }),
  ]);

  const batches = batchesRes.data || [];
  const finishedGoods = fgRes.data || [];

  // Build farm plots array
  const farmMap = new Map<string, any>();
  for (const batch of batches) {
    if (batch.farm) farmMap.set(String(batch.farm.id), batch.farm);
  }
  const farms = Array.from(farmMap.values());

  const plots = farms.map((farm: any) => {
    const defoCheck = farm.deforestation_check as any;
    return {
      plotId: String(farm.id),
      farmerName: farm.farmer_name || 'Unknown',
      country: 'NG', // TODO: derive from state/location data
      region: farm.state || farm.community || '',
      areaHectares: farm.area_hectares || null,
      gpsCoordinates: farm.gps_latitude && farm.gps_longitude
        ? { latitude: farm.gps_latitude, longitude: farm.gps_longitude }
        : null,
      hasPolygon: !!farm.boundary_geo,
      polygon: farm.boundary_geo || null,
      complianceStatus: farm.compliance_status || 'pending',
      deforestationCheck: defoCheck
        ? {
            verified: true,
            deforestationFree: defoCheck.deforestation_free,
            riskLevel: defoCheck.risk_level,
            analysisDate: defoCheck.analysis_date,
            dataSource: defoCheck.data_source,
          }
        : { verified: false },
    };
  });

  const commoditySet = new Set(batches.map((b: any) => b.commodity).filter(Boolean));
  const totalWeight = items.reduce((s: number, i: any) => s + Number(i.weight_kg || 0), 0);

  const dds = {
    '@context': 'https://eudr.ec.europa.eu/schema/dds/v1',
    '@type': 'DueDiligenceStatement',
    statementId: `OT-DDS-${shipmentId.slice(0, 8).toUpperCase()}-${Date.now()}`,
    schemaVersion: '1.0.0',
    generatedAt: new Date().toISOString(),
    generatedBy: 'OriginTrace',
    operator: {
      name: org.name,
      identifier: org.slug,
      country: 'NG',
    },
    shipment: {
      internalId: shipment.id,
      destinationCountry: shipment.destination_country || 'Unknown',
      estimatedShipDate: shipment.estimated_ship_date || null,
      targetRegulations: shipment.target_regulations || [],
      readinessScore: shipment.readiness_score || null,
      readinessDecision: shipment.readiness_decision || null,
    },
    commodities: Array.from(commoditySet).map(commodity => ({
      hsCode: getCommodityHsCode(commodity as string),
      description: commodity,
      scientificName: getCommodityScientificName(commodity as string),
      totalWeightKg: Math.round(totalWeight * 100) / 100,
      country: 'NG',
    })),
    plots,
    supplyChain: {
      batchCount: batches.length,
      farmCount: farms.length,
      finishedGoodCount: finishedGoods.length,
      allFarmsGpsVerified: farms.every((f: any) => !!f.gps_latitude),
      allFarmsPolygonVerified: farms.every((f: any) => !!f.boundary_geo),
      deforestationCheckCoverage: farms.length > 0
        ? Math.round((farms.filter((f: any) => !!f.deforestation_check).length / farms.length) * 100)
        : 0,
    },
    statement: {
      dueDiligencePerformed: true,
      riskAssessmentConclusion: shipment.readiness_decision === 'go'
        ? 'negligible_risk'
        : shipment.readiness_decision === 'conditional'
          ? 'risk_identified_mitigated'
          : 'under_review',
      date: new Date().toISOString().split('T')[0],
      signedBy: org.name,
    },
  };

  return dds;
}

function getCommodityHsCode(commodity: string): string {
  const map: Record<string, string> = {
    cocoa: '1801.00',
    coffee: '0901.11',
    soya: '1201.90',
    palm_oil: '1511.10',
    cattle: '0201.10',
    wood: '4403.11',
    rubber: '4001.10',
  };
  return map[commodity?.toLowerCase()] || '9999.00';
}

function getCommodityScientificName(commodity: string): string {
  const map: Record<string, string> = {
    cocoa: 'Theobroma cacao',
    coffee: 'Coffea arabica',
    soya: 'Glycine max',
    palm_oil: 'Elaeis guineensis',
    rubber: 'Hevea brasiliensis',
  };
  return map[commodity?.toLowerCase()] || '';
}

// ---------------------------------------------------------------------------
// XML serialiser for EUDR IS compatibility
// ---------------------------------------------------------------------------
function ddsToXml(dds: any): string {
  const escape = (v: any) => String(v ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  const plotsXml = (dds.plots || []).map((p: any) => `
    <Plot>
      <PlotId>${escape(p.plotId)}</PlotId>
      <FarmerName>${escape(p.farmerName)}</FarmerName>
      <Country>${escape(p.country)}</Country>
      <Region>${escape(p.region)}</Region>
      <AreaHectares>${escape(p.areaHectares)}</AreaHectares>
      <HasPolygon>${escape(p.hasPolygon)}</HasPolygon>
      <ComplianceStatus>${escape(p.complianceStatus)}</ComplianceStatus>
      <DeforestationFree>${escape(p.deforestationCheck?.deforestationFree ?? 'unverified')}</DeforestationFree>
    </Plot>`).join('');

  return `<?xml version="1.0" encoding="UTF-8"?>
<DueDiligenceStatement xmlns="https://eudr.ec.europa.eu/schema/dds/v1">
  <StatementId>${escape(dds.statementId)}</StatementId>
  <GeneratedAt>${escape(dds.generatedAt)}</GeneratedAt>
  <Operator>
    <Name>${escape(dds.operator?.name)}</Name>
    <Country>${escape(dds.operator?.country)}</Country>
  </Operator>
  <Shipment>
    <InternalId>${escape(dds.shipment?.internalId)}</InternalId>
    <DestinationCountry>${escape(dds.shipment?.destinationCountry)}</DestinationCountry>
    <ReadinessDecision>${escape(dds.shipment?.readinessDecision)}</ReadinessDecision>
  </Shipment>
  <Plots>${plotsXml}
  </Plots>
  <Statement>
    <DueDiligencePerformed>${escape(dds.statement?.dueDiligencePerformed)}</DueDiligencePerformed>
    <RiskAssessmentConclusion>${escape(dds.statement?.riskAssessmentConclusion)}</RiskAssessmentConclusion>
    <Date>${escape(dds.statement?.date)}</Date>
  </Statement>
</DueDiligenceStatement>`;
}
