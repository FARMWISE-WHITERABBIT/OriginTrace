import { createClient } from '@supabase/supabase-js';
import { createClient as createServerClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

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
};

export async function GET() {
  try {
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const supabase = await createServerClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('org_id')
      .eq('user_id', user.id)
      .single();

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

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
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const supabase = await createServerClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('org_id, role')
      .eq('user_id', user.id)
      .single();

    if (!profile || !['admin', 'compliance_officer'].includes(profile.role)) {
      return NextResponse.json({ error: 'Admin or compliance officer access required' }, { status: 403 });
    }

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

    const validFrameworks = ['EUDR', 'FSMA_204', 'UK_Environment_Act', 'custom'];
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
