import { createClient } from '@supabase/supabase-js';
import { createClient as createServerClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { getResendClient } from '@/lib/email/resend-client';
import { buildWelcomeEmail } from '@/lib/email/templates';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

function generateTempPassword(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  const specials = '!@#$%';
  let password = '';
  for (let i = 0; i < 10; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  password += specials.charAt(Math.floor(Math.random() * specials.length));
  password += Math.floor(Math.random() * 10);
  return password;
}

async function isSystemAdmin(supabase: any, userId: string): Promise<boolean> {
  const { data } = await supabase
    .from('system_admins')
    .select('id')
    .eq('user_id', userId)
    .single();
  return !!data;
}

export async function POST(request: NextRequest) {
  try {
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    const supabase = await createServerClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const isSuperAdmin = await isSystemAdmin(supabaseAdmin, user.id);
    if (!isSuperAdmin) {
      return NextResponse.json({ error: 'Forbidden: Superadmin access required' }, { status: 403 });
    }

    const body = await request.json();
    const { orgName, adminName, adminEmail, commodities, subscriptionStatus } = body;

    if (!orgName || !adminName || !adminEmail) {
      return NextResponse.json(
        { error: 'Organization name, admin name, and admin email are required' },
        { status: 400 }
      );
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(adminEmail)) {
      return NextResponse.json({ error: 'Invalid email address' }, { status: 400 });
    }

    const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
    const emailExists = existingUsers?.users?.some(
      (u: any) => u.email?.toLowerCase() === adminEmail.toLowerCase()
    );
    if (emailExists) {
      return NextResponse.json(
        { error: 'A user with this email already exists' },
        { status: 409 }
      );
    }

    const tempPassword = generateTempPassword();

    const slug = orgName.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-');
    const { data: orgData, error: orgError } = await supabaseAdmin
      .from('organizations')
      .insert({
        name: orgName,
        slug: `${slug}-${Date.now().toString(36)}`,
        subscription_status: subscriptionStatus || 'trial',
        commodity_types: commodities || [],
      })
      .select()
      .single();

    if (orgError || !orgData) {
      console.error('Org creation error:', orgError);
      return NextResponse.json({ error: 'Failed to create organization' }, { status: 500 });
    }

    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: adminEmail,
      password: tempPassword,
      email_confirm: true,
      user_metadata: { full_name: adminName }
    });

    if (authError || !authData.user) {
      console.error('User creation error:', authError);
      await supabaseAdmin.from('organizations').delete().eq('id', orgData.id);
      return NextResponse.json(
        { error: authError?.message || 'Failed to create admin user' },
        { status: 500 }
      );
    }

    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .insert({
        user_id: authData.user.id,
        org_id: orgData.id,
        role: 'admin',
        full_name: adminName,
      });

    if (profileError) {
      console.error('Profile creation error:', profileError);
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
      await supabaseAdmin.from('organizations').delete().eq('id', orgData.id);
      return NextResponse.json({ error: 'Failed to create admin profile' }, { status: 500 });
    }

    const loginUrl = `${request.nextUrl.origin}/auth/login`;

    let emailSent = false;
    let emailError = '';
    try {
      const { client: resend, fromEmail } = await getResendClient();
      const { html, text } = buildWelcomeEmail({
        orgName,
        adminName,
        email: adminEmail,
        temporaryPassword: tempPassword,
        loginUrl,
      });

      const { error: sendError } = await resend.emails.send({
        from: fromEmail || 'OriginTrace <onboarding@resend.dev>',
        to: adminEmail,
        subject: `Welcome to OriginTrace - Your ${orgName} account is ready`,
        html,
        text,
      });

      if (sendError) {
        console.error('Email send error:', sendError);
        emailError = sendError.message || 'Failed to send email';
      } else {
        emailSent = true;
      }
    } catch (err: any) {
      console.error('Email service error:', err);
      emailError = err.message || 'Email service unavailable';
    }

    try {
      await supabaseAdmin.from('audit_logs').insert({
        user_id: user.id,
        action: 'create_organization',
        resource_type: 'organization',
        resource_id: orgData.id.toString(),
        metadata: {
          org_name: orgName,
          admin_email: adminEmail,
          admin_name: adminName,
          email_sent: emailSent,
          created_by: user.id,
        }
      });
    } catch {
      console.log('Audit log skipped');
    }

    return NextResponse.json({
      success: true,
      organization: {
        id: orgData.id,
        name: orgData.name,
        slug: orgData.slug,
      },
      admin: {
        email: adminEmail,
        name: adminName,
      },
      emailSent,
      emailError: emailSent ? undefined : emailError,
      temporaryPassword: emailSent ? undefined : tempPassword,
    });

  } catch (error) {
    console.error('Create org error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
