import { createAdminClient } from '@/lib/supabase/admin';
import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { logAuditEvent } from '@/lib/audit';
import { farmerActivateSchema, parseBody } from '@/lib/api/validation';

function hashPin(pin: string, salt: string): string {
  return crypto.createHash('sha256').update(`${salt}:${pin}`).digest('hex');
}

export async function GET(request: NextRequest) {
  try {
    const token = request.nextUrl.searchParams.get('token');
    if (!token) {
      return NextResponse.json({ error: 'Token required' }, { status: 400 });
    }

    const supabase = createAdminClient();
    const { data: account } = await supabase
      .from('farmer_accounts')
      .select('id, phone, farmer_code, status, farms(farmer_name, community), organizations:org_id(name)')
      .eq('invite_token', token)
      .eq('status', 'invited')
      .single();

    if (!account) {
      return NextResponse.json({ error: 'Invalid or expired token' }, { status: 404 });
    }

    return NextResponse.json({
      farmer_name: (account.farms as any)?.farmer_name || 'Farmer',
      phone: account.phone,
      community: (account.farms as any)?.community || '',
      org_name: (account as any).organizations?.name || '',
    });
  } catch (error) {
    console.error('Farmer activate GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.json();
    const { data: body, error: validationError } = parseBody(farmerActivateSchema, rawBody);
    if (validationError) return validationError;
    const { token, pin } = body;

    if (!token || !pin || pin.length !== 4 || !/^\d{4}$/.test(pin)) {
      return NextResponse.json({ error: 'Token and 4-digit PIN required' }, { status: 400 });
    }

    const supabase = createAdminClient();

    const { data: account } = await supabase
      .from('farmer_accounts')
      .select('id, phone, farmer_code, org_id, farm_id, farms(farmer_name)')
      .eq('invite_token', token)
      .eq('status', 'invited')
      .single();

    if (!account) {
      return NextResponse.json({ error: 'Invalid or expired token' }, { status: 404 });
    }

    const email = `farmer_${account.phone.replace(/\D/g, '')}@origintrace.local`;
    const password = crypto.randomBytes(32).toString('hex');

    const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        role: 'farmer',
        farmer_account_id: account.id,
        phone: account.phone,
      },
    });

    if (authError) {
      console.error('Auth user creation error:', authError);
      return NextResponse.json({ error: 'Failed to create account' }, { status: 500 });
    }

    await supabase.from('profiles').insert({
      user_id: authUser.user.id,
      org_id: account.org_id,
      role: 'farmer',
      full_name: (account.farms as any)?.farmer_name || 'Farmer',
    });

    await supabase
      .from('farmer_accounts')
      .update({
        user_id: authUser.user.id,
        pin_hash: hashPin(pin, account.id),
        status: 'active',
        verified_at: new Date().toISOString(),
        invite_token: null,
      })
      .eq('id', account.id);

    await logAuditEvent({
      orgId: account.org_id,
      actorId: authUser.user.id,
      action: 'farmer.activated',
      resourceType: 'farmer_account',
      resourceId: account.id,
      metadata: { phone: account.phone, farm_id: account.farm_id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Farmer activate POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
