import { createAdminClient } from '@/lib/supabase/admin';
import { createClient as createServerClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { getResendClient } from '@/lib/email/resend-client';
import { buildDeforestationRiskEmail } from '@/lib/email/templates';
import { checkRateLimit } from '@/lib/rate-limit';
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

interface DeforestationResult {
  deforestation_free: boolean;
  forest_loss_hectares: number;
  forest_loss_percentage: number;
  analysis_date: string;
  data_source: string;
  risk_level: 'low' | 'medium' | 'high';
}

async function queryGFWApi(polygon: any): Promise<DeforestationResult | null> {
  try {
    const geoJson = {
      type: 'Polygon',
      coordinates: polygon.coordinates,
    };

    const response = await fetch('https://data-api.globalforestwatch.org/dataset/gfw_integrated_alerts/latest/query', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        geometry: geoJson,
        sql: `SELECT SUM(alert__count) as total_alerts, SUM(area__ha) as total_area_ha FROM results WHERE umd_tree_cover_loss__year >= 2021`,
      }),
      signal: AbortSignal.timeout(15000),
    });

    if (!response.ok) {
      return null;
    }

    const data = await response.json();

    if (data?.data && data.data.length > 0) {
      const result = data.data[0];
      const forestLossHa = parseFloat(result.total_area_ha || '0');
      const polygonAreaHa = calculatePolygonArea(polygon);
      const lossPercentage = polygonAreaHa > 0 ? (forestLossHa / polygonAreaHa) * 100 : 0;

      let riskLevel: 'low' | 'medium' | 'high' = 'low';
      if (lossPercentage > 5) riskLevel = 'high';
      else if (lossPercentage > 1) riskLevel = 'medium';

      return {
        deforestation_free: forestLossHa === 0,
        forest_loss_hectares: Math.round(forestLossHa * 100) / 100,
        forest_loss_percentage: Math.round(lossPercentage * 100) / 100,
        analysis_date: new Date().toISOString(),
        data_source: 'Global Forest Watch (GFW)',
        risk_level: riskLevel,
      };
    }

    return null;
  } catch (error) {
    console.error('GFW API error:', error);
    return null;
  }
}

function calculatePolygonArea(polygon: any): number {
  if (!polygon?.coordinates?.[0]) return 0;

  const coords = polygon.coordinates[0];
  const R = 6371000;
  let area = 0;

  for (let i = 0; i < coords.length - 1; i++) {
    const [lon1, lat1] = coords[i];
    const [lon2, lat2] = coords[i + 1];
    const phi1 = (lat1 * Math.PI) / 180;
    const phi2 = (lat2 * Math.PI) / 180;
    const lambda1 = (lon1 * Math.PI) / 180;
    const lambda2 = (lon2 * Math.PI) / 180;
    area += (lambda2 - lambda1) * (2 + Math.sin(phi1) + Math.sin(phi2));
  }

  area = Math.abs((area * R * R) / 2);
  return area / 10000;
}

function getFallbackResult(areaHectares: number, countryCode: string = 'NG'): DeforestationResult {
  const risk = COUNTRY_RISK_MAP[countryCode] || COUNTRY_RISK_MAP['DEFAULT'];
  const estimatedLossHa = Math.round(areaHectares * (risk.forest_loss_percentage / 100) * 100) / 100;

  return {
    deforestation_free: risk.risk_level === 'low',
    forest_loss_hectares: estimatedLossHa,
    forest_loss_percentage: risk.forest_loss_percentage,
    analysis_date: new Date().toISOString(),
    data_source: 'EUDR Country Risk Benchmarking (fallback)',
    risk_level: risk.risk_level,
  };
}

export async function POST(request: NextRequest) {
  const rateCheck = checkRateLimit(request, { windowMs: 60_000, maxRequests: 10 });
  if (rateCheck.limited) return rateCheck.response!;

  try {
    const supabase = await createServerClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    const supabaseAdmin = createAdminClient();

    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('org_id, role')
      .eq('user_id', user.id)
      .single();

    if (!profile) {
      return NextResponse.json(
        { error: 'Profile not found' },
        { status: 404 }
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
      const gfwResult = await queryGFWApi(farmPolygon);
      if (gfwResult) {
        result = gfwResult;
      } else {
        const area = farmAreaHectares > 0 ? farmAreaHectares : calculatePolygonArea(farmPolygon);
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

          const resendClient = await getResendClient();

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

            await resendClient.client.emails.send({
              from: resendClient.fromEmail,
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

    const supabase = await createServerClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    const supabaseAdmin = createAdminClient();

    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('org_id')
      .eq('user_id', user.id)
      .single();

    if (!profile) {
      return NextResponse.json(
        { error: 'Profile not found' },
        { status: 404 }
      );
    }

    const { searchParams } = new URL(request.url);
    const farmId = searchParams.get('farm_id');

    if (!farmId) {
      return NextResponse.json(
        { error: 'farm_id query parameter is required' },
        { status: 400 }
      );
    }

    const { data: farm, error: farmError } = await supabaseAdmin
      .from('farms')
      .select('id, deforestation_check, org_id')
      .eq('id', farmId)
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
