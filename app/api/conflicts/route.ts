import { createAdminClient } from '@/lib/supabase/admin';
import { createClient as createServerClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { enforceTier } from '@/lib/api/tier-guard';
import { getResendClient } from '@/lib/email/resend-client';
import { buildFarmConflictEmail } from '@/lib/email/templates';
import { z } from 'zod';

const conflictPatchSchema = z.object({
  conflict_id: z.number({ required_error: 'Conflict ID is required' }),
  action: z.enum(['keep_a', 'keep_b', 'merge', 'dismiss'], { required_error: 'Action is required' }),
  notes: z.string().optional(),
});


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

    if (!profile || profile.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    if (!profile.org_id) {
      return NextResponse.json({ error: 'No organization assigned' }, { status: 403 });
    }

    const tierBlock = await enforceTier(profile.org_id, 'boundary_conflicts');
    if (tierBlock) return tierBlock;

    const { data: conflicts, error } = await supabaseAdmin
      .from('farm_conflicts')
      .select(`
        id,
        overlap_ratio,
        status,
        resolution_notes,
        created_at,
        resolved_at,
        farm_a:farm_a_id (
          id,
          farmer_name,
          community,
          commodity,
          area_hectares,
          boundary,
          compliance_status,
          created_at,
          gps_accuracy,
          synced_at,
          agent:profiles!farms_created_by_fkey (full_name, user_id)
        ),
        farm_b:farm_b_id (
          id,
          farmer_name,
          community,
          commodity,
          area_hectares,
          boundary,
          compliance_status,
          created_at,
          gps_accuracy,
          synced_at,
          agent:profiles!farms_created_by_fkey (full_name, user_id)
        )
      `)
      .eq('status', 'pending')
      .order('created_at', { ascending: false });

    if (error) {
      const { data: simpleConflicts, error: simpleError } = await supabaseAdmin
        .from('farm_conflicts')
        .select('*')
        .eq('status', 'pending')
        .order('created_at', { ascending: false });
      
      if (simpleError) {
        console.error('Conflicts query error:', simpleError);
        return NextResponse.json({ error: 'Failed to fetch conflicts' }, { status: 500 });
      }

      const enrichedConflicts = await Promise.all(
        (simpleConflicts || []).map(async (conflict) => {
          const { data: farmA } = await supabaseAdmin
            .from('farms')
            .select('*')
            .eq('id', conflict.farm_a_id)
            .eq('org_id', profile.org_id)
            .single();

          const { data: farmB } = await supabaseAdmin
            .from('farms')
            .select('*')
            .eq('id', conflict.farm_b_id)
            .eq('org_id', profile.org_id)
            .single();

          if (!farmA || !farmB) return null;

          return {
            ...conflict,
            farm_a: farmA,
            farm_b: farmB
          };
        })
      );

      return NextResponse.json({ 
        conflicts: enrichedConflicts.filter(Boolean) 
      });
    }

    const orgConflicts = (conflicts || []).filter(c => {
      const farmA = c.farm_a as unknown as { id: number } | null;
      const farmB = c.farm_b as unknown as { id: number } | null;
      return farmA && farmB;
    });

    return NextResponse.json({ conflicts: orgConflicts });
    
  } catch (error) {
    console.error('Conflicts API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
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

    if (!profile.org_id) {
      return NextResponse.json({ error: 'No organization assigned' }, { status: 403 });
    }

    const body = await request.json();
    const { farm_a_id, farm_b_id, overlap_ratio } = body;

    if (!farm_a_id || !farm_b_id) {
      return NextResponse.json({ error: 'farm_a_id and farm_b_id required' }, { status: 400 });
    }

    const { data: farmA } = await supabaseAdmin
      .from('farms')
      .select('id, farmer_name, community')
      .eq('id', farm_a_id)
      .eq('org_id', profile.org_id)
      .single();

    const { data: farmB } = await supabaseAdmin
      .from('farms')
      .select('id, farmer_name, community')
      .eq('id', farm_b_id)
      .eq('org_id', profile.org_id)
      .single();

    if (!farmA || !farmB) {
      return NextResponse.json({ error: 'One or both farms not found' }, { status: 404 });
    }

    const { data: conflict, error: insertError } = await supabaseAdmin
      .from('farm_conflicts')
      .insert({
        farm_a_id,
        farm_b_id,
        overlap_ratio: overlap_ratio || 0,
        status: 'pending',
      })
      .select()
      .single();

    if (insertError) {
      console.error('Failed to create conflict:', insertError);
      return NextResponse.json({ error: 'Failed to create conflict' }, { status: 500 });
    }

    await supabaseAdmin.from('farms').update({ conflict_status: 'conflict' }).eq('id', farm_a_id);
    await supabaseAdmin.from('farms').update({ conflict_status: 'conflict' }).eq('id', farm_b_id);

    try {
      const { data: org } = await supabaseAdmin
        .from('organizations')
        .select('name')
        .eq('id', profile.org_id)
        .single();

      const { data: admins } = await supabaseAdmin
        .from('profiles')
        .select('full_name, user_id')
        .eq('org_id', profile.org_id)
        .eq('role', 'admin');

      if (admins && admins.length > 0) {
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://origintrace.trade';

        for (const admin of admins) {
          const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(admin.user_id);
          const adminEmail = authUser?.user?.email;
          if (!adminEmail) continue;

          const emailContent = buildFarmConflictEmail({
            recipientName: admin.full_name || 'Admin',
            orgName: org?.name || 'Your Organization',
            farmAName: farmA.farmer_name || `Farm ${farm_a_id}`,
            farmBName: farmB.farmer_name || `Farm ${farm_b_id}`,
            overlapRatio: overlap_ratio || 0,
            dashboardUrl: `${baseUrl}/app/conflicts`,
          });

          try {
            const { client, fromEmail } = await getResendClient();
            await client.emails.send({
              from: fromEmail,
              to: adminEmail,
              subject: `Farm Boundary Conflict: ${farmA.farmer_name || 'Farm A'} vs ${farmB.farmer_name || 'Farm B'} - ${org?.name || 'OriginTrace'}`,
              html: emailContent.html,
              text: emailContent.text,
            });
          } catch (emailErr) {
            console.error('Failed to send conflict email:', emailErr);
          }

          await supabaseAdmin.from('notifications').insert({
            org_id: profile.org_id,
            user_id: admin.user_id,
            type: 'farm_conflict',
            title: 'Farm Boundary Conflict Detected',
            message: `Boundary overlap detected between ${farmA.farmer_name || 'Farm A'} and ${farmB.farmer_name || 'Farm B'} (${Math.round((overlap_ratio || 0) * 100)}% overlap)`,
            read: false,
          });
        }
      }
    } catch (notifErr) {
      console.error('Failed to send conflict notifications:', notifErr);
    }

    return NextResponse.json({ conflict });
    
  } catch (error) {
    console.error('Conflicts POST error:', error);
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

    const tierBlock = await enforceTier(profile.org_id, 'boundary_conflicts');
    if (tierBlock) return tierBlock;

    const body = await request.json();

    const parsed = conflictPatchSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', fields: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { conflict_id, action, notes } = parsed.data;

    const { data: conflict, error: fetchError } = await supabaseAdmin
      .from('farm_conflicts')
      .select('*, farm_a:farm_a_id(*), farm_b:farm_b_id(*)')
      .eq('id', conflict_id)
      .single();

    if (fetchError || !conflict) {
      return NextResponse.json({ error: 'Conflict not found' }, { status: 404 });
    }

    // Verify the conflict belongs to the admin's organization
    const farmA = conflict.farm_a as { org_id?: number } | null;
    const farmB = conflict.farm_b as { org_id?: number } | null;
    if (!farmA || !farmB || farmA.org_id !== profile.org_id || farmB.org_id !== profile.org_id) {
      return NextResponse.json({ error: 'Conflict not found' }, { status: 404 });
    }

    let resolutionStatus = 'dismissed';
    
    if (action === 'keep_a') {
      resolutionStatus = 'resolved_keep_a';
      await supabaseAdmin
        .from('farms')
        .update({ conflict_status: 'clear' })
        .eq('id', conflict.farm_a_id)
        .eq('org_id', profile.org_id);
      await supabaseAdmin
        .from('farms')
        .update({ compliance_status: 'rejected', conflict_status: 'clear' })
        .eq('id', conflict.farm_b_id)
        .eq('org_id', profile.org_id);
    } else if (action === 'keep_b') {
      resolutionStatus = 'resolved_keep_b';
      await supabaseAdmin
        .from('farms')
        .update({ compliance_status: 'rejected', conflict_status: 'clear' })
        .eq('id', conflict.farm_a_id)
        .eq('org_id', profile.org_id);
      await supabaseAdmin
        .from('farms')
        .update({ conflict_status: 'clear' })
        .eq('id', conflict.farm_b_id)
        .eq('org_id', profile.org_id);
    } else if (action === 'merge') {
      resolutionStatus = 'resolved_merged';
      await supabaseAdmin
        .from('farms')
        .update({ conflict_status: 'clear' })
        .eq('id', conflict.farm_a_id)
        .eq('org_id', profile.org_id);
      await supabaseAdmin
        .from('farms')
        .update({ conflict_status: 'clear' })
        .eq('id', conflict.farm_b_id)
        .eq('org_id', profile.org_id);
    } else {
      await supabaseAdmin
        .from('farms')
        .update({ conflict_status: 'clear' })
        .eq('id', conflict.farm_a_id)
        .eq('org_id', profile.org_id);
      await supabaseAdmin
        .from('farms')
        .update({ conflict_status: 'clear' })
        .eq('id', conflict.farm_b_id)
        .eq('org_id', profile.org_id);
    }

    const { error: updateError } = await supabaseAdmin
      .from('farm_conflicts')
      .update({
        status: resolutionStatus,
        resolved_by: user.id,
        resolved_at: new Date().toISOString(),
        resolution_notes: notes || null
      })
      .eq('id', conflict_id);

    if (updateError) {
      console.error('Failed to update conflict:', updateError);
      return NextResponse.json({ error: 'Failed to resolve conflict' }, { status: 500 });
    }

    return NextResponse.json({ success: true, status: resolutionStatus });
    
  } catch (error) {
    console.error('Conflicts PATCH error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
