/**
 * DELETE /api/shipments/[id]/stuffing/[recordId] — remove a stuffing line item
 *
 * Roles: admin, logistics_coordinator
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient, getAuthenticatedProfile } from '@/lib/api-auth';

const WRITE_ROLES = ['admin', 'logistics_coordinator'];

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; recordId: string } }
) {
  try {
    const supabase = createServiceClient();
    const { user, profile } = await getAuthenticatedProfile(request);

    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!profile?.org_id) return NextResponse.json({ error: 'No organization' }, { status: 403 });
    if (!WRITE_ROLES.includes(profile.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    // TODO(schema-drift): table 'container_stuffing_records' does not exist on the live DB —
    // the migration (supabase/migrations/20260403_container_stuffing.sql) that creates it has
    // not been applied. This query will fail at runtime until that migration is applied.
    const { error } = await supabase
      .from('container_stuffing_records' as any) // TODO(schema-drift): table missing on live DB, see supabase/migrations/20260403_container_stuffing.sql
      .delete()
      .eq('id', params.recordId)
      .eq('shipment_id', params.id)
      .eq('org_id', profile.org_id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Stuffing record DELETE error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
