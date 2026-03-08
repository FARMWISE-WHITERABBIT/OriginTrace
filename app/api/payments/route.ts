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

    const { searchParams } = new URL(request.url);
    const payeeType = searchParams.get('payee_type');
    const status = searchParams.get('status');
    const paymentMethod = searchParams.get('payment_method');
    const dateFrom = searchParams.get('date_from');
    const dateTo = searchParams.get('date_to');
    const search = searchParams.get('search');
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '25', 10);
    const offset = (page - 1) * limit;

    let query = supabaseAdmin
      .from('payments')
      .select('*', { count: 'exact' })
      .eq('org_id', profile.org_id)
      .order('payment_date', { ascending: false })
      .range(offset, offset + limit - 1);

    if (payeeType && payeeType !== 'all') {
      query = query.eq('payee_type', payeeType);
    }
    if (status && status !== 'all') {
      query = query.eq('status', status);
    }
    if (paymentMethod && paymentMethod !== 'all') {
      query = query.eq('payment_method', paymentMethod);
    }
    if (dateFrom) {
      query = query.gte('payment_date', dateFrom);
    }
    if (dateTo) {
      query = query.lte('payment_date', dateTo);
    }
    if (search) {
      query = query.ilike('payee_name', `%${search}%`);
    }

    const { data: payments, error: paymentsError, count } = await query;

    if (paymentsError) {
      console.error('Payments fetch error:', paymentsError);
      return NextResponse.json(
        { error: 'Failed to fetch payments', details: paymentsError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      payments: payments || [],
      total: count || 0,
      page,
      limit,
      totalPages: Math.ceil((count || 0) / limit),
    });

  } catch (error) {
    console.error('Payments API error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { payee_name, payee_type, amount, currency, payment_method, reference_number, linked_entity_type, linked_entity_id, payment_date, notes } = body;

    if (!payee_name || !payee_type || !amount || !payment_method) {
      return NextResponse.json(
        { error: 'payee_name, payee_type, amount, and payment_method are required' },
        { status: 400 }
      );
    }

    const validPayeeTypes = ['farmer', 'aggregator', 'supplier'];
    if (!validPayeeTypes.includes(payee_type)) {
      return NextResponse.json(
        { error: 'Invalid payee_type. Must be farmer, aggregator, or supplier' },
        { status: 400 }
      );
    }

    const validMethods = ['cash', 'bank_transfer', 'mobile_money', 'cheque'];
    if (!validMethods.includes(payment_method)) {
      return NextResponse.json(
        { error: 'Invalid payment_method' },
        { status: 400 }
      );
    }

    const validCurrencies = ['NGN', 'USD', 'EUR', 'GBP', 'XOF'];
    if (currency && !validCurrencies.includes(currency)) {
      return NextResponse.json(
        { error: 'Invalid currency' },
        { status: 400 }
      );
    }

    if (typeof amount !== 'number' || amount <= 0) {
      return NextResponse.json(
        { error: 'Amount must be a positive number' },
        { status: 400 }
      );
    }

    const validEntityTypes = ['collection_batch', 'contract'];
    if (linked_entity_type && !validEntityTypes.includes(linked_entity_type)) {
      return NextResponse.json(
        { error: 'Invalid linked_entity_type. Must be collection_batch or contract' },
        { status: 400 }
      );
    }

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
      .select('org_id, role')
      .eq('user_id', user.id)
      .single();

    if (!profile) {
      return NextResponse.json(
        { error: 'Profile not found' },
        { status: 404 }
      );
    }

    const { data: payment, error: insertError } = await supabaseAdmin
      .from('payments')
      .insert({
        org_id: profile.org_id,
        payee_name,
        payee_type,
        amount,
        currency: currency || 'NGN',
        payment_method,
        reference_number: reference_number || null,
        linked_entity_type: linked_entity_type || null,
        linked_entity_id: linked_entity_id || null,
        payment_date: payment_date || new Date().toISOString().split('T')[0],
        notes: notes || null,
        status: 'completed',
        recorded_by: user.id,
      })
      .select()
      .single();

    if (insertError) {
      console.error('Payment insert error:', insertError);
      return NextResponse.json(
        { error: 'Failed to create payment', details: insertError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ payment });

  } catch (error) {
    console.error('Payment create error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
