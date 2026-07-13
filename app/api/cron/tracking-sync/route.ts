/**
 * GET /api/cron/tracking-sync
 *
 * Sweep for the shipping-event trigger engine:
 *   - re-processes events deferred inside the settlement-delay window
 *   - retries events whose webhook-time processing crashed
 *   - (future) polls poll-only providers / carrier-direct DCSA APIs for
 *     subscriptions that have gone quiet
 *
 * Auth: Bearer CRON_SECRET (same pattern as the other cron routes).
 * NOTE: not added to vercel.json — Vercel Hobby caps cron jobs. Trigger via
 * the existing scheduled GitHub Action or an external scheduler.
 */

import { NextRequest, NextResponse } from 'next/server';
import { processPendingEvents } from '@/lib/services/shipping-events';

const BATCH_SIZE = 100;

export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    console.error('[cron/tracking-sync] CRON_SECRET is not configured');
    return NextResponse.json({ error: 'Server misconfiguration' }, { status: 500 });
  }

  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const summary = await processPendingEvents(BATCH_SIZE);
    return NextResponse.json({ ok: true, ...summary });
  } catch (err) {
    console.error('[cron/tracking-sync] sweep failed:', err);
    return NextResponse.json({ ok: false, error: 'Sweep failed' }, { status: 500 });
  }
}
