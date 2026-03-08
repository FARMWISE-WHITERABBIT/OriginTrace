'use server';

import { createAdminClient } from '@/lib/supabase/admin';
import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

function hashPin(pin: string, salt: string): string {
  return crypto.createHash('sha256').update(`${salt}:${pin}`).digest('hex');
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { phone, pin } = body;

    if (!phone || !pin || pin.length !== 4) {
      return NextResponse.json({ error: 'Phone and 4-digit PIN required' }, { status: 400 });
    }

    const supabase = createAdminClient();

    const { data: farmerAccount } = await supabase
      .from('farmer_accounts')
      .select('id, user_id, pin_hash, status, org_id')
      .eq('phone', phone)
      .eq('status', 'active')
      .single();

    if (!farmerAccount) {
      return NextResponse.json({ error: 'Account not found or not activated' }, { status: 401 });
    }

    const salt = farmerAccount.id;
    if (farmerAccount.pin_hash !== hashPin(pin, salt)) {
      return NextResponse.json({ error: 'Invalid PIN' }, { status: 401 });
    }

    return NextResponse.json({
      success: true,
      userId: farmerAccount.user_id,
      message: 'PIN verified. Use Supabase auth for session.',
    });
  } catch (error) {
    console.error('Farmer login error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
