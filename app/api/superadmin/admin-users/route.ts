import { createClient as createServerClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/api-auth';
import { NextRequest, NextResponse } from 'next/server';
import { getSystemAdmin, roleHasPermission, SuperadminRole } from '@/lib/superadmin-rbac';

const VALID_ROLES: SuperadminRole[] = [
  'platform_admin',
  'compliance_manager',
  'support_agent',
  'finance_manager',
  'infra_admin',
];

// ── Auth helper ───────────────────────────────────────────────────────────────

async function auth() {
  const authClient = await createServerClient();
  const { data: { user }, error } = await authClient.auth.getUser();
  if (error || !user) return { user: null, admin: null };
  const admin = await getSystemAdmin(user.id);
  return { user, admin };
}

// ── GET /api/superadmin/admin-users ──────────────────────────────────────────
// Returns all system_admins with email and display name from auth.users

export async function GET() {
  const { user, admin } = await auth();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  if (!roleHasPermission(admin.role, 'admins.manage')) {
    return NextResponse.json({ error: 'Forbidden: platform_admin only' }, { status: 403 });
  }

  try {
    const supabase = createServiceClient();

    // Fetch system_admins rows
    const { data: rows, error: rowsErr } = await supabase
      .from('system_admins')
      .select('id, user_id, role, mfa_enrolled, is_active, created_at, last_login_at, last_login_ip, created_by')
      .order('created_at', { ascending: false });

    if (rowsErr) return NextResponse.json({ error: rowsErr.message }, { status: 500 });

    // Fetch auth user info (email) for each via admin API
    // We use the service role which has admin.listUsers access on the Auth client.
    // Supabase JS v2 admin.listUsers() returns all users; we filter by our known IDs.
    const { createAdminClient } = await import('@/lib/supabase/admin');
    const adminClient = createAdminClient();

    const userIds = (rows ?? []).map(r => r.user_id);
    const emailMap: Record<string, string> = {};

    // Fetch each user individually (list could be small for admin users)
    await Promise.all(
      userIds.map(async (uid) => {
        try {
          const { data } = await adminClient.auth.admin.getUserById(uid);
          if (data.user?.email) emailMap[uid] = data.user.email;
        } catch {}
      })
    );

    const enriched = (rows ?? []).map(r => ({
      ...r,
      email: emailMap[r.user_id] ?? null,
    }));

    return NextResponse.json({ admins: enriched });
  } catch (err: any) {
    return NextResponse.json({ error: err.message ?? 'Internal error' }, { status: 500 });
  }
}

// ── POST /api/superadmin/admin-users ─────────────────────────────────────────
// Invite a new system admin by email.
// Creates an auth.users invite + system_admins row in one call.

export async function POST(request: NextRequest) {
  const { user, admin } = await auth();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  if (!roleHasPermission(admin.role, 'admins.manage')) {
    return NextResponse.json({ error: 'Forbidden: platform_admin only' }, { status: 403 });
  }

  const body = await request.json().catch(() => ({}));
  const { email, role } = body as { email?: string; role?: string };

  if (!email || !email.includes('@')) {
    return NextResponse.json({ error: 'Valid email is required' }, { status: 400 });
  }
  if (!role || !VALID_ROLES.includes(role as SuperadminRole)) {
    return NextResponse.json({ error: `role must be one of: ${VALID_ROLES.join(', ')}` }, { status: 400 });
  }

  try {
    const { createAdminClient } = await import('@/lib/supabase/admin');
    const adminClient = createAdminClient();

    // Invite the user — creates an auth.users row + sends magic-link email
    const { data: inviteData, error: inviteErr } = await adminClient.auth.admin.inviteUserByEmail(email, {
      redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL ?? ''}/superadmin/login`,
    });

    if (inviteErr) {
      // If user already exists in auth, look them up and use existing ID
      if (!inviteErr.message?.toLowerCase().includes('already')) {
        return NextResponse.json({ error: inviteErr.message }, { status: 400 });
      }
      // Find existing auth user
      const { data: listData } = await adminClient.auth.admin.listUsers({ page: 1, perPage: 1000 });
      const existing = listData?.users?.find(u => u.email?.toLowerCase() === email.toLowerCase());
      if (!existing) {
        return NextResponse.json({ error: 'User already exists but could not be located' }, { status: 409 });
      }
      inviteData.user = existing as any;
    }

    const newUserId = inviteData?.user?.id;
    if (!newUserId) {
      return NextResponse.json({ error: 'Failed to create auth user' }, { status: 500 });
    }

    const supabase = createServiceClient();

    // Check if a system_admins row already exists for this user
    const { data: existingRow } = await supabase
      .from('system_admins')
      .select('id')
      .eq('user_id', newUserId)
      .maybeSingle();

    if (existingRow) {
      return NextResponse.json({ error: 'This user is already a system admin' }, { status: 409 });
    }

    const { data: newAdmin, error: insertErr } = await supabase
      .from('system_admins')
      .insert({
        user_id: newUserId,
        role: role as SuperadminRole,
        created_by: user.id,
        is_active: true,
        mfa_enrolled: false,
      })
      .select()
      .single();

    if (insertErr) return NextResponse.json({ error: insertErr.message }, { status: 500 });

    return NextResponse.json({ admin: { ...newAdmin, email }, invite_sent: true }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message ?? 'Internal error' }, { status: 500 });
  }
}

// ── PATCH /api/superadmin/admin-users ────────────────────────────────────────
// Update role or is_active for a system admin.
// Body: { admin_id: string, role?: SuperadminRole, is_active?: boolean }

export async function PATCH(request: NextRequest) {
  const { user, admin } = await auth();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  if (!roleHasPermission(admin.role, 'admins.manage')) {
    return NextResponse.json({ error: 'Forbidden: platform_admin only' }, { status: 403 });
  }

  const body = await request.json().catch(() => ({}));
  const { admin_id, role, is_active } = body as {
    admin_id?: string;
    role?: string;
    is_active?: boolean;
  };

  if (!admin_id) return NextResponse.json({ error: 'admin_id is required' }, { status: 400 });

  // Prevent self-deactivation
  if (is_active === false) {
    const supabase = createServiceClient();
    const { data: target } = await supabase.from('system_admins').select('user_id').eq('id', admin_id).single();
    if (target?.user_id === user.id) {
      return NextResponse.json({ error: 'You cannot deactivate your own account' }, { status: 400 });
    }
  }

  if (role && !VALID_ROLES.includes(role as SuperadminRole)) {
    return NextResponse.json({ error: `role must be one of: ${VALID_ROLES.join(', ')}` }, { status: 400 });
  }

  const updates: Record<string, unknown> = {};
  if (role !== undefined) updates.role = role;
  if (is_active !== undefined) updates.is_active = is_active;

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'Nothing to update' }, { status: 400 });
  }

  try {
    const supabase = createServiceClient();
    const { data, error } = await supabase
      .from('system_admins')
      .update(updates)
      .eq('id', admin_id)
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ admin: data });
  } catch (err: any) {
    return NextResponse.json({ error: err.message ?? 'Internal error' }, { status: 500 });
  }
}
