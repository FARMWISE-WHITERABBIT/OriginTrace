import { NextRequest, NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase/admin';
import { sendEmail } from '@/lib/email/resend-client';
import {
  buildRegistrantConfirmationEmail,
  buildAdminNotificationEmail,
} from '@/lib/email/event-registration-templates';
import { env } from '@/lib/env';
import { z } from 'zod';

const EVENT_SLUG = 'yexdep-2026';

const registrationSchema = z.object({
  fullName:     z.string().min(2).max(120),
  email:        z.string().email(),
  phone:        z.string().min(7).max(20),
  organization: z.string().min(1).max(200),
  role:         z.string().min(1).max(150),
  state:        z.string().min(1).max(100),
});

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

  const { fullName, email, phone, organization, role, state } = parsed.data;
  const supabase = getAdminClient();

  // Insert registration — unique constraint on (email, event_slug) prevents duplicates
  const { error: insertError } = await supabase.from('event_registrations').insert({
    event_slug:   EVENT_SLUG,
    full_name:    fullName,
    email:        email.toLowerCase(),
    phone,
    organization,
    role,
    state,
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

  // Get total count for admin notification
  const { count } = await supabase
    .from('event_registrations')
    .select('id', { count: 'exact', head: true })
    .eq('event_slug', EVENT_SLUG);

  const registrationData = { fullName, email, phone, organization, role, state };

  // Build email promises
  const emailPromises: Promise<{ success: boolean; error?: string }>[] = [
    sendEmail({
      to: email,
      subject: 'Registration Confirmed – YEXDEP 2026 | OriginTrace × NEPC',
      html: buildRegistrantConfirmationEmail(registrationData),
    }),
  ];

  const adminEmail = env.EVENTS_ADMIN_EMAIL;
  if (adminEmail) {
    emailPromises.push(
      sendEmail({
        to: adminEmail,
        subject: `New YEXDEP Registration: ${fullName} (${organization})`,
        html: buildAdminNotificationEmail(registrationData, count ?? 0),
        // Reply-to set to registrant so admin can respond directly
        replyTo: email,
      })
    );
  } else {
    console.warn('[events/register] EVENTS_ADMIN_EMAIL not set — skipping admin notification');
  }

  // Send all emails and log outcomes (non-blocking — never fail the registration)
  const results = await Promise.allSettled(emailPromises);
  results.forEach((result, i) => {
    const label = i === 0 ? `registrant (${email})` : `admin (${adminEmail})`;
    if (result.status === 'fulfilled') {
      if (result.value.success) {
        console.log(`[events/register] Email sent to ${label}`);
      } else {
        console.error(`[events/register] Email failed for ${label}:`, result.value.error);
      }
    } else {
      console.error(`[events/register] Email promise rejected for ${label}:`, result.reason);
    }
  });

  return NextResponse.json({ success: true }, { status: 201 });
}
