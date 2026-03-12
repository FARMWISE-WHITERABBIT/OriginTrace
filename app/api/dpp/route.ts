import QRCode from 'qrcode';
import { createAdminClient } from '@/lib/supabase/admin';
import { NextRequest, NextResponse } from 'next/server';
import { parsePagination } from '@/lib/api/validation';
import { getAuthenticatedProfile } from '@/lib/api-auth';
import crypto from 'crypto';


function generateDppCode(): string {
  const year = new Date().getFullYear();
  const rand = crypto.randomBytes(4).toString('hex').toUpperCase();
  return `DPP-${year}-${rand}`;
}

function buildJsonLd(dpp: any, pedigree: any) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    '@id': `urn:dpp:${dpp.dpp_code}`,
    name: pedigree?.product_name || dpp.product_category,
    productID: dpp.dpp_code,
    category: dpp.product_category,
    countryOfOrigin: {
      '@type': 'Country',
      name: dpp.origin_country,
    },
    manufacturer: {
      '@type': 'Organization',
      name: pedigree?.organization_name || 'Unknown',
    },
    additionalProperty: [
      {
        '@type': 'PropertyValue',
        name: 'carbonFootprint',
        value: dpp.carbon_footprint_kg,
        unitCode: 'KGM',
        unitText: 'kg CO2e',
      },
      {
        '@type': 'PropertyValue',
        name: 'sustainabilityClaims',
        value: dpp.sustainability_claims,
      },
      {
        '@type': 'PropertyValue',
        name: 'certifications',
        value: dpp.certifications,
      },
      {
        '@type': 'PropertyValue',
        name: 'chainOfCustody',
        value: dpp.chain_of_custody,
      },
    ],
    dateCreated: dpp.issued_at || dpp.created_at,
    version: dpp.passport_version,
    status: dpp.status,
  };
}

export async function GET(request: NextRequest) {
  try {
    const supabaseAdmin = createAdminClient();

    const { user, profile } = await getAuthenticatedProfile(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    if (!profile.org_id) return NextResponse.json({ error: 'No organization assigned' }, { status: 403 });

    const { searchParams } = new URL(request.url);
    const { from, to, page, limit } = parsePagination(searchParams);

    const { data: dpps, error, count } = await supabaseAdmin
      .from('digital_product_passports')
      .select(`
        *,
        finished_goods (
          product_name,
          product_type,
          pedigree_code,
          weight_kg,
          destination_country,
          buyer_company
        )
      `)
      .eq('org_id', profile.org_id)
      .order('created_at', { ascending: false })
      .range(from, to);

    if (error) {
      console.error('DPP fetch error:', error);
      return NextResponse.json({ error: 'Failed to fetch DPPs' }, { status: 500 });
    }

    return NextResponse.json({ dpps: dpps || [], pagination: { page, limit, total: count ?? 0 } });
  } catch (error) {
    console.error('DPP API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabaseAdmin = createAdminClient();

    const { user, profile } = await getAuthenticatedProfile(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    if (!profile.org_id) return NextResponse.json({ error: 'No organization assigned' }, { status: 403 });

    const body = await request.json();
    const { finished_good_id, sustainability_claims, carbon_footprint_kg, certifications } = body;

    if (!finished_good_id) {
      return NextResponse.json({ error: 'finished_good_id is required' }, { status: 400 });
    }

    const { data: fg } = await supabaseAdmin
      .from('finished_goods')
      .select('*', { count: 'exact' })
      .eq('id', finished_good_id)
      .eq('org_id', profile.org_id)
      .single();

    if (!fg) {
      return NextResponse.json({ error: 'Finished good not found' }, { status: 404 });
    }

    const { data: pedigree } = await supabaseAdmin
      .from('pedigree_verification')
      .select('*')
      .eq('finished_good_id', finished_good_id)
      .single();

    const chainOfCustody = [];
    if (pedigree?.source_farms && Array.isArray(pedigree.source_farms)) {
      for (const farm of pedigree.source_farms) {
        chainOfCustody.push({
          stage: 'collection',
          actor: farm.farmer_name,
          location: `${farm.community || ''}, ${farm.state || ''}`.trim(),
          date: farm.collection_date,
          weight_kg: farm.weight_kg,
          compliance_status: farm.compliance_status,
        });
      }
    }

    if (pedigree) {
      chainOfCustody.push({
        stage: 'processing',
        actor: pedigree.organization_name,
        facility: pedigree.facility_name,
        location: pedigree.facility_location,
        date: pedigree.processed_at,
        input_kg: pedigree.raw_input_kg,
        output_kg: pedigree.processed_output_kg,
        recovery_rate: pedigree.recovery_rate,
        mass_balance_valid: pedigree.mass_balance_valid,
      });
    }

    const dppCode = generateDppCode();

    const dppData = {
      org_id: profile.org_id,
      finished_good_id,
      dpp_code: dppCode,
      product_category: fg.product_type || fg.product_name,
      origin_country: 'NG',
      sustainability_claims: sustainability_claims || {},
      carbon_footprint_kg: carbon_footprint_kg || null,
      certifications: certifications || [],
      processing_history: pedigree ? [{
        run_code: pedigree.processing_run_code,
        facility: pedigree.facility_name,
        input_kg: pedigree.raw_input_kg,
        output_kg: pedigree.processed_output_kg,
        recovery_rate: pedigree.recovery_rate,
        processed_at: pedigree.processed_at,
      }] : [],
      chain_of_custody: chainOfCustody,
      regulatory_compliance: {
        pedigree_verified: pedigree?.pedigree_verified || false,
        mass_balance_valid: pedigree?.mass_balance_valid || false,
        dds_submitted: pedigree?.dds_submitted || false,
        total_smallholders: pedigree?.total_smallholders || 0,
        total_farm_area_hectares: pedigree?.total_farm_area_hectares || 0,
      },
      machine_readable_data: {},
      passport_version: 1,
      status: 'draft',
      issued_at: new Date().toISOString(),
      created_by: user.id,
    };

    const jsonLd = buildJsonLd(dppData, pedigree);
    dppData.machine_readable_data = jsonLd;

    const { data: created, error } = await supabaseAdmin
      .from('digital_product_passports')
      .insert(dppData)
      .select()
      .single();

    if (error) {
      console.error('DPP creation error:', error);
      return NextResponse.json({ error: 'Failed to create DPP' }, { status: 500 });
    }

    // Generate QR code pointing to public verify page
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://origintrace.trade';
    const verifyUrl = `${appUrl}/verify/${dppCode}`;
    let qrCodeDataUrl: string | null = null;
    try {
      qrCodeDataUrl = await QRCode.toDataURL(verifyUrl, {
        width: 400,
        margin: 2,
        color: { dark: '#166534', light: '#FFFFFF' },
        errorCorrectionLevel: 'M',
      });
      // Store QR URL back on the record
      await supabaseAdmin
        .from('digital_product_passports')
        .update({ qr_code_url: qrCodeDataUrl, verify_url: verifyUrl })
        .eq('id', created.id);
    } catch (qrErr) {
      console.error('[DPP] QR generation failed:', qrErr);
    }

    return NextResponse.json({
      dpp: { ...created, qr_code_url: qrCodeDataUrl, verify_url: verifyUrl }
    }, { status: 201 });
  } catch (error) {
    console.error('DPP API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
