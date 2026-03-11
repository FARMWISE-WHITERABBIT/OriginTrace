import { createAdminClient } from '@/lib/supabase/admin';
import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedProfile } from '@/lib/api-auth';
import { analyzeBoundaryAuthenticity } from '@/lib/services/boundary-analysis';
import { z } from 'zod';

const boundaryCheckSchema = z.object({
  farm_id: z.union([z.string(), z.number()]),
  boundary: z.object({
    type: z.string(),
    coordinates: z.array(z.any()),
  }).optional(),
});

export async function POST(request: NextRequest) {
  try {
    const { user, profile } = await getAuthenticatedProfile(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    if (!profile.org_id) return NextResponse.json({ error: 'No organization assigned' }, { status: 403 });
    const supabaseAdmin = createAdminClient();

    const body = await request.json();
    const parsed = boundaryCheckSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', fields: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { farm_id, boundary: providedBoundary } = parsed.data;

    const { data: farm } = await supabaseAdmin
      .from('farms')
      .select('id, org_id, boundary, commodity, area_hectares')
      .eq('id', farm_id)
      .single();

    if (!farm || farm.org_id !== profile.org_id) {
      return NextResponse.json({ error: 'Farm not found' }, { status: 404 });
    }

    const boundaryToAnalyze = providedBoundary || farm.boundary;

    if (!boundaryToAnalyze || boundaryToAnalyze.type !== 'Polygon' || !boundaryToAnalyze.coordinates?.length) {
      return NextResponse.json(
        { error: 'No valid polygon boundary to analyze' },
        { status: 400 }
      );
    }

    const result = analyzeBoundaryAuthenticity(boundaryToAnalyze, farm.commodity);

    const { error: updateError } = await supabaseAdmin
      .from('farms')
      .update({ boundary_analysis: result })
      .eq('id', farm_id);

    if (updateError) {
      console.error('Failed to store boundary analysis:', updateError);
    }

    return NextResponse.json({ result, farm_id });
  } catch (error) {
    console.error('Boundary check error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
