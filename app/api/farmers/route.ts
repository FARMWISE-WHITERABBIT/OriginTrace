import { createClient } from '@supabase/supabase-js';
import { createClient as createServerClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function GET(request: NextRequest) {
  try {
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });
    
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

    if (!['admin', 'aggregator'].includes(profile.role)) {
      return NextResponse.json({ error: 'Admin or aggregator access required' }, { status: 403 });
    }

    const { data: rpcFarmers, error: rpcError } = await supabaseAdmin.rpc('get_org_farmers', {
      p_org_id: profile.org_id
    });

    if (!rpcError && rpcFarmers) {
      return NextResponse.json({ farmers: rpcFarmers || [] });
    }

    const { data: farmers, error } = await supabaseAdmin
      .from('farmer_performance_ledger')
      .select('*')
      .eq('org_id', profile.org_id)
      .order('total_delivery_kg', { ascending: false });

    if (error) {
      console.error('Farmers query error:', error);
      return NextResponse.json({ farmers: [] });
    }

    return NextResponse.json({ farmers: farmers || [] });
    
  } catch (error) {
    console.error('Farmers API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
