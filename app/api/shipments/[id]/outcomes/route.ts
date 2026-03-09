import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient, getAuthenticatedUser, checkTierAccess } from '@/lib/api-auth';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createServiceClient();

    const user = await getAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, org_id, role')
      .eq('user_id', user.id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    if (!profile.org_id) {
      return NextResponse.json({ error: 'No organization assigned' }, { status: 403 });
    }

    const shipmentRoles = ['admin', 'logistics_coordinator', 'compliance_officer'];
    if (!shipmentRoles.includes(profile.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const hasAccess = await checkTierAccess(supabase, profile.org_id);
    if (!hasAccess) {
      return NextResponse.json({ error: 'Shipment Readiness requires Pro tier or above' }, { status: 403 });
    }

    const { data: shipment, error: shipmentError } = await supabase
      .from('shipments')
      .select('id')
      .eq('id', params.id)
      .eq('org_id', profile.org_id)
      .single();

    if (shipmentError || !shipment) {
      return NextResponse.json({ error: 'Shipment not found' }, { status: 404 });
    }

    const { data: outcomes, error } = await supabase
      .from('shipment_outcomes')
      .select('*')
      .eq('shipment_id', params.id)
      .eq('org_id', profile.org_id)
      .order('outcome_date', { ascending: false });

    if (error) {
      console.error('Error fetching shipment outcomes:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ outcomes: outcomes || [] });

  } catch (error) {
    console.error('Shipment outcomes API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createServiceClient();

    const user = await getAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, org_id, role')
      .eq('user_id', user.id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    if (!profile.org_id) {
      return NextResponse.json({ error: 'No organization assigned' }, { status: 403 });
    }

    const shipmentRoles = ['admin', 'logistics_coordinator', 'compliance_officer'];
    if (!shipmentRoles.includes(profile.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const hasAccess = await checkTierAccess(supabase, profile.org_id);
    if (!hasAccess) {
      return NextResponse.json({ error: 'Shipment Readiness requires Pro tier or above' }, { status: 403 });
    }

    const { data: shipment, error: shipmentError } = await supabase
      .from('shipments')
      .select('id')
      .eq('id', params.id)
      .eq('org_id', profile.org_id)
      .single();

    if (shipmentError || !shipment) {
      return NextResponse.json({ error: 'Shipment not found' }, { status: 404 });
    }

    const body = await request.json();
    const { outcome, outcome_date } = body;

    if (!outcome) {
      return NextResponse.json({ error: 'Outcome is required' }, { status: 400 });
    }

    const validOutcomes = ['approved', 'rejected', 'delayed', 'conditional_release'];
    if (!validOutcomes.includes(outcome)) {
      return NextResponse.json({ error: `Outcome must be one of: ${validOutcomes.join(', ')}` }, { status: 400 });
    }

    if (!outcome_date) {
      return NextResponse.json({ error: 'Outcome date is required' }, { status: 400 });
    }

    const validRejectionCategories = ['documentation', 'contamination', 'traceability', 'regulatory', 'quality', 'other'];
    if (body.rejection_category && !validRejectionCategories.includes(body.rejection_category)) {
      return NextResponse.json({ error: `Rejection category must be one of: ${validRejectionCategories.join(', ')}` }, { status: 400 });
    }

    const insertData: Record<string, any> = {
      shipment_id: params.id,
      org_id: profile.org_id,
      recorded_by: profile.id,
      outcome,
      outcome_date,
    };

    if (body.rejection_reason !== undefined) insertData.rejection_reason = body.rejection_reason;
    if (body.rejection_category !== undefined) insertData.rejection_category = body.rejection_category;
    if (body.port_of_entry !== undefined) insertData.port_of_entry = body.port_of_entry;
    if (body.customs_reference !== undefined) insertData.customs_reference = body.customs_reference;
    if (body.inspector_notes !== undefined) insertData.inspector_notes = body.inspector_notes;
    if (body.financial_impact_usd !== undefined) insertData.financial_impact_usd = body.financial_impact_usd;

    const { data: outcomeRecord, error: insertError } = await supabase
      .from('shipment_outcomes')
      .insert(insertData)
      .select()
      .single();

    if (insertError) {
      console.error('Error recording shipment outcome:', insertError);
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    if (outcome === 'approved') {
      const { error: updateError } = await supabase
        .from('shipments')
        .update({ status: 'shipped' })
        .eq('id', params.id)
        .eq('org_id', profile.org_id);

      if (updateError) {
        console.error('Error updating shipment status:', updateError);
      }
    }

    return NextResponse.json({ outcome: outcomeRecord, success: true });

  } catch (error) {
    console.error('Shipment outcomes API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
