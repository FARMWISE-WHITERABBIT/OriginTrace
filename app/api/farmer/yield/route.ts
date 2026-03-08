import { createAdminClient } from '@/lib/supabase/admin';
import { createClient as createServerClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

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
      .select('farm_id, org_id, farms(farmer_name, area_hectares, community)')
      .eq('user_id', user.id)
      .single();

    if (!farmerAccount) {
      return NextResponse.json({ error: 'Farmer account not found' }, { status: 404 });
    }

    const { data: batches } = await supabase
      .from('collection_batches')
      .select('commodity, total_weight_kg, collection_date')
      .eq('org_id', farmerAccount.org_id)
      .order('collection_date', { ascending: false });

    const totalWeight = (batches || []).reduce((sum, b) => sum + (b.total_weight_kg || 0), 0);
    const farmArea = (farmerAccount.farms as any)?.area_hectares || 1;
    const actualYield = totalWeight / farmArea;

    const commodities = [...new Set((batches || []).map(b => b.commodity).filter(Boolean))];
    const mainCommodity = commodities[0] || 'cocoa';

    const { data: benchmarks } = await supabase
      .from('yield_benchmarks')
      .select('*')
      .ilike('commodity', `%${mainCommodity}%`)
      .limit(5);

    return NextResponse.json({
      farmArea,
      totalWeight,
      actualYield: Math.round(actualYield * 100) / 100,
      mainCommodity,
      benchmarks: benchmarks || [],
      seasonalData: (batches || []).slice(0, 12).map(b => ({
        date: b.collection_date,
        weight: b.total_weight_kg,
        commodity: b.commodity,
      })),
    });
  } catch (error) {
    console.error('Farmer yield error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
