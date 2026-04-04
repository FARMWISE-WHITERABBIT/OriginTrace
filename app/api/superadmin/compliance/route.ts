import { createClient as createServerClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/api-auth';
import { logSuperadminAction } from '@/lib/superadmin-audit';

async function isSystemAdmin(supabase: any, userId: string): Promise<boolean> {
  const { data } = await supabase
    .from('system_admins')
    .select('id')
    .eq('user_id', userId)
    .single();
  return !!data;
}

// ─── GET ──────────────────────────────────────────────────────────────────────

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
      case 'rulesets': {
        const { data, error } = await supabase
          .from('compliance_rulesets')
          .select('*')
          .order('market')
          .order('version', { ascending: false });
        if (error) return NextResponse.json({ error: error.message }, { status: 500 });
        return NextResponse.json({ rulesets: data ?? [] });
      }

      case 'update_log': {
        const market = searchParams.get('market');
        let q = supabase
          .from('regulatory_update_log')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(100);
        if (market) q = q.eq('market', market);
        const { data, error } = await q;
        if (error) return NextResponse.json({ error: error.message }, { status: 500 });
        return NextResponse.json({ log: data ?? [] });
      }

      case 'mrl_database': {
        const { data, error } = await supabase
          .from('mrl_database')
          .select('*')
          .order('commodity')
          .order('active_ingredient');
        if (error) return NextResponse.json({ error: error.message }, { status: 500 });
        return NextResponse.json({ mrl_entries: data ?? [] });
      }

      case 'hs_codes': {
        const { data, error } = await supabase
          .from('hs_code_library')
          .select('*')
          .order('commodity')
          .order('tariff_schedule');
        if (error) return NextResponse.json({ error: error.message }, { status: 500 });
        return NextResponse.json({ hs_codes: data ?? [] });
      }

      case 'facility_sync_log': {
        const { data, error } = await supabase
          .from('facility_list_sync_log')
          .select('*')
          .order('started_at', { ascending: false })
          .limit(50);
        if (error) return NextResponse.json({ error: error.message }, { status: 500 });
        return NextResponse.json({ sync_log: data ?? [] });
      }

      case 'broadcast_alerts': {
        const { data, error } = await supabase
          .from('regulatory_broadcast_alerts')
          .select('*')
          .order('created_at', { ascending: false });
        if (error) return NextResponse.json({ error: error.message }, { status: 500 });
        return NextResponse.json({ alerts: data ?? [] });
      }

      default:
        return NextResponse.json({ error: 'Unknown resource' }, { status: 400 });
    }
  } catch (err) {
    console.error('Compliance API error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// ─── POST ─────────────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    const supabase = createServiceClient();
    const authClient = await createServerClient();
    const { data: { user }, error: userError } = await authClient.auth.getUser();
    if (userError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!(await isSystemAdmin(supabase, user.id)))
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const body = await request.json();
    const { action } = body;

    switch (action) {
      case 'upsert_ruleset': {
        const { market, document_checklist, required_fields, submission_workflow, notes } = body;
        if (!market) return NextResponse.json({ error: 'market required' }, { status: 400 });

        // Get current max version for this market
        const { data: existing } = await supabase
          .from('compliance_rulesets')
          .select('version')
          .eq('market', market)
          .eq('status', 'active')
          .order('version', { ascending: false })
          .limit(1);

        const nextVersion = ((existing?.[0]?.version) ?? 0) + 1;

        // Archive old active rulesets for this market
        await supabase
          .from('compliance_rulesets')
          .update({ status: 'archived' })
          .eq('market', market)
          .eq('status', 'active');

        const { data, error } = await supabase
          .from('compliance_rulesets')
          .insert({
            market,
            version: nextVersion,
            status: 'active',
            document_checklist: document_checklist ?? [],
            required_fields: required_fields ?? [],
            submission_workflow: submission_workflow ?? {},
            notes,
            reviewed_by: user.id,
            reviewed_at: new Date().toISOString(),
            created_by: user.id,
          })
          .select()
          .single();

        if (error) return NextResponse.json({ error: error.message }, { status: 500 });

        // Log the change
        await supabase.from('regulatory_update_log').insert({
          market,
          change_type: 'submission_workflow',
          description: `Ruleset updated to version ${nextVersion}`,
          after_state: { document_checklist, required_fields, submission_workflow, notes },
          created_by: user.id,
        });

        await logSuperadminAction({
          superadminId: user.id,
          action: 'upsert_compliance_ruleset',
          targetType: 'compliance_ruleset',
          targetId: market,
          afterState: { version: nextVersion },
          request,
        });

        return NextResponse.json({ ruleset: data, success: true });
      }

      case 'upsert_mrl': {
        const { id, active_ingredient, commodity, market, limit_ppm, unit, regulation_ref } = body;
        if (!active_ingredient || !commodity || !market)
          return NextResponse.json({ error: 'active_ingredient, commodity, market required' }, { status: 400 });

        let result;
        if (id) {
          const { data, error } = await supabase
            .from('mrl_database')
            .update({ active_ingredient, commodity, market, limit_ppm, unit, regulation_ref, updated_at: new Date().toISOString() })
            .eq('id', id)
            .select()
            .single();
          if (error) return NextResponse.json({ error: error.message }, { status: 500 });
          result = data;
        } else {
          const { data, error } = await supabase
            .from('mrl_database')
            .insert({ active_ingredient, commodity, market, limit_ppm, unit, regulation_ref })
            .select()
            .single();
          if (error) return NextResponse.json({ error: error.message }, { status: 500 });
          result = data;
        }

        await supabase.from('regulatory_update_log').insert({
          market,
          change_type: 'mrl_entry',
          description: `MRL entry ${id ? 'updated' : 'created'}: ${active_ingredient} on ${commodity}`,
          created_by: user.id,
        });

        return NextResponse.json({ mrl_entry: result, success: true });
      }

      case 'upsert_hs_code': {
        const { id, commodity, hs_code, tariff_schedule, description, notes } = body;
        if (!commodity || !hs_code || !tariff_schedule)
          return NextResponse.json({ error: 'commodity, hs_code, tariff_schedule required' }, { status: 400 });

        let result;
        if (id) {
          const { data, error } = await supabase
            .from('hs_code_library')
            .update({ commodity, hs_code, tariff_schedule, description, notes, updated_at: new Date().toISOString() })
            .eq('id', id)
            .select()
            .single();
          if (error) return NextResponse.json({ error: error.message }, { status: 500 });
          result = data;
        } else {
          const { data, error } = await supabase
            .from('hs_code_library')
            .insert({ commodity, hs_code, tariff_schedule, description, notes, created_by: user.id })
            .select()
            .single();
          if (error) return NextResponse.json({ error: error.message }, { status: 500 });
          result = data;
        }

        return NextResponse.json({ hs_code: result, success: true });
      }

      case 'trigger_facility_sync': {
        const { list_type } = body;
        const validTypes = ['EU_TRACES', 'USDA_FSIS', 'GACC'];
        if (!list_type || !validTypes.includes(list_type))
          return NextResponse.json({ error: 'Valid list_type required' }, { status: 400 });

        const { data, error } = await supabase
          .from('facility_list_sync_log')
          .insert({
            list_type,
            status: 'pending',
            triggered_by: user.id,
          })
          .select()
          .single();

        if (error) return NextResponse.json({ error: error.message }, { status: 500 });

        await logSuperadminAction({
          superadminId: user.id,
          action: 'trigger_facility_sync',
          targetType: 'facility_list',
          targetId: list_type,
          request,
        });

        return NextResponse.json({ sync_job: data, success: true });
      }

      case 'send_broadcast_alert': {
        const { title, body: alertBody, affected_markets, target_tier } = body;
        if (!title || !alertBody || !affected_markets?.length)
          return NextResponse.json({ error: 'title, body, affected_markets required' }, { status: 400 });

        // Count recipients
        const { count: recipientCount } = await supabase
          .from('organizations')
          .select('*', { count: 'exact', head: true })
          .in('subscription_tier', target_tier ?? ['starter', 'basic', 'pro', 'enterprise']);

        const { data, error } = await supabase
          .from('regulatory_broadcast_alerts')
          .insert({
            title,
            body: alertBody,
            affected_markets,
            target_tier: target_tier ?? ['starter', 'basic', 'pro', 'enterprise'],
            status: 'sent',
            recipient_count: recipientCount ?? 0,
            sent_at: new Date().toISOString(),
            created_by: user.id,
          })
          .select()
          .single();

        if (error) return NextResponse.json({ error: error.message }, { status: 500 });

        await logSuperadminAction({
          superadminId: user.id,
          action: 'send_broadcast_alert',
          targetType: 'broadcast_alert',
          targetId: data.id,
          afterState: { title, affected_markets, recipient_count: recipientCount },
          request,
        });

        return NextResponse.json({ alert: data, success: true });
      }

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (err) {
    console.error('Compliance API error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
