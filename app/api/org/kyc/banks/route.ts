/**
 * GET /api/org/kyc/banks
 *
 * Returns the list of Nigerian banks from Paystack for use in dropdowns.
 * Cached for 24 h — bank lists change rarely.
 */

import { NextResponse } from 'next/server';
import { getAuthenticatedProfile } from '@/lib/api-auth';

export const revalidate = 86400; // 24 hours

export async function GET() {
  const { user } = await getAuthenticatedProfile();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const res = await fetch(
      'https://api.paystack.co/bank?country=nigeria&use_cursor=false&perPage=200',
      {
        headers: { Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}` },
        next: { revalidate: 86400 },
      }
    );

    if (!res.ok) {
      return NextResponse.json({ error: 'Failed to fetch banks from Paystack' }, { status: 502 });
    }

    const json = await res.json();
    const banks = (json.data ?? []).map((b: any) => ({
      id:   b.id,
      name: b.name,
      code: b.code,
      slug: b.slug,
    }));

    return NextResponse.json({ banks });
  } catch (err) {
    console.error('Banks fetch error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
