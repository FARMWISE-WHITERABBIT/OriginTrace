import { NextRequest, NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase/admin';
import { sendEmail, FROM_ADDRESS } from '@/lib/email/resend-client';
import {
  buildRegistrantConfirmationEmail,
  buildAdminNotificationEmail,
} from '@/lib/email/event-registration-templates';
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

  // Insert registration (unique constraint on email+event_slug prevents duplicates)
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
      // Unique violation — already registered
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

  // Send emails (non-blocking — don't fail registration on email error)
  const emailPromises: Promise<unknown>[] = [
    sendEmail({
      to: email,
      subject: 'Registration Confirmed – YEXDEP 2026 | OriginTrace × NEPC',
      html: buildRegistrantConfirmationEmail(registrationData),
    }),
  ];

  const adminEmail = process.env.EVENTS_ADMIN_EMAIL;
  if (adminEmail) {
    emailPromises.push(
      sendEmail({
        to: adminEmail,
        subject: `New YEXDEP Registration: ${fullName} (${organization})`,
        html: buildAdminNotificationEmail(registrationData, count ?? 0),
        replyTo: FROM_ADDRESS,
      })
    );
  }

  await Promise.allSettled(emailPromises);

  return NextResponse.json({ success: true }, { status: 201 });
}
