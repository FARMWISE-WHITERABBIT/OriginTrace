import { createClient as createServerClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { NextRequest, NextResponse } from 'next/server';
import { sendEmail } from '@/lib/email/resend-client';
import { buildWelcomeEmail } from '@/lib/email/templates';
import { logSuperadminAction } from '@/lib/superadmin-audit';

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
    const supabaseAdmin = createAdminClient();
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
    const { companyName, adminName, adminEmail, country, industry } = body;

    if (!companyName || !adminName || !adminEmail) {
      return NextResponse.json(
        { error: 'Company name, admin name, and admin email are required' },
        { status: 400 }
      );
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(adminEmail)) {
      return NextResponse.json({ error: 'Invalid email address' }, { status: 400 });
    }

    // Check email uniqueness
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

    // Create buyer_organizations record
    const slug = companyName.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-');
    const { data: buyerOrgData, error: buyerOrgError } = await supabaseAdmin
      .from('buyer_organizations')
      .insert({
        name: companyName,
        slug: `${slug}-${Date.now().toString(36)}`,
        country: country || null,
        industry: industry || null,
        contact_email: adminEmail,
      })
      .select()
      .single();

    if (buyerOrgError || !buyerOrgData) {
      console.error('Buyer org creation error:', buyerOrgError);
      return NextResponse.json({ error: 'Failed to create buyer organization' }, { status: 500 });
    }

    // Create the auth user
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: adminEmail,
      password: tempPassword,
      email_confirm: true,
      user_metadata: { full_name: adminName },
    });

    if (authError || !authData.user) {
      console.error('User creation error:', authError);
      await supabaseAdmin.from('buyer_organizations').delete().eq('id', buyerOrgData.id);
      return NextResponse.json(
        { error: authError?.message || 'Failed to create admin user' },
        { status: 500 }
      );
    }

    // Create buyer_profiles record
    const { error: profileError } = await supabaseAdmin
      .from('buyer_profiles')
      .insert({
        user_id: authData.user.id,
        buyer_org_id: buyerOrgData.id,
        role: 'buyer_admin',
        full_name: adminName,
      });

    if (profileError) {
      console.error('Buyer profile creation error:', profileError);
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
      await supabaseAdmin.from('buyer_organizations').delete().eq('id', buyerOrgData.id);
      return NextResponse.json({ error: 'Failed to create buyer admin profile' }, { status: 500 });
    }

    // Send welcome email
    const loginUrl = `${request.nextUrl.origin}/auth/login`;
    let emailSent = false;
    let emailError = '';

    try {
      const { html, text } = buildWelcomeEmail({
        orgName: companyName,
        adminName,
        email: adminEmail,
        temporaryPassword: tempPassword,
        loginUrl,
      });
      const result = await sendEmail({
        to: adminEmail,
        subject: `Welcome to OriginTrace - Your ${companyName} buyer account is ready`,
        html,
        text,
      });
      if (!result.success) {
        emailError = result.error || 'Failed to send email';
      } else {
        emailSent = true;
      }
    } catch (err: any) {
      console.error('Email service error:', err);
      emailError = err.message || 'Email service unavailable';
    }

    // Audit trail
    try {
      await supabaseAdmin.from('audit_logs').insert({
        user_id: user.id,
        action: 'create_buyer_organization',
        resource_type: 'buyer_organization',
        resource_id: buyerOrgData.id.toString(),
        metadata: {
          company_name: companyName,
          admin_email: adminEmail,
          admin_name: adminName,
          email_sent: emailSent,
          created_by: user.id,
        },
      });
    } catch (auditErr) {
      console.error('Audit log insert failed:', auditErr);
    }

    await logSuperadminAction({
      superadminId: user.id,
      action: 'create_buyer_organization',
      targetType: 'buyer_organization',
      targetId: buyerOrgData.id.toString(),
      targetLabel: companyName,
      afterState: { buyer_org_id: buyerOrgData.id, admin_email: adminEmail, email_sent: emailSent },
      request,
    });

    return NextResponse.json({
      success: true,
      buyerOrganization: {
        id: buyerOrgData.id,
        name: buyerOrgData.name,
        slug: buyerOrgData.slug,
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
    console.error('Create buyer org error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
