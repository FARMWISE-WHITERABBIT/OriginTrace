import { createAdminClient } from '@/lib/supabase/admin';
import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedProfile } from '@/lib/api-auth';
import { z } from 'zod';
import { logAuditEvent } from '@/lib/audit';
import { dispatchWebhookEvent } from '@/lib/webhooks';
import { enforceTier } from '@/lib/api/tier-guard';

const paymentCreateSchema = z.object({
  payee_name: z.string().min(1, 'Payee name is required'),
  payee_type: z.enum(['farmer', 'aggregator', 'supplier'], { required_error: 'payee_type is required' }),
  amount: z.number().positive('Amount must be a positive number'),
  currency: z.enum(['NGN', 'USD', 'EUR', 'GBP', 'XOF']).optional(),
  payment_method: z.enum(['cash', 'bank_transfer', 'mobile_money', 'cheque'], { required_error: 'payment_method is required' }),
  reference_number: z.string().optional(),
  // 'collection_batch' is the canonical value; 'batch' is accepted for backward compat
  linked_entity_type: z.enum(['collection_batch', 'batch', 'contract']).optional(),
  linked_entity_id: z.union([z.number(), z.string()]).optional(),
  payment_date: z.string().optional(),
  notes: z.string().optional(),
});

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

    const { user, profile } = await getAuthenticatedProfile(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    if (!profile.org_id) return NextResponse.json({ error: 'No organization assigned' }, { status: 403 });
    const supabaseAdmin = createAdminClient();

    const tierBlock = await enforceTier(profile.org_id, 'payments');
    if (tierBlock) return tierBlock;

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

    const parsed = paymentCreateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', fields: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { payee_name, payee_type, amount, currency, payment_method, reference_number, linked_entity_type, linked_entity_id, payment_date, notes } = parsed.data;

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json(
        { error: 'Supabase is not properly configured' },
        { status: 500 }
      );
    }

    const { user, profile } = await getAuthenticatedProfile(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    if (!profile.org_id) return NextResponse.json({ error: 'No organization assigned' }, { status: 403 });
    const supabaseAdmin = createAdminClient();

    const paymentAllowedRoles = ['admin', 'aggregator', 'logistics_coordinator', 'compliance_officer'];
    if (!paymentAllowedRoles.includes(profile.role as string)) {
      return NextResponse.json(
        { error: 'Insufficient permissions to record payments' },
        { status: 403 }
      );
    }

    const tierBlock = await enforceTier(profile.org_id, 'payments');
    if (tierBlock) return tierBlock;

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

    await logAuditEvent({
      orgId: profile.org_id,
      actorId: user.id,
      actorEmail: user.email,
      action: 'payment.recorded',
      resourceType: 'payment',
      resourceId: payment.id?.toString(),
      metadata: { payee_name, amount, currency: currency || 'NGN', payment_method },
    });

    dispatchWebhookEvent(profile.org_id, 'payment.recorded', {
      payment_id: payment.id, payee_name, amount, currency: currency || 'NGN', payment_method,
    });

    return NextResponse.json({ payment });

  } catch (error) {
    console.error('Payment create error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
