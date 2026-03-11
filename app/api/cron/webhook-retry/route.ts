/**
 * GET /api/cron/webhook-retry
 *
 * Runs every 5 minutes (see vercel.json).
 * Picks up pending webhook_deliveries rows and retries them with exponential
 * back-off. Marks deliveries as 'failed' once MAX_ATTEMPTS is exceeded.
 *
 * Auth: Bearer CRON_SECRET  (Vercel Cron supplies this automatically)
 */
import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { attemptDelivery, MAX_ATTEMPTS } from '@/lib/webhooks';

const BATCH_SIZE = 50; // max deliveries to process per invocation

export async function GET(request: NextRequest) {
  // Auth guard — Vercel Cron sends Authorization: Bearer <CRON_SECRET>
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    console.error('[cron/webhook-retry] CRON_SECRET is not configured');
    return NextResponse.json({ error: 'Server misconfiguration' }, { status: 500 });
  }

  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createAdminClient();
  const now = new Date().toISOString();

  // Fetch pending deliveries whose back-off window has elapsed
  const { data: pending, error: fetchError } = await supabase
    .from('webhook_deliveries')
    .select('id, webhook_id, event_type, payload, attempts')
    .eq('status', 'pending')
    .lt('next_retry_at', now)
    .lt('attempts', MAX_ATTEMPTS)
    .order('next_retry_at', { ascending: true })
    .limit(BATCH_SIZE);

  if (fetchError) {
    console.error('[cron/webhook-retry] Failed to fetch pending deliveries:', fetchError);
    return NextResponse.json({ error: 'DB error' }, { status: 500 });
  }

  if (!pending || pending.length === 0) {
    return NextResponse.json({ processed: 0, message: 'No pending deliveries' });
  }

  // Load the corresponding endpoint details for each delivery
  const webhookIds = [...new Set(pending.map((d) => d.webhook_id))];
  const { data: endpoints } = await supabase
    .from('webhook_endpoints')
    .select('id, url, secret')
    .in('id', webhookIds)
    .eq('status', 'active');

  const endpointMap = Object.fromEntries(
    (endpoints || []).map((ep) => [ep.id, ep])
  );

  let succeeded = 0;
  let failed = 0;
  let skipped = 0;

  await Promise.allSettled(
    pending.map(async (delivery) => {
      const endpoint = endpointMap[delivery.webhook_id];

      if (!endpoint) {
        // Endpoint was deleted or deactivated — mark failed immediately
        await supabase
          .from('webhook_deliveries')
          .update({ status: 'failed', last_attempted_at: now })
          .eq('id', delivery.id);
        skipped++;
        return;
      }

      try {
        await attemptDelivery(
          supabase,
          endpoint,
          delivery.event_type,
          delivery.payload as Record<string, any>,
          delivery.attempts + 1,
          delivery.id  // update the existing row in place
        );
        succeeded++;
      } catch (err) {
        failed++;
        console.error(`[cron/webhook-retry] Delivery ${delivery.id} error:`, err);
      }
    })
  );

  console.log(`[cron/webhook-retry] processed=${pending.length} succeeded=${succeeded} failed=${failed} skipped=${skipped}`);

  return NextResponse.json({
    processed: pending.length,
    succeeded,
    failed,
    skipped,
  });
}
