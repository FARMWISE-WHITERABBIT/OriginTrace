'use server';

import { createAdminClient } from '@/lib/supabase/admin';
import { createClient as createServerClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { predictYield } from '@/lib/services/yield-prediction';

export async function GET() {
  try {
    const authClient = await createServerClient();
    const { data: { user }, error: userError } = await authClient.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createAdminClient();
    const { data: farmerAccount } = await supabase
      .from('farmer_accounts')
      .select('farm_id, org_id, farms(farmer_name, area_hectares, commodity, community)')
      .eq('user_id', user.id)
      .single();

    if (!farmerAccount || !farmerAccount.farm_id) {
      return NextResponse.json({ error: 'Farmer account not found' }, { status: 404 });
    }

    const farm = farmerAccount.farms as any;
    const commodity = farm?.commodity || 'cocoa';

    const prediction = await predictYield(
      farmerAccount.farm_id,
      commodity,
      farmerAccount.org_id
    );

    return NextResponse.json({
      farmId: farmerAccount.farm_id,
      commodity,
      areaHa: farm?.area_hectares || 0,
      ...prediction,
    });
  } catch (error) {
    console.error('Farmer predictions error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
