import { createAdminClient } from '@/lib/supabase/admin';
import { createClient as createServerClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json(
        { error: 'Supabase is not properly configured' },
        { status: 500 }
      );
    }

    const supabase = await createServerClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    const supabaseAdmin = createAdminClient();

    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('org_id')
      .eq('user_id', user.id)
      .single();

    if (!profile) {
      return NextResponse.json(
        { error: 'Profile not found' },
        { status: 404 }
      );
    }

    if (!profile.org_id) {
      return NextResponse.json(
        { error: 'No organization assigned' },
        { status: 403 }
      );
    }

    const { data: payments, error: paymentsError } = await supabaseAdmin
      .from('payments')
      .select('amount, currency, payee_type, payment_method, payment_date, status')
      .eq('org_id', profile.org_id);

    if (paymentsError) {
      console.error('Payments summary fetch error:', paymentsError);
      return NextResponse.json(
        { error: 'Failed to fetch payment summary', details: paymentsError.message },
        { status: 500 }
      );
    }

    const allPayments = payments || [];

    const byCurrency: Record<string, number> = {};
    const byPayeeType: Record<string, { total: number; count: number }> = {};
    const byMethod: Record<string, number> = {};
    const byMonth: Record<string, number> = {};

    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    for (const p of allPayments) {
      const amt = parseFloat(p.amount) || 0;

      byCurrency[p.currency] = (byCurrency[p.currency] || 0) + amt;

      if (!byPayeeType[p.payee_type]) {
        byPayeeType[p.payee_type] = { total: 0, count: 0 };
      }
      byPayeeType[p.payee_type].total += amt;
      byPayeeType[p.payee_type].count += 1;

      byMethod[p.payment_method] = (byMethod[p.payment_method] || 0) + 1;

      if (p.payment_date) {
        const paymentDate = new Date(p.payment_date);
        if (paymentDate >= sixMonthsAgo) {
          const monthKey = `${paymentDate.getFullYear()}-${String(paymentDate.getMonth() + 1).padStart(2, '0')}`;
          byMonth[monthKey] = (byMonth[monthKey] || 0) + amt;
        }
      }
    }

    const totalAmount = allPayments.reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0);
    const totalCount = allPayments.length;
    const averageAmount = totalCount > 0 ? totalAmount / totalCount : 0;

    return NextResponse.json({
      totalAmount,
      totalCount,
      averageAmount,
      byCurrency,
      byPayeeType,
      byMethod,
      byMonth,
    });

  } catch (error) {
    console.error('Payments summary API error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
