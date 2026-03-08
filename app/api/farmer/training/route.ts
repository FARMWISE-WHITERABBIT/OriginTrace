'use server';

import { createAdminClient } from '@/lib/supabase/admin';
import { createClient as createServerClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { logAuditEvent } from '@/lib/audit';

export async function GET() {
  try {
    const authClient = await createServerClient();
    const { data: { user }, error: userError } = await authClient.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createAdminClient();
    const { data: farmerAccount } = await supabase
      .from('farmer_accounts')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (!farmerAccount) {
      return NextResponse.json({ error: 'Farmer account not found' }, { status: 404 });
    }

    const { data: modules } = await supabase
      .from('farmer_training')
      .select('*')
      .eq('farmer_account_id', farmerAccount.id)
      .order('created_at', { ascending: false });

    return NextResponse.json({ modules: modules || [] });
  } catch (error) {
    console.error('Farmer training GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const authClient = await createServerClient();
    const { data: { user }, error: userError } = await authClient.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createAdminClient();
    const { data: farmerAccount } = await supabase
      .from('farmer_accounts')
      .select('id, org_id')
      .eq('user_id', user.id)
      .single();

    if (!farmerAccount) {
      return NextResponse.json({ error: 'Farmer account not found' }, { status: 404 });
    }

    const body = await request.json();
    const { moduleId, status, score } = body;

    if (!moduleId) {
      return NextResponse.json({ error: 'moduleId required' }, { status: 400 });
    }

    const updateData: Record<string, any> = {};
    if (status) updateData.status = status;
    if (score !== undefined) updateData.score = score;
    if (status === 'completed') updateData.completed_at = new Date().toISOString();

    const { data: module, error: updateError } = await supabase
      .from('farmer_training')
      .update(updateData)
      .eq('id', moduleId)
      .eq('farmer_account_id', farmerAccount.id)
      .select()
      .single();

    if (updateError) {
      return NextResponse.json({ error: 'Failed to update' }, { status: 500 });
    }

    await logAuditEvent({
      orgId: farmerAccount.org_id,
      actorId: user.id,
      actorEmail: user.email,
      action: 'farmer_training.updated',
      resourceType: 'farmer_training',
      resourceId: moduleId,
      metadata: { status, score },
    });

    return NextResponse.json({ module });
  } catch (error) {
    console.error('Farmer training PATCH error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
