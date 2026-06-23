/**
 * GET  /api/org/wallet/2fa   → Return 2FA setup status for the org
 * POST /api/org/wallet/2fa   → action=setup: generate secret + QR URI
 *                              action=enable: verify token and enable 2FA
 *                              action=disable: verify token and disable 2FA
 */
import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getAuthenticatedProfile } from '@/lib/api-auth';
import { generateSecret, getTOTPUri, verifyTOTP } from '@/lib/totp';
import QRCode from 'qrcode';

export async function GET(request: NextRequest) {
  const { user, profile } = await getAuthenticatedProfile(request);
  if (!user || !profile?.org_id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (profile.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const supabase = createAdminClient();
  const { data: org } = await supabase
    .from('organizations')
    .select('totp_enabled, totp_secret')
    .eq('id', profile.org_id)
    .single();

  return NextResponse.json({
    enabled: (org as any)?.totp_enabled ?? false,
    // Never expose the raw secret to the frontend
  });
}

export async function POST(request: NextRequest) {
  const { user, profile } = await getAuthenticatedProfile(request);
  if (!user || !profile?.org_id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (profile.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const body = await request.json();
  const supabase = createAdminClient();

  if (body.action === 'setup') {
    // Generate a fresh secret and return the QR URI (not yet saved to DB)
    const secret = generateSecret();
    const { data: org } = await supabase
      .from('organizations')
      .select('name')
      .eq('id', profile.org_id)
      .single();
    const label = user.email || (org as any)?.name || 'OriginTrace Org';
    const uri = getTOTPUri(secret, label);
    let qrDataUrl = '';
    try {
      qrDataUrl = await QRCode.toDataURL(uri, { width: 200, margin: 2 });
    } catch {}

    // Store the pending secret (not yet enabled) in totp_pending_secret
    await supabase.from('organizations').update({ totp_pending_secret: secret } as any)
      .eq('id', profile.org_id);

    return NextResponse.json({ secret, qr_data_url: qrDataUrl });
  }

  if (body.action === 'enable') {
    const { token } = body;
    if (!token) return NextResponse.json({ error: 'Token required' }, { status: 400 });

    const { data: org } = await supabase
      .from('organizations')
      .select('totp_pending_secret')
      .eq('id', profile.org_id)
      .single();

    const pendingSecret = (org as any)?.totp_pending_secret;
    if (!pendingSecret) return NextResponse.json({ error: 'No pending 2FA setup. Start setup first.' }, { status: 400 });
    if (!verifyTOTP(token, pendingSecret)) return NextResponse.json({ error: 'Invalid code. Try again.' }, { status: 400 });

    await supabase.from('organizations').update({
      totp_secret: pendingSecret,
      totp_enabled: true,
      totp_pending_secret: null,
    } as any).eq('id', profile.org_id);

    return NextResponse.json({ success: true, message: '2FA enabled for withdrawals.' });
  }

  if (body.action === 'disable') {
    const { token } = body;
    if (!token) return NextResponse.json({ error: 'Token required to disable 2FA' }, { status: 400 });

    const { data: org } = await supabase
      .from('organizations')
      .select('totp_secret, totp_enabled')
      .eq('id', profile.org_id)
      .single();

    if (!(org as any)?.totp_enabled) return NextResponse.json({ error: '2FA is not enabled' }, { status: 400 });
    if (!verifyTOTP(token, (org as any).totp_secret)) return NextResponse.json({ error: 'Invalid code' }, { status: 400 });

    await supabase.from('organizations').update({
      totp_secret: null,
      totp_enabled: false,
    } as any).eq('id', profile.org_id);

    return NextResponse.json({ success: true, message: '2FA disabled.' });
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
}
