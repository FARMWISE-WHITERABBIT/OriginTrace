import { createAdminClient } from '@/lib/supabase/admin';
import { createClient as createServerClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { predictYieldForOrg } from '@/lib/services/yield-prediction';

export async function GET() {
  try {
    const authClient = await createServerClient();
    const { data: { user }, error: userError } = await authClient.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createAdminClient();
    const { data: profile } = await supabase
      .from('profiles')
      .select('org_id, role')
      .eq('user_id', user.id)
      .single();

    if (!profile || !['admin', 'aggregator'].includes(profile.role)) {
      return NextResponse.json({ error: 'Admin or aggregator access required' }, { status: 403 });
    }

    if (!profile.org_id) {
      return NextResponse.json({ error: 'No organization assigned' }, { status: 403 });
    }

    const result = await predictYieldForOrg(profile.org_id);

    return NextResponse.json(result);
  } catch (error) {
    console.error('Yield predictions error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
