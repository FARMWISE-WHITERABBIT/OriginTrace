import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getAuthenticatedProfile } from '@/lib/api-auth';
import { z } from 'zod';
import { logAuditEvent, getClientIp } from '@/lib/audit';

const createSchema = z.object({
  farm_id: z.number().int().positive().optional(),
  commodity: z.string().min(1, 'Commodity is required'),
  price_per_kg: z.number().positive('Price must be positive'),
  currency: z.string().default('NGN'),
  effective_from: z.string().optional(), // ISO date string; defaults to today
  effective_to: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
});

export async function GET(request: NextRequest) {
  try {
    const { user, profile } = await getAuthenticatedProfile(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!profile?.org_id) return NextResponse.json({ error: 'No organization' }, { status: 403 });

    const supabase = createAdminClient();
    const { searchParams } = new URL(request.url);
    const commodity = searchParams.get('commodity');
    const farmId = searchParams.get('farm_id');

    let query = supabase
      .from('farmer_price_agreements')
      .select('*')
      .eq('org_id', profile.org_id)
      .order('created_at', { ascending: false });

    if (commodity) query = query.eq('commodity', commodity);
    if (farmId) query = query.eq('farm_id', parseInt(farmId));

    const { data, error } = await query;
    if (error) throw error;

    return NextResponse.json({ agreements: data ?? [] });
  } catch (error) {
    console.error('GET farmer-price-agreements error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { user, profile } = await getAuthenticatedProfile(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!profile?.org_id) return NextResponse.json({ error: 'No organization' }, { status: 403 });
    if (!['admin', 'aggregator'].includes(profile.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', fields: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from('farmer_price_agreements')
      .insert({
        org_id: profile.org_id,
        farm_id: parsed.data.farm_id ?? null,
        commodity: parsed.data.commodity,
        price_per_kg: parsed.data.price_per_kg,
        currency: parsed.data.currency,
        effective_from: parsed.data.effective_from ?? new Date().toISOString().split('T')[0],
        effective_to: parsed.data.effective_to ?? null,
        notes: parsed.data.notes ?? null,
        created_by: user.id,
      })
      .select()
      .single();

    if (error) throw error;

    await logAuditEvent({
      orgId: profile.org_id,
      actorId: user.id,
      actorEmail: user.email,
      action: 'price_agreement.created',
      resourceType: 'farmer_price_agreement',
      resourceId: data.id,
      metadata: { commodity: data.commodity, price_per_kg: data.price_per_kg, currency: data.currency, farm_id: data.farm_id },
      ipAddress: getClientIp(request),
    });

    return NextResponse.json({ agreement: data }, { status: 201 });
  } catch (error) {
    console.error('POST farmer-price-agreements error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
