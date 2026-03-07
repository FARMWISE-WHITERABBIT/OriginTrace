import { createClient } from '@supabase/supabase-js';
import { createClient as createServerClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json({ error: 'Supabase is not properly configured' }, { status: 500 });
    }

    const supabase = await createServerClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    const { data: buyerProfile } = await supabaseAdmin
      .from('buyer_profiles')
      .select('id, buyer_org_id, full_name, role')
      .eq('user_id', user.id)
      .single();

    if (!buyerProfile) {
      return NextResponse.json({ error: 'No buyer profile found' }, { status: 404 });
    }

    const [orgRes, linksRes, contractsRes, shipmentsRes] = await Promise.all([
      supabaseAdmin
        .from('buyer_organizations')
        .select('*')
        .eq('id', buyerProfile.buyer_org_id)
        .single(),
      supabaseAdmin
        .from('supply_chain_links')
        .select('id, status, exporter_org_id, invited_at, accepted_at')
        .eq('buyer_org_id', buyerProfile.buyer_org_id),
      supabaseAdmin
        .from('contracts')
        .select('id, status, commodity, quantity_mt, delivery_deadline, contract_reference, created_at')
        .eq('buyer_org_id', buyerProfile.buyer_org_id)
        .order('created_at', { ascending: false }),
      supabaseAdmin
        .from('contract_shipments')
        .select('id, contract_id, shipment_id')
        .in('contract_id', (await supabaseAdmin
          .from('contracts')
          .select('id')
          .eq('buyer_org_id', buyerProfile.buyer_org_id)
        ).data?.map(c => c.id) || []),
    ]);

    const links = linksRes.data || [];
    const contracts = contractsRes.data || [];

    const summary = {
      activeSuppliers: links.filter(l => l.status === 'active').length,
      pendingInvitations: links.filter(l => l.status === 'pending').length,
      activeContracts: contracts.filter(c => c.status === 'active').length,
      draftContracts: contracts.filter(c => c.status === 'draft').length,
      fulfilledContracts: contracts.filter(c => c.status === 'fulfilled').length,
      pendingShipments: shipmentsRes.data?.length || 0,
      totalLinks: links.length,
      totalContracts: contracts.length,
    };

    const recentContracts = contracts.slice(0, 10);

    return NextResponse.json({
      buyerProfile,
      organization: orgRes.data,
      summary,
      recentContracts,
    });
  } catch (error) {
    console.error('Buyer dashboard API error:', error);
    return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 });
  }
}
