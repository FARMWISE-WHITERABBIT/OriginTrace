import { createAdminClient } from '@/lib/supabase/admin';
import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedProfile } from '@/lib/api-auth';
import { sendEmail } from '@/lib/email/resend-client';
import { buildDeforestationRiskEmail } from '@/lib/email/templates';
import { checkRateLimit, RATE_LIMIT_PRESETS } from '@/lib/api/rate-limit';
import {
  calculatePolygonAreaHectares,
  GFW_TREE_COVER_LOSS_DATASET,
  GFW_TREE_COVER_LOSS_VERSION,
  queryGfwTreeCoverLoss,
  type DeforestationResult,
  type GfwPolygon,
} from '@/lib/services/gfw-deforestation';
import { z } from 'zod';

const coordinatePairSchema = z.tuple([
  z.number().min(-180).max(180),
  z.number().min(-90).max(90),
]);

const polygonSchema = z.object({
  type: z.literal('Polygon'),
  coordinates: z
    .array(
      z.array(coordinatePairSchema).min(4)
    )
    .min(1),
}).refine(
  (val) => {
    const ring = val.coordinates[0];
    if (!ring || ring.length < 4) return false;
    const first = ring[0];
    const last = ring[ring.length - 1];
    return first[0] === last[0] && first[1] === last[1];
  },
  { message: 'Polygon outer ring must be closed (first and last coordinates must match)' }
);

const deforestationCheckBodySchema = z.object({
  farm_id: z.union([z.string(), z.number()]).optional(),
  polygon: polygonSchema.optional(),
  country_code: z.string().length(2).optional(),
}).refine(
  (val) => val.farm_id !== undefined || val.polygon !== undefined,
  { message: 'Either farm_id or polygon is required' }
);

const COUNTRY_RISK_MAP: Record<string, { risk_level: 'low' | 'medium' | 'high'; forest_loss_percentage: number }> = {
  'NG': { risk_level: 'high', forest_loss_percentage: 5.2 },
  'GH': { risk_level: 'high', forest_loss_percentage: 4.8 },
  'CI': { risk_level: 'high', forest_loss_percentage: 6.1 },
  'CM': { risk_level: 'high', forest_loss_percentage: 3.9 },
  'CD': { risk_level: 'high', forest_loss_percentage: 4.5 },
  'BR': { risk_level: 'high', forest_loss_percentage: 7.3 },
  'ID': { risk_level: 'high', forest_loss_percentage: 5.8 },
  'MY': { risk_level: 'medium', forest_loss_percentage: 2.1 },
  'CO': { risk_level: 'medium', forest_loss_percentage: 2.4 },
  'PE': { risk_level: 'medium', forest_loss_percentage: 1.8 },
  'PG': { risk_level: 'medium', forest_loss_percentage: 1.5 },
  'EC': { risk_level: 'medium', forest_loss_percentage: 1.2 },
  'DE': { risk_level: 'low', forest_loss_percentage: 0.1 },
  'FR': { risk_level: 'low', forest_loss_percentage: 0.05 },
  'GB': { risk_level: 'low', forest_loss_percentage: 0.02 },
  'US': { risk_level: 'low', forest_loss_percentage: 0.3 },
  'DEFAULT': { risk_level: 'medium', forest_loss_percentage: 1.0 },
};

function getFallbackResult(_areaHectares: number, countryCode: string = 'NG'): DeforestationResult {
  const risk = COUNTRY_RISK_MAP[countryCode] || COUNTRY_RISK_MAP['DEFAULT'];

  return {
    deforestation_free: false,
    forest_loss_hectares: 0,
    forest_loss_percentage: 0,
    analysis_date: new Date().toISOString(),
    data_source: `GFW unavailable - country risk: ${risk.risk_level.toUpperCase()} (manual review required)`,
    risk_level: risk.risk_level,
    verification_status: 'manual_review_required',
    manual_review_required: true,
    gfw_dataset: GFW_TREE_COVER_LOSS_DATASET,
    gfw_version: GFW_TREE_COVER_LOSS_VERSION,
  };
}

