import { createClient as createServerClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/api-auth';
import { getSystemAdmin, roleHasPermission } from '@/lib/superadmin-rbac';

// GET /api/superadmin/compliance-rulesets?market_id=eudr
// GET /api/superadmin/compliance-rulesets  (returns all)
export async function GET(request: NextRequest) {
  try {
    const authClient = await createServerClient();
    const { data: { user }, error: userError } = await authClient.auth.getUser();
    if (userError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const adminRecord = await getSystemAdmin(user.id);
    if (!adminRecord) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const supabase = createServiceClient();
    const { searchParams } = new URL(request.url);
    const marketId = searchParams.get('market_id');

    let query = supabase.from('compliance_rulesets').select('*').order('created_at', { ascending: true });
    if (marketId) query = query.eq('market_id', marketId);

    const { data, error } = await query;
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ rulesets: data ?? [] });
  } catch (err: any) {
    return NextResponse.json({ error: err.message ?? 'Internal error' }, { status: 500 });
  }
}

// PUT /api/superadmin/compliance-rulesets
// Body: { market_id, market_name, short_code, description, docs }
export async function PUT(request: NextRequest) {
  try {
    const authClient = await createServerClient();
    const { data: { user }, error: userError } = await authClient.auth.getUser();
    if (userError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const adminRecord = await getSystemAdmin(user.id);
    if (!adminRecord) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    if (!roleHasPermission(adminRecord.role, 'compliance.write')) {
      return NextResponse.json({ error: 'Insufficient permissions — compliance_manager or platform_admin required' }, { status: 403 });
    }

    const body = await request.json();
    const { market_id, market_name, short_code, description, docs } = body;

    if (!market_id || !market_name || !short_code || !Array.isArray(docs)) {
      return NextResponse.json({ error: 'market_id, market_name, short_code and docs are required' }, { status: 400 });
    }

    const supabase = createServiceClient();
    const { data, error } = await supabase
      .from('compliance_rulesets')
      .upsert(
        {
          market_id,
          market_name,
          short_code,
          description: description ?? null,
          docs,
          updated_by: user.id,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'market_id' }
      )
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ ruleset: data });
  } catch (err: any) {
    return NextResponse.json({ error: err.message ?? 'Internal error' }, { status: 500 });
  }
}
