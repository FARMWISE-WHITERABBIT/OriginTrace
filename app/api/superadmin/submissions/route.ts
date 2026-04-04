import { createClient as createServerClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/api-auth';

async function isSystemAdmin(supabase: any, userId: string): Promise<boolean> {
  const { data } = await supabase
    .from('system_admins')
    .select('id')
    .eq('user_id', userId)
    .single();
  return !!data;
}

export async function GET(request: NextRequest) {
  try {
    const supabase = createServiceClient();
    const authClient = await createServerClient();
    const { data: { user }, error: userError } = await authClient.auth.getUser();
    if (userError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!(await isSystemAdmin(supabase, user.id)))
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const { searchParams } = new URL(request.url);
    const resource = searchParams.get('resource');

    switch (resource) {
      case 'health_summary': {
        const today = new Date().toISOString().split('T')[0];
        const frameworks = ['EU_TRACES', 'FDA_PRIOR_NOTICE', 'IPAFFS'] as const;

        const summaries = await Promise.all(
          frameworks.map(async (framework) => {
            const [
              { count: todayTotal },
              { count: todaySuccess },
              { count: todayFailed },
              { count: allPending },
            ] = await Promise.all([
              supabase
                .from('submission_health_log')
                .select('*', { count: 'exact', head: true })
                .eq('framework', framework)
                .gte('submitted_at', today),
              supabase
                .from('submission_health_log')
                .select('*', { count: 'exact', head: true })
                .eq('framework', framework)
                .eq('status', 'confirmed')
                .gte('submitted_at', today),
              supabase
                .from('submission_health_log')
                .select('*', { count: 'exact', head: true })
                .eq('framework', framework)
                .eq('status', 'failed')
                .gte('submitted_at', today),
              supabase
                .from('submission_health_log')
                .select('*', { count: 'exact', head: true })
                .eq('framework', framework)
                .eq('status', 'pending'),
            ]);

            return {
              framework,
              today_total: todayTotal ?? 0,
              today_success: todaySuccess ?? 0,
              today_failed: todayFailed ?? 0,
              pending: allPending ?? 0,
              success_rate:
                (todayTotal ?? 0) > 0
                  ? Math.round(((todaySuccess ?? 0) / (todayTotal ?? 1)) * 100)
                  : null,
            };
          })
        );

        return NextResponse.json({ health_summary: summaries });
      }

      case 'credential_status': {
        const { data, error } = await supabase
          .from('api_credential_status')
          .select('*, organizations(name, subscription_tier)')
          .order('integration')
          .order('org_id');
        if (error) return NextResponse.json({ error: error.message }, { status: 500 });
        return NextResponse.json({ credentials: data ?? [] });
      }

      case 'recent_errors': {
        const { data, error } = await supabase
          .from('submission_health_log')
          .select('*, organizations(name)')
          .eq('status', 'failed')
          .order('submitted_at', { ascending: false })
          .limit(50);
        if (error) return NextResponse.json({ error: error.message }, { status: 500 });
        return NextResponse.json({ errors: data ?? [] });
      }

      case 'submission_log': {
        const framework = searchParams.get('framework');
        const limit = parseInt(searchParams.get('limit') ?? '100');
        let q = supabase
          .from('submission_health_log')
          .select('*, organizations(name)')
          .order('submitted_at', { ascending: false })
          .limit(limit);
        if (framework) q = q.eq('framework', framework);
        const { data, error } = await q;
        if (error) return NextResponse.json({ error: error.message }, { status: 500 });
        return NextResponse.json({ submissions: data ?? [] });
      }

      default:
        return NextResponse.json({ error: 'Unknown resource' }, { status: 400 });
    }
  } catch (err) {
    console.error('Submissions API error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