export async function POST(request: NextRequest) {
  const rateCheck = await checkRateLimit(request, null, RATE_LIMIT_PRESETS.deforestationCheck);
  if (rateCheck) return rateCheck;

  try {
    const { user, profile } = await getAuthenticatedProfile(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    if (!profile.org_id) return NextResponse.json({ error: 'No organization assigned' }, { status: 403 });
    const supabaseAdmin = createAdminClient();

    const deforestAllowedRoles = ['admin', 'aggregator', 'quality_manager'];
    if (!deforestAllowedRoles.includes(profile.role as string)) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: 'Invalid JSON body' },
        { status: 400 }
      );
    }

    const parsed = deforestationCheckBodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { farm_id, polygon, country_code } = parsed.data;

    let farmPolygon = polygon;
    let farmAreaHectares = 0;
    let farmId = farm_id;

    if (farm_id) {
      const { data: farm, error: farmError } = await supabaseAdmin
        .from('farms')
        .select('id, boundary, area_hectares, org_id')
        .eq('id', farm_id)
        .single();

      if (farmError || !farm) {
        return NextResponse.json(
          { error: 'Farm not found' },
          { status: 404 }
        );
      }

      if (farm.org_id !== profile.org_id) {
        return NextResponse.json(
          { error: 'Farm not found in your organization' },
          { status: 403 }
        );
      }

      farmPolygon = farm.boundary;
      farmAreaHectares = parseFloat(farm.area_hectares || '0');
    }

    let result: DeforestationResult;

    if (farmPolygon && farmPolygon.type === 'Polygon' && farmPolygon.coordinates) {
      const gfwResult = await queryGfwTreeCoverLoss(farmPolygon as GfwPolygon);
      if (gfwResult) {
        result = gfwResult;
      } else {
        const area = farmAreaHectares > 0 ? farmAreaHectares : calculatePolygonAreaHectares(farmPolygon);
        result = getFallbackResult(area, country_code || 'NG');
      }
    } else {
      const area = farmAreaHectares > 0 ? farmAreaHectares : 1;
      result = getFallbackResult(area, country_code || 'NG');
    }

    if (farmId) {
      const { error: updateError } = await supabaseAdmin
        .from('farms')
        .update({ deforestation_check: result })
        .eq('id', farmId);

      if (updateError) {
        console.error('Failed to persist deforestation check:', updateError);
      }

      if (result.risk_level === 'medium' || result.risk_level === 'high') {
        try {
          const { data: farm } = await supabaseAdmin
            .from('farms')
            .select('farmer_name')
            .eq('id', farmId)
            .single();

          const { data: org } = await supabaseAdmin
            .from('organizations')
            .select('id, name')
            .eq('id', profile.org_id)
            .single();

          const { data: admins } = await supabaseAdmin
            .from('profiles')
            .select('user_id, full_name')
            .eq('org_id', profile.org_id)
            .in('role', ['admin', 'compliance_officer']);

          const { data: authUsers } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 });
          const userEmailMap: Record<string, string> = {};
          for (const u of authUsers?.users || []) {
            if (u.email) userEmailMap[u.id] = u.email;
          }

          const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_SITE_URL || 'https://origintrace.trade';

          for (const admin of (admins || [])) {
            const email = userEmailMap[admin.user_id];
            if (!email) continue;

            const { html, text } = buildDeforestationRiskEmail({
              recipientName: admin.full_name || 'Admin',
              orgName: org?.name || 'Your Organization',
              farmerName: farm?.farmer_name || `Farm #${farmId}`,
              farmId: String(farmId),
              forestLossHectares: result.forest_loss_hectares,
              forestLossPercentage: result.forest_loss_percentage,
              riskLevel: result.risk_level,
              dashboardUrl: `${baseUrl}/app/farms/map`,
            });

            await sendEmail({
              to: email,
              subject: `[OriginTrace] Deforestation Risk Alert - ${result.risk_level.toUpperCase()} Risk`,
              html,
              text,
            });
          }
        } catch (emailErr) {
          console.error('Failed to send deforestation risk email:', emailErr);
        }
      }
    }

    return NextResponse.json({
      success: true,
      farm_id: farmId || null,
      result,
    });

  } catch (error) {
    console.error('Deforestation check error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json(
        { error: 'Supabase is not properly configured' },
        { status: 500 }
      );
    }

    const { user, profile } = await getAuthenticatedProfile(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    if (!profile.org_id) return NextResponse.json({ error: 'No organization assigned' }, { status: 403 });
    const supabaseAdmin = createAdminClient();

    const { searchParams } = new URL(request.url);
    const farmId = searchParams.get('farm_id');
    if (!farmId) return NextResponse.json({ error: 'farm_id is required' }, { status: 400 });

    const { data: farm, error: farmError } = await supabaseAdmin
      .from('farms')
      .select('id, deforestation_check')
      .eq('id', farmId)
      .eq('org_id', profile.org_id)
      .single();

    if (farmError || !farm) return NextResponse.json({ error: 'Farm not found' }, { status: 404 });

    return NextResponse.json({
      farm_id: farm.id,
      result: farm.deforestation_check || null,
    });

  } catch (error) {
    console.error('Deforestation check fetch error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
