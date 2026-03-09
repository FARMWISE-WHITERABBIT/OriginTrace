import { createAdminClient } from '@/lib/supabase/admin';
import { createClient as createServerClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { tierTemplatesSchema, parseBody } from '@/lib/api/validation';


async function isSystemAdmin(supabase: any, userId: string): Promise<boolean> {
  const { data } = await supabase
    .from('system_admins')
    .select('id')
    .eq('user_id', userId)
    .single();
  return !!data;
}

export async function GET(request: NextRequest) {
  try {
    const supabaseAdmin = createAdminClient();

    const supabase = await createServerClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const isSuperAdmin = await isSystemAdmin(supabaseAdmin, user.id);
    if (!isSuperAdmin) {
      return NextResponse.json({ error: 'Superadmin access required' }, { status: 403 });
    }

    const { data, error } = await supabaseAdmin
      .from('system_config')
      .select('value')
      .eq('key', 'tier_templates')
      .single();

    if (error || !data) {
      return NextResponse.json({ templates: getDefaultTemplates() });
    }

    return NextResponse.json({ templates: data.value });
  } catch (error) {
    console.error('Tier templates API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const supabaseAdmin = createAdminClient();

    const supabase = await createServerClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const isSuperAdmin = await isSystemAdmin(supabaseAdmin, user.id);
    if (!isSuperAdmin) {
      return NextResponse.json({ error: 'Superadmin access required' }, { status: 403 });
    }

    const rawBody = await request.json();
    const { data: body, error: validationError } = parseBody(tierTemplatesSchema, rawBody);
    if (validationError) return validationError;
    const { templates } = body;

    if (!templates || typeof templates !== 'object') {
      return NextResponse.json({ error: 'Invalid templates format' }, { status: 400 });
    }

    const validTiers = ['starter', 'basic', 'pro', 'enterprise'];
    const validFeatureKeys = ['satellite_overlays', 'advanced_mapping', 'financing', 'api_access', 'buyer_portal_access', 'dpp_access'];

    for (const tier of validTiers) {
      if (!templates[tier]) {
        return NextResponse.json({ error: `Missing tier: ${tier}` }, { status: 400 });
      }
      const t = templates[tier];
      if (!t.features || typeof t.features !== 'object') {
        return NextResponse.json({ error: `Invalid features for tier: ${tier}` }, { status: 400 });
      }
      for (const key of validFeatureKeys) {
        if (typeof t.features[key] !== 'boolean') {
          return NextResponse.json({ error: `Invalid feature ${key} for tier: ${tier}` }, { status: 400 });
        }
      }
      if (typeof t.agent_seat_limit !== 'number') {
        return NextResponse.json({ error: `Invalid agent_seat_limit for tier: ${tier}` }, { status: 400 });
      }
      if (typeof t.monthly_collection_limit !== 'number') {
        return NextResponse.json({ error: `Invalid monthly_collection_limit for tier: ${tier}` }, { status: 400 });
      }
    }

    const { error } = await supabaseAdmin
      .from('system_config')
      .upsert({
        key: 'tier_templates',
        value: templates,
        updated_at: new Date().toISOString(),
        updated_by: user.id
      });

    if (error) {
      console.error('Tier templates update error:', error);
      return NextResponse.json({ error: 'Failed to update tier templates' }, { status: 500 });
    }

    return NextResponse.json({ templates });
  } catch (error) {
    console.error('Tier templates API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

function getDefaultTemplates() {
  return {
    starter: {
      features: { satellite_overlays: false, advanced_mapping: false, financing: false, api_access: false, buyer_portal_access: false, dpp_access: false },
      agent_seat_limit: 5,
      monthly_collection_limit: 500
    },
    basic: {
      features: { satellite_overlays: false, advanced_mapping: true, financing: false, api_access: false, buyer_portal_access: false, dpp_access: false },
      agent_seat_limit: 15,
      monthly_collection_limit: 5000
    },
    pro: {
      features: { satellite_overlays: true, advanced_mapping: true, financing: true, api_access: true, buyer_portal_access: true, dpp_access: false },
      agent_seat_limit: 100,
      monthly_collection_limit: 50000
    },
    enterprise: {
      features: { satellite_overlays: true, advanced_mapping: true, financing: true, api_access: true, buyer_portal_access: true, dpp_access: true },
      agent_seat_limit: -1,
      monthly_collection_limit: -1
    }
  };
}
