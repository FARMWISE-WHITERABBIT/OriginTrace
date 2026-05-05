import { NextRequest, NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase/admin';
import { sendEmail } from '@/lib/email/resend-client';
import {
  buildRegistrantConfirmationEmail,
  buildAdminNotificationEmail,
  getEventEmailContext,
} from '@/lib/email/event-registration-templates';
import { env } from '@/lib/env';
import { z } from 'zod';

const registrationSchema = z.object({
  slug:               z.string().max(100).optional(),
  fullName:           z.string().min(2).max(120),
  email:              z.string().email(),
  phone:              z.string().min(7).max(20),
  organization:       z.string().min(1).max(200),
  role:               z.string().min(1).max(150),
  state:              z.string().min(1).max(100),
  currentlyExporting: z.enum(['yes', 'no']),
  exportProducts:     z.string().min(1).max(300),
  nepcRegistered:     z.enum(['yes', 'no']),
});

const ALLOWED_SLUGS = new Set(['yexdep-2026', 'export-readiness-2026']);

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const parsed = registrationSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Validation failed', details: parsed.error.flatten().fieldErrors },
      { status: 422 }
    );
  }

  const rawSlug = parsed.data.slug;
  if (!rawSlug || !ALLOWED_SLUGS.has(rawSlug)) {
    return NextResponse.json({ error: 'Invalid or missing event slug.' }, { status: 400 });
  }
  const eventSlug = rawSlug;

  const emailCtx = getEventEmailContext(eventSlug);

  const supabase = getAdminClient();

  // Check registration window from events table
  const { data: rawEventRow } = await supabase
    .from('events')
    .select('registration_open, registration_closes_at')
    .eq('slug', eventSlug)
    .single();

  const eventRow = rawEventRow as unknown as { registration_open: boolean; registration_closes_at: string | null } | null;

  if (eventRow) {
    const now = new Date();
    const closedByFlag = !eventRow.registration_open;
    const closedByTime = eventRow.registration_closes_at
      ? now > new Date(eventRow.registration_closes_at)
      : false;

    if (closedByFlag || closedByTime) {
      return NextResponse.json(
        { error: 'Registration for this event is now closed.' },
        { status: 410 }
      );
    }
  }

  const {
    fullName, email, phone, organization, role, state,
    currentlyExporting, exportProducts, nepcRegistered,
  } = parsed.data;

  // Insert registration — unique constraint on (email, event_slug) prevents duplicates
  const { error: insertError } = await supabase.from('event_registrations').insert({
    event_slug:          eventSlug,
    full_name:           fullName,
    email:               email.toLowerCase(),
    phone,
    organization,
    role,
    state,
    currently_exporting: currentlyExporting === 'yes',
    export_products:     exportProducts,
    nepc_registered:     nepcRegistered === 'yes',
  });

  if (insertError) {
    if (insertError.code === '23505') {
      return NextResponse.json(
        { error: 'This email address is already registered for this event.' },
        { status: 409 }
      );
    }
    console.error('[events/register] DB insert error:', insertError);
    return NextResponse.json({ error: 'Registration failed. Please try again.' }, { status: 500 });
  }

  // Total count for admin notification
  const { count } = await supabase
    .from('event_registrations')
    .select('id', { count: 'exact', head: true })
    .eq('event_slug', eventSlug);

  const registrationData = {
    fullName, email, phone, organization, role, state,
    currentlyExporting, exportProducts, nepcRegistered,
  };

  // Send emails (non-blocking)
  const emailPromises: Promise<{ success: boolean; error?: string }>[] = [
    sendEmail({
      to: email,
      subject: `Registration Confirmed – ${emailCtx.shortTitle} | OriginTrace`,
      html: buildRegistrantConfirmationEmail(registrationData, emailCtx),
    }),
  ];

  const adminEmail = env.EVENTS_ADMIN_EMAIL;
  if (adminEmail) {
    emailPromises.push(
      sendEmail({
        to: adminEmail,
        subject: `New ${emailCtx.shortTitle} Registration: ${fullName} (${organization})`,
        html: buildAdminNotificationEmail(registrationData, count ?? 0, emailCtx),
        replyTo: email,
      })
    );
  } else {
    console.warn('[events/register] EVENTS_ADMIN_EMAIL not set — skipping admin notification');
  }

  const results = await Promise.allSettled(emailPromises);
  results.forEach((result, i) => {
    const label = i === 0 ? `registrant (${email})` : `admin (${adminEmail})`;
    if (result.status === 'fulfilled') {
      if (result.value.success) {
        console.info(`[events/register] Email sent to ${label}`);
      } else {
        console.error(`[events/register] Email failed for ${label}:`, result.value.error);
      }
    } else {
      console.error(`[events/register] Email promise rejected for ${label}:`, result.reason);
    }
  });

  return NextResponse.json({ success: true }, { status: 201 });
}
