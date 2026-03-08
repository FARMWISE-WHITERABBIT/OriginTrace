'use server';

import { createAdminClient } from '@/lib/supabase/admin';
import { createClient as createServerClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = createAdminClient();
    const authClient = await createServerClient();
    const { data: { user }, error: userError } = await authClient.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('id, org_id, role')
      .eq('user_id', user.id)
      .single();

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    const orgId = profile.org_id;
    const shipmentId = request.nextUrl.searchParams.get('shipment_id');
    const commodity = request.nextUrl.searchParams.get('commodity');
    const format = request.nextUrl.searchParams.get('format') || 'json';

    const { data: org } = await supabase
      .from('organizations')
      .select('name, slug, settings')
      .eq('id', orgId)
      .single();

    let farmQuery = supabase
      .from('farms')
      .select('id, farmer_name, community, state, country, commodity, area_hectares, boundary, compliance_status, deforestation_check, created_at')
      .eq('org_id', orgId)
      .eq('compliance_status', 'approved');

    if (commodity && commodity !== 'all') {
      farmQuery = farmQuery.eq('commodity', commodity);
    }

    const { data: farms } = await farmQuery;

    let shipmentData = null;
    if (shipmentId) {
      const { data: shipment } = await supabase
        .from('shipments')
        .select('id, destination_country, commodity, status, shipment_score, compliance_score, decision, created_at')
        .eq('id', shipmentId)
        .eq('org_id', orgId)
        .single();
      shipmentData = shipment;
    }

    const farmList = farms || [];
    const farmsWithBoundaries = farmList.filter(f => f.boundary && typeof f.boundary === 'object');

    const ddsDocument = {
      document_type: 'EUDR_Due_Diligence_Statement',
      version: '1.0',
      generated_at: new Date().toISOString(),
      reference_number: `DDS-${orgId}-${Date.now().toString(36).toUpperCase()}`,

      operator: {
        name: org?.name || 'Unknown',
        identifier: org?.slug || '',
      },

      commodity: commodity && commodity !== 'all' ? commodity : farmList.map(f => f.commodity).filter(Boolean).filter((v, i, a) => a.indexOf(v) === i).join(', ') || 'Not specified',

      country_of_origin: farmList.map(f => f.country || f.state).filter(Boolean).filter((v, i, a) => a.indexOf(v) === i),

      geolocation: {
        total_plots: farmList.length,
        plots_with_coordinates: farmsWithBoundaries.length,
        coverage_percentage: farmList.length > 0 ? Math.round((farmsWithBoundaries.length / farmList.length) * 100) : 0,
        plots: farmsWithBoundaries.map(f => ({
          plot_id: f.id,
          community: f.community,
          state: f.state,
          area_hectares: f.area_hectares,
          coordinates: f.boundary,
        })),
      },

      deforestation_free_declaration: {
        statement: 'The commodities covered by this due diligence statement have been produced on land that has not been subject to deforestation after 31 December 2020, in accordance with EU Regulation 2023/1115.',
        total_farms_checked: farmList.filter(f => f.deforestation_check).length,
        farms_deforestation_free: farmList.filter(f => {
          const check = f.deforestation_check;
          return check && (check.deforestation_free === true || check.risk_level === 'low');
        }).length,
        farms_pending_check: farmList.filter(f => !f.deforestation_check).length,
      },

      traceability: {
        total_smallholders: farmList.length,
        total_area_hectares: Math.round(farmList.reduce((s, f) => s + (f.area_hectares || 0), 0) * 100) / 100,
        compliance_rate: farmList.length > 0 ? Math.round((farmList.filter(f => f.compliance_status === 'approved').length / farmList.length) * 100) : 0,
      },

      shipment: shipmentData ? {
        id: shipmentData.id,
        destination_country: shipmentData.destination_country,
        commodity: shipmentData.commodity,
        readiness_score: shipmentData.shipment_score,
        compliance_score: shipmentData.compliance_score,
        decision: shipmentData.decision,
      } : null,

      date_of_statement: new Date().toISOString().split('T')[0],
    };

    if (format === 'geojson') {
      const geojson = {
        type: 'FeatureCollection',
        properties: {
          document_type: ddsDocument.document_type,
          reference_number: ddsDocument.reference_number,
          operator: ddsDocument.operator,
          generated_at: ddsDocument.generated_at,
        },
        features: farmsWithBoundaries.map(f => ({
          type: 'Feature',
          properties: {
            plot_id: f.id,
            community: f.community,
            state: f.state,
            commodity: f.commodity,
            area_hectares: f.area_hectares,
            compliance_status: f.compliance_status,
          },
          geometry: f.boundary,
        })),
      };
      return NextResponse.json(geojson, {
        headers: {
          'Content-Disposition': `attachment; filename="dds-${ddsDocument.reference_number}.geojson"`,
        },
      });
    }

    return NextResponse.json(ddsDocument, {
      headers: {
        'Content-Disposition': `attachment; filename="dds-${ddsDocument.reference_number}.json"`,
      },
    });
  } catch (error) {
    console.error('DDS API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
