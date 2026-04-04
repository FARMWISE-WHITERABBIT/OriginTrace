import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getAuthenticatedProfile } from '@/lib/api-auth';
import { computeBatchDisbursements } from '@/lib/services/disbursement-calculator';

export async function GET(request: NextRequest) {
  try {
    const { user, profile } = await getAuthenticatedProfile(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!profile?.org_id) return NextResponse.json({ error: 'No organization' }, { status: 403 });

    const supabase = createAdminClient();
    const { searchParams } = new URL(request.url);
    const batchId = searchParams.get('batch_id');
    const status = searchParams.get('status');
    const dateFrom = searchParams.get('date_from');
    const dateTo = searchParams.get('date_to');
    const page = parseInt(searchParams.get('page') ?? '1');
    const limit = Math.min(parseInt(searchParams.get('limit') ?? '50'), 100);
    const offset = (page - 1) * limit;

    let query = supabase
      .from('disbursement_calculations')
      .select(`
        *,
        farmer_bank_accounts!farm_id(id, account_name, bank_name, is_verified, paystack_recipient_code),
        collection_batches!batch_id(batch_code, commodity)
      `, { count: 'exact' })
      .eq('org_id', profile.org_id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (batchId) query = query.eq('batch_id', parseInt(batchId));
    if (status) query = query.eq('status', status);
    if (dateFrom) query = query.gte('created_at', dateFrom);
    if (dateTo) query = query.lte('created_at', dateTo);

    const { data, error, count } = await query;
    if (error) throw error;

    return NextResponse.json({
      disbursements: data ?? [],
      total: count ?? 0,
      page,
      limit,
    });
  } catch (error) {
    console.error('GET disbursements error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/** POST /api/disbursements/compute — trigger calculation for a batch on demand */
export async function POST(request: NextRequest) {
  try {
    const { user, profile } = await getAuthenticatedProfile(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!profile?.org_id) return NextResponse.json({ error: 'No organization' }, { status: 403 });
    if (!['admin', 'aggregator'].includes(profile.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const batchId = body.batch_id;
    if (!batchId || typeof batchId !== 'number') {
      return NextResponse.json({ error: 'batch_id (number) is required' }, { status: 400 });
    }

    const result = await computeBatchDisbursements(batchId, profile.org_id);

    return NextResponse.json({
      ...result,
      message: result.missingPrices.length > 0
        ? `Computed ${result.calculations.length} disbursements. ${result.missingPrices.length} farms have no price agreement and are set to NGN 0.`
        : `Computed ${result.calculations.length} disbursements successfully.`,
    });
  } catch (error) {
    console.error('POST disbursements/compute error:', error);
    const msg = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
