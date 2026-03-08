import { createAdminClient } from '@/lib/supabase/admin';
import { createClient as createServerClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';


async function isSystemAdmin(supabase: any, userId: string): Promise<boolean> {
  const { data } = await supabase
    .from('system_admins')
    .select('id')
    .eq('user_id', userId)
    .single();
  return !!data;
}

function extractTierFromSettings(settings: Record<string, unknown> | null) {
  if (!settings) return { subscription_tier: 'starter', feature_flags: {}, agent_seat_limit: 5, monthly_collection_limit: 1000 };
  return {
    subscription_tier: (settings.subscription_tier as string) || 'starter',
    feature_flags: (settings.feature_flags as Record<string, boolean>) || {},
    agent_seat_limit: (settings.agent_seat_limit as number) ?? 5,
    monthly_collection_limit: (settings.monthly_collection_limit as number) ?? 1000,
  };
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

    const { data: organizations, error } = await supabaseAdmin
      .from('organizations')
      .select('id, name, settings')
      .order('name');

    if (error) {
      console.error('Feature toggles query error:', error);
      return NextResponse.json({ error: 'Failed to fetch organizations' }, { status: 500 });
    }

    const orgsWithDetails = (organizations || []).map((org: any) => {
      const tierData = extractTierFromSettings(org.settings);
      return {
        id: org.id,
        name: org.name,
        ...tierData,
      };
    });

    return NextResponse.json({ organizations: orgsWithDetails });
    
  } catch (error) {
    console.error('Feature toggles API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

const VALID_TIERS = ['starter', 'basic', 'pro', 'enterprise'];
const VALID_FEATURE_KEYS = ['satellite_overlays', 'advanced_mapping', 'financing', 'api_access'];

function validateFeatureFlags(flags: unknown): flags is Record<string, boolean> {
  if (!flags || typeof flags !== 'object') return false;
  const flagObj = flags as Record<string, unknown>;
  for (const key of Object.keys(flagObj)) {
    if (!VALID_FEATURE_KEYS.includes(key)) return false;
    if (typeof flagObj[key] !== 'boolean') return false;
  }
  return true;
}

export async function PATCH(request: NextRequest) {
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

    const body = await request.json();
    const { org_id, subscription_tier, feature_flags, agent_seat_limit, monthly_collection_limit } = body;

    if (!org_id) {
      return NextResponse.json({ error: 'Valid organization ID required' }, { status: 400 });
    }

    const { data: currentOrg, error: fetchError } = await supabaseAdmin
      .from('organizations')
      .select('settings')
      .eq('id', org_id)
      .single();

    if (fetchError || !currentOrg) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
    }

    const currentSettings = (currentOrg.settings as Record<string, unknown>) || {};
    const settingsUpdate = { ...currentSettings };

    if (subscription_tier) {
      if (!VALID_TIERS.includes(subscription_tier)) {
        return NextResponse.json({ error: 'Invalid subscription tier' }, { status: 400 });
      }
      settingsUpdate.subscription_tier = subscription_tier;

      const { data: configRow } = await supabaseAdmin
        .from('system_config')
        .select('value')
        .eq('key', 'tier_templates')
        .single();

      const fallbackDefaults: Record<string, { features: Record<string, boolean>; agent_seat_limit: number; monthly_collection_limit: number }> = {
        starter: { features: { satellite_overlays: false, advanced_mapping: false, financing: false, api_access: false }, agent_seat_limit: 5, monthly_collection_limit: 500 },
        basic: { features: { satellite_overlays: false, advanced_mapping: true, financing: false, api_access: false }, agent_seat_limit: 15, monthly_collection_limit: 5000 },
        pro: { features: { satellite_overlays: true, advanced_mapping: true, financing: true, api_access: true }, agent_seat_limit: 100, monthly_collection_limit: 50000 },
        enterprise: { features: { satellite_overlays: true, advanced_mapping: true, financing: true, api_access: true }, agent_seat_limit: -1, monthly_collection_limit: -1 }
      };

      const tierTemplates = configRow?.value || fallbackDefaults;
      const defaults = tierTemplates[subscription_tier] || fallbackDefaults[subscription_tier];
      if (defaults) {
        settingsUpdate.feature_flags = defaults.features;
        settingsUpdate.agent_seat_limit = defaults.agent_seat_limit;
        settingsUpdate.monthly_collection_limit = defaults.monthly_collection_limit;
      }
    }

    if (feature_flags !== undefined) {
      if (!validateFeatureFlags(feature_flags)) {
        return NextResponse.json({ error: 'Invalid feature flags format' }, { status: 400 });
      }
      settingsUpdate.feature_flags = feature_flags;
    }

    if (agent_seat_limit !== undefined) {
      if (typeof agent_seat_limit !== 'number' || (agent_seat_limit < -1 && agent_seat_limit !== -1)) {
        return NextResponse.json({ error: 'Invalid agent seat limit' }, { status: 400 });
      }
      settingsUpdate.agent_seat_limit = agent_seat_limit;
    }

    if (monthly_collection_limit !== undefined) {
      if (typeof monthly_collection_limit !== 'number' || (monthly_collection_limit < -1 && monthly_collection_limit !== -1)) {
        return NextResponse.json({ error: 'Invalid monthly collection limit' }, { status: 400 });
      }
      settingsUpdate.monthly_collection_limit = monthly_collection_limit;
    }

    const { data: organization, error: updateError } = await supabaseAdmin
      .from('organizations')
      .update({ settings: settingsUpdate, updated_at: new Date().toISOString() })
      .eq('id', org_id)
      .select()
      .single();

    if (updateError) {
      console.error('Feature toggle update error:', updateError);
      return NextResponse.json({ error: 'Failed to update organization settings' }, { status: 500 });
    }

    const tierData = extractTierFromSettings(organization.settings);
    return NextResponse.json({ 
      organization: {
        id: organization.id,
        name: organization.name,
        ...tierData,
      }
    });
    
  } catch (error) {
    console.error('Feature toggles API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
