import { createAdminClient } from '@/lib/supabase/admin';
import { createClient as createSessionClient } from '@/lib/supabase/server';
import { checkRateLimit } from '@/lib/rate-limit';
import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { farmerLoginSchema, parseBody } from '@/lib/api/validation';
import { logAuditEvent, getClientIp } from '@/lib/audit';

const FARMER_LOGIN_RATE_LIMIT = {
  windowMs: 15 * 60 * 1000,
  maxRequests: 5,
};

function hashPin(pin: string, salt: string): string {
  return crypto.createHash('sha256').update(`${salt}:${pin}`).digest('hex');
}

export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.json();
    const { data: body, error: validationError } = parseBody(farmerLoginSchema, rawBody);
    if (validationError) return validationError;
    const { phone, pin } = body;

    if (!phone || !pin || pin.length !== 4) {
      return NextResponse.json({ error: 'Phone and 4-digit PIN required' }, { status: 400 });
    }

    const rateLimitKey = `farmer-login:${phone}`;
    const { limited, response } = checkRateLimit(request, FARMER_LOGIN_RATE_LIMIT, rateLimitKey);
    if (limited) {
      return response!;
    }

    const admin = createAdminClient();

    const { data: farmerAccount } = await admin
      .from('farmer_accounts')
      .select('id, user_id, pin_hash, status, org_id')
      .eq('phone', phone)
      .eq('status', 'active')
      .single();

    if (!farmerAccount || !farmerAccount.user_id) {
      return NextResponse.json({ error: 'Account not found or not activated' }, { status: 401 });
    }

    const salt = farmerAccount.id;
    if (farmerAccount.pin_hash !== hashPin(pin, salt)) {
      return NextResponse.json({ error: 'Invalid PIN' }, { status: 401 });
    }

    // Establish a real Supabase session: the farmer only ever set a PIN, never
    // a password, so we mint a one-time magic-link token server-side and
    // redeem it immediately against the cookie-bound client. This is what
    // actually signs the browser in — verifying the PIN alone does not.
    const { data: authUserData, error: getUserError } = await admin.auth.admin.getUserById(farmerAccount.user_id);
    if (getUserError || !authUserData?.user?.email) {
      console.error('Farmer login: could not resolve auth user', getUserError);
      return NextResponse.json({ error: 'Unable to sign in. Please contact your field agent.' }, { status: 500 });
    }

    const { data: linkData, error: linkError } = await admin.auth.admin.generateLink({
      type: 'magiclink',
      email: authUserData.user.email,
    });

    if (linkError || !linkData?.properties?.hashed_token) {
      console.error('Farmer login: could not generate session link', linkError);
      return NextResponse.json({ error: 'Unable to sign in. Please try again.' }, { status: 500 });
    }

    const sessionClient = await createSessionClient();
    const { error: verifyError } = await sessionClient.auth.verifyOtp({
      token_hash: linkData.properties.hashed_token,
      type: 'email',
    });

    if (verifyError) {
      console.error('Farmer login: session verification failed', verifyError);
      return NextResponse.json({ error: 'Unable to sign in. Please try again.' }, { status: 500 });
    }

    await logAuditEvent({
      orgId: farmerAccount.org_id,
      actorId: farmerAccount.user_id,
      action: 'farmer.login',
      resourceType: 'farmer_account',
      resourceId: farmerAccount.id,
      ipAddress: getClientIp(request),
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Farmer login error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
