/**
 * DELETE /api/account — GDPR Article 17: Right to erasure
 * Deletes the authenticated user's profile and Supabase auth account.
 * Org admins cannot self-delete — they must transfer ownership first.
 */
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient as createServerClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const deleteSchema = z.object({
  confirmation: z.literal('DELETE MY ACCOUNT'),
  reason: z.string().max(500).optional(),
});

export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createServerClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const parsed = deleteSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({
        error: 'Please confirm by sending { "confirmation": "DELETE MY ACCOUNT" }',
      }, { status: 400 });
    }

    const supabaseAdmin = createAdminClient();

    // Check if user is the sole admin of an org
    const { data: profile } = await supabaseAdmin
      .from('profiles').select('role, org_id, full_name, email').eq('user_id', user.id).single();

    if (profile?.role === 'admin' && profile?.org_id) {
      const { count } = await supabaseAdmin
        .from('profiles').select('*', { count: 'exact', head: true })
        .eq('org_id', profile.org_id).eq('role', 'admin');
      if ((count || 0) <= 1) {
        return NextResponse.json({
          error: 'You are the only admin of your organisation. Transfer ownership or contact support before deleting your account.',
        }, { status: 409 });
      }
    }

    // Log the deletion request before wiping
    await supabaseAdmin.from('audit_logs').insert({
      user_id: user.id,
      action: 'account.delete_requested',
      resource_type: 'user',
      resource_id: user.id,
      metadata: { reason: parsed.data.reason, email: profile?.email },
    }).catch(() => {});

    // Delete profile (cascade will handle related records per FK rules)
    await supabaseAdmin.from('profiles').delete().eq('user_id', user.id);

    // Delete Supabase auth user
    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(user.id);
    if (deleteError) {
      console.error('[account/delete] Auth deletion failed:', deleteError);
      return NextResponse.json({ error: 'Failed to delete account. Contact support.' }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: 'Your account has been deleted.' });
  } catch (err: any) {
    console.error('[account/delete]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
