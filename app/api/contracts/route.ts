import { createClient as createServerClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedProfile } from '@/lib/api-auth';
import { logAuditEvent } from '@/lib/audit';
import { enforceTier } from '@/lib/api/tier-guard';
import { parsePagination } from '@/lib/api/validation';
import { z } from 'zod';

const contractCreateSchema = z.object({
  exporter_org_id: z.number({ required_error: 'Exporter is required' }),
  commodity: z.string().min(1, 'Commodity is required'),
  quantity_mt: z.number().positive().optional(),
  delivery_deadline: z.string().optional(),
  destination_port: z.string().optional(),
  quality_requirements: z.record(z.any()).optional(),
  notes: z.string().optional(),
});

const contractPatchSchema = z.object({
  contract_id: z.number({ required_error: 'contract_id is required' }),
  status: z.enum(['draft', 'active', 'fulfilled', 'cancelled']).optional(),
  shipment_id: z.number().optional(),
});

function getAdminClient() {
  return createAdminClient();
}

async function getAuthUser() {
  const supabase = await createServerClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return null;
  return user;
}

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

    const supabaseAdmin = await getAdminClient();
    if (!supabaseAdmin) return NextResponse.json({ error: 'Server config error' }, { status: 500 });

    const { data: buyerProfile } = await supabaseAdmin
      .from('buyer_profiles')
      .select('buyer_org_id'), { count: 'exact' }
      .eq('user_id', user.id)
      .single();

    const { data: exporterProfile } = await supabaseAdmin
      .from('profiles')
      .select('org_id, role')
      .eq('user_id', user.id)
      .single();

    if (exporterProfile) {
      const tierBlock = await enforceTier(exporterProfile.org_id, 'contracts');
      if (tierBlock) return tierBlock;
    }

    let contracts = [];

    if (buyerProfile) {
      const { data } = await supabaseAdmin
        .from('contracts')
        .select('*, exporter_org:organizations!contracts_exporter_org_id_fkey(id, name, slug)')
        .eq('buyer_org_id', buyerProfile.buyer_org_id)
        .order('created_at', { ascending: false })
      .range(from, to);
      contracts = data || [];
    } else if (exporterProfile) {
      const { data } = await supabaseAdmin
        .from('contracts')
        .select('*, buyer_org:buyer_organizations!contracts_buyer_org_id_fkey(id, name, slug)')
        .eq('exporter_org_id', exporterProfile.org_id)
        .order('created_at', { ascending: false });
      contracts = data || [];
    }

    return NextResponse.json({ contracts, pagination: { page, limit, total: count ?? 0 } });
  } catch (error) {
    console.error('Contracts GET error:', error);
    return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

    const supabaseAdmin = await getAdminClient();
    if (!supabaseAdmin) return NextResponse.json({ error: 'Server config error' }, { status: 500 });

    const { data: buyerProfile } = await supabaseAdmin
      .from('buyer_profiles')
      .select('buyer_org_id, role')
      .eq('user_id', user.id)
      .single();

    if (!buyerProfile || buyerProfile.role !== 'buyer_admin') {
      return NextResponse.json({ error: 'Only buyer admins can create contracts' }, { status: 403 });
    }

    const body = await request.json();

    const parsed = contractCreateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', fields: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { exporter_org_id, commodity, quantity_mt, delivery_deadline, destination_port, quality_requirements, notes } = parsed.data;

    const { data: link } = await supabaseAdmin
      .from('supply_chain_links')
      .select('id, status')
      .eq('buyer_org_id', buyerProfile.buyer_org_id)
      .eq('exporter_org_id', exporter_org_id)
      .eq('status', 'active')
      .single();

    if (!link) {
      return NextResponse.json({ error: 'No active supply chain link with this exporter' }, { status: 400 });
    }

    const contractRef = `CTR-${Date.now().toString(36).toUpperCase()}`;

    const { data: contract, error: insertError } = await supabaseAdmin
      .from('contracts')
      .insert({
        buyer_org_id: buyerProfile.buyer_org_id,
        exporter_org_id,
        contract_reference: contractRef,
        commodity,
        quantity_mt: quantity_mt || null,
        delivery_deadline: delivery_deadline || null,
        destination_port: destination_port || null,
        quality_requirements: quality_requirements || {},
        notes: notes || null,
        status: 'draft',
        created_by: user.id,
      })
      .select()
      .single();

    if (insertError) {
      console.error('Contract insert error:', insertError);
      return NextResponse.json({ error: 'Failed to create contract' }, { status: 500 });
    }

    await logAuditEvent({
      orgId: buyerProfile.buyer_org_id,
      actorId: user.id,
      actorEmail: user.email,
      action: 'contract.created',
      resourceType: 'contract',
      resourceId: contract.id?.toString(),
      metadata: { commodity, exporter_org_id },
    });

    return NextResponse.json({ contract });
  } catch (error) {
    console.error('Contracts POST error:', error);
    return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

    const supabaseAdmin = await getAdminClient();
    if (!supabaseAdmin) return NextResponse.json({ error: 'Server config error' }, { status: 500 });

    const body = await request.json();

    const parsed = contractPatchSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', fields: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { contract_id, status, shipment_id } = parsed.data;

    const { data: contract } = await supabaseAdmin
      .from('contracts')
      .select('id, buyer_org_id, exporter_org_id')
      .eq('id', contract_id)
      .single();

    if (!contract) {
      return NextResponse.json({ error: 'Contract not found' }, { status: 404 });
    }

    const { data: buyerProfile } = await supabaseAdmin
      .from('buyer_profiles')
      .select('buyer_org_id')
      .eq('user_id', user.id)
      .single();

    const { data: exporterProfile } = await supabaseAdmin
      .from('profiles')
      .select('org_id, role')
      .eq('user_id', user.id)
      .single();

    const isBuyer = buyerProfile && contract.buyer_org_id === buyerProfile.buyer_org_id;
    const isExporter = exporterProfile && contract.exporter_org_id === exporterProfile.org_id && exporterProfile.role === 'admin';

    if (!isBuyer && !isExporter) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
    }

    if (shipment_id && isExporter) {
      const { error: linkError } = await supabaseAdmin
        .from('contract_shipments')
        .insert({ contract_id, shipment_id })
        .select()
        .single();

      if (linkError) {
        console.error('Contract shipment link error:', linkError);
        return NextResponse.json({ error: 'Failed to link shipment' }, { status: 500 });
      }

      return NextResponse.json({ success: true });
    }

    if (status) {
      if (!['draft', 'active', 'fulfilled', 'cancelled'].includes(status)) {
        return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
      }

      const { data: updated, error: updateError } = await supabaseAdmin
        .from('contracts')
        .update({ status })
        .eq('id', contract_id)
        .select()
        .single();

      if (updateError) {
        console.error('Contract update error:', updateError);
        return NextResponse.json({ error: 'Failed to update contract' }, { status: 500 });
      }

      return NextResponse.json({ contract: updated });
    }

    return NextResponse.json({ error: 'No update action specified' }, { status: 400 });
  } catch (error) {
    console.error('Contracts PATCH error:', error);
    return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 });
  }
}
