import { createAdminClient } from '@/lib/supabase/admin';
import { createClient as createServerClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

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
      .select('*, farms(*)')
      .eq('user_id', user.id)
      .single();

    if (!farmerAccount) {
      return NextResponse.json({ error: 'Farmer account not found' }, { status: 404 });
    }

    const farmId = farmerAccount.farm_id;
    const orgId = farmerAccount.org_id;

    const [batchesRes, paymentsRes, trainingRes, inputsRes, certsRes, orgRes] = await Promise.all([
      supabase
        .from('collection_batches')
        .select('id, batch_code, commodity, total_weight_kg, grade, status, collection_date, price_per_kg')
        .eq('org_id', orgId)
        .order('collection_date', { ascending: false })
        .limit(20),
      (async () => {
        const farmerName = farmerAccount.farms?.farmer_name || '';
        const { data: byName } = await supabase
          .from('payments')
          .select('id, payee_name, amount, currency, payment_method, status, payment_date, reference_number, notes')
          .eq('org_id', orgId)
          .ilike('payee_name', `%${farmerName}%`)
          .order('payment_date', { ascending: false })
          .limit(20);

        const { data: byFarm } = await supabase
          .from('payments')
          .select('id, payee_name, amount, currency, payment_method, status, payment_date, reference_number, notes')
          .eq('org_id', orgId)
          .eq('farm_id', farmId)
          .order('payment_date', { ascending: false })
          .limit(20);

        const { data: byAccount } = await supabase
          .from('payments')
          .select('id, payee_name, amount, currency, payment_method, status, payment_date, reference_number, notes')
          .eq('org_id', orgId)
          .eq('farmer_account_id', farmerAccount.id)
          .order('payment_date', { ascending: false })
          .limit(20);

        const all = [...(byName || []), ...(byFarm || []), ...(byAccount || [])];
        const unique = Array.from(new Map(all.map(p => [p.id, p])).values());
        unique.sort((a, b) => new Date(b.payment_date || 0).getTime() - new Date(a.payment_date || 0).getTime());
        return { data: unique.slice(0, 20) };
      })(),
      supabase
        .from('farmer_training')
        .select('*')
        .eq('farmer_account_id', farmerAccount.id)
        .order('created_at', { ascending: false }),
      supabase
        .from('farmer_inputs')
        .select('*')
        .eq('farm_id', farmId)
        .order('application_date', { ascending: false })
        .limit(30),
      supabase
        .from('farm_certifications')
        .select('*')
        .eq('farm_id', farmId)
        .order('expiry_date', { ascending: false }),
      supabase
        .from('organizations')
        .select('name, country')
        .eq('id', orgId)
        .single(),
    ]);

    const { data: shipmentCountries } = await supabase
      .from('shipments')
      .select('destination_country')
      .eq('org_id', orgId)
      .not('destination_country', 'is', null);

    const exportDestinations = [...new Set((shipmentCountries || []).map(s => s.destination_country).filter(Boolean))];

    return NextResponse.json({
      account: {
        id: farmerAccount.id,
        phone: farmerAccount.phone,
        farmer_code: farmerAccount.farmer_code,
        status: farmerAccount.status,
        preferred_locale: farmerAccount.preferred_locale,
        verified_at: farmerAccount.verified_at,
      },
      farm: farmerAccount.farms,
      organization: orgRes.data,
      batches: batchesRes.data || [],
      payments: paymentsRes.data || [],
      training: trainingRes.data || [],
      inputs: inputsRes.data || [],
      certifications: certsRes.data || [],
      exportDestinations,
    });
  } catch (error) {
    console.error('Farmer API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
