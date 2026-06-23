import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getAuthenticatedProfile } from '@/lib/api-auth';
import { z } from 'zod';

const bankAccountSchema = z.object({
  account_number: z.string().min(10).max(20),
  account_name:   z.string().min(2),
  bank_code:      z.string().min(2),
  bank_name:      z.string().min(2),
});

/**
 * POST /api/farmers/[id]/bank-accounts
 * Add a bank account for a farmer. Replaces any existing account for the same
 * farm_id + account_number (upserts on the unique constraint).
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: farmId } = await params;
    const { user, profile } = await getAuthenticatedProfile(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!profile?.org_id) return NextResponse.json({ error: 'No organization' }, { status: 403 });
    if (!['admin', 'aggregator'].includes(profile.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const parsed = bankAccountSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Validation failed', details: parsed.error.flatten().fieldErrors }, { status: 400 });
    }

    const supabase = createAdminClient();

    // Verify farm belongs to org
    const { data: farm } = await supabase
      .from('farms')
      .select('id, farmer_name')
      .eq('id', farmId)
      .eq('org_id', profile.org_id)
      .single();

    if (!farm) return NextResponse.json({ error: 'Farm not found' }, { status: 404 });

    const { data: account, error } = await supabase
      .from('farmer_bank_accounts')
      .upsert(
        {
          org_id: profile.org_id,
          farm_id: farmId,
          farmer_name: farm.farmer_name,
          account_number: parsed.data.account_number,
          account_name:   parsed.data.account_name,
          bank_code:      parsed.data.bank_code,
          bank_name:      parsed.data.bank_name,
          created_by:     user.id,
        },
        { onConflict: 'org_id,farm_id,account_number' },
      )
      .select()
      .single();

    if (error) {
      console.error('Bank account upsert error:', error.message);
      return NextResponse.json({ error: 'Failed to save bank account' }, { status: 500 });
    }

    return NextResponse.json({ account }, { status: 201 });
  } catch (error) {
    console.error('POST bank-accounts error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * DELETE /api/farmers/[id]/bank-accounts?account_id=xxx
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: farmId } = await params;
    const { user, profile } = await getAuthenticatedProfile(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!profile?.org_id) return NextResponse.json({ error: 'No organization' }, { status: 403 });
    if (!['admin', 'aggregator'].includes(profile.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const accountId = searchParams.get('account_id');
    if (!accountId) return NextResponse.json({ error: 'account_id required' }, { status: 400 });

    const supabase = createAdminClient();
    const { error } = await supabase
      .from('farmer_bank_accounts')
      .delete()
      .eq('id', accountId)
      .eq('farm_id', farmId)
      .eq('org_id', profile.org_id);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
