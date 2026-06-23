import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createAdminClient } from '@/lib/supabase/admin';
import { getAuthenticatedProfile } from '@/lib/api-auth';
import { enforceTier } from '@/lib/api/tier-guard';
import { logAuditEvent, getClientIp } from '@/lib/audit';
import { requireRole, ROLES } from '@/lib/rbac';
import { analyzeBoundaryAuthenticity } from '@/lib/services/boundary-analysis';

const coordinateSchema = z.tuple([z.number(), z.number()]);

const boundarySchema = z.object({
  boundary: z.object({
    type: z.literal('Polygon'),
    coordinates: z.array(z.array(coordinateSchema).min(4)).min(1),
  }),
  area_hectares: z.number().nonnegative().optional(),
}).superRefine((value, ctx) => {
  const ring = value.boundary.coordinates[0];
  const first = ring[0];
  const last = ring[ring.length - 1];
  if (first[0] !== last[0] || first[1] !== last[1]) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['boundary', 'coordinates', 0],
      message: 'Polygon ring must be closed',
    });
  }
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    const { id } = await params;
    const { user, profile } = await getAuthenticatedProfile(request);
    if (!user || !profile) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!profile.org_id) return NextResponse.json({ error: 'No organization assigned' }, { status: 403 });

    const roleError = requireRole(profile, ROLES.FIELD_ROLES);
    if (roleError) return roleError;

    const tierBlock = await enforceTier(profile.org_id, 'farm_mapping');
    if (tierBlock) return tierBlock;

    const body = await request.json();
    const parsed = boundarySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', fields: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();
    const { data: farm, error: farmError } = await supabase
      .from('farms')
      .select('id, org_id, farmer_name, commodity')
      .eq('id', id)
      .eq('org_id', profile.org_id)
      .single();

    if (farmError || !farm) return NextResponse.json({ error: 'Farm not found' }, { status: 404 });

    const { boundary, area_hectares } = parsed.data;
    const boundaryAnalysis = analyzeBoundaryAuthenticity(boundary, farm.commodity || undefined);

    const { data: updatedFarm, error: updateError } = await supabase
      .from('farms')
      .update({
        boundary,
        area_hectares: area_hectares ?? null,
        boundary_analysis: boundaryAnalysis,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('org_id', profile.org_id)
      .select('id, farmer_name, boundary, area_hectares, boundary_analysis, updated_at')
      .single();

    if (updateError) {
      console.error('Farm boundary update error:', updateError);
      return NextResponse.json({ error: 'Failed to save farm boundary' }, { status: 500 });
    }

    await logAuditEvent({
      orgId: profile.org_id,
      actorId: profile.user_id,
      actorEmail: user.email,
      action: 'farm.boundary_saved',
      resourceType: 'farm',
      resourceId: id,
      metadata: {
        points: boundary.coordinates[0].length,
        area_hectares: area_hectares ?? null,
        confidence_score: boundaryAnalysis.confidence_score,
      },
      ipAddress: getClientIp(request),
    });

    return NextResponse.json({ farm: updatedFarm, result: boundaryAnalysis, success: true });
  } catch (error) {
    console.error('Farm boundary route error:', error);
    return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 });
  }
}
