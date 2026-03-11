import { createAdminClient } from '@/lib/supabase/admin';
import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedProfile } from '@/lib/api-auth';


const TEMPLATES: Record<string, {
  name: string;
  destination_market: string;
  regulation_framework: string;
  required_documents: string[];
  required_certifications: string[];
  geo_verification_level: string;
  min_traceability_depth: number;
}> = {
  EU: {
    name: 'EU EUDR Compliance',
    destination_market: 'European Union',
    regulation_framework: 'EUDR',
    required_documents: [
      'Deforestation-free declaration',
      'GPS polygon boundaries',
      'Land title / ownership proof',
      'Farmer ID verification',
      'Traceability chain documentation',
      'Due diligence statement',
    ],
    required_certifications: ['Rainforest Alliance', 'UTZ', 'Fairtrade'],
    geo_verification_level: 'satellite',
    min_traceability_depth: 3,
  },
  UK: {
    name: 'UK Environment Act Compliance',
    destination_market: 'United Kingdom',
    regulation_framework: 'UK_Environment_Act',
    required_documents: [
      'Due diligence assessment',
      'Risk assessment report',
      'Supply chain mapping',
      'Farmer registration records',
      'Land use documentation',
    ],
    required_certifications: ['Rainforest Alliance', 'Fairtrade'],
    geo_verification_level: 'polygon',
    min_traceability_depth: 2,
  },
  US: {
    name: 'US FSMA 204 Compliance',
    destination_market: 'United States',
    regulation_framework: 'FSMA_204',
    required_documents: [
      'Key Data Elements (KDE) records',
      'Critical Tracking Events (CTE) log',
      'Lot traceability records',
      'Supplier verification',
      'Food safety plan',
    ],
    required_certifications: ['FDA Registration', 'HACCP'],
    geo_verification_level: 'basic',
    min_traceability_depth: 1,
  },
  LACEY_UFLPA: {
    name: 'US Lacey Act / UFLPA Compliance',
    destination_market: 'United States',
    regulation_framework: 'Lacey_Act_UFLPA',
    required_documents: [
      'Certificate of Origin',
      'Species / product identification',
      'Import declaration',
      'Forced labor declaration',
      'Supply chain mapping',
      'Country-of-origin documentation',
    ],
    required_certifications: ['Chain of Custody', 'FSC/PEFC'],
    geo_verification_level: 'polygon',
    min_traceability_depth: 3,
  },
  CHINA: {
    name: 'China Green Trade Compliance',
    destination_market: 'China',
    regulation_framework: 'China_Green_Trade',
    required_documents: [
      'GACC registration certificate',
      'Phytosanitary certificate',
      'Fumigation certificate',
      'Certificate of origin',
      'GB standards compliance report',
      'Inspection report',
    ],
    required_certifications: ['GACC Registration', 'GB Standards'],
    geo_verification_level: 'polygon',
    min_traceability_depth: 2,
  },
  UAE: {
    name: 'UAE / Halal Compliance',
    destination_market: 'UAE / Middle East',
    regulation_framework: 'UAE_Halal',
    required_documents: [
      'Halal certificate (accredited body)',
      'ESMA compliance certificate',
      'MOCCAE import permit',
      'Certificate of origin',
      'Health certificate',
      'Arabic labeling compliance',
    ],
    required_certifications: ['Halal Certification', 'ESMA Compliance'],
    geo_verification_level: 'basic',
    min_traceability_depth: 1,
  },
};

export async function GET(request: NextRequest) {
  try {
    const supabaseAdmin = createAdminClient();

    const { user, profile } = await getAuthenticatedProfile(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    if (!profile.org_id) return NextResponse.json({ error: 'No organization assigned' }, { status: 403 });

    const { data: profiles, error } = await supabaseAdmin
      .from('compliance_profiles')
      .select('*')
      .eq('org_id', profile.org_id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Compliance profiles fetch error:', error);
      return NextResponse.json({ error: 'Failed to fetch compliance profiles' }, { status: 500 });
    }

    return NextResponse.json({ profiles: profiles || [], templates: TEMPLATES });
  } catch (error) {
    console.error('Compliance profiles API error:', error);
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
    const {
      name,
      destination_market,
      regulation_framework,
      required_documents,
      required_certifications,
      geo_verification_level,
      min_traceability_depth,
      custom_rules,
      is_default,
      template,
    } = body;

    if (template && TEMPLATES[template]) {
      const t = TEMPLATES[template];
      const { data: created, error } = await supabaseAdmin
        .from('compliance_profiles')
        .insert({
          org_id: profile.org_id,
          name: t.name,
          destination_market: t.destination_market,
          regulation_framework: t.regulation_framework,
          required_documents: t.required_documents,
          required_certifications: t.required_certifications,
          geo_verification_level: t.geo_verification_level,
          min_traceability_depth: t.min_traceability_depth,
          is_default: false,
        })
        .select()
        .single();

      if (error) {
        console.error('Compliance profile creation error:', error);
        return NextResponse.json({ error: 'Failed to create compliance profile' }, { status: 500 });
      }

      return NextResponse.json({ profile: created }, { status: 201 });
    }

    if (!name || !destination_market || !regulation_framework) {
      return NextResponse.json({
        error: 'name, destination_market, and regulation_framework are required',
      }, { status: 400 });
    }

    const validFrameworks = ['EUDR', 'FSMA_204', 'UK_Environment_Act', 'Lacey_Act_UFLPA', 'China_Green_Trade', 'UAE_Halal', 'custom'];
    if (!validFrameworks.includes(regulation_framework)) {
      return NextResponse.json({ error: 'Invalid regulation_framework' }, { status: 400 });
    }

    const { data: created, error } = await supabaseAdmin
      .from('compliance_profiles')
      .insert({
        org_id: profile.org_id,
        name,
        destination_market,
        regulation_framework,
        required_documents: required_documents || [],
        required_certifications: required_certifications || [],
        geo_verification_level: geo_verification_level || 'polygon',
        min_traceability_depth: min_traceability_depth || 1,
        custom_rules: custom_rules || {},
        is_default: is_default || false,
      })
      .select()
      .single();

    if (error) {
      console.error('Compliance profile creation error:', error);
      return NextResponse.json({ error: 'Failed to create compliance profile' }, { status: 500 });
    }

    return NextResponse.json({ profile: created }, { status: 201 });
  } catch (error) {
    console.error('Compliance profiles API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
