import { createAdminClient } from '@/lib/supabase/admin';
import { createClient as createServerClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { enforceTier } from '@/lib/api/tier-guard';
import { getResendClient } from '@/lib/email/resend-client';
import { buildYieldFlagEmail } from '@/lib/email/templates';


interface YieldValidationResult {
  isValid: boolean;
  isFlagged: boolean;
  expectedMax: number;
  actualWeight: number;
  percentageOver: number;
  reason?: string;
}

export async function POST(request: NextRequest) {
  try {
    const supabaseAdmin = createAdminClient();
    
    const supabase = await createServerClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('org_id, role')
      .eq('user_id', user.id)
      .single();

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    const body = await request.json();
    const { farm_id, batch_weight, commodity } = body;

    if (!farm_id || batch_weight === undefined) {
      return NextResponse.json({ error: 'farm_id and batch_weight required' }, { status: 400 });
    }

    const { data: farm } = await supabaseAdmin
      .from('farms')
      .select('area_hectares, commodity')
      .eq('id', farm_id)
      .eq('org_id', profile.org_id)
      .single();

    if (!farm) {
      return NextResponse.json({ error: 'Farm not found' }, { status: 404 });
    }

    const farmCommodity = commodity || farm.commodity || 'cocoa';
    const areaHectares = farm.area_hectares || 1;

    const { data: cropStandard } = await supabaseAdmin
      .from('crop_standards')
      .select('avg_yield_per_hectare')
      .eq('commodity', farmCommodity.toLowerCase())
      .eq('region', 'nigeria')
      .single();

    const avgYield = cropStandard?.avg_yield_per_hectare || 400;
    const expectedMax = areaHectares * avgYield * 1.2;
    const isFlagged = batch_weight > expectedMax;
    const percentageOver = isFlagged ? ((batch_weight - expectedMax) / expectedMax) * 100 : 0;

    const result: YieldValidationResult = {
      isValid: !isFlagged,
      isFlagged,
      expectedMax: Math.round(expectedMax * 100) / 100,
      actualWeight: batch_weight,
      percentageOver: Math.round(percentageOver * 100) / 100,
      reason: isFlagged 
        ? `Batch weight ${batch_weight}kg exceeds expected maximum ${Math.round(expectedMax)}kg (${Math.round(percentageOver)}% over threshold)`
        : undefined
    };

    if (isFlagged) {
      try {
        const { data: org } = await supabaseAdmin
          .from('organizations')
          .select('name')
          .eq('id', profile.org_id)
          .single();

        const { data: farmDetails } = await supabaseAdmin
          .from('farms')
          .select('farmer_name')
          .eq('id', farm_id)
          .single();

        const { data: recipients } = await supabaseAdmin
          .from('profiles')
          .select('full_name, user_id')
          .eq('org_id', profile.org_id)
          .in('role', ['admin', 'quality_manager']);

        if (recipients && recipients.length > 0) {
          const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://origintrace.trade';

          for (const recipient of recipients) {
            const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(recipient.user_id);
            const recipientEmail = authUser?.user?.email;
            if (!recipientEmail) continue;

            const emailContent = buildYieldFlagEmail({
              recipientName: recipient.full_name || 'Team Member',
              orgName: org?.name || 'Your Organization',
              farmerName: farmDetails?.farmer_name || 'Unknown',
              farmId: farm_id,
              batchWeight: batch_weight,
              expectedMax: Math.round(expectedMax),
              percentageOver: Math.round(percentageOver),
              commodity: farmCommodity,
              dashboardUrl: `${baseUrl}/app/yield-alerts`,
            });

            try {
              const { client, fromEmail } = await getResendClient();
              await client.emails.send({
                from: fromEmail,
                to: recipientEmail,
                subject: `Yield Alert: Batch flagged for ${farmDetails?.farmer_name || 'Unknown'} - ${org?.name || 'OriginTrace'}`,
                html: emailContent.html,
                text: emailContent.text,
              });
            } catch (emailErr) {
              console.error('Failed to send yield flag email:', emailErr);
            }

            await supabaseAdmin.from('notifications').insert({
              org_id: profile.org_id,
              user_id: recipient.user_id,
              type: 'yield_flag',
              title: 'Yield Validation Flag',
              message: `Batch weight ${batch_weight}kg from ${farmDetails?.farmer_name || 'Unknown'} exceeds expected maximum ${Math.round(expectedMax)}kg`,
              read: false,
            });
          }
        }
      } catch (notifErr) {
        console.error('Failed to send yield flag notifications:', notifErr);
      }
    }

    return NextResponse.json(result);
    
  } catch (error) {
    console.error('Yield validation API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabaseAdmin = createAdminClient();
    
    const supabase = await createServerClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('org_id, role')
      .eq('user_id', user.id)
      .single();

    if (!profile || !['admin', 'aggregator'].includes(profile.role)) {
      return NextResponse.json({ error: 'Admin or aggregator access required' }, { status: 403 });
    }

    const tierBlock = await enforceTier(profile.org_id, 'yield_alerts');
    if (tierBlock) return tierBlock;

    const { data: flaggedBatches, error } = await supabaseAdmin
      .from('collection_batches')
      .select(`
        id,
        farm_id,
        total_weight,
        status,
        yield_flag_reason,
        created_at,
        farms (id, farmer_name, area_hectares, commodity)
      `)
      .eq('org_id', profile.org_id)
      .eq('status', 'flagged_for_review')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Flagged batches query error:', error);
      return NextResponse.json({ error: 'Failed to fetch flagged batches' }, { status: 500 });
    }

    const { data: cropStandards } = await supabaseAdmin
      .from('crop_standards')
      .select('*')
      .eq('region', 'nigeria');

    return NextResponse.json({ 
      flaggedBatches: flaggedBatches || [],
      cropStandards: cropStandards || []
    });
    
  } catch (error) {
    console.error('Yield validation API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const supabaseAdmin = createAdminClient();
    
    const supabase = await createServerClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('org_id, role')
      .eq('user_id', user.id)
      .single();

    if (!profile || profile.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const body = await request.json();
    const { batch_id, action, notes } = body;

    if (!batch_id || !action) {
      return NextResponse.json({ error: 'batch_id and action required' }, { status: 400 });
    }

    const newStatus = action === 'approve' ? 'approved' : action === 'reject' ? 'rejected' : 'pending';

    const { data: batch, error } = await supabaseAdmin
      .from('collection_batches')
      .update({ 
        status: newStatus,
        yield_flag_reason: notes ? `${action}: ${notes}` : undefined
      })
      .eq('id', batch_id)
      .eq('org_id', profile.org_id)
      .select()
      .single();

    if (error) {
      console.error('Batch update error:', error);
      return NextResponse.json({ error: 'Failed to update batch' }, { status: 500 });
    }

    return NextResponse.json({ batch });
    
  } catch (error) {
    console.error('Yield validation API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
