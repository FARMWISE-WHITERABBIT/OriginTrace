import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { getAdminClient } from '@/lib/supabase/admin';
import { sendEmail } from '@/lib/email/resend-client';
import {
  buildRegistrantConfirmationEmail,
  getEventEmailContext,
} from '@/lib/email/event-registration-templates';

async function assertSuperadmin(): Promise<boolean> {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  );
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;
  const admin = getAdminClient();
  const { data } = await admin.from('system_admins').select('id').eq('user_id', user.id).single();
  return !!data;
}

export async function POST(request: NextRequest) {
  if (!(await assertSuperadmin())) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  let body: { slug: string; ids?: string[] };
  try { body = await request.json(); } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { slug, ids } = body;
  if (!slug) return NextResponse.json({ error: 'slug is required' }, { status: 400 });

  const supabase = getAdminClient();

  let query = supabase
    .from('event_registrations')
    .select('id, full_name, email, phone, organization, role, state, currently_exporting, export_products, nepc_registered')
    .eq('event_slug', slug)
    .order('registered_at', { ascending: true });

  if (ids && ids.length > 0) {
    query = query.in('id', ids);
  }

  const { data: rawRegistrants, error } = await query;

  if (error) {
    console.error('[resend-confirmations] DB error:', error);
    return NextResponse.json({ error: 'Failed to fetch registrants' }, { status: 500 });
  }

  const registrants = rawRegistrants as unknown as Array<{
    id: string; full_name: string; email: string; phone: string;
    organization: string; role: string; state: string;
    currently_exporting: boolean | null; export_products: string | null;
    nepc_registered: boolean | null;
  }> | null;

  if (!registrants || registrants.length === 0) {
    return NextResponse.json({ sent: 0, failed: 0, message: 'No registrants found' });
  }

  const emailCtx = getEventEmailContext(slug);
  const results = { sent: 0, failed: 0, failures: [] as string[] };

  for (const r of registrants) {
    const registrationData = {
      fullName: r.full_name,
      email: r.email,
      phone: r.phone,
      organization: r.organization,
      role: r.role,
      state: r.state,
      currentlyExporting: r.currently_exporting === true ? 'yes' : r.currently_exporting === false ? 'no' : undefined,
      exportProducts: r.export_products ?? undefined,
      nepcRegistered: r.nepc_registered === true ? 'yes' : r.nepc_registered === false ? 'no' : undefined,
    };

    const result = await sendEmail({
      to: r.email,
      subject: `Registration Confirmed – ${emailCtx.shortTitle} | OriginTrace`,
      html: buildRegistrantConfirmationEmail(registrationData, emailCtx),
    });

    if (result.success) {
      results.sent++;
      console.info(`[resend-confirmations] Sent to ${r.email}`);
    } else {
      results.failed++;
      results.failures.push(`${r.email}: ${result.error}`);
      console.error(`[resend-confirmations] Failed for ${r.email}:`, result.error);
    }

    // Respect Resend rate limit — 2 req/sec on free plan
    await new Promise(res => setTimeout(res, 550));
  }

  return NextResponse.json({
    sent: results.sent,
    failed: results.failed,
    total: registrants.length,
    failures: results.failures,
    message: `Sent ${results.sent} of ${registrants.length} confirmation emails.`,
  });
}
