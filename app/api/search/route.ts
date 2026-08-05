import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getAuthenticatedProfile } from '@/lib/api-auth';

export async function GET(request: NextRequest) {
  try {
    const { user, profile } = await getAuthenticatedProfile(request);
    if (!user || !profile?.org_id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const q = new URL(request.url).searchParams.get('q')?.trim();
    if (!q || q.length < 2) return NextResponse.json({ results: [] });

    const supabase = createAdminClient();
    const orgId = profile.org_id;
    const pattern = `%${q}%`;

    const [farmers, batches, shipments, dpps] = await Promise.all([
      supabase.from('farms').select('id, farmer_name, community, commodity, compliance_status')
        .eq('org_id', orgId).ilike('farmer_name', pattern).limit(5),

      supabase.from('collection_batches').select('id, batch_code, commodity, status, total_weight')
        .eq('org_id', orgId).ilike('batch_code', pattern).limit(5),

      supabase.from('shipments').select('id, shipment_code, destination_country, status, readiness_score')
        .eq('org_id', orgId).ilike('shipment_code', pattern).limit(5),

      supabase.from('digital_product_passports').select('id, dpp_code, product_category, status, origin_country')
        .eq('org_id', orgId).ilike('dpp_code', pattern).limit(4),
    ]);

    const results = [
      ...(farmers.data || []).map((f: any) => ({
        type: 'farmer', id: f.id,
        title: f.farmer_name,
        subtitle: [f.community, f.commodity].filter(Boolean).join(' · '),
        badge: f.compliance_status,
        href: `/app/farmers/${f.id}`,
      })),
      ...(batches.data || []).map((b: any) => ({
        type: 'batch', id: b.id,
        title: b.batch_code || b.id.slice(0, 8),
        subtitle: `${b.commodity || ''} · ${Number(b.total_weight || 0).toLocaleString()} kg`,
        badge: b.status,
        href: `/app/inventory/${b.id}`,
      })),
      ...(shipments.data || []).map((s: any) => ({
        type: 'shipment', id: s.id,
        title: s.shipment_code,
        subtitle: [s.destination_country, s.readiness_score ? `Score: ${s.readiness_score}` : null].filter(Boolean).join(' · '),
        badge: s.status,
        href: `/app/shipments/${s.id}`,
      })),
      ...(dpps.data || []).map((d: any) => ({
        type: 'dpp', id: d.id,
        title: d.dpp_code,
        subtitle: [d.product_category, d.origin_country].filter(Boolean).join(' · '),
        badge: d.status,
        href: `/app/dpp/${d.id}`,
      })),
    ];

    return NextResponse.json({ results });
  } catch (err) {
    console.error('[search]', err);
    return NextResponse.json({ error: 'Search failed' }, { status: 500 });
  }
}
