/**
 * GET  /api/farmer-bank-accounts         — list farmer bank accounts for org
 * POST /api/farmer-bank-accounts         — create a new farmer bank account
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createServiceClient, getAuthenticatedProfile } from '@/lib/api-auth';
import { logAuditEvent } from '@/lib/audit';

const createSchema = z.object({
  farm_id:        z.string().uuid().optional(),
  farmer_name:    z.string().min(1, 'Farmer name is required'),
  account_number: z.string().min(10, 'Account number required'),
  account_name:   z.string().min(1, 'Account name required'),
  bank_code:      z.string().min(3, 'Bank code required'),
  bank_name:      z.string().min(1, 'Bank name required'),
  is_verified:    z.boolean().default(false),
});

export async function GET(request: NextRequest) {
  try {
    const supabase = createServiceClient();
    const { user, profile } = await getAuthenticatedProfile();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!profile?.org_id) return NextResponse.json({ error: 'No organization' }, { status: 403 });

    const farmId = request.nextUrl.searchParams.get('farm_id');

    let query = supabase
      .from('farmer_bank_accounts')
      .select('*, farms(farmer_name, community)')
      .eq('org_id', profile.org_id)
      .order('created_at', { ascending: false });

    if (farmId) query = query.eq('farm_id', farmId);

    const { data, error } = await query;
    if (error) {
      const code = (error as any).code;
      if (code === 'PGRST205' || code === 'PGRST200' || error.message?.includes('farmer_bank_accounts')) {
        return NextResponse.json({ accounts: [] });
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ accounts: data ?? [] });
  } catch (err) {
    console.error('Farmer bank accounts GET error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createServiceClient();
    const { user, profile } = await getAuthenticatedProfile();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!profile?.org_id) return NextResponse.json({ error: 'No organization' }, { status: 403 });

    if (!['admin', 'aggregator'].includes(profile.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const body = await request.json();
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Validation failed', fields: parsed.error.flatten().fieldErrors }, { status: 400 });
    }

    const { data: inserted, error } = await supabase
      .from('farmer_bank_accounts')
      .insert({
        org_id:         profile.org_id,
        farm_id:        parsed.data.farm_id ?? null,
        farmer_name:    parsed.data.farmer_name,
        account_number: parsed.data.account_number,
        account_name:   parsed.data.account_name,
        bank_code:      parsed.data.bank_code,
        bank_name:      parsed.data.bank_name,
        is_verified:    parsed.data.is_verified,
        verified_at:    parsed.data.is_verified ? new Date().toISOString() : null,
        created_by:     user.id,
      })
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json({ error: 'This account number is already registered for this farm.' }, { status: 409 });
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    await logAuditEvent({
      orgId:       profile.org_id,
      actorId:     user.id,
      actorEmail:  user.email,
      action:      'farmer_bank_account.created',
      resourceType: 'farmer_bank_account',
      resourceId:  inserted.id,
      metadata:    { farm_id: parsed.data.farm_id, bank_name: parsed.data.bank_name },
    });

    return NextResponse.json({ account: inserted }, { status: 201 });
  } catch (err) {
    console.error('Farmer bank accounts POST error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
