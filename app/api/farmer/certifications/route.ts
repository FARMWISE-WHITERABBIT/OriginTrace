import { createClient as createServerClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { NextResponse } from 'next/server';
import { getAuthenticatedProfile } from '@/lib/api-auth';

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
      .select('farm_id')
      .eq('user_id', user.id)
      .single();

    if (!farmerAccount) {
      return NextResponse.json({ error: 'Farmer account not found' }, { status: 404 });
    }

    const { data: certifications } = await supabase
      .from('farm_certifications')
      .select('*')
      .eq('farm_id', farmerAccount.farm_id)
      .order('expiry_date', { ascending: false });

    return NextResponse.json({ certifications: certifications || [] });
  } catch (error) {
    console.error('Farmer certifications error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
